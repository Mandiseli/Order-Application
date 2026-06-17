namespace Order_App.Dtos;

public class FavoriteRestaurantDto
{
    public string EmployeeNumber { get; set; } = "";
    public string RestaurantName { get; set; } = "";
    public string RestaurantAddress { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}