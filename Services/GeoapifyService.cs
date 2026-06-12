using System.Text.Json;
using Order_App.Dtos;

namespace Order_App.Services;

public class GeoapifyService : IGeoapifyService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public GeoapifyService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
    }

    public async Task<List<PlaceDto>> GetRestaurantsByCityAsync(string city)
    {
        var apiKey = _config["Geoapify:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new Exception("Geoapify API key is missing.");

        var encodedCity = Uri.EscapeDataString($"{city}, South Africa");

        var geocodeUrl =
            $"https://api.geoapify.com/v1/geocode/search?text={encodedCity}&limit=1&apiKey={apiKey}";

        var geocodeResponse = await _httpClient.GetAsync(geocodeUrl);
        var geocodeJson = await geocodeResponse.Content.ReadAsStringAsync();

        if (!geocodeResponse.IsSuccessStatusCode)
            throw new Exception($"Geocode failed: {geocodeJson}");

        using var geoDoc = JsonDocument.Parse(geocodeJson);

        var features = geoDoc.RootElement.GetProperty("features");

        if (features.GetArrayLength() == 0)
            throw new Exception($"City not found: {city}");

        var props = features[0].GetProperty("properties");

        var lat = props.GetProperty("lat").GetDouble();
        var lon = props.GetProperty("lon").GetDouble();

        var placesUrl =
            $"https://api.geoapify.com/v2/places" +
            $"?categories=catering.restaurant" +
            $"&filter=circle:{lon},{lat},15000" +
            $"&bias=proximity:{lon},{lat}" +
            $"&limit=20" +
            $"&apiKey={apiKey}";

        var placesResponse = await _httpClient.GetAsync(placesUrl);
        var placesJson = await placesResponse.Content.ReadAsStringAsync();

        if (!placesResponse.IsSuccessStatusCode)
            throw new Exception($"Places failed: {placesJson}");

        using var placesDoc = JsonDocument.Parse(placesJson);

        var placeFeatures = placesDoc.RootElement.GetProperty("features");

        var restaurants = new List<PlaceDto>();

        foreach (var item in placeFeatures.EnumerateArray())
        {
            var placeProps = item.GetProperty("properties");

            restaurants.Add(new PlaceDto
            {
                Name = placeProps.TryGetProperty("name", out var name)
                    ? name.GetString() ?? "Unnamed Restaurant"
                    : "Unnamed Restaurant",

                Address = placeProps.TryGetProperty("formatted", out var address)
                    ? address.GetString() ?? ""
                    : "",

                Latitude = placeProps.TryGetProperty("lat", out var pLat)
                    ? pLat.GetDouble()
                    : 0,

                Longitude = placeProps.TryGetProperty("lon", out var pLon)
                    ? pLon.GetDouble()
                    : 0,

                Category = "Restaurant"
            });
        }

        return restaurants;
    }
}