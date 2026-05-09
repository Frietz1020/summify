import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import ToggleSwitch from "../components/ui/ToggleSwitch";
import { useTheme } from "../context/ThemeContext";

/* ── Icons ──────────────────────────────────────────────────── */
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const DyslexicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6"  x2="20" y2="6"/>
    <line x1="4" y1="10" x2="16" y2="10"/>
    <line x1="4" y1="14" x2="20" y2="14"/>
    <line x1="4" y1="18" x2="14" y2="18"/>
  </svg>
);
const ColorBlindIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9"  cy="12" r="5"/>
    <circle cx="15" cy="12" r="5"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ── Sub-components ─────────────────────────────────────────── */
function IconBadge({ children, dark = false }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: dark ? "var(--text-primary)" : "var(--color-accent)",
      color: "#fff",
    }}>
      {children}
    </div>
  );
}

function ToggleRow({ icon, dark, label, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0" }}>
      <IconBadge dark={dark}>{icon}</IconBadge>
      <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
        {label}
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function ChevronRow({ icon, dark, label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 16, padding: "12px 0",
      width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
    }}>
      <IconBadge dark={dark}>{icon}</IconBadge>
      <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-muted)" }}><ChevronRight /></span>
    </button>
  );
}

/* ── SettingsPage ───────────────────────────────────────────── */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { darkMode, setDarkMode, dyslexicFont, setDyslexicFont } = useTheme();

  async function handleLogout() {
    await signOut(auth);
    navigate("/sign-in");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 412, margin: "0 auto", minHeight: "100vh", background: "var(--bg-page)", transition: "background 0.25s ease" }}>
      <Navbar />
      <Sidebar />

      <div style={{ flex: 1, padding: "24px 20px 32px" }}>

        {/* Title */}
        <h1 style={{ fontFamily: "var(--font-body)", fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
          Settings
        </h1>

        {/* Account row */}
        <button type="button" onClick={() => navigate("/app/account")} style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
          width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "4px 0",
        }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#C8C8C8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>Account Name</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-accent)", marginTop: 2 }}>Edit account details</span>
          </div>
          <span style={{ color: "var(--text-muted)" }}><ChevronRight /></span>
        </button>

        {/* Accessibility */}
        <h2 style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Accessibility
        </h2>

        <ToggleRow
          icon={<MoonIcon />}
          dark
          label="Dark Mode"
          checked={darkMode}
          onChange={setDarkMode}
        />

        <ToggleRow
          icon={<DyslexicIcon />}
          dark={false}
          label="Dyslexic Font Mode"
          checked={dyslexicFont}
          onChange={setDyslexicFont}
        />

        <ChevronRow
          icon={<ColorBlindIcon />}
          dark={false}
          label="Color Blind Mode"
          onClick={() => navigate("/app/settings/color-blind")}
        />
      </div>

      {/* Logout */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 20px 32px" }}>
        <button type="button" onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 20px", height: 44, borderRadius: 999,
          border: "1.5px solid var(--text-primary)", background: "transparent",
          fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
          color: "var(--text-primary)", cursor: "pointer",
          transition: "background 0.15s ease",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span>Logout</span>
          <LogoutIcon />
        </button>
      </div>
    </div>
  );
}