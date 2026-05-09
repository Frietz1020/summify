import { Component } from "react";

/**
 * ErrorBoundary
 *
 * Wraps the app at the root level. Catches any unhandled render error
 * (e.g. malformed graph data, null reference) and shows a recovery UI
 * instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  handleReset() {
    this.setState({ hasError: false, message: "" });
    window.location.href = "/app/home";
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        height:         "100dvh",
        padding:        "24px",
        textAlign:      "center",
        fontFamily:     "inherit",
        gap:            "16px",
      }}>
        <p style={{ fontSize: "2rem" }}>⚠️</p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.6, margin: 0, maxWidth: "320px" }}>
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={() => this.handleReset()}
          style={{
            marginTop:     "8px",
            padding:       "10px 24px",
            borderRadius:  "999px",
            border:        "none",
            background:    "var(--accent, #8D7C66)",
            color:         "#fff",
            fontWeight:    600,
            cursor:        "pointer",
            fontSize:      "0.875rem",
          }}
        >
          Go back home
        </button>
      </div>
    );
  }
}