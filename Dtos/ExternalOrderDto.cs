namespace Order_App.Dtos;

public class ExternalOrderDto
{
    public string EmployeeNumber { get; set; } = "";

    public List<ExternalOrderItemDto> Items { get; set; } = new();
}

public class ExternalOrderItemDto
{
    public string ItemName { get; set; } = "";

    public decimal Price { get; set; }

    public int Quantity { get; set; }
}