using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Order_App.Dtos;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(
        IOrderService orderService)
    {
        _orderService = orderService;
    }

    /*
     * =========================================================
     * PLACE EXTERNAL ORDER
     * =========================================================
     */
    [Authorize(Roles = "Employee,Admin")]
    [HttpPost("place-external")]
    public async Task<IActionResult>
        PlaceExternalOrder(
            [FromBody] ExternalOrderDto dto)
    {
        try
        {
            /*
             * Employees cannot choose another employee
             * number from the browser.
             */
            if (User.IsInRole("Employee"))
            {
                var loggedInEmployee =
                    GetEmployeeNumberFromClaims();

                if (string.IsNullOrWhiteSpace(
                        loggedInEmployee))
                {
                    return Unauthorized(
                        new ErrorResponse
                        {
                            Message =
                                "Employee identity is missing."
                        });
                }

                dto.EmployeeNumber =
                    loggedInEmployee;
            }

            var order =
                await _orderService
                    .PlaceExternalOrderAsync(dto);

            return order == null
                ? BadRequest(
                    new ErrorResponse
                    {
                        Message =
                            "Order could not be created."
                    })
                : Ok(
                    ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /*
     * =========================================================
     * REORDER
     * =========================================================
     */
    [Authorize(Roles = "Employee,Admin")]
    [HttpPost("reorder")]
    public async Task<IActionResult>
        ReOrder(
            [FromBody] ReOrderDto dto)
    {
        try
        {
            if (User.IsInRole("Employee"))
            {
                var employeeNumber =
                    GetEmployeeNumberFromClaims();

                if (string.IsNullOrWhiteSpace(
                        employeeNumber))
                {
                    return Unauthorized(
                        new ErrorResponse
                        {
                            Message =
                                "Employee identity is missing."
                        });
                }

                dto.EmployeeNumber =
                    employeeNumber;
            }

            var order =
                await _orderService
                    .ReOrderAsync(dto);

            return order == null
                ? BadRequest(
                    new ErrorResponse
                    {
                        Message =
                            "Re-order could not be created."
                    })
                : Ok(
                    ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /*
     * =========================================================
     * ASSIGN DRIVER
     * =========================================================
     */
    [Authorize(Roles = "Admin")]
    [HttpPut("assign-driver")]
    public async Task<IActionResult>
        AssignDriver(
            [FromBody] AssignDriverDto dto)
    {
        try
        {
            var order =
                await _orderService
                    .AssignDriverAsync(dto);

            return order == null
                ? BadRequest(
                    new ErrorResponse
                    {
                        Message =
                            "Driver could not be assigned."
                    })
                : Ok(
                    ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /*
     * =========================================================
     * CANCEL ORDER
     * =========================================================
     */
    [Authorize(Roles = "Employee,Admin")]
    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult>
        CancelOrder(
            int id)
    {
        try
        {
            var order =
                await _orderService
                    .CancelOrderAsync(id);

            return order == null
                ? NotFound(
                    new ErrorResponse
                    {
                        Message =
                            "Order not found."
                    })
                : Ok(
                    ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /*
     * =========================================================
     * ALL ORDERS
     * =========================================================
     */
    [Authorize(Roles = "Admin,Manager")]
    [HttpGet("all")]
    public async Task<IActionResult>
        GetAllOrders(
            [FromQuery] OrderQueryDto query)
    {
        try
        {
            var result =
                await _orderService
                    .SearchOrdersAsync(
                        query.Search,
                        query.Status,
                        query.FromDate,
                        query.ToDate,
                        query.Page,
                        query.PageSize);

            return Ok(
                new PagedResultDto<object>
                {
                    Items =
                        result.Items
                            .Select(
                                o =>
                                    (object)
                                    ToOrderDto(o))
                            .ToList(),

                    Page =
                        query.Page,

                    PageSize =
                        query.PageSize,

                    TotalItems =
                        result.TotalItems,

                    TotalPages =
                        (int)Math.Ceiling(
                            result.TotalItems /
                            (double)query.PageSize)
                });
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /*
     * =========================================================
     * EMPLOYEE ORDERS
     * =========================================================
     */
    [Authorize(Roles = "Employee,Admin,Manager")]
    [HttpGet("employee/{employeeNumber}")]
    public async Task<IActionResult>
        GetOrdersForEmployee(
            string employeeNumber)
    {
        try
        {
            if (User.IsInRole("Employee"))
            {
                var loggedInEmployee =
                    GetEmployeeNumberFromClaims();

                if (!string.Equals(
                        loggedInEmployee,
                        employeeNumber,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid();
                }
            }

            var orders =
                await _orderService
                    .GetOrdersForEmployeeAsync(
                        employeeNumber);

            return Ok(
                orders
                    .Select(ToOrderDto)
                    .ToList());
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /*
     * =========================================================
     * UPDATE STATUS
     * =========================================================
     */
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult>
        UpdateStatus(
            int id,
            [FromBody]
            UpdateOrderStatusDto dto)
    {
        try
        {
            if (dto == null ||
                string.IsNullOrWhiteSpace(
                    dto.Status))
            {
                return BadRequest(
                    new ErrorResponse
                    {
                        Message =
                            "Order status is required."
                    });
            }

            var order =
                await _orderService
                    .UpdateOrderStatusAsync(
                        id,
                        dto.Status);

            return order == null
                ? NotFound(
                    new ErrorResponse
                    {
                        Message =
                            "Order not found."
                    })
                : Ok(
                    ToOrderDto(order));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /*
     * =========================================================
     * CLAIM EMPLOYEE NUMBER
     * =========================================================
     */
    private string? GetEmployeeNumberFromClaims()
    {
        return User.FindFirst(
                "employeeNumber")
            ?.Value;
    }

    /*
     * =========================================================
     * DTO MAPPING
     * =========================================================
     */
    private static object ToOrderDto(
        Order_App.Models.Order order)
    {
        return new
        {
            id =
                order.Id,

            employeeId =
                order.EmployeeId,

            employeeName =
                order.Employee?.Name
                ?? "",

            employeeNumber =
                order.Employee?.EmployeeNumber
                ?? "",

            driverId =
                order.DriverId,

            driverName =
                order.Driver?.FullName
                ?? "Not Assigned",

            orderDate =
                order.OrderDate,

            totalAmount =
                order.TotalAmount,

            status =
                order.Status,

            estimatedDeliveryTime =
                order.EstimatedDeliveryTime
                ?? GetEstimatedDeliveryTime(
                    order.Status),

            items =
                order.Items
                    .Select(
                        i =>
                            new
                            {
                                id =
                                    i.Id,

                                itemName =
                                    i.ItemName,

                                quantity =
                                    i.Quantity,

                                unitPriceAtTimeOfOrder =
                                    i.UnitPriceAtTimeOfOrder
                            })
                    .ToList()
        };
    }

    /*
     * =========================================================
     * ERROR RESPONSE
     * =========================================================
     */
    private IActionResult HandleException(
        Exception ex)
    {
        if (ex is UnauthorizedAccessException)
        {
            return Unauthorized(
                new ErrorResponse
                {
                    Message =
                        ex.Message
                });
        }

        if (ex is KeyNotFoundException)
        {
            return NotFound(
                new ErrorResponse
                {
                    Message =
                        ex.Message
                });
        }

        if (ex is ArgumentException ||
            ex is InvalidOperationException)
        {
            return BadRequest(
                new ErrorResponse
                {
                    Message =
                        ex.Message
                });
        }

        return StatusCode(
            StatusCodes.Status500InternalServerError,
            new ErrorResponse
            {
                Message =
                    "An unexpected error occurred."
            });
    }

    /*
     * =========================================================
     * ETA
     * =========================================================
     */
    private static string
        GetEstimatedDeliveryTime(
            string status)
    {
        return status switch
        {
            "Pending" =>
                "45 minutes",

            "Preparing" =>
                "30 minutes",

            "Ready For Pickup" =>
                "15 minutes",

            "Out For Delivery" =>
                "10 minutes",

            "Delivered" =>
                "Delivered",

            "Cancelled" =>
                "Cancelled",

            _ =>
                "45 minutes"
        };
    }
}