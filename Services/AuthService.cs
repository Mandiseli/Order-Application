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

    public AuthService(
        ApplicationDbContext context,
        IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // =========================================================
    // LOGIN
    // =========================================================

    public async Task<object> LoginAsync(LoginDto dto)
    {
        if (dto == null)
            throw new ArgumentException("Login request is required.");

        var username = dto.Username?.Trim();

        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required.");

        if (string.IsNullOrWhiteSpace(dto.Password))
            throw new ArgumentException("Password is required.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.Username.ToLower() == username.ToLower());

        if (user == null)
            throw new Exception("Invalid username or password.");

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
            throw new Exception("This account has an invalid password configuration.");

        var validPassword = BCrypt.Net.BCrypt.Verify(
            dto.Password,
            user.PasswordHash);

        if (!validPassword)
            throw new Exception("Invalid username or password.");

        user.RefreshToken = GenerateRefreshToken();

        user.RefreshTokenExpiresAt =
            DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        return new
        {
            accessToken = GenerateAccessToken(user),
            refreshToken = user.RefreshToken,
            role = user.Role,
            employeeNumber = user.EmployeeNumber ?? string.Empty,
            username = user.Username
        };
    }

    // =========================================================
    // REGISTER EMPLOYEE
    // =========================================================

    public async Task<object> RegisterEmployeeAsync(RegisterDto dto)
    {
        if (dto == null)
            throw new ArgumentException(
                "Registration request is required.");

        var username = dto.Username?.Trim();
        var employeeNumber = dto.EmployeeNumber?.Trim();

        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required.");

        if (string.IsNullOrWhiteSpace(dto.Password))
            throw new ArgumentException("Password is required.");

        if (dto.Password.Length < 8)
            throw new ArgumentException(
                "Password must be at least 8 characters.");

        if (string.IsNullOrWhiteSpace(employeeNumber))
            throw new ArgumentException(
                "Employee number is required.");

        // -----------------------------------------------------
        // Check employee exists
        // -----------------------------------------------------

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e =>
                e.EmployeeNumber.ToLower() ==
                employeeNumber.ToLower());

        if (employee == null)
        {
            throw new ArgumentException(
                $"Employee number '{employeeNumber}' does not exist. " +
                "Please contact your administrator.");
        }

        // -----------------------------------------------------
        // Check username
        // -----------------------------------------------------

        var usernameExists = await _context.Users
            .AnyAsync(u =>
                u.Username.ToLower() ==
                username.ToLower());

        if (usernameExists)
        {
            throw new ArgumentException(
                "Username already exists. Please choose another username.");
        }

        // -----------------------------------------------------
        // Check employee account
        // -----------------------------------------------------

        var employeeAccountExists = await _context.Users
            .AnyAsync(u =>
                u.EmployeeNumber != null &&
                u.EmployeeNumber.ToLower() ==
                employeeNumber.ToLower());

        if (employeeAccountExists)
        {
            throw new ArgumentException(
                "This employee already has an account. Please login instead.");
        }

        // -----------------------------------------------------
        // Create account
        // -----------------------------------------------------

        var user = new User
        {
            Username = username,

            PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(
                    dto.Password),

            Role = "Employee",

            EmployeeNumber = employee.EmployeeNumber,

            RefreshToken = GenerateRefreshToken(),

            RefreshTokenExpiresAt =
                DateTime.UtcNow.AddDays(7)
        };

        _context.Users.Add(user);

        await _context.SaveChangesAsync();

        // -----------------------------------------------------
        // Return authentication tokens
        // -----------------------------------------------------

        return new
        {
            accessToken = GenerateAccessToken(user),
            refreshToken = user.RefreshToken,
            role = user.Role,
            employeeNumber = user.EmployeeNumber ?? string.Empty,
            username = user.Username
        };
    }

    // =========================================================
    // REFRESH TOKEN
    // =========================================================

    public async Task<object> RefreshAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new ArgumentException(
                "Refresh token is required.");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.RefreshToken == refreshToken);

        if (user == null)
        {
            throw new Exception(
                "Invalid refresh token.");
        }

        if (!user.RefreshTokenExpiresAt.HasValue ||
            user.RefreshTokenExpiresAt.Value <= DateTime.UtcNow)
        {
            throw new Exception(
                "Refresh token has expired. Please login again.");
        }

        // Rotate refresh token
        user.RefreshToken = GenerateRefreshToken();

        user.RefreshTokenExpiresAt =
            DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        return new
        {
            accessToken = GenerateAccessToken(user),
            refreshToken = user.RefreshToken,
            role = user.Role,
            employeeNumber = user.EmployeeNumber ?? string.Empty,
            username = user.Username
        };
    }

    // =========================================================
    // ACCESS TOKEN
    // =========================================================

    private string GenerateAccessToken(User user)
    {
        var key =
            Environment.GetEnvironmentVariable("JWT_KEY")
            ?? _config["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(key))
        {
            throw new Exception(
                "JWT key is not configured.");
        }

        if (Encoding.UTF8.GetByteCount(key) < 32)
        {
            throw new Exception(
                "JWT key must be at least 32 bytes long.");
        }

        var claims = new List<Claim>
        {
            new Claim(
                ClaimTypes.Name,
                user.Username),

            new Claim(
                ClaimTypes.Role,
                user.Role),

            new Claim(
                "role",
                user.Role),

            new Claim(
                "employeeNumber",
                user.EmployeeNumber ?? string.Empty)
        };

        var securityKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(key));

        var credentials =
            new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }

    // =========================================================
    // REFRESH TOKEN GENERATOR
    // =========================================================

    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(
            RandomNumberGenerator.GetBytes(64));
    }
}