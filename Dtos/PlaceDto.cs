namespace Order_App.Dtos;

public class PlaceDto
{
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Category { get; set; } = "";
}