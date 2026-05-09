import { useLocation, useNavigate } from "react-router-dom";
import { useDocument } from "../../context/DocumentContext";

const navItems = [
  { label: "Home", route: "/app/home", match: ["/app/home"], icon: HomeIcon },
  { label: "Summary", route: "/app/original", match: ["/app/original", "/app/summarized", "/app/graph"], icon: SummaryIcon },
  { label: "History", route: "/app/history", match: ["/app/history"], icon: HistoryIcon },
  { label: "Profile", route: "/app/profile", match: ["/app/profile", "/app/settings"], icon: ProfileIcon },
];

const summaryTabs = [
  { key: "original", label: "Original", route: "/app/original" },
  { key: "summarized", label: "Summarized", route: "/app/summarized" },
  { key: "graph", label: "Graph", route: "/app/graph" },
];

export default function MobileShell({ children, topTabs = false, footer }) {
  return (
    <main className="mobile-shell">
      {topTabs && <SummaryTabs />}
      <section className="mobile-content">{children}</section>
      {footer}
      <BottomNavigation />
    </main>
  );
}

export function SummaryTabs() {
  const { activeTab, setActiveTab } = useDocument();
  const navigate = useNavigate();

  function selectTab(tab) {
    setActiveTab(tab.key);
    navigate(tab.route);
  }

  return (
    <nav className="summary-tabs" aria-label="Summary views">
      {summaryTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`summary-tabs__button${activeTab === tab.key ? " is-active" : ""}`}
          onClick={() => selectTab(tab)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.match.some((path) => location.pathname.startsWith(path));

        return (
          <button
            key={item.label}
            type="button"
            className={`bottom-nav__item${active ? " is-active" : ""}`}
            onClick={() => navigate(item.route)}
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function SummaryFooter({ wordCount, actionLabel, actionIcon, disabled, loading, onAction }) {
  return (
    <footer className="summary-footer">
      <div className="summary-footer__count">
        <ListIcon />
        <span>{wordCount} Words</span>
      </div>
      <button
        type="button"
        className="summary-footer__action"
        onClick={onAction}
        disabled={disabled || loading}
      >
        {loading ? <span className="spinner" aria-hidden="true" /> : actionIcon}
        <span>{loading ? "Summarizing..." : actionLabel}</span>
      </button>
    </footer>
  );
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-7Z" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

export function SummaryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.35-5.65" />
      <path d="M4 5v5h5M12 8v5l3 2" />
    </svg>
  );
}

export function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 16 12 12 8 16M12 12v8" />
      <path d="M20 17.4A5 5 0 0 0 18 8h-1.2A7 7 0 0 0 3 10.5" />
    </svg>
  );
}

export function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4h6M9 4a2 2 0 0 0-2 2h10a2 2 0 0 0-2-2M7 6H5v15h14V6h-2" />
      <path d="M8 11h8M8 15h6" />
    </svg>
  );
}

export function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.7 4.6L18 9.3l-4.3 1.6L12 16l-1.7-5.1L6 9.3l4.3-1.7L12 3Z" />
      <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />
    </svg>
  );
}

export function FileTextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3H6v18h12V7l-4-4Z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h11M8 12h11M8 17h11M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}
