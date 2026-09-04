using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class PlaceOrderDto
{
    [Required, StringLength(50)]
    public string EmployeeNumber { get; set; } = "";

    [Required, MinLength(1)]
    public Dictionary<int, int> Items { get; set; } = new();
}
