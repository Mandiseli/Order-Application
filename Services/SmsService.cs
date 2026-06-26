using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace Order_App.Services;

public class SmsService : ISmsService
{
    private readonly IConfiguration _config;

    public SmsService(IConfiguration config)
    {
        _config = config;
    }

    public Task SendSmsAsync(string phoneNumber, string message)
    {
        TwilioClient.Init(
            _config["Sms:AccountSid"],
            _config["Sms:AuthToken"]
        );

        return MessageResource.CreateAsync(
            body: message,
            from: new PhoneNumber(_config["Sms:From"]),
            to: new PhoneNumber(phoneNumber)
        );
    }
}
