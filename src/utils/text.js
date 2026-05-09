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
 * Strips leading -, *, or numbered list markers.
 */
export function toBulletItems(text) {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*[-*]\s+/, "")
        .replace(/^\s*\d+[.)]\s+/, "")
        .trim()
    )
    .filter(Boolean);
}