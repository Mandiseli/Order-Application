using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Serilog;

namespace Order_App.Hubs;

[Authorize]
public sealed class OrderHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var username =
            Context.User?.Identity?.Name
            ?? "Unknown";

        var role =
            Context.User?
                .FindFirst(
                    System.Security.Claims.ClaimTypes.Role)
                ?.Value
            ?? "Unknown";

        var employeeNumber =
            Context.User?
                .FindFirst("employeeNumber")
                ?.Value
            ?? "Unknown";

        Log.Information(
            "SignalR client connected. " +
            "ConnectionId={ConnectionId}, " +
            "Username={Username}, " +
            "Role={Role}, " +
            "EmployeeNumber={EmployeeNumber}",
            Context.ConnectionId,
            username,
            role,
            employeeNumber);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(
        Exception? exception)
    {
        if (exception != null)
        {
            Log.Warning(
                exception,
                "SignalR client disconnected with error. " +
                "ConnectionId={ConnectionId}",
                Context.ConnectionId);
        }
        else
        {
            Log.Information(
                "SignalR client disconnected normally. " +
                "ConnectionId={ConnectionId}",
                Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(
            exception);
    }
}