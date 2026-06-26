using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IOrderService _service;

    public AdminController(IOrderService service)
    {
        _service = service;
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetAllOrders()
    {
        var orders = await _service.GetAllOrdersAsync();

        var result = orders.Select(ToOrderDto).ToList();

        return Ok(result);
    }

    [HttpGet("orders/pending")]
    public async Task<IActionResult> Pending()
    {
        var orders = await _service.GetAllOrdersAsync();

        var result = orders
            .Where(o => o.Status == "Pending")
            .Select(ToOrderDto)
            .ToList();

        return Ok(result);
    }

    [HttpPatch("orders/{id:int}/status/{status}")]
    public async Task<IActionResult> UpdateStatus(int id, string status)
    {
        try
        {
            var order = await _service.UpdateOrderStatusAsync(id, status);

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
            "Cancelled" => "Cancelled",
            _ => "45 minutes"
        };
    }
}