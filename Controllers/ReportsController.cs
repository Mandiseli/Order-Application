using System.Text;
using System.Xml.Linq;
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
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(ApplicationDbContext context, ILogger<ReportsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET /api/reports/monthly-spending?year=2026&month=8
    [HttpGet("monthly-spending")]
    public async Task<IActionResult> MonthlySpending([FromQuery] int? year, [FromQuery] int? month)
    {
        if (year is < 2000 or > 2100)
            return BadRequest(new { message = "Year must be between 2000 and 2100." });

        if (month is < 1 or > 12)
            return BadRequest(new { message = "Month must be between 1 and 12." });

        var query = _context.Orders.AsNoTracking().AsQueryable();

        if (year.HasValue)
            query = query.Where(o => o.OrderDate.Year == year.Value);

        if (month.HasValue)
            query = query.Where(o => o.OrderDate.Month == month.Value);

        var data = await query
            .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                label = $"{g.Key.Year}-{g.Key.Month:D2}",
                totalOrders = g.Count(),
                totalSpending = g.Sum(o => o.TotalAmount)
            })
            .OrderBy(x => x.year)
            .ThenBy(x => x.month)
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("top-employees")]
    public async Task<IActionResult> TopEmployees([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!TryValidateFilter(year, month, out var error)) return BadRequest(new { message = error });
        var query = FilterOrders(year, month);

        var data = await query
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
    public async Task<IActionResult> HighestSpendingEmployees([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!TryValidateFilter(year, month, out var error)) return BadRequest(new { message = error });
        var query = FilterOrders(year, month);

        var data = await query
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
    public async Task<IActionResult> TopRestaurants([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!TryValidateFilter(year, month, out var error)) return BadRequest(new { message = error });
        var query = FilterOrders(year, month);

        // External orders keep the restaurant name as "Restaurant - Item" in ItemName.
        var items = await query
            .SelectMany(o => o.Items)
            .AsNoTracking()
            .ToListAsync();

        var data = items
            .Select(i =>
            {
                var separator = i.ItemName.IndexOf(" - ", StringComparison.Ordinal);
                var restaurantName = separator > 0
                    ? i.ItemName[..separator].Trim()
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

    // Pie-chart data: Pending, Preparing, Ready For Pickup, Out For Delivery, Delivered, Cancelled.
    [HttpGet("order-status")]
    public async Task<IActionResult> OrderStatus([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!TryValidateFilter(year, month, out var error)) return BadRequest(new { message = error });
        var query = FilterOrders(year, month);

        var data = await query
            .GroupBy(o => o.Status)
            .Select(g => new
            {
                status = g.Key,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!TryValidateFilter(year, month, out var error)) return BadRequest(new { message = error });
        var orders = await FilterOrders(year, month)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("OrderId,Employee,EmployeeNumber,Driver,OrderDate,Status,TotalAmount");

        foreach (var o in orders)
        {
            csv.AppendLine(string.Join(",",
                o.Id,
                Csv(o.Employee?.Name),
                Csv(o.Employee?.EmployeeNumber),
                Csv(o.Driver?.FullName),
                Csv(o.OrderDate.ToString("yyyy-MM-dd HH:mm:ss")),
                Csv(o.Status),
                o.TotalAmount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)));
        }

        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "cafeteria-orders-report.csv");
    }

    // Excel-compatible SpreadsheetML 2003 workbook. It is a real Excel workbook
    // and does not require a third-party package.
    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!TryValidateFilter(year, month, out var error)) return BadRequest(new { message = error });
        var orders = await FilterOrders(year, month)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        XNamespace ss = "urn:schemas-microsoft-com:office:spreadsheet";
        XNamespace o = "urn:schemas-microsoft-com:office:office";
        XNamespace x = "urn:schemas-microsoft-com:office:excel";
        XNamespace html = "http://www.w3.org/TR/REC-html40";

        var workbook = new XElement(ss + "Workbook",
            new XAttribute(XNamespace.Xmlns + "ss", ss),
            new XAttribute(XNamespace.Xmlns + "o", o),
            new XAttribute(XNamespace.Xmlns + "x", x),
            new XAttribute(XNamespace.Xmlns + "html", html),
            new XElement(ss + "Worksheet", new XAttribute(ss + "Name", "Orders"),
                new XElement(ss + "Table",
                    new XElement(ss + "Row", new[] { "Order ID", "Employee", "Employee Number", "Driver", "Order Date", "Status", "Total Amount" }
                        .Select(h => new XElement(ss + "Cell", new XElement(ss + "Data", new XAttribute(ss + "Type", "String"), h)))),
                    orders.Select(o => new XElement(ss + "Row",
                        Cell(o.Id.ToString(), "Number", ss),
                        Cell(o.Employee?.Name ?? "", "String", ss),
                        Cell(o.Employee?.EmployeeNumber ?? "", "String", ss),
                        Cell(o.Driver?.FullName ?? "Not Assigned", "String", ss),
                        Cell(o.OrderDate.ToString("yyyy-MM-dd HH:mm:ss"), "String", ss),
                        Cell(o.Status, "String", ss),
                        Cell(o.TotalAmount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture), "Number", ss)
                    ))
                )));

        var bytes = Encoding.UTF8.GetBytes(workbook.ToString(SaveOptions.DisableFormatting));
        return File(bytes, "application/vnd.ms-excel", "cafeteria-orders-report.xls");
    }

    // Produces a standards-compliant, simple text PDF without requiring a PDF package.
    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf([FromQuery] int? year, [FromQuery] int? month)
    {
        if (!TryValidateFilter(year, month, out var error)) return BadRequest(new { message = error });
        var orders = await FilterOrders(year, month)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        try
        {
            var pdf = SimplePdfBuilder.Build(orders);
            return File(pdf, "application/pdf", "cafeteria-orders-report.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create PDF report");
            return StatusCode(500, new { message = "The PDF report could not be generated." });
        }
    }

    private bool TryValidateFilter(int? year, int? month, out string? error)
    {
        if (year is < 2000 or > 2100)
        {
            error = "Year must be between 2000 and 2100.";
            return false;
        }

        if (month is < 1 or > 12)
        {
            error = "Month must be between 1 and 12.";
            return false;
        }

        error = null;
        return true;
    }

    private IQueryable<Order_App.Models.Order> FilterOrders(int? year, int? month)
    {
        var query = _context.Orders
            .AsNoTracking()
            .Include(o => o.Employee)
            .Include(o => o.Driver)
            .Include(o => o.Items)
            .AsQueryable();

        if (year.HasValue) query = query.Where(o => o.OrderDate.Year == year.Value);
        if (month.HasValue) query = query.Where(o => o.OrderDate.Month == month.Value);

        return query;
    }

    private static XElement Cell(string value, string type, XNamespace ss) =>
        new XElement(ss + "Cell", new XElement(ss + "Data", new XAttribute(ss + "Type", type), value));

    private static string Csv(string? value)
    {
        var text = value ?? "";
        return $"\"{text.Replace("\"", "\"\"").Replace("\r", " ").Replace("\n", " ")}\"";
    }

    private static class SimplePdfBuilder
    {
        public static byte[] Build(IReadOnlyList<Order_App.Models.Order> orders)
        {
            var lines = new List<string>
            {
                "EMPLOYEE CAFETERIA ORDERS REPORT",
                $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC",
                ""
            };

            foreach (var o in orders)
            {
                lines.Add($"Order #{o.Id} | {o.Employee?.Name ?? "Unknown"} | {o.Status} | R{o.TotalAmount:0.00} | {o.OrderDate:yyyy-MM-dd HH:mm}");
                lines.Add($"Driver: {o.Driver?.FullName ?? "Not Assigned"}");
                lines.Add("");
            }

            var objects = new List<string>();
            objects.Add("<< /Type /Catalog /Pages 2 0 R >>");
            objects.Add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");

            var content = new StringBuilder();
            content.Append("BT /F1 10 Tf 40 800 Td 14 TL ");
            foreach (var line in lines.Take(52))
            {
                var safe = EscapePdf(line.Length > 110 ? line[..110] : line);
                content.Append($"({safe}) Tj T* ");
            }
            content.Append("ET");

            objects.Add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
            objects.Add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
            objects.Add($"<< /Length {Encoding.ASCII.GetByteCount(content.ToString())} >>\nstream\n{content}\nendstream");

            using var ms = new MemoryStream();
            using var writer = new StreamWriter(ms, Encoding.ASCII, leaveOpen: true);
            writer.WriteLine("%PDF-1.4");
            writer.Flush();

            var offsets = new List<long> { 0 };
            for (var i = 0; i < objects.Count; i++)
            {
                offsets.Add(ms.Position);
                writer.WriteLine($"{i + 1} 0 obj");
                writer.WriteLine(objects[i]);
                writer.WriteLine("endobj");
                writer.Flush();
            }

            var xref = ms.Position;
            writer.WriteLine($"xref\n0 {objects.Count + 1}");
            writer.WriteLine("0000000000 65535 f ");
            for (var i = 1; i < offsets.Count; i++)
                writer.WriteLine($"{offsets[i]:D10} 00000 n ");
            writer.WriteLine($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF");
            writer.Flush();

            return ms.ToArray();
        }

        private static string EscapePdf(string text) => text
            .Replace("\\", "\\\\")
            .Replace("(", "\\(")
            .Replace(")", "\\)");
    }
}
