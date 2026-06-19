import { useEffect, useState } from "react";
import { api } from "../api/api";
import EmployeeSelector from "../components/EmployeeSelector";
import OrderProgress from "../components/OrderProgress";
import { toast } from "react-toastify";

interface Profile {
  employeeId: number;
  name: string;
  employeeNumber: string;
  currentBalance: number;
  totalDeposits: number;
  totalOrders: number;
  totalSpendings: number;
  lastOrderDate: string | null;
}

interface WalletItem {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface Wallet {
  employeeName: string;
  employeeNumber: string;
  currentBalance: number;
  depositHistory: WalletItem[];
  spendingHistory: WalletItem[];
}

interface OrderItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPriceAtTimeOfOrder: number;
}

interface Order {
  id: number;
  orderDate: string;
  totalAmount: number;
  status: string;
  estimatedDeliveryTime: string;
  items: OrderItem[];
}

export default function EmployeeProfile() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (employeeNumber) {
      loadEmployeeData(employeeNumber);
    }
  }, [employeeNumber]);

  const loadEmployeeData = async (empNo: string) => {
    try {
      const profileRes = await api.get(`/employeeProfile/${empNo}`);
      setProfile(profileRes.data);

      const walletRes = await api.get(`/employeeProfile/${empNo}/wallet`);
      setWallet(walletRes.data);

      const ordersRes = await api.get(`/orders/employee/${empNo}`);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load employee profile");
    }
  };

  const orderAgain = async (orderId: number) => {
    if (!employeeNumber) {
      toast.error("Please select an employee");
      return;
    }

    try {
      await api.post("/orders/reorder", {
        employeeNumber,
        previousOrderId: orderId
      });

      toast.success("Order placed again successfully 🍔");
      loadEmployeeData(employeeNumber);
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to reorder");
    }
  };

  return (
    <div>
      <h1 className="page-title">👤 Employee Profile</h1>

      <div className="card">
        <EmployeeSelector onSelect={setEmployeeNumber} />
      </div>

      {profile && (
        <>
          <div className="widgets">
            <div className="widget-card">
              <h3>Name</h3>
              <h1>{profile.name}</h1>
            </div>

            <div className="widget-card">
              <h3>Employee Number</h3>
              <h1>{profile.employeeNumber}</h1>
            </div>

            <div className="widget-card">
              <h3>Current Balance</h3>
              <h1>R{Number(profile.currentBalance).toFixed(2)}</h1>
            </div>

            <div className="widget-card">
              <h3>Total Deposits</h3>
              <h1>R{Number(profile.totalDeposits).toFixed(2)}</h1>
            </div>

            <div className="widget-card">
              <h3>Total Orders</h3>
              <h1>{profile.totalOrders}</h1>
            </div>

            <div className="widget-card">
              <h3>Total Spendings</h3>
              <h1>R{Number(profile.totalSpendings).toFixed(2)}</h1>
            </div>

            <div className="widget-card">
              <h3>Last Order Date</h3>
              <h1>
                {profile.lastOrderDate
                  ? new Date(profile.lastOrderDate).toLocaleDateString()
                  : "No orders"}
              </h1>
            </div>
          </div>

          <div className="grid grid-3">
            <div className="card">
              <h2>💰 Deposit History</h2>

              {!wallet || wallet.depositHistory.length === 0 ? (
                <p>No deposit history.</p>
              ) : (
                wallet.depositHistory.map(item => (
                  <div key={item.id} className="report-row">
                    <span>
                      {item.type} - {item.description}
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </span>
                    <strong>+R{Number(item.amount).toFixed(2)}</strong>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h2>🧾 Spending History</h2>

              {!wallet || wallet.spendingHistory.length === 0 ? (
                <p>No spending history.</p>
              ) : (
                wallet.spendingHistory.map(item => (
                  <div key={item.id} className="report-row">
                    <span>
                      {item.description}
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </span>
                    <strong>-R{Math.abs(Number(item.amount)).toFixed(2)}</strong>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h2>📦 Recent Orders</h2>

              {orders.length === 0 ? (
                <p>No orders yet.</p>
              ) : (
                orders.slice(0, 5).map(order => (
                  <div key={order.id} className="order-card-small">
                    <h4>Order #{order.id}</h4>
                    <p>R{Number(order.totalAmount).toFixed(2)}</p>
                    <p>Status: {order.status}</p>
                    <p>ETA: {order.estimatedDeliveryTime}</p>

                    <OrderProgress status={order.status} />

                    <button
                      className="button button-success"
                      onClick={() => orderAgain(order.id)}
                    >
                      Order Again
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}