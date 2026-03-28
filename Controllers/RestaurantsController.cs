using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
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

    // Get all restaurants with menus
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Restaurant>>> GetRestaurants()
        => await _context.Restaurants.Include(r => r.MenuItems).ToListAsync();

    // Add new restaurant
    [HttpPost]
    public async Task<ActionResult<Restaurant>> PostRestaurant(Restaurant restaurant)
    {
        _context.Restaurants.Add(restaurant);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetRestaurants), new { id = restaurant.Id }, restaurant);
    }

    // Add menu item to a restaurant
    [HttpPost("{id}/menu")]
    public async Task<ActionResult<MenuItem>> AddMenuItem(int id, MenuItem menuItem)
    {
        menuItem.RestaurantId = id;
        _context.MenuItems.Add(menuItem);
        await _context.SaveChangesAsync();
        return menuItem;
    }
}
