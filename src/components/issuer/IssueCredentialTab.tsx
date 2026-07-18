// components/issuer/IssueCredentialTab.tsx
// Port of monorepo IssueCredentialPanel + ProofOfSkillPanel (System 7 /
// Section 4.3). POST /api/v1/issuer/credentials (verified issuers only). The
// student then Accepts it in their queue, which anchors it on Solana.
// Surfaces the not-yet-verified 403 cleanly.
import { useState } from "react";
import {
  Award,
  GraduationCap,
  Mail,
  IdCard,
  Sparkles,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Webhook,
  GitBranch,
  Gavel,
  Copy,
  Check,
  Trophy,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { issueVerifiedCredential } from "../../services/api";
import { shortHash } from "../../lib/credscore";

export interface IssuedCredential {
  id: string;
  _id?: string;
  title: string;
  recipientEmail?: string;
  sha256Hash?: string;
  txSignature?: string;
  solanaSignature?: string;
  network?: string;
  status?: string;
  trustTier?: string;
}

export default function IssueCredentialTab({
  onIssued,
  onGoVerify,
}: {
  onIssued?: (cred: IssuedCredential) => void;
  onGoVerify?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
          ISSUANCE DESK
        </div>
        <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">Issue a new credential.</h1>
        <p className="text-sm text-txt-secondary mt-1">
          Award a verified skill to one person, or let your judging platform do it automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <IssueCredentialPanel onIssued={onIssued} onGoVerify={onGoVerify} />
        <ProofOfSkillPanel onIssued={onIssued} />
      </div>
    </div>
  );
}

/* ── Single-credential issuance panel ─────────────────────────── */
function IssueCredentialPanel({
  onIssued,
  onGoVerify,
}: {
  onIssued?: (cred: IssuedCredential) => void;
  onGoVerify?: () => void;
}) {
  const [form, setForm] = useState({ title: "", recipientEmail: "", studentId: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IssuedCredential | null>(null);
  const [error, setError] = useState<{ text: string; unverified: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const payload: any = { title: form.title.trim() };
      if (form.recipientEmail.trim()) payload.recipientEmail = form.recipientEmail.trim();
      if (form.studentId.trim()) payload.studentId = form.studentId.trim();
      const res: any = await issueVerifiedCredential(payload);
      const cred = res?.credential;
      if (!cred) throw new Error(res?.message || "Backend did not return a credential.");
      const normalized: IssuedCredential = { ...cred, id: String(cred.id || cred._id) };
      setResult(normalized);
      onIssued?.(normalized);
      setForm({ title: "", recipientEmail: "", studentId: "" });
    } catch (err: any) {
      const unverified = err?.status === 403;
      setError({
        text: unverified
          ? "Your organisation isn't fully verified yet. Finish getting verified, then you can award skills."
          : err?.message || "Could not award this skill.",
        unverified,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-role-issuer-soft text-role-issuer">
            <Award className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-txt-primary">Award a verified skill</h3>
            <p className="mt-0.5 text-xs text-txt-secondary">
              It lands in their inbox. Once they accept, it's saved permanently and can't be faked.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr,0.9fr]">
          {/* Form / success */}
          {!result ? (
            <form onSubmit={submit} className="space-y-3.5">
              <Field label="What did they earn?" required>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. B.Sc Computer Science"
                    className="w-full bg-bg-sunken border border-border-main rounded-md pl-9 pr-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-issuer"
                  />
                </div>
              </Field>
              <Field label="Their email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input
                    type="email"
                    value={form.recipientEmail}
                    onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))}
                    placeholder="links it to their account"
                    className="w-full bg-bg-sunken border border-border-main rounded-md pl-9 pr-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-issuer"
                  />
                </div>
              </Field>
              <Field label="Their account ID" note="Optional — only needed if you don't have their email.">
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input
                    value={form.studentId}
                    onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                    placeholder="optional"
                    className="w-full bg-bg-sunken border border-border-main rounded-md pl-9 pr-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-issuer"
                  />
                </div>
              </Field>
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2.5 rounded-md transition-colors cursor-pointer"
              >
                {busy ? "Awarding…" : "Award this skill"}
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-hash-red/30 bg-hash-red/5 px-4 py-3 text-sm text-hash-red">
                  <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
                  <div>
                    <span>{error.text}</span>
                    {error.unverified && onGoVerify && (
                      <button
                        type="button"
                        onClick={onGoVerify}
                        className="block mt-1.5 text-xs font-semibold underline underline-offset-2 cursor-pointer"
                      >
                        Go to Get Verified →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="relative flex flex-col items-center justify-center py-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-hash-green/10 text-hash-green">
                <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
              </div>
              <h4 className="mt-4 font-display text-base font-bold text-txt-primary">Skill awarded</h4>
              <p className="mt-1 max-w-xs text-sm text-txt-secondary">
                "{result.title}" is on its way. Once they accept, it's saved permanently and verified for good.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold border border-border-main hover:border-role-issuer text-txt-primary px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Award another
              </button>
            </div>
          )}

          {/* Live preview */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-txt-muted font-mono">What they'll see</p>
            <PreviewCard form={form} result={result} />
            {result && (
              <div className="mt-3 rounded-md border border-border-main bg-bg-sunken p-3 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted">Status</span>
                  <span className={result.txSignature || result.solanaSignature ? "text-hash-green" : "text-amber-500"}>
                    {result.txSignature || result.solanaSignature ? "Anchored" : "Pending acceptance"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted">Network</span>
                  <span className="text-txt-secondary">{result.network || "devnet"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-txt-muted">Record ID</span>
                  <span className="text-txt-secondary truncate">{result.id}</span>
                </div>
                {(result.txSignature || result.solanaSignature) && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-txt-muted">Tx</span>
                    <span className="text-brand-purple truncate">{shortHash(result.txSignature || result.solanaSignature)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  note,
  children,
}: {
  label: string;
  required?: boolean;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-txt-primary">
        {label}
        {required && <span className="text-hash-red ml-0.5">*</span>}
      </label>
      {children}
      {note && <p className="text-xs text-txt-muted">{note}</p>}
    </div>
  );
}

function PreviewCard({ form, result }: { form: { title: string; recipientEmail: string }; result: IssuedCredential | null }) {
  const title = result?.title || form.title || "Skill name";
  const recipient = result?.recipientEmail || form.recipientEmail;
  const hash = result?.sha256Hash;
  const isPlaceholder = !result && !form.title.trim();

  return (
    <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-gradient-to-br from-brand-purple to-role-issuer p-5 text-white">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            {result ? "Issued" : "Draft"}
          </span>
          <Award className="w-5 h-5 text-white/80" />
        </div>
        <p className={`mt-5 text-lg font-bold leading-snug ${isPlaceholder ? "text-white/50" : "text-white"}`}>{title}</p>
        <div className="mt-4 space-y-1 text-xs text-white/85">
          <p className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {recipient || "recipient@example.com"}
          </p>
          <p className="flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            {hash ? shortHash(hash) : "tamper-proof seal"}
          </p>
        </div>
        <div className="mt-5 border-t border-white/20 pt-3 text-[11px] uppercase tracking-wide text-white/70">
          Verified &amp; locked in on CredChain
        </div>
      </div>
    </div>
  );
}

/* ── Proof-of-Skill Auto-Issuer (monorepo ProofOfSkillPanel) ───
   Webhook endpoints that auto-mint a credential when a hackathon project is
   merged or marked a winner. "Simulate winner" fires a real issuance. */
function ProofOfSkillPanel({ onIssued }: { onIssued?: (cred: IssuedCredential) => void }) {
  const base = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000";
  const hooks = {
    github: `${base}/api/v1/issuer/proof/github`,
    judging: `${base}/api/v1/issuer/proof/judging`,
  };
  const [project, setProject] = useState("");
  const [winnerEmail, setWinnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function simulateWinner() {
    if (!project.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload: any = { title: `Hackathon Winner — ${project.trim()}` };
      if (winnerEmail.trim()) payload.recipientEmail = winnerEmail.trim();
      const res: any = await issueVerifiedCredential(payload);
      const cred = res?.credential;
      if (cred) onIssued?.({ ...cred, id: String(cred.id || cred._id) });
      setMsg({ type: "ok", text: `Auto-issued "${cred?.title}".` });
      setProject("");
      setWinnerEmail("");
    } catch (err: any) {
      setMsg({
        type: "err",
        text:
          err?.status === 403
            ? "Verify your issuer account to enable auto-issuance."
            : err?.message || "Auto-issue failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
          <Webhook className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-txt-primary">Proof-of-Skill Auto-Issuer</h3>
          <p className="mt-0.5 text-xs text-txt-secondary">
            Hook these into GitHub / your judging platform to mint on merge or win.
          </p>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="space-y-3">
          <WebhookRow icon={<GitBranch className="w-4 h-4" />} label="GitHub merge webhook" url={hooks.github} />
          <WebhookRow icon={<Gavel className="w-4 h-4" />} label="Judging API webhook" url={hooks.judging} />
        </div>

        <div className="mt-5 rounded-md border border-border-main bg-bg-sunken p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-txt-primary">
            <Trophy className="w-4 h-4 text-role-verifier" />
            Simulate a winner <span className="font-normal text-txt-muted">(fires a real auto-issue)</span>
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Project / event name"
              className="w-full bg-bg-surface border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-issuer"
            />
            <input
              value={winnerEmail}
              onChange={(e) => setWinnerEmail(e.target.value)}
              placeholder="Winner email (optional)"
              className="w-full bg-bg-surface border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-issuer"
            />
          </div>
          <button
            type="button"
            onClick={simulateWinner}
            disabled={busy || !project.trim()}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
          >
            {!busy && <Zap className="w-4 h-4" />}
            {busy ? "Issuing…" : "Simulate winner → auto-issue"}
          </button>
          {msg && (
            <p className={`mt-2.5 text-xs font-medium ${msg.type === "ok" ? "text-hash-green" : "text-hash-red"}`}>
              {msg.text}
            </p>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-txt-muted">
          This is the primary path for a self-taught, unaffiliated builder to earn a Verified Ledger credential — a
          confirmed, judged outcome is itself legitimate verification.
        </p>
      </div>
    </div>
  );
}

function WebhookRow({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-txt-secondary">
        <span className="text-txt-muted">{icon}</span>
        {label}
      </p>
      <div className="mt-1.5 flex gap-2">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 truncate rounded-md border border-border-main bg-bg-sunken px-3 py-2 font-mono text-[13px] text-brand-purple"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-border-main hover:border-role-issuer px-3 py-1.5 text-xs font-semibold text-txt-secondary cursor-pointer transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-hash-green" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
