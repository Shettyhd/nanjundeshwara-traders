import { useEffect, useState } from "react";
import axios from "axios";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  FaWhatsapp,
  FaSearch,
  FaTruck,
  FaShieldAlt,
  FaHeadset,
  FaMapMarkerAlt,
  FaUser,
  FaSignOutAlt,
  FaBoxOpen,
} from "react-icons/fa";

import { CartProvider } from "./context/CartProvider.jsx";
import { useCart } from "./context/useCart.js";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import CustomerAccount from "./pages/CustomerAccount.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminProducts from "./pages/AdminProducts.jsx";
import AdminOrders from "./pages/AdminOrders.jsx";

import "./App.css";

// =====================================================
// CONFIGURATION
// =====================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const WHATSAPP_NUMBER = "916360040473";

const categories = [
  "Cement & Building Materials",
  "Power Tools",
  "Hand Tools",
  "Electrical Supplies",
  "Plumbing",
  "Paints",
];

const categoryImages = {
  "Cement & Building Materials":
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=500&q=80",

  "Power Tools":
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=500&q=80",

  "Hand Tools":
    "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=500&q=80",

  "Electrical Supplies":
    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=500&q=80",

  Plumbing:
    "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=500&q=80",

  Paints:
    "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=500&q=80",
};

// =====================================================
// COMMON HELPERS
// =====================================================

