import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./AdminProducts.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const EMPTY_PRODUCT = {
  name: "",
  description: "",
  price: "",
  category: "Hand Tools",
  brand: "",
  stock: "",
  image: "",
};

const CATEGORIES = [
  "Power Tools",
  "Paints",
  "Electrical",
  "Plumbing",
  "Hand Tools",
  "Building Materials",
  "Pipes & Fittings",
  "Other",
];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });

  // ==========================================
  // FETCH PRODUCTS
  // ==========================================

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/products`
      );

      const data = response.data;

      let productList = [];

      if (Array.isArray(data)) {
        productList = data;
      } else if (Array.isArray(data.products)) {
        productList = data.products;
      } else if (Array.isArray(data.data)) {
        productList = data.data;
      }

      setProducts(productList);
    } catch (err) {
      console.error("Fetch products error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load products. Check your backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  const loadProducts = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/products`
      );

      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.products)
        ? data.products
        : Array.isArray(data.data)
        ? data.data
        : [];

      setProducts(list);
      setError("");
    } catch (err) {
      console.error("Fetch products error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load products. Check your backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  loadProducts();
}, []);

  // ==========================================
  // FORM INPUT HANDLING
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // OPEN ADD PRODUCT FORM
  // ==========================================

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PRODUCT });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ==========================================
  // OPEN EDIT PRODUCT FORM
  // ==========================================

  const openEditForm = (product) => {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      category: product.category || "Hand Tools",
      brand: product.brand || "",
      stock: String(product.stock ?? ""),
      image: product.image || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ==========================================
  // CLOSE FORM
  // ==========================================

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_PRODUCT });
  };

  // ==========================================
  // ADD OR UPDATE PRODUCT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError(
        "Please log in using your administrator account."
      );
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim()) {
      setError("Please enter the product name.");
      return;
    }

    if (
      form.price === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("Please enter a valid product price.");
      return;
    }

    if (
      form.stock === "" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setError(
        "Please enter a valid, non-negative whole-number stock quantity."
      );
      return;
    }

    const productData = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      category: form.category,
      brand: form.brand.trim(),
      stock,
      image: form.image.trim(),
    };

    setSaving(true);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (editingId) {
        await axios.put(
          `${API_URL}/products/${editingId}`,
          productData,
          config
        );

        setSuccess("Product updated successfully.");
      } else {
        await axios.post(
          `${API_URL}/products`,
          productData,
          config
        );

        setSuccess("Product added successfully.");
      }

      closeForm();

      await fetchProducts();
    } catch (err) {
      console.error("Save product error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to save product. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE PRODUCT
  // ==========================================

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError(
        "Please log in using your administrator account."
      );
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(product._id);

    try {
      await axios.delete(
        `${API_URL}/products/${product._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("Product deleted successfully.");

      await fetchProducts();
    } catch (err) {
      console.error("Delete product error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to delete product."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // SEARCH PRODUCTS
  // ==========================================

  const filteredProducts = products.filter((product) => {
    const searchableText = [
      product.name,
      product.brand,
      product.category,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(
      search.trim().toLowerCase()
    );
  });

  // ==========================================
  // INVENTORY CALCULATIONS
  // ==========================================

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

  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="admin-products-page">
      {/* HEADER */}

      <header className="ap-header">
        <div>
          <Link to="/admin" className="ap-back">
            ← Back to Dashboard
          </Link>

          <h1>Product Management</h1>

          <p>
            Manage products and inventory for
            Nanjundeshwara Traders.
          </p>
        </div>

        <button
          type="button"
          className="ap-primary-btn"
          onClick={openAddForm}
        >
          + Add Product
        </button>
      </header>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="ap-message ap-error" role="alert">
          {error}
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div
          className="ap-message ap-success"
          role="status"
        >
          {success}
        </div>
      )}

      {/* INVENTORY SUMMARY */}

      <section className="ap-stats">
        <div className="ap-stat-card">
          <span>Total Products</span>
          <strong>{products.length}</strong>
        </div>

        <div className="ap-stat-card">
          <span>Total Stock Units</span>
          <strong>
            {totalStock.toLocaleString("en-IN")}
          </strong>
        </div>

        <div className="ap-stat-card">
          <span>Inventory Value</span>
          <strong>{formatPrice(inventoryValue)}</strong>
        </div>
      </section>

      {/* SEARCH AND REFRESH */}

      <section className="ap-toolbar">
        <input
          type="search"
          placeholder="Search products, brands or categories..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          aria-label="Search products"
        />

        <button
          type="button"
          className="ap-secondary-btn"
          onClick={fetchProducts}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </section>

      {/* ADD OR EDIT FORM */}

      {showForm && (
        <section className="ap-form-card">
          <div className="ap-form-heading">
            <div>
              <h2>
                {editingId
                  ? "Edit Product"
                  : "Add New Product"}
              </h2>

              <p>
                Enter the product details below.
              </p>
            </div>

            <button
              type="button"
              className="ap-close-btn"
              onClick={closeForm}
              disabled={saving}
              aria-label="Close form"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="ap-form-grid">
              <div className="ap-field">
                <label htmlFor="product-name">
                  Product Name *
                </label>

                <input
                  id="product-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Drill Machine"
                  required
                />
              </div>

              <div className="ap-field">
                <label htmlFor="product-brand">
                  Brand
                </label>

                <input
                  id="product-brand"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="Example: Bosch"
                />
              </div>

              <div className="ap-field">
                <label htmlFor="product-category">
                  Category *
                </label>

                <select
                  id="product-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  {CATEGORIES.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ap-field">
                <label htmlFor="product-price">
                  Price (₹) *
                </label>

                <input
                  id="product-price"
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="1500"
                  required
                />
              </div>

              <div className="ap-field">
                <label htmlFor="product-stock">
                  Stock Quantity *
                </label>

                <input
                  id="product-stock"
                  type="number"
                  name="stock"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="10"
                  required
                />
              </div>

              <div className="ap-field">
                <label htmlFor="product-image">
                  Product Image URL
                </label>

                <input
                  id="product-image"
                  type="url"
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="https://example.com/product.jpg"
                />
              </div>

              <div className="ap-field ap-full-width">
                <label htmlFor="product-description">
                  Description
                </label>

                <textarea
                  id="product-description"
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the product..."
                />
              </div>
            </div>

            <div className="ap-form-actions">
              <button
                type="button"
                className="ap-secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="ap-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Product"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* PRODUCTS TABLE */}

      <section className="ap-table-card">
        <div className="ap-table-heading">
          <div>
            <h2>All Products</h2>

            <p>
              {filteredProducts.length} product(s) found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="ap-empty">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="ap-empty">
            <span>📦</span>

            <h3>No products found</h3>

            <p>
              Add a product or try a different search.
            </p>
          </div>
        ) : (
          <div className="ap-table-wrapper">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const stock = Number(
                    product.stock || 0
                  );

                  return (
                    <tr key={product._id}>
                      <td>
                        <div className="ap-product-cell">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                            />
                          ) : (
                            <div className="ap-product-placeholder">
                              🔧
                            </div>
                          )}

                          <strong>{product.name}</strong>
                        </div>
                      </td>

                      <td>{product.brand || "—"}</td>

                      <td>{product.category || "—"}</td>

                      <td className="ap-price">
                        {formatPrice(product.price)}
                      </td>

                      <td>{stock}</td>

                      <td>
                        <span
                          className={`ap-stock-badge ${
                            stock <= 5
                              ? "ap-low-stock"
                              : "ap-in-stock"
                          }`}
                        >
                          {stock <= 5
                            ? "Low Stock"
                            : "In Stock"}
                        </span>
                      </td>

                      <td>
                        <div className="ap-actions">
                          <button
                            type="button"
                            className="ap-edit-btn"
                            onClick={() =>
                              openEditForm(product)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="ap-delete-btn"
                            onClick={() =>
                              handleDelete(product)
                            }
                            disabled={
                              deletingId === product._id
                            }
                          >
                            {deletingId === product._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}