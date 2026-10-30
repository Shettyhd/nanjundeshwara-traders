import { useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Auth.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const token = localStorage.getItem("token");
  const user = getSavedUser();

  // Redirect users who are already logged in.
  if (token) {
    return (
      <Navigate
        to={user?.role === "admin" ? "/admin" : "/home"}
        replace
      />
    );
  }

  // Handle input changes.
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Handle login submission.
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email: form.email.trim().toLowerCase(),
          password: form.password,
        },
        {
          timeout: 15000,
        }
      );

      // Support direct or nested API responses.
      const result = response.data?.data || response.data;

      const tokenFromServer = result?.token;
      const userFromServer = result?.user;

      if (!tokenFromServer) {
        throw new Error(
          "The server did not return an authentication token. Check your backend login response."
        );
      }

      if (!userFromServer) {
        throw new Error(
          "The server did not return user details. Check your backend login response."
        );
      }

      // Remove sensitive information before saving user details.
      const safeUser = { ...userFromServer };

      delete safeUser.password;
      delete safeUser.passwordHash;
      delete safeUser.passwordResetToken;

      // Save the authentication session.
      localStorage.setItem("token", tokenFromServer);
      localStorage.setItem("user", JSON.stringify(safeUser));

      // Notify other components about the authentication change.
      window.dispatchEvent(
        new Event("nanjundeshwara-auth-changed")
      );

      // Redirect administrators.
      if (safeUser.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      // Return customers to their originally requested page.
      const requestedPath = location.state?.from?.pathname;

      const blockedPaths = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/admin",
        "/admin/products",
        "/admin/orders",
      ];

      if (
        requestedPath &&
        requestedPath.startsWith("/") &&
        !blockedPaths.includes(requestedPath)
      ) {
        navigate(requestedPath, { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.message ||
            "Login failed. Please check your email and password."
        );
      } else if (err.code === "ECONNABORTED") {
        setError(
          "The server took too long to respond. Please try again."
        );
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Unable to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* STORE BRAND */}

        <Link to="/login" className="auth-brand">
          <span className="auth-logo">N</span>

          <span>
            <strong>NANJUNDESHWARA</strong>
            <small>TRADERS</small>
          </span>
        </Link>

        {/* LOGIN HEADING */}

        <div className="auth-heading">
          <span className="auth-eyebrow">
            WELCOME BACK
          </span>

          <h1>Login to your account</h1>

          <p>
            Access your account to continue shopping.
          </p>
        </div>

        {/* SUCCESS MESSAGE */}

        {location.state?.message && (
          <div className="auth-success" role="status">
            {location.state.message}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}

        <form onSubmit={handleSubmit}>
          {/* EMAIL */}

          <label htmlFor="email">
            Email address
          </label>

          <input
            id="email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
            disabled={loading}
          />

          {/* PASSWORD */}

          <label htmlFor="password">
            Password
          </label>

          <div className="password-input-wrapper">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              disabled={loading}
            />

            <button
              type="button"
              className="password-toggle-button"
              onClick={() =>
                setShowPassword((previous) => !previous)
              }
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              aria-pressed={showPassword}
              disabled={loading}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* FORGOT PASSWORD */}

          <div className="forgot-password-row">
            <Link
              to="/forgot-password"
              className="forgot-password-link"
            >
              Forgot Password?
            </Link>
          </div>

          {/* LOGIN BUTTON */}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login →"}
          </button>
        </form>

        {/* REGISTER LINK */}

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">
            Create an account
          </Link>
        </p>

        {/* BACK TO STORE */}

        <Link to="/home" className="back-store">
          ← Back to store
        </Link>
      </div>
    </div>
  );
}