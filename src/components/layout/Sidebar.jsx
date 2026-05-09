import { useNavigate } from "react-router-dom";
import { useDocument } from "../../context/DocumentContext";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useDocument();
  const navigate = useNavigate();

  if (!sidebarOpen) return null;

  function go(path) {
    toggleSidebar();
    navigate(path);
  }

  return (
    <div className="sidebar-overlay">
      <button type="button" className="sidebar-backdrop" onClick={toggleSidebar} aria-label="Close menu" />
      <aside className="sidebar-panel">
        <header className="sidebar-header">
          <div className="sidebar-avatar">
            <AccountIcon />
          </div>
          <span>email@gmail.com</span>
        </header>
        <div className="sidebar-menu">
          <MenuItem icon={<AccountIcon />} label="Account Details" onClick={() => go("/app/profile")} />
          <MenuItem icon={<SettingsIcon />} label="Settings" onClick={() => go("/app/profile")} />
          <MenuItem icon={<LogoutIcon />} label="Logout" onClick={() => go("/sign-in")} logout />
        </div>
      </aside>
    </div>
  );
}

function MenuItem({ icon, label, onClick, logout = false }) {
  return (
    <button
      type="button"
      className={`sidebar-menu__item${logout ? " sidebar-menu__item--logout" : ""}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}
