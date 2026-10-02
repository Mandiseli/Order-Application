import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../api/api";
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
  driverId?: number | null;
  driverName?: string | null;
  orderDate: string;
  totalAmount: number;
  status: string;
  estimatedDeliveryTime?: string | null;
  items?: OrderItem[];
}

interface PaginatedResponse<T> {
  items?: T[];
  data?: T[];
  results?: T[];
  totalCount?: number;
  total?: number;
  page?: number;
  pageSize?: number;
}

const statuses = [
  "Pending",
  "Preparing",
  "Ready For Pickup",
  "Out For Delivery",
  "Delivered"
];

const normaliseStatus = (status: string | null | undefined): string => {
  return String(status ?? "").trim().toLowerCase();
};

const formatCurrency = (amount: number | string | null | undefined): string => {
  const value = Number(amount ?? 0);

  if (!Number.isFinite(value)) {
    return "R0.00";
  }

  return `R${value.toFixed(2)}`;
};

const formatDateTime = (
  value: string | null | undefined
): string => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

/**
 * Handles both:
 *
 * [
 *   {...},
 *   {...}
 * ]
 *
 * and common paginated/wrapped responses such as:
 *
 * {
 *   items: [...]
 * }
 *
 * {
 *   data: [...]
 * }
 *
 * {
 *   results: [...]
 * }
 */
