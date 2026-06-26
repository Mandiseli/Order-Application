using Order_App.Dtos;
using Order_App.Models;

namespace Order_App.Services;

public interface IOrderService
{
    Task<Order?> PlaceOrderAsync(string employeeNumber, Dictionary<int, int> items);
    Task<Order?> PlaceExternalOrderAsync(ExternalOrderDto dto);
    Task<Order?> ReOrderAsync(ReOrderDto dto);
    Task<Order?> AssignDriverAsync(AssignDriverDto dto);
    Task<List<Order>> GetOrdersForEmployeeAsync(string employeeNumber);
    Task<List<Order>> GetAllOrdersAsync();
    Task<Order?> UpdateOrderStatusAsync(int orderId, string status);
    Task<Order?> CancelOrderAsync(int orderId);
}