import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell, { ArrowRightIcon } from "../components/layout/MobileShell";
import { useAuthContext } from "../context/AuthContext";
import { useHistory } from "../hooks/useHistory";
import { useDocument } from "../context/DocumentContext";

const NAV_CARDS = [
  { label: "Summarize",  sub: "Upload or paste your document", route: "/app/original",  icon: "✦" },
  { label: "History",    sub: "Browse saved summaries",         route: "/app/history",   icon: "◈" },
  { label: "Profile",    sub: "Manage your account",            route: "/app/profile",   icon: "◉" },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const { records, loading } = useHistory();
  const { setExtractedText, setSummary, setSummaryVariants, setKeyTerms, setActiveTab } = useDocument();
  const [query, setQuery] = useState("");

  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "there";
  const firstName   = displayName.split(/[\s_]/)[0];

  // Stats
  const totalSaved   = records.length;
  const lastActiveAt = records.length ? records.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b).createdAt : null;

  // Recent activity (latest 4)
  const recent = useMemo(() =>
    [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4),
    [records]
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return records
      .filter((r) => (r.fileName ?? "").toLowerCase().includes(query.trim().toLowerCase()))
      .slice(0, 6);
  }, [records, query]);

  function handleRestore(record) {
    setExtractedText(record.extractedText ?? "");
    setSummary(record.summaryVariants?.concise ?? "");
    setSummaryVariants(record.summaryVariants ?? { concise: "", detailed: "", bullet: "" });
    setKeyTerms(record.keyTerms ?? { nodes: [], edges: [] });
    setActiveTab("summarized");
    navigate("/app/summarized");
  }

  const hour  = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <MobileShell>
      <div className="home-page">

        {/* ── Greeting ── */}
        <div className="home-greeting">
          <p className="home-greeting__eyebrow">{greet},</p>
          <h1 className="home-greeting__name">{firstName} 👋</h1>
        </div>

        {/* ── Stats bar ── */}
        <div className="home-stats">
          <div className="home-stat">
            <span className="home-stat__value">{loading ? "–" : totalSaved}</span>
            <span className="home-stat__label">Summaries Saved</span>
          </div>
          <div className="home-stat__divider" />
          <div className="home-stat">
            <span className="home-stat__value">{loading ? "–" : lastActiveAt ? timeAgo(lastActiveAt) : "Never"}</span>
            <span className="home-stat__label">Last Active</span>
          </div>
        </div>

        {/* ── Search ── */}
        <label className="home-search" aria-label="Search summaries">
          <span className="home-search__icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search saved summaries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="home-search__input"
          />
          {query && (
            <button type="button" className="home-search__clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
          )}
        </label>

        {/* ── Search results ── */}
        {query.trim() && (
          <div className="home-search-results">
            {searchResults.length === 0
              ? <p className="home-search-results__empty">No matches for "{query}"</p>
              : searchResults.map((r) => (
                <button key={r.id} type="button" className="home-result-item" onClick={() => handleRestore(r)}>
                  <span className="home-result-item__icon">📄</span>
                  <span className="home-result-item__name">{r.fileName ?? "Untitled"}</span>
                  <span className="home-result-item__time">{timeAgo(r.createdAt)}</span>
                </button>
              ))
            }
          </div>
        )}

        {/* ── Quick actions ── */}
        {!query.trim() && (
          <>
            <p className="home-section-label">Quick Access</p>
            <div className="home-card-stack">
              {NAV_CARDS.map((card) => (
                <button key={card.route} type="button" className="home-card" onClick={() => navigate(card.route)}>
                  <span className="home-card__icon">{card.icon}</span>
                  <div className="home-card__text">
                    <span className="home-card__label">{card.label}</span>
                    <span className="home-card__sub">{card.sub}</span>
                  </div>
                  <ArrowRightIcon />
                </button>
              ))}
            </div>

            {/* ── Recent activity ── */}
            {!loading && recent.length > 0 && (
              <>
                <p className="home-section-label">Recent Activity</p>
                <div className="home-recent">
                  {recent.map((r) => (
                    <button key={r.id} type="button" className="home-recent-item" onClick={() => handleRestore(r)}>
                      <span className="home-recent-item__dot" />
                      <div className="home-recent-item__info">
                        <span className="home-recent-item__name">{r.fileName ?? "Untitled"}</span>
                        <span className="home-recent-item__time">{timeAgo(r.createdAt)}</span>
                      </div>
                      <ArrowRightIcon />
                    </button>
                  ))}
                  {records.length > 4 && (
                    <button type="button" className="home-recent-item home-recent-item--more" onClick={() => navigate("/app/history")}>
                      View all {records.length} summaries →
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Onboarding tip — only when no history */}
            {!loading && records.length === 0 && (
              <div className="home-tip">
                <span className="home-tip__icon">💡</span>
                <p>Upload a document or paste text to generate your first AI summary.</p>
              </div>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}