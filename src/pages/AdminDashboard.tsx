import { useEffect, useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";
import OrderProgress from "../components/OrderProgress";

interface Driver {
  id: number;
  fullName: string;
  phoneNumber: string;
  isAvailable: boolean;
}

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
  driverId?: number;
  driverName: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  estimatedDeliveryTime: string;
  items: OrderItem[];
}

const statuses = [
  "Pending",
  "Preparing",
  "Ready For Pickup",
  "Out For Delivery",
  "Delivered"
];

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  useEffect(() => {
    loadOrders();
    loadDrivers();
  }, []);

  const loadOrders = async () => {
    const res = await api.get("/orders/all");
    setOrders(res.data);
  };

  const loadDrivers = async () => {
    const res = await api.get("/drivers");
    setDrivers(res.data);
  };

  const createDriver = async () => {
    if (!driverName.trim()) {
      toast.error("Driver name is required");
      return;
    }

    await api.post("/drivers", {
      fullName: driverName,
      phoneNumber: driverPhone
    });

    toast.success("Driver added");
    setDriverName("");
    setDriverPhone("");
    loadDrivers();
  };

  const assignDriver = async (orderId: number, driverId: number) => {
    await api.put("/orders/assign-driver", {
      orderId,
      driverId
    });

    toast.success("Driver assigned");
    loadOrders();
  };

  const updateStatus = async (orderId: number, status: string) => {
    await api.put(`/orders/${orderId}/status`, JSON.stringify(status), {
      headers: {
        "Content-Type": "application/json"
      }
    });

    toast.success(`Order updated to ${status}`);
    loadOrders();
  };

  return (
    <div>
      <h1 className="page-title">🚚 Admin Delivery Dashboard</h1>

      <div className="widgets">
        {statuses.map(status => (
          <div key={status} className="widget-card">
            <h3>{status}</h3>
            <h1>{orders.filter(o => o.status === status).length}</h1>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Add Driver</h2>

        <input
          className="input"
          placeholder="Driver name"
          value={driverName}
          onChange={e => setDriverName(e.target.value)}
        />

        <input
          className="input"
          placeholder="Phone number"
          value={driverPhone}
          onChange={e => setDriverPhone(e.target.value)}
        />

        <button className="button button-success" onClick={createDriver}>
          Add Driver
        </button>
      </div>

      <div className="grid">
        {orders.map(order => (
          <div key={order.id} className="card">
            <h2>Order #{order.id}</h2>

            <p><strong>Employee:</strong> {order.employeeName}</p>
            <p><strong>Total:</strong> R{Number(order.totalAmount).toFixed(2)}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Driver:</strong> {order.driverName}</p>
            <p><strong>ETA:</strong> {order.estimatedDeliveryTime}</p>

            <OrderProgress status={order.status} />

            <h4>Assign Driver</h4>

            <select
              className="input"
              defaultValue=""
              onChange={e => assignDriver(order.id, Number(e.target.value))}
            >
              <option value="">Select Driver</option>
              {drivers.filter(d => d.isAvailable).map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName} - {driver.phoneNumber}
                </option>
              ))}
            </select>

            <h4>Update Status</h4>

            <div className="status-actions">
              {statuses.map(status => (
                <button
                  key={status}
                  className="button"
                  disabled={order.status === status}
                  onClick={() => updateStatus(order.id, status)}
                >
                  {status}
                </button>
              ))}
            </div>

            <h4>Items</h4>

            {order.items.map(item => (
              <div key={item.id} className="cart-item">
                <span>{item.itemName} x {item.quantity}</span>
                <span>R{Number(item.unitPriceAtTimeOfOrder * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}