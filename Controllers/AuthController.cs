using Microsoft.AspNetCore.Mvc;
using Order_App.Services;

namespace Order_App.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("login")]
    public IActionResult Login(string username, string password)
    {
        var token = _auth.Login(username, password);
        if (token == null) return Unauthorized();

        return Ok(new { token });
    }
}