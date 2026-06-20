namespace Order_App.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string message)
    {
        _logger.LogInformation("EMAIL SENT TO: {To} | SUBJECT: {Subject} | MESSAGE: {Message}",
            to, subject, message);

        return Task.CompletedTask;
    }
}