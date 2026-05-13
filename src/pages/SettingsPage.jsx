import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import MobileShell from "../components/layout/MobileShell";
import ToggleSwitch from "../components/ui/ToggleSwitch";
import { useTheme } from "../context/ThemeContext";
import { useAuthContext } from "../context/AuthContext";

/* ── Icons ──────────────────────────────────────────────────── */
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
const PersonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

/* ── Sub-components ─────────────────────────────────────────── */
function SettingBadge({ children }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, var(--clr-teal), var(--clr-mauve))",
      color: "#fff",
    }}>
      {children}
    </div>
  );
}

function ToggleRow({ icon, label, checked, onChange }) {
  return (
    <div className="profile-toggle-row" style={{ paddingLeft: 0 }}>
      <SettingBadge>{icon}</SettingBadge>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "var(--text-primary)", gridColumn: "2" }}>
        {label}
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

/* ── SettingsPage ───────────────────────────────────────────── */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { darkMode, setDarkMode, dyslexicFont, setDyslexicFont } = useTheme();
  const { currentUser } = useAuthContext();

  async function handleLogout() {
    await signOut(auth);
    navigate("/sign-in");
  }

  return (
    <MobileShell>
      <div className="profile-page">
        <h1 className="screen-title">Settings</h1>

        {/* ── Account ── */}
        <button
          type="button"
          className="profile-row"
          onClick={() => navigate("/app/profile/edit")}
        >
          <div className="profile-row__icon">
            <SettingBadge><PersonIcon /></SettingBadge>
          </div>
          <span style={{ flex: 1 }}>
            {currentUser?.displayName || currentUser?.email || "Account"}
          </span>
          <ChevronRight />
        </button>

        {/* ── Accessibility ── */}
        <h2 className="profile-section" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Accessibility
        </h2>

        <div className="profile-section" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ToggleRow
            icon={<MoonIcon />}
            label="Dark Mode"
            checked={darkMode}
            onChange={setDarkMode}
          />
          <ToggleRow
            icon={<DyslexicIcon />}
            label="Dyslexic Font"
            checked={dyslexicFont}
            onChange={setDyslexicFont}
          />
        </div>

        {/* ── Logout ── */}
        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <button
            type="button"
            className="profile-row profile-row--danger"
            onClick={handleLogout}
            style={{ justifyContent: "center", gap: 10, marginBottom: 0 }}
          >
            <LogoutIcon />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </MobileShell>
  );
}