# CredChain — Deployment Guide (Week 5)

Going live is **configuration, not code**. The same source runs everywhere; you
only swap `localhost` for production URLs via **environment variables**. Never
hardcode a production URL or a secret in source — set them in the platform
dashboards (Vercel / Railway / Atlas).

Production topology: **Vercel** (frontend) → **Railway** (backend + 2 Python
engines) → **MongoDB Atlas** + **Solana Devnet**.

---

## Deploy in this order

You must deploy bottom-up because each layer needs the URL of the one below it.

### 1. MongoDB Atlas (database)
- Create a free cluster, a DB user + password, and add `0.0.0.0/0` to
  **Network Access** (so Railway can reach it).
- Copy the connection string:
  `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/credchain`
  (URL-encode special characters in the password.)

### 2. AI CV Engine → Railway (`/ai-cv-engine`)
- New Railway service, **root directory** = `ai-cv-engine`.
- **Start command:** `uvicorn src.api:app --host 0.0.0.0 --port $PORT`
- Railway installs `requirements.txt` automatically (fastapi, uvicorn, fpdf2, pydantic, requests).
- **Env vars:** `ALLOWED_ORIGINS` = your backend's Railway URL (comma-separated; localhost is always allowed).
- Note the public URL → this is `AI_CV_ENGINE_URL`.

### 3. AI Insights Engine → Railway (`/ai-insights-engine`)
- New Railway service, **root directory** = `ai-insights-engine`.
- **Start command:** `uvicorn src.api:app --host 0.0.0.0 --port $PORT`
- **Env vars:**
  - `OPENAI_API_KEY` = your key (**only** here — never in git). Without it the
    service still returns the safe empty template.
  - `ALLOWED_ORIGINS` = your backend's Railway URL.
- Note the public URL → this is `AI_INSIGHTS_ENGINE_URL`.

### 4. Backend API → Railway (`/backend`)
- New Railway service, **root directory** = `backend`.
- **Start command:** `npm start` (Railway runs `npm install` first). Code already
  binds `process.env.PORT`.
- **Env vars:**
  | Variable | Value |
  |---|---|
  | `MONGO_URI` | your Atlas connection string |
  | `JWT_SECRET` | a long random secret |
  | `JWT_EXPIRES_IN` | `7d` |
  | `SOLANA_RPC_URL` | `https://api.devnet.solana.com` |
  | `AI_CV_ENGINE_URL` | the CV engine's Railway URL (step 2) |
  | `AI_INSIGHTS_ENGINE_URL` | the insights engine's Railway URL (step 3) |
  | `CLIENT_ORIGIN` | your Vercel URL — **set this LAST** (step 6) |
  | `SOLANA_WALLET_PATH` | *(optional)* path to a funded Devnet wallet to enable on-chain writes |
- Test: open `https://<backend>.up.railway.app/health` → `{"status":"healthy"}`.

### 5. Frontend → Vercel (`/frontend`)
- Import the GitHub repo into Vercel, **root directory** = `frontend`.
  Vercel auto-detects Vite (build `npm run build`, output `dist`).
- **Env vars (Vite only exposes `VITE_*`, and they bake in at build time — redeploy after adding):**
  - `VITE_API_BASE_URL` = your Railway backend URL (https, **no** trailing slash)
  - `VITE_SOCKET_URL` = the same Railway backend URL
- Deploy → note your Vercel URL.

### 6. Close the loop (CORS + Socket.io)
- Back in the **backend** Railway service, set `CLIENT_ORIGIN` to your **exact**
  Vercel URL (https, no trailing slash). This single var drives both the API CORS
  and the Socket.io CORS.
- Redeploy the backend, then hard-refresh the Vercel site.
- Until `CLIENT_ORIGIN` is set, the live site throws CORS errors — that's expected.

---

## Live demo run-of-show
1. Register a fresh user → land on the dashboard.
2. Issuer issues a credential to that user.
3. User accepts → backend hashes it → Solana Devnet Memo write → open the
   `explorer.solana.com` link proving it's on-chain. *(Requires a funded
   `SOLANA_WALLET_PATH`; otherwise the credential is accepted off-chain.)*
4. Generate CV → download the produced PDF.
5. Analyze skills → real `strong_skills` / `career_paths` / `next_steps`
   *(requires `OPENAI_API_KEY`; otherwise safe empty arrays).*
6. Open two windows → send a live chat message that appears instantly.
7. Close with the public profile / QR link.

## Secrets — never commit
`.env`, `OPENAI_API_KEY`, the JWT secret, and any `*-wallet.json` are all
git-ignored. Secrets live **only** in the platform dashboards. Rotate any key
shown on screen during a demo.
