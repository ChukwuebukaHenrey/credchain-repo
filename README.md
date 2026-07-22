# CredChain

**Verified skills on Solana — from verified, to hired, to earning.**

CredChain turns a person's real skills and academic credentials into tamper-proof, blockchain-anchored proofs that employers can verify in under a second — then connects verified talent to paid bounties. No forgeable PDFs, no slow email verification chains, and **zero personal data on-chain**.

> This repository (`CredChain-Repo-v2`) is the **v2 web client** — a React 19 + TypeScript + Vite + Tailwind 4 single-page app. It talks to the CredChain backend (Express + MongoDB + Solana) and two Python AI microservices. See [Architecture](#architecture) for how the pieces fit together.

---

## Table of contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [The four roles](#the-four-roles)
- [Architecture](#architecture)
- [Key concepts](#key-concepts)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Security & privacy model](#security--privacy-model)

---

## The problem

Credential fraud is cheap and verification is expensive. A degree certificate or course completion PDF can be faked in minutes, and the only way an employer can trust one today is to email the issuing institution and wait — days, sometimes weeks. Skilled people (especially students and early-career talent in emerging markets) get stuck: they can't prove what they know quickly enough to get hired.

## The solution

CredChain issues credentials as **cryptographic proofs anchored on the Solana blockchain**:

1. An authorized **issuer** (e.g. a university) mints a credential for a person.
2. The backend computes a **SHA-256 hash** of the credential's identifying fields and writes *only that hash* to Solana using the **SPL Memo Program**. The hash is a one-way fingerprint — it reveals nothing about the person.
3. Anyone can later **re-derive the same hash** from the credential data and check it against the on-chain record. If they match, the credential is authentic and untampered. If the data was altered, the hashes diverge and verification fails.

Verification is instant, trustless, and needs no back-and-forth with the institution. A **QR code** on a public profile lets an employer confirm a credential on the spot.

---

## The four roles

CredChain is a multi-sided platform. Each role has its own dashboard.

| Role | Who | What they do |
|------|-----|--------------|
| **Candidate** | Students & job seekers | Request & store verified credentials, build an AI-generated CV, get a shareable verified public profile, and apply to paid bounties. |
| **Issuer** | Universities & institutions | Get whitelisted (domain + KYC verification), review candidate requests, and mint credentials that anchor on-chain. |
| **Verifier / Employer** | Recruiters & companies | Search verified talent by skill/tier, verify credentials instantly, message candidates, and post/settle bounties. |
| **Admin** | Platform operators | Approve issuers, resolve disputes and fraud reports, and manage the institution directory. (Gated by an email allowlist; not a public role.) |

---

## Architecture

CredChain is a **four-tier system**. This repo is the client tier.

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (this repo) — React 19 + Vite + Tailwind             │
│  Candidate / Issuer / Verifier / Admin dashboards + landing  │
└───────────────┬─────────────────────────────────────────────┘
                │ REST + Socket.io
                ▼
┌─────────────────────────────────────────────────────────────┐
│  CORE API — Express + MongoDB (:5000)                        │
│  Auth, credentials, bounties, chat, CredScore, disputes.     │
│  The ONLY tier with database access. Owns the PII boundary.  │
└───────┬───────────────────────────────┬─────────────────────┘
        │ writes SHA-256 hash            │ internal HTTP (PII-stripped)
        ▼                                ▼
┌────────────────────┐        ┌──────────────────────────────────┐
│  SOLANA (Devnet)   │        │  AI MICROSERVICES (Python/FastAPI)│
│  SPL Memo Program  │        │  • CV Engine     (:8001)          │
│  hash-only anchor  │        │  • Insights Engine (:8002)        │
└────────────────────┘        │  NO database access.              │
                              └──────────────────────────────────┘
```

**Why this shape matters:** the Express core is the single source of truth and the *only* tier that touches the database. The Python AI services never see the database — the core strips personal data before forwarding clean JSON over internal HTTP. The blockchain only ever receives a hash. This keeps the privacy guarantee ("zero PII on-chain") enforceable at the architecture level, not just by convention.

---

## Key concepts

- **On-chain anchoring** — Writing a credential's SHA-256 hash to Solana via the SPL Memo Program. No custom smart contract is required; the Memo Program is a built-in Solana primitive for attaching data to a transaction.
- **CredScore** — A single 300–850 reputation number (deliberately mirroring the FICO scale so the analogy lands instantly). It is computed **only from evidence** — verified credentials, completed paid deliveries, peer vouches (small & capped), and account tenure — and **never** from country, university prestige, or any wealth-correlated proxy. Disputes lodged and upheld *lower* it.
- **Trust tiers** — Derived from credential weight: `learner → practitioner → proven_practitioner → expert → master`.
- **Vouching / attestation** — A high-reputation user can stake their own reputation to attest ("vouch for") another user's self-declared skill. Vouches add a small, hard-capped bonus to CredScore so they can't be farmed, and are frozen if disputed.
- **Bounties** — Paid tasks an employer posts for verified talent. Payment is held in escrow and released on delivery.
- **DEMO_MODE** — When a funded Solana wallet isn't configured, the backend anchors with a **deterministic mock signature** (clearly flagged `mock: true`) so a live demo never hard-fails on Devnet funding or latency. Real on-chain anchoring always takes precedence when a wallet is present.

---

## Tech stack

**This client:** React 19, TypeScript, Vite 6, Tailwind CSS 4, `motion` (Framer Motion successor), React Router 7, Recharts, Socket.io client, lucide-react.

**Backend:** Node.js + Express, MongoDB (Mongoose), Socket.io, `@solana/web3.js`, JWT auth, bcrypt.

**AI services:** Python + FastAPI. CV Engine renders real PDF/PNG CVs (`fpdf2` / Pillow); Insights Engine analyzes skills → career paths via OpenAI (degrades gracefully to empty results without an API key).

**Chain:** Solana Devnet, SPL Memo Program.

---

## Getting started

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (or a connection string)
- (Optional) Python 3.10+ for the AI services
- (Optional) A funded Solana Devnet wallet for real anchoring — otherwise DEMO_MODE handles it

### 1. Backend (`../backend`, port 5000)
```bash
cd backend
npm install
npm run seed      # seed demo users, credentials, institutions
npm run dev       # http://localhost:5000
```

### 2. This client (port 5173)
```bash
npm install
npm run dev       # http://localhost:5173
```

### 3. AI services (optional)
```bash
# CV engine — http://localhost:8001
cd ai-cv-engine && pip install -r requirements.txt && uvicorn src.api:app --port 8001

# Insights engine — http://localhost:8002
cd ai-insights-engine && pip install -r requirements.txt && uvicorn src.api:app --port 8002
```

### Scripts (this repo)
| Script | Does |
|--------|------|
| `npm run dev` | Vite dev server (`--host` for LAN access) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run dev:backend` | Convenience: start the backend from here |
| `npm run seed` | Convenience: seed the backend DB |

---

## Project structure

```
src/
├── App.tsx                 # Routes + landing page composition
├── components/
│   ├── Hero, Footer, ...   # Landing sections
│   ├── motion/             # Reusable motion primitives (Reveal, Counter,
│   │                       #   Typewriter, SpotlightCards, PageTransition)
│   ├── candidate/          # Candidate dashboard tabs
│   ├── issuer/             # Issuer dashboard tabs
│   └── verifier/           # Verifier dashboard tabs
├── pages/                  # Dashboards, signup flows, public profile
├── context/                # AuthContext (single source of auth truth)
├── services/               # API client, socket, theme
└── lib/                    # CredScore display, avatars, institutions
```

All motion is gated behind a global `prefers-reduced-motion` rule.

---

## Environment variables

Create `.env` files from the `.env.example` templates in each service. Secrets and wallet keys are **never** committed (enforced by `.gitignore`).

| Service | Key vars |
|---------|----------|
| Backend | `PORT`, `MONGO_URI`, `CLIENT_ORIGIN`, `SOLANA_RPC_URL`, `DEMO_MODE`, JWT secret, fee-payer wallet |
| Client | API base URL (points at the backend `:5000`) |
| AI services | `ALLOWED_ORIGINS`, `OPENAI_API_KEY` (Insights) |

---

## Security & privacy model

1. **Zero PII on-chain.** Only a SHA-256 hash is ever written to Solana. The hash cannot be reversed into personal data.
2. **Single database boundary.** Only the Express core touches MongoDB. The AI microservices receive PII-stripped payloads over internal HTTP — Insights gets *skills only*; the CV engine gets *only the requesting owner's own* consented identity.
3. **Evidence-only reputation.** CredScore never reads wealth- or prestige-correlated signals — a junior with real proofs can outrank a credential-only graduate. By design.
4. **Tamper-evidence.** Verification re-derives the credential hash and compares it to the chain; any alteration breaks the match.
5. **Anti-abuse.** Issuers are whitelisted via domain + KYC. Vouches are capped so reputation can't be farmed. Disputes and fraud reports feed an admin resolution flow.

---

*Built for the entire credential lifecycle — issue, verify, hire, earn.*
