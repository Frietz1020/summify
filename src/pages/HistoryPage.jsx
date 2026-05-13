import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell, { ClipboardIcon, FileTextIcon } from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";
import { useHistory } from "../hooks/useHistory";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [query,   setQuery]   = useState("");
  const [sortBy,  setSortBy]  = useState("date");   // "date" | "alpha"
  const [sortDir, setSortDir] = useState("desc");    // "asc"  | "desc"
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { records, loading, error, remove } = useHistory();
  const { setExtractedText, setSummary, setSummaryVariants, setKeyTerms, setActiveTab } = useDocument();

  // Close menu on outside click / touch
  useEffect(() => {
    if (!menuOpen) return;
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("touchstart", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("touchstart", close);
    };
  }, [menuOpen]);

  // Clicking a sort option:
  //  • If it's already active  → toggle direction
  //  • If it's a new option    → activate it with its default direction
  function handleSortOption(key) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      // sensible defaults: date → newest first (desc), alpha → A-Z (asc)
      setSortDir(key === "date" ? "desc" : "asc");
    }
    setMenuOpen(false);
  }

  // Filter
  const filtered = records.filter((r) =>
    (r.fileName ?? "").toLowerCase().includes(query.trim().toLowerCase())
  );

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") {
      cmp = new Date(a.createdAt) - new Date(b.createdAt);
    } else {
      cmp = (a.fileName ?? "").localeCompare(b.fileName ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleRestore(record) {
    setExtractedText(record.extractedText ?? "");
    setSummary(record.summaryVariants?.concise ?? "");
    setSummaryVariants(record.summaryVariants ?? { concise: "", detailed: "", bullet: "" });
    setKeyTerms(record.keyTerms ?? { nodes: [], edges: [] });
    setActiveTab("summarized");
    navigate("/app/summarized");
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  // Arrow reflects the current direction
  const arrow = sortDir === "asc" ? "↑" : "↓";

  return (
    <MobileShell>
      <div className="history-page">
        <h1 className="screen-title">History</h1>

        {loading && <div className="history-empty"><span>Loading...</span></div>}
        {error   && <div className="history-empty"><span>{error}</span></div>}

        {!loading && !error && records.length > 0 && (
          <>
            <div className="history-toolbar">
              <label className="history-search">
                <SearchIcon />
                <input
                  type="search"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              {/* Sort button + context menu */}
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="history-sort"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  title="Sort"
                >
                  {/* Show active sort arrow in the button */}
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{arrow}</span>
                  <SortIcon />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0,
                      zIndex: 200, minWidth: 180,
                      background: "var(--bg-glass-strong)",
                      backdropFilter: "blur(20px) saturate(180%)",
                      WebkitBackdropFilter: "blur(20px) saturate(180%)",
                      border: "1px solid var(--border-glass)",
                      borderRadius: 14,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
                      overflow: "hidden",
                      padding: "6px",
                    }}
                  >
                    {[
                      { key: "alpha", label: "Alphabetical" },
                      { key: "date",  label: "Date"          },
                    ].map((opt) => {
                      const isActive = sortBy === opt.key;
                      // Show arrow only on active option
                      const optArrow = isActive ? (sortDir === "asc" ? "↑" : "↓") : null;
                      return (
                        <button
                          key={opt.key}
                          role="menuitem"
                          type="button"
                          onClick={() => handleSortOption(opt.key)}
                          style={{
                            alignItems: "center",
                            background: isActive
                              ? "linear-gradient(135deg,rgba(45,139,143,0.22),rgba(157,93,159,0.22))"
                              : "transparent",
                            border: "none",
                            borderRadius: 10,
                            color: isActive ? "var(--color-primary)" : "var(--text-primary)",
                            cursor: "pointer",
                            display: "flex",
                            fontFamily: "var(--font-body)",
                            fontSize: 14,
                            fontWeight: isActive ? 700 : 500,
                            gap: 8,
                            padding: "11px 14px",
                            textAlign: "left",
                            width: "100%",
                            transition: "background 0.15s",
                          }}
                        >
                          <span style={{ flex: 1 }}>{opt.label}</span>
                          {/* Arrow only appears on the active option */}
                          {optArrow && (
                            <span style={{
                              fontSize: 16,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: "var(--color-primary)",
                            }}>
                              {optArrow}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="history-list">
              {sorted.map((record) => (
                <article className="history-item" key={record.id}>
                  <button
                    type="button"
                    className="history-item__delete"
                    onClick={() => remove(record.id)}
                    aria-label={`Delete ${record.fileName}`}
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    className="history-item__restore"
                    onClick={() => handleRestore(record)}
                    aria-label={`Open ${record.fileName}`}
                  >
                    <FileTextIcon />
                    <div>
                      <h2>{record.fileName ?? "Untitled"}</h2>
                      <p>{formatDate(record.createdAt)}</p>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="history-empty">
            <ClipboardIcon />
            <span>No Files Summarized!</span>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M8 12h12M12 17h8" />
    </svg>
  );
}