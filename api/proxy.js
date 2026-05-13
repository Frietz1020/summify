/**
 * Vercel Serverless Function — Groq API Proxy
 *
 * Endpoint: POST /api/proxy
 *
 * Required server-side env var (set in Vercel dashboard, NOT VITE_ prefixed):
 *   GROQ_API_KEY
 *
 * The frontend calls this when VITE_PROXY_URL=/api/proxy (Vercel deployment).
 * For Cloudflare Workers, set VITE_PROXY_URL to the worker URL instead.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export default async function handler(req, res) {
  // ── CORS ───────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ── API key ────────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set in Vercel environment variables.");
    return res.status(500).json({ error: "Server misconfiguration: missing API key." });
  }

  // ── Proxy ──────────────────────────────────────────────────────
  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const contentType = groqRes.headers.get("content-type") ?? "application/json";
    const text = await groqRes.text();

    res.setHeader("Content-Type", contentType);
    return res.status(groqRes.status).send(text);
  } catch (err) {
    console.error("Proxy fetch error:", err);
    return res.status(502).json({ error: "Upstream error", details: err.message });
  }
}