function formatPrice(price) {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function sendWhatsAppMessage(message) {
  const phone = WHATSAPP_NUMBER.replace(/\D/g, "");

  if (!phone) {
    window.alert("Please configure WHATSAPP_NUMBER in App.jsx.");
    return;
  }

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

async function getProducts() {
  const response = await axios.get(`${API_URL}/products`, {
    timeout: 10000,
  });

  const data = response.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

// =====================================================
// ACCOUNT MENU
// =====================================================

function AccountMenu() {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Switch the cart provider to the guest cart.
    window.dispatchEvent(
      new Event("nanjundeshwara-auth-changed")
    );

    setOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="account-menu" style={{ position: "relative" }}>
      <button
        type="button"
        className="header-login"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
      >
        <FaUser /> Account
      </button>

      {open && (
        <div
          className="account-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "280px",
            maxWidth: "90vw",
            padding: "20px",
            background: "#fff",
            color: "#222",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            zIndex: 1000,
          }}
        >
          <h3 style={{ marginTop: 0 }}>My Account</h3>

          <p>
            <strong>Name:</strong>{" "}
            {user?.name || user?.fullName || "Not available"}
          </p>

          <p style={{ overflowWrap: "anywhere" }}>
            <strong>Email:</strong>{" "}
            {user?.email || "Not available"}
          </p>

          <p>
            <strong>Phone:</strong>{" "}
            {user?.phone || user?.mobile || "Not available"}
          </p>

          <p>
            <strong>Role:</strong>{" "}
            {user?.role || "Customer"}
          </p>

          {/* NEW: CUSTOMER ACCOUNT AND ORDERS LINK */}
          {user?.role !== "admin" && (
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                marginTop: "12px",
                marginBottom: "10px",
                color: "#004d40",
                textDecoration: "none",
                border: "1px solid #e0e7e2",
                borderRadius: "6px",
                fontWeight: "600",
              }}
            >
              <FaBoxOpen />
              My Orders & Track Order
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "11px",
              border: "none",
              borderRadius: "6px",
              background: "#b42318",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================
// STORE HOMEPAGE
// =====================================================

function StoreHome() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { cartCount, addToCart } = useCart();

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Product loading error:", err);
      setError("Unable to load products. Check your backend server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialProducts() {
      try {
        const data = await getProducts();

        if (!cancelled) {
          setProducts(data);
          setError("");
        }
      } catch (err) {
        console.error("Product loading error:", err);

        if (!cancelled) {
          setError(
            "Unable to load products. Check your backend server."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const availableCategories = [
    "All",
    ...new Set(
      products.map((product) => product.category).filter(Boolean)
    ),
  ];

  const filteredProducts = products.filter((product) => {
    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      searchableText.includes(search.trim().toLowerCase()) &&
      (category === "All" || product.category === category)
    );
  });

  function handleAddToCart(product) {
    if (addToCart(product, 1)) {
      window.alert(`${product.name} added to cart.`);
    } else {
      window.alert("Unable to add product. Please check stock.");
    }
  }

  function enquire(product) {
    sendWhatsAppMessage(
      `Hello NANJUNDESHWARA TRADERS!\n\n` +
        `Product: ${product.name}\n` +
        `Brand: ${product.brand || "Not specified"}\n` +
        `Price: ${formatPrice(product.price)}\n\n` +
        "Please provide more details."
    );
  }

  function selectCategory(item) {
    const matchingProduct = products.find((product) => {
      const searchableText = [
        product.name,
        product.category,
        product.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(item.toLowerCase());
    });

    if (matchingProduct?.category) {
      setCategory(matchingProduct.category);
      setSearch("");
    } else {
      setCategory("All");
      setSearch(item.split(" ")[0]);
    }

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <div className="store">
      <div className="top-strip">
        <span><FaMapMarkerAlt /> Hunsur, Karnataka</span>
        <span><FaTruck /> Reliable Delivery</span>
        <span><FaShieldAlt /> Quality Products</span>
        <span><FaHeadset /> Customer Support</span>
      </div>

      <header className="navbar reference-navbar">
        <Link to="/home" className="brand reference-brand">
          <span className="brand-icon">N</span>

          <span className="brand-text">
            <strong>NANJUNDESHWARA</strong>
            <small>TRADERS</small>
            <span className="brand-tagline">
              Your Trusted Hardware Partner
            </span>
          </span>
        </Link>

        <nav className="reference-nav-links">
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#categories">Categories</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

        <AccountMenu />

        <Link to="/cart" className="header-cart">
          🛒 Cart ({cartCount})
        </Link>
      </header>

      <main>
        <section className="hero hero-premium" id="home">
          <div className="hero-content">
            <span className="hero-eyebrow">
              QUALITY PRODUCTS FOR A STRONGER TOMORROW
            </span>

            <h1>
              BUILD YOUR DREAM
              <br />
              <span>WE SUPPLY THE STRENGTH</span>
            </h1>

            <p>
              Cement, building materials, tools, paints,
              electrical supplies, plumbing and more for every
              project.
            </p>

            <div className="hero-actions">
              <a href="#products" className="hero-shop-button">
                Shop Products
              </a>

              <button
                type="button"
                className="hero-whatsapp-button"
                onClick={() =>
                  sendWhatsAppMessage(
                    "Hello NANJUNDESHWARA TRADERS! I want to enquire about your products."
                  )
                }
              >
                <FaWhatsapp /> Enquire on WhatsApp
              </button>
            </div>
          </div>

          <div className="hero-photo">
            <div className="hero-photo-caption">
              QUALITY BUILDS
              <br />
              BETTER HOMES
            </div>
          </div>
        </section>

        <section className="benefits">
          <div>
            <strong>Quality Assured</strong>
            <small>Products you can trust</small>
          </div>
          <div>
            <strong>Wide Selection</strong>
            <small>For every project</small>
          </div>
          <div>
            <strong>Customer First</strong>
            <small>Service that matters</small>
          </div>
          <div>
            <strong>Fair Pricing</strong>
            <small>Value at every step</small>
          </div>
        </section>

        <section className="category-section" id="categories">
          <div className="section-heading">
            <h2>
              Shop by <span>Category</span>
            </h2>
            <p>Explore hardware and building supplies.</p>
          </div>

          <div className="category-grid">
            {categories.map((item) => (
              <button
                type="button"
                className="category-card"
                key={item}
                onClick={() => selectCategory(item)}
              >
                <span className="category-image">
                  <img src={categoryImages[item]} alt={item} loading="lazy" />
                </span>
                <strong>{item}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="products-section" id="products">
          <div className="products-heading">
            <div>
              <span className="eyebrow">OUR STORE COLLECTION</span>
              <h2>Popular Products</h2>
              <p>Find the right supplies for your project.</p>
            </div>

            <div className="search-box">
              <FaSearch />
              <input
                type="search"
                placeholder="Search products..."
                aria-label="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="filter-row">
            {availableCategories.map((item) => (
              <button
                type="button"
                key={item}
                className={category === item ? "filter active" : "filter"}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loading && (
            <p className="status-message">Loading products...</p>
          )}

          {!loading && error && (
            <div className="empty-products">
              <h3>Unable to load products</h3>
              <p>{error}</p>
              <button
                type="button"
                className="primary-button"
                onClick={loadProducts}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="empty-products">
              <h3>No products found</h3>
              <p>Try another search or category.</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product._id}>
                  <Link
                    to={`/product/${product._id}`}
                    className="product-image"
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <span>🔧</span>
                    )}
                    <span className="product-category">
                      {product.category || "Hardware"}
                    </span>
                  </Link>

                  <div className="product-info">
                    <small>
                      {product.brand || "Nanjundeshwara Traders"}
                    </small>

                    <h3>
                      <Link
                        to={`/product/${product._id}`}
                        className="product-name-link"
                      >
                        {product.name}
                      </Link>
                    </h3>

                    <p>
                      {product.description || "Quality hardware supplies."}
                    </p>

                    <div className="product-bottom">
                      <strong>{formatPrice(product.price)}</strong>

                      <button type="button" onClick={() => enquire(product)}>
                        Enquire
                      </button>

                      <button
                        type="button"
                        className="add-to-cart-button"
                        disabled={
                          Number(product.stock) <= 0 ||
                          product.isAvailable === false
                        }
                        onClick={() => handleAddToCart(product)}
                      >
                        Add to Cart
                      </button>
                    </div>

                    <small className="stock-label">
                      {Number(product.stock) > 0
                        ? `In stock (${product.stock})`
                        : "Out of stock"}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="about-section" id="about">
          <div className="about-container">
            <div className="about-image">
              <img
                src={categoryImages["Cement & Building Materials"]}
                alt="Construction materials"
                loading="lazy"
              />
            </div>

            <div className="about-content">
              <span className="eyebrow">ABOUT OUR STORE</span>
              <h2>
                Building Strong Foundations, <span>Together.</span>
              </h2>
              <p>
                Welcome to NANJUNDESHWARA TRADERS, your hardware and
                building materials store in Hunsur, Karnataka.
              </p>
              <p>
                We help homeowners, builders, contractors, and
                professionals find supplies for construction,
                renovation, and repair.
              </p>
              <a href="#contact" className="about-contact-button">
                Contact Us
              </a>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-container">
            <div className="contact-heading">
              <span className="eyebrow">WE ARE HERE TO HELP</span>
              <h2>Let's Talk About Your Project.</h2>
              <p>
                Contact us about building materials, tools, and hardware.
              </p>
            </div>

            <div className="contact-grid">
              <article className="contact-card">
                <FaMapMarkerAlt />
                <h3>Visit Our Store</h3>
                <p>Hunsur, Karnataka, India</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Hardware+stores+Hunsur+Karnataka"
                  target="_blank"
                  rel="noreferrer"
                >
                  Find on Maps
                </a>
              </article>

              <article className="contact-card">
                <FaWhatsapp />
                <h3>Call or WhatsApp</h3>
                <p>Ask about prices and availability.</p>
                <button
                  type="button"
                  onClick={() =>
                    sendWhatsAppMessage(
                      "Hello NANJUNDESHWARA TRADERS! I have a product enquiry."
                    )
                  }
                >
                  Chat on WhatsApp
                </button>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="store-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-brand-heading">
              <span className="footer-logo-icon">N</span>
              <div>
                <h2>NANJUNDESHWARA</h2>
                <span className="footer-brand-subtitle">TRADERS</span>
              </div>
            </div>

            <p>
              Your trusted hardware partner in Hunsur, Karnataka.
              Quality products and reliable supplies for every project.
            </p>

            <button
              type="button"
              className="footer-whatsapp"
              onClick={() =>
                sendWhatsAppMessage(
                  "Hello NANJUNDESHWARA TRADERS! I would like to enquire about your products."
                )
              }
            >
              <FaWhatsapp /> Enquire on WhatsApp
            </button>
          </div>

          <div className="footer-column">
            <h3>Quick Links</h3>
            <a href="#home">Home</a>
            <a href="#products">Our Products</a>
            <a href="#categories">Categories</a>
            <a href="#about">About Us</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-column">
            <h3>Product Categories</h3>
            <a href="#categories">Building Materials</a>
            <a href="#categories">Power Tools</a>
            <a href="#categories">Electrical Supplies</a>
            <a href="#categories">Plumbing Supplies</a>
            <a href="#categories">Paints & Hand Tools</a>
          </div>

          <div className="footer-column footer-location">
            <h3>Visit Our Store</h3>
            <p>
              <FaMapMarkerAlt />
              <span>Hunsur, Karnataka, India</span>
            </p>
            <p>
              <FaHeadset />
              <span>
                Need help choosing products? Contact us for assistance.
              </span>
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Hardware+stores+Hunsur+Karnataka"
              target="_blank"
              rel="noreferrer"
            >
              Find Us on Maps →
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} NANJUNDESHWARA TRADERS.
            All rights reserved.
          </p>
          <a href="#home">Back to Top ↑</a>
        </div>
      </footer>
    </div>
  );
}

// =====================================================
// PRODUCT DETAILS
// =====================================================

function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(`${API_URL}/products/${id}`);
        const data = response.data;

        if (!cancelled) {
          setProduct(data.product || data.data || data);
        }
      } catch (err) {
        console.error("Product details error:", err);

        if (!cancelled) {
          setError("Unable to load product.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <main className="page-container">Loading product...</main>;
  }

  if (error || !product) {
    return (
      <main className="page-container">
        <Link to="/home">← Back to Store</Link>
        <p>{error || "Product not found."}</p>
      </main>
    );
  }

  return (
    <main className="page-container product-details-page">
      <Link to="/home">← Back to Store</Link>

      <div className="product-details-card">
        <div className="product-details-image">
          {product.image && (
            <img src={product.image} alt={product.name} />
          )}
        </div>

        <div className="product-details-content">
          <span>{product.category}</span>
          <h1>{product.name}</h1>
          <p>{product.brand}</p>
          <h2>{formatPrice(product.price)}</h2>
          <p>{product.description}</p>
          <p>Stock: {product.stock}</p>

          <button
            type="button"
            className="primary-button"
            disabled={
              Number(product.stock) <= 0 ||
              product.isAvailable === false
            }
            onClick={() => {
              if (addToCart(product, 1)) {
                window.alert("Product added to cart.");
              } else {
                window.alert("Unable to add product.");
              }
            }}
          >
            Add to Cart
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              sendWhatsAppMessage(
                `Hello NANJUNDESHWARA TRADERS!\n` +
                  `Product: ${product.name}\n` +
                  `Price: ${formatPrice(product.price)}`
              )
            }
          >
            <FaWhatsapp /> Enquire
          </button>
        </div>
      </div>
    </main>
  );
}

// =====================================================
// SHOPPING CART
// =====================================================

function Cart() {
  const {
    cartItems,
    cartCount,
    cartTotal,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  return (
    <main className="page-container cart-page">
      <Link to="/home">← Continue Shopping</Link>
      <h1>Your Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="empty-products">
          <h2>Your cart is empty</h2>
          <Link to="/home" className="primary-button">
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          <p>{cartCount} item(s)</p>

          <div className="cart-items">
            {cartItems.map((item) => (
              <article className="cart-item" key={item._id}>
                {item.image && (
                  <img src={item.image} alt={item.name} />
                )}

                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p>{formatPrice(item.price)} each</p>
                  <strong>
                    {formatPrice(
                      Number(item.price) * Number(item.quantity)
                    )}
                  </strong>
                </div>

                <div className="cart-quantity">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item._id, Number(item.quantity) - 1)
                    }
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    type="button"
                    disabled={
                      Number(item.quantity) >= Number(item.stock)
                    }
                    onClick={() =>
                      updateQuantity(item._id, Number(item.quantity) + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className="remove-button"
                  onClick={() => removeFromCart(item._id)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <p>Items: {cartCount}</p>
            <h3>Total: {formatPrice(cartTotal)}</h3>

            <Link to="/checkout" className="primary-button">
              Proceed to Checkout
            </Link>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (window.confirm("Clear your cart?")) {
                  clearCart();
                }
              }}
            >
              Clear Cart
            </button>
          </div>
        </>
      )}
    </main>
  );
}

// =====================================================
// CHECKOUT AND ORDER CREATION
// =====================================================

function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.address.trim()
    ) {
      setError(
        "Enter your name, phone number, and delivery address."
      );
      return;
    }

    const digits = form.phone.replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 15) {
      setError("Enter a valid phone number.");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const orderData = {
        customerName: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        items: cartItems.map((item) => ({
          productId: item._id,
          quantity: Number(item.quantity),
        })),
      };

      const response = await axios.post(
        `${API_URL}/orders`,
        orderData,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      const order =
        response.data?.order ||
        response.data?.data?.order;

      if (response.data?.success === false || !order?._id) {
        throw new Error(
          response.data?.message ||
            "The server did not confirm that the order was saved."
        );
      }

      const itemLines = (order.items || [])
        .map((item) => {
          const itemTotal =
            Number(item.price) * Number(item.quantity);

          return (
            `${item.name} x ${item.quantity} = ` +
            `${formatPrice(itemTotal)}`
          );
        })
        .join("\n");

      const message =
        `NEW ORDER - NANJUNDESHWARA TRADERS\n\n` +
        `Order ID: ${order._id}\n` +
        `Customer: ${form.name.trim()}\n` +
        `Phone: ${form.phone.trim()}\n` +
        `Address: ${form.address.trim()}\n\n` +
        `Products:\n${itemLines}\n\n` +
        `Total: ${formatPrice(Number(order.totalAmount))}\n` +
        `Notes: ${form.notes.trim() || "None"}\n\n` +
        "Please confirm this order.";

      clearCart();
      sendWhatsAppMessage(message);
    } catch (err) {
      console.error("Checkout error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to place order. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (cartItems.length === 0) {
    return (
      <main className="page-container">
        <h1>Your cart is empty</h1>
        <Link className="primary-button" to="/home">
          Browse Products
        </Link>
      </main>
    );
  }

  return (
    <main className="page-container checkout-page">
      <Link to="/cart">← Back to Cart</Link>
      <h1>Checkout</h1>

      <p>
        Enter your details to save your order and continue to WhatsApp.
      </p>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <form className="checkout-form" onSubmit={handleSubmit}>
        <label htmlFor="checkout-name">Full Name</label>
        <input
          id="checkout-name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
          required
          disabled={loading}
        />

        <label htmlFor="checkout-phone">Phone Number</label>
        <input
          id="checkout-phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          autoComplete="tel"
          required
          disabled={loading}
        />

        <label htmlFor="checkout-address">Delivery Address</label>
        <textarea
          id="checkout-address"
          name="address"
          value={form.address}
          onChange={handleChange}
          autoComplete="street-address"
          rows={4}
          required
          disabled={loading}
        />

        <label htmlFor="checkout-notes">Order Notes (Optional)</label>
        <textarea
          id="checkout-notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          disabled={loading}
        />

        <div className="checkout-order-summary">
          <h3>Order Summary</h3>

          {cartItems.map((item) => (
            <p key={item._id}>
              {item.name} × {item.quantity}:{" "}
              {formatPrice(
                Number(item.price) * Number(item.quantity)
              )}
            </p>
          ))}

          <h3>Estimated Total: {formatPrice(cartTotal)}</h3>

          <small>
            The server calculates the final order total using current
            product prices.
          </small>
        </div>

        <button
          type="submit"
          className="primary-button"
          disabled={loading}
        >
          {loading
            ? "Saving Order..."
            : "Place Order & Continue to WhatsApp"}
        </button>
      </form>
    </main>
  );
}

// =====================================================
// ROUTE PROTECTION
// =====================================================

function ProtectedRoute({ children, adminOnly = false }) {
  const location = useLocation();

  const token = localStorage.getItem("token");
  const user = getUser();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return children;
}

// =====================================================
// APPLICATION ROUTES
// =====================================================

function AppRoutes() {
  const token = localStorage.getItem("token");
  const user = getUser();

  const homePath = user?.role === "admin" ? "/admin" : "/home";

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={token ? homePath : "/login"} replace />
        }
      />

      <Route
        path="/login"
        element={
          token ? <Navigate to={homePath} replace /> : <Login />
        }
      />

      <Route
        path="/register"
        element={
          token ? <Navigate to={homePath} replace /> : <Register />
        }
      />
      {/* Password recovery routes — accessible without login */}

<Route
  path="/forgot-password"
  element={<ForgotPassword />}
/>

<Route
  path="/reset-password/:token"
  element={<ResetPassword />}
/>

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <StoreHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/product/:id"
        element={
          <ProtectedRoute>
            <ProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cart"
        element={
          <ProtectedRoute>
            <Cart />
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />

      {/* NEW: CUSTOMER ACCOUNT, ORDERS AND TRACKING */}
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <CustomerAccount />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products"
        element={
          <ProtectedRoute adminOnly>
            <AdminProducts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute adminOnly>
            <AdminOrders />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// =====================================================
// ROOT APPLICATION
// =====================================================

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </BrowserRouter>
  );
}