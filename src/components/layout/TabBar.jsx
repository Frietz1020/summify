import { useNavigate } from "react-router-dom";
import { useDocument } from "../../context/DocumentContext";

const TABS = [
  { key: "original", label: "Original", route: "/app/original" },
  { key: "summarized", label: "Summarized", route: "/app/summarized" },
  { key: "graph", label: "Graph", route: "/app/graph" },
];

export default function TabBar() {
  const { activeTab, setActiveTab } = useDocument();
  const navigate = useNavigate();

  function handleTab(tab) {
    setActiveTab(tab.key);
    navigate(tab.route);
  }

  return (
    <nav className="legacy-tabs" aria-label="Summary views">
      <div className="legacy-tabs__row">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`legacy-tabs__button${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => handleTab(tab)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
