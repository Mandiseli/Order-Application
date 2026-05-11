import { useEffect, useState } from "react";
import { connection } from "../signalr";
import { api } from "../api/api";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    connection.on("ReceiveStatusUpdate", (order) => {
      setOrders(prev =>
        prev.map(o => o.id === order.id ? order : o)
      );
    });
  }, []);

  const load = async () => {
    const res = await api.get("/orders/all");
    setOrders(res.data);
  };

  return (
    <div>
      <h2>📦 Live Orders</h2>
      <button className="button" onClick={load}>Load</button>

      {orders.map(o => (
        <div key={o.id} className="card">
          <p>Order #{o.id}</p>
          <p>Status: {o.status}</p>
        </div>
      ))}
    </div>
  );
}