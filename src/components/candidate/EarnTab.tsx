import React, { useCallback, useEffect, useState } from "react";
import { Trophy, Coins, Clock, ShieldCheck, Users, ArrowRight, CheckCircle2, X, Star, Send, Link as LinkIcon, Globe } from "lucide-react";
import {
  getBounties,
  applyToBounty,
  getMyApplications,
  respondToDirectTask,
  submitDelivery,
  rateCounterparty,
  submitToGlobalBounty,
} from "../../services/api";
import { getBrandLogo } from "../../lib/brandLogos";

// Earn tab — the "Bounties" surface from the pitch deck.
// Reads getBounties() (live: GET /api/v1/bounties, mock: fixtures) and completes
// the candidate-side lifecycle: apply → (accept/decline direct task) → deliver →
// rate after the employer confirms. Global bounties take direct submissions.

interface Bounty {
  id: string;
  _id?: string;
  company: string;
  companyLogo: string;
  title: string;
  description: string;
  skillName: string;
  skillCategory: string;
  skillTags: string[];
  reward: string;
  rewardUSD: number;
  rewardSOL: number;
  requiredTier: string;
  status: string;
  deadline: string;
  escrowConfirmed: boolean;
  applicantCount: number;
  bountyType: string;
  sponsorVerified: boolean;
  myApplicationStatus: string | null;
  myApplicationId: string | null;
}

interface MyApplication {
  _id?: string;
  id?: string;
  // Live backend embeds the bounty ({id, title, company, reward, bountyType, ...});
  // bountyId is kept for mock fixtures / older shapes.
  bounty?: {
    id?: string;
    title?: string;
    company?: string;
    companyLogo?: string;
    reward?: string;
    status?: string;
    bountyType?: string;
  } | null;
  bountyId?: string;
  status: "applied" | "accepted" | "delivered" | "confirmed" | string;
  delivery?: { text?: string; links?: string[] } | null;
  // Live backend: rating.studentToEmployer / rating.employerToStudent.
  rating?: { studentToEmployer?: { stars?: number } | null; employerToStudent?: { stars?: number } | null } | null;
  bountyTitle?: string;
  company?: string;
  reward?: string;
  myRating?: { stars: number } | null;
  rated?: boolean;
}

// The bounty id an application points at, across live ({bounty:{id}}) and mock
// ({bountyId}) shapes.
const appBountyId = (a: MyApplication) => String(a.bounty?.id || a.bountyId || "");

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  invited: "Invited — respond",
  accepted: "Accepted",
  delivered: "Delivered",
  confirmed: "Won",
  declined: "Declined",
  submitted: "Submitted",
};

const appId = (a: MyApplication) => String(a._id || a.id || "");
const bountyKey = (b: Bounty) => String(b._id || b.id || "");

