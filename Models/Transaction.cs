namespace Order_App.Models;

public class Transaction
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public decimal Amount { get; set; } // + or -

    public string Type { get; set; } = "";
    // Deposit, Bonus, Order

    public string Description { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}