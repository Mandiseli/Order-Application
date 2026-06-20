namespace Order_App.Dtos;

public class ReOrderDto
{
    public string EmployeeNumber { get; set; } = "";
    public int PreviousOrderId { get; set; }
}