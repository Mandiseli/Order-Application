using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class AssignDriverDto
{
    [Range(1, int.MaxValue)]
    public int OrderId { get; set; }

    [Range(1, int.MaxValue)]
    public int DriverId { get; set; }
}
