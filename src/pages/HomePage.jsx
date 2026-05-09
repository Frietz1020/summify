import { useNavigate } from "react-router-dom";
import MobileShell, { ArrowRightIcon } from "../components/layout/MobileShell";

const cards = [
  { label: "Go summarize contexts", route: "/app/original" },
  { label: "See archived summaries", route: "/app/history" },
  { label: "Set-up your settings", route: "/app/profile" },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="home-page">
        <p className="home-page__eyebrow">Hi, Username!</p>
        <h1 className="home-page__title">Where should we start?</h1>
        <div className="home-card-stack">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              className="home-card"
              onClick={() => navigate(card.route)}
            >
              <span>{card.label}</span>
              <ArrowRightIcon />
            </button>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
