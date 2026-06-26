using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class DriversController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DriversController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetDrivers()
    {
        var drivers = await _context.Drivers
            .OrderBy(d => d.FullName)
            .Select(d => new
            {
                d.Id,
                d.FullName,
                d.PhoneNumber,
                d.IsAvailable
            })
            .ToListAsync();

        return Ok(drivers);
    }

    [HttpPost]
    public async Task<IActionResult> CreateDriver([FromBody] CreateDriverDto dto)
    {
        if (dto == null)
            return BadRequest("Invalid request.");

        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest("Driver name is required.");

        var driver = new Driver
        {
            FullName = dto.FullName.Trim(),
            PhoneNumber = dto.PhoneNumber?.Trim() ?? "",
            IsAvailable = true
        };

        _context.Drivers.Add(driver);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            driver.Id,
            driver.FullName,
            driver.PhoneNumber,
            driver.IsAvailable
        });
    }

    [HttpPut("{id:int}/availability")]
    public async Task<IActionResult> UpdateAvailability(int id, [FromBody] bool isAvailable)
    {
        var driver = await _context.Drivers.FindAsync(id);

        if (driver == null)
            return NotFound("Driver not found.");

        driver.IsAvailable = isAvailable;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            driver.Id,
            driver.FullName,
            driver.PhoneNumber,
            driver.IsAvailable
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDriver(int id)
    {
        var driver = await _context.Drivers.FindAsync(id);

        if (driver == null)
            return NotFound("Driver not found.");

        _context.Drivers.Remove(driver);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}