import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

export function useAuth() {
  const navigate = useNavigate();
  const [fields,  setFields]  = useState({});
  const [errors,  setErrors]  = useState({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setAuthError("");
  }

  /* ── Sign In ──────────────────────────────────────────── */
  async function handleSignIn(event) {
    event.preventDefault();
    const validation = validateSignIn(fields);
    if (Object.keys(validation).length) { setErrors(validation); return; }

    setLoading(true);
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, fields.email.trim(), fields.password);
      navigate("/app/home");
    } catch (err) {
      setAuthError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  /* ── Sign Up ──────────────────────────────────────────── */
  async function handleSignUp(event) {
    event.preventDefault();
    const validation = validateSignUp(fields);
    if (Object.keys(validation).length) { setErrors(validation); return; }

    setLoading(true);
    setAuthError("");
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        fields.email.trim(),
        fields.password
      );
      await updateProfile(credential.user, { displayName: fields.username.trim() });
      await sendEmailVerification(credential.user);
      navigate("/verify-email");
    } catch (err) {
      setAuthError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  /* ── Resend verification email ───────────────────────── */
  async function handleResendVerification() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "No user session found." };
    try {
      await sendEmailVerification(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: friendlyError(err.code) };
    }
  }

  /* ── Poll for email verified ─────────────────────────── */
  async function checkEmailVerified() {
    const user = auth.currentUser;
    if (!user) return false;
    await reload(user);
    return user.emailVerified;
  }

  /* ── Google OAuth ─────────────────────────────────────── */
  async function handleGoogle() {
    setLoading(true);
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/app/home");
    } catch (err) {
      if (
        err.code !== "auth/popup-closed-by-user" &&
        err.code !== "auth/cancelled-popup-request"
      ) {
        setAuthError(friendlyError(err.code));
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Forgot Password ──────────────────────────────────── */
  async function handleForgotPassword(email) {
    if (!email || !isValidEmail(email)) {
      return { success: false, error: "Enter a valid email address." };
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true, error: "" };
    } catch (err) {
      return { success: false, error: friendlyError(err.code) };
    }
  }

  return {
    fields,
    errors,
    authError,
    loading,
    handleChange,
    handleSignIn,
    handleSignUp,
    handleGoogle,
    handleForgotPassword,
    handleResendVerification,
    checkEmailVerified,
  };
}

/* ── Validators ───────────────────────────────────────────── */
function validateSignIn({ email, password }) {
  const errs = {};
  if (!email)                    errs.email    = "Email is required.";
  else if (!isValidEmail(email)) errs.email    = "Enter a valid email address.";
  if (!password)                 errs.password = "Password is required.";
  return errs;
}

function validateSignUp({ username, email, password }) {
  const errs = {};
  if (!username)                 errs.username = "Username is required.";
  else if (username.length < 3)  errs.username = "At least 3 characters.";
  if (!email)                    errs.email    = "Email is required.";
  else if (!isValidEmail(email)) errs.email    = "Enter a valid email address.";
  if (!password)                 errs.password = "Password is required.";
  else if (password.length < 8)  errs.password = "At least 8 characters.";
  return errs;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":         "No account found with this email.",
    "auth/wrong-password":         "Incorrect password.",
    "auth/invalid-credential":     "Invalid email or password.",
    "auth/email-already-in-use":   "This email is already registered.",
    "auth/weak-password":          "Password must be at least 6 characters.",
    "auth/invalid-email":          "Enter a valid email address.",
    "auth/too-many-requests":      "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-blocked":          "Popup blocked. Allow popups for this site.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}