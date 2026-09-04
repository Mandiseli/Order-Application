using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = "";
}
