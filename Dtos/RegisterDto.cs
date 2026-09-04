using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class RegisterDto
{
    [Required, StringLength(100, MinimumLength = 3)]
    public string Username { get; set; } = "";

    [Required, StringLength(200, MinimumLength = 8)]
    public string Password { get; set; } = "";

    [Required, StringLength(50)]
    public string EmployeeNumber { get; set; } = "";
}
