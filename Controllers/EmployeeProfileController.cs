using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeeProfileController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EmployeeProfileController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("{employeeNumber}")]
    public async Task<IActionResult> GetProfile(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        var orders = await _context.Orders
            .Where(o => o.EmployeeId == employee.Id)
            .ToListAsync();

        var deposits = await _context.Deposits
            .Where(d => d.EmployeeId == employee.Id)
            .ToListAsync();

        var profile = new EmployeeProfileDto
        {
            EmployeeId = employee.Id,
            Name = employee.Name,
            EmployeeNumber = employee.EmployeeNumber,
            CurrentBalance = employee.Balance,
            TotalDeposits = deposits.Sum(d => d.Amount),
            TotalOrders = orders.Count,
            TotalSpendings = orders.Sum(o => o.TotalAmount),
            LastOrderDate = orders
                .OrderByDescending(o => o.OrderDate)
                .Select(o => (DateTime?)o.OrderDate)
                .FirstOrDefault()
        };

        return Ok(profile);
    }

    [HttpGet("{employeeNumber}/wallet")]
    public async Task<IActionResult> GetWallet(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        var deposits = await _context.Transactions
            .Where(t => t.EmployeeId == employee.Id &&
                       (t.Type == "Deposit" || t.Type == "Bonus"))
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new WalletTransactionDto
            {
                Id = t.Id,
                Type = t.Type,
                Amount = t.Amount,
                Description = t.Description,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        var spendings = await _context.Transactions
            .Where(t => t.EmployeeId == employee.Id && t.Type == "Order")
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new WalletTransactionDto
            {
                Id = t.Id,
                Type = t.Type,
                Amount = t.Amount,
                Description = t.Description,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        var wallet = new EmployeeWalletDto
        {
            EmployeeName = employee.Name,
            EmployeeNumber = employee.EmployeeNumber,
            CurrentBalance = employee.Balance,
            DepositHistory = deposits,
            SpendingHistory = spendings
        };

        return Ok(wallet);
    }
}