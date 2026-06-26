using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReportsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("monthly-spending")]
    public async Task<IActionResult> MonthlySpending()
    {
        var data = await _context.Orders
            .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                totalOrders = g.Count(),
                totalSpending = g.Sum(o => o.TotalAmount)
            })
            .OrderBy(x => x.year)
            .ThenBy(x => x.month)
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("top-employees")]
    public async Task<IActionResult> TopEmployees()
    {
        var data = await _context.Orders
            .Include(o => o.Employee)
            .GroupBy(o => new
            {
                o.EmployeeId,
                EmployeeName = o.Employee != null ? o.Employee.Name : "",
                EmployeeNumber = o.Employee != null ? o.Employee.EmployeeNumber : ""
            })
            .Select(g => new
            {
                employeeId = g.Key.EmployeeId,
                employeeName = g.Key.EmployeeName,
                employeeNumber = g.Key.EmployeeNumber,
                totalOrders = g.Count(),
                totalSpending = g.Sum(o => o.TotalAmount)
            })
            .OrderByDescending(x => x.totalOrders)
            .ThenByDescending(x => x.totalSpending)
            .Take(10)
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("highest-spending-employees")]
    public async Task<IActionResult> HighestSpendingEmployees()
    {
        var data = await _context.Orders
            .Include(o => o.Employee)
            .GroupBy(o => new
            {
                o.EmployeeId,
                EmployeeName = o.Employee != null ? o.Employee.Name : "",
                EmployeeNumber = o.Employee != null ? o.Employee.EmployeeNumber : ""
            })
            .Select(g => new
            {
                employeeId = g.Key.EmployeeId,
                employeeName = g.Key.EmployeeName,
                employeeNumber = g.Key.EmployeeNumber,
                totalOrders = g.Count(),
                totalSpending = g.Sum(o => o.TotalAmount)
            })
            .OrderByDescending(x => x.totalSpending)
            .Take(10)
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("top-restaurants")]
    public async Task<IActionResult> TopRestaurants()
    {
        var items = await _context.OrderItems.ToListAsync();

        var data = items
            .Select(i =>
            {
                var parts = i.ItemName.Split(" - ");
                var restaurantName = parts.Length > 1
                    ? parts[0]
                    : "Unknown Restaurant";

                return new
                {
                    restaurantName,
                    i.Quantity,
                    totalAmount = i.Quantity * i.UnitPriceAtTimeOfOrder
                };
            })
            .GroupBy(x => x.restaurantName)
            .Select(g => new
            {
                restaurantName = g.Key,
                totalOrders = g.Sum(x => x.Quantity),
                totalRevenue = g.Sum(x => x.totalAmount)
            })
            .OrderByDescending(x => x.totalOrders)
            .Take(10)
            .ToList();

        return Ok(data);
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var bytes = await BuildCsvBytes();

        return File(
            bytes,
            "text/csv",
            "cafeteria-orders-report.csv"
        );
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel()
    {
        var bytes = await BuildCsvBytes();

        return File(
            bytes,
            "application/vnd.ms-excel",
            "cafeteria-orders-report.xls"
        );
    }

    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf()
    {
        var orders = await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var text = new StringBuilder();

        text.AppendLine("EMPLOYEE CAFETERIA ORDERS REPORT");
        text.AppendLine("--------------------------------");
        text.AppendLine();

        foreach (var o in orders)
        {
            text.AppendLine($"Order #{o.Id}");
            text.AppendLine($"Employee: {o.Employee?.Name ?? "Unknown"}");
            text.AppendLine($"Employee Number: {o.Employee?.EmployeeNumber ?? ""}");
            text.AppendLine($"Driver: {o.Driver?.FullName ?? "Not Assigned"}");
            text.AppendLine($"Status: {o.Status}");
            text.AppendLine($"Total: R{o.TotalAmount}");
            text.AppendLine($"Date: {o.OrderDate:yyyy-MM-dd HH:mm}");
            text.AppendLine("--------------------------------");
        }

        return File(
            Encoding.UTF8.GetBytes(text.ToString()),
            "application/pdf",
            "cafeteria-orders-report.pdf"
        );
    }

    private async Task<byte[]> BuildCsvBytes()
    {
        var orders = await _context.Orders
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var csv = new StringBuilder();

        csv.AppendLine("OrderId,Employee,EmployeeNumber,Driver,OrderDate,Status,TotalAmount");

        foreach (var o in orders)
        {
            csv.AppendLine(
                $"{o.Id}," +
                $"{Escape(o.Employee?.Name)}," +
                $"{Escape(o.Employee?.EmployeeNumber)}," +
                $"{Escape(o.Driver?.FullName)}," +
                $"{o.OrderDate:yyyy-MM-dd HH:mm}," +
                $"{Escape(o.Status)}," +
                $"{o.TotalAmount}"
            );
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    private static string Escape(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "";

        return value
            .Replace(",", " ")
            .Replace(Environment.NewLine, " ")
            .Trim();
    }
}