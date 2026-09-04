using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order_App.Dtos;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [Authorize(Roles = "Employee,Admin")]
    [HttpPost("place-external")]
    public async Task<IActionResult> PlaceExternalOrder([FromBody] ExternalOrderDto dto)
    {
        try
        {
            var order = await _orderService.PlaceExternalOrderAsync(dto);
            return order == null ? BadRequest(new ErrorResponse { Message = "Order could not be created." }) : Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = "Employee,Admin")]
    [HttpPost("reorder")]
    public async Task<IActionResult> ReOrder([FromBody] ReOrderDto dto)
    {
        try
        {
            var order = await _orderService.ReOrderAsync(dto);
            return order == null ? BadRequest(new ErrorResponse { Message = "Re-order could not be created." }) : Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("assign-driver")]
    public async Task<IActionResult> AssignDriver([FromBody] AssignDriverDto dto)
    {
        try
        {
            var order = await _orderService.AssignDriverAsync(dto);
            return order == null ? BadRequest(new ErrorResponse { Message = "Driver could not be assigned." }) : Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = "Employee,Admin")]
    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        try
        {
            var order = await _orderService.CancelOrderAsync(id);
            return order == null ? NotFound(new ErrorResponse { Message = "Order not found." }) : Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message });
        }
    }

    // Production-friendly orders endpoint with DB-level search/filter/pagination.
    // Example: GET /api/orders/all?search=EMP001&status=Preparing&fromDate=2026-08-01&toDate=2026-08-31&page=1&pageSize=20
    [Authorize(Roles = "Admin,Manager")]
    [HttpGet("all")]
    public async Task<IActionResult> GetAllOrders([FromQuery] OrderQueryDto query)
    {
        try
        {
            var result = await _orderService.SearchOrdersAsync(
                query.Search,
                query.Status,
                query.FromDate,
                query.ToDate,
                query.Page,
                query.PageSize);

            return Ok(new PagedResultDto<object>
            {
                Items = result.Items.Select(o => (object)ToOrderDto(o)).ToList(),
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = result.TotalItems,
                TotalPages = (int)Math.Ceiling(result.TotalItems / (double)query.PageSize)
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = "Employee,Admin,Manager")]
    [HttpGet("employee/{employeeNumber}")]
    public async Task<IActionResult> GetOrdersForEmployee(string employeeNumber)
    {
        try
        {
            var orders = await _orderService.GetOrdersForEmployeeAsync(employeeNumber);
            return Ok(orders.Select(ToOrderDto).ToList());
        }
        catch (Exception ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        try
        {
            var order = await _orderService.UpdateOrderStatusAsync(id, dto.Status);
            return order == null ? NotFound(new ErrorResponse { Message = "Order not found." }) : Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message });
        }
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
        estimatedDeliveryTime = order.EstimatedDeliveryTime ?? GetEstimatedDeliveryTime(order.Status),
        items = order.Items.Select(i => new
        {
            id = i.Id,
            itemName = i.ItemName,
            quantity = i.Quantity,
            unitPriceAtTimeOfOrder = i.UnitPriceAtTimeOfOrder
        }).ToList()
    };

    private static string GetEstimatedDeliveryTime(string status) => status switch
    {
        "Pending" => "45 minutes",
        "Preparing" => "30 minutes",
        "Ready For Pickup" => "15 minutes",
        "Out For Delivery" => "10 minutes",
        "Delivered" => "Delivered",
        "Cancelled" => "Cancelled",
        _ => "45 minutes"
    };
}