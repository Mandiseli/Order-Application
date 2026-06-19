namespace Order_App.Dtos;

public class RestaurantRatingDto
{
    public string EmployeeNumber { get; set; } = "";
    public string RestaurantName { get; set; } = "";
    public string RestaurantAddress { get; set; } = "";
    public int Rating { get; set; }
    public string Comment { get; set; } = "";
}