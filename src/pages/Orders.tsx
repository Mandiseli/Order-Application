import { useState } from "react";
import { api } from "../api/api";
import EmployeeSelector from "../components/EmployeeSelector";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [employeeNumber, setEmployeeNumber] = useState("");

  const loadOrders = () => {
    api.get(`/orders/employee/${employeeNumber}`)
      .then(res => setOrders(res.data));
  };

  return (
    <div>
      <h2>📦 Orders</h2>

      <div className="card">
        <EmployeeSelector onSelect={setEmployeeNumber} />
        <button className="button" onClick={loadOrders}>Load Orders</button>
      </div>

      {orders.map(o => (
        <div key={o.id} className="card order-card">
          <strong>Order #{o.id}</strong>
          <p className={`status-${o.status}`}>Status: {o.status}</p>
          <p>Total: R{o.totalAmount}</p>
        </div>
      ))}
    </div>
  );
}