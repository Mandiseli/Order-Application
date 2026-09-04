using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class ExternalOrderDto
{
    [Required, StringLength(50)]
    public string EmployeeNumber { get; set; } = "";

    [Required, MinLength(1)]
    public List<ExternalOrderItemDto> Items { get; set; } = new();
}

public class ExternalOrderItemDto
{
    [Required, StringLength(200)]
    public string ItemName { get; set; } = "";

    [Range(typeof(decimal), "0.01", "100000")]
    public decimal Price { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; }
}
