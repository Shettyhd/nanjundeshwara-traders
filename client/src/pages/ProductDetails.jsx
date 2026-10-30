import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import "./ProductDetails.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(
          `${API_URL}/products/${id}`
        );

        const data = response.data;

        const result =
          data.product ||
          data.data ||
          data;

        if (!cancelled) {
          setProduct(result);
        }
      } catch (err) {
        console.error("Product details error:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load product details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="product-details-message">Loading product...</div>;
  }

  if (error || !product) {
    return (
      <div className="product-details-message">
        <h2>Product not found</h2>
        <p>{error || "This product is unavailable."}</p>
        <Link to="/">← Back to Store</Link>
      </div>
    );
  }

  return (
    <main className="product-details-page">
      <Link to="/" className="product-back-link">
        ← Back to Store
      </Link>

      <div className="product-details-card">
        <div className="product-details-image">
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <span>🔧</span>
          )}
        </div>

        <div className="product-details-content">
          <span className="product-details-category">
            {product.category || "Hardware"}
          </span>

          <h1>{product.name}</h1>

          <p className="product-details-brand">
            Brand: {product.brand || "Nanjundeshwara Traders"}
          </p>

          <h2>
            ₹{Number(product.price || 0).toLocaleString("en-IN")}
          </h2>

          <p className="product-details-description">
            {product.description || "Quality hardware supplies."}
          </p>

          <p>
            Availability:{" "}
            {Number(product.stock) > 0
              ? `In stock (${product.stock} available)`
              : "Out of stock"}
          </p>

          <Link to="/login" className="product-details-button">
            Login to Your Account
          </Link>
        </div>
      </div>
    </main>
  );
}