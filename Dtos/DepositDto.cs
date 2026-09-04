using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class DepositDto
{
    [Required, StringLength(50)]
    public string EmployeeNumber { get; set; } = "";

    [Range(typeof(decimal), "1", "1000000")]
    public decimal Amount { get; set; }
}
