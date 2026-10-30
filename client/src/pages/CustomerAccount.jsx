import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import {
  FaUser,
  FaBoxOpen,
  FaTruck,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaShoppingBag,
  FaRedo,
} from "react-icons/fa";

// =====================================================
// CONFIGURATION
// =====================================================

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatPrice(price) {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
}

function formatDate(date) {
  if (!date) {
    return "Date unavailable";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

// =====================================================
// CUSTOMER ACCOUNT PAGE
// =====================================================

function CustomerAccount() {
  const [activeTab, setActiveTab] = useState("profile");

  const [user, setUser] = useState(() => getStoredUser());

  const [profile, setProfile] = useState(() => {
    const storedUser = getStoredUser();

    return {
      name: storedUser?.name || storedUser?.fullName || "",
      email: storedUser?.email || "",
      phone: storedUser?.phone || storedUser?.mobile || "",
      address: storedUser?.address || "",
    };
  });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  // =====================================================
  // LOAD CUSTOMER ORDERS
  // =====================================================

  async function loadOrders() {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setError("Please log in to view your orders.");
      return;
    }

    setLoadingOrders(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/orders/my-orders`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      setOrders(response.data?.orders || []);
    } catch (err) {
      console.error("Customer orders error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load your orders."
      );
    } finally {
      setLoadingOrders(false);
    }
  }

  // =====================================================
  // AUTOMATICALLY LOAD ORDERS WHEN TAB CHANGES
  // =====================================================

  useEffect(() => {
    if (
      activeTab !== "orders" &&
      activeTab !== "tracking"
    ) {
      return undefined;
    }

    let cancelled = false;

    async function fetchOrders() {
      const currentToken = localStorage.getItem("token");

      if (!currentToken) {
        if (!cancelled) {
          setError("Please log in to view your orders.");
        }

        return;
      }

      setLoadingOrders(true);
      setError("");

      try {
        const response = await axios.get(
          `${API_URL}/orders/my-orders`,
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        if (!cancelled) {
          setOrders(response.data?.orders || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Customer orders error:", err);

          setError(
            err.response?.data?.message ||
              "Unable to load your orders."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOrders(false);
        }
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // =====================================================
  // PROFILE FORM
  // =====================================================

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  async function handleSaveProfile(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!profile.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    const phoneDigits = profile.phone.replace(/\D/g, "");

    if (
      phoneDigits.length < 10 ||
      phoneDigits.length > 15
    ) {
      setError("Please enter a valid phone number.");
      return;
    }

    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setError("Please log in again.");
      return;
    }

    if (savingProfile) {
      return;
    }

    setSavingProfile(true);

    try {
      const response = await axios.patch(
        `${API_URL}/auth/profile`,
        {
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const updatedUser =
        response.data?.user ||
        response.data?.data?.user;

      if (!updatedUser) {
        throw new Error(
          "The server did not return the updated profile."
        );
      }

      const mergedUser = {
        ...user,
        ...updatedUser,
      };

      // Never retain sensitive fields in browser user data.
      delete mergedUser.password;
      delete mergedUser.passwordHash;
      delete mergedUser.passwordResetToken;

      localStorage.setItem(
        "user",
        JSON.stringify(mergedUser)
      );

      setUser(mergedUser);

      setProfile({
        name: mergedUser.name || "",
        email: mergedUser.email || "",
        phone: mergedUser.phone || "",
        address: mergedUser.address || "",
      });

      setSuccess("Your profile has been updated.");
    } catch (err) {
      console.error("Profile update error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  // =====================================================
  // ORDER STATUS BADGE
  // =====================================================

  function renderOrderStatus(status) {
    if (status === "Cancelled") {
      return (
        <span className="customer-status cancelled">
          Cancelled
        </span>
      );
    }

    return (
      <span className="customer-status">
        {status || "Pending"}
      </span>
    );
  }

  // =====================================================
  // ORDER TRACKING PROGRESS
  // =====================================================

  function renderTracking(order) {
    if (order.status === "Cancelled") {
      return (
        <div className="customer-cancelled-message">
          <strong>Order cancelled</strong>

          <p>
            This order has been cancelled. Contact the store
            if you need assistance.
          </p>
        </div>
      );
    }

    const currentIndex = ORDER_STATUSES.indexOf(
      order.status || "Pending"
    );

    return (
      <div className="customer-tracking">
        {ORDER_STATUSES.map((status, index) => (
          <div
            className={
              index <= currentIndex
                ? "tracking-step completed"
                : "tracking-step"
            }
            key={status}
          >
            <span className="tracking-dot">
              {index < currentIndex ? "✓" : index + 1}
            </span>

            <span>{status}</span>
          </div>
        ))}
      </div>
    );
  }

  // =====================================================
  // LOGIN CHECK
  // =====================================================

  if (!token || !user) {
    return (
      <main className="customer-account-page">
        <div className="customer-account-empty">
          <FaUser />

          <h1>Please log in</h1>

          <p>
            Log in to access your customer account.
          </p>

          <Link
            to="/login"
            className="primary-button"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  // =====================================================
  // CUSTOMER ACCOUNT UI
  // =====================================================

  return (
    <main className="customer-account-page">
      {/* PAGE HEADER */}

      <div className="customer-account-header">
        <div>
          <span className="customer-eyebrow">
            CUSTOMER ACCOUNT
          </span>

          <h1>My Account</h1>

          <p>
            Welcome back,{" "}
            {user.name || user.fullName || "Customer"}!
          </p>
        </div>

        <Link
          to="/home"
          className="customer-back-link"
        >
          Continue Shopping →
        </Link>
      </div>

      <div className="customer-account-layout">
        {/* SIDEBAR */}

        <aside className="customer-sidebar">
          <div className="customer-profile-summary">
            <div className="customer-avatar">
              {(user.name || user.fullName || "C")
                .charAt(0)
                .toUpperCase()}
            </div>

            <h3>
              {user.name || user.fullName || "Customer"}
            </h3>

            <p>{user.email || ""}</p>
          </div>

          <button
            type="button"
            className={
              activeTab === "profile"
                ? "customer-tab active"
                : "customer-tab"
            }
            onClick={() => {
              setActiveTab("profile");
              setError("");
              setSuccess("");
            }}
          >
            <FaUser />
            My Profile
          </button>

          <button
            type="button"
            className={
              activeTab === "orders"
                ? "customer-tab active"
                : "customer-tab"
            }
            onClick={() => {
              setActiveTab("orders");
              setError("");
              setSuccess("");
            }}
          >
            <FaBoxOpen />
            My Orders
          </button>

          <button
            type="button"
            className={
              activeTab === "tracking"
                ? "customer-tab active"
                : "customer-tab"
            }
            onClick={() => {
              setActiveTab("tracking");
              setError("");
              setSuccess("");
            }}
          >
            <FaTruck />
            Track Order
          </button>
        </aside>

        {/* MAIN CONTENT */}

        <section className="customer-account-content">
          {error && (
            <div
              className="customer-alert error"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="customer-alert success"
              role="status"
            >
              {success}
            </div>
          )}

          {/* =========================================
              MY PROFILE
          ========================================= */}

          {activeTab === "profile" && (
            <div>
              <div className="customer-section-heading">
                <h2>My Profile</h2>

                <p>
                  Manage your personal information.
                </p>
              </div>

              <form
                className="customer-profile-form"
                onSubmit={handleSaveProfile}
              >
                <label htmlFor="customer-name">
                  Full Name
                </label>

                <input
                  id="customer-name"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={handleProfileChange}
                  autoComplete="name"
                  required
                  disabled={savingProfile}
                />

                <label htmlFor="customer-email">
                  Email Address
                </label>

                <div className="customer-input-icon">
                  <FaEnvelope />

                  <input
                    id="customer-email"
                    type="email"
                    value={profile.email}
                    readOnly
                  />
                </div>

                <small>
                  Email changes are not available here.
                </small>

                <label htmlFor="customer-phone">
                  Phone Number
                </label>

                <div className="customer-input-icon">
                  <FaPhone />

                  <input
                    id="customer-phone"
                    name="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    autoComplete="tel"
                    required
                    disabled={savingProfile}
                  />
                </div>

                <label htmlFor="customer-address">
                  Delivery Address
                </label>

                <div className="customer-input-icon customer-address-input">
                  <FaMapMarkerAlt />

                  <textarea
                    id="customer-address"
                    name="address"
                    rows={4}
                    value={profile.address}
                    onChange={handleProfileChange}
                    autoComplete="street-address"
                    disabled={savingProfile}
                  />
                </div>

                <button
                  type="submit"
                  className="customer-save-button"
                  disabled={savingProfile}
                >
                  {savingProfile
                    ? "Saving..."
                    : "Save Profile"}
                </button>
              </form>
            </div>
          )}

          {/* =========================================
              MY ORDERS
          ========================================= */}

          {activeTab === "orders" && (
            <div>
              <div className="customer-section-heading customer-heading-row">
                <div>
                  <h2>My Orders</h2>

                  <p>
                    View your previous purchases.
                  </p>
                </div>

                <button
                  type="button"
                  className="customer-refresh-button"
                  onClick={loadOrders}
                  disabled={loadingOrders}
                >
                  <FaRedo />
                  {loadingOrders ? "Loading..." : "Refresh"}
                </button>
              </div>

              {loadingOrders ? (
                <p>Loading your orders...</p>
              ) : orders.length === 0 ? (
                <div className="customer-account-empty">
                  <FaShoppingBag />

                  <h3>No orders yet</h3>

                  <p>
                    Your orders will appear here after you
                    place an order while logged in.
                  </p>

                  <Link
                    to="/home"
                    className="primary-button"
                  >
                    Shop Now
                  </Link>
                </div>
              ) : (
                <div className="customer-order-list">
                  {orders.map((order) => (
                    <article
                      className="customer-order-card"
                      key={order._id}
                    >
                      <div className="customer-order-top">
                        <div>
                          <small>ORDER ID</small>

                          <strong>
                            #
                            {order._id
                              .slice(-8)
                              .toUpperCase()}
                          </strong>
                        </div>

                        {renderOrderStatus(order.status)}
                      </div>

                      <div className="customer-order-meta">
                        <span>
                          <FaCalendarAlt />
                          {formatDate(order.createdAt)}
                        </span>

                        <span>
                          {order.items?.length || 0} product
                          {(order.items?.length || 0) !== 1
                            ? "s"
                            : ""}
                        </span>
                      </div>

                      <div className="customer-order-products">
                        {(order.items || []).map(
                          (item, index) => (
                            <div
                              className="customer-order-product"
                              key={`${item.product || item.name}-${index}`}
                            >
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                />
                              ) : (
                                <div className="customer-order-placeholder">
                                  <FaBoxOpen />
                                </div>
                              )}

                              <div>
                                <strong>{item.name}</strong>

                                <p>
                                  Qty: {item.quantity} ×{" "}
                                  {formatPrice(item.price)}
                                </p>
                              </div>

                              <strong>
                                {formatPrice(
                                  Number(item.price) *
                                    Number(item.quantity)
                                )}
                              </strong>
                            </div>
                          )
                        )}
                      </div>

                      <div className="customer-order-bottom">
                        <span>
                          Payment:{" "}
                          {order.paymentStatus || "Unpaid"}
                        </span>

                        <strong>
                          Total:{" "}
                          {formatPrice(order.totalAmount)}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="customer-track-button"
                        onClick={() => {
                          setActiveTab("tracking");
                          setError("");
                        }}
                      >
                        <FaTruck />
                        Track This Order
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================
              TRACK ORDER
          ========================================= */}

          {activeTab === "tracking" && (
            <div>
              <div className="customer-section-heading">
                <h2>Track My Orders</h2>

                <p>
                  Follow the progress of your purchases.
                </p>
              </div>

              {loadingOrders ? (
                <p>Loading order tracking...</p>
              ) : orders.length === 0 ? (
                <div className="customer-account-empty">
                  <FaTruck />

                  <h3>No orders to track</h3>

                  <p>
                    Place an order while logged in to track
                    it here.
                  </p>
                </div>
              ) : (
                <div className="customer-tracking-list">
                  {orders.map((order) => (
                    <article
                      className="customer-tracking-card"
                      key={order._id}
                    >
                      <div className="customer-order-top">
                        <div>
                          <small>ORDER</small>

                          <strong>
                            #
                            {order._id
                              .slice(-8)
                              .toUpperCase()}
                          </strong>

                          <p>
                            {formatDate(order.createdAt)}
                          </p>
                        </div>

                        {renderOrderStatus(order.status)}
                      </div>

                      {renderTracking(order)}

                      <div className="customer-tracking-total">
                        <span>Order Total</span>

                        <strong>
                          {formatPrice(order.totalAmount)}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default CustomerAccount;