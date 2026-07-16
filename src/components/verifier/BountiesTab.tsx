import { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  ExternalLink,
  Globe,
  Loader2,
  PartyPopper,
  Plus,
  ShieldCheck,
  Star,
  Trophy,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  acceptApplicant,
  cancelBounty,
  confirmDelivery,
  createBounty,
  createGlobalBounty,
  getBountyApplicants,
  getGlobalSubmissions,
  getLeaderboard,
  rateCounterparty,
  selectWinners,
} from "../../services/api";
import { getBrandLogo } from "../../lib/brandLogos";
import { tierBadgeClass } from "./talent";

// Bounties tab (employer side) — full lifecycle over /api/v1/bounties:
// post (escrowed) → review applicants → accept → confirm delivery (releases
// escrow + mints a verified credential) → rate. Plus global challenges with
// ranked prizes, submissions review, winner selection and the leaderboard.

export interface Bounty {
  id: string;
  title: string;
  description: string;
  company?: string;
  companyLogo?: string;
  skillName?: string;
  skillCategory?: string;
  skillTags?: string[];
  reward?: string;
  rewardUSD?: number;
  requiredTier?: string;
  openTo?: string;
  deadline?: string;
  status: string;
  escrowConfirmed?: boolean;
  escrowState?: string;
  applicantCount?: number;
  bountyType?: string;
  prizes?: Array<{ rank?: number; place?: number; label?: string; reward?: string; amountUSD?: number }>;
  winners?: any[];
  submissionCount?: number;
  createdAt?: string;
}

interface Applicant {
  _id: string;
  studentName?: string;
  credScoreSnapshot?: number;
  highestTierSnapshot?: string;
  message?: string;
  status: string;
  delivery?: { text?: string; links?: string[]; submittedAt?: string } | null;
}

const BOUNTY_STATUS_CLASS: Record<string, string> = {
  open: "text-hash-green border-hash-green/30",
  in_progress: "text-role-verifier border-role-verifier/30",
  delivered: "text-brand-purple border-brand-purple/30",
  completed: "text-hash-green border-hash-green/30",
  cancelled: "text-txt-muted border-border-main",
};

function statusBadge(status: string) {
  return BOUNTY_STATUS_CLASS[status] || "text-txt-secondary border-border-main";
}

