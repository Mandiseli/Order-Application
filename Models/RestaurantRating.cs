namespace Order_App.Models;

public class RestaurantRating
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }

    public string RestaurantName { get; set; } = "";
    public string RestaurantAddress { get; set; } = "";
    public int Rating { get; set; }
    public string Comment { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}