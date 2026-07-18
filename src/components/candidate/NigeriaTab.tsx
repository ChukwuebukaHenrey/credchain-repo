import React, { useEffect, useState } from "react";
import {
  ScrollText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Globe,
  BadgeCheck,
  SignalLow,
  ChevronDown,
} from "lucide-react";
import { shortHash } from "../../lib/credscore";

// Nigeria First tab — the monorepo Country-Module features, copied 1:1:
//   1. Instant Statement of Result ("ASUU-Bypasser")
//   2. NYSC Pre-Validation Tracker (Senate-List match engine, mock)
//   3. Global Trust Pass (NIN hash, anti-bias anchor — raw ID never stored)
//   4. Low-Data Offline Pass (USSD shortcode + text-only profile)

// ── Country module (monorepo config/countryModules.js — NG entry) ──
const NG_MODULE = {
  countryCode: "NG",
  countryName: "Nigeria",
  flag: "🇳🇬",
  nationalId: {
    type: "NIN",
    idLabel: "National Identity Number (NIN)",
    placeholder: "11-digit NIN",
  },
};

export default function NigeriaTab({
  user,
  verified = [],
}: {
  user: { name?: string; credchainId?: string } | null;
  verified?: any[];
}) {
  const hasVerified = verified.length > 0;
  return (
    <div className="space-y-6">
      <div>
        <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
          COUNTRY MODULE · 🇳🇬 NIGERIA
        </div>
        <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
          Nigeria First.
        </h1>
        <p className="text-sm text-txt-secondary mt-1">
          Features built for the Nigerian student journey.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <StatementOfResultCard verified={verified} />
        <NyscTracker />
        <GlobalTrustPass hasVerified={hasVerified} />
        <OfflinePass user={user} verified={verified} />
      </div>
    </div>
  );
}

/* ── 1. Instant Statement of Result ("ASUU-Bypasser") ─────────
   The digital alternative to the 6–12-month paper transcript. Detected from
   the verified ledger by title; absent one, we show what it WILL look like. */
const RESULT_RE = /(statement of result|transcript|result|grade|cgpa)/i;

