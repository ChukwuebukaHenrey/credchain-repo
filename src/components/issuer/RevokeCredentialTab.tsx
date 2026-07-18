// components/issuer/RevokeCredentialTab.tsx
// Port of monorepo RevocationRegistry (System 7, Section 7). Danger zone.
// Appends ":REVOKED" to the original hash and mints a fresh Solana Memo as a
// tamper-proof revocation record. Lists credentials minted this session (plus
// a manual ID field). Students can still DISPUTE a revocation from their
// vault — this isn't the issuer's unilateral last word.
import { useState } from "react";
import { AlertTriangle, Ban, FileWarning, Loader2 } from "lucide-react";
import { revokeCredential } from "../../services/api";
import { shortHash } from "../../lib/credscore";
import type { IssuedCredential } from "./IssueCredentialTab";

export default function RevokeCredentialTab({
  issued = [],
  onRevoked,
}: {
  issued?: IssuedCredential[];
  onRevoked?: (id: string, revokedTxSignature?: string) => void;
}) {
  const [manualId, setManualId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; title: string | null } | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 6000);
  };

  async function revoke(id?: string) {
    if (!id) return;
    setBusyId(id);
    try {
      const res: any = await revokeCredential(id);
      flash("ok", res?.message || "Credential revoked.");
      onRevoked?.(id, res?.credential?.revokedTxSignature);
      setManualId((prev) => (prev.trim() === id ? "" : prev));
    } catch (err: any) {
      const status = err?.status;
      flash(
        "err",
        status === 403
          ? "Only the verified issuer who minted a credential can revoke it."
          : status === 404
          ? "No credential found with that ID."
          : status === 409
          ? "That credential is already revoked."
          : err?.message || "Revocation failed."
      );
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  const active = issued.filter((c) => c.status !== "revoked");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="border-l-2 border-hash-red pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
          REVOCATION REGISTRY
        </div>
        <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">Revoke a credential.</h1>
        <p className="text-sm text-txt-secondary mt-1">
          Made a mistake? Remove a verified skill cleanly, with a permanent record of the change.
        </p>
      </div>

      {msg && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            msg.type === "ok"
              ? "border-hash-green/30 bg-hash-green/5 text-hash-green"
              : "border-hash-red/30 bg-hash-red/5 text-hash-red"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
        <div className="flex items-start gap-2 border-b border-hash-red/20 bg-hash-red/5 px-5 py-3 text-sm text-hash-red">
          <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
          <span>
            Danger zone — revoking appends <code className="font-mono text-[13px]">:REVOKED</code> on-chain. Students
            can still dispute.
          </span>
        </div>

        <div>
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-md border border-border-main bg-bg-sunken text-txt-muted flex items-center justify-center">
                <Ban className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-display font-semibold text-sm text-txt-primary">Nothing to revoke yet</h4>
                <p className="text-xs text-txt-secondary mt-1">
                  Credentials you issue this session appear here, ready for revocation.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {active.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-bg-sunken">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-txt-primary">{c.title}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-hash-green/10 text-hash-green px-2 py-0.5 text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-hash-green" /> Active
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[13px] text-txt-muted">{shortHash(c.sha256Hash || c.id)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => setConfirm({ id: c.id, title: c.title })}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold border border-hash-red text-hash-red hover:bg-hash-red/10 disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    {busyId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle px-5 py-4">
          <p className="text-xs font-medium text-txt-secondary">Revoke by credential ID</p>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <FileWarning className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="credential _id"
                className="w-full bg-bg-sunken border border-border-main rounded-md pl-9 pr-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-hash-red"
              />
            </div>
            <button
              type="button"
              onClick={() => setConfirm({ id: manualId.trim(), title: null })}
              disabled={!manualId.trim() || busyId === manualId.trim()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold border border-hash-red text-hash-red hover:bg-hash-red/10 disabled:opacity-50 px-4 py-2 rounded-md transition-colors cursor-pointer"
            >
              {busyId === manualId.trim() ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Revoke
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setConfirm(null)}
        >
          <div
            className="bg-bg-surface border border-border-strong rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-txt-primary">Remove this verified skill?</h3>
            <p className="text-sm text-txt-secondary mt-1">
              This permanently marks the skill as removed and records it so the change can't be undone or faked. The
              student can ask for a review if they disagree.
            </p>

            <div className="mt-4 flex items-start gap-3 rounded-md border border-hash-red/20 bg-hash-red/5 p-4">
              <AlertTriangle className="mt-0.5 w-5 h-5 shrink-0 text-hash-red" />
              <div className="text-sm text-txt-secondary">
                {confirm.title ? (
                  <p>
                    You are about to revoke <span className="font-semibold text-txt-primary">"{confirm.title}"</span>.
                  </p>
                ) : (
                  <p>
                    You are about to revoke credential{" "}
                    <span className="font-mono text-txt-primary">{shortHash(confirm.id || "")}</span>.
                  </p>
                )}
                <p className="mt-1.5">This action is recorded on-chain and cannot be silently undone.</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="text-sm text-txt-secondary hover:text-txt-primary px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => revoke(confirm.id)}
                disabled={!!busyId}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-hash-red hover:bg-hash-red/80 disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                {busyId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Revoke credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
