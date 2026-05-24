import { useEffect, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DocumentProvider, useDocument } from "./context/DocumentContext";
import { ThemeProvider }    from "./context/ThemeContext";
import { AuthProvider, useAuthContext } from "./context/AuthContext";

// ── Eagerly load auth/shell pages (small, always needed) ─────
import SignIn        from "./pages/SignIn";
import SignUp        from "./pages/SignUp";
import VerifyEmail   from "./pages/VerifyEmail";
import FinishSignIn  from "./pages/FinishSignIn";

// ── Lazy-load heavy app pages (code-split per route) ─────────
const HomePage       = lazy(() => import("./pages/HomePage"));
const OriginalPage   = lazy(() => import("./pages/OriginalPage"));
const SummarizedPage = lazy(() => import("./pages/SummarizedPage"));
const GraphPage      = lazy(() => import("./pages/GraphPage"));
const HistoryPage    = lazy(() => import("./pages/HistoryPage"));
const ProfilePage    = lazy(() => import("./pages/ProfilePage"));
const ProfileEditPage= lazy(() => import("./pages/ProfileEditPage"));
const SettingsPage   = lazy(() => import("./pages/SettingsPage"));

/**
 * ProtectedRoute — redirects to /sign-in if not authenticated.
 *
 * emailVerified check is intentionally skipped for Magic Link users:
 * Firebase Email Link sign-in sets emailVerified=false by default even
 * after a successful link click. Blocking on that flag would lock out
 * every passwordless user. Password-based users ARE gated by the
 * sign-up → /verify-email flow before they can reach protected routes.
 */
function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useAuthContext();
  if (authLoading) return <div className="auth-loading" />;
  if (!currentUser) return <Navigate to="/sign-in" replace />;
  return children;
}

/**
 * PublicRoute — redirects authenticated users away from auth pages.
 */
function PublicRoute({ children }) {
  const { currentUser, authLoading } = useAuthContext();
  if (authLoading) return <div className="auth-loading" />;
  if (currentUser) return <Navigate to="/app/home" replace />;
  return children;
}

/**
 * VerifyEmailRoute — only accessible when logged in but email not yet verified.
 * Only password-signup users pass through /verify-email.
 */
function VerifyEmailRoute({ children }) {
  const { currentUser, authLoading } = useAuthContext();
  if (authLoading) return <div className="auth-loading" />;
  if (!currentUser) return <Navigate to="/sign-in" replace />;
  if (currentUser.emailVerified) return <Navigate to="/app/home" replace />;
  return children;
}

/**
 * DocumentReset — clears document state whenever the authenticated user changes.
 * Prevents one user's content from leaking into another account's session.
 */
function DocumentReset() {
  const { currentUser } = useAuthContext();
  const { resetDocument } = useDocument();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    resetDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  return null;
}

/** Minimal spinner shown while a lazy page chunk is loading */
function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/sign-in"      element={<PublicRoute><SignIn /></PublicRoute>} />
        <Route path="/sign-up"      element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/verify-email" element={<VerifyEmailRoute><VerifyEmail /></VerifyEmailRoute>} />
        <Route path="/finish-signin" element={<PublicRoute><FinishSignIn /></PublicRoute>} />

        <Route path="/app/home"        element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/app/original"    element={<ProtectedRoute><OriginalPage /></ProtectedRoute>} />
        <Route path="/app/summarized"  element={<ProtectedRoute><SummarizedPage /></ProtectedRoute>} />
        <Route path="/app/graph"       element={<ProtectedRoute><GraphPage /></ProtectedRoute>} />
        <Route path="/app/history"     element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/app/profile"     element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/app/profile/edit"element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
        <Route path="/app/settings"    element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="/app" element={<Navigate to="/app/home" replace />} />
        <Route path="*"    element={<Navigate to="/sign-in" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <DocumentProvider>
          <AuthProvider>
            <DocumentReset />
            <AppRoutes />
          </AuthProvider>
        </DocumentProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}