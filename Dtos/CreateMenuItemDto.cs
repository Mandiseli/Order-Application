using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class CreateMenuItemDto
{
    [Required]
    public int RestaurantId { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = "";

    [StringLength(300)]
    public string Description { get; set; } = "";

    [Range(1, 10000)]
    public decimal Price { get; set; }

    public bool IsAvailable { get; set; } = true;
}