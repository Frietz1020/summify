import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DocumentProvider } from "./context/DocumentContext";
import { ThemeProvider }    from "./context/ThemeContext";
import { AuthProvider, useAuthContext } from "./context/AuthContext";

import SignIn        from "./pages/SignIn";
import SignUp        from "./pages/SignUp";
import HomePage      from "./pages/HomePage";
import OriginalPage  from "./pages/OriginalPage";
import SummarizedPage from "./pages/SummarizedPage";
import GraphPage     from "./pages/GraphPage";
import HistoryPage   from "./pages/HistoryPage";
import ProfilePage   from "./pages/ProfilePage";

/**
 * ProtectedRoute
 * Redirects to /sign-in if no authenticated user.
 * Shows nothing while Firebase resolves the session (authLoading).
 */
function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useAuthContext();
  if (authLoading) return null; // Firebase resolving — render nothing briefly
  if (!currentUser) return <Navigate to="/sign-in" replace />;
  return children;
}

/**
 * PublicRoute
 * Redirects already-authenticated users away from auth pages.
 */
function PublicRoute({ children }) {
  const { currentUser, authLoading } = useAuthContext();
  if (authLoading) return null;
  if (currentUser) return <Navigate to="/app/home" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DocumentProvider>
            <Routes>
              {/* Public — redirect to /app/home if already signed in */}
              <Route path="/sign-in" element={<PublicRoute><SignIn /></PublicRoute>} />
              <Route path="/sign-up" element={<PublicRoute><SignUp /></PublicRoute>} />

              {/* Protected — redirect to /sign-in if not authenticated */}
              <Route path="/app/home"       element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/app/original"   element={<ProtectedRoute><OriginalPage /></ProtectedRoute>} />
              <Route path="/app/summarized" element={<ProtectedRoute><SummarizedPage /></ProtectedRoute>} />
              <Route path="/app/graph"      element={<ProtectedRoute><GraphPage /></ProtectedRoute>} />
              <Route path="/app/history"    element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/app/profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/app/settings"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Default */}
              <Route path="/app" element={<Navigate to="/app/home" replace />} />
              <Route path="*"    element={<Navigate to="/sign-in" replace />} />
            </Routes>
          </DocumentProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}