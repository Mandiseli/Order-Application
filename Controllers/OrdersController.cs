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

    [HttpGet("all")]
    public async Task<IActionResult> GetAllOrders()
    {
        var orders = await _orderService.GetAllOrdersAsync();

        var result = orders.Select(o => new
        {
            id = o.Id,
            employeeId = o.EmployeeId,
            employeeName = o.Employee == null ? "" : o.Employee.Name,
            employeeNumber = o.Employee == null ? "" : o.Employee.EmployeeNumber,
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

    [HttpGet("employee/{employeeNumber}")]
    public async Task<IActionResult> GetOrdersForEmployee(string employeeNumber)
    {
        var orders = await _orderService.GetOrdersForEmployeeAsync(employeeNumber);

        var result = orders.Select(o => new
        {
            id = o.Id,
            employeeId = o.EmployeeId,
            employeeName = o.Employee == null ? "" : o.Employee.Name,
            employeeNumber = o.Employee == null ? "" : o.Employee.EmployeeNumber,
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

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
    {
        try
        {
            var order = await _orderService.UpdateOrderStatusAsync(id, status);

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