# Summify

> AI-powered document summarization and knowledge graph visualization — built as a mobile-first PWA.

![Summify glassmorphism UI](https://placehold.co/800x400/0f1a2e/6c9a9e?text=Summify)

---

## ✨ Features

- **Multi-format ingestion** — paste text, upload PDF or DOCX
- **AI summaries** — short, medium, and long modes via Groq (Llama 3.3 70B)
- **Knowledge graph** — interactive key-term graph with custom SVG force simulation
- **History** — all summaries saved to Firestore and searchable
- **Profile** — editable display name and avatar (compressed client-side)
- **Glassmorphism UI** — teal-lavender-mauve design system, dark mode, dyslexic font mode
- **PWA** — installable, offline shell

---

## 🏗️ Architecture

```
summify/
├── src/                    # React (Vite) frontend
│   ├── pages/              # Route-level components (lazy-loaded)
│   ├── components/         # Shared UI components
│   ├── context/            # Auth, Document, Theme contexts
│   ├── hooks/              # useAuth, useSummarizer, useFileParser, useHistory
│   ├── services/           # Firebase, Firestore, Groq proxy client
│   └── styles/             # Global CSS (glassmorphism design system)
├── worker/                 # Cloudflare Worker — Groq API proxy
│   └── index.js
├── firebase.json           # Firebase Hosting + Firestore rules config
├── firestore.rules         # Firestore security rules
├── vercel.json             # Vercel deployment config
└── wrangler.toml           # Cloudflare Worker config
```

**Key design decisions:**
- The Groq API key **never reaches the browser** — all LLM calls are proxied through a Cloudflare Worker
- Avatars are stored as compressed JPEG data URLs in Firestore (Firebase Auth `photoURL` only accepts `http/https`)
- All app routes are `React.lazy()`-split for fast initial load
- Auth supports email/password, Google OAuth, and Magic Link (passwordless)

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Firebase](https://console.firebase.google.com/) project (Firestore + Auth enabled)
- A [Groq](https://console.groq.com/) API key
- A [Cloudflare](https://dash.cloudflare.com/) account (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/your-username/summify.git
cd summify
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` with your Firebase config and set `VITE_PROXY_URL=http://localhost:8787` for local dev.

### 3. Configure the Cloudflare Worker

```bash
# Create .dev.vars for local Worker secrets
echo "GROQ_API_KEY=gsk_your_key_here" > .dev.vars
```

### 4. Run locally

```bash
# Option A — run both servers with one command
dev.bat

# Option B — run separately
wrangler dev          # terminal 1 → Worker on :8787
npm run dev           # terminal 2 → Vite on :5173
```

Open [http://localhost:5173](http://localhost:5173).

---

## ☁️ Deployment

### Cloudflare Worker (required first)

```bash
# Deploy the proxy Worker
wrangler deploy

# Set the Groq API key as a secret (prompted interactively)
wrangler secret put GROQ_API_KEY
```

After deploying, note your Worker URL (`https://summify-proxy.<subdomain>.workers.dev`) and add it to `ALLOWED_ORIGINS` in `worker/index.js`, then redeploy.

### Option A — Vercel (recommended)

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables (see table below)
4. Deploy — Vercel auto-runs `npm run build`

### Option B — Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select existing project, public dir = dist, SPA = yes
npm run build
firebase deploy
```

### Environment variables (production)

| Variable | Description |
|---|---|
| `VITE_PROXY_URL` | Your deployed Worker URL |
| `VITE_GROQ_MODEL` | Model name (default: `llama-3.3-70b-versatile`) |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

> **Note:** Firebase config values are safe to expose in the client — they're protected by Firestore security rules and Firebase Auth, not by secrecy.

---

## 🔒 Security

- **Groq API key** — stored as a Cloudflare Worker secret, never in the frontend bundle
- **Firebase service account key** — gitignored (`*-firebase-adminsdk-*.json`)
- **Firestore rules** — users can only read/write their own `users/{uid}/**` documents
- **COOP header** — `same-origin-allow-popups` set on both Vite dev server and hosting configs to allow Firebase Google popup auth

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Styling | Vanilla CSS (glassmorphism design system), Tailwind CSS (utilities) |
| AI | Groq API (Llama 3.3 70B Versatile) |
| Proxy | Cloudflare Workers |
| Auth | Firebase Authentication (email/password, Google, Magic Link) |
| Database | Firebase Firestore |
| PDF parsing | pdfjs-dist |
| DOCX parsing | Mammoth |
| Graph | Custom SVG (force simulation, drag, pan/zoom) |
| PWA | vite-plugin-pwa |

---

## 📋 Available Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
wrangler dev       # Start Cloudflare Worker locally
wrangler deploy    # Deploy Worker to Cloudflare
firebase deploy    # Deploy to Firebase Hosting + Firestore rules
```

---

## 📄 License

ISC