namespace Order_App.Dtos;

public class EmployeeProfileDto
{
    public int EmployeeId { get; set; }
    public string Name { get; set; } = "";
    public string EmployeeNumber { get; set; } = "";
    public decimal CurrentBalance { get; set; }
    public decimal TotalDeposits { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalSpendings { get; set; }
    public DateTime? LastOrderDate { get; set; }
}