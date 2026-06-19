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

    [HttpPost("place-external")]
    public async Task<IActionResult> PlaceExternalOrder([FromBody] ExternalOrderDto dto)
    {
        try
        {
            var order = await _orderService.PlaceExternalOrderAsync(dto);

            if (order == null)
                return BadRequest("Order could not be created.");

            return Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReOrder([FromBody] ReOrderDto dto)
    {
        try
        {
            var order = await _orderService.ReOrderAsync(dto);

            if (order == null)
                return BadRequest("Re-order could not be created.");

            return Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("assign-driver")]
    public async Task<IActionResult> AssignDriver([FromBody] AssignDriverDto dto)
    {
        try
        {
            var order = await _orderService.AssignDriverAsync(dto);

            if (order == null)
                return BadRequest("Driver could not be assigned.");

            return Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllOrders()
    {
        try
        {
            var orders = await _orderService.GetAllOrdersAsync();
            return Ok(orders.Select(ToOrderDto).ToList());
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

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
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
    {
        try
        {
            var order = await _orderService.UpdateOrderStatusAsync(id, status);

            if (order == null)
                return NotFound("Order not found.");

            return Ok(ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private static object ToOrderDto(Order_App.Models.Order order)
    {
        return new
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
    }

    private static string GetEstimatedDeliveryTime(string status)
    {
        return status switch
        {
            "Pending" => "45 minutes",
            "Preparing" => "30 minutes",
            "Ready For Pickup" => "15 minutes",
            "Out For Delivery" => "10 minutes",
            "Delivered" => "Delivered",
            _ => "Pending"
        };
    }
}