# CredChain — Week 1 Notes

This file documents what was built/verified for Week 1 and exactly how to run it.

---

## 1. What was done

### 🟢 Ebukah — Frontend (the deliverable)
Built the Login + Register screens in React + Tailwind, wired to the existing
`frontend/src/services/api.js` (no new axios instance created).

**Files created:**
- `frontend/src/components/LoginForm.jsx` — email + password. Calls `login()`, saves the
  returned token to `localStorage['credchain_token']`, shows loading + success/error states.
- `frontend/src/components/RegisterForm.jsx` — name, email, password, role dropdown
  (student / issuer / employer). Calls `register()`, saves token, shows success/error.

**File updated:**
- `frontend/src/App.jsx` — a Login / Register tab toggle inside a centered Tailwind card,
  purple `credchain-primary` button, plus a small live "Backend API" status footer.

> Nothing outside `/frontend` was edited. The shared plumbing (routes, CORS, ports,
> proxies, `solana.js`, `services/api.js`) was left untouched.

### ⚙️ Setup
- Installed Node dependencies: root + backend + frontend.
- Set up the **Insights engine** Python venv (`ai-insights-engine/venv`).

### 🟣 Zhavia — Insights engine (verified)
- `POST http://localhost:8002/analyze-skills` → `{"strong_skills":[],"career_paths":[],"next_steps":[]}` ✅
- Through the backend proxy `POST http://localhost:5000/api/ai/analyzeSkills` → same template,
  wrapped as `{success, source, data}` ✅ (proves the full frontend → backend → insights pipe).

### 🟤 Kuro — Backend (verified)
- `GET /` → `200 ok`
- `GET /health` → `healthy` (`mongo: disconnected` is expected — no local MongoDB; the server
  is designed to keep running without it)
- `POST /api/auth/login` → mock JWT response
- Frontend production build passes (all new components compile).

### 🔵 Tony — CV engine (PDF)
Builds real one-page PDF CVs with fpdf2 at `POST /generate-cv`. Re-themed to the
shared CredChain **navy + blue** palette (navy section bars, blue header rule).

### 🎨 CV Studio — designed CV image + Studio UI (integrated into the CV engine)
A second CV format that ships *inside the same* `ai-cv-engine` service, so this
contribution runs as a first-class part of Week 1:

**Files (now under `ai-cv-engine/src/`):**
- `cv_render.py` — a Pillow renderer that turns student data into a designed **PNG**
  CV: navy sidebar with an initials avatar, contact + skills, and a main column with
  Profile and Achievements. This is the original CV Studio renderer, unchanged.
- `studio.py` — the **CV Studio** single-page web UI (`STUDIO_HTML`): a form with a
  live preview + Download PNG button.

**Wired into `ai-cv-engine/src/api.py`:**
- `POST /generate-cv/image` → streams the designed PNG (accepts skills/achievements as
  a list *or* a comma/line-separated string).
- `GET /studio` → serves the Studio UI (it calls `/generate-cv/image` on the same origin).

Its **navy + blue** palette is now the canonical CredChain brand — the PDF CV and the
React app (`frontend/tailwind.config.js`) were updated to match it. `pillow` was added
to `requirements.txt` (already present in the engine venv).

---

## 2. How to run it

> ⚠️ Do **not** open `index.html` in the browser directly — you'll get a blank white page.
> This is a Vite/React app; it must be served by the dev server and opened at a `localhost` URL.

Use **Git Bash**. Each server runs in its own terminal; stop one with **Ctrl + C**.

### Option A — just the Login/Register app (2 terminals) ✅ recommended
The auth screens only need the backend + frontend.

**Terminal 1 — backend:**
```bash
cd "/c/Chris Stuff/CredChain/backend"
npm run dev
```

**Terminal 2 — frontend:**
```bash
cd "/c/Chris Stuff/CredChain/frontend"
npm run dev
```

Then open **http://localhost:3000**. Fill a form, submit, and you'll get the mock success
back (check the browser DevTools → Console / Network tab).

### Option B — full machine, one command (all 4 services)
```bash
cd "/c/Chris Stuff/CredChain"
npm run dev
```
Caveats on this machine:
- **CV engine (Tony's, port 8001)** isn't set up → that stream will crash. Harmless; not
  needed for login.
- **Insights engine (port 8002)**: `npm run dev` calls a bare `uvicorn` that isn't on your
  system PATH (it lives in the venv), so that stream may say *"uvicorn not recognized."*
  Run it on its own instead (below) when you need skill insights.

### Running the Insights engine on its own (port 8002)
```bash
cd "/c/Chris Stuff/CredChain/ai-insights-engine"
./venv/Scripts/python.exe -m uvicorn src.api:app --port 8002
```

### Running the CV engine + CV Studio on its own (port 8001)
The engine venv is set up (fastapi / uvicorn / fpdf2 / pillow all installed into it).
```bash
cd "/c/Chris Stuff/CredChain/ai-cv-engine"
./venv/Scripts/python.exe -m uvicorn src.api:app --port 8001
```
Then:
- Open the **CV Studio** at **http://localhost:8001/studio** → fill the form → *Generate
  CV image* → live PNG preview + Download.
- PDF CV: `POST http://localhost:8001/generate-cv?format=pdf`
- PNG CV (raw): `POST http://localhost:8001/generate-cv/image`

---

## 3. Quick test commands (optional)

With the servers running, in another Git Bash terminal:

```bash
# Backend alive
curl http://localhost:5000/
curl http://localhost:5000/health

# Mock login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@credchain.io","password":"secret123"}'

# Insights (needs the insights engine running)
curl -X POST http://localhost:8002/analyze-skills \
  -H "Content-Type: application/json" \
  -d '{"skills":["React","Solana","Public Speaking"]}'
```

---

## 4. Fixed ports (never change these)

| Service          | URL                     |
|------------------|-------------------------|
| Frontend         | http://localhost:3000   |
| Backend API      | http://localhost:5000   |
| CV Engine (Tony) | http://localhost:8001   |
| Insights (Zhavia)| http://localhost:8002   |

**"Port already in use"?** A previous server is still running. Find and stop it
(handbook Error A) — do not change the port number.

---

## 5. Known environment note (important for later weeks)

This machine only has **Python 3.14** and no Rust toolchain. The AI engines' pinned
`requirements.txt` (fastapi 0.115 / pydantic 2.9) have **no wheels for Python 3.14**, so
`pip install -r requirements.txt` stalls trying source builds it can't finish.

Both AI venvs were made to work by installing current wheel-having versions **into the
venv only** (without editing the pinned files):
```bash
# Insights engine
cd "/c/Chris Stuff/CredChain/ai-insights-engine"
./venv/Scripts/python.exe -m pip install --only-binary=:all: fastapi "uvicorn[standard]" requests

# CV engine (now also needs pillow for the CV Studio image renderer)
cd "/c/Chris Stuff/CredChain/ai-cv-engine"
./venv/Scripts/python.exe -m pip install --only-binary=:all: fastapi "uvicorn[standard]" fpdf2 pillow requests
```
The proper long-term fix is for Kuro to update the version pins (or use Python 3.12).

---

## 6. Not done (needs you / a human)

- **Git steps** (fork, clone, branch, commit, PR) — this folder isn't a git repo locally and
  GitHub actions need your account. When ready: make a `week-1-<name>` branch and stage **only**
  `frontend/`.
- **Browser smoke test** — run Option A above, open http://localhost:3000, submit the form.
