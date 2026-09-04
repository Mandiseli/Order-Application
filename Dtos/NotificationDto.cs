using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class NotificationDto
{
    [Required, StringLength(200)] public string To { get; set; } = "";
    [Required, StringLength(200)] public string Subject { get; set; } = "";
    [Required, StringLength(5000)] public string Message { get; set; } = "";
}
