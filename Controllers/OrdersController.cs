using Microsoft.AspNetCore.Mvc;
using Order_App.Models;
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

    // Place order
    [HttpPost("place")]
    public async Task<ActionResult<Order>> PlaceOrder(string employeeNumber, Dictionary<int, int> items)
    {
        var order = await _orderService.PlaceOrderAsync(employeeNumber, items);
        if (order == null) return BadRequest("Order failed.");
        return Ok(order);
    }

    // Get orders for an employee
    [HttpGet("employee/{employeeNumber}")]
    public async Task<ActionResult<IEnumerable<Order>>> GetOrdersForEmployee(string employeeNumber)
        => Ok(await _orderService.GetOrdersForEmployeeAsync(employeeNumber));

    // Get all orders
    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<Order>>> GetAllOrders()
        => Ok(await _orderService.GetAllOrdersAsync());

    // Update order status
    [HttpPut("{id}/status")]
    public async Task<ActionResult<Order>> UpdateStatus(int id, [FromBody] string status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return BadRequest("Status cannot be empty.");

        var order = await _orderService.UpdateOrderStatusAsync(id, status);
        if (order == null) return NotFound();
        return Ok(order);
    }
}

