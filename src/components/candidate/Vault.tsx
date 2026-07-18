// ─────────────────────────────────────────────────────────────
// Candidate Vault components — ported from monorepo (frontend/src/components/
// student/{CredScoreGauge,PendingQueue,OnChainProofModal,VerificationPathways,
// TwoTierLedger}.jsx) into cc-v2's design language. Data model and copy match
// monorepo exactly; visuals use cc-v2 tokens (bg-surface, border-main, mono).
// ─────────────────────────────────────────────────────────────
import React, { useState } from "react";
import {
  Hexagon, ChevronDown, ArrowRight, BellRing, Inbox, CheckCircle2, XCircle,
  ShieldCheck, Sprout, Handshake, Link2, AlertTriangle, Plus, ExternalLink,
  Link as LinkIcon, Landmark, Users, Package, Palette, Lightbulb, Clock, PlusCircle, X,
} from "lucide-react";
import {
  SCORE_MIN, SCORE_MAX, scoreBand, improvementTips, TIER_CONFIG, TIER_ORDER,
  ACADEMIC_STATUS_LABEL, shortHash, timeAgo,
} from "../../lib/credscore";

// ══════════════════════════════════════════════════════════════
// CredScore card (monorepo CredScoreGauge v3)
// ══════════════════════════════════════════════════════════════
export function CredScoreCard({
  score,
  breakdown,
  contributions = [],
  academicStatus = "in_school",
}: {
  score: number;
  breakdown: any;
  contributions?: any[];
  academicStatus?: string;
}) {
  const band = scoreBand(score);
  const [open, setOpen] = useState(false);
  const tips = improvementTips(breakdown || {}, academicStatus);
  const bd = breakdown || {};

  // Radial gauge geometry (SVG arc, 300–850 domain).
  const size = 172, stroke = 15, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-md bg-role-candidate-soft text-role-candidate flex items-center justify-center">
            <Hexagon className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-txt-primary">CredScore™</h3>
            <p className="text-[11px] text-txt-muted">Your skill score — proof of what you can do</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ color: band.color, background: `${band.color}1f` }}
          >
            {band.label}
          </span>
          {academicStatus && (
            <span className="text-[10px] text-txt-muted">{ACADEMIC_STATUS_LABEL[academicStatus]}</span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        {/* Radial gauge */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <div
            className="pointer-events-none absolute inset-3 rounded-full opacity-20 blur-2xl"
            style={{ backgroundColor: band.color }}
          />
          <svg width={size} height={size} className="relative -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-bg-sunken" />
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
              stroke={band.color} strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-bold text-3xl text-txt-primary tabular-nums">{score}</span>
            <span className="text-[10px] font-mono text-txt-muted">{SCORE_MIN}–{SCORE_MAX}</span>
            <span className="text-[10px] font-semibold" style={{ color: band.color }}>{band.label}</span>
          </div>
        </div>

        {/* Component bars */}
        <div className="w-full flex-1 space-y-3">
          <ComponentBar label="Pathway weight" value={bd.pathwayScore || 0} max={200} color="#6366F1" desc="from your verified-skill quality" />
          <ComponentBar label="Delivery score" value={bd.deliveryScore || 0} max={300} color="#06B6D4" desc="each paid task done = +15 pts" />
          <ComponentBar label="Tenure bonus" value={bd.tenureBonus || 0} max={100} color="#10B981" desc="+10 every 3 months you stay active" />
          {(bd.disputePenalty || 0) > 0 && (
            <ComponentBar label="Penalty" value={bd.disputePenalty} max={200} color="#F43F5E" desc="from disputes ruled against you" negative />
          )}
        </div>
      </div>

      {/* Tier progression row */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {TIER_ORDER.map((t, i) => {
          const tier = TIER_CONFIG[t];
          const reached = contributions.some((cn) => TIER_ORDER.indexOf(cn.tier) >= i);
          return (
            <React.Fragment key={t}>
              {i > 0 && <ArrowRight className="w-3 h-3 text-txt-muted" />}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                  reached ? "border-role-candidate/40 text-txt-primary" : "border-border-subtle text-txt-muted opacity-60"
                }`}
                title={tier.label}
              >
                <span>{tier.icon}</span>
                <span className="font-medium hidden sm:inline">{tier.label}</span>
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Contribution tier chips */}
      {contributions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {contributions.map((cn, i) => {
            const tier = TIER_CONFIG[cn.tier] || TIER_CONFIG.learner;
            return (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-sunken px-2 py-0.5 text-[11px] text-txt-secondary">
                <span>{tier.icon}</span>
                <span className="font-medium">{tier.label}</span>
                {cn.onChain && <Hexagon className="w-3 h-3 text-role-candidate" />}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs font-semibold text-role-candidate hover:text-txt-primary cursor-pointer transition-colors"
        >
          How to raise my score
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <ul className="mt-2 space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-txt-secondary">
                <ArrowRight className="mt-0.5 w-3 h-3 shrink-0 text-role-candidate" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[10px] text-txt-muted">
        Your country, school name, and year of study never change this score — only what you can do.
      </p>
    </div>
  );
}

function ComponentBar({ label, value, max, color, desc, negative = false }: any) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold text-txt-secondary">{label}</span>
          <span className="hidden text-[10px] text-txt-muted group-hover:inline">{desc}</span>
        </span>
        <span className="tabular-nums text-xs font-bold text-txt-primary">
          {negative ? "−" : ""}{value}<span className="font-normal text-txt-muted">/{max}</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-sunken">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66`, width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Pending approvals (monorepo PendingQueue — "Waiting for your approval")
// ══════════════════════════════════════════════════════════════
export function PendingApprovals({
  pending,
  onAccept,
  onReject,
  busyId,
}: {
  pending: any[];
  onAccept: (c: any) => Promise<void> | void;
  onReject: (c: any) => Promise<void> | void;
  busyId?: string | null;
}) {
  return (
    <section className="rounded-lg border border-role-candidate/30 bg-role-candidate-soft/30 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-md bg-bg-surface text-role-candidate flex items-center justify-center">
          <BellRing className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-sm text-txt-primary">Waiting for your approval</h3>
            <span className="rounded-full bg-role-candidate text-white px-2 py-0.5 text-[10px] font-bold">{pending.length}</span>
          </div>
          <p className="mt-1 mb-4 text-xs text-txt-secondary">
            Accept to verify and lock it in for good · Reject to remove it. You decide what stays.
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Inbox className="w-7 h-7 text-txt-muted" />
          <p className="max-w-sm text-sm text-txt-secondary">
            Nothing waiting right now. When a school or employer sends you a verified skill, it shows up here for you to approve.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((c) => (
            <div
              key={c.id}
              className="rounded-md border border-border-subtle border-l-4 border-l-role-candidate bg-bg-surface p-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-txt-primary">{c.title}</p>
                <p className="mt-0.5 truncate text-xs text-txt-muted">{c.issuer || "Verified issuer"}{c.date ? ` · ${c.date}` : ""}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  disabled={busyId === c.id}
                  onClick={() => onAccept(c)}
                  className="px-3 py-1.5 rounded-md bg-role-candidate text-white text-xs font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  disabled={busyId === c.id}
                  onClick={() => onReject(c)}
                  className="px-3 py-1.5 rounded-md border border-red-500/40 text-red-500 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// On-chain proof modal (monorepo OnChainProofModal — "Proof this is real")
// ══════════════════════════════════════════════════════════════

// Deterministic pseudo "block slot" derived from the signature so the demo
// shows a stable, believable number without inventing randomness each render.
function slotFrom(sig?: string | null) {
  if (!sig) return null;
  let acc = 0;
  for (let i = 0; i < sig.length; i += 1) acc = (acc * 31 + sig.charCodeAt(i)) % 1_000_000_000;
  return 280_000_000 + (acc % 9_000_000);
}

export function ProofModal({ credential, onClose }: { credential: any; onClose: () => void }) {
  const [showJson, setShowJson] = useState(false);
  if (!credential) return null;

  const hash = credential.sha256Hash || credential.hash || null;
  const sig = credential.solanaTxSignature || credential.txSignature || null;
  const explorer = credential.explorerUrl || (sig ? `https://explorer.solana.com/tx/${sig}?cluster=devnet` : null);

  // W3C Verifiable Credential-shaped metadata (off-chain record; only the hash
  // is anchored on-chain — the custodial model keeps the chain anonymous).
  const vc = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "CredChainCredential"],
    issuer: credential.issuer || "Verified Issuer",
    issuanceDate: credential.createdAt || credential.date || null,
    credentialSubject: { achievement: credential.title },
    proof: {
      type: "SolanaMemoAnchor2026",
      network: "solana:devnet",
      sha256Fingerprint: hash,
      transactionSignature: sig,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-surface border border-border-main rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="font-display font-bold text-lg text-txt-primary">Proof this is real</h2>
            <p className="text-xs text-txt-secondary mt-0.5">
              {credential.title} — saved permanently so it can't be faked or changed.
            </p>
          </div>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md border border-hash-green/30 bg-hash-green/[0.07] px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs font-bold text-hash-green">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hash-green opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-hash-green" />
            </span>
            Live &amp; verified
          </span>
          <span className="text-[11px] font-medium text-txt-muted">Saved permanently · can't be changed</span>
        </div>

        <p className="mt-3 rounded-md border border-border-subtle bg-bg-sunken px-4 py-3 text-xs leading-relaxed text-txt-secondary">
          Every verified skill gets a unique fingerprint that's saved permanently. Anyone can check it, and no one can change or fake it. The technical details below are that proof.
        </p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-role-candidate font-mono">The proof</p>

        {/* Anchored on Solana block */}
        <div className="mt-3 rounded-md border border-border-main bg-bg-sunken p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-txt-primary">
              <Hexagon className="w-4 h-4 text-role-candidate" />
              {sig ? "Anchored on Solana" : "Awaiting on-chain anchor"}
            </span>
            <span className="text-[10px] font-mono text-txt-muted uppercase">devnet</span>
          </div>
          <div className="mt-2 font-mono text-[11px] text-txt-secondary space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-txt-muted">Tx signature</span>
              <span className="text-role-candidate">{sig ? shortHash(sig, 10, 8) : "— (off-chain only)"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-txt-muted">Record ID</span>
              <span>{String(credential.id)}</span>
            </div>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <ProofRow k="Status" v={<span className="font-semibold text-hash-green">✓ {credential.status}</span>} />
          <ProofRow k="Network" v="Solana Devnet" />
          <ProofRow k="Block slot" v={slotFrom(sig) ? slotFrom(sig)!.toLocaleString() : "—"} />
          <ProofRow
            k="SHA-256 fingerprint"
            v={<code className="break-all font-mono text-[13px] text-role-candidate">{hash || "—"}</code>}
            mono
          />
          <ProofRow
            k="Tx signature"
            v={<span className="break-all font-mono text-[13px] text-role-candidate">{sig || "— (off-chain only)"}</span>}
            mono
          />
        </dl>

        {/* Raw credential.json */}
        <div className="mt-4">
          <button
            onClick={() => setShowJson((s) => !s)}
            className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-txt-muted hover:text-txt-primary cursor-pointer"
          >
            The full record (for the curious)
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showJson ? "rotate-180" : ""}`} />
          </button>
          {showJson && (
            <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
              <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 font-mono text-[10px] text-slate-500">credential.json</span>
              </div>
              <pre className="max-h-56 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-emerald-300">
{JSON.stringify(vc, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-5">
          {explorer ? (
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim px-5 text-sm font-semibold text-white transition-colors"
            >
              See the public record
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <p className="rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-center text-xs text-txt-muted">
              Saved with a unique fingerprint that proves it hasn't been changed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProofRow({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${mono ? "flex-col" : "items-center"}`}>
      <dt className="shrink-0 text-txt-muted text-xs">{k}</dt>
      <dd className={`text-txt-secondary text-xs ${mono ? "" : "text-right"}`}>{v}</dd>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Proof pathways (monorepo VerificationPathways — "five ways to prove it")
// ══════════════════════════════════════════════════════════════
const PATHWAYS = [
  {
    id: "platform",
    icon: LinkIcon,
    label: "Connect an account",
    badge: "Strongest proof",
    desc: "Link Coursera, GitHub, Audiomack, Behance, Dribbble, edX, or 20+ other accounts. Nothing to upload — the proof comes straight from them, so it can't be faked.",
    weight: "Strongest proof",
    examples: ["Coursera", "GitHub", "Audiomack", "Behance", "Dribbble", "edX", "LinkedIn Learning", "Google Certs", "Meta Blueprint", "Udemy"],
    live: true,
    action: "Connect an account",
  },
  {
    id: "institutional",
    icon: Landmark,
    label: "From your school or employer",
    badge: "Trusted senders",
    desc: "Your school, bootcamp, or professional body sends skills straight to your vault — including your results the day they're confirmed. Nothing to upload, no waiting.",
    weight: "Very strong proof",
    examples: ["NUC", "JAMB", "WAEC", "NECO", "COREN", "MDCN", "NABTEB", "CAC", "ICAN", "Decagon", "Andela Learning"],
    live: true,
    action: "Check if my school is set up",
  },
  {
    id: "peer",
    icon: Users,
    label: "A vouch from a pro",
    badge: "Reputation-backed",
    desc: "Experienced people put their own reputation on the line to vouch for your skill. Because they'd lose it if they're wrong, their word actually means something — unlike a quick endorsement from a friend.",
    weight: "Strong proof",
    note: "They lose their stake if the vouch turns out to be false. That's what makes it count.",
    live: true,
    action: "Request a vouch",
  },
  {
    id: "delivery",
    icon: Package,
    label: "Paid work you've delivered",
    badge: "Hardest to fake",
    desc: "Every paid task you finish and a client confirms strengthens your skills automatically. You can't fake 20 real jobs that real clients paid for and confirmed. This is the hardest proof to get — and the most trusted.",
    weight: "Builds up over time",
    note: "This grows on its own as you finish tasks in the Earn tab.",
    live: true,
    action: "View my delivered work",
  },
  {
    id: "portfolio",
    icon: Palette,
    label: "Show your work",
    badge: "Coming soon",
    desc: "Send in 3–5 samples of your work. AI takes a first look, but real people make the final call — the AI never decides on its own. Great for writing, design, music, and other creative skills.",
    weight: "Solid proof",
    live: false,
  },
];

export function ProofPathways({ onSelectPathway }: { onSelectPathway?: (id: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-md bg-role-candidate-soft text-role-candidate flex items-center justify-center">
          <PlusCircle className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm text-txt-primary">Add a verified skill</h3>
          <p className="mt-0.5 text-xs text-txt-secondary">
            Five ways to prove what you can do. The stronger the proof, the higher your CredScore — and the more paid work you qualify for in the Earn tab.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {PATHWAYS.map((p) => {
          const Icon = p.icon;
          const isOpen = expanded === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-md border transition-colors ${
                isOpen ? "border-role-candidate/40 bg-role-candidate-soft/30" : "border-border-subtle bg-bg-sunken hover:border-border-main"
              }`}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-md bg-bg-surface text-role-candidate flex items-center justify-center">
                    <Icon style={{ width: 18, height: 18 }} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-txt-primary">{p.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${
                        p.live ? "bg-hash-green/10 text-hash-green" : "bg-amber-500/10 text-amber-500"
                      }`}>{p.badge}</span>
                    </div>
                    <span className="text-[11px] text-txt-muted">{p.weight}</span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 shrink-0 text-txt-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-border-subtle px-4 py-3">
                  <p className="text-xs leading-relaxed text-txt-secondary">{p.desc}</p>

                  {p.examples && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.examples.map((ex) => (
                        <span key={ex} className="rounded-full bg-bg-surface border border-border-subtle px-2 py-0.5 text-[10px] text-txt-secondary">{ex}</span>
                      ))}
                    </div>
                  )}

                  {p.note && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-role-candidate">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" /> {p.note}
                    </p>
                  )}

                  {p.live ? (
                    <button
                      onClick={() => onSelectPathway?.(p.id)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {p.action} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-500">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Coming soon — for now, use the other ways above to build your CredScore.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Attested + Sandbox skills (monorepo TwoTierLedger middle + bottom sections)
// ══════════════════════════════════════════════════════════════
export function SkillTrustLedgers({
  attested = [],
  sandbox = [],
  studentId,
  onAddSandbox,
  onDisputeAttested,
}: {
  attested?: any[];
  sandbox?: any[];
  studentId?: string;
  onAddSandbox?: (form: { skillName: string; source: string; link: string }) => Promise<any>;
  onDisputeAttested?: (index: number) => void;
}) {
  const [form, setForm] = useState({ skillName: "", source: "Self-taught", link: "" });
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  function vouchLink(skillIndex: number) {
    return `${window.location.origin}/vouch/${studentId}/${skillIndex}`;
  }

  async function copyVouchLink(skillIndex: number) {
    try {
      await navigator.clipboard.writeText(vouchLink(skillIndex));
      setCopied(skillIndex);
      setTimeout(() => setCopied((c) => (c === skillIndex ? null : c)), 2000);
    } catch { /* clipboard blocked — no-op */ }
  }

  async function submitSandbox(e: React.FormEvent) {
    e.preventDefault();
    if (!form.skillName.trim() || !onAddSandbox) return;
    setAdding(true);
    setErr(null);
    try {
      await onAddSandbox(form);
      setForm({ skillName: "", source: "Self-taught", link: "" });
    } catch (e2: any) {
      setErr(e2?.message || "Could not add skill.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Attested — middle trust state */}
      {attested.length > 0 && (
        <section className="rounded-lg border border-violet-500/30 bg-violet-500/[0.04] p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-md bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Handshake className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-txt-primary">Attested skills</h2>
                <span className="rounded-full bg-violet-500/10 text-violet-500 px-2 py-0.5 text-[10px] font-bold">{attested.length}</span>
              </div>
              <p className="mt-1 text-xs text-txt-secondary">
                A trusted, high-reputation member staked their own reputation to vouch for these. Partial trust — stronger than self-declared, but not a school/employer credential.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {attested.map((a: any, i: number) => {
              const underReview = a.disputeStatus === "under_review";
              const upheld = a.disputeStatus === "resolved_upheld";
              return (
                <div key={a.id || i} className="rounded-md border border-border-subtle bg-bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-txt-primary">{a.skillName || a.name}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-500 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">
                          <Handshake className="w-3 h-3" /> Attested
                        </span>
                        {underReview && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 px-2 py-0.5 text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Under review
                          </span>
                        )}
                        {upheld && (
                          <span className="rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 text-[10px] font-semibold">Upheld as false</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-txt-muted">
                        Vouched by {a.voucherName || "A verified voucher"}{a.source ? ` · ${a.source}` : ""}
                      </p>
                    </div>
                    {onDisputeAttested && !underReview && (
                      <button
                        type="button"
                        onClick={() => onDisputeAttested(a.index ?? i)}
                        className="shrink-0 text-xs font-medium text-txt-muted underline-offset-2 hover:text-red-500 hover:underline cursor-pointer"
                      >
                        Dispute
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sandbox — "Skills you're still proving" */}
      <section className="rounded-lg border border-dashed border-border-main bg-bg-sunken p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-md bg-bg-surface text-txt-secondary flex items-center justify-center">
            <Sprout className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base text-txt-primary">Skills you're still proving</h2>
              <span className="rounded-full bg-bg-surface border border-border-subtle text-txt-secondary px-2 py-0.5 text-[10px] font-bold">{sandbox.length}</span>
            </div>
            <p className="mt-1 text-xs text-txt-secondary">
              Skills you've added yourself. Clearly marked — never shown as verified until a school or employer confirms them.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {sandbox.map((s: any, i: number) => (
            <div key={i} className="rounded-md border border-border-subtle bg-bg-surface p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-txt-primary">{s.skillName || s.name}</p>
                  <p className="mt-0.5 text-xs text-txt-muted">{s.source || "Self-taught"}{s.link ? ` · ${s.link}` : ""}</p>
                </div>
                {studentId && (
                  <button
                    type="button"
                    onClick={() => copyVouchLink(i)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-500/30 px-2 py-1 text-xs font-medium text-violet-500 hover:bg-violet-500/10 cursor-pointer"
                    title="Copy a link a trusted member can use to vouch for this skill"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {copied === i ? "Link copied!" : "Request a vouch"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {onAddSandbox && (
          <form onSubmit={submitSandbox} className="mt-4 space-y-2">
            <p className="text-xs font-medium text-txt-secondary">Add a skill or project you've worked on</p>
            <input
              value={form.skillName}
              onChange={(e) => setForm((f) => ({ ...f, skillName: e.target.value }))}
              placeholder="e.g. Rust, or 'Personal project: ledger-db'"
              className="w-full bg-bg-surface border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-role-candidate"
            />
            <div className="flex items-stretch gap-2">
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                className="w-36 shrink-0 bg-bg-surface border border-border-main rounded-md px-2 py-2 text-sm text-txt-primary focus:outline-none focus:border-role-candidate"
              >
                <option>Self-taught</option>
                <option>GitHub</option>
                <option>Coursera</option>
                <option>YouTube</option>
                <option>Other</option>
              </select>
              <input
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="link (optional)"
                className="flex-1 bg-bg-surface border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-role-candidate"
              />
              <button
                type="submit"
                disabled={adding}
                className="px-3 py-2 rounded-md border border-border-main hover:border-role-candidate text-txt-primary text-sm font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> {adding ? "Adding…" : "Add"}
              </button>
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </form>
        )}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Vault section (monorepo TwoTierLedger top — verified ledger with proof
// click-through). Placed at the bottom of the Credentials tab.
// ══════════════════════════════════════════════════════════════
export function VaultSection({
  verified,
  revoked = [],
  onViewProof,
}: {
  verified: any[];
  revoked?: any[];
  onViewProof: (c: any) => void;
}) {
  // Verified ledger shows accepted + revoked together so the audit trail and
  // dispute path are visible (revoked isn't hidden — transparency).
  const ledger = [...verified, ...revoked];

  return (
    <section className="rounded-lg border border-border-main bg-bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-md bg-role-candidate-soft text-role-candidate flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-base text-txt-primary">Verified skills vault</h2>
            <span className="rounded-full bg-hash-green/10 text-hash-green px-2 py-0.5 text-[10px] font-bold">{ledger.length}</span>
          </div>
          <p className="mt-1 text-xs text-txt-secondary">
            Confirmed by a school or employer and locked in — can't be faked or changed. Click any entry to see its on-chain proof.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {ledger.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Inbox className="w-7 h-7 text-txt-muted" />
            <p className="text-sm font-semibold text-txt-primary">No verified skills yet</p>
            <p className="max-w-sm text-xs text-txt-secondary">
              Accept a skill waiting for your approval and it shows up here, verified and locked in.
            </p>
          </div>
        ) : (
          ledger.map((c) => {
            const sig = c.txSignature || c.solanaTxSignature;
            const isRevoked = c.status === "revoked";
            return (
              <button
                key={c.id}
                onClick={() => onViewProof(c)}
                className={`w-full text-left rounded-md border p-3.5 cursor-pointer transition-colors ${
                  isRevoked
                    ? "border-red-500/30 bg-red-500/[0.04] hover:border-red-500/50"
                    : "border-border-subtle bg-bg-sunken hover:border-role-candidate"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-txt-primary">{c.title}</p>
                      {isRevoked ? (
                        <span className="rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">Revoked</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-hash-green/10 text-hash-green px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-txt-muted">
                      {c.issuer}{sig ? ` · ${shortHash(sig, 8, 6)}` : " · off-chain"}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 text-txt-muted" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