const extractArray = <T,>(
  responseData: unknown,
  propertyNames: string[] = ["items", "data", "results"]
): T[] => {
  if (Array.isArray(responseData)) {
    return responseData as T[];
  }

  if (
    responseData &&
    typeof responseData === "object"
  ) {
    const data = responseData as Record<string, unknown>;

    for (const propertyName of propertyNames) {
      const value = data[propertyName];

      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }

  return [];
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  const [creatingDriver, setCreatingDriver] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);

  const [orderError, setOrderError] = useState("");
  const [driverError, setDriverError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setOrderError("");

    try {
      const res = await api.get("/orders/all");

      console.log("Admin orders API response:", res.data);

      const orderData = extractArray<Order>(res.data);

      setOrders(orderData);
    } catch (error) {
      console.error("Failed to load orders:", error);

      const message = getApiErrorMessage(
        error,
        "Failed to load orders."
      );

      setOrderError(message);
      setOrders([]);
      toast.error(message);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    setDriverError("");

    try {
      const res = await api.get("/drivers");

      console.log("Drivers API response:", res.data);

      const driverData = extractArray<Driver>(res.data);

      setDrivers(driverData);
    } catch (error) {
      console.error("Failed to load drivers:", error);

      const message = getApiErrorMessage(
        error,
        "Failed to load drivers."
      );

      setDriverError(message);
      setDrivers([]);
      toast.error(message);
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    void loadDrivers();
  }, [loadOrders, loadDrivers]);

  const createDriver = async () => {
    const trimmedName = driverName.trim();
    const trimmedPhone = driverPhone.trim();

    if (!trimmedName) {
      toast.error("Driver name is required.");
      return;
    }

    if (!trimmedPhone) {
      toast.error("Driver phone number is required.");
      return;
    }

    setCreatingDriver(true);

    try {
      await api.post("/drivers", {
        fullName: trimmedName,
        phoneNumber: trimmedPhone
      });

      toast.success("Driver added successfully.");

      setDriverName("");
      setDriverPhone("");

      await loadDrivers();
    } catch (error) {
      console.error("Failed to create driver:", error);

      const message = getApiErrorMessage(
        error,
        "Failed to add driver."
      );

      toast.error(message);
    } finally {
      setCreatingDriver(false);
    }
  };

  const assignDriver = async (
    orderId: number,
    driverId: number
  ) => {
    if (!driverId) {
      return;
    }

    setAssigningOrderId(orderId);

    try {
      await api.put("/orders/assign-driver", {
        orderId,
        driverId
      });

      toast.success("Driver assigned successfully.");

      await loadOrders();
      await loadDrivers();
    } catch (error) {
      console.error("Failed to assign driver:", error);

      const message = getApiErrorMessage(
        error,
        "Failed to assign driver."
      );

      toast.error(message);
    } finally {
      setAssigningOrderId(null);
    }
  };

  const updateStatus = async (
    orderId: number,
    status: string
  ) => {
    setUpdatingOrderId(orderId);

    try {
      /*
       * The backend is expecting a JSON string for the status,
       * therefore JSON.stringify(status) is intentionally retained.
       */
      await api.put(
        `/orders/${orderId}/status`,
        JSON.stringify(status),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      toast.success(`Order updated to ${status}.`);

      await loadOrders();
    } catch (error) {
      console.error("Failed to update order status:", error);

      const message = getApiErrorMessage(
        error,
        "Failed to update order status."
      );

      toast.error(message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const availableDrivers = useMemo(() => {
    return drivers.filter(
      driver => driver.isAvailable
    );
  }, [drivers]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders.filter(order => {
      const matchesStatus =
        selectedStatus === "All" ||
        normaliseStatus(order.status) ===
          normaliseStatus(selectedStatus);

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        String(order.id).includes(search) ||
        String(order.employeeName ?? "")
          .toLowerCase()
          .includes(search) ||
        String(order.employeeNumber ?? "")
          .toLowerCase()
          .includes(search) ||
        String(order.driverName ?? "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [orders, searchTerm, selectedStatus]);

  const statusCounts = useMemo(() => {
    return statuses.reduce<Record<string, number>>(
      (result, status) => {
        result[status] = orders.filter(
          order =>
            normaliseStatus(order.status) ===
            normaliseStatus(status)
        ).length;

        return result;
      },
      {}
    );
  }, [orders]);

  const totalOrderValue = useMemo(() => {
    return orders.reduce((total, order) => {
      const amount = Number(order.totalAmount ?? 0);

      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter(
      order =>
        normaliseStatus(order.status) ===
        normaliseStatus("Delivered")
    ).length;
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter(
      order =>
        normaliseStatus(order.status) !==
        normaliseStatus("Delivered")
    ).length;
  }, [orders]);

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            🚚 Admin Delivery Dashboard
          </h1>

          <p>
            Manage orders, drivers and delivery status.
          </p>
        </div>

        <button
          type="button"
          className="button"
          onClick={() => {
            void loadOrders();
            void loadDrivers();
          }}
          disabled={loadingOrders || loadingDrivers}
        >
          {loadingOrders || loadingDrivers
            ? "Refreshing..."
            : "Refresh Dashboard"}
        </button>
      </div>

      {/* Dashboard Summary */}
      <div className="widgets">
        <div className="widget-card">
          <h3>Total Orders</h3>
          <h1>{orders.length}</h1>
        </div>

        <div className="widget-card">
          <h3>Active Orders</h3>
          <h1>{activeOrders}</h1>
        </div>

        <div className="widget-card">
          <h3>Delivered</h3>
          <h1>{deliveredOrders}</h1>
        </div>

        <div className="widget-card">
          <h3>Total Order Value</h3>
          <h1>{formatCurrency(totalOrderValue)}</h1>
        </div>

        <div className="widget-card">
          <h3>Available Drivers</h3>
          <h1>{availableDrivers.length}</h1>
        </div>
      </div>

      {/* Order Status Summary */}
      <div className="widgets">
        {statuses.map(status => (
          <div
            key={status}
            className="widget-card"
          >
            <h3>{status}</h3>
            <h1>{statusCounts[status] ?? 0}</h1>
          </div>
        ))}
      </div>

      {/* Add Driver */}
      <div className="card">
        <h2>Add Driver</h2>

        <div className="grid">
          <div>
            <label htmlFor="driverName">
              Driver Name
            </label>

            <input
              id="driverName"
              className="input"
              placeholder="Driver name"
              value={driverName}
              onChange={e =>
                setDriverName(e.target.value)
              }
              disabled={creatingDriver}
            />
          </div>

          <div>
            <label htmlFor="driverPhone">
              Phone Number
            </label>

            <input
              id="driverPhone"
              className="input"
              placeholder="Phone number"
              value={driverPhone}
              onChange={e =>
                setDriverPhone(e.target.value)
              }
              disabled={creatingDriver}
            />
          </div>
        </div>

        <button
          type="button"
          className="button button-success"
          onClick={createDriver}
          disabled={creatingDriver}
        >
          {creatingDriver
            ? "Adding Driver..."
            : "Add Driver"}
        </button>

        {driverError && (
          <p className="error-message">
            {driverError}
          </p>
        )}
      </div>

      {/* Driver Summary */}
      <div className="card">
        <h2>Drivers</h2>

        {loadingDrivers ? (
          <p>Loading drivers...</p>
        ) : drivers.length === 0 ? (
          <p>No drivers found.</p>
        ) : (
          <div className="grid">
            {drivers.map(driver => (
              <div
                key={driver.id}
                className="cart-item"
              >
                <div>
                  <strong>
                    {driver.fullName}
                  </strong>

                  <br />

                  <span>
                    {driver.phoneNumber}
                  </span>
                </div>

                <span>
                  {driver.isAvailable
                    ? "Available"
                    : "Unavailable"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card">
        <h2>Order Management</h2>

        <div className="grid">
          <div>
            <label htmlFor="orderSearch">
              Search Orders
            </label>

            <input
              id="orderSearch"
              className="input"
              placeholder="Search by order, employee or driver..."
              value={searchTerm}
              onChange={e =>
                setSearchTerm(e.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="statusFilter">
              Filter by Status
            </label>

            <select
              id="statusFilter"
              className="input"
              value={selectedStatus}
              onChange={e =>
                setSelectedStatus(e.target.value)
              }
            >
              <option value="All">
                All Statuses
              </option>

              {statuses.map(status => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p>
          Showing{" "}
          <strong>{filteredOrders.length}</strong>{" "}
          of{" "}
          <strong>{orders.length}</strong> orders.
        </p>
      </div>

      {/* Orders */}
      <div>
        {loadingOrders ? (
          <div className="card">
            <h2>Loading Orders...</h2>
            <p>
              Please wait while the latest orders
              are loaded.
            </p>
          </div>
        ) : orderError ? (
          <div className="card">
            <h2>Unable to Load Orders</h2>

            <p className="error-message">
              {orderError}
            </p>

            <button
              type="button"
              className="button"
              onClick={() => void loadOrders()}
            >
              Try Again
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="card">
            <h2>No Orders Found</h2>

            <p>
              There are no orders matching the
              selected filters.
            </p>
          </div>
        ) : (
          <div className="grid">
            {filteredOrders.map(order => {
              const items = Array.isArray(order.items)
                ? order.items
                : [];

              const isUpdating =
                updatingOrderId === order.id;

              const isAssigning =
                assigningOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="card"
                >
                  <div className="order-header">
                    <h2>
                      Order #{order.id}
                    </h2>

                    <span>
                      {order.status ||
                        "Unknown"}
                    </span>
                  </div>

                  <p>
                    <strong>
                      Employee:
                    </strong>{" "}
                    {order.employeeName ||
                      "Unknown"}
                  </p>

                  <p>
                    <strong>
                      Employee Number:
                    </strong>{" "}
                    {order.employeeNumber ||
                      "N/A"}
                  </p>

                  <p>
                    <strong>
                      Order Date:
                    </strong>{" "}
                    {formatDateTime(
                      order.orderDate
                    )}
                  </p>

                  <p>
                    <strong>
                      Total:
                    </strong>{" "}
                    {formatCurrency(
                      order.totalAmount
                    )}
                  </p>

                  <p>
                    <strong>
                      Driver:
                    </strong>{" "}
                    {order.driverName ||
                      "Not assigned"}
                  </p>

                  <p>
                    <strong>
                      ETA:
                    </strong>{" "}
                    {formatDateTime(
                      order.estimatedDeliveryTime
                    )}
                  </p>

                  <OrderProgress
                    status={order.status}
                  />

                  {/* Assign Driver */}
                  <h4>
                    Assign Driver
                  </h4>

                  {availableDrivers.length === 0 ? (
                    <p>
                      No available drivers.
                    </p>
                  ) : (
                    <select
                      className="input"
                      value={
                        order.driverId
                          ? String(order.driverId)
                          : ""
                      }
                      onChange={e => {
                        const driverId =
                          Number(
                            e.target.value
                          );

                        if (driverId) {
                          void assignDriver(
                            order.id,
                            driverId
                          );
                        }
                      }}
                      disabled={
                        isAssigning ||
                        isUpdating
                      }
                    >
                      <option value="">
                        Select Driver
                      </option>

                      {availableDrivers.map(
                        driver => (
                          <option
                            key={driver.id}
                            value={driver.id}
                          >
                            {driver.fullName} -{" "}
                            {driver.phoneNumber}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {isAssigning && (
                    <p>
                      Assigning driver...
                    </p>
                  )}

                  {/* Update Status */}
                  <h4>
                    Update Status
                  </h4>

                  <div className="status-actions">
                    {statuses.map(status => (
                      <button
                        type="button"
                        key={status}
                        className="button"
                        disabled={
                          isUpdating ||
                          isAssigning ||
                          normaliseStatus(
                            order.status
                          ) ===
                            normaliseStatus(
                              status
                            )
                        }
                        onClick={() =>
                          void updateStatus(
                            order.id,
                            status
                          )
                        }
                      >
                        {isUpdating &&
                        normaliseStatus(
                          order.status
                        ) !==
                          normaliseStatus(
                            status
                          )
                          ? "Updating..."
                          : status}
                      </button>
                    ))}
                  </div>

                  {/* Order Items */}
                  <h4>
                    Items
                  </h4>

                  {items.length === 0 ? (
                    <p>
                      No order items found.
                    </p>
                  ) : (
                    items.map(item => {
                      const quantity =
                        Number(
                          item.quantity
                        ) || 0;

                      const unitPrice =
                        Number(
                          item.unitPriceAtTimeOfOrder
                        ) || 0;

                      const lineTotal =
                        quantity *
                        unitPrice;

                      return (
                        <div
                          key={item.id}
                          className="cart-item"
                        >
                          <span>
                            {item.itemName ||
                              "Unknown item"}{" "}
                            x {quantity}
                          </span>

                          <span>
                            {formatCurrency(
                              lineTotal
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}