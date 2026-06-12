using Microsoft.AspNetCore.Mvc;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlacesController : ControllerBase
{
    private readonly IGeoapifyService _service;

    public PlacesController(IGeoapifyService service)
    {
        _service = service;
    }

    [HttpGet("restaurants/{city}")]
    public async Task<IActionResult> GetRestaurants(string city)
    {
        try
        {
            var result = await _service.GetRestaurantsByCityAsync(city);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }
}