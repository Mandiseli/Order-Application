using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Hubs;
using Order_App.Models;

namespace Order_App.Services;

public class OrderService : IOrderService
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<OrderHub> _hub;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;

    public OrderService(
        ApplicationDbContext context,
        IHubContext<OrderHub> hub,
        IEmailService emailService,
        ISmsService smsService)
    {
        _context = context;
        _hub = hub;
        _emailService = emailService;
        _smsService = smsService;
    }

    public async Task<Order?> PlaceOrderAsync(string employeeNumber, Dictionary<int, int> items)
    {
        if (items == null || !items.Any())
            throw new Exception("No items selected.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            throw new Exception("Employee not found.");

        var menuItems = await _context.MenuItems
            .Where(m => items.Keys.Contains(m.Id))
            .ToListAsync();

        if (!menuItems.Any())
            throw new Exception("Invalid menu items.");

        decimal total = 0;

        var order = new Order
        {
            EmployeeId = employee.Id,
            Status = "Pending",
            EstimatedDeliveryTime = "45 minutes",
            OrderDate = DateTime.UtcNow
        };

        foreach (var menuItem in menuItems)
        {
            int qty = items[menuItem.Id];

            if (qty <= 0)
                throw new Exception("Invalid quantity.");

            total += qty * menuItem.Price;

            order.Items.Add(new OrderItem
            {
                MenuItemId = menuItem.Id,
                ItemName = menuItem.Name,
                Quantity = qty,
                UnitPriceAtTimeOfOrder = menuItem.Price
            });
        }

        if (employee.Balance < total)
            throw new Exception($"Insufficient balance. Balance: R{employee.Balance}, Total: R{total}");

        employee.Balance -= total;
        order.TotalAmount = total;

        _context.Orders.Add(order);

        _context.Transactions.Add(new Transaction
        {
            EmployeeId = employee.Id,
            Amount = -total,
            Type = "Order",
            Description = $"Food order payment R{total}",
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        await SendOrderConfirmationAsync(order);
        await SendOrderUpdate(order, employee);

        return order;
    }

    public async Task<Order?> PlaceExternalOrderAsync(ExternalOrderDto dto)
    {
        if (dto == null)
            throw new Exception("Invalid order request.");

        if (string.IsNullOrWhiteSpace(dto.EmployeeNumber))
            throw new Exception("Employee number is required.");

        if (dto.Items == null || !dto.Items.Any())
            throw new Exception("Cart is empty.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == dto.EmployeeNumber);

        if (employee == null)
            throw new Exception("Employee not found.");

        foreach (var item in dto.Items)
        {
            if (string.IsNullOrWhiteSpace(item.ItemName))
                throw new Exception("Item name is required.");

            if (item.Quantity <= 0)
                throw new Exception("Invalid item quantity.");

            if (item.Price <= 0)
                throw new Exception("Invalid item price.");
        }

        decimal total = dto.Items.Sum(i => i.Price * i.Quantity);

        if (employee.Balance < total)
            throw new Exception($"Insufficient balance. Balance: R{employee.Balance}, Total: R{total}");

        var order = new Order
        {
            EmployeeId = employee.Id,
            OrderDate = DateTime.UtcNow,
            Status = "Pending",
            EstimatedDeliveryTime = "45 minutes",
            TotalAmount = total
        };

        foreach (var item in dto.Items)
        {
            order.Items.Add(new OrderItem
            {
                MenuItemId = null,
                ItemName = item.ItemName,
                Quantity = item.Quantity,
                UnitPriceAtTimeOfOrder = item.Price
            });
        }

        employee.Balance -= total;

        _context.Orders.Add(order);

        _context.Transactions.Add(new Transaction
        {
            EmployeeId = employee.Id,
            Amount = -total,
            Type = "Order",
            Description = $"Food order payment R{total}",
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        await SendOrderConfirmationAsync(order);
        await SendOrderUpdate(order, employee);

        return order;
    }

    public async Task<Order?> ReOrderAsync(ReOrderDto dto)
    {
        if (dto == null)
            throw new Exception("Invalid reorder request.");

        if (string.IsNullOrWhiteSpace(dto.EmployeeNumber))
            throw new Exception("Employee number is required.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == dto.EmployeeNumber);

        if (employee == null)
            throw new Exception("Employee not found.");

        var previousOrder = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == dto.PreviousOrderId);

        if (previousOrder == null)
            throw new Exception("Previous order not found.");

        if (!previousOrder.Items.Any())
            throw new Exception("Previous order has no items.");

        decimal total = previousOrder.Items
            .Sum(i => i.UnitPriceAtTimeOfOrder * i.Quantity);

        if (employee.Balance < total)
            throw new Exception($"Insufficient balance. Balance: R{employee.Balance}, Total: R{total}");

        var newOrder = new Order
        {
            EmployeeId = employee.Id,
            OrderDate = DateTime.UtcNow,
            Status = "Pending",
            EstimatedDeliveryTime = "45 minutes",
            TotalAmount = total
        };

        foreach (var item in previousOrder.Items)
        {
            newOrder.Items.Add(new OrderItem
            {
                MenuItemId = item.MenuItemId,
                ItemName = item.ItemName,
                Quantity = item.Quantity,
                UnitPriceAtTimeOfOrder = item.UnitPriceAtTimeOfOrder
            });
        }

        employee.Balance -= total;

        _context.Orders.Add(newOrder);

        _context.Transactions.Add(new Transaction
        {
            EmployeeId = employee.Id,
            Amount = -total,
            Type = "Order",
            Description = $"Re-order payment R{total}",
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        await SendOrderConfirmationAsync(newOrder);
        await SendOrderUpdate(newOrder, employee);

        return newOrder;
    }

    public async Task<Order?> AssignDriverAsync(AssignDriverDto dto)
    {
        var order = await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == dto.OrderId);

        if (order == null)
            throw new Exception("Order not found.");

        var driver = await _context.Drivers.FindAsync(dto.DriverId);

        if (driver == null)
            throw new Exception("Driver not found.");

        if (!driver.IsAvailable)
            throw new Exception("Driver is not available.");

        order.DriverId = driver.Id;
        order.Status = "Out For Delivery";
        order.EstimatedDeliveryTime = "10 minutes";

        await _context.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("ReceiveStatusUpdate", new
        {
            id = order.Id,
            employeeId = order.EmployeeId,
            employeeName = order.Employee?.Name ?? "",
            employeeNumber = order.Employee?.EmployeeNumber ?? "",
            driverId = driver.Id,
            driverName = driver.FullName,
            totalAmount = order.TotalAmount,
            status = order.Status,
            estimatedDeliveryTime = order.EstimatedDeliveryTime,
            orderDate = order.OrderDate
        });

        return order;
    }

    public async Task<List<Order>> GetOrdersForEmployeeAsync(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            throw new Exception("Employee not found.");

        return await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .Include(o => o.Items)
            .Where(o => o.EmployeeId == employee.Id)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();
    }

    public async Task<List<Order>> GetAllOrdersAsync()
    {
        return await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .Include(o => o.Items)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();
    }

    public async Task<Order?> UpdateOrderStatusAsync(int orderId, string status)
    {
        var validStatuses = new[]
        {
            "Pending",
            "Preparing",
            "Ready For Pickup",
            "Out For Delivery",
            "Delivered"
        };

        if (!validStatuses.Contains(status))
            throw new Exception("Invalid status value.");

        var order = await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            throw new Exception("Order not found.");

        order.Status = status;
        order.EstimatedDeliveryTime = GetEstimatedDeliveryTime(status);

        await _context.SaveChangesAsync();

        if (status == "Delivered")
        {
            await SendOrderDeliveredAsync(order);
        }

        await _hub.Clients.All.SendAsync("ReceiveStatusUpdate", new
        {
            id = order.Id,
            employeeId = order.EmployeeId,
            employeeName = order.Employee?.Name ?? "",
            employeeNumber = order.Employee?.EmployeeNumber ?? "",
            driverId = order.DriverId,
            driverName = order.Driver?.FullName ?? "Not Assigned",
            totalAmount = order.TotalAmount,
            status = order.Status,
            estimatedDeliveryTime = order.EstimatedDeliveryTime,
            orderDate = order.OrderDate
        });

        return order;
    }

    private async Task SendOrderUpdate(Order order, Employee employee)
    {
        await _hub.Clients.All.SendAsync("ReceiveOrderUpdate", new
        {
            id = order.Id,
            employeeId = employee.Id,
            employeeName = employee.Name,
            employeeNumber = employee.EmployeeNumber,
            driverId = order.DriverId,
            driverName = order.Driver?.FullName ?? "Not Assigned",
            totalAmount = order.TotalAmount,
            status = order.Status,
            estimatedDeliveryTime = order.EstimatedDeliveryTime,
            orderDate = order.OrderDate,
            items = order.Items.Select(i => new
            {
                id = i.Id,
                itemName = i.ItemName,
                quantity = i.Quantity,
                unitPriceAtTimeOfOrder = i.UnitPriceAtTimeOfOrder
            }).ToList()
        });
    }

    private static string GetEstimatedDeliveryTime(string status)
    {
        return status switch
        {
            "Pending" => "45 minutes",
            "Preparing" => "30 minutes",
            "Ready For Pickup" => "15 minutes",
            "Out For Delivery" => "10 minutes",
            "Delivered" => "Delivered",
            _ => "45 minutes"
        };
    }

    private async Task SendOrderConfirmationAsync(Order order)
    {
        await _emailService.SendEmailAsync(
            "employee@example.com",
            "Order Confirmation",
            $"Your order #{order.Id} has been confirmed. Total: R{order.TotalAmount}"
        );

        await _smsService.SendSmsAsync(
            "0000000000",
            $"Order #{order.Id} confirmed. Total: R{order.TotalAmount}"
        );
    }

    private async Task SendOrderDeliveredAsync(Order order)
    {
        await _emailService.SendEmailAsync(
            "employee@example.com",
            "Order Delivered",
            $"Your order #{order.Id} has been delivered."
        );

        await _smsService.SendSmsAsync(
            "0000000000",
            $"Order #{order.Id} has been delivered."
        );
    }
}