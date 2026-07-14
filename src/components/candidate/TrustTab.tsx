import { useState } from "react";
import { ShieldCheck, ShieldAlert, Gavel, Star, Lock, CheckCircle2, X } from "lucide-react";
import { disputeCredential, vouchSkill } from "../../services/api";

// Trust tab — surfaces the two fraud-resistance mechanics from the deck that
// cc-v2 was missing: (1) DISPUTE a revoked credential, (2) peer VOUCH on skills
// (two-tier trust: self-declared "sandbox" → peer-attested). Both call the real
// backend contracts (/api/v1/credential/:id/dispute, /api/v1/student/.../vouch)
// when USE_MOCK=false, and the enriched mock otherwise.

interface Cred {
  id: number | string;
  title: string;
  issuer: string;
  status: string;
  revokedReason?: string;
  dispute?: { status: string; reason: string } | null;
}
interface Skill {
  name: string;
  category: string;
  tags?: string[];
  voucherName?: string;
  stakedPoints?: number;
  vouchedAt?: string;
}

export default function TrustTab({
  candidateId,
  credentials,
  sandboxSkills,
  attestedSkills,
}: {
  candidateId: string;
  credentials: Cred[];
  sandboxSkills: Skill[];
  attestedSkills: Skill[];
}) {
  const [creds, setCreds] = useState<Cred[]>(credentials);
  const [sandbox, setSandbox] = useState<Skill[]>(sandboxSkills);
  const [attested, setAttested] = useState<Skill[]>(attestedSkills);
  const [disputeFor, setDisputeFor] = useState<Cred | null>(null);

  const revoked = creds.filter((c) => c.status === "revoked");

  const handleVouch = async (index: number) => {
    const skill = sandbox[index];
    const res = await vouchSkill(candidateId, index, "You");
    if (res?.success) {
      setSandbox((prev) => prev.filter((_, i) => i !== index));
      setAttested((prev) => [
        ...prev,
        { ...skill, voucherName: res.attestedSkill?.voucherName || "You", stakedPoints: 10, vouchedAt: res.attestedSkill?.vouchedAt },
      ]);
    }
  };

  const handleDispute = async (reason: string) => {
    if (!disputeFor) return;
    const res = await disputeCredential(disputeFor.id, reason);
    if (res?.success) {
      setCreds((prev) =>
        prev.map((c) => (c.id === disputeFor.id ? { ...c, dispute: res.dispute } : c))
      );
    }
    setDisputeFor(null);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attested (peer-vouched) */}
          <div className="bg-bg-surface border border-border-main rounded-lg p-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-role-issuer mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Peer-attested
            </div>
            <div className="space-y-2">
              {attested.length === 0 ? (
                <p className="text-xs text-txt-muted">No attested skills yet.</p>
              ) : (
                attested.map((s, i) => (
                  <div key={i} className="flex items-center justify-between border border-border-subtle rounded-md px-3 py-2">
                    <div>
                      <span className="text-sm text-txt-primary font-medium">{s.name}</span>
                      <span className="text-[10px] text-txt-muted ml-2 font-mono">{s.category}</span>
                    </div>
                    <span className="text-[10px] font-mono text-txt-muted flex items-center gap-1">
                      <Star className="w-3 h-3 text-role-verifier" /> {s.voucherName} · {s.stakedPoints}pt
                    </span>
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
                <p className="text-xs text-txt-muted">All skills attested. 🎉</p>
              ) : (
                sandbox.map((s, i) => (
                  <div key={i} className="flex items-center justify-between border border-border-subtle rounded-md px-3 py-2">
                    <div>
                      <span className="text-sm text-txt-primary font-medium">{s.name}</span>
                      <span className="text-[10px] text-txt-muted ml-2 font-mono">{s.category}</span>
                    </div>
                    <button
                      onClick={() => handleVouch(i)}
                      className="text-[11px] font-semibold border border-border-main hover:border-role-candidate text-txt-secondary hover:text-role-candidate px-2.5 py-1 rounded-sm transition-colors cursor-pointer flex items-center gap-1"
                    >
                      Vouch
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dispute modal */}
      {disputeFor && <DisputeModal cred={disputeFor} onClose={() => setDisputeFor(null)} onSubmit={handleDispute} />}
    </div>
  );
}

function DisputeModal({ cred, onClose, onSubmit }: { cred: Cred; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-strong rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-txt-primary flex items-center gap-2">
            <Gavel className="w-5 h-5 text-role-verifier" /> Dispute credential
          </h3>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-txt-secondary mb-1">{cred.title}</p>
        <p className="text-xs text-txt-muted mb-4">
          Your dispute goes to an independent review queue — never back to the issuer who revoked it.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this revocation is in error…"
          rows={4}
          className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple resize-none mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm text-txt-secondary hover:text-txt-primary px-4 py-2 cursor-pointer">Cancel</button>
          <button
            onClick={() => onSubmit(reason.trim() || "Revocation believed to be in error.")}
            className="text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
          >
            File dispute
          </button>
        </div>
      </div>
    </div>
  );
}
