import { createContext, useState } from "react";

/**
 * DocumentContext
 * Global state shared across Original, Summarized, and Graph pages.
 *
 * State:
 *  - mode          "concise" | "detailed" | "bullet"
 *  - uploadedFile  File | null
 *  - pastedText    string
 *  - extractedText string   (plain text from parsed file or paste)
 *  - summary       string   (active AI-generated summary result)
 *  - summaryVariants object (summary output by mode + terms)
 *  - keyTerms      object   (graph nodes and edges)
 *  - activeTab     "original" | "summarized" | "graph"
 *  - sidebarOpen   boolean
 */

export const DocumentContext = createContext(null);

export function DocumentProvider({ children }) {
  const [mode, setMode]               = useState("concise");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pastedText, setPastedText]   = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [summary, setSummary]         = useState("");
  const [summaryVariants, setSummaryVariants] = useState({
    concise: "",
    detailed: "",
    bullet: "",
    terms: "",
  });
  const [keyTerms, setKeyTerms]       = useState({ nodes: [], edges: [] });
  const [activeTab, setActiveTab]     = useState("original");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleSidebar() {
    setSidebarOpen((v) => !v);
  }

  function resetDocument() {
    setMode("concise");
    setUploadedFile(null);
    setPastedText("");
    setExtractedText("");
    setSummary("");
    setSummaryVariants({ concise: "", detailed: "", bullet: "", terms: "" });
    setKeyTerms({ nodes: [], edges: [] });
    setActiveTab("original");
  }

  return (
    <DocumentContext.Provider
      value={{
        mode, setMode,
        uploadedFile, setUploadedFile,
        pastedText, setPastedText,
        extractedText, setExtractedText,
        summary, setSummary,
        summaryVariants, setSummaryVariants,
        keyTerms, setKeyTerms,
        activeTab, setActiveTab,
        sidebarOpen, toggleSidebar,
        resetDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

// Re-export the hook so all existing import paths stay unchanged:
//   import { useDocument } from "../context/DocumentContext"  ← still works
export { useDocument } from "../hooks/useDocument";