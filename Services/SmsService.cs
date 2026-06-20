namespace Order_App.Services;

public class SmsService : ISmsService
{
    private readonly ILogger<SmsService> _logger;

    public SmsService(ILogger<SmsService> logger)
    {
        _logger = logger;
    }

    public Task SendSmsAsync(string phoneNumber, string message)
    {
        _logger.LogInformation("SMS SENT TO: {PhoneNumber} | MESSAGE: {Message}",
            phoneNumber, message);

        return Task.CompletedTask;
    }
}
