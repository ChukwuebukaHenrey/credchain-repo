# CredChain — Run & Troubleshoot Guide (v2 UI)

The stack: **MongoDB** (:27017) → **backend** (Express, :5000) → **CredChain-Repo-v2 UI** (Vite, :5173).
Optional AI engines: CV (:8001), Insights (:8002).

---

## 1. Normal startup

```bash
# 0. MongoDB must be running first (once per boot — see §2 if unsure)
C:\tools\mongodb\mongodb-win32-x86_64-windows-8.0.4\bin\mongod.exe --dbpath C:\tools\mongodb\data

# 1. Everything else, from C:\Users\ADMIN\credchain-repo
npm run dev:v2
```

`dev:v2` = free ports (3000/5000/5173/8001/8002) → seed demo data → backend + v2 UI together.
Open **http://localhost:5173**.

Healthy startup looks like:
- `[seed] ✅ done. … Seeded demo users: 23`
- `[backend] ✅ MongoDB connected` and `Server listening on port 5000`
- `[ccv2] VITE v6.x ready in …ms → Local: http://localhost:5173/`

Sanity URL: http://localhost:5000/api/v1/health → should say `"db":"connected"`.

Demo logins (password `demo1234`, or the one-tap buttons): `demo-student@` / `demo-issuer@` / `demo-employer@credchain.demo`. Admin: `admin@credchain.io` / `admin1234` at `/admin`.

---

## 2. Symptom → fix

### Startup stalls after `[nodemon] watching extensions: js,mjs,cjs,json`
(no `Server listening on 5000`, no `VITE ready` line)

Almost always **a port is still occupied** by a stale process:
- Vite pins **5173** with `strictPort` — if an old Vite holds it, the new one dies.
- An old `node src/index.js` can hold **5000** in a way nodemon won't report loudly.

Fix:
```bash
npx -y kill-port 3000 5000 5173 8001 8002
npm run dev:v2
```
(`freeports` inside `dev:v2` now includes 5173, so a plain re-run usually suffices.)
Nuclear option if kill-port misses something: `taskkill /F /IM node.exe` then re-run.
To see who holds a port: `netstat -ano | findstr :5173` then `taskkill /F /PID <pid>`.

### `[seed] MONGO_URI not reachable` / seed hangs / health says `"db":"disconnected"`
MongoDB isn't running. Start it (see §1 step 0). Check: `netstat -an | findstr :27017`.
- After a Windows reboot mongod does NOT auto-start (it's the portable build, not a service).
- If mongod itself won't start: look at `C:\tools\mongodb\mongod.log`; a crashed shutdown can leave a lock — delete `C:\tools\mongodb\data\mongod.lock` and retry.
- The backend still boots without Mongo (health shows `disconnected`) — logins will fail with 500s until Mongo is up. Start Mongo, then `rs` + Enter in the backend terminal (nodemon restart) or re-run `dev:v2`.

### `npm error ENOENT … CredChain-Repo-v2\backend\package.json`
You ran a backend-ish script from inside CredChain-Repo-v2 on an old checkout. Fixed since commit `a5ecbfb`: `npm run seed` / `npm run dev:backend` inside CredChain-Repo-v2 forward to `../backend`. If you see this, `git pull` in CredChain-Repo-v2 (branch `ui-redesign`). Never create `backend/` or `frontend/` folders inside CredChain-Repo-v2 — the real ones live one level up.

### UI loads but every screen is empty / login says "Demo login failed — is the backend running on :5000?"
The UI is up but the backend isn't (or Mongo is down behind it).
1. http://localhost:5000/api/v1/health — if it doesn't answer, start the backend; if `"db":"disconnected"`, start Mongo.
2. Re-seed if the DB is fresh: `cd backend && npm run seed` (idempotent, safe anytime).

### Login succeeds but a dashboard bounces back to /login
Stale/expired JWT (7-day lifetime) or half-cleared storage. In the browser: DevTools → Application → Local Storage → delete `cc_token`, `cc_user`, `credchain_role` → sign in again.

### 401s after the app was open a long time
Same as above — token expired. Log out and back in.

### "Admins only" panel on /admin
The signed-in email isn't on the allowlist. Use `admin@credchain.io` / `admin1234`, or add emails to `ADMIN_EMAILS` in `backend/.env` (comma-separated) and restart the backend.

### Issuer "issue credential" returns 403
That issuer account isn't verified. Use `demo-issuer@credchain.demo` (seeded verified), or complete the Get Verified funnel. Note: the DNS TXT check genuinely queries DNS — it will fail for domains you don't control; that's expected.

### Credential accept works but shows no Solana tx
No fee-payer wallet configured (`SOLANA_WALLET_PATH` in `backend/.env`), or devnet RPC is slow/down. Accept still succeeds off-chain by design. With a wallet configured, devnet hiccups return 502 — retry the accept.

### CV download button fails
The CV engine isn't running. Start it: `npm run dev:cv` from the repo root (needs the Python venv in `ai-cv-engine/`). Same idea for insights: `npm run dev:insights`.

### Chat/live updates not arriving (messages need a refresh, bulk progress frozen)
Socket.io connects directly to :5000 (not through the Vite proxy). Make sure nothing blocks it, and that you logged in through the login page (that's what joins your socket room). A hard refresh reconnects.

### `EADDRINUSE: 5000` from the backend itself
Another backend instance is alive: `npx -y kill-port 5000` and re-run.

### Windows "pending reboot" / choco installs failing
Cosmetic for us (we run portable MongoDB), but reboot when convenient. Remember to start mongod again afterwards.

### `[plugin:vite:css-analysis]` / `[plugin:vite:*]` ENOENT pointing at a file that was moved or deleted
Stale Vite cache — the dev server cached a transform against the old path. From CredChain-Repo-v2:
```bash
npx -y kill-port 5173
rm -rf node_modules/.vite
npm run dev
```

### `DEP0060 util._extend` DeprecationWarning at startup
Harmless — comes from a dependency, not our code. Ignore.

---

## 3. Pre-demo checklist (Monday)

1. mongod running → `netstat -an | findstr :27017`
2. `npm run dev:v2` from the repo root (re-seeds automatically — every screen populated)
3. http://localhost:5000/api/v1/health → `"db":"connected"`
4. One-tap login as each role once; keep `VITE_USE_MOCK=true` in `CredChain-Repo-v2/.env` in your back pocket — it flips the whole UI to self-contained fixtures if the stack ever dies on stage (restart Vite after changing it).
