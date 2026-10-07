import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from "@microsoft/signalr";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5174/api";

const HUB_URL = `${API_BASE_URL.replace(/\/api$/, "")}/orderHub`;

let connection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;

const createConnection = (): HubConnection => {
  return new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () =>
        localStorage.getItem("accessToken") || ""
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(
      import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning
    )
    .build();
};

export const getConnection = (): HubConnection => {
  if (!connection) {
    connection = createConnection();

    connection.onreconnecting(error => {
      console.warn("SignalR reconnecting...", error);
    });

    connection.onreconnected(connectionId => {
      console.info(
        "SignalR reconnected:",
        connectionId
      );
    });

    connection.onclose(error => {
      if (error) {
        console.warn(
          "SignalR connection closed:",
          error.message
        );
      } else {
        console.info("SignalR connection closed.");
      }
    });
  }

  return connection;
};

export const startConnection = async (): Promise<void> => {
  const hub = getConnection();

  if (
    hub.state === HubConnectionState.Connected ||
    hub.state === HubConnectionState.Connecting ||
    hub.state === HubConnectionState.Reconnecting
  ) {
    return;
  }

  if (startPromise) {
    return startPromise;
  }

  startPromise = hub
    .start()
    .then(() => {
      console.info(
        `SignalR connected to ${HUB_URL}`
      );
    })
    .catch(error => {
      console.error(
        "SignalR initial connection failed:",
        error
      );

      // Do not break the application if SignalR is unavailable.
      // Orders.tsx also has polling as a fallback.
    })
    .finally(() => {
      startPromise = null;
    });

  return startPromise;
};

export const stopConnection = async (): Promise<void> => {
  if (!connection) {
    return;
  }

  if (
    connection.state === HubConnectionState.Connected ||
    connection.state === HubConnectionState.Reconnecting ||
    connection.state === HubConnectionState.Connecting
  ) {
    try {
      await connection.stop();
    } catch (error) {
      console.warn(
        "Failed to stop SignalR connection:",
        error
      );
    }
  }
};

export const onOrderUpdate = (
  handler: (order: unknown) => void
): (() => void) => {
  const hub = getConnection();

  hub.on(
    "ReceiveOrderUpdate",
    handler
  );

  return () => {
    hub.off(
      "ReceiveOrderUpdate",
      handler
    );
  };
};

export const onStatusUpdate = (
  handler: (order: unknown) => void
): (() => void) => {
  const hub = getConnection();

  hub.on(
    "ReceiveStatusUpdate",
    handler
  );

  return () => {
    hub.off(
      "ReceiveStatusUpdate",
      handler
    );
  };
};

export const isSignalRConnected = (): boolean => {
  return (
    connection?.state ===
    HubConnectionState.Connected
  );
};