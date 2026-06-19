using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Models;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RestaurantRatingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RestaurantRatingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> AddRating(RestaurantRatingDto dto)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == dto.EmployeeNumber);

        if (employee == null)
            return BadRequest("Employee not found.");

        if (dto.Rating < 1 || dto.Rating > 5)
            return BadRequest("Rating must be between 1 and 5.");

        var rating = new RestaurantRating
        {
            EmployeeId = employee.Id,
            RestaurantName = dto.RestaurantName,
            RestaurantAddress = dto.RestaurantAddress,
            Rating = dto.Rating,
            Comment = dto.Comment
        };

        _context.RestaurantRatings.Add(rating);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            rating.Id,
            rating.EmployeeId,
            rating.RestaurantName,
            rating.RestaurantAddress,
            rating.Rating,
            rating.Comment,
            rating.CreatedAt
        });
    }

    [HttpGet("{restaurantName}")]
    public async Task<IActionResult> GetRatings(string restaurantName)
    {
        var ratings = await _context.RestaurantRatings
            .Include(r => r.Employee)
            .Where(r => r.RestaurantName == restaurantName)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.RestaurantName,
                r.RestaurantAddress,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                employeeName = r.Employee != null ? r.Employee.Name : ""
            })
            .ToListAsync();

        return Ok(ratings);
    }
}