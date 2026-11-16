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
        "Pending",
        "Preparing",
        "Ready For Pickup",
        "Out For Delivery",
        "Delivered",
        "Cancelled"
    };

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

    /*
     * =========================================================
     * PLACE ORDER
     * =========================================================
     */
    public async Task<Order?> PlaceOrderAsync(
        string employeeNumber,
        Dictionary<int, int> items)
    {
        if (string.IsNullOrWhiteSpace(employeeNumber))
            throw new ArgumentException(
                "Employee number is required.");

        if (items == null || items.Count == 0)
            throw new ArgumentException(
                "No items selected.");

        if (items.Any(x => x.Key <= 0))
            throw new ArgumentException(
                "Invalid menu item.");

        if (items.Any(x => x.Value <= 0))
            throw new ArgumentException(
                "Invalid quantity.");

        var employee =
            await _context.Employees
                .FirstOrDefaultAsync(
                    e =>
                        e.EmployeeNumber ==
                        employeeNumber);

        if (employee == null)
            throw new InvalidOperationException(
                "Employee not found.");

        var requestedIds =
            items.Keys.ToList();

        var menuItems =
            await _context.MenuItems
                .Where(
                    m =>
                        requestedIds.Contains(m.Id) &&
                        m.IsAvailable)
                .ToListAsync();

        if (menuItems.Count != requestedIds.Count)
        {
            throw new InvalidOperationException(
                "One or more selected menu items are unavailable.");
        }

        var order = new Order
        {
            EmployeeId = employee.Id,
            Status = "Pending",
            EstimatedDeliveryTime =
                GetEstimatedDeliveryTime("Pending"),
            OrderDate = DateTime.UtcNow
        };

        decimal total = 0;

        foreach (var menuItem in menuItems)
        {
            var quantity =
                items[menuItem.Id];

            if (quantity <= 0)
                throw new ArgumentException(
                    "Invalid quantity.");

            total +=
                quantity * menuItem.Price;

            order.Items.Add(
                new OrderItem
                {
                    MenuItemId = menuItem.Id,
                    ItemName = menuItem.Name,
                    Quantity = quantity,
                    UnitPriceAtTimeOfOrder =
                        menuItem.Price
                });
        }

        total =
            decimal.Round(
                total,
                2,
                MidpointRounding.AwayFromZero);

        if (total <= 0)
            throw new InvalidOperationException(
                "Order total must be greater than zero.");

        if (employee.Balance < total)
        {
            throw new InvalidOperationException(
                $"Insufficient balance. " +
                $"Balance: R{employee.Balance:N2}, " +
                $"Total: R{total:N2}");
        }

        employee.Balance -= total;
        order.TotalAmount = total;

        _context.Orders.Add(order);

        AddOrderTransaction(
            employee.Id,
            -total,
            $"Food order payment R{total:N2}");

        await _context.SaveChangesAsync();

        await SendOrderUpdate(
            order,
            employee);

        await SendOrderConfirmationAsync(
            order);

        return order;
    }

    /*
     * =========================================================
     * EXTERNAL ORDER
     * =========================================================
     *
     * NOTE:
     * This method is kept compatible with your existing
     * ExternalOrderDto.
     *
     * For the final production version, the frontend should
     * send MenuItemId + Quantity rather than trusting a client
     * supplied price.
     * =========================================================
     */
    public async Task<Order?> PlaceExternalOrderAsync(
        ExternalOrderDto dto)
    {
        if (dto == null)
            throw new ArgumentException(
                "Invalid order request.");

        if (string.IsNullOrWhiteSpace(
                dto.EmployeeNumber))
        {
            throw new ArgumentException(
                "Employee number is required.");
        }

        if (dto.Items == null ||
            !dto.Items.Any())
        {
            throw new ArgumentException(
                "Cart is empty.");
        }

        var employee =
            await _context.Employees
                .FirstOrDefaultAsync(
                    e =>
                        e.EmployeeNumber ==
                        dto.EmployeeNumber);

        if (employee == null)
            throw new InvalidOperationException(
                "Employee not found.");

        foreach (var item in dto.Items)
        {
            if (string.IsNullOrWhiteSpace(
                    item.ItemName))
            {
                throw new ArgumentException(
                    "Item name is required.");
            }

            if (item.Quantity <= 0)
            {
                throw new ArgumentException(
                    "Invalid item quantity.");
            }

            if (item.Price <= 0)
            {
                throw new ArgumentException(
                    "Invalid item price.");
            }
        }

        var total =
            decimal.Round(
                dto.Items.Sum(
                    i =>
                        i.Price *
                        i.Quantity),
                2,
                MidpointRounding.AwayFromZero);

        if (total <= 0)
            throw new InvalidOperationException(
                "Order total must be greater than zero.");

        if (employee.Balance < total)
        {
            throw new InvalidOperationException(
                $"Insufficient balance. " +
                $"Balance: R{employee.Balance:N2}, " +
                $"Total: R{total:N2}");
        }

        var order = new Order
        {
            EmployeeId = employee.Id,
            OrderDate = DateTime.UtcNow,
            Status = "Pending",
            EstimatedDeliveryTime =
                GetEstimatedDeliveryTime("Pending"),
            TotalAmount = total
        };

        foreach (var item in dto.Items)
        {
            order.Items.Add(
                new OrderItem
                {
                    MenuItemId = null,
                    ItemName = item.ItemName.Trim(),
                    Quantity = item.Quantity,
                    UnitPriceAtTimeOfOrder =
                        item.Price
                });
        }

        employee.Balance -= total;

        _context.Orders.Add(order);

        AddOrderTransaction(
            employee.Id,
            -total,
            $"Food order payment R{total:N2}");

        await _context.SaveChangesAsync();

        await SendOrderUpdate(
            order,
            employee);

        await SendOrderConfirmationAsync(
            order);

        return order;
    }

    /*
     * =========================================================
     * REORDER
     * =========================================================
     */
    public async Task<Order?> ReOrderAsync(
        ReOrderDto dto)
    {
        if (dto == null)
            throw new ArgumentException(
                "Invalid reorder request.");

        if (string.IsNullOrWhiteSpace(
                dto.EmployeeNumber))
        {
            throw new ArgumentException(
                "Employee number is required.");
        }

        var employee =
            await _context.Employees
                .FirstOrDefaultAsync(
                    e =>
                        e.EmployeeNumber ==
                        dto.EmployeeNumber);

        if (employee == null)
            throw new InvalidOperationException(
                "Employee not found.");

        var previousOrder =
            await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(
                    o =>
                        o.Id ==
                        dto.PreviousOrderId);

        if (previousOrder == null)
            throw new InvalidOperationException(
                "Previous order not found.");

        /*
         * Security check:
         * an employee cannot reorder another employee's order.
         */
        if (previousOrder.EmployeeId !=
            employee.Id)
        {
            throw new UnauthorizedAccessException(
                "You cannot reorder another employee's order.");
        }

        if (!previousOrder.Items.Any())
            throw new InvalidOperationException(
                "Previous order has no items.");

        var total =
            decimal.Round(
                previousOrder.Items.Sum(
                    i =>
                        i.UnitPriceAtTimeOfOrder *
                        i.Quantity),
                2,
                MidpointRounding.AwayFromZero);

        if (employee.Balance < total)
        {
            throw new InvalidOperationException(
                $"Insufficient balance. " +
                $"Balance: R{employee.Balance:N2}, " +
                $"Total: R{total:N2}");
        }

        var newOrder = new Order
        {
            EmployeeId = employee.Id,
            OrderDate = DateTime.UtcNow,
            Status = "Pending",
            EstimatedDeliveryTime =
                GetEstimatedDeliveryTime("Pending"),
            TotalAmount = total
        };

        foreach (var item in previousOrder.Items)
        {
            newOrder.Items.Add(
                new OrderItem
                {
                    MenuItemId =
                        item.MenuItemId,
                    ItemName =
                        item.ItemName,
                    Quantity =
                        item.Quantity,
                    UnitPriceAtTimeOfOrder =
                        item.UnitPriceAtTimeOfOrder
                });
        }

        employee.Balance -= total;

        _context.Orders.Add(newOrder);

        AddOrderTransaction(
            employee.Id,
            -total,
            $"Re-order payment R{total:N2}");

        await _context.SaveChangesAsync();

        await SendOrderUpdate(
            newOrder,
            employee);

        await SendOrderConfirmationAsync(
            newOrder);

        return newOrder;
    }

    /*
     * =========================================================
     * CANCEL ORDER
     * =========================================================
     */
    public async Task<Order?> CancelOrderAsync(
        int orderId)
    {
        var order =
            await _context.Orders
                .Include(o => o.Employee)
                .Include(o => o.Driver)
                .Include(o => o.Items)
                .FirstOrDefaultAsync(
                    o =>
                        o.Id ==
                        orderId);

        if (order == null)
            throw new KeyNotFoundException(
                "Order not found.");

        if (order.Status != "Pending")
        {
            throw new InvalidOperationException(
                "Only pending orders can be cancelled.");
        }

        if (order.Employee == null)
        {
            throw new InvalidOperationException(
                "Order employee could not be found.");
        }

        order.Status = "Cancelled";
        order.EstimatedDeliveryTime =
            GetEstimatedDeliveryTime("Cancelled");

        order.Employee.Balance +=
            order.TotalAmount;

        _context.Transactions.Add(
            new Transaction
            {
                EmployeeId =
                    order.EmployeeId,

                Amount =
                    order.TotalAmount,

                Type =
                    "Refund",

                Description =
                    $"Refund for cancelled order #{order.Id}",

                CreatedAt =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        await BroadcastStatusUpdate(
            order);

        return order;
    }

    /*
     * =========================================================
     * ASSIGN DRIVER
     * =========================================================
     */
    public async Task<Order?> AssignDriverAsync(
        AssignDriverDto dto)
    {
        if (dto == null)
            throw new ArgumentException(
                "Invalid driver assignment.");

        var order =
            await _context.Orders
                .Include(o => o.Employee)
                .Include(o => o.Driver)
                .Include(o => o.Items)
                .FirstOrDefaultAsync(
                    o =>
                        o.Id ==
                        dto.OrderId);

        if (order == null)
            throw new KeyNotFoundException(
                "Order not found.");

        var driver =
            await _context.Drivers
                .FirstOrDefaultAsync(
                    d =>
                        d.Id ==
                        dto.DriverId);

        if (driver == null)
            throw new KeyNotFoundException(
                "Driver not found.");

        if (!driver.IsAvailable)
            throw new InvalidOperationException(
                "Driver is not available.");

        order.DriverId =
            driver.Id;

        order.Driver =
            driver;

        order.Status =
            "Out For Delivery";

        order.EstimatedDeliveryTime =
            GetEstimatedDeliveryTime(
                "Out For Delivery");

        await _context.SaveChangesAsync();

        await BroadcastStatusUpdate(
            order);

        return order;
    }

    /*
     * =========================================================
     * EMPLOYEE ORDERS
     * =========================================================
     */
    public async Task<List<Order>>
        GetOrdersForEmployeeAsync(
            string employeeNumber)
    {
        if (string.IsNullOrWhiteSpace(
                employeeNumber))
        {
            throw new ArgumentException(
                "Employee number is required.");
        }

        var employee =
            await _context.Employees
                .FirstOrDefaultAsync(
                    e =>
                        e.EmployeeNumber ==
                        employeeNumber);

        if (employee == null)
            throw new KeyNotFoundException(
                "Employee not found.");

        return await _context.Orders
            .AsNoTracking()
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .Include(o => o.Items)
            .Where(
                o =>
                    o.EmployeeId ==
                    employee.Id)
            .OrderByDescending(
                o =>
                    o.OrderDate)
            .ToListAsync();
    }

    /*
     * =========================================================
     * SEARCH + PAGINATION
     * =========================================================
     */
    public async Task<(
        List<Order> Items,
        int TotalItems
        )> SearchOrdersAsync(
            string? search,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            int page,
            int pageSize)
    {
        page =
            Math.Max(
                page,
                1);

        pageSize =
            Math.Clamp(
                pageSize,
                1,
                100);

        var query =
            _context.Orders
                .AsNoTracking()
                .Include(o => o.Employee)
                .Include(o => o.Driver)
                .Include(o => o.Items)
                .AsQueryable();

        if (!string.IsNullOrWhiteSpace(
                search))
        {
            var term =
                search.Trim();

            query =
                query.Where(
                    o =>
                        (
                            o.Employee != null &&
                            o.Employee.Name.Contains(
                                term)
                        )
                        ||
                        (
                            o.Employee != null &&
                            o.Employee.EmployeeNumber
                                .Contains(term)
                        )
                        ||
                        o.Id.ToString()
                            .Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(
                status))
        {
            var normalizedStatus =
                status.Trim();

            query =
                query.Where(
                    o =>
                        o.Status ==
                        normalizedStatus);
        }

        if (fromDate.HasValue)
        {
            var from =
                fromDate.Value.Date;

            query =
                query.Where(
                    o =>
                        o.OrderDate >=
                        from);
        }

        if (toDate.HasValue)
        {
            var toExclusive =
                toDate.Value
                    .Date
                    .AddDays(1);

            query =
                query.Where(
                    o =>
                        o.OrderDate <
                        toExclusive);
        }

        var totalItems =
            await query.CountAsync();

        var items =
            await query
                .OrderByDescending(
                    o =>
                        o.OrderDate)
                .Skip(
                    (page - 1) *
                    pageSize)
                .Take(pageSize)
                .ToListAsync();

        return (
            items,
            totalItems);
    }

    /*
     * =========================================================
     * ALL ORDERS
     * =========================================================
     */
    public async Task<List<Order>>
        GetAllOrdersAsync()
    {
        return await _context.Orders
            .AsNoTracking()
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .Include(o => o.Items)
            .OrderByDescending(
                o =>
                    o.OrderDate)
            .ToListAsync();
    }

    /*
     * =========================================================
     * UPDATE STATUS
     * =========================================================
     */
    public async Task<Order?>
        UpdateOrderStatusAsync(
            int orderId,
            string status)
    {
        if (string.IsNullOrWhiteSpace(
                status))
        {
            throw new ArgumentException(
                "Status is required.");
        }

        status =
            NormalizeStatus(status);

        if (!ValidStatuses.Contains(
                status))
        {
            throw new ArgumentException(
                "Invalid status value.");
        }

        var order =
            await _context.Orders
                .Include(o => o.Employee)
                .Include(o => o.Driver)
                .Include(o => o.Items)
                .FirstOrDefaultAsync(
                    o =>
                        o.Id ==
                        orderId);

        if (order == null)
            throw new KeyNotFoundException(
                "Order not found.");

        if (order.Status ==
            "Cancelled")
        {
            throw new InvalidOperationException(
                "Cancelled orders cannot be updated.");
        }

        /*
         * Prevent moving a delivered order back
         * into an earlier state.
         */
        if (order.Status ==
                "Delivered" &&
            status != "Delivered")
        {
            throw new InvalidOperationException(
                "Delivered orders cannot be moved to an earlier status.");
        }

        order.Status =
            status;

        order.EstimatedDeliveryTime =
            GetEstimatedDeliveryTime(
                status);

        await _context.SaveChangesAsync();

        await BroadcastStatusUpdate(
            order);

        if (status ==
            "Delivered")
        {
            await SendOrderDeliveredAsync(
                order);
        }

        return order;
    }

    /*
     * =========================================================
     * TRANSACTION
     * =========================================================
     */
    private void AddOrderTransaction(
        int employeeId,
        decimal amount,
        string description)
    {
        _context.Transactions.Add(
            new Transaction
            {
                EmployeeId =
                    employeeId,

                Amount =
                    amount,

                Type =
                    "Order",

                Description =
                    description,

                CreatedAt =
                    DateTime.UtcNow
            });
    }

    /*
     * =========================================================
     * SIGNALR - ORDER CREATED
     * =========================================================
     */
    private async Task SendOrderUpdate(
        Order order,
        Employee employee)
    {
        await _hub.Clients.All.SendAsync(
            "ReceiveOrderUpdate",
            new
            {
                id =
                    order.Id,

                employeeId =
                    employee.Id,

                employeeName =
                    employee.Name,

                employeeNumber =
                    employee.EmployeeNumber,

                driverId =
                    order.DriverId,

                driverName =
                    order.Driver?.FullName
                    ?? "Not Assigned",

                totalAmount =
                    order.TotalAmount,

                status =
                    order.Status,

                estimatedDeliveryTime =
                    order.EstimatedDeliveryTime,

                orderDate =
                    order.OrderDate,

                items =
                    order.Items
                        .Select(
                            i =>
                                new
                                {
                                    id =
                                        i.Id,

                                    itemName =
                                        i.ItemName,

                                    quantity =
                                        i.Quantity,

                                    unitPriceAtTimeOfOrder =
                                        i.UnitPriceAtTimeOfOrder
                                })
                        .ToList()
            });
    }

    /*
     * =========================================================
     * SIGNALR - STATUS UPDATE
     * =========================================================
     */
    private async Task BroadcastStatusUpdate(
        Order order)
    {
        await _hub.Clients.All.SendAsync(
            "ReceiveStatusUpdate",
            new
            {
                id =
                    order.Id,

                employeeId =
                    order.EmployeeId,

                employeeName =
                    order.Employee?.Name
                    ?? "",

                employeeNumber =
                    order.Employee?.EmployeeNumber
                    ?? "",

                driverId =
                    order.DriverId,

                driverName =
                    order.Driver?.FullName
                    ?? "Not Assigned",

                totalAmount =
                    order.TotalAmount,

                status =
                    order.Status,

                estimatedDeliveryTime =
                    order.EstimatedDeliveryTime
                    ?? GetEstimatedDeliveryTime(
                        order.Status),

                orderDate =
                    order.OrderDate,

                items =
                    order.Items
                        .Select(
                            i =>
                                new
                                {
                                    id =
                                        i.Id,

                                    itemName =
                                        i.ItemName,

                                    quantity =
                                        i.Quantity,

                                    unitPriceAtTimeOfOrder =
                                        i.UnitPriceAtTimeOfOrder
                                })
                        .ToList()
            });
    }

    /*
     * =========================================================
     * ESTIMATED DELIVERY
     * =========================================================
     */
    private static string
        GetEstimatedDeliveryTime(
            string status)
    {
        return status switch
        {
            "Pending" =>
                "45 minutes",

            "Preparing" =>
                "30 minutes",

            "Ready For Pickup" =>
                "15 minutes",

            "Out For Delivery" =>
                "10 minutes",

            "Delivered" =>
                "Delivered",

            "Cancelled" =>
                "Cancelled",

            _ =>
                "45 minutes"
        };
    }

    /*
     * =========================================================
     * STATUS NORMALIZATION
     * =========================================================
     */
    private static string
        NormalizeStatus(
            string status)
    {
        var value =
            status.Trim();

        return value switch
        {
            "Ready for Pickup" =>
                "Ready For Pickup",

            "Ready For pickup" =>
                "Ready For Pickup",

            "Out for Delivery" =>
                "Out For Delivery",

            "out for delivery" =>
                "Out For Delivery",

            "preparing" =>
                "Preparing",

            "pending" =>
                "Pending",

            "delivered" =>
                "Delivered",

            "cancelled" =>
                "Cancelled",

            _ =>
                value
        };
    }

    /*
     * =========================================================
     * EMAIL CONFIRMATION
     * =========================================================
     *
     * Your current IEmailService interface does not expose
     * employee email information, so the existing service
     * contract is preserved here.
     *
     * Replace the placeholder recipient with your real
     * employee notification lookup when your Employee model
     * contains an Email property.
     * =========================================================
     */
    private async Task
        SendOrderConfirmationAsync(
            Order order)
    {
        await _emailService.SendEmailAsync(
            "employee@example.com",
            "Order Confirmation",
            $"Your order #{order.Id} has been confirmed. " +
            $"Total: R{order.TotalAmount:N2}");
    }

    /*
     * =========================================================
     * DELIVERY NOTIFICATION
     * =========================================================
     */
    private async Task
        SendOrderDeliveredAsync(
            Order order)
    {
        await _emailService.SendEmailAsync(
            "employee@example.com",
            "Order Delivered",
            $"Your order #{order.Id} has been delivered.");

        await _smsService.SendSmsAsync(
            "0000000000",
            $"Order #{order.Id} has been delivered.");
    }
}