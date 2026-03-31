import { useEffect, useState } from "react";
import { api } from "../api/api";
import type { Order } from "../types";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const employeeNumber = "EMP001"; // temp

  useEffect(() => {
    api.get(`/orders/employee/${employeeNumber}`)
      .then(res => setOrders(res.data));
  }, []);

  return (
    <div>
      <h2>Orders</h2>

      {orders.map(o => (
        <div key={o.id}>
          R{o.totalAmount} - {o.status}
        </div>
      ))}
    </div>
  );
}