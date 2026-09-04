using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class FavoriteRestaurantDto
{
    [Required, StringLength(50)] public string EmployeeNumber { get; set; } = "";
    [Required, StringLength(200)] public string RestaurantName { get; set; } = "";
    [StringLength(500)] public string RestaurantAddress { get; set; } = "";
    [Range(-90, 90)] public double Latitude { get; set; }
    [Range(-180, 180)] public double Longitude { get; set; }
}
