using Xunit;
using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using Order_App.Data;
using Order_App.Models;
using Order_App.Services;

namespace Order_App.Tests.Services;

public class DepositServiceTests
{
    private ApplicationDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task Deposit_Should_Add_Bonus_When_250_Reached()
    {
        var context = GetDbContext();

        context.Employees.Add(new Employee
        {
            EmployeeNumber = "EMP001",
            Balance = 0
        });

        await context.SaveChangesAsync();

        var service = new DepositService(context);

        var result = await service.MakeDepositAsync("EMP001", 250);

        result.Should().NotBeNull();
        result!.Balance.Should().Be(750); // 250 + 500 bonus
    }

    [Fact]
    public async Task Deposit_Should_Not_Add_Bonus_If_Less_Than_250()
    {
        var context = GetDbContext();

        context.Employees.Add(new Employee
        {
            EmployeeNumber = "EMP002",
            Balance = 0
        });

        await context.SaveChangesAsync();

        var service = new DepositService(context);

        var result = await service.MakeDepositAsync("EMP002", 100);

        result!.Balance.Should().Be(100);
    }

    [Fact]
    public async Task Deposit_Should_Return_Null_If_Invalid_Employee()
    {
        var context = GetDbContext();
        var service = new DepositService(context);

        var result = await service.MakeDepositAsync("INVALID", 250);

        result.Should().BeNull();
    }
}
