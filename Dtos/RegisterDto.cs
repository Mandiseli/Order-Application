using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class RegisterDto
{
    [Required(ErrorMessage = "Username is required.")]
    [StringLength(100, MinimumLength = 3,
        ErrorMessage = "Username must be between 3 and 100 characters.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [StringLength(200, MinimumLength = 8,
        ErrorMessage = "Password must be at least 8 characters.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Employee number is required.")]
    [StringLength(50, MinimumLength = 3,
        ErrorMessage = "Employee number must be valid.")]
    public string EmployeeNumber { get; set; } = string.Empty;
}