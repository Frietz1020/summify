import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell, { FileTextIcon, SummaryFooter } from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";

const modes = [
  { key: "concise", label: "Concise" },
  { key: "detailed", label: "Detailed" },
  { key: "bullet", label: "Bullet" },
];

export default function SummarizedPage() {
  const navigate = useNavigate();
  const {
    mode,
    setMode,
    summary,
    setSummary,
    summaryVariants,
    setActiveTab,
  } = useDocument();

  const activeSummary = summaryVariants?.[mode] || summary;
  const hasSummary = Boolean(activeSummary?.trim());
  const wordCount = useMemo(() => countWords(activeSummary), [activeSummary]);

  useEffect(() => {
    setActiveTab("summarized");
  }, [setActiveTab]);

  useEffect(() => {
    if (summaryVariants?.[mode]) setSummary(summaryVariants[mode]);
  }, [mode, setSummary, summaryVariants]);

  function exportSummary() {
    if (!activeSummary?.trim()) return;

    const blob = new Blob([activeSummary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `summify-${mode}-summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MobileShell
      topTabs
      footer={
        <SummaryFooter
          wordCount={wordCount}
          actionLabel="Export"
          actionIcon={<FileTextIcon />}
          disabled={!hasSummary}
          onAction={exportSummary}
        />
      }
    >
      <div className="summary-page">
        <div className="summary-mode-tabs" aria-label="Summary modes">
          {modes.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`summary-mode-tabs__button${mode === item.key ? " is-active" : ""}`}
              onClick={() => setMode(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!hasSummary && (
          <p className="summary-hint">
            No summary yet. Go to{" "}
            <button type="button" className="text-current underline" onClick={() => navigate("/app/original")}>
              Original
            </button>{" "}
            and press Summarize.
          </p>
        )}

        {hasSummary && mode !== "bullet" && (
          <p className="summary-text">{activeSummary}</p>
        )}

        {hasSummary && mode === "bullet" && (
          <ul className="summary-list">
            {toBulletItems(activeSummary).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}

function countWords(text) {
  return text?.trim() ? text.trim().split(/\s+/).length : 0;
}

function toBulletItems(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim())
    .filter(Boolean);
}
