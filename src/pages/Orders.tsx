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

import {
  getUserFromToken
} from "../utils/auth";

import OrderProgress from "../components/OrderProgress";

import {
  onOrderUpdate,
  onStatusUpdate
} from "../signalr";

import type { Order } from "../types";

const statuses = [
  "Pending",
  "Preparing",
  "Ready For Pickup",
  "Out For Delivery",
  "Delivered",
  "Cancelled"
];

const pageSize = 5;

interface PaginatedOrders {
  items: Order[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}


const normaliseOrder = (
  value: Partial<Order>
): Order => {
  return {
    id: Number(value.id ?? 0),
    employeeId: value.employeeId,
    employeeName: value.employeeName ?? "",
    employeeNumber: value.employeeNumber ?? "",
    driverId: value.driverId ?? null,
    driverName: value.driverName ?? null,
    orderDate: value.orderDate ?? "",
    totalAmount: Number(value.totalAmount ?? 0),
    status: value.status ?? "Pending",
    estimatedDeliveryTime:
      value.estimatedDeliveryTime ?? undefined,
    items: Array.isArray(value.items)
      ? value.items
      : [],
  };
};


const extractOrders = (
  data: unknown
): Order[] => {
  if (Array.isArray(data)) {
    return data.map(item =>
      normaliseOrder(
        item as Partial<Order>
      )
    );
  }

  if (
    data &&
    typeof data === "object"
  ) {
    const response =
      data as Record<
        string,
        unknown
      >;

    const items =
      response.items ??
      response.data ??
      response.results;

    if (Array.isArray(items)) {
      return items.map(item =>
        normaliseOrder(
          item as Partial<Order>
        )
      );
    }
  }

  return [];
};

export default function Orders() {
  const user =
    getUserFromToken();

  const isEmployee =
    user?.role === "Employee";

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [date, setDate] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalItems, setTotalItems] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [cancellingOrderId, setCancellingOrderId] =
    useState<number | null>(null);

  const loadOrders =
    useCallback(async () => {
      if (
        isEmployee &&
        !user?.employeeNumber
      ) {
        setOrders([]);
        setLoading(false);
        setError(
          "Your account is not linked to an employee number."
        );
        return;
      }

      try {
        setLoading(true);
        setError("");

        if (
          isEmployee
        ) {
          const response =
            await api.get(
              `/orders/employee/${encodeURIComponent(
                user.employeeNumber
              )}`
            );

          const employeeOrders =
            extractOrders(
              response.data
            );

          setOrders(
            employeeOrders
          );

          setTotalItems(
            employeeOrders.length
          );

          setTotalPages(
            Math.max(
              1,
              Math.ceil(
                employeeOrders.length /
                  pageSize
              )
            )
          );

          return;
        }

        const response =
          await api.get<
            PaginatedOrders
          >("/orders/all", {
            params: {
              search:
                search.trim() ||
                undefined,

              status:
                status ||
                undefined,

              fromDate:
                date ||
                undefined,

              toDate:
                date ||
                undefined,

              page,

              pageSize
            }
          });

        const responseData =
          response.data;

        const serverOrders =
          extractOrders(
            responseData
          );

        setOrders(
          serverOrders
        );

        setTotalItems(
          Number(
            responseData?.totalItems ??
              serverOrders.length
          )
        );

        setTotalPages(
          Math.max(
            1,
            Number(
              responseData?.totalPages ??
                1
            )
          )
        );
      } catch (requestError) {
        console.error(
          "Failed to load orders:",
          requestError
        );

        const message =
          getApiErrorMessage(
            requestError,
            "Failed to load orders."
          );

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }, [
      isEmployee,
      user?.employeeNumber,
      search,
      status,
      date,
      page
    ]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadOrders();
        },
        250
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [loadOrders]);

