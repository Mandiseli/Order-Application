namespace Order_App.Models;

public class FavoriteRestaurant
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }

    public string RestaurantName { get; set; } = "";
    public string RestaurantAddress { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}