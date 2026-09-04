using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class UpdateOrderStatusDto
{
    [Required, StringLength(40)]
    public string Status { get; set; } = "";
}
