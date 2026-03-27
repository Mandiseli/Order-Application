using Order_App.Models;

namespace Order_App.Services;

public interface IDepositService
{
    Task<Employee?> MakeDepositAsync(string employeeNumber, decimal amount);
}