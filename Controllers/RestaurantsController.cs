using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RestaurantsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RestaurantsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetRestaurants()
    {
        var restaurants = await _context.Restaurants
            .AsNoTracking()
            .Include(r => r.MenuItems)
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name,
                locationDescription = r.LocationDescription,
                imageUrl = r.ImageUrl,
                menuItems = r.MenuItems
                    .OrderBy(m => m.Name)
                    .Select(m => new
                    {
                        m.Id,
                        m.Name,
                        m.Description,
                        m.Price,
                        m.IsAvailable
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(restaurants);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> PostRestaurant([FromBody] RestaurantDto dto)
    {
        var restaurant = new Restaurant
        {
            Name = dto.Name.Trim(),
            LocationDescription = dto.LocationDescription.Trim(),
            ImageUrl = dto.ImageUrl?.Trim() ?? ""
        };

        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRestaurants), new { id = restaurant.Id }, restaurant);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateRestaurant(int id, [FromBody] RestaurantDto dto)
    {
        var restaurant = await _context.Restaurants.FindAsync(id);
        if (restaurant == null) return NotFound(new { message = "Restaurant not found." });

        restaurant.Name = dto.Name.Trim();
        restaurant.LocationDescription = dto.LocationDescription.Trim();
        restaurant.ImageUrl = dto.ImageUrl?.Trim() ?? "";

        await _context.SaveChangesAsync();
        return Ok(restaurant);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:int}/menu")]
    public async Task<IActionResult> AddMenuItem(int id, [FromBody] CreateMenuItemDto dto)
    {
        if (dto.RestaurantId != id)
            return BadRequest(new { message = "RestaurantId does not match the URL." });

        if (!await _context.Restaurants.AnyAsync(r => r.Id == id))
            return NotFound(new { message = "Restaurant not found." });

        var menuItem = new MenuItem
        {
            RestaurantId = id,
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim(),
            Price = dto.Price,
            IsAvailable = dto.IsAvailable
        };

        _context.MenuItems.Add(menuItem);
        await _context.SaveChangesAsync();

        return Ok(menuItem);
    }
}