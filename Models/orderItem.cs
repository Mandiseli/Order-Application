using System.Text.Json.Serialization;

namespace Order_App.Models;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int? MenuItemId { get; set; }
    public string ItemName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPriceAtTimeOfOrder { get; set; }

    [JsonIgnore]
    public Order? Order { get; set; }

    [JsonIgnore]
    public MenuItem? MenuItem { get; set; }
}