import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getAvatar } from "../services/firestore";
import { useTTS } from "../hooks/useTTS";
import MobileShell, { ArrowRightIcon, ProfileIcon } from "../components/layout/MobileShell";
import ToggleSwitch from "../components/ui/ToggleSwitch";

const APP_VERSION = "1.0.0";

const FONT_STEPS = [
  { key: "small",  label: "A",  title: "Small"       },
  { key: "medium", label: "A",  title: "Medium"      },
  { key: "large",  label: "A",  title: "Large"       },
  { key: "xlarge", label: "A",  title: "Extra Large" },
];

const WHATS_NEW = [
  { version: "1.0.0", items: [
    "Glassmorphism UI redesign with Nature Distilled palette",
    "AI summaries: Concise, Detailed, and Bullet modes",
    "Interactive knowledge graph for key terms",
    "Read Aloud (TTS) with voice, speed, and pitch controls",
    "Editable profile avatar for non-Google accounts",
    "Accessibility: high contrast, reduce motion, dyslexic font, font size",
    "PDF and DOCX document upload support",
    "Summary export as plain text",
  ]},
];

export default function ProfilePage() {
  const navigate     = useNavigate();
  const { currentUser } = useAuthContext();
  const {
    darkMode,     setDarkMode,
    dyslexicFont, setDyslexicFont,
    highContrast, setHighContrast,
    reduceMotion, setReduceMotion,
    fontSize,     setFontSize,
  } = useTheme();

  const { rate, setRate, pitch, setPitch, supported: ttsSupported } = useTTS();

  const displayName     = currentUser?.displayName || "Username";
  const email           = currentUser?.email       || "";
  const isGoogleAccount = currentUser?.providerData?.some((p) => p.providerId === "google.com");

  const [avatarSrc,    setAvatarSrc]    = useState(isGoogleAccount ? (currentUser?.photoURL || null) : null);
  const [activeModal,  setActiveModal]  = useState(null); // "about" | "whats-new"

  useEffect(() => {
    if (!currentUser?.uid || isGoogleAccount) return;
    let cancelled = false;
    getAvatar(currentUser.uid).then((url) => {
      if (!cancelled) setAvatarSrc(url || null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser, isGoogleAccount]);

  async function handleLogout() {
    await signOut(auth);
    navigate("/sign-in");
  }

  return (
    <MobileShell>
      {/* ── Modals ── */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={{ about: "About Summify", "whats-new": "What's New", "bug-report": "Report a Bug", terms: "Terms & Privacy" }[activeModal] ?? "Dialog"}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "var(--overlay-bg)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setActiveModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-glass-strong)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--border-glass)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "var(--shadow-card)",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "24px 20px 40px",
              width: "100%",
            }}
          >
            {/* drag handle */}
            <div style={{
              background: "var(--text-muted)", borderRadius: 99,
              height: 4, margin: "0 auto 20px", opacity: 0.4, width: 40,
            }} />

            {activeModal === "about"      && <AboutContent />}
            {activeModal === "whats-new"   && <WhatsNewContent />}
            {activeModal === "bug-report"  && <BugReportContent onClose={() => setActiveModal(null)} />}
            {activeModal === "terms"        && <TermsContent />}

            {/* Hide generic Close button for bug-report — it has its own actions */}
            {activeModal !== "bug-report" && (
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  background: "var(--bg-glass)", border: "1px solid var(--border-glass)",
                  borderRadius: 12, color: "var(--text-primary)", cursor: "pointer",
                  fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                  marginTop: 20, padding: "10px 0", width: "100%",
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      <div className="profile-page">
        <h1 className="screen-title">Profile</h1>

        {/* ── Hero ── */}
        <section className="profile-hero" aria-label="Account summary">
          <div className="profile-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt={displayName} className="profile-avatar-img" referrerPolicy="no-referrer" />
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

        {/* ── Account ── */}
        <section className="profile-section" aria-labelledby="account-title">
          <h2 id="account-title">Account</h2>
          {!isGoogleAccount && (
            <button type="button" className="profile-row" onClick={() => navigate("/app/profile/edit")}>
              <span className="profile-row__icon"><ProfileIcon /></span>
              <span>Edit Details</span>
              <ArrowRightIcon />
            </button>
          )}
          <button type="button" className="profile-row profile-row--danger" onClick={handleLogout}>
            <span className="profile-row__icon"><LogoutIcon /></span>
            <span>Logout</span>
          </button>
        </section>

        {/* ── Accessibility ── */}
        <section className="profile-section" aria-labelledby="a11y-title">
          <h2 id="a11y-title">Accessibility</h2>

          <div className="profile-toggle-row">
            <span className="profile-badge profile-badge--dark"><MoonIcon /></span>
            <span>Dark Mode</span>
            <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
          </div>
          <div className="profile-toggle-row">
            <span className="profile-badge"><TextIcon /></span>
            <span>Dyslexic Font</span>
            <ToggleSwitch checked={dyslexicFont} onChange={setDyslexicFont} />
          </div>
          <div className="profile-toggle-row">
            <span className="profile-badge"><ContrastIcon /></span>
            <span>High Contrast</span>
            <ToggleSwitch checked={highContrast} onChange={setHighContrast} />
          </div>
          <div className="profile-toggle-row">
            <span className="profile-badge"><MotionIcon /></span>
            <span>Reduce Motion</span>
            <ToggleSwitch checked={reduceMotion} onChange={setReduceMotion} />
          </div>

          {/* Font size */}
          <div style={{ marginTop: 16 }}>
            <p className="profile-label">Font Size</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {FONT_STEPS.map((step, i) => (
                <button
                  key={step.key}
                  type="button"
                  title={step.title}
                  aria-label={step.title}
                  aria-pressed={fontSize === step.key}
                  onClick={() => setFontSize(step.key)}
                  style={{
                    alignItems: "center",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    background: fontSize === step.key
                      ? "linear-gradient(135deg, var(--clr-teal), var(--clr-mauve))"
                      : "var(--bg-glass)",
                    border: `1px solid ${fontSize === step.key ? "transparent" : "var(--border-glass)"}`,
                    borderRadius: 12,
                    boxShadow: fontSize === step.key ? "var(--glow-accent)" : "var(--shadow-card)",
                    color: fontSize === step.key ? "#fff" : "var(--text-primary)",
                    cursor: "pointer",
                    display: "flex",
                    fontFamily: "var(--font-body)",
                    fontSize: [12, 16, 20, 24][i],
                    fontWeight: 700,
                    height: 44,
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          {/* TTS */}
          {ttsSupported && (
            <div style={{ marginTop: 14 }}>
              <p className="profile-label">Read Aloud (TTS)</p>
              <SliderRow id="tts-rate"  label="Speed" value={rate}  min={0.5} max={2} step={0.1} display={`${rate.toFixed(1)}×`}  onChange={setRate} />
              <SliderRow id="tts-pitch" label="Pitch" value={pitch} min={0.5} max={2} step={0.1} display={pitch.toFixed(1)}         onChange={setPitch} />
            </div>
          )}
        </section>

        {/* ── App ── */}
        <section className="profile-section" aria-labelledby="app-title">
          <h2 id="app-title">App</h2>

          <button type="button" className="profile-row" onClick={() => setActiveModal("about")}>
            <span className="profile-row__icon"><InfoIcon /></span>
            <span>About</span>
            <ArrowRightIcon />
          </button>

          <button type="button" className="profile-row" onClick={() => setActiveModal("whats-new")}>
            <span className="profile-row__icon"><SparkleIcon /></span>
            <span>What's New</span>
            <span style={{
              background: "linear-gradient(135deg, var(--clr-teal), var(--clr-mauve))",
              borderRadius: 99, color: "#fff", fontSize: 10, fontWeight: 700,
              marginLeft: "auto", marginRight: 8, padding: "2px 8px",
            }}>v{APP_VERSION}</span>
            <ArrowRightIcon />
          </button>

          <button type="button" className="profile-row" onClick={() => setActiveModal("bug-report")}>
            <span className="profile-row__icon"><BugIcon /></span>
            <span>Report a Bug</span>
            <ArrowRightIcon />
          </button>

          <button type="button" className="profile-row" onClick={() => setActiveModal("terms")}>
            <span className="profile-row__icon"><ShieldIcon /></span>
            <span>Terms &amp; Privacy Policy</span>
            <ArrowRightIcon />
          </button>
        </section>

        {/* Footer version note */}
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 8, textAlign: "center", paddingBottom: 24 }}>
          Summify v{APP_VERSION}
        </p>
      </div>
    </MobileShell>
  );
}

/* ── Bug report content ─────────────────────────────────────── */
function BugReportContent({ onClose }) {
  const [desc,       setDesc]       = useState("");
  const [imgFile,    setImgFile]    = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [sent,       setSent]       = useState(false);
  const fileInputRef = useRef(null);

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImgFile(null);
    setImgPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSend() {
    if (!desc.trim()) return;
    const imgNote = imgFile ? `\n\n[Attachment: ${imgFile.name} — please attach this file manually]` : "";
    const body    = encodeURIComponent(`Bug Description:\n${desc.trim()}${imgNote}`);
    window.open(`mailto:froooskranz@gmail.com?subject=Summify+Bug+Report&body=${body}`);
    setSent(true);
    setTimeout(onClose, 1800);
  }

  const inputStyle = {
    background: "var(--bg-glass)", border: "1px solid var(--border-glass)",
    borderRadius: 12, color: "var(--text-primary)", fontFamily: "var(--font-body)",
    fontSize: 15, padding: 12, width: "100%", boxSizing: "border-box",
  };
  const btnBase = {
    borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-body)",
    fontSize: 15, fontWeight: 600, padding: "12px 0", width: "100%",
  };

  if (sent) return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <p style={{ fontSize: 42, marginBottom: 10 }}>✅</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>Email client opened!</p>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
        Send the pre-filled email to submit your report.
      </p>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Report a Bug</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 18, lineHeight: 1.6 }}>
        Describe what went wrong and we'll look into it.
      </p>

      <textarea
        placeholder="What happened? Steps to reproduce..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={5}
        style={{ ...inputStyle, resize: "vertical" }}
      />

      {/* Image upload */}
      <div style={{ marginTop: 14 }}>
        <label style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
          Screenshot (optional)
        </label>

        {/* Attach button — only when no file selected */}
        {!imgFile && (
          <label style={{
            ...inputStyle, display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", color: "var(--text-secondary)",
          }}>
            <span style={{ fontSize: 20 }}>📌</span>
            <span style={{ fontSize: 14 }}>Tap to attach image</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          </label>
        )}

        {/* Preview + remove */}
        {imgPreview && (
          <div style={{ position: "relative", marginTop: 8 }}>
            <img src={imgPreview} alt="Preview" style={{
              borderRadius: 10, maxHeight: 160, objectFit: "cover", width: "100%", display: "block",
            }} />
            {/* Remove button */}
            <button
              type="button"
              onClick={removeImage}
              title="Remove image"
              style={{
                position: "absolute", top: 8, right: 8,
                background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
                color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700,
                height: 28, width: 28, display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >
              ×
            </button>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
              📌 Your email client will open pre-filled — attach this image manually to the email.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button type="button" onClick={onClose}
          style={{ ...btnBase, background: "var(--bg-glass)", border: "1px solid var(--border-glass)", color: "var(--text-primary)", flex: 1 }}>
          Cancel
        </button>
        <button type="button" onClick={handleSend} disabled={!desc.trim()}
          style={{ ...btnBase,
            background: desc.trim() ? "linear-gradient(135deg, var(--clr-teal), var(--clr-mauve))" : "var(--bg-glass)",
            border: "none", color: desc.trim() ? "#fff" : "var(--text-muted)", flex: 2,
            opacity: desc.trim() ? 1 : 0.5 }}>
          Send Report
        </button>
      </div>
    </div>

  );
}

/* ── Terms content ──────────────────────────────────────────── */
function TermsContent() {
  const s = { color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 14 };
  const h = { color: "var(--text-primary)", fontSize: 15, fontWeight: 700, marginBottom: 6, marginTop: 18 };
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Terms &amp; Privacy Policy</h2>
      <p style={{ ...s, marginBottom: 16 }}>Last updated: May 2025</p>

      <p style={h}>1. Use of the App</p>
      <p style={s}>Summify is provided for personal and non-commercial use. You agree not to misuse the service, attempt to reverse-engineer it, or use it for unlawful purposes.</p>

      <p style={h}>2. AI-Generated Content</p>
      <p style={s}>Summaries are generated by AI and may contain inaccuracies. Do not rely solely on Summify summaries for critical decisions. Always verify important information against the original source.</p>

      <p style={h}>3. Data &amp; Privacy</p>
      <p style={s}>We store your account information (email, display name, optional avatar) in Firebase. Document text you submit for summarization is sent to Groq's API and is not stored by Summify after processing.</p>

      <p style={h}>4. Third-Party Services</p>
      <p style={s}>Summify uses Firebase (Google) for authentication and Groq for AI inference. Their respective privacy policies apply to data processed by their services.</p>

      <p style={h}>5. Changes</p>
      <p style={s}>We may update these terms at any time. Continued use of the app constitutes acceptance of the updated terms.</p>

      <p style={h}>Contact</p>
      <p style={s}>Questions? Email us at <strong>froooskranz@gmail.com</strong>.</p>
    </div>
  );
}

/* ── About content ──────────────────────────────────────────── */
function AboutContent() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>About Summify</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        Summify is an AI-powered document summarization tool that transforms long texts, PDFs, and DOCX files into concise, detailed, or scannable bullet summaries in seconds.
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        Built with React, Firebase, and Groq's Llama 3.3 70B — designed as a mobile-first progressive web app with accessibility at its core.
      </p>
      <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)", borderRadius: 12, padding: "12px 16px" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>
          🧠 Powered by <strong>Llama 3.3 70B</strong> via Groq<br />
          🔐 Auth via <strong>Firebase</strong><br />
          ⚡ Proxied securely via <strong>Cloudflare Workers</strong>
        </p>
      </div>
    </div>
  );
}

/* ── What's New content ─────────────────────────────────────── */
function WhatsNewContent() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>What's New</h2>
      {WHATS_NEW.map(({ version, items }) => (
        <div key={version} style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Version {version}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item, i) => (
              <li key={i} style={{ alignItems: "flex-start", color: "var(--text-secondary)", display: "flex", fontSize: 13, gap: 8, lineHeight: 1.5 }}>
                <span style={{ color: "var(--color-primary)", flexShrink: 0 }}>✦</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ── Slider row ─────────────────────────────────────────────── */
function SliderRow({ id, label, value, min, max, step, display, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <label htmlFor={id} style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</label>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{display}</span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--clr-mauve)", cursor: "pointer" }}
      />
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function LogoutIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>; }
function MoonIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A8 8 0 1 1 11.2 3 6.4 6.4 0 0 0 21 12.8Z"/></svg>; }
function TextIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 6h10M7 10h10M7 14h7M7 18h5"/></svg>; }
function ContrastIcon(){ return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 1 0 18"/></svg>; }
function MotionIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>; }
function InfoIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>; }
function SparkleIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>; }
function BugIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M17.47 9c1.93-.2 3.53-1.9 3.53-4M3 19c0-2.1 1.4-3.8 3.27-4.21M20.73 19A4.243 4.243 0 0 0 17 15"/></svg>; }
function ShieldIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
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