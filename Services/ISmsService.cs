namespace Order_App.Services;

public interface ISmsService
{
    Task SendSmsAsync(string phoneNumber, string message);
}
