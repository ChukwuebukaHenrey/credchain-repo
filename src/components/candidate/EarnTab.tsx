import { useEffect, useState } from "react";
import { Trophy, Coins, Clock, ShieldCheck, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { getBounties } from "../../services/api";

// Earn tab — the "Bounties" surface from the pitch deck (biggest gap in cc-v2).
// Reads getBounties(), which returns cc-v2 mock while USE_MOCK=true and the live
// GET /api/v1/bounties response (backend publicBounty shape) when USE_MOCK=false.
// Both shapes are identical, so this renders the same either way.

interface Bounty {
  id: string;
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
}

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  accepted: "Accepted",
  delivered: "Delivered",
  confirmed: "Won",
};

export default function EarnTab() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "mine">("all");

  useEffect(() => {
    let alive = true;
    getBounties()
      .then((list: Bounty[]) => alive && setBounties(Array.isArray(list) ? list : []))
      .catch(() => alive && setBounties([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const visible = bounties.filter((b) => {
    if (filter === "open") return b.status === "open";
    if (filter === "mine") return Boolean(b.myApplicationStatus);
    return true;
  });

  const totalEscrow = bounties.reduce((sum, b) => sum + (b.rewardUSD || 0), 0);
  const openCount = bounties.filter((b) => b.status === "open").length;
  const appliedCount = bounties.filter((b) => b.myApplicationStatus).length;

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
      ) : visible.length === 0 ? (
        <div className="text-txt-muted text-sm py-12 text-center border border-dashed border-border-main rounded-lg">
          No bounties in this view yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((b) => (
            <BountyCard key={b.id} bounty={b} />
          ))}
        </div>
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

function BountyCard({ bounty: b }: { bounty: Bounty }) {
  const applied = Boolean(b.myApplicationStatus);
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5 flex flex-col gap-4 transition-colors hover:border-border-strong">
      {/* Head */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-bg-elevated border border-border-main flex items-center justify-center text-lg shrink-0">
            {b.companyLogo}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-txt-primary truncate">{b.company}</span>
              {b.sponsorVerified && <ShieldCheck className="w-3.5 h-3.5 text-role-issuer shrink-0" />}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-txt-muted">{b.skillCategory}</div>
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
        {b.skillTags.slice(0, 4).map((t) => (
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
            <Clock className="w-3.5 h-3.5" /> {b.deadline}
          </span>
        </div>
        {applied ? (
          <span className="text-[11px] font-semibold font-mono px-2.5 py-1.5 rounded-sm bg-role-candidate-soft text-role-candidate">
            {STATUS_LABEL[b.myApplicationStatus as string] || "Applied"}
          </span>
        ) : (
          <button className="text-[12px] font-semibold inline-flex items-center gap-1 bg-brand-purple hover:bg-brand-purple-dim text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer">
            Apply <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
