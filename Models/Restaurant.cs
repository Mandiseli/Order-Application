using Order_App.Models;

namespace Order_App.Models;

public class Restaurant
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string LocationDescription { get; set; } = "";
    public string ContactNumber { get; set; } = "";

    public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
}
