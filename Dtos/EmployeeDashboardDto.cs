namespace Order_App.Dtos;

public class EmployeeDashboardDto
{
    public string EmployeeName { get; set; } = "";
    public string EmployeeNumber { get; set; } = "";
    public decimal Balance { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalSpent { get; set; }
    public int FavoritesCount { get; set; }
    public int RatingsCount { get; set; }
}