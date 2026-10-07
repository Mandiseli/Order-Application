import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  api,
  getApiErrorMessage
} from "../api/api";

import { toast } from "react-toastify";

import OrderProgress from "../components/OrderProgress";

import {
  onOrderUpdate,
  onStatusUpdate
} from "../signalr";

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
  employeeId?: number;
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
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const statuses = [
  "Pending",
  "Preparing",
  "Ready For Pickup",
  "Out For Delivery",
  "Delivered"
];

const normaliseStatus = (
  status: string | null | undefined
): string => {
  return String(status ?? "")
    .trim()
    .toLowerCase();
};

const formatCurrency = (
  amount: number | string | null | undefined
): string => {
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

const extractArray = <T,>(
  responseData: unknown
): T[] => {
  if (Array.isArray(responseData)) {
    return responseData as T[];
  }

  if (
    responseData &&
    typeof responseData === "object"
  ) {
    const data =
      responseData as Record<string, unknown>;

    for (const propertyName of [
      "items",
      "data",
      "results"
    ]) {
      const value = data[propertyName];

      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }

  return [];
};

const normaliseOrder = (
  value: Partial<Order>
): Order => {
  return {
    id: Number(value.id ?? 0),
    employeeId: value.employeeId,
    employeeName:
      value.employeeName ?? "",
    employeeNumber:
      value.employeeNumber ?? "",
    driverId:
      value.driverId ?? null,
    driverName:
      value.driverName ?? null,
    orderDate:
      value.orderDate ?? "",
    totalAmount:
      Number(value.totalAmount ?? 0),
    status:
      value.status ?? "Pending",
    estimatedDeliveryTime:
      value.estimatedDeliveryTime ?? null,
    items: Array.isArray(value.items)
      ? value.items
      : []
  };
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [driverName, setDriverName] =
    useState("");

  const [driverPhone, setDriverPhone] =
    useState("");

  const [loadingOrders, setLoadingOrders] =
    useState(true);

  const [loadingDrivers, setLoadingDrivers] =
    useState(true);

  const [creatingDriver, setCreatingDriver] =
    useState(false);

  const [updatingOrderId, setUpdatingOrderId] =
    useState<number | null>(null);

  const [assigningOrderId, setAssigningOrderId] =
    useState<number | null>(null);

  const [orderError, setOrderError] =
    useState("");

  const [driverError, setDriverError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const pageSize = 20;

  const [totalItems, setTotalItems] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const loadOrders = useCallback(
    async (
      requestedPage = page,
      showToast = false
    ) => {
      setLoadingOrders(true);
      setOrderError("");

      try {
        const response =
          await api.get<
            PaginatedResponse<Order>
          >("/orders/all", {
            params: {
              search:
                searchTerm.trim() || undefined,
              status:
                selectedStatus !== "All"
                  ? selectedStatus
                  : undefined,
              page: requestedPage,
              pageSize
            }
          });

        const responseData =
          response.data;

        const orderData =
          extractArray<Order>(
            responseData
          ).map(normaliseOrder);

        setOrders(orderData);

        setTotalItems(
          Number(
            responseData?.totalItems ??
            orderData.length
          )
        );

        setTotalPages(
          Math.max(
            1,
            Number(
              responseData?.totalPages ?? 1
            )
          )
        );

        if (showToast) {
          toast.success(
            "Orders refreshed."
          );
        }
      } catch (error) {
        console.error(
          "Failed to load orders:",
          error
        );

        const message =
          getApiErrorMessage(
            error,
            "Failed to load orders."
          );

        setOrderError(message);
        setOrders([]);

        toast.error(message);
      } finally {
        setLoadingOrders(false);
      }
    },
    [
      page,
      searchTerm,
      selectedStatus
    ]
  );

  const loadDrivers =
    useCallback(async (
      showToast = false
    ) => {
      setLoadingDrivers(true);
      setDriverError("");

      try {
        const response =
          await api.get("/drivers");

        const driverData =
          extractArray<Driver>(
            response.data
          );

        setDrivers(driverData);

        if (showToast) {
          toast.success(
            "Drivers refreshed."
          );
        }
      } catch (error) {
        console.error(
          "Failed to load drivers:",
          error
        );

        const message =
          getApiErrorMessage(
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
    void loadOrders(page);
  }, [
    page,
    searchTerm,
    selectedStatus
  ]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  /*
   * Real-time order creation.
   */
  useEffect(() => {
    const removeOrderListener =
      onOrderUpdate(
        payload => {
          const incoming =
            normaliseOrder(
              payload as Partial<Order>
            );

          if (!incoming.id) {
            return;
          }

          setOrders(current => {
            const exists =
              current.some(
                order =>
                  order.id ===
                  incoming.id
              );

            if (exists) {
              return current.map(
                order =>
                  order.id ===
                  incoming.id
                    ? {
                        ...order,
                        ...incoming
                      }
                    : order
              );
            }

            /*
             * The current server page may not
             * contain the new order, so we only
             * add it when it belongs on page 1.
             */
            if (page === 1) {
              return [
                incoming,
                ...current
              ].slice(0, pageSize);
            }

            return current;
          });
        }
      );

    return removeOrderListener;
  }, [page]);

  /*
   * Real-time status changes.
   */
  useEffect(() => {
    const removeStatusListener =
      onStatusUpdate(
        payload => {
          const incoming =
            normaliseOrder(
              payload as Partial<Order>
            );

          if (!incoming.id) {
            return;
          }

          setOrders(current =>
            current.map(order =>
              order.id === incoming.id
                ? {
                    ...order,
                    ...incoming
                  }
                : order
            )
          );
        }
      );

    return removeStatusListener;
  }, []);

  const createDriver =
    async () => {
      const trimmedName =
        driverName.trim();

      const trimmedPhone =
        driverPhone.trim();

      if (!trimmedName) {
        toast.error(
          "Driver name is required."
        );
        return;
      }

      if (!trimmedPhone) {
        toast.error(
          "Driver phone number is required."
        );
        return;
      }

      setCreatingDriver(true);

      try {
        await api.post("/drivers", {
          fullName: trimmedName,
          phoneNumber:
            trimmedPhone
        });

        toast.success(
          "Driver added successfully."
        );

        setDriverName("");
        setDriverPhone("");

        await loadDrivers();
      } catch (error) {
        console.error(
          "Failed to create driver:",
          error
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Failed to add driver."
          )
        );
      } finally {
        setCreatingDriver(false);
      }
    };

  const assignDriver =
    async (
      orderId: number,
      driverId: number
    ) => {
      if (!driverId) {
        return;
      }

      setAssigningOrderId(orderId);

      try {
        await api.put(
          "/orders/assign-driver",
          {
            orderId,
            driverId
          }
        );

        toast.success(
          "Driver assigned successfully."
        );

        await Promise.all([
          loadOrders(page),
          loadDrivers()
        ]);
      } catch (error) {
        console.error(
          "Failed to assign driver:",
          error
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Failed to assign driver."
          )
        );
      } finally {
        setAssigningOrderId(null);
      }
    };

  const updateStatus =
    async (
      orderId: number,
      newStatus: string
    ) => {
      setUpdatingOrderId(orderId);

      try {
        /*
         * IMPORTANT:
         * OrdersController expects:
         *
         * {
         *   "status": "Preparing"
         * }
         */
        await api.put(
          `/orders/${orderId}/status`,
          {
            status: newStatus
          }
        );

        toast.success(
          `Order updated to ${newStatus}.`
        );

        /*
         * SignalR normally updates the UI
         * immediately, while this refresh keeps
         * pagination/counts consistent.
         */
        await loadOrders(page);
      } catch (error) {
        console.error(
          "Failed to update order status:",
          error
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Failed to update order status."
          )
        );
      } finally {
        setUpdatingOrderId(null);
      }
    };

  const availableDrivers =
    useMemo(
      () =>
        drivers.filter(
          driver =>
            driver.isAvailable
        ),
      [drivers]
    );

  const statusCounts =
    useMemo(() => {
      return statuses.reduce<
        Record<string, number>
      >(
        (result, status) => {
          result[status] =
            orders.filter(
              order =>
                normaliseStatus(
                  order.status
                ) ===
                normaliseStatus(
                  status
                )
            ).length;

          return result;
        },
        {}
      );
    }, [orders]);

  const totalOrderValue =
    useMemo(() => {
      return orders.reduce(
        (total, order) => {
          const amount =
            Number(
              order.totalAmount ?? 0
            );

          return (
            total +
            (Number.isFinite(
              amount
            )
              ? amount
              : 0)
          );
        },
        0
      );
    }, [orders]);

  const deliveredOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            normaliseStatus(
              order.status
            ) ===
            normaliseStatus(
              "Delivered"
            )
        ).length,
      [orders]
    );

  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            ![
              "Delivered",
              "Cancelled"
            ].includes(
              order.status
            )
        ).length,
      [orders]
    );

  const refreshDashboard =
    async () => {
      await Promise.all([
        loadOrders(
          page,
          true
        ),
        loadDrivers(true)
      ]);
    };

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            🚚 Admin Delivery Dashboard
          </h1>

          <p>
            Manage orders, drivers and
            delivery status.
          </p>
        </div>

        <button
          type="button"
          className="button"
          onClick={() =>
            void refreshDashboard()
          }
          disabled={
            loadingOrders ||
            loadingDrivers
          }
        >
          {loadingOrders ||
          loadingDrivers
            ? "Refreshing..."
            : "Refresh Dashboard"}
        </button>
      </div>

      <div className="widgets">
        <div className="widget-card">
          <h3>Orders on Page</h3>
          <h1>{orders.length}</h1>
        </div>

        <div className="widget-card">
          <h3>Total Orders</h3>
          <h1>{totalItems}</h1>
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
          <h3>Page Order Value</h3>
          <h1>
            {formatCurrency(
              totalOrderValue
            )}
          </h1>
        </div>

        <div className="widget-card">
          <h3>Available Drivers</h3>
          <h1>
            {availableDrivers.length}
          </h1>
        </div>
      </div>

      <div className="widgets">
        {statuses.map(status => (
          <div
            key={status}
            className="widget-card"
          >
            <h3>{status}</h3>
            <h1>
              {statusCounts[status] ??
                0}
            </h1>
          </div>
        ))}
      </div>

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
              onChange={event =>
                setDriverName(
                  event.target.value
                )
              }
              disabled={
                creatingDriver
              }
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
              onChange={event =>
                setDriverPhone(
                  event.target.value
                )
              }
              disabled={
                creatingDriver
              }
            />
          </div>
        </div>

        <button
          type="button"
          className="button button-success"
          onClick={() =>
            void createDriver()
          }
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

      <div className="card">
        <h2>Drivers</h2>

        {loadingDrivers ? (
          <p>
            Loading drivers...
          </p>
        ) : drivers.length ===
          0 ? (
          <p>
            No drivers found.
          </p>
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

      <div className="card">
        <h2>
          Order Management
        </h2>

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
              onChange={event => {
                setSearchTerm(
                  event.target.value
                );
                setPage(1);
              }}
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
              onChange={event => {
                setSelectedStatus(
                  event.target.value
                );
                setPage(1);
              }}
            >
              <option value="All">
                All Statuses
              </option>

              {statuses.map(
                status => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <p>
          Showing{" "}
          <strong>
            {orders.length}
          </strong>{" "}
          of{" "}
          <strong>
            {totalItems}
          </strong>{" "}
          orders.
        </p>
      </div>

      {loadingOrders ? (
        <div className="card">
          <h2>
            Loading Orders...
          </h2>

          <p>
            Please wait while the
            latest orders are
            loaded.
          </p>
        </div>
      ) : orderError ? (
        <div className="card">
          <h2>
            Unable to Load Orders
          </h2>

          <p className="error-message">
            {orderError}
          </p>

          <button
            type="button"
            className="button"
            onClick={() =>
              void loadOrders(
                page
              )
            }
          >
            Try Again
          </button>
        </div>
      ) : orders.length ===
        0 ? (
        <div className="card">
          <h2>
            No Orders Found
          </h2>

          <p>
            There are no orders
            matching the selected
            filters.
          </p>
        </div>
      ) : (
        <div className="grid">
          {orders.map(order => {
            const items =
              Array.isArray(
                order.items
              )
                ? order.items
                : [];

            const isUpdating =
              updatingOrderId ===
              order.id;

            const isAssigning =
              assigningOrderId ===
              order.id;

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
                  {order.estimatedDeliveryTime ||
                    "Not available"}
                </p>

                <OrderProgress
                  status={
                    order.status
                  }
                />

                <h4>
                  Assign Driver
                </h4>

                {order.status ===
                "Delivered" ? (
                  <p>
                    Order already
                    delivered.
                  </p>
                ) : availableDrivers.length ===
                  0 ? (
                  <p>
                    No available
                    drivers.
                  </p>
                ) : (
                  <select
                    className="input"
                    value={
                      order.driverId
                        ? String(
                            order.driverId
                          )
                        : ""
                    }
                    onChange={event => {
                      const driverId =
                        Number(
                          event.target
                            .value
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
                          key={
                            driver.id
                          }
                          value={
                            driver.id
                          }
                        >
                          {
                            driver.fullName
                          }{" "}
                          -{" "}
                          {
                            driver.phoneNumber
                          }
                        </option>
                      )
                    )}
                  </select>
                )}

                {isAssigning && (
                  <p>
                    Assigning
                    driver...
                  </p>
                )}

                <h4>
                  Update Status
                </h4>

                <div className="status-actions">
                  {statuses.map(
                    newStatus => {
                      const sameStatus =
                        normaliseStatus(
                          order.status
                        ) ===
                        normaliseStatus(
                          newStatus
                        );

                      return (
                        <button
                          type="button"
                          key={
                            newStatus
                          }
                          className="button"
                          disabled={
                            isUpdating ||
                            isAssigning ||
                            sameStatus ||
                            order.status ===
                              "Delivered"
                          }
                          onClick={() =>
                            void updateStatus(
                              order.id,
                              newStatus
                            )
                          }
                        >
                          {isUpdating &&
                          !sameStatus
                            ? "Updating..."
                            : newStatus}
                        </button>
                      );
                    }
                  )}
                </div>

                <h4>
                  Items
                </h4>

                {items.length ===
                0 ? (
                  <p>
                    No order items
                    found.
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

                    return (
                      <div
                        key={item.id}
                        className="cart-item"
                      >
                        <span>
                          {item.itemName ||
                            "Unknown item"}{" "}
                          ×{" "}
                          {quantity}
                        </span>

                        <span>
                          {formatCurrency(
                            quantity *
                              unitPrice
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

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="button"
            disabled={
              page <= 1 ||
              loadingOrders
            }
            onClick={() =>
              setPage(
                current =>
                  Math.max(
                    1,
                    current - 1
                  )
              )
            }
          >
            Previous
          </button>

          <span>
            Page {page} of{" "}
            {totalPages} ·{" "}
            {totalItems} orders
          </span>

          <button
            type="button"
            className="button"
            disabled={
              page >= totalPages ||
              loadingOrders
            }
            onClick={() =>
              setPage(
                current =>
                  Math.min(
                    totalPages,
                    current + 1
                  )
              )
            }
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}