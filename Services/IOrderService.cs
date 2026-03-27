using Order_App.Models;

namespace Order_App.Services;

public interface IOrderService
{
    Task<Order?> PlaceOrderAsync(string employeeNumber, Dictionary<int, int> items);
    Task<List<Order>> GetOrdersForEmployeeAsync(string employeeNumber);
    Task<List<Order>> GetAllOrdersAsync();
    Task<Order?> UpdateOrderStatusAsync(int orderId, string status);
}