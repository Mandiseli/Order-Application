using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Models;

namespace Order_App.Services;

public class DepositService : IDepositService
{
    private readonly ApplicationDbContext _context;

    public DepositService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Employee?> MakeDepositAsync(string employeeNumber, decimal amount)
    {
        if (amount <= 0)
            throw new Exception("Deposit amount must be greater than zero.");

        var employee = await _context.Employees
            .Include(e => e.Deposits)
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            throw new Exception("Employee not found.");

        var now = DateTime.UtcNow;

        // Get total deposits for current month
        var monthlyTotal = employee.Deposits
            .Where(d => d.CreatedAt.Year == now.Year &&
                        d.CreatedAt.Month == now.Month)
            .Sum(d => d.Amount);

        var newTotal = monthlyTotal + amount;

        // Calculate bonus steps
        var previousSteps = (int)(monthlyTotal / 250);
        var newSteps = (int)(newTotal / 250);

        var bonusToApply = (newSteps - previousSteps) * 500;

        // Update employee balance
        employee.Balance += amount + bonusToApply;
        employee.LastDepositMonth = new DateTime(now.Year, now.Month, 1);

        // Save deposit record
        var deposit = new Deposit
        {
            EmployeeId = employee.Id,
            Amount = amount,
            BonusApplied = bonusToApply,
            CreatedAt = now
        };

        _context.Deposits.Add(deposit);

        await _context.SaveChangesAsync();

        return employee;
    }
}