function StatementOfResultCard({ verified = [] }: { verified?: any[] }) {
  const result = verified.find((c: any) => RESULT_RE.test(c.title || ""));

  return (
    <div className="bg-bg-surface border border-hash-green/30 rounded-lg p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-hash-green/10 text-hash-green">
        <ScrollText className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display font-bold text-sm text-txt-primary">Instant Statement of Result</h2>
        <span className="rounded-full bg-hash-green text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          ASUU-Bypasser
        </span>
      </div>
      <p className="mt-0.5 text-xs text-txt-secondary">
        🇳🇬 Nigeria · the digital transcript that doesn't make you wait.
      </p>

      {result ? (
        <div className="mt-3 rounded-md border border-border-subtle bg-bg-elevated p-4">
          <p className="text-sm font-semibold text-txt-primary">{result.title}</p>
          <p className="text-xs text-txt-muted">{result.issuer || "Registrar (Verified Issuer)"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-hash-green/10 px-2.5 py-2 text-xs text-hash-green">
            <span className="font-medium">Immutable · Solana stamped</span>
            {(result.solanaTxSignature || result.txSignature || result.hash) && (
              <span className="font-mono">{shortHash(result.solanaTxSignature || result.txSignature || result.hash)}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-txt-muted">
            No 6–12 month wait — verifiable the moment grades are confirmed.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2.5 rounded-md border border-dashed border-hash-green/40 bg-bg-elevated p-4 text-sm text-txt-secondary">
          <Clock className="mt-0.5 w-4 h-4 shrink-0 text-hash-green" />
          <span>
            When your department head or registrar (a Verified Issuer) confirms your grades, your statement of result
            appears here instantly with a permanent Solana stamp — replacing the months-long paper-transcript wait.
          </span>
        </div>
      )}
    </div>
  );
}

/* ── 2. NYSC Pre-Validation Tracker ───────────────────────────
   Cross-references on-chain student data against a MOCK "NYSC Senate List
   Matching Engine". Mismatches raise an amber warning months before the real
   Senate List is sent. */
const NYSC_KEY = "credchain_nysc";

// Mock "on-chain record of truth" the Senate List engine compares against.
const ON_CHAIN_RECORD = {
  matric: "UNN/2021/CSC/0184",
  dob: "2002-05-14",
  course: "Computer Science",
  graduationDate: "2026-07-31",
};

function loadNyscDraft() {
  try {
    return JSON.parse(localStorage.getItem(NYSC_KEY) || "null");
  } catch {
    return null;
  }
}

function NyscTracker() {
  const [form, setForm] = useState(
    () => loadNyscDraft() || { matric: "", dob: "", course: "", graduationDate: "" }
  );
  const [result, setResult] = useState<{ ok: boolean; mismatches: { field: string; expected: string; got: string }[] } | null>(null);

  const set = (name: string, value: string) => setForm((f: any) => ({ ...f, [name]: value }));

  function runMatch(e: React.FormEvent) {
    e.preventDefault();
    const mismatches: { field: string; expected: string; got: string }[] = [];
    if (form.matric.trim().toUpperCase() !== ON_CHAIN_RECORD.matric)
      mismatches.push({ field: "Matric number", expected: ON_CHAIN_RECORD.matric, got: form.matric || "(blank)" });
    if (form.dob !== ON_CHAIN_RECORD.dob)
      mismatches.push({ field: "Date of birth", expected: ON_CHAIN_RECORD.dob, got: form.dob || "(blank)" });
    if (form.course.trim().toLowerCase() !== ON_CHAIN_RECORD.course.toLowerCase())
      mismatches.push({ field: "Course", expected: ON_CHAIN_RECORD.course, got: form.course || "(blank)" });
    if (form.graduationDate !== ON_CHAIN_RECORD.graduationDate)
      mismatches.push({ field: "Graduation date", expected: ON_CHAIN_RECORD.graduationDate, got: form.graduationDate || "(blank)" });

    try {
      localStorage.setItem(NYSC_KEY, JSON.stringify(form));
    } catch { /* ignore */ }
    setResult({ ok: mismatches.length === 0, mismatches });
  }

  function prefillFromRecord() {
    setForm({ ...ON_CHAIN_RECORD });
    setResult(null);
  }

  return (
    <div className="bg-bg-surface border border-role-candidate/30 rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-role-candidate-soft text-role-candidate">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <h2 className="font-display font-bold text-sm text-txt-primary">NYSC Pre-Validation</h2>
        </div>
        <button
          type="button"
          onClick={prefillFromRecord}
          className="text-xs font-medium text-role-candidate hover:underline cursor-pointer"
        >
          Use my on-chain record
        </button>
      </div>
      <p className="mt-2 text-xs text-txt-secondary">
        Catch Senate-List data mismatches now — not after mobilization fails.
      </p>

      <form onSubmit={runMatch} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <NgField label="Matric number" value={form.matric} onChange={(v) => set("matric", v)} placeholder="UNN/2021/CSC/0184" />
        <NgField label="Date of birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} />
        <NgField label="Course" value={form.course} onChange={(v) => set("course", v)} placeholder="Computer Science" />
        <NgField label="Graduation date" type="date" value={form.graduationDate} onChange={(v) => set("graduationDate", v)} />
        <button
          type="submit"
          className="sm:col-span-2 mt-1 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          Run Senate-List match
        </button>
      </form>

      {result &&
        (result.ok ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-hash-green/30 bg-hash-green/5 p-3 text-sm text-hash-green">
            <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" />
            <span>All fields match the on-chain record. You're clear for mobilization.</span>
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-500">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {result.mismatches.length} mismatch(es) — fix before the Senate List is sent:
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-amber-500">
              {result.mismatches.map((m, i) => (
                <li key={i}>
                  • <strong>{m.field}</strong>: you entered "{m.got}", record says "{m.expected}".
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function NgField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-txt-secondary">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border-main bg-bg-sunken px-2.5 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-candidate"
      />
    </label>
  );
}

/* ── 3. Global Trust Pass (Anti-Bias Anchor) ──────────────────
   Verified academic record + OFF-CHAIN national-ID verification HASH. The
   raw ID never leaves the browser or is stored; only its SHA-256 hash. */
const TRUSTPASS_KEY = "credchain_trustpass";

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function GlobalTrustPass({ hasVerified }: { hasVerified: boolean }) {
  const mod = NG_MODULE;
  const [raw, setRaw] = useState("");
  const [pass, setPass] = useState<{ nationalIdVerificationHash: string; countryCode: string; at: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TRUSTPASS_KEY) || "null");
      if (saved && saved.countryCode === mod.countryCode) setPass(saved);
    } catch { /* ignore */ }
  }, [mod.countryCode]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!raw.trim()) return;
    setBusy(true);
    try {
      const hash = await sha256Hex(`${mod.countryCode}:${raw.trim()}`);
      const record = { nationalIdVerificationHash: hash, countryCode: mod.countryCode, at: new Date().toISOString() };
      try {
        localStorage.setItem(TRUSTPASS_KEY, JSON.stringify(record));
      } catch { /* ignore */ }
      setPass(record);
      setRaw(""); // never retain the raw id
    } finally {
      setBusy(false);
    }
  }

  const active = pass && hasVerified;

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-brand-purple-soft text-brand-purple">
        <Globe className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <h2 className="font-display font-bold text-sm text-txt-primary">Global Trust Pass</h2>

      {active ? (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple text-white px-3 py-1 text-xs font-bold mb-3">
            <BadgeCheck className="w-3.5 h-3.5" /> Verified for Global Hire
          </span>
          <p className="text-sm leading-relaxed text-txt-secondary">
            Academic record + {mod.nationalId.type} verification, anchored. Your country or school's fame is
            irrelevant — this is portable, checkable proof.
          </p>
          <p className="mt-3 break-all font-mono text-[10px] text-brand-purple">
            {mod.flag} {mod.countryCode} · id-hash {pass!.nationalIdVerificationHash.slice(0, 24)}…
          </p>
        </div>
      ) : (
        <form onSubmit={verify} className="mt-3">
          <p className="text-sm leading-relaxed text-txt-secondary">
            Add your {mod.nationalId.idLabel} to unlock the anti-bias anchor. Only a hash is stored — never the raw
            number.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={mod.nationalId.placeholder}
              className="w-full flex-1 rounded-md border border-border-main bg-bg-sunken px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
            >
              {busy ? "Hashing…" : "Verify"}
            </button>
          </div>
          {!hasVerified && pass && (
            <p className="mt-2 text-xs text-amber-500">
              ID hashed ✓ — add a verified academic credential to fully activate the pass.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-txt-muted">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {mod.nationalId.type}
            </span>
            <span className="rounded-full bg-hash-green/10 text-hash-green px-2 py-0.5 text-[10px] font-semibold">
              privacy-preserving
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── 4. Low-Data "Offline Pass" Generator ─────────────────────
   Text-only profile view + a mock USSD-style shortcode for verification on
   minimal data / basic networks (e.g. *347*88*MATRIC#). */
function OfflinePass({
  user,
  verified = [],
}: {
  user: { name?: string; credchainId?: string } | null;
  verified?: any[];
}) {
  const [open, setOpen] = useState(false);
  // Short numeric code derived from the credchainId for the USSD string.
  const code = (user?.credchainId || "cc_000000").replace(/\D/g, "").slice(-6).padStart(6, "0");
  const ussd = `*347*88*${code}#`;

  const textProfile = `CREDCHAIN VERIFY
Name: ${user?.name || "—"}
ID: ${user?.credchainId || "—"}
Verified credentials: ${verified.length}
${verified
  .slice(0, 5)
  .map((c: any) => `- ${c.title} [${c.solanaTxSignature || c.txSignature || c.hash ? "on-chain" : "verified"}]`)
  .join("\n")}
Check: credchain / ${ussd}`;

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-sunken text-txt-secondary">
            <SignalLow className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <h2 className="font-display font-bold text-sm text-txt-primary">Low-Data Offline Pass</h2>
        </div>
        <ChevronDown className={`w-5 h-5 text-txt-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs text-txt-muted">USSD shortcode (works without data)</p>
            <p className="mt-1 rounded-md border border-brand-purple/30 bg-brand-purple-soft px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-brand-purple">
              {ussd}
            </p>
          </div>
          <div>
            <p className="text-xs text-txt-muted">Text-only profile (SMS / basic phone)</p>
            <pre className="mt-1 overflow-auto rounded-md border border-border-subtle bg-bg-sunken p-3 font-mono text-[13px] leading-relaxed text-txt-secondary">
              {textProfile}
            </pre>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                navigator.clipboard.writeText(textProfile);
              } catch { /* clipboard blocked */ }
            }}
            className="w-full text-sm font-semibold border border-border-main hover:border-brand-purple text-txt-primary px-4 py-2 rounded-md transition-colors cursor-pointer"
          >
            Generate Text-Only Profile
          </button>
        </div>
      )}
    </div>
  );
}
