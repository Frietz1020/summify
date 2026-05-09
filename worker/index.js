/**
 * Summify — Groq API Proxy Worker
 *
 * Deploy to Cloudflare Workers. Set the secret:
 *   wrangler secret put GROQ_API_KEY
 *
 * The client never sees the key. All LLM calls go through here.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Origins allowed to call this worker. Add your production domain here. */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  // 'https://your-production-domain.com',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin);
    }

    // Parse and forward the request body to Groq
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON body' }), 400, origin);
    }

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await groqRes.text();
    return corsResponse(data, groqRes.status, origin, groqRes.headers.get('content-type'));
  },
};

function corsResponse(body, status, origin, contentType = 'application/json') {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return new Response(body, {
    status,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
