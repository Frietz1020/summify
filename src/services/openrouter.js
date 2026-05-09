/**
 * PROXY URL — points to the Cloudflare Worker that holds the Groq API key.
 * The key is NEVER shipped to the browser.
 *
 * Local dev:  set VITE_PROXY_URL=http://localhost:8787 (wrangler dev)
 * Production: set VITE_PROXY_URL=https://summify-proxy.<your-subdomain>.workers.dev
 */
const PROXY_URL = import.meta.env.VITE_PROXY_URL;
const MODEL     = import.meta.env.VITE_OPENROUTER_MODEL ?? 'llama-3.3-70b-versatile';

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {'text' | 'json'} responseFormat
 * @returns {Promise<string>}
 */

export async function callOpenRouter(messages, responseFormat = 'text') {
  if (!PROXY_URL) throw new Error('Missing VITE_PROXY_URL in environment. See worker/index.js for setup.');

  const resolvedMessages = responseFormat === 'json'
    ? enforceJsonInSystemPrompt(messages)
    : messages;

  const body = {
    model: MODEL,
    messages: resolvedMessages,
    max_tokens: 4096,
    temperature: 0.3,
  };

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;

    if (status === 429) {
      throw new Error('Rate limit reached. Please wait a moment and try again.');
    }

    throw new Error(err?.error?.message ?? `API error ${status}`);
  }

  const data    = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model.');
  return responseFormat === 'json' ? stripCodeFences(content) : content;
}

function enforceJsonInSystemPrompt(messages) {
  const JSON_SUFFIX =
    '\n\nCRITICAL: Respond with raw JSON only. ' +
    'No markdown fences, no backticks, no explanation, no preamble. ' +
    'Your entire response must be a single valid JSON object.';

  const hasSystem = messages.some((m) => m.role === 'system');

  if (hasSystem) {
    return messages.map((m) =>
      m.role === 'system' ? { ...m, content: m.content + JSON_SUFFIX } : m
    );
  }

  return [{ role: 'system', content: JSON_SUFFIX.trim() }, ...messages];
}

function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}