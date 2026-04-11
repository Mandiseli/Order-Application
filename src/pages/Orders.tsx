import { useState } from "react";
import { api } from "../api/api";
import EmployeeSelector from "../components/EmployeeSelector";
import type { Order } from "../types";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [employeeNumber, setEmployeeNumber] = useState("");

  const loadOrders = () => {
    api.get(`/orders/employee/${employeeNumber}`)
      .then(res => setOrders(res.data));
  };

  return (
    <div>
      <h2>📦 Orders</h2>

      <EmployeeSelector onSelect={setEmployeeNumber} />
      <button className="button" onClick={loadOrders}>Load Orders</button>

      {orders.map(o => (
        <div key={o.id} className="card">
          <strong>Order #{o.id}</strong>
          <p>Status: {o.status}</p>
          <p>Total: R{o.totalAmount}</p>
        </div>
      ))}
    </div>
  );
}