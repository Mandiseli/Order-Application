using Microsoft.IdentityModel.Tokens;
using Order_App.Data;
using Order_App.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Order_App.Services;

public class AuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;

    public AuthService(ApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    public string? Login(string username, string password)
    {
        var user = _context.Users.FirstOrDefault(u =>
            u.Username == username && u.Password == password);

        if (user == null) return null;

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            expires: DateTime.Now.AddHours(2),
            claims: claims,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}