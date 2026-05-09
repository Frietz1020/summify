import { useState, useEffect } from "react";
import { useDocument } from "../../context/DocumentContext";

export default function ModeToggle({ defaultExpanded = false }) {
  const { mode, setMode } = useDocument();
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => { setExpanded(defaultExpanded); }, [defaultExpanded]);

  const pillBtn = (label, val) => (
    <button type="button" onClick={() => setMode(val)}
      style={{
        padding: "6px 20px", borderRadius: 999, border: "none", cursor: "pointer",
        fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
        background: mode === val ? "#fff" : "transparent",
        color:      mode === val ? "var(--text-primary)" : "#fff",
        boxShadow:  mode === val ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
        transition: "background 0.2s, color 0.2s",
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
        Summary Modes
      </span>

      {/* Clickable dash */}
      <button type="button" onClick={() => setExpanded(v => !v)} aria-label={expanded ? "Collapse" : "Expand"}
        style={{ width: 44, height: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <div style={{
          height: 2.5, borderRadius: 999,
          width: expanded ? 28 : 20,
          background: expanded ? "var(--text-primary)" : "var(--text-muted)",
          transition: "width 0.25s ease, background 0.25s ease",
        }} />
      </button>

      {/* Pill */}
      <div style={{
        overflow: "hidden",
        maxHeight: expanded ? 60 : 0,
        opacity:   expanded ? 1  : 0,
        pointerEvents: expanded ? "auto" : "none",
        transition: "max-height 0.3s ease, opacity 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", background: "var(--color-accent)", borderRadius: 999, padding: 3, gap: 2 }}>
          {pillBtn("Bullet Point", "bullet")}
          {pillBtn("Paragraph",    "paragraph")}
        </div>
      </div>
    </div>
  );
}