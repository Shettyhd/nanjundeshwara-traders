import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import "./AdminDashboard.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

function AdminDashboard() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");

  // ==========================================
  // ADMIN LOGOUT
  // ==========================================

  function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out of the admin dashboard?"
    );

    if (!confirmed) return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(
      new Event("nanjundeshwara-auth-changed")
    );

    navigate("/login", { replace: true });
  }

  // ==========================================
  // FETCH PRODUCTS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        const response = await axios.get(
          `${API_URL}/products`
        );

        if (cancelled) return;

        const data = response.data;

        const productList = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.data)
              ? data.data
              : [];

        setProducts(productList);
      } catch (err) {
        console.error("Fetch products error:", err);

        if (!cancelled) {
          setError(
            "Unable to load products. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // FETCH ORDERS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          if (!cancelled) {
            setOrdersLoading(false);
          }
          return;
        }

        const response = await axios.get(
          `${API_URL}/orders`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (cancelled) return;

        setOrders(
          Array.isArray(response.data?.orders)
            ? response.data.orders
            : []
        );
      } catch (err) {
        console.error("Fetch orders error:", err);
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // FETCH SALES ANALYTICS
  // ==========================================

  async function fetchAnalytics(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setAnalyticsLoading(true);
    }

    setAnalyticsError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const response = await axios.get(
        `${API_URL}/orders/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to load sales analytics."
        );
      }

      setAnalytics(response.data.analytics);
    } catch (err) {
      console.error("Sales analytics error:", err);

      setAnalyticsError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load sales analytics."
      );
    } finally {
      setAnalyticsLoading(false);
      setRefreshing(false);
    }
  }

 useEffect(() => {
  let cancelled = false;

  async function loadAnalytics() {
    setAnalyticsError("");
    setAnalyticsLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const response = await axios.get(
        `${API_URL}/orders/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (cancelled) return;

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to load sales analytics."
        );
      }

      setAnalytics(response.data.analytics);
    } catch (err) {
      if (cancelled) return;

      console.error("Sales analytics error:", err);

      setAnalyticsError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load sales analytics."
      );
    } finally {
      if (!cancelled) {
        setAnalyticsLoading(false);
      }
    }
  }

  loadAnalytics();

  return () => {
    cancelled = true;
  };
}, []);

  // ==========================================
  // INVENTORY STATISTICS
  // ==========================================

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  );

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) *
        Number(product.stock || 0),
    0
  );

  const lowStock = products.filter(
    (product) => Number(product.stock || 0) <= 5
  ).length;

  // ==========================================
  // ORDER STATISTICS
  // ==========================================

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const confirmedOrders = orders.filter(
    (order) => order.status === "Confirmed"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  // ==========================================
  // ANALYTICS VALUES
  // ==========================================

  const monthlySales = analytics?.monthlySales || [];

  const bestSellingProducts =
    analytics?.bestSellingProducts || [];

  const recentSales = analytics?.recentSales || [];

  const maxMonthlyValue = Math.max(
    1,
    ...monthlySales.map(
      (month) => Number(month.orderValue || 0)
    )
  );

  // ==========================================
  // DASHBOARD UI
  // ==========================================

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">N</div>

          <div>
            <h2>NANJUNDESHWARA</h2>
            <p>TRADERS · ADMIN</p>
          </div>
        </div>

        <p className="sidebar-label">MAIN MENU</p>

        <nav className="sidebar-nav">
          <Link
            to="/admin"
            className="sidebar-link active"
          >
            <span>▦</span>
            Dashboard
          </Link>

          <Link
            to="/admin/products"
            className="sidebar-link"
          >
            <span>▤</span>
            Products
          </Link>

          <Link
            to="/admin/orders"
            className="sidebar-link"
          >
            <span>▣</span>
            Orders

            {!ordersLoading && pendingOrders > 0 && (
              <span className="orders-notification-badge">
                {pendingOrders}
              </span>
            )}
          </Link>

          <a
            href="#inventory"
            className="sidebar-link"
          >
            <span>▥</span>
            Inventory
          </a>

          <Link
            to="/home"
            className="sidebar-link"
          >
            <span>↗</span>
            View Store
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-avatar">A</div>

          <div className="admin-user-info">
            <strong>Administrator</strong>
            <p>Store Management</p>
          </div>
        </div>

        <button
          type="button"
          className="admin-logout-button sidebar-logout-button"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </aside>

      {/* MAIN DASHBOARD */}

      <main className="admin-main">
        {/* TOP HEADER */}

        <header className="admin-topbar">
          <div>
            <p className="admin-breadcrumb">
              ADMIN / OVERVIEW
            </p>

            <h1>Dashboard</h1>
          </div>

          <div className="admin-topbar-actions">
            <Link
              to="/home"
              className="view-store-button"
            >
              View Store ↗
            </Link>

            <button
              type="button"
              className="admin-logout-button"
              onClick={handleLogout}
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        </header>

        {/* WELCOME BANNER */}

        <section className="welcome-banner">
          <div>
            <p>STORE OVERVIEW</p>

            <h2>
              Welcome to your dashboard 👋
            </h2>

            <span>
              Monitor your hardware business, sales,
              products, and inventory in one place.
            </span>
          </div>

          <div className="welcome-icon">🏪</div>
        </section>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        {/* ======================================
            SALES ANALYTICS
        ====================================== */}

        <section className="analytics-section">
          <div className="analytics-section-heading">
            <div>
              <p className="analytics-eyebrow">
                BUSINESS PERFORMANCE
              </p>

              <h2>Sales Analytics</h2>

              <p>
                Monitor your orders, sales value,
                and product performance.
              </p>
            </div>

            <button
              type="button"
              className="analytics-refresh-button"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {analyticsError && (
            <div
              className="analytics-error"
              role="alert"
            >
              <p>{analyticsError}</p>

              <button
                type="button"
                onClick={() => fetchAnalytics(true)}
              >
                Try Again
              </button>
            </div>
          )}

          <div className="analytics-stats-grid">
            <article className="analytics-stat-card revenue-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon">
                  ₹
                </span>
                <span className="analytics-stat-label">
                  CONFIRMED REVENUE
                </span>
              </div>

              <h3>
                {analyticsLoading
                  ? "Loading..."
                  : formatCurrency(
                      analytics?.totalRevenue
                    )}
              </h3>

              <p>
                Payments marked as received
              </p>
            </article>

            <article className="analytics-stat-card order-value-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon">
                  ₹
                </span>
                <span className="analytics-stat-label">
                  TOTAL ORDER VALUE
                </span>
              </div>

              <h3>
                {analyticsLoading
                  ? "Loading..."
                  : formatCurrency(
                      analytics?.totalOrderValue
                    )}
              </h3>

              <p>
                Excludes cancelled orders
              </p>
            </article>

            <article className="analytics-stat-card total-orders-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon">
                  📦
                </span>
                <span className="analytics-stat-label">
                  TOTAL ORDERS
                </span>
              </div>

              <h3>
                {analyticsLoading
                  ? "..."
                  : analytics?.totalOrders ?? 0}
              </h3>

              <p>All orders, including cancelled</p>
            </article>

            <article className="analytics-stat-card delivered-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon">
                  ✓
                </span>
                <span className="analytics-stat-label">
                  DELIVERED ORDERS
                </span>
              </div>

              <h3>
                {analyticsLoading
                  ? "..."
                  : analytics?.deliveredOrders ?? 0}
              </h3>

              <p>Successfully delivered</p>
            </article>
          </div>

          {/* MONTHLY SALES CHART */}

          <div className="analytics-panel">
            <div className="analytics-panel-heading">
              <div>
                <h3>Monthly Sales</h3>

                <p>
                  Order value over the last six months
                </p>
              </div>

              <span className="chart-legend">
                <span className="chart-legend-dot" />
                Order value
              </span>
            </div>

            {analyticsLoading ? (
              <p className="panel-message">
                Loading monthly sales...
              </p>
            ) : monthlySales.length === 0 ? (
              <p className="panel-message">
                No monthly sales data is available.
              </p>
            ) : (
              <div className="monthly-chart">
                {monthlySales.map((month) => {
                  const value = Number(
                    month.orderValue || 0
                  );

                  const barHeight =
                    value > 0
                      ? Math.max(
                          5,
                          (value / maxMonthlyValue) * 100
                        )
                      : 0;

                  return (
                    <div
                      className="monthly-chart-column"
                      key={month.month}
                    >
                      <span className="monthly-chart-value">
                        {formatCurrency(value)}
                      </span>

                      <div className="monthly-chart-track">
                        <div
                          className="monthly-chart-bar"
                          style={{
                            height: `${barHeight}%`,
                          }}
                          title={`${month.month}: ${formatCurrency(
                            value
                          )}`}
                        />
                      </div>

                      <span className="monthly-chart-label">
                        {month.month}
                      </span>

                      <small>
                        {Number(month.orders || 0)} orders
                      </small>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="chart-footnote">
              Order value excludes cancelled orders.
              Unpaid orders are included in order value,
              but not in confirmed revenue.
            </p>
          </div>

          {/* BEST SELLERS AND RECENT SALES */}

          <div className="analytics-bottom-grid">
            <section className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Best-Selling Products</h3>

                  <p>
                    Top products by quantity ordered
                  </p>
                </div>

                <span className="analytics-heading-icon">
                  🏆
                </span>
              </div>

              {analyticsLoading ? (
                <p className="panel-message">
                  Loading products...
                </p>
              ) : bestSellingProducts.length === 0 ? (
                <p className="panel-message">
                  No sales data available yet.
                </p>
              ) : (
                <div className="best-sellers-list">
                  {bestSellingProducts.map(
                    (product, index) => (
                      <div
                        className="best-seller-item"
                        key={product.productId}
                      >
                        <span className="best-seller-rank">
                          {index + 1}
                        </span>

                        <div className="best-seller-info">
                          <strong>{product.name}</strong>

                          <span>
                            {product.quantitySold} units sold
                          </span>
                        </div>

                        <strong className="best-seller-value">
                          {formatCurrency(
                            product.orderValue
                          )}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            <section className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h3>Recent Sales</h3>

                  <p>
                    Latest non-cancelled orders
                  </p>
                </div>

                <Link
                  to="/admin/orders"
                  className="analytics-view-all"
                >
                  View all →
                </Link>
              </div>

              {analyticsLoading ? (
                <p className="panel-message">
                  Loading recent sales...
                </p>
              ) : recentSales.length === 0 ? (
                <p className="panel-message">
                  No recent orders available.
                </p>
              ) : (
                <div className="recent-sales-list">
                  {recentSales.map((sale) => (
                    <div
                      className="recent-sale-item"
                      key={sale._id}
                    >
                      <div className="recent-sale-icon">
                        🧾
                      </div>

                      <div className="recent-sale-info">
                        <strong>
                          {sale.customerName || "Customer"}
                        </strong>

                        <span>
                          {sale.createdAt
                            ? new Date(
                                sale.createdAt
                              ).toLocaleDateString("en-IN")
                            : "Date unavailable"}
                        </span>

                        <span
                          className={`recent-sale-status status-${String(
                            sale.status || ""
                          ).toLowerCase()}`}
                        >
                          {sale.status}
                        </span>
                      </div>

                      <strong className="recent-sale-amount">
                        {formatCurrency(sale.totalAmount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        {/* INVENTORY STATISTICS */}

        <section className="dashboard-section-heading">
          <div>
            <p>INVENTORY OVERVIEW</p>
            <h2>Products & Inventory</h2>
          </div>

          <Link
            to="/admin/products"
            className="manage-button"
          >
            Manage Products →
          </Link>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon green">▤</div>

            <p>Total Products</p>

            <h2>
              {loading ? "..." : totalProducts}
            </h2>

            <span>Products in your catalogue</span>
          </article>

          <article className="stat-card">
            <div className="stat-icon gold">▥</div>

            <p>Total Stock Units</p>

            <h2>
              {loading ? "..." : totalStock}
            </h2>

            <span>Units across all products</span>
          </article>

          <article className="stat-card">
            <div className="stat-icon blue">₹</div>

            <p>Inventory Value</p>

            <h2>
              {loading
                ? "..."
                : formatCurrency(inventoryValue)}
            </h2>

            <span>
              Estimated retail value of stock
            </span>
          </article>

          <article className="stat-card">
            <div className="stat-icon red">!</div>

            <p>Low Stock Products</p>

            <h2>
              {loading ? "..." : lowStock}
            </h2>

            <span>
              Products with 5 units or fewer
            </span>
          </article>
        </section>

        {/* CUSTOMER ORDERS SUMMARY */}

        <section className="inventory-panel admin-orders-summary">
          <div className="panel-heading">
            <div>
              <h2>Customer Orders</h2>

              <p>
                {ordersLoading
                  ? "Loading orders..."
                  : `${pendingOrders} order(s) awaiting confirmation`}
              </p>
            </div>

            <Link
              to="/admin/orders"
              className="manage-button"
            >
              Manage Orders →
            </Link>
          </div>

          {!ordersLoading && (
            <div className="dashboard-order-counts">
              <div>
                <span>Total Orders</span>
                <strong>{orders.length}</strong>
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingOrders}</strong>
              </div>

              <div>
                <span>Confirmed</span>
                <strong>{confirmedOrders}</strong>
              </div>

              <div>
                <span>Delivered</span>
                <strong>{deliveredOrders}</strong>
              </div>
            </div>
          )}
        </section>

        {/* RECENT PRODUCTS */}

        <section
          className="inventory-panel"
          id="inventory"
        >
          <div className="panel-heading">
            <div>
              <h2>Recent Products</h2>
              <p>Review your hardware catalogue.</p>
            </div>

            <Link
              to="/admin/products"
              className="manage-button"
            >
              Manage Products →
            </Link>
          </div>

          {loading ? (
            <p className="panel-message">
              Loading products...
            </p>
          ) : products.length === 0 ? (
            <p className="panel-message">
              No products have been added yet.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>CATEGORY</th>
                    <th>PRICE</th>
                    <th>STOCK</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>
                  {products.slice(0, 5).map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="table-product">
                          <div className="table-product-image">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                              />
                            ) : (
                              "🔧"
                            )}
                          </div>

                          <div>
                            <strong>{product.name}</strong>

                            <small>
                              {product.brand || "Unbranded"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>{product.category}</td>

                      <td className="price-cell">
                        {formatCurrency(product.price)}
                      </td>

                      <td>{product.stock ?? 0}</td>

                      <td>
                        <span
                          className={
                            Number(product.stock) > 5
                              ? "stock-badge in-stock"
                              : "stock-badge low-stock"
                          }
                        >
                          {Number(product.stock) > 5
                            ? "In Stock"
                            : "Low Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FOOTER */}

        <footer className="admin-footer">
          © {new Date().getFullYear()} Nanjundeshwara
          Traders · Admin Panel
        </footer>
      </main>
    </div>
  );
}

export default AdminDashboard;