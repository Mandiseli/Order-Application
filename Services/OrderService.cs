using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Models;

namespace Order_App.Services;

public class OrderService : IOrderService
{
    private readonly ApplicationDbContext _context;

    public OrderService(ApplicationDbContext context)
    {
        _context = context;
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
            if (!items.ContainsKey(menuItem.Id))
                continue;

            int qty = items[menuItem.Id];

            if (qty <= 0)
                throw new Exception("Invalid quantity.");

            decimal lineTotal = qty * menuItem.Price;
            total += lineTotal;

            order.Items.Add(new OrderItem
            {
                MenuItemId = menuItem.Id,
                Quantity = qty,
                UnitPriceAtTimeOfOrder = menuItem.Price
            });
        }

        if (employee.Balance < total)
            throw new Exception("Insufficient balance.");

        // Deduct balance
        employee.Balance -= total;

        order.TotalAmount = total;

        _context.Orders.Add(order);

        await _context.SaveChangesAsync();

        return order;
    }

    public async Task<List<Order>> GetOrdersForEmployeeAsync(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            throw new Exception("Employee not found.");

        return await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(i => i.MenuItem)
            .Where(o => o.EmployeeId == employee.Id)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();
    }

    public async Task<List<Order>> GetAllOrdersAsync()
    {
        return await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Items)
            .ThenInclude(i => i.MenuItem)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();
    }

    public async Task<Order?> UpdateOrderStatusAsync(int orderId, string status)
    {
        var validStatuses = new[] { "Pending", "Preparing", "Delivering", "Delivered" };

        if (!validStatuses.Contains(status))
            throw new Exception("Invalid status value.");

        var order = await _context.Orders.FindAsync(orderId);

        if (order == null)
            throw new Exception("Order not found.");

        order.Status = status;

        await _context.SaveChangesAsync();

        return order;
    }
}