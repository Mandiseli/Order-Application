using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Order_App.Data;
using Order_App.Dtos;
using Order_App.Models;

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

    public async Task<string?> LoginAsync(string username, string password)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username && u.Password == password);

        if (user == null)
            return null;

        return GenerateToken(user);
    }

    public async Task<string> RegisterEmployeeAsync(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username))
            throw new Exception("Username is required.");

        if (string.IsNullOrWhiteSpace(dto.Password))
            throw new Exception("Password is required.");

        if (string.IsNullOrWhiteSpace(dto.EmployeeNumber))
            throw new Exception("Employee number is required.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == dto.EmployeeNumber);

        if (employee == null)
            throw new Exception("Employee number does not exist.");

        var usernameExists = await _context.Users
            .AnyAsync(u => u.Username == dto.Username);

        if (usernameExists)
            throw new Exception("Username already exists.");

        var employeeAlreadyLinked = await _context.Users
            .AnyAsync(u => u.EmployeeNumber == dto.EmployeeNumber);

        if (employeeAlreadyLinked)
            throw new Exception("This employee number already has an account.");

        var user = new User
        {
            Username = dto.Username,
            Password = dto.Password,
            Role = "Employee",
            EmployeeNumber = dto.EmployeeNumber
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return GenerateToken(user);
    }

    private string GenerateToken(User user)
    {
        var key = _config["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(key))
            throw new Exception("JWT Key is missing.");

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("role", user.Role),
            new Claim("employeeNumber", user.EmployeeNumber ?? "")
        };

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}