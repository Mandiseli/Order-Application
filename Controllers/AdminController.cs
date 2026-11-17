using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order_App.Dtos;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Manager")]
[Route("api/[controller]")]
public sealed class AdminController : ControllerBase
{
    private readonly IOrderService _service;
    public AdminController(IOrderService service) => _service = service;

    [HttpGet("orders")]
    public Task<IActionResult> GetAllOrders([FromQuery] OrderQueryDto query) => GetOrders(query, null);

    [HttpGet("orders/pending")]
    public Task<IActionResult> Pending([FromQuery] OrderQueryDto query) => GetOrders(query, "Pending");

    private async Task<IActionResult> GetOrders(OrderQueryDto query, string? forcedStatus)
    {
        try
        {
            var result = await _service.SearchOrdersAsync(query.Search, forcedStatus ?? query.Status,
                query.FromDate, query.ToDate, query.Page, query.PageSize);
            return Ok(new PagedResultDto<object>
            {
                Items = result.Items.Select(ToOrderDto).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = result.TotalItems,
                TotalPages = (int)Math.Ceiling(result.TotalItems / (double)query.PageSize)
            });
        }
        catch (Exception ex) { return BadRequest(new ErrorResponse { Message = ex.Message }); }
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("orders/{id:int}/status/{status}")]
    public async Task<IActionResult> UpdateStatus(int id, string status)
    {
        try
        {
            var order = await _service.UpdateOrderStatusAsync(id, status);
            return Ok(ToOrderDto(order!));
        }
        catch (KeyNotFoundException ex) { return NotFound(new ErrorResponse { Message = ex.Message }); }
        catch (Exception ex) { return BadRequest(new ErrorResponse { Message = ex.Message }); }
    }

    private static object ToOrderDto(Order_App.Models.Order order) => new
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
}
