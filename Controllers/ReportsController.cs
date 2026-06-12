using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReportsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("orders-summary")]
    public async Task<IActionResult> GetSummary()
    {
        var data = await _context.Orders
            .GroupBy(o => o.Status)
            .Select(g => new {
                Status = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        return Ok(data);
    }
}