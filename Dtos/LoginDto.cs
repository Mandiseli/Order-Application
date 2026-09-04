using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class LoginDto
{
    [Required, StringLength(100)]
    public string Username { get; set; } = "";

    [Required, StringLength(200, MinimumLength = 8)]
    public string Password { get; set; } = "";
}
