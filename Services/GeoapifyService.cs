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
        var apiKey = Environment.GetEnvironmentVariable("GEOAPIFY_API_KEY")
                     ?? _config["Geoapify:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new Exception("Geoapify API key is missing.");

        var geoUrl =
            $"https://api.geoapify.com/v1/geocode/search?text={Uri.EscapeDataString(city + ", South Africa")}&limit=1&apiKey={apiKey}";

        var geoResponse = await _httpClient.GetAsync(geoUrl);
        var geoJson = await geoResponse.Content.ReadAsStringAsync();

        if (!geoResponse.IsSuccessStatusCode)
            throw new Exception($"Geoapify geocode error: {geoJson}");

        using var geoDoc = JsonDocument.Parse(geoJson);
        var feature = geoDoc.RootElement.GetProperty("features").EnumerateArray().FirstOrDefault();

        if (feature.ValueKind == JsonValueKind.Undefined)
            return new List<PlaceDto>();

        var lon = feature.GetProperty("geometry").GetProperty("coordinates")[0].GetDouble();
        var lat = feature.GetProperty("geometry").GetProperty("coordinates")[1].GetDouble();

        var placesUrl =
            $"https://api.geoapify.com/v2/places?categories=catering.restaurant,catering.fast_food&filter=circle:{lon},{lat},10000&limit=20&apiKey={apiKey}";

        var response = await _httpClient.GetAsync(placesUrl);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new Exception($"Geoapify places error: {json}");

        using var doc = JsonDocument.Parse(json);

        var result = new List<PlaceDto>();

        foreach (var item in doc.RootElement.GetProperty("features").EnumerateArray())
        {
            var properties = item.GetProperty("properties");
            var geometry = item.GetProperty("geometry");
            var coordinates = geometry.GetProperty("coordinates");

            var name = properties.TryGetProperty("name", out var n)
                ? n.GetString() ?? "Unnamed Restaurant"
                : "Unnamed Restaurant";

            var address = properties.TryGetProperty("formatted", out var f)
                ? f.GetString() ?? ""
                : "";

            result.Add(new PlaceDto
            {
                Name = name,
                Address = address,
                Longitude = coordinates[0].GetDouble(),
                Latitude = coordinates[1].GetDouble(),
                Category = "Restaurant",
                ImageUrl = ""
            });
        }

        return result;
    }
}