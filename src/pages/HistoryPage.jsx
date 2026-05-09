import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell, { ClipboardIcon, FileTextIcon } from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";
import { useHistory } from "../hooks/useHistory";

export default function HistoryPage() {
  const navigate  = useNavigate();
  const [query, setQuery]       = useState("");
  const [sortAsc, setSortAsc]   = useState(false);

  const { records, loading, error, remove } = useHistory();

  const {
    setExtractedText,
    setSummary,
    setSummaryVariants,
    setKeyTerms,
    setActiveTab,
  } = useDocument();

  // Filter by file name
  const filtered = records.filter((r) =>
    (r.fileName ?? "").toLowerCase().includes(query.trim().toLowerCase())
  );

  // Sort by date
  const sorted = [...filtered].sort((a, b) => {
    const diff = new Date(a.createdAt) - new Date(b.createdAt);
    return sortAsc ? diff : -diff;
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
      month: "short",
      day:   "numeric",
      year:  "numeric",
    });
  }

  return (
    <MobileShell>
      <div className="history-page">
        <h1 className="screen-title">History</h1>

        {loading && (
          <div className="history-empty">
            <span>Loading...</span>
          </div>
        )}

        {error && (
          <div className="history-empty">
            <span>{error}</span>
          </div>
        )}

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
              <button
                type="button"
                className="history-sort"
                onClick={() => setSortAsc((v) => !v)}
                aria-label={sortAsc ? "Sort newest first" : "Sort oldest first"}
              >
                <span>Sort</span>
                <SortIcon />
              </button>
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
                    x
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