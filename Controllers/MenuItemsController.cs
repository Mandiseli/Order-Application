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
public class MenuItemsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MenuItemsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMenuItemDto dto)
    {
        if (!await _context.Restaurants.AnyAsync(r => r.Id == dto.RestaurantId))
            return NotFound(new { message = "Restaurant not found." });

        var item = new MenuItem
        {
            RestaurantId = dto.RestaurantId,
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim(),
            Price = dto.Price,
            IsAvailable = dto.IsAvailable
        };

        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMenuItemDto dto)
    {
        if (!await _context.Restaurants.AnyAsync(r => r.Id == dto.RestaurantId))
            return NotFound(new { message = "Restaurant not found." });

        var existing = await _context.MenuItems.FindAsync(id);
        if (existing == null)
            return NotFound(new { message = "Menu item not found." });

        existing.Name = dto.Name.Trim();
        existing.Description = dto.Description.Trim();
        existing.Price = dto.Price;
        existing.RestaurantId = dto.RestaurantId;
        existing.IsAvailable = dto.IsAvailable;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpPut("{id:int}/availability")]
    public async Task<IActionResult> Availability(int id, [FromBody] bool isAvailable)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item == null) return NotFound(new { message = "Menu item not found." });

        item.IsAvailable = isAvailable;
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item == null) return NotFound(new { message = "Menu item not found." });

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
