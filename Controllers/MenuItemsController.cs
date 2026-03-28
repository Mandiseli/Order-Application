using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MenuItemsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public MenuItemsController(ApplicationDbContext db) => _db = db;

    // Create a menu item
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MenuItem item)
    {
        _db.MenuItems.Add(item);
        await _db.SaveChangesAsync();
        return Created($"api/restaurants/{item.RestaurantId}/menu", item);
    }

    // Update a menu item
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] MenuItem item)
    {
        if (id != item.Id) return BadRequest();
        _db.Entry(item).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Delete a menu item
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var mi = await _db.MenuItems.FindAsync(id);
        if (mi == null) return NotFound();
        _db.MenuItems.Remove(mi);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}