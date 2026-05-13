/**
 * Summify — Cloudflare Worker
 *
 * Route:
 *   POST /  → Groq API proxy (LLM calls)
 *
 * Secrets (set via: wrangler secret put GROQ_API_KEY):
 *   GROQ_API_KEY  — Groq API key
 *
 * Local dev: add GROQ_API_KEY=... to .dev.vars
 *
 * ALLOWED_ORIGINS_EXTRA env var (optional):
 *   Comma-separated extra origins, e.g. "https://myapp.com,https://staging.myapp.com"
 *   Set via: wrangler secret put ALLOWED_ORIGINS_EXTRA
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const BASE_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://summify.vercel.app",
];

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  // Always allow localhost and known production domains
  if (BASE_ORIGINS.includes(origin)) return true;
  // Allow all *.vercel.app preview deploys
  if (/^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/summify[^.]*\.vercel\.app$/.test(origin)) return true;
  // Allow extra origins from env
  const extra = (env.ALLOWED_ORIGINS_EXTRA ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return extra.includes(origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";

    // ── Preflight ─────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, origin, env);
    }

    if (request.method !== "POST") {
      return corsResponse(JSON.stringify({ error: "Method not allowed" }), 405, origin, env);
    }

    // ── Parse body ────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: "Invalid JSON body" }), 400, origin, env);
    }

    // ── Validate API key ──────────────────────────────────────
    if (!env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set. Add it to .dev.vars (local) or via `wrangler secret put GROQ_API_KEY`.");
      return corsResponse(JSON.stringify({ error: "Server misconfiguration: missing API key." }), 500, origin, env);
    }

    // ── Proxy to Groq ─────────────────────────────────────────
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data        = await groqRes.text();
    const contentType = groqRes.headers.get("content-type") ?? "application/json";

    return corsResponse(data, groqRes.status, origin, env, contentType);
  },
};

/* ── CORS helper ──────────────────────────────────────────────── */
function corsResponse(body, status, origin, env, contentType = "application/json") {
  const allowed      = isAllowedOrigin(origin, env);
  const allowOrigin  = allowed ? origin : BASE_ORIGINS[0];
  return new Response(body, {
    status,
    headers: {
      "Content-Type":                 contentType,
      "Access-Control-Allow-Origin":  allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}