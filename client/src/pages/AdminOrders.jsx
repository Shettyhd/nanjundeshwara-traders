import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import "./AdminOrders.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatPrice(price) {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function getStatusClass(status) {
  return String(status || "Pending")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // ==========================================
  // FETCH ORDERS
  // ==========================================

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setOrders([]);
        setError("Please log in using your administrator account.");
        return;
      }

      const response = await axios.get(`${API_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      });

      if (response.data?.success !== true) {
        throw new Error(
          response.data?.message || "Unable to load orders."
        );
      }

      setOrders(
        Array.isArray(response.data.orders)
          ? response.data.orders
          : []
      );
    } catch (err) {
      console.error("Fetch orders error:", err);

      setError(
        getErrorMessage(
          err,
          "Unable to load orders. Check your login and backend."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);
useEffect(() => {
  const timer = setTimeout(() => {
    fetchOrders();
  }, 0);

  return () => {
    clearTimeout(timer);
  };
}, [fetchOrders]);

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================

  async function updateStatus(orderId, newStatus) {
    const currentOrder = orders.find(
      (order) => order._id === orderId
    );

    if (!currentOrder || updatingOrderId) {
      return;
    }

    if (currentOrder.status === newStatus) {
      return;
    }

    if (newStatus === "Cancelled") {
      const confirmed = window.confirm(
        `Are you sure you want to cancel order ${orderId}?`
      );

      if (!confirmed) {
        return;
      }
    }

    setUpdatingOrderId(orderId);
    setError("");
    setNotice("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      const response = await axios.patch(
        `${API_URL}/orders/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        }
      );

      const updatedOrder = response.data?.order;

      if (
        response.data?.success !== true ||
        !updatedOrder ||
        updatedOrder._id !== orderId ||
        updatedOrder.status !== newStatus
      ) {
        throw new Error(
          response.data?.message ||
            "The server did not confirm the requested status."
        );
      }

      // Update the UI with the order returned by the backend.
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === orderId
            ? { ...order, ...updatedOrder }
            : order
        )
      );

      setNotice(
        `Order #${orderId.slice(-8).toUpperCase()} updated to ${newStatus}.`
      );

      // Verify that the updated status is persisted in MongoDB.
      try {
        const verifyResponse = await axios.get(
          `${API_URL}/orders`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 15000,
          }
        );

        const latestOrders = verifyResponse.data?.orders;

        if (Array.isArray(latestOrders)) {
          const latestOrder = latestOrders.find(
            (order) => order._id === orderId
          );

          if (latestOrder) {
            if (latestOrder.status !== newStatus) {
              setError(
                `The saved order status differs from the requested status. Current server status: ${latestOrder.status}.`
              );
            }

            setOrders(latestOrders);
          }
        }
      } catch (verificationError) {
        // The status update succeeded. Keep the confirmed update visible.
        console.error(
          "Order verification error:",
          verificationError
        );
      }
    } catch (err) {
      console.error("Update status error:", err);

      setError(
        getErrorMessage(
          err,
          "Unable to update the order status."
        )
      );

      await fetchOrders();
    } finally {
      setUpdatingOrderId("");
    }
  }

  // ==========================================
  // STATISTICS AND FILTERING
  // ==========================================

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const confirmedOrders = orders.filter(
    (order) => order.status === "Confirmed"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      filter === "All" || order.status === filter;

    const searchableText = [
      order._id,
      order.customerName,
      order.phone,
      order.address,
      ...(order.items || []).map((item) => item.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(
      search.trim().toLowerCase()
    );

    return matchesStatus && matchesSearch;
  });

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="admin-orders-page">
      <div className="admin-orders-container">
        {/* HEADER */}

        <header className="admin-orders-header">
          <div>
            <span className="admin-orders-eyebrow">
              NANJUNDESHWARA TRADERS
            </span>

            <h1>Customer Orders</h1>

            <p>
              Manage customer purchases, deliveries, and order
              progress.
            </p>
          </div>

          <div className="admin-orders-header-actions">
            <Link
              to="/admin"
              className="admin-orders-button"
            >
              ← Dashboard
            </Link>

            <button
              type="button"
              className="admin-orders-button primary"
              onClick={fetchOrders}
              disabled={loading || Boolean(updatingOrderId)}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="admin-orders-error" role="alert">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {notice && (
          <div className="admin-orders-success" role="status">
            {notice}
          </div>
        )}

        {/* STATISTICS */}

        <section
          className="admin-orders-stats"
          aria-label="Order statistics"
        >
          <article className="admin-orders-stat-card">
            <span>Total Orders</span>
            <strong>{totalOrders}</strong>
          </article>

          <article className="admin-orders-stat-card pending">
            <span>Pending Orders</span>
            <strong>{pendingOrders}</strong>
          </article>

          <article className="admin-orders-stat-card confirmed">
            <span>Confirmed Orders</span>
            <strong>{confirmedOrders}</strong>
          </article>

          <article className="admin-orders-stat-card delivered">
            <span>Delivered Orders</span>
            <strong>{deliveredOrders}</strong>
          </article>
        </section>

        {/* ORDER LIST */}

        <section className="admin-orders-section">
          <div className="admin-orders-section-header">
            <div>
              <h2>All Orders</h2>

              <p>
                {filteredOrders.length} order(s) displayed
              </p>
            </div>
          </div>

          {/* SEARCH AND FILTER */}

          <div className="admin-orders-filters">
            <input
              type="search"
              aria-label="Search orders"
              placeholder="Search order ID, customer, phone or product..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter orders by status"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="All">All Orders</option>

              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* LOADING */}

          {loading ? (
            <div className="admin-orders-message">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-orders-message">
              <h3>No orders found</h3>

              <p>
                Try changing your search or filter. New orders
                will appear here after they are saved.
              </p>
            </div>
          ) : (
            <div className="admin-order-list">
              {filteredOrders.map((order) => (
                <article
                  className="admin-order-card"
                  key={order._id}
                >
                  {/* ORDER HEADER */}

                  <div className="admin-order-card-header">
                    <div>
                      <span className="admin-order-id-label">
                        ORDER ID
                      </span>

                      <div className="admin-order-id">
                        #{order._id.slice(-8).toUpperCase()}
                      </div>

                      <span className="admin-order-date">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <span
                      className={`admin-order-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {order.status || "Pending"}
                    </span>
                  </div>

                  {/* CUSTOMER INFORMATION */}

                  <div className="admin-order-details">
                    <div className="admin-order-detail-block">
                      <h3>Customer Information</h3>

                      <p>
                        <strong>Name:</strong>{" "}
                        {order.customerName || "Not provided"}
                      </p>

                      <p>
                        <strong>Phone:</strong>{" "}
                        {order.phone || "Not provided"}
                      </p>

                      {order.customer?.email && (
                        <p>
                          <strong>Email:</strong>{" "}
                          {order.customer.email}
                        </p>
                      )}
                    </div>

                    <div className="admin-order-detail-block">
                      <h3>Order Information</h3>

                      <p>
                        <strong>Payment:</strong>{" "}
                        {order.paymentStatus || "Unpaid"}
                      </p>

                      <p>
                        <strong>Products:</strong>{" "}
                        {order.items?.length || 0}
                      </p>

                      <p>
                        <strong>Date:</strong>{" "}
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="admin-order-detail-block">
                      <h3>Order Total</h3>

                      <p className="admin-order-total">
                        {formatPrice(order.totalAmount)}
                      </p>
                    </div>
                  </div>

                  {/* DELIVERY ADDRESS */}

                  <div className="admin-order-products">
                    <h3>Delivery Address</h3>

                    <div className="admin-order-address">
                      {order.address || "No delivery address provided"}
                    </div>
                  </div>

                  {/* CUSTOMER NOTES */}

                  {order.notes && (
                    <div className="admin-order-products">
                      <h3>Customer Notes</h3>

                      <div className="admin-order-address">
                        {order.notes}
                      </div>
                    </div>
                  )}

                  {/* PRODUCTS */}

                  <div className="admin-order-products">
                    <h3>Products Ordered</h3>

                    {order.items?.length ? (
                      order.items.map((item, index) => (
                        <div
                          className="admin-order-product"
                          key={`${order._id}-${item.product || index}`}
                        >
                          <div className="admin-order-product-info">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name || "Product"}
                                loading="lazy"
                              />
                            ) : (
                              <div className="admin-order-product-placeholder">
                                📦
                              </div>
                            )}

                            <div>
                              <h4>{item.name || "Product"}</h4>

                              <p>
                                Quantity: {item.quantity} ×{" "}
                                {formatPrice(item.price)}
                              </p>
                            </div>
                          </div>

                          <strong className="admin-order-product-price">
                            {formatPrice(
                              Number(item.price) *
                                Number(item.quantity)
                            )}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p>No product details available.</p>
                    )}
                  </div>

                  {/* ORDER FOOTER */}

                  <div className="admin-order-card-footer">
                    <div className="admin-order-total">
                      <span>Total Order Value</span>

                      <strong>
                        {formatPrice(order.totalAmount)}
                      </strong>
                    </div>

                    <div className="admin-order-status-control">
                      <label htmlFor={`status-${order._id}`}>
                        Update Status
                      </label>

                      <select
                        id={`status-${order._id}`}
                        value={order.status || "Pending"}
                        disabled={
                          Boolean(updatingOrderId) ||
                          order.status === "Cancelled"
                        }
                        onChange={(event) =>
                          updateStatus(
                            order._id,
                            event.target.value
                          )
                        }
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      {updatingOrderId === order._id && (
                        <span>Saving...</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}

        <footer className="admin-orders-footer">
          NANJUNDESHWARA TRADERS · Order Management
        </footer>
      </div>
    </main>
  );
}