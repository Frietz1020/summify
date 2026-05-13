import { useCallback, useState } from "react";
import { callOpenRouter } from "../services/openrouter";
import { useDocument } from "../context/DocumentContext";

const EMPTY_VARIANTS = { concise: "", detailed: "", bullet: "", terms: "" };

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
              "# Role: Senior Knowledge Analyst & Information Architect\n" +
              "# Task: Multi-Format Content Distillation\n\n" +
              "You are a Senior Knowledge Analyst specializing in information architecture. " +
              "Transform the provided text into three distinct, high-utility summary formats " +
              "designed for general audience comprehension.\n\n" +

              "## OUTPUT CONTRACT\n" +
              "Return ONLY a single valid JSON object — no markdown fences, no backticks, no explanation:\n" +
              "{\n" +
              '  "concise": "<BLUF paragraph — plain text, bold critical takeaway with **asterisks**>",\n' +
              '  "detailed": "<multi-paragraph abstract — narrative prose, subheadings if long>",\n' +
              '  "bullet": "<scannable markdown list — parallel verbs, fragments>",\n' +
              '  "terms": "<key terms: each entry on its own line as: **Term Name** — Definition. Relevance to document. Separate entries with \\n\\n>",\n' +
              '  "nodes": [{ "id": "<slug>", "label": "<readable term>" }],\n' +
              '  "edges": [{ "source": "<node id>", "target": "<node id>", "label": "<relationship>" }]\n' +
              "}\n\n" +

              "## I. SUMMARY ARCHITECTURES\n\n" +

              "### 1. Concise Summary (The \"Elevator Pitch\")\n" +
              "- Logic: Distillation. Filter out everything except the primary conclusion (BLUF).\n" +
              "- Convention: Active verbs only. NEVER use introductory fluff such as " +
              "\"This article explains,\" \"In this text,\" or \"The author discusses.\"\n" +
              "- Layout: As brief as the content allows — one tight paragraph for simple topics, " +
              "two to three sentences for dense material. Scale length to information density, not a word cap.\n" +
              "- Format: Plain text. Bold the single most critical takeaway using **double asterisks**.\n\n" +

              "### 2. Detailed Summary (The \"Comprehensive Abstract\")\n" +
              "- Logic: Structural Mapping. Mirror the original flow: Introduction → Body → Conclusion.\n" +
              "- Convention: Act as a proxy for the source — a reader must not need the original. " +
              "Maintain the source voice and context; include secondary evidence and specific data points.\n" +
              "- Layout: Scale paragraph count to source complexity. " +
              "Simple or short documents: 2 paragraphs. Standard documents: 3 paragraphs. " +
              "Dense, multi-topic, or long documents: 4 or more paragraphs as needed. " +
              "Separate paragraphs with \\n\\n. Use smooth transitions between ideas. " +
              "Add subheadings when the content spans clearly distinct sections.\n" +
              "- Format: Narrative prose only. No bullet points.\n\n" +

              "### 3. Bulleted Summary (The \"Scannable Guide\")\n" +
              "- Logic: Categorization. Break information into discrete, non-linear chunks.\n" +
              "- Convention: Strict parallelism — every bullet MUST start with the same part of speech " +
              "(prefer action verbs: e.g. Identifies…, Reduces…, Enables…). Fragments over full sentences.\n" +
              "- Layout: Scale bullet count generously to content length — " +
              "Very short content (<300 words): 5-7 bullets. " +
              "Short content (300-600 words): 7-10 bullets. " +
              "Standard content (600-1500 words): 10-15 bullets. " +
              "Long content (>1500 words): 15-22 bullets or more. " +
              "Cover ALL key points — never truncate for brevity. " +
              "Order by importance (most critical first). Each line starts with '- '. No trailing punctuation.\n" +
              "- Format: Markdown list. Use numbered sequences ONLY for chronological processes.\n\n" +

              "## II. EXECUTION RULES\n" +
              "1. Audience: Write for the General Person. Define technical jargon inline. " +
              "Prioritize clarity over academic tone.\n" +
              "2. Tone: Professional yet accessible.\n" +
              "3. Negative Constraints:\n" +
              "   - DO NOT hallucinate details not present in the source.\n" +
              "   - DO NOT provide meta-commentary about the text.\n" +
              "   - DO NOT use passive voice in the Concise Summary.\n" +
              "4. Done When: Output contains all three distinct sections, adheres to formatting rules " +
              "(bolding, parallelism), and is free of introductory filler.\n\n" +

              "## III. KEY TERMS\n" +
              "- terms: Extract 10 to 20 key terms/concepts from the document. " +
              "For each: **Term Name** — One-sentence definition in plain language. One sentence on its relevance or role in this document. " +
              "Separate each entry with \\n\\n. Scale count with document complexity.\n\n" +

              "## IV. GRAPH\n" +
              "- nodes: Extract 12 to 20 key terms scaled to document complexity. Short/simple: 8-12 nodes. Standard: 12-16. Long/complex: 16-20. Include main concepts, sub-concepts, entities, and key processes. (id = lowercase-hyphen-slug, label = readable 1-3 word term)\n" +
              "- edges: Generate 4-8 directional inter-node relationships (not just spoke connections) to enable nested hierarchical graph layout.\n" +

              "Output raw JSON only. Absolutely no other text.",
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
    const candidate = JSON.parse(repairJSON(stripped));

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
      terms:    sanitizeText(parsed.terms),
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

/**
 * repairJSON — fixes literal newlines inside JSON string values.
 *
 * LLMs frequently emit multi-line strings like:
 *   "bullet": "- Point one\n- Point two\n- Point three"
 * where the \n characters are REAL newlines, not the two-char escape sequence.
 * Real newlines inside JSON strings are invalid per the spec, causing JSON.parse
 * to throw even though the overall structure is otherwise correct.
 *
 * This walks the string character-by-character, tracking whether we are inside
 * a JSON string, and replaces bare \n / \r only within string values.
 */
function repairJSON(str) {
  let inString = false;
  let escaped  = false;
  let out      = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (escaped) {
      out     += ch;
      escaped  = false;
      continue;
    }

    if (ch === "\\" && inString) {
      out     += ch;
      escaped  = true;
      continue;
    }

    if (ch === "\"") {
      out      += ch;
      inString  = !inString;
      continue;
    }

    if (inString && ch === "\n") { out += "\\n";  continue; }
    if (inString && ch === "\r") { out += "\\r";  continue; }
    if (inString && ch === "\t") { out += "\\t";  continue; }

    out += ch;
  }

  return out;
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