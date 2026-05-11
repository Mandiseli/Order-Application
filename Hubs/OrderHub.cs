using Microsoft.AspNetCore.SignalR;

namespace Order_App.Hubs;

public class OrderHub : Hub
{
    public async Task SendOrderUpdate(object order)
    {
        await Clients.All.SendAsync("ReceiveOrderUpdate", order);
    }

    public async Task SendStatusUpdate(object order)
    {
        await Clients.All.SendAsync("ReceiveStatusUpdate", order);
    }
}