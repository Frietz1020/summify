export default function SummaryContent({ summary, mode }) {
  if (!summary?.trim()) return null;

  if (mode === "bullet") {
    const lines = summary
      .split("\n")
      .map(l => l.replace(/^[\s]*[-•*][\s]+/, "").replace(/^[\d]+[.)]\s+/, "").trim())
      .filter(Boolean);

    return (
      <ul style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", listStyle: "none", padding: 0, margin: 0 }}>
        {lines.map((line, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)" }}>
            <span style={{ marginTop: 6, width: 5, height: 5, borderRadius: "50%", background: "var(--text-primary)", flexShrink: 0 }} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    );
  }

  const paragraphs = summary.split(/\n{2,}/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)", textAlign: "justify", margin: 0 }}>
          {para}
        </p>
      ))}
    </div>
  );
}