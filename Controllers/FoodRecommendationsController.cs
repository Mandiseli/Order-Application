using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoodRecommendationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public FoodRecommendationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("{employeeNumber}")]
    public async Task<IActionResult> GetRecommendations(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        var history = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.EmployeeId == employee.Id)
            .SelectMany(o => o.Items)
            .GroupBy(i => i.ItemName)
            .Select(g => new
            {
                itemName = g.Key,
                orderCount = g.Sum(x => x.Quantity),
                averagePrice = g.Average(x => x.UnitPriceAtTimeOfOrder)
            })
            .OrderByDescending(x => x.orderCount)
            .Take(5)
            .ToListAsync();

        if (history.Any())
            return Ok(history);

        return Ok(new[]
        {
            new { itemName = "Chicken Burger", orderCount = 0, averagePrice = 85m },
            new { itemName = "Wrap Combo", orderCount = 0, averagePrice = 80m },
            new { itemName = "Chicken Meal", orderCount = 0, averagePrice = 90m },
            new { itemName = "Beef Burger Meal", orderCount = 0, averagePrice = 85m }
        });
    }
}