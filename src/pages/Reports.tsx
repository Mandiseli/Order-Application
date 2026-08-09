import { useEffect, useMemo, useState } from "react";
import { api } from "../api/api";
import { toast } from "react-toastify";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell
} from "recharts";

interface Monthly {
  year: number;
  month: number;
  totalOrders: number;
  totalSpending: number;
}

interface RestaurantReport {
  restaurantName: string;
  totalOrders: number;
  totalRevenue: number;
}

interface Order {
  status: string;
}

export default function Reports() {
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<RestaurantReport[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const monthlyRes = await api.get("/reports/monthly-spending");
      setMonthly(monthlyRes.data);

      const topRestaurantsRes = await api.get("/reports/top-restaurants");
      setTopRestaurants(topRestaurantsRes.data);

      const ordersRes = await api.get("/orders/all");
      setOrders(ordersRes.data);
    } catch {
      toast.error("Failed to load reports");
    }
  };

  const filteredMonthly = useMemo(() => {
    return monthly.filter((m) => {
      const matchesYear = year ? String(m.year) === year : true;
      const matchesMonth = month ? String(m.month) === month : true;
      return matchesYear && matchesMonth;
    });
  }, [monthly, year, month]);

  const statusData = Object.entries(
    orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthLabel = (m: Monthly) => `${m.year}-${String(m.month).padStart(2, "0")}`;

  const download = (type: "csv" | "excel" | "pdf") => {
    window.open(`http://localhost:5174/api/reports/export/${type}`, "_blank");
  };

  return (
    <div>
      <h1 className="page-title">📊 Reports Dashboard</h1>

      <div className="card filter-card">
        <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All Years</option>
          {[...new Set(monthly.map((m) => m.year))].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All Months</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="status-actions">
        <button className="button" onClick={() => download("csv")}>Export CSV</button>
        <button className="button" onClick={() => download("excel")}>Export Excel</button>
        <button className="button button-danger" onClick={() => download("pdf")}>Export PDF</button>
      </div>

      <div className="grid grid-3">
        <div className="card chart-card">
          <h2>Monthly Spending</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={filteredMonthly.map((m) => ({ ...m, label: monthLabel(m) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalSpending" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h2>Top Restaurants</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRestaurants}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="restaurantName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalOrders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h2>Order Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label
              >
                {statusData.map((_, index) => (
                  <Cell key={index} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}