export default function EarnTab() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "mine">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modals
  const [applyFor, setApplyFor] = useState<Bounty | null>(null);
  const [deliverFor, setDeliverFor] = useState<{ bounty: Bounty | null; app: MyApplication } | null>(null);
  const [rateFor, setRateFor] = useState<{ bounty: Bounty | null; app: MyApplication } | null>(null);
  const [submitGlobalFor, setSubmitGlobalFor] = useState<Bounty | null>(null);

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 6000);
  };

  const refetch = useCallback(async () => {
    try {
      const list = await getBounties();
      setBounties(Array.isArray(list) ? list : []);
    } catch {
      setBounties([]);
    }
    try {
      const res = await getMyApplications();
      setApplications(Array.isArray(res?.applications) ? res.applications : []);
    } catch {
      setApplications([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await refetch();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [refetch]);

  const findBounty = (id: string) => bounties.find((b) => bountyKey(b) === String(id)) || null;

  // ── Actions (all refetch afterwards so statuses stay in sync) ──
  const doApply = async (b: Bounty, message: string) => {
    const id = bountyKey(b);
    setBusyId(id);
    setApplyFor(null);
    try {
      await applyToBounty(id, message || undefined);
      flash(`Applied to "${b.title}".`);
      await refetch();
    } catch (err: any) {
      flash(`Could not apply: ${err?.message || "request failed"}`);
    } finally {
      setBusyId(null);
    }
  };

  const doRespond = async (b: Bounty | null, decision: "accept" | "decline", fallbackId?: string) => {
    const id = b ? bountyKey(b) : String(fallbackId || "");
    if (!id) {
      flash("Could not resolve the task to respond to.");
      return;
    }
    setBusyId(id);
    try {
      await respondToDirectTask(id, decision);
      flash(decision === "accept" ? `Accepted task "${b?.title || "task"}".` : `Declined task "${b?.title || "task"}".`);
      await refetch();
    } catch (err: any) {
      flash(`Could not ${decision}: ${err?.message || "request failed"}`);
    } finally {
      setBusyId(null);
    }
  };

  const doDeliver = async (bId: string, aId: string, text: string, links: string[]) => {
    setBusyId(bId);
    setDeliverFor(null);
    try {
      await submitDelivery(bId, aId, text, links);
      flash("Delivery submitted — waiting for the employer to confirm.");
      await refetch();
    } catch (err: any) {
      flash(`Could not submit delivery: ${err?.message || "request failed"}`);
    } finally {
      setBusyId(null);
    }
  };

  const doRate = async (bId: string, aId: string, stars: number, comment: string) => {
    setBusyId(bId);
    setRateFor(null);
    try {
      await rateCounterparty(bId, aId, stars, comment || undefined);
      flash("Rating submitted. Thanks for keeping the network honest.");
      await refetch();
    } catch (err: any) {
      flash(`Could not submit rating: ${err?.message || "request failed"}`);
    } finally {
      setBusyId(null);
    }
  };

  const doSubmitGlobal = async (b: Bounty, text: string, links: string[]) => {
    const id = bountyKey(b);
    setBusyId(id);
    setSubmitGlobalFor(null);
    try {
      await submitToGlobalBounty(id, text, links);
      flash(`Entry submitted to "${b.title}".`);
      await refetch();
    } catch (err: any) {
      flash(`Could not submit entry: ${err?.message || "request failed"}`);
    } finally {
      setBusyId(null);
    }
  };

  // ── Derived views ────────────────────────────────────────
  const visible = bounties.filter((b) => {
    if (filter === "open") return b.status === "open";
    if (filter === "mine") return Boolean(b.myApplicationStatus);
    return true;
  });

  const totalEscrow = bounties.reduce((sum, b) => sum + (b.rewardUSD || 0), 0);
  const openCount = bounties.filter((b) => b.status === "open").length;
  const appliedCount = applications.length || bounties.filter((b) => b.myApplicationStatus).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-txt-primary flex items-center gap-2">
            <Trophy className="w-6 h-6 text-role-verifier" strokeWidth={1.75} />
            Earn
          </h1>
          <p className="text-txt-secondary text-sm mt-1 max-w-[560px]">
            Apply to skill bounties from verified employers. Payment is held in Solana escrow and released on delivery — winning a bounty mints a verified credential to your portfolio.
          </p>
        </div>
      </div>

      {/* Action feedback */}
      {feedback && (
        <div className="border border-hash-green/30 bg-hash-green/5 rounded-md p-3 text-hash-green text-xs font-mono">
          {feedback}
        </div>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={<Coins className="w-4 h-4" />} label="Open Bounties" value={String(openCount)} accent="text-role-issuer" />
        <StatCard icon={<ShieldCheck className="w-4 h-4" />} label="Total in Escrow" value={`$${totalEscrow.toLocaleString()}`} accent="text-role-candidate" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Your Applications" value={String(appliedCount)} accent="text-role-verifier" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border-main">
        {(["all", "open", "mine"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              filter === f
                ? "border-brand-purple text-txt-primary"
                : "border-transparent text-txt-secondary hover:text-txt-primary"
            }`}
          >
            {f === "all" ? "All Bounties" : f === "open" ? "Open" : "My Applications"}
          </button>
        ))}
      </div>

      {/* Bounty list */}
      {loading ? (
        <div className="text-txt-muted text-sm py-12 text-center font-mono">Loading bounties…</div>
      ) : filter === "mine" ? (
        <MyApplicationsPanel
          applications={applications}
          bounties={bounties}
          busyId={busyId}
          onRespond={doRespond}
          onDeliver={(app) => setDeliverFor({ bounty: findBounty(appBountyId(app)), app })}
          onRate={(app) => setRateFor({ bounty: findBounty(appBountyId(app)), app })}
        />
      ) : visible.length === 0 ? (
        <div className="text-txt-muted text-sm py-12 text-center border border-dashed border-border-main rounded-lg">
          No bounties in this view yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((b) => (
            <BountyCard
              key={bountyKey(b)}
              bounty={b}
              busy={busyId === bountyKey(b)}
              onApply={() => setApplyFor(b)}
              onRespond={(d) => doRespond(b, d)}
              onSubmitGlobal={() => setSubmitGlobalFor(b)}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {applyFor && (
        <ApplyModal bounty={applyFor} onClose={() => setApplyFor(null)} onSubmit={(msg) => doApply(applyFor, msg)} />
      )}
      {deliverFor && (
        <DeliverModal
          title={deliverFor.bounty?.title || deliverFor.app.bountyTitle || "Bounty delivery"}
          onClose={() => setDeliverFor(null)}
          onSubmit={(text, links) =>
            doDeliver(
              deliverFor.bounty ? bountyKey(deliverFor.bounty) : appBountyId(deliverFor.app),
              appId(deliverFor.app),
              text,
              links
            )
          }
        />
      )}
      {rateFor && (
        <RateModal
          title={rateFor.bounty?.title || rateFor.app.bountyTitle || "Rate employer"}
          onClose={() => setRateFor(null)}
          onSubmit={(stars, comment) =>
            doRate(
              rateFor.bounty ? bountyKey(rateFor.bounty) : appBountyId(rateFor.app),
              appId(rateFor.app),
              stars,
              comment
            )
          }
        />
      )}
      {submitGlobalFor && (
        <DeliverModal
          title={`Submit entry · ${submitGlobalFor.title}`}
          submitLabel="Submit entry"
          onClose={() => setSubmitGlobalFor(null)}
          onSubmit={(text, links) => doSubmitGlobal(submitGlobalFor, text, links)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-4">
      <div className={`flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-txt-muted mb-2`}>
        <span className={accent}>{icon}</span>
        {label}
      </div>
      <div className="font-display text-xl font-bold text-txt-primary">{value}</div>
    </div>
  );
}

function BountyCard({
  bounty: b,
  busy,
  onApply,
  onRespond,
  onSubmitGlobal,
}: {
  bounty: Bounty;
  busy: boolean;
  onApply: () => void;
  onRespond: (decision: "accept" | "decline") => void;
  onSubmitGlobal: () => void;
}) {
  const applied = Boolean(b.myApplicationStatus);
  const isGlobal = b.bountyType === "global";
  // Direct task offered to this candidate — backend uses bountyType 'direct'
  // with application status 'invited' (mock fixtures use 'assigned'/'applied').
  const isDirectOffer =
    (b.bountyType === "direct" && b.myApplicationStatus === "invited") ||
    (b.bountyType === "assigned" && b.myApplicationStatus === "applied");

  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5 flex flex-col gap-4 transition-colors hover:border-border-strong">
      {/* Head */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-bg-elevated border border-border-main flex items-center justify-center text-lg shrink-0 overflow-hidden">
            {getBrandLogo(b.company) ? (
              <img
                src={getBrandLogo(b.company)!}
                alt={`${b.company} logo`}
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              b.companyLogo || (isGlobal ? <Globe className="w-4 h-4 text-txt-muted" /> : "🏷️")
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-txt-primary truncate">{b.company}</span>
              {b.sponsorVerified && <ShieldCheck className="w-3.5 h-3.5 text-role-issuer shrink-0" />}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-txt-muted">
              {b.skillCategory}
              {isGlobal && " · Global"}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-lg font-bold text-role-issuer">{b.reward}</div>
          <div className="text-[10px] font-mono text-txt-muted">≈ {b.rewardSOL} SOL</div>
        </div>
      </div>

      {/* Body */}
      <div>
        <h3 className="text-sm font-semibold text-txt-primary mb-1">{b.title}</h3>
        <p className="text-xs text-txt-secondary leading-relaxed line-clamp-2">{b.description}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {(b.skillTags || []).slice(0, 4).map((t) => (
          <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-brand-purple-soft text-txt-secondary border border-border-subtle">
            {t}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border-main mt-auto">
        <div className="flex items-center gap-3 text-[11px] font-mono text-txt-muted">
          {b.escrowConfirmed && (
            <span className="flex items-center gap-1 text-role-issuer">
              <ShieldCheck className="w-3.5 h-3.5" /> Escrow held
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {b.applicantCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {b.deadline ? String(b.deadline).slice(0, 10) : "—"}
          </span>
        </div>

        {isDirectOffer ? (
          <div className="flex items-center gap-1.5">
            <button
              disabled={busy}
              onClick={() => onRespond("accept")}
              className="text-[11px] font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              Accept task
            </button>
            <button
              disabled={busy}
              onClick={() => onRespond("decline")}
              className="text-[11px] font-semibold border border-border-main hover:border-hash-red text-txt-secondary hover:text-hash-red disabled:opacity-50 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              Decline
            </button>
          </div>
        ) : applied ? (
          <span className="text-[11px] font-semibold font-mono px-2.5 py-1.5 rounded-sm bg-role-candidate-soft text-role-candidate">
            {STATUS_LABEL[b.myApplicationStatus as string] || "Applied"}
          </span>
        ) : isGlobal ? (
          <button
            disabled={busy || b.status !== "open"}
            onClick={onSubmitGlobal}
            className="text-[12px] font-semibold inline-flex items-center gap-1 bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            Submit entry <Send className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            disabled={busy || b.status !== "open"}
            onClick={onApply}
            className="text-[12px] font-semibold inline-flex items-center gap-1 bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            {busy ? "Applying…" : "Apply"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── My applications panel (deliver / rate lifecycle) ─────── */
function MyApplicationsPanel({
  applications,
  bounties,
  busyId,
  onRespond,
  onDeliver,
  onRate,
}: {
  applications: MyApplication[];
  bounties: Bounty[];
  busyId: string | null;
  onRespond: (bounty: Bounty | null, decision: "accept" | "decline", fallbackId?: string) => void;
  onDeliver: (app: MyApplication) => void;
  onRate: (app: MyApplication) => void;
}) {
  if (applications.length === 0) {
    return (
      <div className="text-txt-muted text-sm py-12 text-center border border-dashed border-border-main rounded-lg">
        You haven't applied to any bounties yet. Open bounties are one tab over.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {applications.map((a) => {
        const bid = appBountyId(a);
        const b = bounties.find((x) => bountyKey(x) === bid) || null;
        const title = a.bounty?.title || b?.title || a.bountyTitle || "Bounty";
        const company = a.bounty?.company || b?.company || a.company || "";
        const busy = busyId === bid;
        const status = String(a.status || "applied");
        // Live backend: rating.studentToEmployer records the candidate's own rating.
        const rated = Boolean(a.rating?.studentToEmployer?.stars || a.rated || a.myRating);
        return (
          <div
            key={appId(a) || appBountyId(a)}
            className="bg-bg-surface border border-border-main rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-txt-primary truncate">{title}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-role-candidate-soft text-role-candidate">
                  {STATUS_LABEL[status] || status}
                </span>
              </div>
              {company && <p className="text-xs text-txt-secondary mt-0.5">{company}</p>}
              {a.delivery?.text && (
                <p className="text-[11px] font-mono text-txt-muted mt-1 truncate">Delivered: {a.delivery.text}</p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {((status === "invited" && (a.bounty?.bountyType || b?.bountyType) === "direct") ||
                (status === "applied" && (a.bounty?.bountyType || b?.bountyType) === "assigned")) && (
                <>
                  <button
                    disabled={busy}
                    onClick={() => onRespond(b, "accept", bid)}
                    className="text-[11px] font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => onRespond(b, "decline", bid)}
                    className="text-[11px] font-semibold border border-border-main hover:border-hash-red text-txt-secondary hover:text-hash-red disabled:opacity-50 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    Decline
                  </button>
                </>
              )}
              {status === "accepted" && (
                <button
                  disabled={busy}
                  onClick={() => onDeliver(a)}
                  className="text-[12px] font-semibold inline-flex items-center gap-1 bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                >
                  Submit delivery <Send className="w-3.5 h-3.5" />
                </button>
              )}
              {status === "delivered" && (
                <span className="text-[11px] font-mono text-txt-muted">Awaiting employer confirmation…</span>
              )}
              {status === "confirmed" &&
                (rated ? (
                  <span className="text-[11px] font-mono text-role-issuer flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid &amp; rated
                  </span>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => onRate(a)}
                    className="text-[12px] font-semibold inline-flex items-center gap-1 border border-border-main hover:border-role-verifier text-txt-secondary hover:text-role-verifier disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" /> Rate employer
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Modals (shared shell matches TrustTab's DisputeModal) ── */
function ModalShell({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-strong rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-txt-primary flex items-center gap-2">{title}</h3>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ApplyModal({ bounty, onClose, onSubmit }: { bounty: Bounty; onClose: () => void; onSubmit: (message: string) => void }) {
  const [message, setMessage] = useState("");
  return (
    <ModalShell title={<><Trophy className="w-5 h-5 text-role-verifier" /> Apply to bounty</>} onClose={onClose}>
      <p className="text-sm text-txt-secondary mb-1">{bounty.title}</p>
      <p className="text-xs text-txt-muted mb-4">
        {bounty.company} · {bounty.reward} in escrow. A short pitch helps the employer pick you.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Why you're the right candidate (optional)…"
        rows={4}
        className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple resize-none mb-4"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm text-txt-secondary hover:text-txt-primary px-4 py-2 cursor-pointer">Cancel</button>
        <button
          onClick={() => onSubmit(message.trim())}
          className="text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          Submit application
        </button>
      </div>
    </ModalShell>
  );
}

function DeliverModal({
  title,
  submitLabel = "Submit delivery",
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (text: string, links: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [linksRaw, setLinksRaw] = useState("");
  const links = linksRaw
    .split(/[\n,]/)
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <ModalShell title={<><Send className="w-5 h-5 text-role-candidate" /> {title}</>} onClose={onClose}>
      <p className="text-xs text-txt-muted mb-4">
        Describe what you built and link the proof (repo, demo, docs). The employer reviews this before escrow is released.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Summary of your delivery…"
        rows={4}
        className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple resize-none mb-3"
      />
      <div className="flex items-center gap-2 mb-1 text-[11px] font-mono uppercase tracking-wider text-txt-muted">
        <LinkIcon className="w-3.5 h-3.5" /> Proof links (one per line)
      </div>
      <textarea
        value={linksRaw}
        onChange={(e) => setLinksRaw(e.target.value)}
        placeholder={"https://github.com/you/repo\nhttps://demo.example.com"}
        rows={3}
        className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-xs font-mono text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple resize-none mb-4"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm text-txt-secondary hover:text-txt-primary px-4 py-2 cursor-pointer">Cancel</button>
        <button
          disabled={!text.trim()}
          onClick={() => onSubmit(text.trim(), links)}
          className="text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function RateModal({ title, onClose, onSubmit }: { title: string; onClose: () => void; onSubmit: (stars: number, comment: string) => void }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <ModalShell title={<><Star className="w-5 h-5 text-role-verifier" /> Rate employer</>} onClose={onClose}>
      <p className="text-sm text-txt-secondary mb-4">{title}</p>
      <div className="flex items-center gap-1.5 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setStars(n)} className="cursor-pointer" aria-label={`${n} star${n > 1 ? "s" : ""}`}>
            <Star
              className={`w-6 h-6 transition-colors ${n <= stars ? "text-role-verifier fill-current" : "text-txt-muted"}`}
              strokeWidth={1.75}
            />
          </button>
        ))}
        <span className="text-xs font-mono text-txt-muted ml-2">{stars}/5</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was working with this employer? (optional)"
        rows={3}
        className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple resize-none mb-4"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm text-txt-secondary hover:text-txt-primary px-4 py-2 cursor-pointer">Cancel</button>
        <button
          onClick={() => onSubmit(stars, comment.trim())}
          className="text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          Submit rating
        </button>
      </div>
    </ModalShell>
  );
}
