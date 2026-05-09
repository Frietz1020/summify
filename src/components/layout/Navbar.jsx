import { useDocument } from "../../context/DocumentContext";

export default function Navbar() {
  const { toggleSidebar } = useDocument();

  return (
    <header className="legacy-navbar">
      <div className="legacy-navbar__logo" aria-label="Summify logo" />
      <button type="button" className="legacy-navbar__menu" onClick={toggleSidebar} aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
