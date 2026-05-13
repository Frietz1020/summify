/**
 * Shared text utilities
 * Import from here — do not duplicate in individual pages.
 */

/**
 * Count words in a string.
 * Returns 0 for empty or whitespace-only input.
 */
export function countWords(text) {
  return text?.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Convert a bullet summary string into an array of clean line strings.
 *
 * Handles all separator formats LLMs commonly emit:
 *   - Real newline characters (\n)
 *   - Literal two-char sequence \n (backslash + n) — model emits "\\n" in raw text
 *   - Windows \r\n line endings
 *   - Pipe | separators (rare model fallback)
 *
 * Strips leading -, *, •, or numbered list markers before returning.
 */
export function toBulletItems(text) {
  if (!text?.trim()) return [];

  // Normalise all separator variants into a real newline
  const normalised = text
    .replace(/\\n/g, "\n")   // literal backslash-n → real newline
    .replace(/\r\n/g, "\n")  // Windows CRLF
    .replace(/\r/g, "\n")    // bare CR
    .replace(/\|/g, "\n");   // pipe separator fallback

  return normalised
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*[-*•]\s*/, "")        // strip bullet markers (- * •)
        .replace(/^\s*\d+[.):\]]\s*/, "")   // strip numbered markers 1. 1) 1: 1]
        .trim()
    )
    .filter(Boolean);
}