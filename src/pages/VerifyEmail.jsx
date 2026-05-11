import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAuthContext } from "../context/AuthContext";
import "../styles/auth.css";

const POLL_INTERVAL_MS = 3000; // check every 3 seconds

export default function VerifyEmail() {
  const navigate   = useNavigate();
  const { currentUser } = useAuthContext();
  const { handleResendVerification, checkEmailVerified } = useAuth();

  const [resending,   setResending]   = useState(false);
  const [resendMsg,   setResendMsg]   = useState("");
  const [resendError, setResendError] = useState("");
  const [verified,    setVerified]    = useState(false);
  const intervalRef = useRef(null);

  // If user is already verified (e.g. navigated back), redirect immediately
  useEffect(() => {
    if (currentUser?.emailVerified) {
      navigate("/app/home", { replace: true });
    }
  }, [currentUser, navigate]);

  // Poll Firebase to detect when the user clicks the email link
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const isVerified = await checkEmailVerified();
      if (isVerified) {
        clearInterval(intervalRef.current);
        setVerified(true);
        setTimeout(() => navigate("/app/home", { replace: true }), 1500);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResend() {
    setResending(true);
    setResendMsg("");
    setResendError("");
    const result = await handleResendVerification();
    setResending(false);
    if (result.success) {
      setResendMsg("Verification email sent! Check your inbox.");
    } else {
      setResendError(result.error);
    }
  }

  const email = currentUser?.email ?? "your email";

  return (
    <div className="auth-screen">
      <div className="auth-logo-wrap">
        <div className="auth-logo-box">
          <span className="auth-logo-letter">S</span>
        </div>
      </div>

      <div className="verify-card">
        {verified ? (
          <>
            <div className="verify-icon verify-icon--success">
              <CheckIcon />
            </div>
            <h1 className="auth-title">Email Verified!</h1>
            <p className="verify-subtitle">Redirecting you to the app…</p>
          </>
        ) : (
          <>
            <div className="verify-icon">
              <MailIcon />
            </div>
            <h1 className="auth-title">Verify your email</h1>
            <p className="verify-subtitle">
              We sent a verification link to <strong>{email}</strong>.
              Click the link in the email to activate your account.
            </p>
            <p className="verify-hint">
              This page will update automatically once you verify.
            </p>

            {resendMsg && (
              <p className="verify-success-msg">{resendMsg}</p>
            )}
            {resendError && (
              <p className="verify-error-msg">{resendError}</p>
            )}

            <button
              type="button"
              className="btn-auth-primary"
              onClick={handleResend}
              disabled={resending}
              style={{ marginTop: "8px" }}
            >
              {resending ? <span className="btn-spinner" /> : "Resend Email"}
            </button>

            <button
              type="button"
              className="verify-back-link"
              onClick={() => navigate("/sign-in")}
            >
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}