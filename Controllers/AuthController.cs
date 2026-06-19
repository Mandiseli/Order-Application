using Microsoft.AspNetCore.Mvc;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(string username, string password)
    {
        var token = await _authService.LoginAsync(username, password);

        if (token == null)
            return Unauthorized("Invalid username or password.");

        return Ok(new { token });
    }
}