  /*
   * SignalR: newly created orders.
   */
  useEffect(() => {
    const removeListener =
      onOrderUpdate(
        payload => {
          const incoming =
            normaliseOrder(
              payload as Partial<Order>
            );

          if (!incoming.id) {
            return;
          }

          if (
            isEmployee &&
            incoming.employeeNumber !==
              user?.employeeNumber
          ) {
            return;
          }

          setOrders(
            current => {
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

              if (
                page === 1 ||
                isEmployee
              ) {
                return [
                  incoming,
                  ...current
                ];
              }

              return current;
            }
          );
        }
      );

    return removeListener;
  }, [
    isEmployee,
    user?.employeeNumber,
    page
  ]);

  /*
   * SignalR: status updates.
   */
  useEffect(() => {
    const removeListener =
      onStatusUpdate(
        payload => {
          const incoming =
            normaliseOrder(
              payload as Partial<Order>
            );

          if (!incoming.id) {
            return;
          }

          if (
            isEmployee &&
            incoming.employeeNumber !==
              user?.employeeNumber
          ) {
            return;
          }

          setOrders(
            current =>
              current.map(
                order =>
                  order.id ===
                  incoming.id
                    ? {
                        ...order,
                        ...incoming
                      }
                    : order
              )
          );
        }
      );

    return removeListener;
  }, [
    isEmployee,
    user?.employeeNumber
  ]);

