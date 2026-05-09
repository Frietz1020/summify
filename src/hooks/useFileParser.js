import { useDocument } from "../context/DocumentContext";

/**
 * useFileParser
 * Parses an uploaded File into plain text using:
 *  - mammoth  → DOCX
 *  - pdfjs-dist → PDF
 *  - FileReader → TXT / plain text
 *
 * Sets extractedText in DocumentContext on success.
 *
 * Returns:
 *  - parseFile(file)  async trigger
 *  - parsing          boolean
 *  - parseError       string | null
 */
import { useState } from "react";

export function useFileParser() {
  const { setUploadedFile, setExtractedText } = useDocument();
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  async function parseFile(file) {
    if (!file) return;

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setParseError(`File exceeds ${MAX_SIZE_MB}MB limit.`);
      return;
    }

    setParsing(true);
    setParseError(null);
    setUploadedFile(file);

    const ext = file.name.split(".").pop().toLowerCase();

    try {
      let text = "";

      if (ext === "txt") {
        text = await readAsText(file);
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (ext === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        // Point worker to the bundled worker file
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item) => item.str).join(" "));
        }
        text = pages.join("\n\n");
      } else {
        throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
      }

      setExtractedText(text.trim());
    } catch (err) {
      console.error("File parse error:", err);
      setParseError(err.message || "Failed to read file.");
    } finally {
      setParsing(false);
    }
  }

  return { parseFile, parsing, parseError };
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}
