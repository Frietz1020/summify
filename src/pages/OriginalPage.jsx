import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell, {
  ClipboardIcon,
  FileTextIcon,
  SparklesIcon,
  SummaryFooter,
  UploadIcon,
} from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";
import { useAuthContext } from "../context/AuthContext";
import { useFileParser } from "../hooks/useFileParser";
import { useSummarizer } from "../hooks/useSummarizer";
import { saveHistory } from "../services/firestore";

export default function OriginalPage() {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();

  const {
    uploadedFile,
    setUploadedFile,
    extractedText,
    setExtractedText,
    setPastedText,
    setSummary,
    setSummaryVariants,
    setKeyTerms,
    setActiveTab,
  } = useDocument();

  const { parseFile, parsing, parseError } = useFileParser();
  const { summarize, summarizing, error: summarizeError } = useSummarizer();

  const hasContent = extractedText.trim().length > 0;
  const wordCount = useMemo(() => countWords(extractedText), [extractedText]);

  useEffect(() => {
    setActiveTab("original");
  }, [setActiveTab]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (file) parseFile(file);
    event.target.value = "";
  }

  async function handlePasteClick() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setPastedText(text.trim());
        setExtractedText(text.trim());
      }
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function handleTextChange(event) {
    const value = event.target.value;
    setPastedText(value);
    setExtractedText(value);
    if (!value.trim()) setUploadedFile(null);
  }

  function clearUploadedFile() {
    setUploadedFile(null);
  }

  async function handleSummarize() {
    const result = await summarize(extractedText);
    if (!result) return;

    setSummary(result.summary);
    setSummaryVariants(result.summaryVariants);
    setKeyTerms(result.keyTerms);
    setActiveTab("summarized");

    // Persist to Firestore (fire-and-forget — don't block navigation)
    if (currentUser) {
      saveHistory(currentUser.uid, {
        fileName:       uploadedFile?.name ?? null,
        extractedText,
        summaryVariants: result.summaryVariants,
        keyTerms:        result.keyTerms,
      }).catch((err) => console.error("saveHistory failed:", err));
    }

    navigate("/app/summarized");
  }

  return (
    <MobileShell
      topTabs
      footer={
        <SummaryFooter
          wordCount={wordCount}
          actionLabel="Summarize"
          actionIcon={<SparklesIcon />}
          disabled={!hasContent}
          loading={summarizing}
          onAction={handleSummarize}
        />
      }
    >
      <div className={`summary-page${hasContent ? "" : " summary-page--empty"}`}>
        {uploadedFile && (
          <div className="uploaded-file">
            <button type="button" onClick={clearUploadedFile} aria-label="Remove uploaded file">
              <span aria-hidden="true">x</span>
            </button>
            <FileTextIcon />
            <span>{uploadedFile.name}</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="summary-textarea"
          value={extractedText}
          onChange={handleTextChange}
          placeholder="Write or paste a text or upload a file and press 'summarize' . . ."
          aria-label="Original text"
        />

        {!hasContent && (
          <div className="summary-actions">
            <button
              type="button"
              className="summary-action"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
            >
              <UploadIcon />
              <span>{parsing ? "Reading..." : "Upload File"}</span>
            </button>
            <button type="button" className="summary-action" onClick={handlePasteClick}>
              <ClipboardIcon />
              <span>Paste Text</span>
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        {parseError && <p className="summary-hint">{parseError}</p>}
        {summarizeError && <p className="summary-hint">{summarizeError}</p>}
      </div>
    </MobileShell>
  );
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}