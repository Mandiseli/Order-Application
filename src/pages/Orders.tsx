import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../api/api";
import { toast } from "react-toastify";
import { getUserFromToken } from "../utils/auth";
import OrderProgress from "../components/OrderProgress";
import type { Order } from "../types";

const statuses = ["Pending", "Preparing", "Ready For Pickup", "Out For Delivery", "Delivered", "Cancelled"];
const pageSize = 5;

export default function Orders() {
  const user = getUserFromToken();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const url = user?.role === "Employee"
        ? `/orders/employee/${encodeURIComponent(user.employeeNumber)}`
        : "/orders/all";
      const res = await api.get(url, {
        params: { search: search || undefined, status: status || undefined, date: date || undefined }
      });
      const data = Array.isArray(res.data) ? res.data : res.data.items ?? res.data.data ?? [];
      setOrders(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load orders"));
    } finally {
      setLoading(false);
    }
  }, [user?.employeeNumber, user?.role, search, status, date]);

  useEffect(() => {
    const timer = window.setTimeout(loadOrders, 250);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  // Fallback live refresh. It also works when SignalR is disabled/unavailable.
  useEffect(() => {
    const interval = window.setInterval(() => void loadOrders(), 15000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch = !query ||
        (o.employeeName || "").toLowerCase().includes(query) ||
        (o.employeeNumber || "").toLowerCase().includes(query) ||
        String(o.id).includes(query);
      const matchesStatus = !status || o.status === status;
      const matchesDate = !date || new Date(o.orderDate).toISOString().slice(0, 10) === date;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, status, date]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const cancelOrder = async (id: number) => {
    if (!window.confirm(`Cancel order #${id}? The balance will be refunded if cancellation is allowed.`)) return;
    try {
      await api.put(`/orders/${id}/cancel`);
      toast.success("Order cancelled and refunded");
      await loadOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel order"));
    }
  };

  return (
    <div>
      <h1 className="page-title">📦 Orders</h1>
      <div className="card filter-card">
        <input className="input" placeholder="Search employee, employee number or order ID" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="input" type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
        <button className="button" onClick={() => { setSearch(""); setStatus(""); setDate(""); setPage(1); }}>Clear Filters</button>
      </div>

      {loading ? <div className="card">Loading orders...</div> : paged.length === 0 ? <div className="card">No orders found.</div> : (
        <div className="grid">
          {paged.map((o) => (
            <div key={o.id} className="card">
              <div className="order-heading"><h2>Order #{o.id}</h2><span className={`badge ${o.status.toLowerCase().replaceAll(" ", "-")}`}>{o.status}</span></div>
              <p><strong>Employee:</strong> {o.employeeName || "-"} ({o.employeeNumber || "-"})</p>
              <p><strong>Total:</strong> R{Number(o.totalAmount).toFixed(2)}</p>
              <p><strong>Date:</strong> {new Date(o.orderDate).toLocaleString()}</p>
              {o.estimatedDeliveryTime && <p><strong>Estimated delivery:</strong> {o.estimatedDeliveryTime}</p>}
              <OrderProgress status={o.status} />
              {o.items?.map((item) => <div key={item.id} className="cart-item"><span>{item.itemName} × {item.quantity}</span><span>R{Number(item.unitPriceAtTimeOfOrder * item.quantity).toFixed(2)}</span></div>)}
              {o.status === "Pending" && <button className="button button-danger" onClick={() => void cancelOrder(o.id)}>Cancel Order</button>}
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button className="button" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
        <span>Page {safePage} of {totalPages} · {filtered.length} orders</span>
        <button className="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
      </div>
    </div>
  );
}
