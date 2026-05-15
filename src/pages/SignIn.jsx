import { useState } from "react";
import { Link } from "react-router-dom";
import InputField from "../components/ui/InputField";
import GoogleLogo from "../components/ui/GoogleLogo";
import { useAuth } from "../hooks/useAuth";
import "../styles/auth.css";

/* ── Icons ──────────────────────────────────────────────────── */
const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
);

const KeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="3"/>
    <path d="M11 15h7V5H8v6"/>
  </svg>
);

const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ── Forgot Password modal ───────────────────────────────────── */
function ForgotPasswordModal({ onClose, handleForgotPassword }) {
  const [email,    setEmail]   = useState("");
  const [sending,  setSending] = useState(false);
  const [sent,     setSent]    = useState(false);
  const [error,    setError]   = useState("");

  async function handleSend() {
    setSending(true);
    setError("");
    const result = await handleForgotPassword(email);
    setSending(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="forgot-backdrop" onClick={onClose}>
      <div className="forgot-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="forgot-handle" />
        <h2 className="forgot-title">Forgot Password?</h2>
        <p className="forgot-subtitle">
          Enter your email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="forgot-success">
            <CheckIcon />
            Reset email sent! Check your inbox (and spam folder).
          </div>
        ) : (
          <InputField
            id="forgot-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            error={error}
            icon={<EmailIcon />}
          />
        )}

        <div className="forgot-btn-row">
          <button type="button" className="forgot-cancel-btn" onClick={onClose}>
            {sent ? "Close" : "Cancel"}
          </button>
          {!sent && (
            <button
              type="button"
              className="forgot-send-btn"
              onClick={handleSend}
              disabled={sending || !email}
            >
              {sending ? <span className="btn-spinner" /> : "Send Link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── SignIn Page ─────────────────────────────────────────────── */
export default function SignIn() {
  const {
    fields, errors, authError, loading,
    handleChange, handleSignIn, handleGoogle, handleForgotPassword,
    handlePasswordlessRequest,
  } = useAuth();

  const [forgotOpen,   setForgotOpen]   = useState(false);
  const [magicSending, setMagicSending] = useState(false);
  const [magicSent,    setMagicSent]    = useState(false);
  const [magicError,   setMagicError]   = useState("");

  async function handleMagicSend() {
    if (!fields.email?.trim()) {
      setMagicError("Enter your email first, then click Sign in with Link.");
      return;
    }
    setMagicSending(true);
    setMagicError("");
    const result = await handlePasswordlessRequest(fields.email);
    setMagicSending(false);
    if (result.success) {
      setMagicSent(true);
    } else {
      setMagicError(result.error);
    }
  }

  return (
    <div className="auth-screen">

      <div className="auth-logo-wrap">
        <img src="/pwa-icon-192.png" alt="Summify" className="auth-logo-img" />
      </div>

      <h1 className="auth-title">Sign In</h1>

      {authError && (
        <div className="auth-error-banner">
          <ErrorIcon />
          {authError}
        </div>
      )}

      {magicError && (
        <div className="auth-error-banner">
          <ErrorIcon />
          {magicError}
        </div>
      )}

      {magicSent ? (
        <div className="verify-card">
          <div className="verify-icon verify-icon--success">
            <CheckIcon />
          </div>
          <p className="verify-subtitle">
            Check your inbox at <strong>{fields.email}</strong> and click the sign-in link.
          </p>
          <button
            type="button"
            className="verify-back-link"
            onClick={() => setMagicSent(false)}
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignIn} noValidate className="auth-form">

          <InputField
            id="email"
            type="email"
            placeholder="Email"
            value={fields.email || ""}
            onChange={handleChange}
            error={errors.email}
            icon={<EmailIcon />}
          />

          <InputField
            id="password"
            type="password"
            placeholder="Password"
            value={fields.password || ""}
            onChange={handleChange}
            error={errors.password}
            icon={<KeyIcon />}
          />

          <div className="auth-forgot">
            <button
              type="button"
              className="terms-link"
              onClick={() => setForgotOpen(true)}
            >
              Forgot Password?
            </button>
            <button
              type="button"
              className="terms-link"
              onClick={handleMagicSend}
              disabled={magicSending}
            >
              {magicSending ? "Sending…" : "Sign in with Link"}
            </button>
          </div>

          <button type="submit" className="btn-auth-primary" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : "Sign In"}
          </button>

          <span className="auth-or">or</span>

          <button type="button" className="btn-google" onClick={handleGoogle} disabled={loading}>
            <GoogleLogo size={24} />
            <span>Continue with Google</span>
          </button>

        </form>
      )}

      <p className="auth-switch">
        Need an Account? <Link to="/sign-up">Sign Up</Link>
      </p>

      {forgotOpen && (
        <ForgotPasswordModal
          onClose={() => setForgotOpen(false)}
          handleForgotPassword={handleForgotPassword}
        />
      )}

    </div>
  );
}