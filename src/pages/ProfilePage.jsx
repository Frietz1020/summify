import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import MobileShell, { ArrowRightIcon, ProfileIcon } from "../components/layout/MobileShell";
import ToggleSwitch from "../components/ui/ToggleSwitch";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const { darkMode, setDarkMode, dyslexicFont, setDyslexicFont } = useTheme();

  const displayName = currentUser?.displayName || "Username";
  const email       = currentUser?.email       || "User Email";
  const photoURL    = currentUser?.photoURL    || null;

  /* Google accounts have a photoURL; regular accounts do not */
  const isGoogleAccount = currentUser?.providerData?.some(
    (p) => p.providerId === "google.com"
  );

  async function handleLogout() {
    await signOut(auth);
    navigate("/sign-in");
  }

  return (
    <MobileShell>
      <div className="profile-page">
        <h1 className="screen-title">Profile</h1>

        {/* Hero */}
        <section className="profile-hero" aria-label="Account summary">
          <div className="profile-avatar">
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="profile-avatar-img" />
            ) : (
              <ProfileIcon />
            )}
            {isGoogleAccount && (
              <span className="profile-google-badge" aria-label="Signed in with Google">
                <GoogleBadgeIcon />
              </span>
            )}
          </div>
          <h2>{displayName}</h2>
          <p>{email}</p>
        </section>

        {/* Account */}
        <section className="profile-section" aria-labelledby="account-title">
          <h2 id="account-title">Account</h2>

          {/* Edit Details — only for non-Google accounts */}
          {!isGoogleAccount && (
            <button
              type="button"
              className="profile-row"
              onClick={() => navigate("/app/profile/edit")}
            >
              <span className="profile-row__icon"><ProfileIcon /></span>
              <span>Edit Details</span>
              <ArrowRightIcon />
            </button>
          )}

          <button
            type="button"
            className="profile-row profile-row--danger"
            onClick={handleLogout}
          >
            <span className="profile-row__icon"><LogoutIcon /></span>
            <span>Logout</span>
          </button>
        </section>

        {/* Accessibility */}
        <section className="profile-section" aria-labelledby="accessibility-title">
          <h2 id="accessibility-title">Accessibility</h2>
          <div className="profile-toggle-row">
            <span className="profile-badge profile-badge--dark"><MoonIcon /></span>
            <span>Dark Mode</span>
            <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
          </div>
          <div className="profile-toggle-row">
            <span className="profile-badge"><TextIcon /></span>
            <span>Dyslexic Font Mode</span>
            <ToggleSwitch checked={dyslexicFont} onChange={setDyslexicFont} />
          </div>
        </section>
      </div>
    </MobileShell>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <path d="m16 17 5-5-5-5M21 12H9"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A8 8 0 1 1 11.2 3 6.4 6.4 0 0 0 21 12.8Z"/>
    </svg>
  );
}

function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 6h10M7 10h10M7 14h7M7 18h5"/>
    </svg>
  );
}

function GoogleBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}