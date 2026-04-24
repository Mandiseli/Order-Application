using Xunit;
using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using Order_App.Data;
using Order_App.Models;
using Order_App.Services;

namespace Order_App.Tests.Services;

public class OrderServiceTests
{
    private ApplicationDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task Should_Place_Order_When_Balance_Is_Sufficient()
    {
        var context = GetDbContext();

        var employee = new Employee
        {
            EmployeeNumber = "EMP001",
            Balance = 1000
        };

        var menuItem = new MenuItem
        {
            Id = 1,
            Name = "Burger",
            Price = 100
        };

        context.Employees.Add(employee);
        context.MenuItems.Add(menuItem);

        await context.SaveChangesAsync();

        var service = new OrderService(context);

        var items = new Dictionary<int, int> { { 1, 2 } };

        var order = await service.PlaceOrderAsync("EMP001", items);

        order.Should().NotBeNull();
        order!.TotalAmount.Should().Be(200);
    }

    [Fact]
    public async Task Should_Fail_When_Insufficient_Balance()
    {
        var context = GetDbContext();

        var employee = new Employee
        {
            EmployeeNumber = "EMP002",
            Balance = 50
        };

        var menuItem = new MenuItem
        {
            Id = 1,
            Name = "Burger",
            Price = 100
        };

        context.Employees.Add(employee);
        context.MenuItems.Add(menuItem);

        await context.SaveChangesAsync();

        var service = new OrderService(context);

        var items = new Dictionary<int, int> { { 1, 1 } };

        var order = await service.PlaceOrderAsync("EMP002", items);

        order.Should().BeNull();
    }
}
