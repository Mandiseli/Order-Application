import * as signalR from "@microsoft/signalr";

export const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5174/orderHub", {
    withCredentials: true,
  })
  .withAutomaticReconnect()
  .build();

export const startConnection = async () => {
  if (connection.state !== signalR.HubConnectionState.Disconnected) {
    return;
  }

  try {
    await connection.start();
    console.log("SignalR connected");
  } catch (err) {
    console.log("SignalR error", err);
  }
};