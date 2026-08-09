import { useEffect, useMemo, useState } from "react";
import { connection } from "../signalr";
import { api } from "../api/api";
import { toast } from "react-toastify";
import { getUserFromToken } from "../utils/auth";
import OrderProgress from "../components/OrderProgress";
import type { Order } from "../types";

export default function Orders() {
  const user = getUserFromToken();

  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 5;

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
    } catch {
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

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        o.employeeNumber.toLowerCase().includes(search.toLowerCase()) ||
        String(o.id).includes(search);

      const matchesStatus = status ? o.status === status : true;

      const matchesDate = date
        ? new Date(o.orderDate).toISOString().slice(0, 10) === date
        : true;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, status, date]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <h1 className="page-title">📦 Orders</h1>

      <div className="card filter-card">
        <input
          className="input"
          placeholder="Search by employee, employee number or order ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Preparing">Preparing</option>
          <option value="Ready For Pickup">Ready For Pickup</option>
          <option value="Out For Delivery">Out For Delivery</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {paged.length === 0 ? (
        <div className="card">No orders found.</div>
      ) : (
        <div className="grid">
          {paged.map((o) => (
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
                <strong>Date:</strong>{" "}
                {new Date(o.orderDate).toLocaleString()}
              </p>

              <OrderProgress status={o.status} />

              {o.items.map((item) => (
                <div key={item.id} className="cart-item">
                  <span>{item.itemName} x {item.quantity}</span>
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

      <div className="pagination">
        <button
          className="button"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>

        <span>
          Page {page} of {totalPages || 1}
        </span>

        <button
          className="button"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}