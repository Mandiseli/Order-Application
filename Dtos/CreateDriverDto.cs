using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class CreateDriverDto
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = "";

    [Required, Phone]
    public string PhoneNumber { get; set; } = "";
}
