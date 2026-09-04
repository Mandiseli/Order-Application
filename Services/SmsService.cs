using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace Order_App.Services;

public class SmsService : ISmsService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmsService> _logger;

    public SmsService(IConfiguration config, ILogger<SmsService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendSmsAsync(string phoneNumber, string message)
    {
        var enabledText = Get("SMS_ENABLED", "Sms:Enabled");
        if (!bool.TryParse(enabledText, out var enabled) || !enabled)
        {
            _logger.LogInformation("SMS notification skipped because SMS service is disabled.");
            return;
        }

        var accountSid = Get("SMS_ACCOUNT_SID", "Sms:AccountSid");
        var authToken = Get("SMS_AUTH_TOKEN", "Sms:AuthToken");
        var from = Get("SMS_FROM", "Sms:From");

        if (string.IsNullOrWhiteSpace(accountSid) || string.IsNullOrWhiteSpace(authToken) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("SMS service is enabled but Twilio configuration is incomplete.");

        TwilioClient.Init(accountSid, authToken);
        await MessageResource.CreateAsync(
            body: message,
            from: new PhoneNumber(from),
            to: new PhoneNumber(phoneNumber));
    }

    private string? Get(string environmentName, string configName) =>
        Environment.GetEnvironmentVariable(environmentName) ?? _config[configName];
}
