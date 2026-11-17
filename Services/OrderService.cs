using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Hubs;
using Order_App.Models;

namespace Order_App.Services;

public sealed class OrderService : IOrderService
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<OrderHub> _hub;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;

    private static readonly string[] ValidStatuses =
    {
        "Pending", "Preparing", "Ready For Pickup", "Out For Delivery", "Delivered", "Cancelled"
    };

    public OrderService(ApplicationDbContext context, IHubContext<OrderHub> hub,
        IEmailService emailService, ISmsService smsService)
    {
        _context = context;
        _hub = hub;
        _emailService = emailService;
        _smsService = smsService;
    }

    public async Task<Order?> PlaceOrderAsync(string employeeNumber, Dictionary<int, int> items)
    {
        if (string.IsNullOrWhiteSpace(employeeNumber)) throw new ArgumentException("Employee number is required.");
        if (items == null || items.Count == 0) throw new ArgumentException("No items selected.");
        if (items.Any(x => x.Key <= 0 || x.Value is < 1 or > 100)) throw new ArgumentException("Invalid menu item or quantity.");

        var employee = await FindEmployeeAsync(employeeNumber);
        var ids = items.Keys.ToList();
        var menuItems = await _context.MenuItems.AsNoTracking()
            .Where(m => ids.Contains(m.Id) && m.IsAvailable).ToListAsync();
        if (menuItems.Count != ids.Count) throw new InvalidOperationException("One or more selected menu items are unavailable.");

        var orderItems = menuItems.Select(m => new OrderItem
        {
            MenuItemId = m.Id,
            ItemName = m.Name,
            Quantity = items[m.Id],
            UnitPriceAtTimeOfOrder = m.Price
        }).ToList();
        return await CreatePaidOrderAsync(employee, orderItems, "Food order");
    }

    public async Task<Order?> PlaceExternalOrderAsync(ExternalOrderDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.EmployeeNumber)) throw new ArgumentException("Invalid external order request.");
        if (dto.Items == null || dto.Items.Count == 0) throw new ArgumentException("Cart is empty.");
        if (dto.Items.Any(i => string.IsNullOrWhiteSpace(i.ItemName) || i.Quantity is < 1 or > 100 || i.Price <= 0 || i.Price > 100000))
            throw new ArgumentException("External order contains an invalid item, price or quantity.");

        // IMPORTANT: ExternalOrderDto currently contains client-supplied prices. Only call this endpoint
        // from a trusted server-side integration, or replace the DTO with provider-verified menu IDs/prices.
        var employee = await FindEmployeeAsync(dto.EmployeeNumber);
        var orderItems = dto.Items.Select(i => new OrderItem
        {
            MenuItemId = null,
            ItemName = i.ItemName.Trim(),
            Quantity = i.Quantity,
            UnitPriceAtTimeOfOrder = decimal.Round(i.Price, 2, MidpointRounding.AwayFromZero)
        }).ToList();
        return await CreatePaidOrderAsync(employee, orderItems, "External food order");
    }

    public async Task<Order?> ReOrderAsync(ReOrderDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.EmployeeNumber)) throw new ArgumentException("Invalid reorder request.");
        var employee = await FindEmployeeAsync(dto.EmployeeNumber);
        var previous = await _context.Orders.AsNoTracking().Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == dto.PreviousOrderId);
        if (previous == null) throw new KeyNotFoundException("Previous order not found.");
        if (previous.EmployeeId != employee.Id) throw new UnauthorizedAccessException("You cannot reorder another employee's order.");
        if (previous.Items.Count == 0) throw new InvalidOperationException("Previous order has no items.");

        var items = previous.Items.Select(i => new OrderItem
        {
            MenuItemId = i.MenuItemId,
            ItemName = i.ItemName,
            Quantity = i.Quantity,
            UnitPriceAtTimeOfOrder = i.UnitPriceAtTimeOfOrder
        }).ToList();
        return await CreatePaidOrderAsync(employee, items, $"Re-order based on order #{previous.Id}");
    }

    private async Task<Employee> FindEmployeeAsync(string employeeNumber)
    {
        var employee = await _context.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber.Trim());
        return employee ?? throw new KeyNotFoundException("Employee not found.");
    }

    // Conditional SQL update prevents two concurrent requests from spending the same balance.
    private async Task<Order> CreatePaidOrderAsync(Employee employee, List<OrderItem> items, string description)
    {
        var total = decimal.Round(items.Sum(i => i.UnitPriceAtTimeOfOrder * i.Quantity), 2, MidpointRounding.AwayFromZero);
        if (total <= 0) throw new InvalidOperationException("Order total must be greater than zero.");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var debited = await _context.Employees
            .Where(e => e.Id == employee.Id && e.Balance >= total)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.Balance, e => e.Balance - total));
        if (debited != 1)
        {
            var currentBalance = await _context.Employees.Where(e => e.Id == employee.Id)
                .Select(e => e.Balance).SingleAsync();
            throw new InvalidOperationException($"Insufficient balance. Balance: R{currentBalance:N2}, Total: R{total:N2}");
        }

        var order = new Order
        {
            EmployeeId = employee.Id,
            OrderDate = DateTime.UtcNow,
            Status = "Pending",
            EstimatedDeliveryTime = GetEstimatedDeliveryTime("Pending"),
            TotalAmount = total,
            Items = items
        };
        _context.Orders.Add(order);
        _context.Transactions.Add(new Transaction
        {
            EmployeeId = employee.Id,
            Amount = -total,
            Type = "Order",
            Description = $"{description} payment R{total:N2}",
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        order.Employee = employee;
        await NotifyOrderCreatedSafelyAsync(order, employee);
        return order;
    }

    public async Task<Order?> CancelOrderAsync(int orderId, string? employeeNumber = null)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var query = _context.Orders.Where(o => o.Id == orderId && o.Status == "Pending");
        if (!string.IsNullOrWhiteSpace(employeeNumber))
            query = query.Where(o => o.Employee != null && o.Employee.EmployeeNumber == employeeNumber);

        var changed = await query.ExecuteUpdateAsync(s => s
            .SetProperty(o => o.Status, "Cancelled")
            .SetProperty(o => o.EstimatedDeliveryTime, GetEstimatedDeliveryTime("Cancelled")));

        if (changed == 0)
        {
            var exists = await _context.Orders.AsNoTracking().AnyAsync(o => o.Id == orderId);
            if (!exists) throw new KeyNotFoundException("Order not found.");
            if (!string.IsNullOrWhiteSpace(employeeNumber))
            {
                var belongs = await _context.Orders.AsNoTracking()
                    .AnyAsync(o => o.Id == orderId && o.Employee != null && o.Employee.EmployeeNumber == employeeNumber);
                if (!belongs) throw new UnauthorizedAccessException("You cannot cancel another employee's order.");
            }
            throw new InvalidOperationException("Only pending orders can be cancelled.");
        }

        var order = await _context.Orders.Include(o => o.Employee).Include(o => o.Driver).Include(o => o.Items)
            .SingleAsync(o => o.Id == orderId);
        var refunded = await _context.Employees.Where(e => e.Id == order.EmployeeId)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.Balance, e => e.Balance + order.TotalAmount));
        if (refunded != 1) throw new InvalidOperationException("The employee account could not be refunded.");

        _context.Transactions.Add(new Transaction
        {
            EmployeeId = order.EmployeeId,
            Amount = order.TotalAmount,
            Type = "Refund",
            Description = $"Refund for cancelled order #{order.Id}",
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        await BroadcastStatusUpdateSafelyAsync(order);
        return order;
    }

    public async Task<Order?> AssignDriverAsync(AssignDriverDto dto)
    {
        if (dto == null || dto.OrderId <= 0 || dto.DriverId <= 0) throw new ArgumentException("Invalid driver assignment.");
        var order = await _context.Orders.Include(o => o.Employee).Include(o => o.Driver).Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == dto.OrderId);
        if (order == null) throw new KeyNotFoundException("Order not found.");
        if (order.Status is "Delivered" or "Cancelled") throw new InvalidOperationException("A completed or cancelled order cannot be assigned.");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == dto.DriverId);
        if (driver == null) throw new KeyNotFoundException("Driver not found.");
        if (!driver.IsAvailable) throw new InvalidOperationException("Driver is not available.");
        var activeAssignment = await _context.Orders.AnyAsync(o => o.DriverId == driver.Id &&
            o.Id != order.Id && o.Status != "Delivered" && o.Status != "Cancelled");
        if (activeAssignment) throw new InvalidOperationException("Driver already has an active order.");

        order.DriverId = driver.Id;
        order.Driver = driver;
        order.Status = "Out For Delivery";
        order.EstimatedDeliveryTime = GetEstimatedDeliveryTime(order.Status);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        await BroadcastStatusUpdateSafelyAsync(order);
        return order;
    }

    public async Task<List<Order>> GetOrdersForEmployeeAsync(string employeeNumber)
    {
        if (string.IsNullOrWhiteSpace(employeeNumber)) throw new ArgumentException("Employee number is required.");
        var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);
        if (employee == null) throw new KeyNotFoundException("Employee not found.");
        return await _context.Orders.AsNoTracking().Include(o => o.Employee).Include(o => o.Driver).Include(o => o.Items)
            .Where(o => o.EmployeeId == employee.Id).OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.Id).ToListAsync();
    }

    public async Task<(List<Order> Items, int TotalItems)> SearchOrdersAsync(
        string? search, string? status, DateTime? fromDate, DateTime? toDate, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        if (fromDate.HasValue && toDate.HasValue && fromDate.Value.Date > toDate.Value.Date)
            throw new ArgumentException("FromDate cannot be later than ToDate.");

        var query = _context.Orders.AsNoTracking().Include(o => o.Employee).Include(o => o.Driver).Include(o => o.Items).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            if (int.TryParse(term, out var orderId))
                query = query.Where(o => o.Id == orderId || (o.Employee != null &&
                    (o.Employee.Name.Contains(term) || o.Employee.EmployeeNumber.Contains(term))));
            else
                query = query.Where(o => o.Employee != null &&
                    (o.Employee.Name.Contains(term) || o.Employee.EmployeeNumber.Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(o => o.Status == NormalizeStatus(status));
        if (fromDate.HasValue) { var from = fromDate.Value.Date; query = query.Where(o => o.OrderDate >= from); }
        if (toDate.HasValue) { var to = toDate.Value.Date.AddDays(1); query = query.Where(o => o.OrderDate < to); }

        var total = await query.CountAsync();
        var results = await query.OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (results, total);
    }

    public async Task<Order?> UpdateOrderStatusAsync(int orderId, string status)
    {
        if (string.IsNullOrWhiteSpace(status)) throw new ArgumentException("Status is required.");
        status = NormalizeStatus(status);
        if (!ValidStatuses.Contains(status)) throw new ArgumentException("Invalid status value.");
        var order = await _context.Orders.Include(o => o.Employee).Include(o => o.Driver).Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) throw new KeyNotFoundException("Order not found.");
        if (order.Status == "Cancelled") throw new InvalidOperationException("Cancelled orders cannot be updated.");
        if (order.Status == "Delivered" && status != "Delivered") throw new InvalidOperationException("Delivered orders cannot be moved to an earlier status.");
        order.Status = status;
        order.EstimatedDeliveryTime = GetEstimatedDeliveryTime(status);
        await _context.SaveChangesAsync();
        await BroadcastStatusUpdateSafelyAsync(order);
        if (status == "Delivered") await SendDeliveredNotificationSafelyAsync(order);
        return order;
    }

    private async Task NotifyOrderCreatedSafelyAsync(Order order, Employee employee)
    {
        try
        {
            await _hub.Clients.All.SendAsync("ReceiveOrderUpdate", ToOrderPayload(order, employee));
        }
        catch { /* A realtime notification failure must not undo a committed order. */ }
        try
        {
            await _emailService.SendEmailAsync("employee@example.com", "Order Confirmation",
                $"Your order #{order.Id} has been confirmed. Total: R{order.TotalAmount:N2}");
        }
        catch { /* Replace placeholder with a real employee contact when available. */ }
    }

    private async Task BroadcastStatusUpdateSafelyAsync(Order order)
    {
        try { await _hub.Clients.All.SendAsync("ReceiveStatusUpdate", ToOrderPayload(order, order.Employee)); }
        catch { /* Notification errors do not change persisted order state. */ }
    }

    private async Task SendDeliveredNotificationSafelyAsync(Order order)
    {
        try
        {
            await _emailService.SendEmailAsync("employee@example.com", "Order Delivered", $"Your order #{order.Id} has been delivered.");
            await _smsService.SendSmsAsync("0000000000", $"Order #{order.Id} has been delivered.");
        }
        catch { /* Replace placeholders with real employee contact details. */ }
    }

    private static object ToOrderPayload(Order order, Employee? employee) => new
    {
        id = order.Id,
        employeeId = order.EmployeeId,
        employeeName = employee?.Name ?? "",
        employeeNumber = employee?.EmployeeNumber ?? "",
        driverId = order.DriverId,
        driverName = order.Driver?.FullName ?? "Not Assigned",
        totalAmount = order.TotalAmount,
        status = order.Status,
        estimatedDeliveryTime = order.EstimatedDeliveryTime,
        orderDate = order.OrderDate,
        items = order.Items.Select(i => new {
            id = i.Id,
            itemName = i.ItemName,
            quantity = i.Quantity,
            unitPriceAtTimeOfOrder = i.UnitPriceAtTimeOfOrder
        }).ToList()
    };

    private static string GetEstimatedDeliveryTime(string status) => status switch
    {
        "Pending" => "45 minutes",
        "Preparing" => "30 minutes",
        "Ready For Pickup" => "15 minutes",
        "Out For Delivery" => "10 minutes",
        "Delivered" => "Delivered",
        "Cancelled" => "Cancelled",
        _ => "45 minutes"
    };

    private static string NormalizeStatus(string status) => status.Trim().ToLowerInvariant() switch
    {
        "pending" => "Pending",
        "preparing" => "Preparing",
        "ready for pickup" => "Ready For Pickup",
        "out for delivery" => "Out For Delivery",
        "delivered" => "Delivered",
        "cancelled" => "Cancelled",
        _ => status.Trim()
    };
}
