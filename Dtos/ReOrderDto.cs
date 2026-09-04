using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class ReOrderDto
{
    [Required, StringLength(50)]
    public string EmployeeNumber { get; set; } = "";

    [Range(1, int.MaxValue)]
    public int PreviousOrderId { get; set; }
}
