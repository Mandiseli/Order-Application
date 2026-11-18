import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { API_BASE_URL, getAccessToken } from "./api/api";

export type OrderEventPayload = Record<string, unknown>;
type OrderEventHandler = (payload: OrderEventPayload) => void;

let connection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;
const orderHandlers = new Set<OrderEventHandler>();
const statusHandlers = new Set<OrderEventHandler>();

const hubUrl = `${API_BASE_URL.replace(/\/api\/?$/i, "")}/orderHub`;

const ensureConnection = (): HubConnection => {
  if (connection) return connection;
  connection = new HubConnectionBuilder()
    .withUrl(hubUrl, { accessTokenFactory: () => getAccessToken() ?? "" })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error)
    .build();

  connection.on("ReceiveOrderUpdate", (payload: OrderEventPayload) => {
    orderHandlers.forEach((handler) => handler(payload));
  });
  connection.on("ReceiveStatusUpdate", (payload: OrderEventPayload) => {
    statusHandlers.forEach((handler) => handler(payload));
  });
  return connection;
};

export async function startConnection(): Promise<void> {
  // Employee screens use employee-scoped HTTP endpoints and polling. Do not open
  // the global broadcast channel for employee accounts.
  if (!getAccessToken() || localStorage.getItem("role")?.toLowerCase() === "employee") return;
  const hub = ensureConnection();
  if (hub.state === "Connected" || hub.state === "Connecting") return;
  if (startPromise) return startPromise;

  startPromise = hub.start()
    .then(() => undefined)
    .catch((error: unknown) => {
      // Polling on the pages remains the fallback when the hub is unavailable.
      if (import.meta.env.DEV) console.warn("SignalR connection could not be started:", error);
    })
    .finally(() => {
      startPromise = null;
    });
  return startPromise;
}

export function onOrderUpdate(handler: OrderEventHandler): () => void {
  orderHandlers.add(handler);
  void startConnection();
  return () => orderHandlers.delete(handler);
}

export function onStatusUpdate(handler: OrderEventHandler): () => void {
  statusHandlers.add(handler);
  void startConnection();
  return () => statusHandlers.delete(handler);
}

export async function stopConnection(): Promise<void> {
  if (!connection) return;
  await connection.stop();
  connection = null;
  startPromise = null;
}
