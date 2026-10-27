import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";
import "./Auth.css";

const API_URL = "http://localhost:5000/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/forgot-password`,
        {
          email: email.trim().toLowerCase(),
        },
        {
          timeout: 15000,
        }
      );

      setMessage(
        response.data?.message ||
          "If an account exists for that email, password reset instructions will be sent."
      );
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.message ||
            "Unable to process your request. Please try again."
        );
      } else {
        setError(
          "Unable to connect to the server. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-brand">
          <span className="auth-logo">N</span>

          <span>
            <strong>NANJUNDESHWARA</strong>
            <small>TRADERS</small>
          </span>
        </Link>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            ACCOUNT RECOVERY
          </span>

          <h1>Forgot Password?</h1>

          <p>
            Enter your registered email address to request
            a password reset.
          </p>
        </div>

        {message && (
          <div className="auth-success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="reset-email">
            Email address
          </label>

          <div className="forgot-email-wrapper">
            <FaEnvelope aria-hidden="true" />

            <input
              id="reset-email"
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : "Request Password Reset →"}
          </button>
        </form>

        <Link to="/login" className="back-store">
          <FaArrowLeft /> Back to login
        </Link>
      </div>
    </div>
  );
}