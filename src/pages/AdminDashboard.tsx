import { useEffect, useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";

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
  orderDate: string;
  totalAmount: number;
  status: string;
  items: OrderItem[];
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders/all");
      setOrders(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, JSON.stringify(status), {
        headers: {
          "Content-Type": "application/json"
        }
      });

      toast.success(`Order #${orderId} updated to ${status}`);
      loadOrders();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const getStatusClass = (status: string) => {
    return status.toLowerCase();
  };

  return (
    <div>
      <h1 className="page-title">👨‍💼 Admin Orders Dashboard</h1>

      <div className="widgets">
        <div className="widget-card">
          <h3>Total Orders</h3>
          <h1>{orders.length}</h1>
        </div>

        <div className="widget-card">
          <h3>Pending</h3>
          <h1>{orders.filter(o => o.status === "Pending").length}</h1>
        </div>

        <div className="widget-card">
          <h3>Preparing</h3>
          <h1>{orders.filter(o => o.status === "Preparing").length}</h1>
        </div>

        <div className="widget-card">
          <h3>Delivered</h3>
          <h1>{orders.filter(o => o.status === "Delivered").length}</h1>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="card">No orders found.</div>
      ) : (
        <div className="grid">
          {orders.map(order => (
            <div key={order.id} className="card">
              <h2>Order #{order.id}</h2>

              <p>
                <strong>Employee:</strong> {order.employeeName} ({order.employeeNumber})
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {new Date(order.orderDate).toLocaleString()}
              </p>

              <p>
                <strong>Total:</strong> R{Number(order.totalAmount).toFixed(2)}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span className={`badge ${getStatusClass(order.status)}`}>
                  {order.status}
                </span>
              </p>

              <h4>Items</h4>

              {order.items.map(item => (
                <div key={item.id} className="cart-item">
                  <span>{item.itemName} x {item.quantity}</span>
                  <span>
                    R{Number(item.unitPriceAtTimeOfOrder * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}

              <hr />

              <div className="status-actions">
                <button
                  className="button"
                  onClick={() => updateStatus(order.id, "Preparing")}
                  disabled={order.status === "Preparing"}
                >
                  Preparing
                </button>

                <button
                  className="button"
                  onClick={() => updateStatus(order.id, "Delivering")}
                  disabled={order.status === "Delivering"}
                >
                  Delivering
                </button>

                <button
                  className="button button-success"
                  onClick={() => updateStatus(order.id, "Delivered")}
                  disabled={order.status === "Delivered"}
                >
                  Delivered
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}