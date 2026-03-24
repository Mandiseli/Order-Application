namespace Order_App.Models;

public class Employee
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string EmployeeNumber { get; set; } = "";
    public decimal Balance { get; set; }
    public DateTime LastDepositMonth { get; set; }
}
