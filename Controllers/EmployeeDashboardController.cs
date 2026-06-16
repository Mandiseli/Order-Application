using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeeDashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EmployeeDashboardController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("{employeeNumber}")]
    public async Task<IActionResult> GetDashboard(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        var orders = await _context.Orders
            .Where(o => o.EmployeeId == employee.Id)
            .ToListAsync();

        var dto = new EmployeeDashboardDto
        {
            EmployeeName = employee.Name,
            EmployeeNumber = employee.EmployeeNumber,
            Balance = employee.Balance,
            TotalOrders = orders.Count,
            TotalSpent = orders.Sum(o => o.TotalAmount),
            FavoritesCount = await _context.FavoriteRestaurants.CountAsync(f => f.EmployeeId == employee.Id),
            RatingsCount = await _context.RestaurantRatings.CountAsync(r => r.EmployeeId == employee.Id)
        };

        return Ok(dto);
    }

    [HttpGet("{employeeNumber}/monthly-chart")]
    public async Task<IActionResult> GetMonthlyChart(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        var data = await _context.Orders
            .Where(o => o.EmployeeId == employee.Id)
            .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new
            {
                month = $"{g.Key.Year}-{g.Key.Month}",
                totalSpent = g.Sum(x => x.TotalAmount),
                orders = g.Count()
            })
            .OrderBy(x => x.month)
            .ToListAsync();

        return Ok(data);
    }
}