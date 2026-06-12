import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { connection } from "../signalr";
import { api } from "../api/api";

import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonCard from "../components/SkeletonCard";

export default function Orders() {

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    loadOrders();

    connection.on("ReceiveStatusUpdate", (order) => {

      setOrders(prev =>
        prev.map(o =>
          o.id === order.id ? order : o
        )
      );

      toast.info(`Order #${order.id} updated to ${order.status}`);

    });

    return () => {
      connection.off("ReceiveStatusUpdate");
    };

  }, []);

  const loadOrders = async () => {

    try {

      setLoading(true);

      const res = await api.get("/orders/all");

      setOrders(res.data);

    } catch {

      toast.error("Failed to load orders");

    } finally {

      setLoading(false);

    }
  };

  const getStatusClass = (status: string) => {

    switch (status.toLowerCase()) {

      case "pending":
        return "badge pending";

      case "preparing":
        return "badge preparing";

      case "delivering":
        return "badge delivering";

      case "delivered":
        return "badge delivered";

      default:
        return "badge";
    }
  };

  return (
    <div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >

        <h1 className="page-title">
          📦 Live Orders
        </h1>

        <button
          className="button"
          onClick={loadOrders}
        >
          Refresh
        </button>

      </div>

      {loading ? (

        <div className="grid grid-3">

          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />

        </div>

      ) : orders.length === 0 ? (

        <div className="card">
          <p>No orders found.</p>
        </div>

      ) : (

        <div className="grid grid-3">

          {orders.map(order => (

            <div
              key={order.id}
              className="card"
            >

              <h2>
                Order #{order.id}
              </h2>

              <p
                style={{
                  marginTop: "10px"
                }}
              >
                Employee:
                {" "}
                {order.employee?.name || "Unknown"}
              </p>

              <p>
                Total:
                {" "}
                <strong>
                  R{order.totalAmount}
                </strong>
              </p>

              <p
                style={{
                  marginTop: "15px"
                }}
              >
                Status:
              </p>

              <span className={getStatusClass(order.status)}>
                {order.status}
              </span>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}