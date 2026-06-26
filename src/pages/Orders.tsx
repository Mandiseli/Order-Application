import { useEffect, useState } from "react";
import { connection } from "../signalr";
import { api } from "../api/api";
import { toast } from "react-toastify";
import { getUserFromToken } from "../utils/auth";
import OrderProgress from "../components/OrderProgress";

interface OrderItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPriceAtTimeOfOrder: number;
}

interface Order {
  id: number;
  employeeName: string;
  employeeNumber: string;
  totalAmount: number;
  status: string;
  estimatedDeliveryTime: string;
  orderDate: string;
  items: OrderItem[];
}

export default function Orders() {
  const user = getUserFromToken();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();

    connection.on("ReceiveStatusUpdate", (order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...order } : o))
      );
    });

    connection.on("ReceiveOrderUpdate", (order) => {
      setOrders((prev) => [order, ...prev]);
    });

    return () => {
      connection.off("ReceiveStatusUpdate");
      connection.off("ReceiveOrderUpdate");
    };
  }, []);

  const loadOrders = async () => {
    try {
      const url =
        user?.role === "Employee"
          ? `/orders/employee/${user.employeeNumber}`
          : "/orders/all";

      const res = await api.get(url);
      setOrders(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load orders");
    }
  };

  const cancelOrder = async (id: number) => {
    try {
      await api.put(`/orders/${id}/cancel`);
      toast.success("Order cancelled and refunded");
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to cancel order");
    }
  };

  return (
    <div>
      <h1 className="page-title">📦 Orders</h1>

      {orders.length === 0 ? (
        <div className="card">No orders found.</div>
      ) : (
        <div className="grid">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <h2>Order #{o.id}</h2>

              <p>
                <strong>Employee:</strong> {o.employeeName} ({o.employeeNumber})
              </p>

              <p>
                <strong>Total:</strong> R{Number(o.totalAmount).toFixed(2)}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span className={`badge ${o.status.toLowerCase().replaceAll(" ", "-")}`}>
                  {o.status}
                </span>
              </p>

              <p>
                <strong>ETA:</strong> {o.estimatedDeliveryTime}
              </p>

              <OrderProgress status={o.status} />

              {o.items.map((item) => (
                <div key={item.id} className="cart-item">
                  <span>
                    {item.itemName} x {item.quantity}
                  </span>
                  <span>
                    R{Number(item.unitPriceAtTimeOfOrder * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}

              {o.status === "Pending" && (
                <button
                  className="button button-danger"
                  onClick={() => cancelOrder(o.id)}
                >
                  Cancel Order
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}