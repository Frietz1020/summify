import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";

/**
 * Ensures a valid Firebase Auth token exists before any Firestore call.
 * Prevents PERMISSION_DENIED when the auth state hasn't fully resolved yet.
 */
async function ensureAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  await user.getIdToken(/* forceRefresh= */ false);
  return user;
}

/**
 * Returns the Firestore collection ref for a user's history.
 * Path: users/{uid}/history
 */
function historyRef(uid) {
  return collection(db, "users", uid, "history");
}

/**
 * Save a completed summary to Firestore.
 */
export async function saveHistory(uid, { fileName, extractedText, summaryVariants, keyTerms }) {
  await ensureAuth();
  const docRef = await addDoc(historyRef(uid), {
    fileName:        fileName || "Pasted text",
    extractedText,
    summaryVariants,
    keyTerms,
    createdAt:       serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fetch all history records for a user, newest first.
 */
export async function getHistory(uid) {
  await ensureAuth();
  const q    = query(historyRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

/**
 * Delete a single history record.
 */
export async function deleteHistory(uid, docId) {
  await ensureAuth();
  await deleteDoc(doc(db, "users", uid, "history", docId));
}

/* ── Avatar ──────────────────────────────────────────────────────
   Stored at: users/{uid}/profile/avatar  (single document)
   Firebase Auth's photoURL only accepts http/https URLs, so we
   store the compressed data URL in Firestore instead.
──────────────────────────────────────────────────────────────── */

/**
 * Fetch the user's custom avatar data URL.
 * Returns null if no custom avatar is set.
 */
export async function getAvatar(uid) {
  await ensureAuth();
  const snap = await getDoc(doc(db, "users", uid, "profile", "avatar"));
  return snap.exists() ? (snap.data().dataURL ?? null) : null;
}

/**
 * Persist (or clear) a custom avatar data URL for the user.
 * Pass null to remove the custom avatar.
 */
export async function saveAvatar(uid, dataURL) {
  await ensureAuth();
  const ref = doc(db, "users", uid, "profile", "avatar");
  await setDoc(ref, { dataURL: dataURL ?? null, updatedAt: serverTimestamp() });
}
