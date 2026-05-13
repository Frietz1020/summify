import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { getAvatar, saveAvatar } from "../services/firestore";
import { useAuthContext } from "../context/AuthContext";
import MobileShell, { ProfileIcon } from "../components/layout/MobileShell";

/* ── Client-side image compression ───────────────────────────
   Resizes to ≤180px and compresses to JPEG ≤40KB.
   Firebase Auth photoURL only accepts http/https — we store
   the data URL in Firestore instead.
──────────────────────────────────────────────────────────── */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const SIZE  = 180;
      const scale = Math.min(SIZE / img.width, SIZE / img.height, 1);
      const w     = Math.round(img.width  * scale);
      const h     = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);

      let q = 0.82;
      let dataURL = canvas.toDataURL("image/jpeg", q);
      while (dataURL.length > 40_000 && q > 0.3) {
        q -= 0.1;
        dataURL = canvas.toDataURL("image/jpeg", q);
      }
      resolve(dataURL);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();

  const isGoogleAccount = currentUser?.providerData?.some(
    (p) => p.providerId === "google.com"
  );

  // ── Form fields ─────────────────────────────────────────────
  const [displayName,     setDisplayName]     = useState(currentUser?.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Avatar state ────────────────────────────────────────────
  const [savedAvatar,    setSavedAvatar]    = useState(null);
  const [avatarPreview,  setAvatarPreview]  = useState(currentUser?.photoURL || null);
  const [pendingDataURL, setPendingDataURL] = useState(null);
  const [avatarLoading,  setAvatarLoading]  = useState(true);
  const [avatarError,    setAvatarError]    = useState("");
  const [cropSrc,        setCropSrc]        = useState(null); // raw image for crop modal
  const fileInputRef = useRef(null);

  // ── Save state ──────────────────────────────────────────────
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  // ── Load avatar from Firestore on mount ─────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;

    getAvatar(currentUser.uid)
      .then((dataURL) => {
        if (cancelled) return;
        // Firestore avatar takes priority over Firebase Auth photoURL
        const url = dataURL || currentUser.photoURL || null;
        setSavedAvatar(dataURL);
        setAvatarPreview(url);
      })
      .catch(() => {
        // Fall back to Firebase Auth photoURL if Firestore read fails
        setAvatarPreview(currentUser.photoURL || null);
      })
      .finally(() => { if (!cancelled) setAvatarLoading(false); });

    return () => { cancelled = true; };
  }, [currentUser]);

  /* ── Avatar file picker → opens crop modal ──────────────── */
  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) { setAvatarError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024)    { setAvatarError("Image must be smaller than 5 MB."); return; }

    setAvatarError("");
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleCropDone(croppedDataURL) {
    setCropSrc(null);
    setAvatarPreview(croppedDataURL);
    setPendingDataURL(croppedDataURL);
  }

  function handleCropCancel() {
    setCropSrc(null);
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null);
    setPendingDataURL("__remove__");
    setAvatarError("");
  }

  /* ── Validation ──────────────────────────────────────────── */
  function validate() {
    const errs = {};
    if (!displayName.trim())               errs.displayName    = "Display name is required.";
    else if (displayName.trim().length < 2) errs.displayName   = "At least 2 characters.";

    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;
    if (wantsPasswordChange) {
      if (!currentPassword)              errs.currentPassword = "Enter your current password.";
      if (!newPassword)                  errs.newPassword     = "Enter a new password.";
      else if (newPassword.length < 8)   errs.newPassword     = "At least 8 characters.";
      if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    }
    return errs;
  }

  /* ── Save ────────────────────────────────────────────────── */
  async function handleSave(e) {
    e.preventDefault();
    setSuccessMsg("");

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setErrors({});

    try {
      // 1. Update display name (only on Firebase Auth, no photoURL here)
      const nameChanged = displayName.trim() !== (currentUser?.displayName || "");
      if (nameChanged) {
        await updateProfile(currentUser, { displayName: displayName.trim() });
      }

      // 2. Save avatar to Firestore (not Firebase Auth — Auth rejects data URLs)
      if (pendingDataURL === "__remove__") {
        await saveAvatar(currentUser.uid, null);
        setSavedAvatar(null);
        setPendingDataURL(null);
      } else if (pendingDataURL) {
        await saveAvatar(currentUser.uid, pendingDataURL);
        setSavedAvatar(pendingDataURL);
        setPendingDataURL(null);
      }

      // 3. Change password if requested
      const wantsPasswordChange = currentPassword || newPassword || confirmPassword;
      if (wantsPasswordChange) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      setSuccessMsg("Profile updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      const errMap = {
        "auth/wrong-password":        "Current password is incorrect.",
        "auth/invalid-credential":    "Current password is incorrect.",
        "auth/weak-password":         "New password is too weak.",
        "auth/requires-recent-login": "Please sign out and back in, then try again.",
        "auth/too-many-requests":     "Too many attempts. Try again later.",
      };
      setErrors({ general: errMap[err.code] || "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────── */
  const showRemoveBtn = !isGoogleAccount && (avatarPreview || savedAvatar) && pendingDataURL !== "__remove__";

  return (
    <>
    {cropSrc && <CropModal src={cropSrc} onCrop={handleCropDone} onCancel={handleCropCancel} />}
    <MobileShell>
      <div className="profile-edit-page">
        <header className="profile-edit-header">
          <button
            type="button"
            className="profile-edit-back"
            onClick={() => navigate("/app/profile")}
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <h1 className="screen-title" style={{ margin: 0, flex: 1 }}>Edit Profile</h1>
          <div style={{ width: 32 }} />
        </header>

        {/* ── Avatar ── */}
        <div className="profile-edit-avatar-section">
          <div className="profile-avatar" style={{ position: "relative" }}>
            {avatarLoading ? (
              <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} aria-label="Loading…" />
            ) : avatarPreview ? (
              <img
                src={avatarPreview}
                alt={displayName || "Avatar"}
                className="profile-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <ProfileIcon />
            )}

            {!isGoogleAccount && (
              <button
                type="button"
                className="profile-camera"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile photo"
                title="Change photo"
                disabled={avatarLoading}
              >
                <CameraIcon />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
            aria-hidden="true"
          />

          <p className="profile-edit-email">{currentUser?.email || ""}</p>

          {showRemoveBtn && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 12, marginTop: 2,
                fontFamily: "var(--font-body)", textDecoration: "underline",
              }}
            >
              Remove photo
            </button>
          )}

          {avatarError && (
            <p className="profile-edit-field-error" style={{ marginTop: 4 }}>{avatarError}</p>
          )}

          {isGoogleAccount && (
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, textAlign: "center" }}>
              Photo managed by Google
            </p>
          )}
        </div>

        {/* ── Status banners ── */}
        {successMsg && (
          <div className="profile-edit-success" role="status">
            <CheckIcon />
            <span>{successMsg}</span>
          </div>
        )}
        {errors.general && (
          <div className="profile-edit-error" role="alert">
            <ErrorIcon />
            <span>{errors.general}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSave} noValidate className="profile-edit-form">
          <div className="profile-edit-field">
            <label htmlFor="edit-displayName" className="profile-edit-label">Display Name</label>
            <div className={`profile-edit-input-box${errors.displayName ? " profile-edit-input-box--error" : ""}`}>
              <UserIcon />
              <input
                id="edit-displayName"
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setErrors((p) => ({ ...p, displayName: "" })); }}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            {errors.displayName && <p className="profile-edit-field-error">{errors.displayName}</p>}
          </div>

          {/* Password — hidden for Google accounts */}
          {!isGoogleAccount && (
            <>
              <div className="profile-edit-divider">
                <span>Change Password</span>
                <div className="profile-edit-divider-line" />
              </div>
              <p className="profile-edit-hint">Leave blank to keep your current password.</p>

              {[
                { id: "edit-currentPassword", label: "Current Password", val: currentPassword, set: setCurrentPassword, key: "currentPassword", ac: "current-password" },
                { id: "edit-newPassword",      label: "New Password",     val: newPassword,      set: setNewPassword,     key: "newPassword",     ac: "new-password" },
                { id: "edit-confirmPassword",  label: "Confirm Password", val: confirmPassword,  set: setConfirmPassword, key: "confirmPassword", ac: "new-password" },
              ].map(({ id, label, val, set, key, ac }) => (
                <div key={id} className="profile-edit-field">
                  <label htmlFor={id} className="profile-edit-label">{label}</label>
                  <div className={`profile-edit-input-box${errors[key] ? " profile-edit-input-box--error" : ""}`}>
                    <LockIcon />
                    <input
                      id={id}
                      type="password"
                      value={val}
                      onChange={(e) => { set(e.target.value); setErrors((p) => ({ ...p, [key]: "" })); }}
                      placeholder={label}
                      autoComplete={ac}
                    />
                  </div>
                  {errors[key] && <p className="profile-edit-field-error">{errors[key]}</p>}
                </div>
              ))}
            </>
          )}

          <div className="profile-edit-actions">
            <button type="button" className="profile-edit-cancel" onClick={() => navigate("/app/profile")}>
              Cancel
            </button>
            <button type="submit" className="profile-edit-save" disabled={saving || avatarLoading}>
              {saving ? <span className="spinner" aria-hidden="true" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </MobileShell>
    </>
  );
}

