using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
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

    public async Task<object> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new Exception("Invalid username or password.");

        user.RefreshToken = GenerateRefreshToken();
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        return new
        {
            accessToken = GenerateAccessToken(user),
            refreshToken = user.RefreshToken,
            role = user.Role,
            employeeNumber = user.EmployeeNumber
        };
    }

    public async Task<object> RegisterEmployeeAsync(RegisterDto dto)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeNumber == dto.EmployeeNumber);

        if (employee == null)
            throw new Exception("Employee number does not exist.");

        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            throw new Exception("Username already exists.");

        if (await _context.Users.AnyAsync(u => u.EmployeeNumber == dto.EmployeeNumber))
            throw new Exception("Employee already has an account.");

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = "Employee",
            EmployeeNumber = dto.EmployeeNumber,
            RefreshToken = GenerateRefreshToken(),
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return new
        {
            accessToken = GenerateAccessToken(user),
            refreshToken = user.RefreshToken,
            role = user.Role,
            employeeNumber = user.EmployeeNumber
        };
    }

    public async Task<object> RefreshAsync(string refreshToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

        if (user == null || user.RefreshTokenExpiresAt < DateTime.UtcNow)
            throw new Exception("Invalid or expired refresh token.");

        user.RefreshToken = GenerateRefreshToken();
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        return new
        {
            accessToken = GenerateAccessToken(user),
            refreshToken = user.RefreshToken,
            role = user.Role,
            employeeNumber = user.EmployeeNumber
        };
    }

    private string GenerateAccessToken(User user)
    {
        var key = _config["Jwt:Key"] ?? throw new Exception("JWT key missing.");

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("role", user.Role),
            new Claim("employeeNumber", user.EmployeeNumber ?? "")
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}