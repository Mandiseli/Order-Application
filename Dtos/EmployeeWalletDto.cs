namespace Order_App.Dtos;

public class EmployeeWalletDto
{
    public string EmployeeName { get; set; } = "";
    public string EmployeeNumber { get; set; } = "";
    public decimal CurrentBalance { get; set; }

    public List<WalletTransactionDto> DepositHistory { get; set; } = new();
    public List<WalletTransactionDto> SpendingHistory { get; set; } = new();
}

public class WalletTransactionDto
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
    public decimal Amount { get; set; }
    public string Description { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
