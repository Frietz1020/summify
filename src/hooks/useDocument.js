import { useContext } from "react";
import { DocumentContext } from "../context/DocumentContext";

/**
 * useDocument — convenience hook for DocumentContext.
 *
 * Separated from DocumentContext.jsx so Vite Fast Refresh does not
 * flag the file as incompatible (a file cannot export both a component
 * and a hook and satisfy HMR's consistent-components-exports rule).
 */
export function useDocument() {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDocument must be used inside <DocumentProvider>");
  return ctx;
}