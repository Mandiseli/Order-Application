import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from "@microsoft/signalr";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(
    /\/api\/?$/,
    ""
  ) || "http://localhost:5174";

const HUB_URL = `${API_BASE_URL}/orderHub`;

export const connection: HubConnection =
  new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () =>
        localStorage.getItem("accessToken") || ""
    })
    .withAutomaticReconnect([
      0,
      2000,
      5000,
      10000,
      30000
    ])
    .configureLogging(LogLevel.Information)
    .build();

let starting = false;

//
// ------------------------------------------------------------
// Start SignalR
// ------------------------------------------------------------
//
export const startConnection = async (): Promise<void> => {
  const accessToken =
    localStorage.getItem("accessToken");

  if (!accessToken)
  {
    console.warn(
      "SignalR not started: no access token."
    );

    return;
  }

  if (
    connection.state !==
    HubConnectionState.Disconnected
  )
  {
    return;
  }

  if (starting)
  {
    return;
  }

  starting = true;

  try
  {
    console.log(
      "Starting SignalR connection:",
      HUB_URL
    );

    await connection.start();

    console.log(
      "SignalR connected:",
      connection.connectionId
    );
  }
  catch (error)
  {
    console.error(
      "SignalR connection failed:",
      error
    );
  }
  finally
  {
    starting = false;
  }
};

//
// ------------------------------------------------------------
// Stop SignalR
// ------------------------------------------------------------
//
export const stopConnection = async (): Promise<void> => {
  if (
    connection.state ===
    HubConnectionState.Disconnected
  )
  {
    return;
  }

  try
  {
    await connection.stop();

    console.log(
      "SignalR connection stopped."
    );
  }
  catch (error)
  {
    console.error(
      "SignalR stop failed:",
      error
    );
  }
};

//
// ------------------------------------------------------------
// Connection events
// ------------------------------------------------------------
//
connection.onreconnecting((error) =>
{
  console.warn(
    "SignalR reconnecting...",
    error
  );
});

connection.onreconnected((connectionId) =>
{
  console.log(
    "SignalR reconnected:",
    connectionId
  );
});

connection.onclose((error) =>
{
  if (error)
  {
    console.warn(
      "SignalR connection closed:",
      error
    );
  }
  else
  {
    console.log(
      "SignalR connection closed."
    );
  }
});

//
// ------------------------------------------------------------
// Order events
// ------------------------------------------------------------
//
export const registerOrderUpdateHandler = (
  callback: (order: unknown) => void
): void =>
{
  connection.on(
    "ReceiveOrderUpdate",
    callback
  );
};

export const removeOrderUpdateHandler = (
  callback: (order: unknown) => void
): void =>
{
  connection.off(
    "ReceiveOrderUpdate",
    callback
  );
};

//
// ------------------------------------------------------------
// Status events
// ------------------------------------------------------------
//
export const registerStatusUpdateHandler = (
  callback: (order: unknown) => void
): void =>
{
  connection.on(
    "ReceiveStatusUpdate",
    callback
  );
};

export const removeStatusUpdateHandler = (
  callback: (order: unknown) => void
): void =>
{
  connection.off(
    "ReceiveStatusUpdate",
    callback
  );
};