  /*
   * Fallback polling.
   *
   * SignalR provides real-time updates.
   * Polling protects the application if
   * SignalR becomes unavailable.
   */
  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          void loadOrders();
        },
        15000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [loadOrders]);

  /*
   * Employee filtering is performed locally
   * because the employee endpoint returns
   * the employee's complete order history.
   */
  const employeeFiltered =
    useMemo(() => {
      if (!isEmployee) {
        return orders;
      }

      const query =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        order => {
          const matchesSearch =
            !query ||
            String(
              order.employeeName ??
                ""
            )
              .toLowerCase()
              .includes(query) ||
            String(
              order.employeeNumber ??
                ""
            )
              .toLowerCase()
              .includes(query) ||
            String(
              order.id
            ).includes(query);

          const matchesStatus =
            !status ||
            order.status ===
              status;

          const matchesDate =
            !date ||
            (
              order.orderDate
                ? new Date(
                    order.orderDate
                  )
                    .toISOString()
                    .slice(
                      0,
                      10
                    )
                : ""
            ) === date;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesDate
          );
        }
      );
    }, [
      orders,
      search,
      status,
      date,
      isEmployee
    ]);

  const employeeTotalPages =
    Math.max(
      1,
      Math.ceil(
        employeeFiltered.length /
          pageSize
      )
    );

  const safeEmployeePage =
    Math.min(
      page,
      employeeTotalPages
    );

  const displayedOrders =
    isEmployee
      ? employeeFiltered.slice(
          (safeEmployeePage -
            1) *
            pageSize,
          safeEmployeePage *
            pageSize
        )
      : orders;

  const displayedTotalPages =
    isEmployee
      ? employeeTotalPages
      : totalPages;

  const displayedTotalItems =
    isEmployee
      ? employeeFiltered.length
      : totalItems;

  const cancelOrder =
    async (id: number) => {
      const confirmed =
        window.confirm(
          `Cancel order #${id}? The balance will be refunded if cancellation is allowed.`
        );

      if (!confirmed) {
        return;
      }

      setCancellingOrderId(
        id
      );

      try {
        await api.put(
          `/orders/${id}/cancel`
        );

        toast.success(
          "Order cancelled and refunded."
        );

        await loadOrders();
      } catch (requestError) {
        toast.error(
          getApiErrorMessage(
            requestError,
            "Failed to cancel order."
          )
        );
      } finally {
        setCancellingOrderId(
          null
        );
      }
    };

  const clearFilters =
    () => {
      setSearch("");
      setStatus("");
      setDate("");
      setPage(1);
    };

  return (
    <div>
      <h1 className="page-title">
        📦 Orders
      </h1>

      <div className="card filter-card">
        <input
          className="input"
          placeholder="Search employee, employee number or order ID"
          value={search}
          onChange={event => {
            setSearch(
              event.target.value
            );
            setPage(1);
          }}
        />

        <select
          className="input"
          value={status}
          onChange={event => {
            setStatus(
              event.target.value
            );
            setPage(1);
          }}
        >
          <option value="">
            All Statuses
          </option>

          {statuses.map(
            currentStatus => (
              <option
                key={
                  currentStatus
                }
                value={
                  currentStatus
                }
              >
                {currentStatus}
              </option>
            )
          )}
        </select>

        <input
          className="input"
          type="date"
          value={date}
          onChange={event => {
            setDate(
              event.target.value
            );
            setPage(1);
          }}
        />

        <button
          type="button"
          className="button"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {error && (
        <div className="card">
          <p className="error-message">
            {error}
          </p>

          <button
            type="button"
            className="button"
            onClick={() =>
              void loadOrders()
            }
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="card">
          Loading orders...
        </div>
      ) : displayedOrders.length ===
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
          {displayedOrders.map(
            order => (
              <div
                key={order.id}
                className="card"
              >
                <div className="order-heading">
                  <h2>
                    Order #{order.id}
                  </h2>

                  <span
                    className={`badge ${order.status
                      .toLowerCase()
                      .replaceAll(
                        " ",
                        "-"
                      )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <p>
                  <strong>
                    Employee:
                  </strong>{" "}
                  {order.employeeName ||
                    "-"}{" "}
                  (
                  {order.employeeNumber ||
                    "-"}
                  )
                </p>

                <p>
                  <strong>
                    Total:
                  </strong>{" "}
                  R
                  {Number(
                    order.totalAmount
                  ).toFixed(2)}
                </p>

                <p>
                  <strong>
                    Date:
                  </strong>{" "}
                  {order.orderDate
                    ? new Date(
                        order.orderDate
                      ).toLocaleString(
                        "en-ZA"
                      )
                    : "-"}
                </p>

                {order.driverName && (
                  <p>
                    <strong>
                      Driver:
                    </strong>{" "}
                    {
                      order.driverName
                    }
                  </p>
                )}

                {order.estimatedDeliveryTime && (
                  <p>
                    <strong>
                      Estimated
                      delivery:
                    </strong>{" "}
                    {
                      order.estimatedDeliveryTime
                    }
                  </p>
                )}

                <OrderProgress
                  status={
                    order.status
                  }
                />

                {order.items &&
                  order.items.length >
                    0 && (
                    <div>
                      <h4>
                        Order Items
                      </h4>

                      {order.items.map(
                        item => (
                          <div
                            key={
                              item.id
                            }
                            className="cart-item"
                          >
                            <span>
                              {
                                item.itemName
                              }{" "}
                              ×{" "}
                              {
                                item.quantity
                              }
                            </span>

                            <span>
                              R
                              {Number(
                                item.unitPriceAtTimeOfOrder *
                                  item.quantity
                              ).toFixed(
                                2
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                {order.status ===
                  "Pending" && (
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={
                      cancellingOrderId ===
                      order.id
                    }
                    onClick={() =>
                      void cancelOrder(
                        order.id
                      )
                    }
                  >
                    {cancellingOrderId ===
                    order.id
                      ? "Cancelling..."
                      : "Cancel Order"}
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      <div className="pagination">
        <button
          type="button"
          className="button"
          disabled={
            page <= 1 ||
            loading
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
          Page{" "}
          {isEmployee
            ? safeEmployeePage
            : page}{" "}
          of{" "}
          {displayedTotalPages}{" "}
          ·{" "}
          {displayedTotalItems}{" "}
          orders
        </span>

        <button
          type="button"
          className="button"
          disabled={
            page >=
              displayedTotalPages ||
            loading
          }
          onClick={() =>
            setPage(
              current =>
                Math.min(
                  displayedTotalPages,
                  current + 1
                )
            )
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}