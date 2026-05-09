import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function historyRef(uid) {
  return collection(db, "users", uid, "history");
}

/**
 * @param {string} uid
 * @param {{ fileName: string, extractedText: string, summaryVariants: object, keyTerms: object }} record
 * @returns {Promise<string>} the new document ID
 */
export async function saveHistory(uid, { fileName, extractedText, summaryVariants, keyTerms }) {
  const docRef = await addDoc(historyRef(uid), {
    fileName:       fileName || "Pasted text",
    extractedText,
    summaryVariants,
    keyTerms,
    createdAt:      serverTimestamp(),
  });
  return docRef.id;
}

/**
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export async function getHistory(uid) {
  const q   = query(historyRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

/**
 * @param {string} uid
 * @param {string} docId
 */
export async function deleteHistory(uid, docId) {
  await deleteDoc(doc(db, "users", uid, "history", docId));
}