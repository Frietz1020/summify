import { useCallback, useState } from "react";
import { callOpenRouter } from "../services/openrouter";

const EMPTY_VARIANTS = { concise: "", detailed: "", bullet: "" };

export function useSummarizer() {
  const [summary,         setSummary]         = useState("");
  const [summaryVariants, setSummaryVariants] = useState(EMPTY_VARIANTS);
  const [keyTerms,        setKeyTerms]        = useState({ nodes: [], edges: [] });
  const [summarizing,     setSummarizing]     = useState(false);
  const [error,           setError]           = useState(null);

  const summarize = useCallback(async (text) => {
    if (!text?.trim()) return null;

    setSummarizing(true);
    setError(null);
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

      setSummaryVariants(result.variants);
      setSummary(result.variants.concise);
      setKeyTerms(result.keyTerms);

      return {
        summary: result.variants.concise,
        summaryVariants: result.variants,
        keyTerms: result.keyTerms,
      };
    } catch (err) {
      setError(err.message ?? "An error occurred during summarization.");
      return null;
    } finally {
      setSummarizing(false);
    }
  }, []);

  return { summary, summaryVariants, keyTerms, summarizing, error, summarize };
}

function parseFullResponse(raw) {
  const content = typeof raw === "string" ? raw.trim() : "";
  try {
    const parsed = JSON.parse(content);
    const variants = {
      concise:  sanitizeText(parsed.concise),
      detailed: sanitizeText(parsed.detailed),
      bullet:   sanitizeText(parsed.bullet),
    };

    const keyTerms = buildKeyTerms(parsed.nodes, parsed.edges);
    return { variants, keyTerms };

  } catch {
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