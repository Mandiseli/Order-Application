using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class RestaurantDto
{
    [Required, StringLength(200)]
    public string Name { get; set; } = "";

    [StringLength(500)]
    public string LocationDescription { get; set; } = "";

    [Url, StringLength(1000)]
    public string? ImageUrl { get; set; }
}
