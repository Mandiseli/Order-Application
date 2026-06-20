namespace Order_App.Models;

public class Driver
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string PhoneNumber { get; set; } = "";
    public bool IsAvailable { get; set; } = true;

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}