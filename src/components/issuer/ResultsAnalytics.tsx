// components/issuer/ResultsAnalytics.tsx
// Port of monorepo ReputationDashboard (Section 4.3) — outcome data the
// issuer can market with ("Our 2026 cohort: 85% verified placement"). Drives
// institutional adoption — value back, not just admin overhead. Mock
// aggregates for the demo, mirroring monorepo's ISSUER_REPUTATION fixture.
import { useState } from "react";
import { TrendingUp, Gauge, Clock, BarChart3, Megaphone, Copy, Check, ShieldCheck } from "lucide-react";

// Monorepo mock/data.js → ISSUER_REPUTATION (same values).
const ISSUER_REPUTATION = {
  cohort: "2026",
  placementRate: 0.85,
  avgCredScoreOfGraduates: 731,
  avgTimeToHireDays: 41,
  trend: [
    { month: "Jan", placements: 4 },
    { month: "Feb", placements: 9 },
    { month: "Mar", placements: 17 },
    { month: "Apr", placements: 22 },
    { month: "May", placements: 31 },
  ],
};

export default function ResultsAnalytics() {
  const r = ISSUER_REPUTATION;
  const maxP = Math.max(...r.trend.map((t) => t.placements));
  const [copied, setCopied] = useState(false);

  const embed = `<a href="https://credchain.io/registry">Verified on CredChain — ${Math.round(r.placementRate * 100)}% placement</a>`;
  const copyEmbed = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(embed).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Outcome stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResultStat
          icon={<TrendingUp className="w-4 h-4" />}
          label="Verified placement"
          value={`${Math.round(r.placementRate * 100)}%`}
          accent="text-brand-purple"
        />
        <ResultStat
          icon={<Gauge className="w-4 h-4" />}
          label="Avg graduate CredScore"
          value={String(r.avgCredScoreOfGraduates)}
          accent="text-hash-green"
        />
        <ResultStat
          icon={<Clock className="w-4 h-4" />}
          label="Avg time-to-hire"
          value={`${r.avgTimeToHireDays}d`}
          accent="text-role-verifier"
        />
      </div>

      {/* Placements/month bar chart */}
      <div className="bg-bg-surface border border-border-main rounded-lg p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-purple-soft text-brand-purple">
              <BarChart3 className="w-5 h-5" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="font-display text-sm font-bold text-txt-primary">Reputation Dashboard</h3>
              <p className="mt-0.5 text-xs text-txt-secondary">Your {r.cohort} cohort outcomes — yours to publish.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-hash-green/10 text-hash-green px-2.5 py-1 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Trusted issuer
          </span>
        </div>

        <p className="mt-5 text-xs font-medium text-txt-secondary">Placements / month</p>
        <div className="mt-3 flex items-end gap-3" style={{ height: 110 }}>
          {r.trend.map((t) => (
            <div key={t.month} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-semibold tabular-nums text-txt-secondary">{t.placements}</span>
              <div
                className="w-full rounded-t-md bg-brand-purple"
                style={{ height: `${(t.placements / maxP) * 80}px` }}
                title={String(t.placements)}
              />
              <span className="text-[10px] text-txt-muted">{t.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing-ready quote */}
      <div className="bg-brand-purple-soft border border-brand-purple/30 rounded-lg p-6">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-brand-purple" />
          <p className="text-sm font-semibold text-txt-primary">Marketing-ready quote</p>
        </div>
        <p className="mt-2 text-sm text-txt-secondary">
          "Our {r.cohort} cohort: {Math.round(r.placementRate * 100)}% verified placement on CredChain." — ready to
          quote.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-border-subtle bg-bg-elevated px-3 py-2.5 font-mono text-[13px] text-brand-purple">
            {embed}
          </code>
          <button
            type="button"
            onClick={copyEmbed}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-main hover:border-brand-purple px-3 py-2 text-xs font-semibold text-txt-secondary cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-hash-green" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-txt-muted mb-2">
        <span className={accent}>{icon}</span>
        {label}
      </div>
      <div className="font-display text-xl font-bold text-txt-primary">{value}</div>
    </div>
  );
}
