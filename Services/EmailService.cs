using MailKit.Net.Smtp;
using MimeKit;

namespace Order_App.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string message)
    {
        var enabled = Get("EMAIL_ENABLED", "Email:Enabled");
        if (!bool.TryParse(enabled, out var isEnabled) || !isEnabled)
        {
            _logger.LogInformation("Email notification skipped because email service is disabled.");
            return;
        }

        var from = Get("EMAIL_FROM", "Email:From");
        var host = Get("EMAIL_SMTP_HOST", "Email:SmtpHost");
        var portText = Get("EMAIL_SMTP_PORT", "Email:SmtpPort");
        var username = Get("EMAIL_USERNAME", "Email:Username");
        var password = Get("EMAIL_PASSWORD", "Email:Password");

        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(portText) || string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Email service is enabled but SMTP configuration is incomplete.");
        }

        if (!int.TryParse(portText, out var port))
            throw new InvalidOperationException("EMAIL_SMTP_PORT must be a valid number.");

        var email = new MimeMessage();
        email.From.Add(MailboxAddress.Parse(from));
        email.To.Add(MailboxAddress.Parse(to));
        email.Subject = subject;
        email.Body = new TextPart("plain") { Text = message };

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(host, port, true);
        await smtp.AuthenticateAsync(username, password);
        await smtp.SendAsync(email);
        await smtp.DisconnectAsync(true);
    }

    private string? Get(string environmentName, string configName) =>
        Environment.GetEnvironmentVariable(environmentName) ?? _config[configName];
}
