using System.Text.Json.Serialization;

namespace Order_App.Models;

public class Order
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }

    public int? DriverId { get; set; }

    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "Pending";

    public string? EstimatedDeliveryTime { get; set; } = "45 minutes";

    [JsonIgnore]
    public Employee? Employee { get; set; }

    [JsonIgnore]
    public Driver? Driver { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}