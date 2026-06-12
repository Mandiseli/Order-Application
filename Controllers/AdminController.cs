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

    [HttpGet("orders")]
    public async Task<IActionResult> GetAllOrders()
    {
        var orders = await _service.GetAllOrdersAsync();

        var result = orders.Select(o => new
        {
            id = o.Id,
            employeeId = o.EmployeeId,
            employeeName = o.Employee?.Name ?? "",
            employeeNumber = o.Employee?.EmployeeNumber ?? "",
            orderDate = o.OrderDate,
            totalAmount = o.TotalAmount,
            status = o.Status,
            items = o.Items.Select(i => new
            {
                id = i.Id,
                itemName = i.ItemName,
                quantity = i.Quantity,
                unitPriceAtTimeOfOrder = i.UnitPriceAtTimeOfOrder
            }).ToList()
        }).ToList();

        return Ok(result);
    }

    [HttpGet("orders/pending")]
    public async Task<IActionResult> Pending()
    {
        var orders = await _service.GetAllOrdersAsync();

        var result = orders
            .Where(o => o.Status == "Pending")
            .Select(o => new
            {
                id = o.Id,
                employeeId = o.EmployeeId,
                employeeName = o.Employee?.Name ?? "",
                employeeNumber = o.Employee?.EmployeeNumber ?? "",
                orderDate = o.OrderDate,
                totalAmount = o.TotalAmount,
                status = o.Status,
                items = o.Items.Select(i => new
                {
                    id = i.Id,
                    itemName = i.ItemName,
                    quantity = i.Quantity,
                    unitPriceAtTimeOfOrder = i.UnitPriceAtTimeOfOrder
                }).ToList()
            }).ToList();

        return Ok(result);
    }

    [HttpPatch("orders/{id:int}/status/{status}")]
    public async Task<IActionResult> UpdateStatus(int id, string status)
    {
        try
        {
            var order = await _service.UpdateOrderStatusAsync(id, status);

            return Ok(new
            {
                id = order!.Id,
                employeeId = order.EmployeeId,
                totalAmount = order.TotalAmount,
                status = order.Status,
                orderDate = order.OrderDate
            });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}