import * as signalR from "@microsoft/signalr";

export const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://localhost:5001/orderHub")
  .withAutomaticReconnect()
  .build();

export const startConnection = async () => {
  try {
    await connection.start();
    console.log("SignalR connected");
  } catch (err) {
    console.log("SignalR error", err);
    setTimeout(startConnection, 3000);
  }
};