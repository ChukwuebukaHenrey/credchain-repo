import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Gavel, Star, Lock, CheckCircle2, X, Plus, Link as LinkIcon, Copy } from "lucide-react";
import { disputeCredential, disputeAttestation, getStudentPortfolio, addSandboxSkill } from "../../services/api";

// Trust tab — surfaces the two fraud-resistance mechanics from the deck:
// (1) DISPUTE a revoked credential (only REVOKED can be disputed) and dispute a
//     staked attestation you believe is fraudulent,
// (2) two-tier skill trust: self-declared "sandbox" skills that peers promote to
//     attested by staking reputation. Sandbox/attested data comes from the REAL
//     portfolio (GET /api/v1/student/:id/portfolio); revoked credentials are
//     passed in by the dashboard, which owns the credential fetch.

interface Cred {
  id: number | string;
  title: string;
  issuer: string;
  status: string;
  revokedReason?: string;
  dispute?: { status: string; reason: string } | null;
}

// Normalized view over both portfolio shapes:
//  backend: sandbox {skillName, source, link} / attested {skillName, voucherId, stakedPoints, dispute}
//  mock:    sandbox {name, category, tags}    / attested {name, category, voucherName, stakedPoints, vouchedAt}
interface Skill {
  name: string;
  meta?: string;
  link?: string;
  voucherName?: string;
  stakedPoints?: number;
  vouchedAt?: string;
  dispute?: { status?: string; reason?: string } | null;
}

const normalizeSandbox = (s: any): Skill => ({
  name: s.skillName || s.name || "Skill",
  meta: s.source || s.category,
  link: s.link,
});
const normalizeAttested = (s: any): Skill => ({
  name: s.skillName || s.name || "Skill",
  meta: s.category,
  voucherName: s.voucherName || (s.voucherId ? `Voucher ${String(s.voucherId).slice(-6)}` : "Peer"),
  stakedPoints: s.stakedPoints ?? 10,
  vouchedAt: s.vouchedAt,
  dispute: s.dispute || null,
});

