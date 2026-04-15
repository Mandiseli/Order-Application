import { useEffect, useState } from "react";
import { api } from "../api/api";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);

  const load = () => {
    api.get("/admin/orders").then(res => setOrders(res.data));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // live updates
    return () => clearInterval(interval);
  }, []);

  const updateStatus = (id: number, status: string) => {
    api.put(`/admin/orders/${id}/status`, `"${status}"`, {
      headers: { "Content-Type": "application/json" }
    }).then(load);
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>

      {orders.map(o => (
        <div key={o.id} className="card">
          <p>Order #{o.id} - {o.status}</p>

          <button onClick={() => updateStatus(o.id, "Preparing")}>Preparing</button>
          <button onClick={() => updateStatus(o.id, "Delivering")}>Delivering</button>
          <button onClick={() => updateStatus(o.id, "Delivered")}>Delivered</button>
        </div>
      ))}
    </div>
  );
}