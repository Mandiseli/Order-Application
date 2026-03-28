using Order_App.Models;

namespace Order_App.Models;

public class Order
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending";

    public Employee? Employee { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
