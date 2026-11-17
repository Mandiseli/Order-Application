using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;

namespace Order_App.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class TransactionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public TransactionsController(ApplicationDbContext context) => _context = context;

    [HttpGet("{employeeNumber}")]
    public async Task<IActionResult> GetTransactions(string employeeNumber)
    {
        var access = await CheckEmployeeAccess(employeeNumber);
        if (access != null) return access;
        var employeeId = await _context.Employees.Where(e => e.EmployeeNumber == employeeNumber)
            .Select(e => (int?)e.Id).FirstOrDefaultAsync();
        if (employeeId == null) return NotFound(new { message = "Employee not found." });
        var items = await _context.Transactions.AsNoTracking().Where(t => t.EmployeeId == employeeId.Value)
            .OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id).Take(500)
            .Select(t => new { t.Id, t.EmployeeId, t.Amount, t.Type, t.Description, t.CreatedAt }).ToListAsync();
        return Ok(items);
    }

    [HttpGet("paged/{employeeNumber}")]
    public async Task<IActionResult> GetTransactionsPaged(string employeeNumber, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var access = await CheckEmployeeAccess(employeeNumber);
        if (access != null) return access;
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var employeeId = await _context.Employees.Where(e => e.EmployeeNumber == employeeNumber)
            .Select(e => (int?)e.Id).FirstOrDefaultAsync();
        if (employeeId == null) return NotFound(new { message = "Employee not found." });

        var query = _context.Transactions.AsNoTracking().Where(t => t.EmployeeId == employeeId.Value);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new { t.Id, t.EmployeeId, t.Amount, t.Type, t.Description, t.CreatedAt }).ToListAsync();
        return Ok(new { items, page, pageSize, totalItems = total, totalPages = (int)Math.Ceiling(total / (double)pageSize) });
    }

    private Task<IActionResult?> CheckEmployeeAccess(string employeeNumber)
    {
        if (User.IsInRole("Employee"))
        {
            var claim = User.FindFirst("employeeNumber")?.Value ?? User.FindFirst("EmployeeNumber")?.Value;
            if (string.IsNullOrWhiteSpace(claim)) return Task.FromResult<IActionResult?>(Unauthorized());
            if (!string.Equals(claim, employeeNumber, StringComparison.OrdinalIgnoreCase)) return Task.FromResult<IActionResult?>(Forbid());
        }
        else if (!User.IsInRole("Admin") && !User.IsInRole("Manager")) return Task.FromResult<IActionResult?>(Forbid());
        return Task.FromResult<IActionResult?>(null);
    }
}
