using Microsoft.AspNetCore.Mvc;
using Order_App.Models;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepositsController : ControllerBase
{
    private readonly IDepositService _depositService;

    public DepositsController(IDepositService depositService)
    {
        _depositService = depositService;
    }

    // Make a deposit
    [HttpPost]
    public async Task<ActionResult<Employee>> Deposit(string employeeNumber, decimal amount)
    {
        var result = await _depositService.MakeDepositAsync(employeeNumber, amount);
        if (result == null) return BadRequest("Deposit failed.");
        return Ok(result);
    }
}