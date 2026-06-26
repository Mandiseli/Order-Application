using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MenuItemsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MenuItemsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(MenuItem item)
    {
        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, MenuItem item)
    {
        var existing = await _context.MenuItems.FindAsync(id);

        if (existing == null)
            return NotFound();

        existing.Name = item.Name;
        existing.Description = item.Description;
        existing.Price = item.Price;
        existing.RestaurantId = item.RestaurantId;
        existing.IsAvailable = item.IsAvailable;

        await _context.SaveChangesAsync();

        return Ok(existing);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/availability")]
    public async Task<IActionResult> Availability(int id, [FromBody] bool isAvailable)
    {
        var item = await _context.MenuItems.FindAsync(id);

        if (item == null)
            return NotFound();

        item.IsAvailable = isAvailable;
        await _context.SaveChangesAsync();

        return Ok(item);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _context.MenuItems.FindAsync(id);

        if (item == null)
            return NotFound();

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}