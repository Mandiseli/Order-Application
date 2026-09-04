using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class RestaurantRatingDto
{
    [Required, StringLength(50)] public string EmployeeNumber { get; set; } = "";
    [Required, StringLength(200)] public string RestaurantName { get; set; } = "";
    [StringLength(500)] public string RestaurantAddress { get; set; } = "";
    [Range(1, 5)] public int Rating { get; set; }
    [StringLength(1000)] public string Comment { get; set; } = "";
}
