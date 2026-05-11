import { useCallback, useState } from "react";
import { callOpenRouter } from "../services/openrouter";
import { useDocument } from "../context/DocumentContext";

const EMPTY_VARIANTS = { concise: "", detailed: "", bullet: "" };

/**
 * useSummarizer
 *
 * Calls the LLM, parses the response, and writes the result
 * directly into DocumentContext. No local summary/keyTerms state —
 * the context is the single source of truth.
 *
 * Returns:
 *  - summarizing  boolean — true while the request is in-flight
 *  - error        string | null
 *  - summarize(text) → Promise<result | null>
 */
export function useSummarizer() {
  const {
    setSummary,
    setSummaryVariants,
    setKeyTerms,
  } = useDocument();

  const [summarizing, setSummarizing] = useState(false);
  const [error,       setError]       = useState(null);

  const summarize = useCallback(async (text) => {
    if (!text?.trim()) return null;

    setSummarizing(true);
    setError(null);

    // Clear stale context state before the new request
    setSummary("");
    setSummaryVariants(EMPTY_VARIANTS);
    setKeyTerms({ nodes: [], edges: [] });

    try {
      const raw = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You are a professional document summarizer and key term extractor. " +
              "Return ONLY a single valid JSON object with this exact shape — no markdown fences, no backticks, no explanation:\n" +
              "{\n" +
              '  "concise": "<one short paragraph summary>",\n' +
              '  "detailed": "<three paragraph summary separated by \\n\\n>",\n' +
              '  "bullet": "<3 to 6 bullet lines each starting with - >",\n' +
              '  "nodes": [{ "id": "<string>", "label": "<string>" }],\n' +
              '  "edges": [{ "source": "<node id>", "target": "<node id>", "label": "<relationship>" }]\n' +
              "}\n" +
              "Rules:\n" +
              "- concise: one tight paragraph, under 80 words\n" +
              "- detailed: exactly 3 paragraphs separated by \\n\\n\n" +
              "- bullet: 3 to 6 lines, each starting with '- '\n" +
              "- nodes: 6 to 12 key terms from the document\n" +
              "- edges: meaningful relationships between nodes\n" +
              "- Output raw JSON only. No other text.",
          },
          {
            role: "user",
            content: `Process this document:\n\n${text}`,
          },
        ],
        "json"
      );

      const result = parseFullResponse(raw);

      // Write directly to context — single source of truth
      setSummaryVariants(result.variants);
      setSummary(result.variants.concise);
      setKeyTerms(result.keyTerms);

      return {
        summary:         result.variants.concise,
        summaryVariants: result.variants,
        keyTerms:        result.keyTerms,
      };
    } catch (err) {
      setError(err.message ?? "An error occurred during summarization.");
      return null;
    } finally {
      setSummarizing(false);
    }
  }, [setSummary, setSummaryVariants, setKeyTerms]);

  return { summarizing, error, summarize };
}

function parseFullResponse(raw) {
  // Clean only what's necessary — BOM and leading/trailing whitespace.
  // Do NOT use multiline regex flags on fence stripping — they corrupt JSON body.
  const content = (typeof raw === "string" ? raw : "")
    .replace(/^\uFEFF/, "")   // BOM
    .trim();

  // Strip code fences only if the string actually starts/ends with them
  const stripped = content.startsWith("```")
    ? content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim()
    : content;

  let parsed = null;
  try {
    const candidate = JSON.parse(stripped);

    // Guard: double-encoded — concise field is itself a JSON string
    if (candidate && typeof candidate.concise === "string") {
      const innerTrim = candidate.concise.trim();
      if (innerTrim.startsWith("{")) {
        try { parsed = JSON.parse(innerTrim); }
        catch { parsed = candidate; }
      } else {
        parsed = candidate;
      }
    } else {
      parsed = candidate;
    }
  } catch {
    // Not valid JSON — fall through to plain text fallback
  }

  if (parsed && typeof parsed === "object" && parsed.concise) {
    const variants = {
      concise:  sanitizeText(parsed.concise),
      detailed: sanitizeText(parsed.detailed),
      bullet:   sanitizeText(parsed.bullet),
    };
    const keyTerms = buildKeyTerms(parsed.nodes, parsed.edges);
    return { variants, keyTerms };
  }

  // Plain text fallback
  const variants = {
    concise:  content,
    detailed: content,
    bullet:   content
      .split(/\n{2,}/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((line) => `- ${line}`)
      .join("\n"),
  };
  return { variants, keyTerms: { nodes: [], edges: [] } };
}

function buildKeyTerms(rawNodes, rawEdges) {
  const nodes = Array.isArray(rawNodes)
    ? rawNodes
        .filter((n) => n?.id && n?.label)
        .map((n) => ({ id: String(n.id), label: String(n.label) }))
    : [];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(rawEdges)
    ? rawEdges
        .filter((e) => e?.source && e?.target && nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e) => ({
          source: String(e.source),
          target: String(e.target),
          label:  sanitizeText(e.label),
        }))
    : [];

  return { nodes, edges };
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}