namespace Order_App.Dtos;

public class PlaceOrderDto
{
    public string EmployeeNumber { get; set; } = "";
    public Dictionary<int, int> Items { get; set; } = new();
}
