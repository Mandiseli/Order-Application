using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;

namespace Order_App.Controllers;

[ApiController]
[Authorize(Roles = "Employee,Admin,Manager")]
[Route("api/[controller]")]
public sealed class EmployeeDashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public EmployeeDashboardController(ApplicationDbContext context) => _context = context;

    [HttpGet("{employeeNumber}")]
    public async Task<IActionResult> GetDashboard(string employeeNumber)
    {
        if (!CanAccessEmployee(employeeNumber)) return Forbid();
        var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);
        if (employee == null) return NotFound(new { message = "Employee not found." });
        var orders = _context.Orders.AsNoTracking().Where(o => o.EmployeeId == employee.Id);
        var dto = new EmployeeDashboardDto
        {
            EmployeeName = employee.Name,
            EmployeeNumber = employee.EmployeeNumber,
            Balance = employee.Balance,
            TotalOrders = await orders.CountAsync(),
            TotalSpent = await orders.Where(o => o.Status != "Cancelled").SumAsync(o => (decimal?)o.TotalAmount) ?? 0m,
            FavoritesCount = await _context.FavoriteRestaurants.CountAsync(f => f.EmployeeId == employee.Id),
            RatingsCount = await _context.RestaurantRatings.CountAsync(r => r.EmployeeId == employee.Id)
        };
        return Ok(dto);
    }

    [HttpGet("{employeeNumber}/monthly-chart")]
    public async Task<IActionResult> GetMonthlyChart(string employeeNumber)
    {
        if (!CanAccessEmployee(employeeNumber)) return Forbid();
        var employeeId = await _context.Employees.Where(e => e.EmployeeNumber == employeeNumber)
            .Select(e => (int?)e.Id).FirstOrDefaultAsync();
        if (employeeId == null) return NotFound(new { message = "Employee not found." });
        var rows = await _context.Orders.AsNoTracking().Where(o => o.EmployeeId == employeeId && o.Status != "Cancelled")
            .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, totalSpent = g.Sum(o => o.TotalAmount), orders = g.Count() })
            .OrderBy(x => x.Year).ThenBy(x => x.Month).ToListAsync();
        return Ok(rows.Select(x => new { month = $"{x.Year}-{x.Month:D2}", x.totalSpent, x.orders }));
    }

    private bool CanAccessEmployee(string employeeNumber)
    {
        if (!User.IsInRole("Employee")) return User.IsInRole("Admin") || User.IsInRole("Manager");
        var claim = User.FindFirst("employeeNumber")?.Value ?? User.FindFirst("EmployeeNumber")?.Value;
        return !string.IsNullOrWhiteSpace(claim) && string.Equals(claim, employeeNumber, StringComparison.OrdinalIgnoreCase);
    }
}
