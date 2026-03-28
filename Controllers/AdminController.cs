using Microsoft.AspNetCore.Mvc;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IOrderService _service;

    public AdminController(IOrderService service)
    {
        _service = service;
    }

    // Get all orders (admin view)
    [HttpGet("orders")]
    public async Task<IActionResult> GetAllOrders()
        => Ok(await _service.GetAllOrdersAsync());

    // Update order status (admin updates)
    [HttpPut("orders/{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return BadRequest("Status cannot be empty.");

        var order = await _service.UpdateOrderStatusAsync(id, status);
        if (order == null)
            return NotFound("Order not found.");

        return Ok(order);
    }
}