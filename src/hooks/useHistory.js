import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext";
import { getHistory, deleteHistory } from "../services/firestore";

export function useHistory() {
  const { currentUser } = useAuthContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const refresh = useCallback(async () => {
    if (!currentUser) { setRecords([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory(currentUser.uid);
      setRecords(data);
    } catch (err) {
      console.error("useHistory fetch error:", err);
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { refresh(); }, [refresh]);

  const remove = useCallback(async (docId) => {
    if (!currentUser) return;
    setRecords((prev) => prev.filter((r) => r.id !== docId));
    try {
      await deleteHistory(currentUser.uid, docId);
    } catch (err) {
      console.error("useHistory delete error:", err);
      refresh();
    }
  }, [currentUser, refresh]);

  return { records, loading, error, remove, refresh };
}