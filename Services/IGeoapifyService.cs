using Order_App.Dtos;

namespace Order_App.Services;

public interface IGeoapifyService
{
    Task<List<PlaceDto>> GetRestaurantsByCityAsync(string city);
}