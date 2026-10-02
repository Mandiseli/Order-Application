import { useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../api/api";
import { toast } from "react-toastify";

type Monthly = { year: number; month: number; totalOrders: number; totalSpending: number };
type RestaurantReport = { restaurantName: string; totalOrders: number; totalRevenue: number };
type StatusReport = { status: string; count: number };

const months = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Reports() {
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<RestaurantReport[]>([]);
  const [statusData, setStatusData] = useState<StatusReport[]>([]);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = { year: year || undefined, month: month || undefined };
      const [monthlyRes, restaurantRes, statusRes] = await Promise.all([
        api.get("/reports/monthly-spending", { params }),
        api.get("/reports/top-restaurants", { params }),
        api.get("/reports/order-status", { params })
      ]);
      setMonthly(Array.isArray(monthlyRes.data) ? monthlyRes.data : monthlyRes.data.items ?? []);
      setTopRestaurants(Array.isArray(restaurantRes.data) ? restaurantRes.data : restaurantRes.data.items ?? []);
      setStatusData(Array.isArray(statusRes.data) ? statusRes.data : statusRes.data.items ?? []);
    } catch (error) {
      // Compatible with the older backend: derive status data from orders if the endpoint is absent.
      try {
        const ordersRes = await api.get("/orders/all");
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const grouped = Object.entries(orders.reduce<Record<string, number>>((a, o: { status: string }) => {
          a[o.status] = (a[o.status] || 0) + 1; return a;
        }, {})).map(([status, count]) => ({ status, count }));
        setStatusData(grouped);
      } catch {
        toast.error(getApiErrorMessage(error, "Failed to load reports"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadReports(); }, [year, month]);

  const filteredMonthly = useMemo(() => monthly.filter((m) =>
    (!year || String(m.year) === year) && (!month || String(m.month) === month)
  ), [monthly, year, month]);

  const maxSpend = Math.max(...filteredMonthly.map((m) => Number(m.totalSpending)), 1);
  const maxOrders = Math.max(...topRestaurants.map((r) => Number(r.totalOrders)), 1);
  const totalStatuses = statusData.reduce((sum, x) => sum + Number(x.count), 0) || 1;

  const download = async (type: "csv" | "excel" | "pdf") => {
    try {
      const response = await api.get(`/reports/export/${type}`, {
        params: { year: year || undefined, month: month || undefined },
        responseType: "blob"
      });
      const extension = type === "excel" ? "xls" : type;
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a"); a.href = url; a.download = `order-report.${extension}`; a.click(); URL.revokeObjectURL(url);
    } catch (error) { toast.error(getApiErrorMessage(error, `Failed to export ${type.toUpperCase()}`)); }
  };

  return <div>
    <h1 className="page-title">📊 Reports Dashboard</h1>
    <div className="card filter-card">
      <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="">All Years</option>
        {[...new Set(monthly.map((m) => m.year))].sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
        <option value="">All Months</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <button className="button" onClick={() => void loadReports()}>Refresh</button>
    </div>
    <div className="status-actions"><button className="button" onClick={() => void download("csv")}>Export CSV</button><button className="button button-success" onClick={() => void download("excel")}>Export Excel</button><button className="button button-danger" onClick={() => void download("pdf")}>Export PDF</button></div>

    {loading ? <div className="card">Loading reports...</div> : <div className="grid grid-3">
      <div className="card chart-card"><h2>Monthly Spending</h2><div className="svg-chart line-chart" aria-label="Monthly spending line chart">
        <svg viewBox="0 0 600 260" role="img"><line x1="45" y1="220" x2="580" y2="220" className="axis"/><line x1="45" y1="20" x2="45" y2="220" className="axis"/>
          <polyline fill="none" points={filteredMonthly.map((m, i) => `${55 + i * (510 / Math.max(filteredMonthly.length - 1, 1))},${220 - (Number(m.totalSpending) / maxSpend) * 180}`).join(" ")} className="chart-line"/>
          {filteredMonthly.map((m, i) => <circle key={`${m.year}-${m.month}`} cx={55 + i * (510 / Math.max(filteredMonthly.length - 1, 1))} cy={220 - (Number(m.totalSpending) / maxSpend) * 180} r="5" className="chart-dot"/>)}
        </svg><div className="chart-labels">{filteredMonthly.map((m) => <span key={`${m.year}-${m.month}`}>{m.year}-{String(m.month).padStart(2, "0")}</span>)}</div>
      </div></div>

      <div className="card chart-card"><h2>Top Restaurants</h2><div className="bar-chart">{topRestaurants.slice(0, 8).map((r) => <div className="bar-row" key={r.restaurantName}><span title={r.restaurantName}>{r.restaurantName}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(Number(r.totalOrders) / maxOrders) * 100}%` }} /></div><strong>{r.totalOrders}</strong></div>)}</div></div>

      <div className="card chart-card"><h2>Order Status</h2><div className="pie-wrap"><div className="pie" style={{ background: `conic-gradient(${statusData.map((_s, i) => `${i % 2 ? "#3b82f6" : "#16a34a"} ${(statusData.slice(0, i).reduce((a, x) => a + Number(x.count), 0) / totalStatuses) * 100}% ${(statusData.slice(0, i + 1).reduce((a, x) => a + Number(x.count), 0) / totalStatuses) * 100}%`).join(", ")})` }} /><div>{statusData.map((s) => <div className="legend-row" key={s.status}><span>{s.status}</span><strong>{s.count}</strong></div>)}</div></div></div>
    </div>}
  </div>;
}
