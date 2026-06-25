# CredChain — Live Demo Runbook

Everything you need to run the app and walk judges through it. Designed so **nothing is ever empty and nothing hard-fails on stage** (DEMO_MODE).

---

## 1. One-time setup

```bash
# from repo root
npm run install:all          # installs root + backend + frontend deps

# seed the demo database (idempotent — safe to re-run before every demo)
cd backend && npm run seed
```

The seed creates 3 one-click demo accounts, 6 verified issuers, and ~14 students with
verified credentials, CredScores, and skills — so every screen is populated.

## 2. Launch (two terminals)

```bash
# terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# terminal 2 — frontend (http://localhost:3000)
cd frontend && npm run dev
```

Sanity check: open http://localhost:5000/api/v1/health → should report `"db":"connected"`.

## 3. Demo accounts (login screen → "Instant demo — no signup")

| Button   | Account                       | What it shows |
|----------|-------------------------------|---------------|
| Student  | demo-student@credchain.demo   | Populated wallet, CredScore gauge, Earn tab |
| Issuer   | demo-issuer@credchain.demo    | Verified issuer — can mint live |
| Employer | demo-employer@credchain.demo  | Talent search over ~14 candidates |

(Email + password `demo1234` also works, as does Google OAuth if configured.)

---

## 4. The 6-minute walkthrough

1. **Landing page** (`/`) — scroll the hero, parallax credential card, stats, "How it works", the three portals. Toggle **dark/light** (top-right) to show the polish. *"Credentials you own, trust anyone can verify, anchored on Solana."*

2. **Login → click "Issuer"** (instant demo). Land on the issuer dashboard.

3. **Issue a credential live** — open *Issue Credential*. Pick a Type, fill the recipient (`demo-student@credchain.demo`) + title. Watch the **live preview card** update as you type. Hit **Issue & Anchor on Solana** → **confetti + SuccessCheck + the on-chain proof** (real tx signature, Explorer link). *This is the money shot.*

4. **Switch to Student** — log out → login → "Student". Show the **CredScore radial gauge** counting up, the 4-component breakdown, and the **credential wallet** (tilt-on-hover cards). Open one → **on-chain proof modal**. Hit the **Earn tab** (quest board).

5. **Switch to Employer** — log out → login → "Employer". **Talent search**: filter by skill / trust tier / CredScore. Show ~14 verified candidates with trust-tier badges. Open a candidate.

6. **Public verification** — go to `/registry` or a verify link. Paste/scan a credential → animated **VERIFIED ✓** with issuer trust tier + on-chain proof. *Anyone can verify, no login.*

7. **(Optional) Revocation** — as the issuer, revoke a credential → status animates to "Revoked", anchored on-chain.

---

## 5. Reliability / fallback notes (DEMO_MODE)

- **`DEMO_MODE=true`** (backend `.env`) is the safety net:
  - **One-click demo login** (`POST /api/v1/auth/demo`) — no OAuth needed on stage.
  - **Mock Solana anchoring** — if no funded Devnet wallet is configured (or Devnet is slow/down), credentials still anchor with a deterministic, Explorer-shaped signature flagged `mock`. The **real on-chain path always takes precedence** when `SOLANA_WALLET_PATH` points to a funded keypair.
  - Set `DEMO_MODE=false` to disable both and require real anchoring + real auth.
- **MongoDB** uses the non-SRV connection string (the only one that works on this machine).
- **AI features** (CV/insights) gracefully degrade if the Python engines (`:8001`/`:8002`) aren't running.

## 6. If something breaks mid-demo

- Empty screens? Re-run `cd backend && npm run seed`.
- Can't log in? Confirm backend is up (`/api/v1/health`) and `DEMO_MODE=true`.
- Credential won't anchor? That's fine — DEMO_MODE returns a mock proof; the demo continues.
- Restart everything: kill both terminals, `npm run seed`, relaunch.

---

## 7. Health check reference

`GET http://localhost:5000/api/v1/health` →
```json
{ "success": true, "status": "ok", "db": "connected",
  "integrations": { "google": false, "solana": true, "aiCvEngine": true, "aiInsightsEngine": true } }
```