/* ── Crop Modal ─────────────────────────────────────────────── */
function CropModal({ src, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(new Image());
  const dragRef   = useRef(null);
  const [zoom,      setZoom]      = useState(1);
  const [offset,    setOffset]    = useState({ x: 0, y: 0 });
  const [imgReady,  setImgReady]  = useState(false);
  const SIZE = Math.min(window.innerWidth - 48, 300);

  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => setImgReady(true);
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!imgReady) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const img    = imgRef.current;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const base  = Math.min(SIZE / img.width, SIZE / img.height);
    const scale = base * zoom;
    const dw    = img.width  * scale;
    const dh    = img.height * scale;
    const dx    = SIZE / 2 - dw / 2 + offset.x;
    const dy    = SIZE / 2 - dh / 2 + offset.y;

    // clip to circle, draw image
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    // dim outside circle
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();

    // circle border
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [zoom, offset, imgReady, SIZE]);

  function startDrag(cx, cy) {
    dragRef.current = { cx, cy, ox: offset.x, oy: offset.y };
  }
  function moveDrag(cx, cy) {
    if (!dragRef.current) return;
    const { cx: sx, cy: sy, ox, oy } = dragRef.current;
    setOffset({ x: ox + cx - sx, y: oy + cy - sy });
  }
  function endDrag() { dragRef.current = null; }

  function confirm() {
    const img    = imgRef.current;
    const OUT    = 180;
    const out    = document.createElement("canvas");
    out.width    = OUT; out.height = OUT;
    const ctx    = out.getContext("2d");
    const base   = Math.min(SIZE / img.width, SIZE / img.height);
    const scale  = base * zoom;
    const sf     = OUT / SIZE;
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img,
      (SIZE / 2 - img.width  * scale / 2 + offset.x) * sf,
      (SIZE / 2 - img.height * scale / 2 + offset.y) * sf,
      img.width * scale * sf, img.height * scale * sf
    );
    ctx.restore();
    let q = 0.85, url = out.toDataURL("image/jpeg", q);
    while (url.length > 40_000 && q > 0.3) { q -= 0.1; url = out.toDataURL("image/jpeg", q); }
    onCrop(url);
  }

  const btnBase = {
    borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-body)",
    fontSize: 15, fontWeight: 600, padding: "12px 0", border: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.92)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, gap: 0,
    }}>
      <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Crop Photo</p>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 14 }}>Drag to reposition · Pinch or slide to zoom</p>

      <canvas
        ref={canvasRef}
        width={SIZE} height={SIZE}
        style={{ borderRadius: "50%", touchAction: "none", cursor: "move", display: "block" }}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag} onMouseLeave={endDrag}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={endDrag}
      />

      <div style={{ marginTop: 22, width: SIZE, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 14 }}>🔍</span>
        <input type="range" min={1} max={3} step={0.02} value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: "#2d8b8f" }}
        />
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, minWidth: 32 }}>{zoom.toFixed(1)}×</span>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, width: SIZE }}>
        <button onClick={onCancel} style={{
          ...btnBase, flex: 1,
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.18)", color: "#fff",
        }}>Cancel</button>
        <button onClick={confirm} disabled={!imgReady} style={{
          ...btnBase, flex: 2,
          background: "linear-gradient(135deg,#2d8b8f,#9d5d9f)", color: "#fff",
          opacity: imgReady ? 1 : 0.5,
        }}>Use Photo</button>
      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function BackIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 19-7-7 7-7" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>; }
function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function ErrorIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function CameraIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}
