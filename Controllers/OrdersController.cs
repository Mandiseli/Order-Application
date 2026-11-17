using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order_App.Dtos;
using Order_App.Services;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _service;
    public OrdersController(IOrderService service) => _service = service;

    [Authorize(Roles = "Employee,Admin")]
    [HttpPost("place-external")]
    public async Task<IActionResult> PlaceExternalOrder([FromBody] ExternalOrderDto dto)
    {
        try
        {
            if (User.IsInRole("Employee"))
            {
                var employeeNumber = GetEmployeeNumber();
                if (string.IsNullOrWhiteSpace(employeeNumber)) return Unauthorized(new ErrorResponse { Message = "Employee identity is missing." });
                dto.EmployeeNumber = employeeNumber;
            }
            var order = await _service.PlaceExternalOrderAsync(dto);
            return Ok(ToOrderDto(order!));
        }
        catch (Exception ex) { return HandleException(ex); }
    }

    [Authorize(Roles = "Employee,Admin")]
    [HttpPost("reorder")]
    public async Task<IActionResult> ReOrder([FromBody] ReOrderDto dto)
    {
        try
        {
            if (User.IsInRole("Employee"))
            {
                var employeeNumber = GetEmployeeNumber();
                if (string.IsNullOrWhiteSpace(employeeNumber)) return Unauthorized(new ErrorResponse { Message = "Employee identity is missing." });
                dto.EmployeeNumber = employeeNumber;
            }
            var order = await _service.ReOrderAsync(dto);
            return Ok(ToOrderDto(order!));
        }
        catch (Exception ex) { return HandleException(ex); }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("assign-driver")]
    public async Task<IActionResult> AssignDriver([FromBody] AssignDriverDto dto)
    {
        try { var order = await _service.AssignDriverAsync(dto); return Ok(ToOrderDto(order!)); }
        catch (Exception ex) { return HandleException(ex); }
    }

    [Authorize(Roles = "Employee,Admin")]
    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        try
        {
            var employeeNumber = User.IsInRole("Employee") ? GetEmployeeNumber() : null;
            if (User.IsInRole("Employee") && string.IsNullOrWhiteSpace(employeeNumber)) return Unauthorized(new ErrorResponse { Message = "Employee identity is missing." });
            var order = await _service.CancelOrderAsync(id, employeeNumber);
            return Ok(ToOrderDto(order!));
        }
        catch (Exception ex) { return HandleException(ex); }
    }

    [Authorize(Roles = "Admin,Manager")]
    [HttpGet("all")]
    public async Task<IActionResult> GetAllOrders([FromQuery] OrderQueryDto query)
    {
        try
        {
            var result = await _service.SearchOrdersAsync(query.Search, query.Status, query.FromDate, query.ToDate, query.Page, query.PageSize);
            return Ok(new PagedResultDto<object>
            {
                Items = result.Items.Select(o => (object)ToOrderDto(o)).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = result.TotalItems,
                TotalPages = (int)Math.Ceiling(result.TotalItems / (double)query.PageSize)
            });
        }
        catch (Exception ex) { return HandleException(ex); }
    }

    [Authorize(Roles = "Employee,Admin,Manager")]
    [HttpGet("employee/{employeeNumber}")]
    public async Task<IActionResult> GetOrdersForEmployee(string employeeNumber)
    {
        try
        {
            if (User.IsInRole("Employee") && !string.Equals(GetEmployeeNumber(), employeeNumber, StringComparison.OrdinalIgnoreCase)) return Forbid();
            var orders = await _service.GetOrdersForEmployeeAsync(employeeNumber);
            return Ok(orders.Select(ToOrderDto).ToList());
        }
        catch (Exception ex) { return HandleException(ex); }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        try
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Status)) return BadRequest(new ErrorResponse { Message = "Order status is required." });
            var order = await _service.UpdateOrderStatusAsync(id, dto.Status);
            return Ok(ToOrderDto(order!));
        }
        catch (Exception ex) { return HandleException(ex); }
    }

    private string? GetEmployeeNumber() => User.FindFirst("employeeNumber")?.Value
        ?? User.FindFirst("EmployeeNumber")?.Value;

    private static object ToOrderDto(Order order) => new
    {
        id = order.Id,
        employeeId = order.EmployeeId,
        employeeName = order.Employee?.Name ?? "",
        employeeNumber = order.Employee?.EmployeeNumber ?? "",
        driverId = order.DriverId,
        driverName = order.Driver?.FullName ?? "Not Assigned",
        orderDate = order.OrderDate,
        totalAmount = order.TotalAmount,
        status = order.Status,
        estimatedDeliveryTime = order.EstimatedDeliveryTime ?? "45 minutes",
        items = order.Items.Select(i => new {
            id = i.Id,
            itemName = i.ItemName,
            quantity = i.Quantity,
            unitPriceAtTimeOfOrder = i.UnitPriceAtTimeOfOrder
        }).ToList()
    };

    private IActionResult HandleException(Exception ex) => ex switch
    {
        UnauthorizedAccessException => Forbid(),
        KeyNotFoundException => NotFound(new ErrorResponse { Message = ex.Message }),
        ArgumentException or InvalidOperationException => BadRequest(new ErrorResponse { Message = ex.Message }),
        _ => StatusCode(500, new ErrorResponse { Message = "An unexpected error occurred." })
    };
}
