import { useEffect, useState } from "react";
import { connection } from "../signalr";
import { api } from "../api/api";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);

  const load = async () => {
    const res = await api.get("/orders/all");
    setOrders(res.data);
  };

  useEffect(() => {
    load();

    connection.on("ReceiveOrderUpdate", (order) => {
      setOrders(prev => [order, ...prev]);
    });

    connection.on("ReceiveStatusUpdate", (updatedOrder) => {
      setOrders(prev =>
        prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
      );
    });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await api.put(`/orders/${id}/status`, null, {
      params: { status }
    });
  };

  return (
    <div>
      <h2>📡 Live Admin Dashboard</h2>

      {orders.map(o => (
        <div key={o.id} className="card">
          <strong>Order #{o.id}</strong>
          <p>Status: {o.status}</p>

          <button className="button" onClick={() => updateStatus(o.id, "Preparing")}>
            Preparing
          </button>

          <button className="button" onClick={() => updateStatus(o.id, "Delivering")}>
            Delivering
          </button>

          <button className="button" onClick={() => updateStatus(o.id, "Delivered")}>
            Delivered
          </button>
        </div>
      ))}
    </div>
  );
}