export default function TrustTab({
  candidateId,
  credentials,
  onChanged,
}: {
  candidateId: string;
  credentials: Cred[];
  /** Called after a successful mutation so the parent can refetch credentials. */
  onChanged?: () => void | Promise<void>;
}) {
  const [sandbox, setSandbox] = useState<Skill[]>([]);
  const [attested, setAttested] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputeFor, setDisputeFor] = useState<Cred | null>(null);
  const [attDisputeIdx, setAttDisputeIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Add sandbox skill form
  const [newSkill, setNewSkill] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newLink, setNewLink] = useState("");
  const [adding, setAdding] = useState(false);

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 6000);
  };

  const refetchPortfolio = useCallback(async () => {
    try {
      const res = await getStudentPortfolio(candidateId);
      const p = res?.portfolio || {};
      setSandbox(Array.isArray(p.sandboxSkills) ? p.sandboxSkills.map(normalizeSandbox) : []);
      setAttested(Array.isArray(p.attestedSkills) ? p.attestedSkills.map(normalizeAttested) : []);
    } catch {
      // Leave whatever we already have — empty states render fine.
    }
  }, [candidateId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await refetchPortfolio();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [refetchPortfolio]);

  const revoked = credentials.filter((c) => c.status === "revoked");

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    setAdding(true);
    try {
      await addSandboxSkill(newSkill.trim(), newSource.trim() || undefined, newLink.trim() || undefined);
      flash(`"${newSkill.trim()}" added to your sandbox — share a vouch link to get it attested.`);
      setNewSkill("");
      setNewSource("");
      setNewLink("");
      await refetchPortfolio();
    } catch (err: any) {
      flash(`Could not add skill: ${err?.message || "request failed"}`);
    } finally {
      setAdding(false);
    }
  };

  // NOTE: vouch links aren't a routed page in cc-v2 yet — we generate the
  // canonical URL shape and copy it so a peer with reputation ≥ 60 can vouch
  // once the route exists (backend: POST /v1/student/:id/sandbox/:idx/vouch).
  const copyVouchLink = async (skillIndex: number) => {
    const link = `${window.location.origin}/vouch/${candidateId}/${skillIndex}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIdx(skillIndex);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      flash(`Copy failed — vouch link: ${link}`);
    }
  };

  const handleDispute = async (reason: string) => {
    if (!disputeFor) return;
    const target = disputeFor;
    setDisputeFor(null);
    try {
      await disputeCredential(target.id, reason);
      flash(`Dispute filed for "${target.title}" — under independent review.`);
      await onChanged?.();
    } catch (err: any) {
      flash(`Could not file dispute: ${err?.message || "request failed"}`);
    }
  };

  const handleAttestationDispute = async (reason: string) => {
    if (attDisputeIdx === null) return;
    const idx = attDisputeIdx;
    setAttDisputeIdx(null);
    try {
      await disputeAttestation(candidateId, idx, reason);
      flash("Attestation dispute filed — the voucher's stake is frozen pending review.");
      await refetchPortfolio();
    } catch (err: any) {
      flash(`Could not dispute attestation: ${err?.message || "request failed"}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-txt-primary flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-role-issuer" strokeWidth={1.75} />
          Trust &amp; Disputes
        </h1>
        <p className="text-txt-secondary text-sm mt-1 max-w-[620px]">
          Contest a revoked credential you believe is wrong, and build peer-attested trust. Vouches are reputation-staked — they mean something.
        </p>
      </div>

      {feedback && (
        <div className="border border-hash-green/30 bg-hash-green/5 rounded-md p-3 text-hash-green text-xs font-mono">
          {feedback}
        </div>
      )}

      {/* ── Disputes ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-txt-primary flex items-center gap-2 uppercase tracking-wider font-mono text-[12px]">
          <Gavel className="w-4 h-4 text-role-verifier" /> Revoked credentials
        </h2>
        {revoked.length === 0 ? (
          <div className="text-txt-muted text-sm py-6 text-center border border-dashed border-border-main rounded-lg">
            No revoked credentials. Nothing to dispute — that's a good thing.
          </div>
        ) : (
          <div className="space-y-3">
            {revoked.map((c) => (
              <div key={c.id} className="bg-bg-surface border border-border-main rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-hash-red shrink-0" />
                    <span className="text-sm font-semibold text-txt-primary truncate">{c.title}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-hash-red border border-hash-red/30 px-1.5 py-0.5 rounded-sm">Revoked</span>
                  </div>
                  <p className="text-xs text-txt-secondary mt-1">{c.issuer}</p>
                  {c.revokedReason && <p className="text-xs text-txt-muted mt-1 italic">“{c.revokedReason}”</p>}
                </div>
                <div className="shrink-0">
                  {c.dispute ? (
                    <span className="text-[11px] font-semibold font-mono px-2.5 py-1.5 rounded-sm bg-role-verifier-soft text-role-verifier flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Under review
                    </span>
                  ) : (
                    <button
                      onClick={() => setDisputeFor(c)}
                      className="text-[12px] font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                    >
                      Dispute
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Vouch / two-tier skills ───────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-txt-primary flex items-center gap-2 uppercase tracking-wider font-mono text-[12px]">
          <Star className="w-4 h-4 text-role-candidate" /> Skill trust
        </h2>

        {loading ? (
          <div className="text-txt-muted text-sm py-6 text-center font-mono">Loading skill portfolio…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attested (peer-vouched) */}
            <div className="bg-bg-surface border border-border-main rounded-lg p-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-role-issuer mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Peer-attested
              </div>
              <div className="space-y-2">
                {attested.length === 0 ? (
                  <p className="text-xs text-txt-muted">No attested skills yet. Share a vouch link from the sandbox column.</p>
                ) : (
                  attested.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 border border-border-subtle rounded-md px-3 py-2">
                      <div className="min-w-0">
                        <span className="text-sm text-txt-primary font-medium">{s.name}</span>
                        {s.meta && <span className="text-[10px] text-txt-muted ml-2 font-mono">{s.meta}</span>}
                        <div className="text-[10px] font-mono text-txt-muted mt-0.5 flex items-center gap-1">
                          <Star className="w-3 h-3 text-role-verifier shrink-0" /> {s.voucherName} · {s.stakedPoints}pt staked
                        </div>
                      </div>
                      <div className="shrink-0">
                        {s.dispute ? (
                          <span className="text-[10px] font-mono text-role-verifier border border-role-verifier/30 px-1.5 py-0.5 rounded-sm">
                            Disputed
                          </span>
                        ) : (
                          <button
                            onClick={() => setAttDisputeIdx(i)}
                            className="text-[10px] font-mono text-txt-muted hover:text-hash-red border border-border-main hover:border-hash-red px-1.5 py-0.5 rounded-sm transition-colors cursor-pointer"
                            title="Dispute this attestation if it's fraudulent"
                          >
                            Dispute
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sandbox (self-declared, awaiting vouch) */}
            <div className="bg-bg-surface border border-border-main rounded-lg p-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-txt-muted mb-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Self-declared (needs a vouch)
              </div>
              <div className="space-y-2">
                {sandbox.length === 0 ? (
                  <p className="text-xs text-txt-muted">No sandbox skills yet — add one below.</p>
                ) : (
                  sandbox.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 border border-border-subtle rounded-md px-3 py-2">
                      <div className="min-w-0">
                        <span className="text-sm text-txt-primary font-medium">{s.name}</span>
                        {s.meta && <span className="text-[10px] text-txt-muted ml-2 font-mono">{s.meta}</span>}
                        {s.link && (
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-role-candidate hover:text-txt-primary ml-2 inline-flex items-center gap-0.5"
                          >
                            <LinkIcon className="w-2.5 h-2.5" /> proof
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => copyVouchLink(i)}
                        className="text-[11px] font-semibold border border-border-main hover:border-role-candidate text-txt-secondary hover:text-role-candidate px-2.5 py-1 rounded-sm transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        title="Copy a link a peer can use to vouch for this skill"
                      >
                        {copiedIdx === i ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Vouch link
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add sandbox skill */}
              <form onSubmit={handleAddSkill} className="mt-4 pt-3 border-t border-border-subtle space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-txt-muted flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add sandbox skill
                </div>
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Skill name (e.g. Rust)"
                  required
                  className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-candidate"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="Source (e.g. bootcamp)"
                    className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-candidate"
                  />
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="Proof link (optional)"
                    className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-xs font-mono text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-candidate"
                  />
                </div>
                <button
                  type="submit"
                  disabled={adding || !newSkill.trim()}
                  className="w-full py-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white font-semibold text-xs cursor-pointer transition-colors"
                >
                  {adding ? "Adding…" : "Add to sandbox"}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Dispute modals */}
      {disputeFor && (
        <DisputeModal
          title="Dispute credential"
          subject={disputeFor.title}
          note="Your dispute goes to an independent review queue — never back to the issuer who revoked it."
          onClose={() => setDisputeFor(null)}
          onSubmit={handleDispute}
        />
      )}
      {attDisputeIdx !== null && (
        <DisputeModal
          title="Dispute attestation"
          subject={attested[attDisputeIdx]?.name || "Attested skill"}
          note="Disputing freezes the voucher's staked reputation until an independent reviewer rules on it."
          onClose={() => setAttDisputeIdx(null)}
          onSubmit={handleAttestationDispute}
        />
      )}
    </div>
  );
}

function DisputeModal({
  title,
  subject,
  note,
  onClose,
  onSubmit,
}: {
  title: string;
  subject: string;
  note: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-strong rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-txt-primary flex items-center gap-2">
            <Gavel className="w-5 h-5 text-role-verifier" /> {title}
          </h3>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-txt-secondary mb-1">{subject}</p>
        <p className="text-xs text-txt-muted mb-4">{note}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this is in error…"
          rows={4}
          className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple resize-none mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm text-txt-secondary hover:text-txt-primary px-4 py-2 cursor-pointer">Cancel</button>
          <button
            onClick={() => onSubmit(reason.trim() || "Believed to be in error.")}
            className="text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
          >
            File dispute
          </button>
        </div>
      </div>
    </div>
  );
}
