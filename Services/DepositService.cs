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

        // 🔥 Get all deposits THIS MONTH
        var monthlyDeposits = await _context.Transactions
            .Where(t => t.EmployeeId == employee.Id &&
                        t.Type == "Deposit" &&
                        t.CreatedAt.Year == now.Year &&
                        t.CreatedAt.Month == now.Month)
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        // Total BEFORE this deposit
        var totalBefore = monthlyDeposits;

        // Total AFTER this deposit
        var totalAfter = monthlyDeposits + amount;

        // Calculate bonus BEFORE and AFTER
        int bonusesBefore = (int)(totalBefore / 250);
        int bonusesAfter = (int)(totalAfter / 250);

        int newBonuses = bonusesAfter - bonusesBefore;

        decimal bonus = newBonuses * 500;

        // Update LastDepositMonth
        employee.LastDepositMonth = monthKey;

        // Apply balance
        employee.Balance += amount + bonus;

        // ✅ SAVE TRANSACTIONS

        // Deposit transaction
        _context.Transactions.Add(new Transaction
        {
            EmployeeId = employee.Id,
            Amount = amount,
            Type = "Deposit",
            Description = $"Deposit of R{amount}"
        });

        // Bonus transaction (only if earned)
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
}