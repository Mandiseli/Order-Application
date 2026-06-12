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

    public OrderService(ApplicationDbContext context, IHubContext<OrderHub> hub)
    {
        _context = context;
        _hub = hub;
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

        await SendOrderUpdate(order, employee);

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
            .Include(o => o.Items)
            .Where(o => o.EmployeeId == employee.Id)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();
    }

    public async Task<List<Order>> GetAllOrdersAsync()
    {
        return await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Items)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();
    }

    public async Task<Order?> UpdateOrderStatusAsync(int orderId, string status)
    {
        var validStatuses = new[] { "Pending", "Preparing", "Delivering", "Delivered" };

        if (!validStatuses.Contains(status))
            throw new Exception("Invalid status value.");

        var order = await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            throw new Exception("Order not found.");

        order.Status = status;

        await _context.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("ReceiveStatusUpdate", new
        {
            id = order.Id,
            employeeId = order.EmployeeId,
            employeeName = order.Employee?.Name ?? "",
            employeeNumber = order.Employee?.EmployeeNumber ?? "",
            totalAmount = order.TotalAmount,
            status = order.Status,
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
            totalAmount = order.TotalAmount,
            status = order.Status,
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
}