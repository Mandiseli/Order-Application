import { useEffect, useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";

interface Order {
  id: number;
  employeeName: string;
  employeeNumber: string;
  orderDate: string;
  totalAmount: number;
  status: string;
}

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await api.get("/orders/all");
      setOrders(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load reports");
    }
  };

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.totalAmount),
    0
  );

  const pending = orders.filter(o => o.status === "Pending").length;
  const preparing = orders.filter(o => o.status === "Preparing").length;
  const delivering = orders.filter(o => o.status === "Delivering").length;
  const delivered = orders.filter(o => o.status === "Delivered").length;

  const employeeSpend = orders.reduce<Record<string, number>>((acc, order) => {
    const key = `${order.employeeName} (${order.employeeNumber})`;
    acc[key] = (acc[key] || 0) + Number(order.totalAmount);
    return acc;
  }, {});

  const topEmployees = Object.entries(employeeSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <h1 className="page-title">📊 Reports</h1>

      <div className="widgets">
        <div className="widget-card">
          <h3>Total Orders</h3>
          <h1>{orders.length}</h1>
        </div>

        <div className="widget-card">
          <h3>Total Sales</h3>
          <h1>R{totalRevenue.toFixed(2)}</h1>
        </div>

        <div className="widget-card">
          <h3>Delivered</h3>
          <h1>{delivered}</h1>
        </div>

        <div className="widget-card">
          <h3>Pending</h3>
          <h1>{pending}</h1>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h2>Order Status Summary</h2>

          <div className="report-row">
            <span>Pending</span>
            <strong>{pending}</strong>
          </div>

          <div className="report-row">
            <span>Preparing</span>
            <strong>{preparing}</strong>
          </div>

          <div className="report-row">
            <span>Delivering</span>
            <strong>{delivering}</strong>
          </div>

          <div className="report-row">
            <span>Delivered</span>
            <strong>{delivered}</strong>
          </div>
        </div>

        <div className="card">
          <h2>Top Employees by Spend</h2>

          {topEmployees.length === 0 ? (
            <p>No spending data.</p>
          ) : (
            topEmployees.map(([employee, amount]) => (
              <div key={employee} className="report-row">
                <span>{employee}</span>
                <strong>R{amount.toFixed(2)}</strong>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2>Recent Orders</h2>

          {orders.slice(0, 5).map(order => (
            <div key={order.id} className="report-row">
              <span>#{order.id} - {order.employeeName}</span>
              <strong>R{Number(order.totalAmount).toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}