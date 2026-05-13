import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/auth.css";

/**
 * FinishSignIn
 *
 * Firebase redirects here after the user clicks the magic link in their email.
 * URL contains a one-time sign-in token as a query parameter.
 *
 * Flow:
 *  1. Check localStorage for the email used to request the link
 *  2. If found, complete sign-in automatically
 *  3. If not found (different device), prompt for email
 */
export default function FinishSignIn() {
  const navigate  = useNavigate();
  const { handlePasswordlessComplete } = useAuth();

  const [email,    setEmail]    = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [needsEmail, setNeedsEmail] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("summify_signin_email");
    if (stored) {
      completeSignIn(stored);
    } else {
      // Different device — ask for email
      setLoading(false);
      setNeedsEmail(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeSignIn(emailToUse) {
    setLoading(true);
    setError("");
    const result = await handlePasswordlessComplete(emailToUse);
    if (!result.success) {
      setLoading(false);
      setError(result.error);
    }
    // On success, handlePasswordlessComplete navigates to /app/home
  }

  async function handleSubmit(e) {
    e.preventDefault();
    completeSignIn(email);
  }

  return (
    <div className="auth-screen">
      <div className="auth-logo-wrap">
        <div className="auth-logo-box">
          <span className="auth-logo-letter">S</span>
        </div>
      </div>

      {loading && !needsEmail && (
        <div className="verify-card">
          <div className="verify-icon">
            <span className="btn-spinner" style={{ width: 32, height: 32 }} />
          </div>
          <p className="verify-subtitle">Signing you in…</p>
        </div>
      )}

      {error && (
        <div className="verify-card">
          <p className="verify-error-msg">{error}</p>
          <button
            type="button"
            className="btn-auth-primary"
            onClick={() => navigate("/sign-in")}
            style={{ marginTop: 8 }}
          >
            Back to Sign In
          </button>
        </div>
      )}

      {needsEmail && !error && (
        <div className="verify-card">
          <h1 className="auth-title">Confirm your email</h1>
          <p className="verify-subtitle">
            You opened this link on a different device. Enter the email you used to request the sign-in link.
          </p>
          <form onSubmit={handleSubmit} noValidate className="auth-form" style={{ width: "100%" }}>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="otp-code-input"
              style={{ fontSize: "1rem", letterSpacing: "normal", textAlign: "left", padding: "14px 16px" }}
              autoFocus
            />
            <button
              type="submit"
              className="btn-auth-primary"
              disabled={loading || !email}
            >
              {loading ? <span className="btn-spinner" /> : "Sign In"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}