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
        if (amount <= 0) return null;

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null) return null;

        var now = DateTime.UtcNow;
        var monthKey = new DateTime(now.Year, now.Month, 1);

        if (employee.LastDepositMonth != monthKey)
        {
            employee.LastDepositMonth = monthKey;
        }

        decimal bonus = 0;
        int eligibleBonuses = (int)(amount / 250);
        bonus = eligibleBonuses * 500;

        // Apply balance
        employee.Balance += amount + bonus;

        // SAVE TRANSACTIONS

        // Deposit record
        _context.Transactions.Add(new Transaction
        {
            EmployeeId = employee.Id,
            Amount = amount,
            Type = "Deposit",
            Description = $"Deposit of R{amount}"
        });

        // Bonus record
        if (bonus > 0)
        {
            _context.Transactions.Add(new Transaction
            {
                EmployeeId = employee.Id,
                Amount = bonus,
                Type = "Bonus",
                Description = $"Bonus awarded R{bonus}"
            });
        }

        await _context.SaveChangesAsync();
        return employee;
    }