export default function BountiesTab({
  bounties,
  loading,
  error,
  refetch,
}: {
  bounties: Bounty[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}) {
  const [view, setView] = useState<"mine" | "global" | "leaderboard">("mine");
  const [createMode, setCreateMode] = useState<"standard" | "global" | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mine = bounties.filter((b) => b.bountyType !== "global");
  const global = bounties.filter((b) => b.bountyType === "global");
  const list = view === "global" ? global : mine;
  const totalEscrow = bounties.reduce((sum, b) => sum + (b.rewardUSD || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
            SKILL BOUNTIES
          </div>
          <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
            Post work. Pay from escrow. Mint proof.
          </h1>
          <p className="text-sm text-txt-secondary mt-1 max-w-[560px]">
            Rewards are held in Solana escrow and released on confirmed delivery — which also mints a verified credential to the candidate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateMode("standard")}
            className="px-4 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New bounty
          </button>
          <button
            type="button"
            onClick={() => setCreateMode("global")}
            className="px-4 py-2.5 rounded-md border border-border-main hover:border-role-verifier text-txt-primary font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5" /> New challenge
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BountyStat icon={<Coins className="w-4 h-4" />} label="Active bounties" value={String(mine.filter((b) => !["completed", "cancelled"].includes(b.status)).length)} />
        <BountyStat icon={<ShieldCheck className="w-4 h-4" />} label="Total in escrow" value={`$${totalEscrow.toLocaleString()}`} />
        <BountyStat icon={<Globe className="w-4 h-4" />} label="Global challenges" value={String(global.length)} />
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 border-b border-border-main">
        {([
          ["mine", "My bounties"],
          ["global", "Global challenges"],
          ["leaderboard", "Leaderboard"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              view === id
                ? "border-brand-purple text-txt-primary"
                : "border-transparent text-txt-secondary hover:text-txt-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "leaderboard" ? (
        <LeaderboardPanel />
      ) : loading ? (
        <div className="text-txt-muted text-sm py-12 text-center font-mono">Loading bounties…</div>
      ) : error ? (
        <div className="text-hash-red text-sm py-12 text-center border border-dashed border-hash-red/30 rounded-lg">{error}</div>
      ) : list.length === 0 ? (
        <div className="text-txt-muted text-sm py-12 text-center border border-dashed border-border-main rounded-lg">
          {view === "global"
            ? "No global challenges yet — launch one with ranked prizes."
            : "No bounties yet — post your first escrowed task."}
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((b) => (
            <BountyRow
              key={b.id}
              bounty={b}
              expanded={expandedId === b.id}
              onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
              refetch={refetch}
            />
          ))}
        </div>
      )}

      {createMode && (
        <CreateBountyModal
          mode={createMode}
          onClose={() => setCreateMode(null)}
          onCreated={() => {
            setCreateMode(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function BountyStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-txt-muted mb-2">
        <span className="text-role-verifier">{icon}</span>
        {label}
      </div>
      <div className="font-display text-xl font-bold text-txt-primary">{value}</div>
    </div>
  );
}

// ── One bounty row + expandable applicants / submissions panel ──
function BountyRow({
  bounty: b,
  expanded,
  onToggle,
  refetch,
}: {
  bounty: Bounty;
  expanded: boolean;
  onToggle: () => void;
  refetch: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const isGlobal = b.bountyType === "global";
  const cancellable = b.status === "open" && !isGlobal;

  const handleCancel = async () => {
    if (!window.confirm("Cancel this bounty? Escrow is returned to your wallet.")) return;
    setCancelling(true);
    setRowError(null);
    try {
      await cancelBounty(b.id);
      refetch();
    } catch (e: any) {
      setRowError(e?.message || "Failed to cancel bounty.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {(getBrandLogo(b.company) || b.companyLogo) && (
              <div className="w-8 h-8 rounded-md bg-bg-elevated border border-border-main flex items-center justify-center text-base shrink-0 overflow-hidden">
                {getBrandLogo(b.company) ? (
                  <img
                    src={getBrandLogo(b.company)!}
                    alt={`${b.company} logo`}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  b.companyLogo
                )}
              </div>
            )}
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-sm font-semibold text-txt-primary">{b.title}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-mono uppercase font-semibold ${statusBadge(b.status)}`}>
                {b.status.replace("_", " ")}
              </span>
              {b.escrowConfirmed && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[10px] font-mono uppercase font-semibold ${
                    b.escrowState === "released"
                      ? "text-hash-green border-hash-green/30"
                      : "text-role-issuer border-border-main"
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  Escrow {b.escrowState || "held"}
                </span>
              )}
              {isGlobal && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-brand-purple/30 text-brand-purple text-[10px] font-mono uppercase font-semibold">
                  <Globe className="w-3 h-3" /> Global
                </span>
              )}
            </div>
            <p className="text-xs text-txt-secondary leading-relaxed line-clamp-2">{b.description}</p>
          </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-display text-lg font-bold text-role-issuer">{b.reward || (b.rewardUSD ? `$${b.rewardUSD.toLocaleString()}` : "—")}</div>
            {b.deadline && (
              <div className="text-[10px] font-mono text-txt-muted mt-0.5 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {b.deadline}
              </div>
            )}
          </div>
        </div>

        {(b.skillTags?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {b.skillTags!.slice(0, 5).map((t) => (
              <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-brand-purple-soft text-txt-secondary border border-border-subtle">
                {t}
              </span>
            ))}
          </div>
        )}

        {isGlobal && (b.prizes?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {b.prizes!.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-sm border border-border-main text-txt-secondary">
                <Trophy className="w-3 h-3 text-role-verifier" />
                #{p.rank || p.place || i + 1} · {p.reward || p.label || (p.amountUSD ? `$${p.amountUSD}` : "prize")}
              </span>
            ))}
          </div>
        )}

        {rowError && <div className="text-hash-red text-xs mt-3">{rowError}</div>}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-main">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-txt-muted">
            <Users className="w-3.5 h-3.5" />
            {isGlobal ? `${b.submissionCount ?? 0} submissions` : `${b.applicantCount ?? 0} applicants`}
          </span>
          <div className="flex items-center gap-2">
            {cancellable && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border-main hover:border-hash-red hover:text-hash-red text-txt-secondary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-3.5 h-3.5" /> {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            )}
            <button
              type="button"
              onClick={onToggle}
              className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border-main hover:border-role-verifier text-txt-primary transition-colors cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {isGlobal ? "Submissions" : "Applicants"}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border-main bg-bg-sunken/50 p-5">
          {isGlobal ? (
            <SubmissionsPanel bounty={b} refetch={refetch} />
          ) : (
            <ApplicantsPanel bountyId={b.id} refetch={refetch} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Applicants: accept → view delivery → confirm (escrow release + mint) → rate ──
function ApplicantsPanel({ bountyId, refetch }: { bountyId: string; refetch: () => void }) {
  const [apps, setApps] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getBountyApplicants(bountyId)
      .then((r: any) => setApps(Array.isArray(r?.applications) ? r.applications : []))
      .catch((e: any) => setError(e?.message || "Failed to load applicants."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [bountyId]);

  const handleAccept = async (appId: string) => {
    setBusyId(appId);
    setActionError(null);
    try {
      await acceptApplicant(bountyId, appId);
      load();
      refetch();
    } catch (e: any) {
      setActionError(e?.message || "Failed to accept applicant.");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = async (appId: string) => {
    setBusyId(appId);
    setActionError(null);
    try {
      await confirmDelivery(bountyId, appId);
      setCelebrateId(appId);
      load();
      refetch();
    } catch (e: any) {
      setActionError(e?.message || "Failed to confirm delivery.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="text-txt-muted text-xs py-6 text-center font-mono">Loading applicants…</div>;
  if (error) return <div className="text-hash-red text-xs py-6 text-center">{error}</div>;
  if (apps.length === 0)
    return <div className="text-txt-muted text-xs py-6 text-center font-mono">No applicants yet.</div>;

  return (
    <div className="space-y-3">
      {actionError && <div className="text-hash-red text-xs">{actionError}</div>}
      {apps.map((a) => (
        <div key={a._id} className="bg-bg-surface border border-border-main rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-txt-primary">{a.studentName || "Candidate"}</span>
                {a.highestTierSnapshot && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-mono uppercase font-semibold ${tierBadgeClass(a.highestTierSnapshot)}`}>
                    {a.highestTierSnapshot}
                  </span>
                )}
                {typeof a.credScoreSnapshot === "number" && (
                  <span className="text-[11px] font-mono text-txt-muted">CredScore {a.credScoreSnapshot}</span>
                )}
              </div>
              {a.message && <p className="text-xs text-txt-secondary mt-1.5 leading-relaxed">{a.message}</p>}
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-mono uppercase font-semibold flex-shrink-0 ${statusBadge(a.status === "applied" ? "open" : a.status === "confirmed" ? "completed" : a.status)}`}>
              {a.status}
            </span>
          </div>

          {/* Delivered work */}
          {a.delivery && (a.delivery.text || (a.delivery.links?.length || 0) > 0) && (
            <div className="mt-3 bg-bg-sunken border border-border-main rounded-md p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-txt-muted mb-1.5">Delivered work</div>
              {a.delivery.text && <p className="text-xs text-txt-primary leading-relaxed whitespace-pre-wrap">{a.delivery.text}</p>}
              {(a.delivery.links || []).map((l) => (
                <a
                  key={l}
                  href={l}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-role-verifier hover:underline mt-1.5 mr-3 break-all"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" /> {l}
                </a>
              ))}
            </div>
          )}

          {/* Confirm-delivery celebration */}
          {(celebrateId === a._id || a.status === "confirmed") && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-md border border-hash-green/30 bg-bg-surface text-hash-green text-xs font-semibold">
              <PartyPopper className="w-4 h-4 flex-shrink-0" />
              Escrow released & verified credential minted on-chain to {a.studentName || "the candidate"}.
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {a.status === "applied" && (
              <button
                type="button"
                onClick={() => handleAccept(a._id)}
                disabled={busyId === a._id}
                className="text-[11px] font-semibold inline-flex items-center gap-1 bg-brand-purple hover:bg-brand-purple-dim text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busyId === a._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Accept applicant
              </button>
            )}
            {a.status === "delivered" && (
              <button
                type="button"
                onClick={() => handleConfirm(a._id)}
                disabled={busyId === a._id}
                className="text-[11px] font-semibold inline-flex items-center gap-1 bg-brand-purple hover:bg-brand-purple-dim text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busyId === a._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                Confirm delivery — release escrow & mint credential
              </button>
            )}
          </div>

          {/* Rate after confirm */}
          {(celebrateId === a._id || a.status === "confirmed") && <RateForm bountyId={bountyId} appId={a._id} />}
        </div>
      ))}
    </div>
  );
}

function RateForm({ bountyId, appId }: { bountyId: string; appId: string }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <div className="mt-3 text-xs text-hash-green inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> Rating submitted — thanks for keeping the network honest.
      </div>
    );
  }

  const submit = async () => {
    if (!stars) return;
    setState("saving");
    setError(null);
    try {
      await rateCounterparty(bountyId, appId, stars, comment.trim() || undefined);
      setState("done");
    } catch (e: any) {
      setError(e?.message || "Failed to submit rating.");
      setState("error");
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border-subtle">
      <div className="text-[10px] font-mono uppercase tracking-wider text-txt-muted mb-2">Rate this candidate</div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-0.5 cursor-pointer"
            >
              <Star
                className={`w-4 h-4 transition-colors ${n <= stars ? "text-role-verifier" : "text-txt-muted"}`}
                fill={n <= stars ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment"
          className="flex-1 min-w-[160px] bg-bg-sunken border border-border-main rounded-md px-3 py-1.5 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-verifier transition-colors"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!stars || state === "saving"}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-md border border-border-main hover:border-role-verifier text-txt-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === "saving" ? "Submitting…" : "Submit rating"}
        </button>
      </div>
      {error && <div className="text-hash-red text-xs mt-1.5">{error}</div>}
    </div>
  );
}

// ── Global challenge submissions + winner selection ──
function SubmissionsPanel({ bounty, refetch }: { bounty: Bounty; refetch: () => void }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // submissionId → rank (1-3), in pick order
  const [picks, setPicks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const prizeCount = Math.min(Math.max(bounty.prizes?.length || 1, 1), 3);
  const winnersAlready = (bounty.winners?.length || 0) > 0;

  useEffect(() => {
    let alive = true;
    getGlobalSubmissions(bounty.id)
      .then((r: any) => alive && setSubs(Array.isArray(r?.submissions) ? r.submissions : []))
      .catch((e: any) => alive && setError(e?.message || "Failed to load submissions."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bounty.id]);

  const togglePick = (id: string) => {
    setPicks((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < prizeCount ? [...prev, id] : prev
    );
  };

  const submitWinners = async () => {
    if (picks.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const winners = picks.map((id, i) => {
        const sub = subs.find((s) => String(s._id || s.id) === id);
        return {
          rank: i + 1,
          submissionId: id,
          studentId: sub?.studentId || sub?.userId || sub?.student?._id,
        };
      });
      await selectWinners(bounty.id, winners);
      setSaved(true);
      refetch();
    } catch (e: any) {
      setError(e?.message || "Failed to select winners.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-txt-muted text-xs py-6 text-center font-mono">Loading submissions…</div>;
  if (subs.length === 0 && !error)
    return <div className="text-txt-muted text-xs py-6 text-center font-mono">No submissions yet.</div>;

  return (
    <div className="space-y-3">
      {error && <div className="text-hash-red text-xs">{error}</div>}
      {saved ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-hash-green/30 text-hash-green text-xs font-semibold">
          <PartyPopper className="w-4 h-4" /> Winners selected — prizes released from escrow & credentials minted.
        </div>
      ) : winnersAlready ? (
        <div className="text-[11px] font-mono text-txt-muted">Winners already selected for this challenge.</div>
      ) : (
        <div className="text-[11px] font-mono text-txt-muted">
          Pick up to {prizeCount} winner{prizeCount > 1 ? "s" : ""} in rank order, then confirm.
        </div>
      )}
      {subs.map((s) => {
        const id = String(s._id || s.id);
        const rank = picks.indexOf(id);
        return (
          <div key={id} className="bg-bg-surface border border-border-main rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-txt-primary">{s.studentName || s.name || "Candidate"}</span>
                  {typeof s.credScoreSnapshot === "number" && (
                    <span className="text-[11px] font-mono text-txt-muted">CredScore {s.credScoreSnapshot}</span>
                  )}
                </div>
                {s.text && <p className="text-xs text-txt-secondary mt-1.5 leading-relaxed whitespace-pre-wrap">{s.text}</p>}
                {(s.links || []).map((l: string) => (
                  <a
                    key={l}
                    href={l}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-role-verifier hover:underline mt-1.5 mr-3 break-all"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" /> {l}
                  </a>
                ))}
              </div>
              {!winnersAlready && !saved && (
                <button
                  type="button"
                  onClick={() => togglePick(id)}
                  className={`text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer flex-shrink-0 ${
                    rank >= 0
                      ? "border-role-verifier text-role-verifier bg-role-verifier-soft"
                      : "border-border-main hover:border-role-verifier text-txt-secondary"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  {rank >= 0 ? `#${rank + 1} pick` : "Pick winner"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {!winnersAlready && !saved && picks.length > 0 && (
        <button
          type="button"
          onClick={submitWinners}
          disabled={saving}
          className="w-full py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
          {saving ? "Confirming winners…" : `Confirm ${picks.length} winner${picks.length > 1 ? "s" : ""} — release prizes`}
        </button>
      )}
    </div>
  );
}

// ── Leaderboard ──
function LeaderboardPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getLeaderboard()
      .then((r: any) => alive && setRows(Array.isArray(r?.leaderboard) ? r.leaderboard : []))
      .catch((e: any) => alive && setError(e?.message || "Failed to load leaderboard."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="text-txt-muted text-sm py-12 text-center font-mono">Loading leaderboard…</div>;
  if (error) return <div className="text-hash-red text-sm py-12 text-center border border-dashed border-hash-red/30 rounded-lg">{error}</div>;
  if (rows.length === 0)
    return (
      <div className="text-txt-muted text-sm py-12 text-center border border-dashed border-border-main rounded-lg">
        No leaderboard entries yet — winners of global challenges appear here.
      </div>
    );

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[480px]">
          <thead className="bg-bg-sunken text-txt-muted uppercase font-mono text-[10px] border-b border-border-main">
            <tr>
              <th className="p-4 pl-5">Rank</th>
              <th className="p-4">Candidate</th>
              <th className="p-4">Wins</th>
              <th className="p-4 text-right pr-5">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((r, i) => (
              <tr key={r._id || r.userId || i} className="hover:bg-bg-elevated/40 transition-colors">
                <td className="p-4 pl-5 font-mono text-role-verifier font-bold">#{r.rank ?? i + 1}</td>
                <td className="p-4 font-semibold text-txt-primary">{r.name || r.studentName || "Candidate"}</td>
                <td className="p-4 font-mono text-txt-secondary">{r.wins ?? r.winCount ?? "—"}</td>
                <td className="p-4 text-right pr-5 font-mono text-role-issuer">
                  {typeof (r.totalUSD ?? r.earnedUSD) === "number" ? `$${(r.totalUSD ?? r.earnedUSD).toLocaleString()}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Create bounty / global challenge modal ──
const TIER_OPTIONS = ["", "learner", "verified", "trusted", "elite"];

function CreateBountyModal({
  mode,
  onClose,
  onCreated,
}: {
  mode: "standard" | "global";
  onClose: () => void;
  onCreated: () => void;
}) {
  const isGlobal = mode === "global";
  const [form, setForm] = useState({
    title: "",
    description: "",
    skillName: "",
    skillCategory: "",
    skillTags: "",
    rewardUSD: "",
    requiredTier: "",
    deadline: "",
  });
  const [prizes, setPrizes] = useState<Array<{ label: string; amountUSD: string }>>([{ label: "1st place", amountUSD: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rewardUSD = isGlobal
      ? prizes.reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0)
      : Number(form.rewardUSD);
    if (!form.title.trim() || !form.description.trim() || !form.skillName.trim()) {
      setError("Title, description and skill are required.");
      return;
    }
    if (!rewardUSD || rewardUSD <= 0) {
      setError(isGlobal ? "Each prize needs a positive USD amount." : "Reward must be a positive USD amount.");
      return;
    }

    const tags = form.skillTags.split(",").map((t) => t.trim()).filter(Boolean);
    const base = {
      title: form.title.trim(),
      description: form.description.trim(),
      skill: form.skillName.trim(),
      skillName: form.skillName.trim(),
      skillCategory: form.skillCategory.trim() || "General",
      skillTags: tags,
      reward: `$${rewardUSD.toLocaleString()}`,
      rewardUSD,
      requiredTier: form.requiredTier || undefined,
      deadline: form.deadline || undefined,
    };

    setSaving(true);
    try {
      if (isGlobal) {
        await createGlobalBounty({
          ...base,
          prizes: prizes.map((p, i) => ({
            rank: i + 1,
            label: p.label.trim() || `#${i + 1}`,
            amountUSD: Number(p.amountUSD) || 0,
            reward: `$${(Number(p.amountUSD) || 0).toLocaleString()}`,
          })),
        });
      } else {
        await createBounty(base);
      }
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to create bounty.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-bg-surface border border-border-main rounded-lg p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-2">
              {isGlobal ? "GLOBAL CHALLENGE" : "ESCROWED BOUNTY"}
            </div>
            <h2 className="font-display font-bold text-xl text-txt-primary tracking-tight">
              {isGlobal ? "Launch a global challenge." : "Post a new bounty."}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-txt-muted hover:text-txt-primary p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <ModalField label="Title">
            <input type="text" value={form.title} onChange={set("title")} placeholder="Build a Solana Pay checkout widget" className={INPUT_CLASS} />
          </ModalField>
          <ModalField label="Description">
            <textarea value={form.description} onChange={set("description")} rows={3} placeholder="What should the candidate deliver?" className={`${INPUT_CLASS} resize-none`} />
          </ModalField>
          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Skill">
              <input type="text" value={form.skillName} onChange={set("skillName")} placeholder="React.js" className={INPUT_CLASS} />
            </ModalField>
            <ModalField label="Category">
              <input type="text" value={form.skillCategory} onChange={set("skillCategory")} placeholder="Frontend" className={INPUT_CLASS} />
            </ModalField>
          </div>
          <ModalField label="Skill tags (comma-separated)">
            <input type="text" value={form.skillTags} onChange={set("skillTags")} placeholder="React, TypeScript, Web3" className={INPUT_CLASS} />
          </ModalField>

          {isGlobal ? (
            <ModalField label="Prizes (1–3, rank order)">
              <div className="space-y-2">
                {prizes.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.label}
                      onChange={(e) => setPrizes((ps) => ps.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      placeholder={`${["1st", "2nd", "3rd"][i]} place`}
                      className={`${INPUT_CLASS} flex-1`}
                    />
                    <input
                      type="number"
                      min="1"
                      value={p.amountUSD}
                      onChange={(e) => setPrizes((ps) => ps.map((x, j) => (j === i ? { ...x, amountUSD: e.target.value } : x)))}
                      placeholder="USD"
                      className={`${INPUT_CLASS} w-28`}
                    />
                    {prizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPrizes((ps) => ps.filter((_, j) => j !== i))}
                        aria-label="Remove prize"
                        className="text-txt-muted hover:text-hash-red p-1 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {prizes.length < 3 && (
                  <button
                    type="button"
                    onClick={() => setPrizes((ps) => [...ps, { label: `${["1st", "2nd", "3rd"][ps.length]} place`, amountUSD: "" }])}
                    className="text-[11px] font-semibold inline-flex items-center gap-1 text-role-verifier hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add prize
                  </button>
                )}
              </div>
            </ModalField>
          ) : (
            <ModalField label="Reward (USD, escrowed)">
              <input type="number" min="1" value={form.rewardUSD} onChange={set("rewardUSD")} placeholder="1200" className={INPUT_CLASS} />
            </ModalField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Required tier (optional)">
              <select value={form.requiredTier} onChange={set("requiredTier")} className={INPUT_CLASS}>
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t ? t[0].toUpperCase() + t.slice(1) : "Any tier"}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Deadline (optional)">
              <input type="date" value={form.deadline} onChange={set("deadline")} className={INPUT_CLASS} />
            </ModalField>
          </div>

          {error && <div className="text-hash-red text-xs">{error}</div>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {saving ? "Posting…" : isGlobal ? "Launch challenge" : "Post bounty & fund escrow"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-md border border-border-main hover:border-border-strong text-txt-secondary text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const INPUT_CLASS =
  "w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-verifier transition-colors";

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  );
}
