import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Auth.css";
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${API_URL}/auth/reset-password/${encodeURIComponent(token)}`,
        {
          password,
        },
        {
          timeout: 15000,
        }
      );

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Your password has been reset successfully. Please log in.",
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset your password. The link may have expired."
      );
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

          <h1>Reset Password</h1>

          <p>Choose a new password for your account.</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="new-password">
            New Password
          </label>

          <div className="password-input-wrapper">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your new password"
              autoComplete="new-password"
              minLength={8}
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
              disabled={loading}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <label htmlFor="confirm-password">
            Confirm New Password
          </label>

          <div className="password-input-wrapper">
            <input
              id="confirm-password"
              type={
                showConfirmPassword ? "text" : "password"
              }
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm your new password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
            />

            <button
              type="button"
              className="password-toggle-button"
              onClick={() =>
                setShowConfirmPassword(
                  (previous) => !previous
                )
              }
              aria-label={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
              disabled={loading}
            >
              {showConfirmPassword ? (
                <FaEyeSlash />
              ) : (
                <FaEye />
              )}
            </button>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password →"}
          </button>
        </form>

        <p className="auth-switch">
          Remembered your password?{" "}
          <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}