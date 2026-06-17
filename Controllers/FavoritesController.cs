using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FavoritesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public FavoritesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> AddFavorite(FavoriteRestaurantDto dto)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == dto.EmployeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        var exists = await _context.FavoriteRestaurants.AnyAsync(f =>
            f.EmployeeId == employee.Id &&
            f.RestaurantName == dto.RestaurantName);

        if (exists)
            return BadRequest("Restaurant already added to favorites.");

        var favorite = new FavoriteRestaurant
        {
            EmployeeId = employee.Id,
            RestaurantName = dto.RestaurantName,
            RestaurantAddress = dto.RestaurantAddress,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude
        };

        _context.FavoriteRestaurants.Add(favorite);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            favorite.Id,
            favorite.EmployeeId,
            favorite.RestaurantName,
            favorite.RestaurantAddress,
            favorite.Latitude,
            favorite.Longitude,
            favorite.CreatedAt
        });
    }

    [HttpGet("{employeeNumber}")]
    public async Task<IActionResult> GetFavorites(string employeeNumber)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == employeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        var favorites = await _context.FavoriteRestaurants
            .Where(f => f.EmployeeId == employee.Id)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.Id,
                f.RestaurantName,
                f.RestaurantAddress,
                f.Latitude,
                f.Longitude,
                f.CreatedAt
            })
            .ToListAsync();

        return Ok(favorites);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteFavorite(int id)
    {
        var favorite = await _context.FavoriteRestaurants.FindAsync(id);

        if (favorite == null)
            return NotFound();

        _context.FavoriteRestaurants.Remove(favorite);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}