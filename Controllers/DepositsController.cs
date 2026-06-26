using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepositsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DepositsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [Authorize(Roles = "Employee,Admin")]
    [HttpPost("request")]
    public async Task<IActionResult> RequestDeposit([FromBody] DepositDto dto)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == dto.EmployeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        if (dto.Amount <= 0)
            return BadRequest("Amount must be greater than zero.");

        var request = new PendingDeposit
        {
            EmployeeId = employee.Id,
            Amount = dto.Amount,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.PendingDeposits.Add(request);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            request.Id,
            request.EmployeeId,
            request.Amount,
            request.Status,
            request.CreatedAt
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("pending")]
    public async Task<IActionResult> Pending()
    {
        var data = await _context.PendingDeposits
            .Include(d => d.Employee)
            .Where(d => d.Status == "Pending")
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id,
                employeeName = d.Employee != null ? d.Employee.Name : "",
                employeeNumber = d.Employee != null ? d.Employee.EmployeeNumber : "",
                d.Amount,
                d.Status,
                d.CreatedAt
            })
            .ToListAsync();

        return Ok(data);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("approve")]
    public async Task<IActionResult> Approve([FromBody] ApproveDepositDto dto)
    {
        var request = await _context.PendingDeposits
            .Include(d => d.Employee)
            .FirstOrDefaultAsync(d => d.Id == dto.PendingDepositId);

        if (request == null)
            return NotFound("Deposit request not found.");

        if (request.Status != "Pending")
            return BadRequest("Deposit already processed.");

        if (request.Employee == null)
            return BadRequest("Employee not found.");

        var bonus = Math.Floor(request.Amount / 250) * 500;

        request.Status = "Approved";
        request.ApprovedAt = DateTime.UtcNow;

        request.Employee.Balance += request.Amount + bonus;

        _context.Transactions.Add(new Transaction
        {
            EmployeeId = request.EmployeeId,
            Type = "Deposit",
            Amount = request.Amount,
            Description = "Approved deposit",
            CreatedAt = DateTime.UtcNow
        });

        if (bonus > 0)
        {
            _context.Transactions.Add(new Transaction
            {
                EmployeeId = request.EmployeeId,
                Type = "Bonus",
                Amount = bonus,
                Description = "Company deposit bonus",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Deposit approved.",
            request.Id,
            request.EmployeeId,
            request.Amount,
            bonus,
            request.Status,
            request.ApprovedAt,
            newBalance = request.Employee.Balance
        });
    }
}