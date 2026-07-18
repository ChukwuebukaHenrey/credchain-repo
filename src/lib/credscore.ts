// CredChain — CredScore engine (ported from monorepo frontend/src/lib/credScore.js)
// Mirrors the backend formula exactly. Server score always takes priority.
//   pathwayScore   = min(totalCompositeWeight, 1.0) × 200  → max 200
//   deliveryScore  = min(completedDeliveries × 15, 300)     → max 300
//   disputePenalty = confirmedDisputesAgainst × 40
//   tenureBonus    = floor(monthsActive / 3) × 10           → max 100
//   range: 300–850

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

export interface ScoreBreakdown {
  pathwayScore: number;
  deliveryScore: number;
  disputePenalty: number;
  tenureBonus: number;
  total: number;
  onChainCount: number;
}

export interface ScoreContribution {
  title: string;
  tier: string;
  compositeWeight: number;
  onChain: boolean;
  skillCategory: string;
  skillTags: string[];
}

export function computeCredScore(
  verifiedCredentials: any[] = [],
  serverCredScore: any = null
): { score: number; breakdown: ScoreBreakdown; contributions: ScoreContribution[] } {
  const contributions: ScoreContribution[] = verifiedCredentials.map((c) => ({
    title: c.title,
    tier: c.trustTier || "learner",
    compositeWeight: c.compositeWeight || 0.2,
    onChain: Boolean(c.solanaTxSignature || c.txSignature),
    skillCategory: c.skillCategory || "Other",
    skillTags: c.skillTags || [],
  }));
  const onChainCount = contributions.filter((c) => c.onChain).length;

  // Server score has delivery + tenure data — always prefer it.
  if (serverCredScore && typeof serverCredScore.value === "number") {
    const { value, breakdown } = serverCredScore;
    return {
      score: value,
      breakdown: {
        pathwayScore: breakdown?.pathwayScore ?? 0,
        deliveryScore: breakdown?.deliveryScore ?? 0,
        disputePenalty: breakdown?.disputePenalty ?? 0,
        tenureBonus: breakdown?.tenureBonus ?? 0,
        total: verifiedCredentials.length,
        onChainCount,
      },
      contributions,
    };
  }

  // Client-side estimate (no server score available yet).
  const totalWeight = Math.min(
    1.0,
    verifiedCredentials.reduce((sum, c) => sum + (c.compositeWeight || 0.2), 0)
  );
  const pathwayScore = Math.round(totalWeight * 200);
  const score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, SCORE_MIN + pathwayScore));

  return {
    score,
    breakdown: { pathwayScore, deliveryScore: 0, disputePenalty: 0, tenureBonus: 0, total: verifiedCredentials.length, onChainCount },
    contributions,
  };
}

export function scoreBand(score: number) {
  if (score >= 800) return { label: "Elite", color: "#34d399" };
  if (score >= 740) return { label: "Trusted", color: "#10b981" };
  if (score >= 670) return { label: "Established", color: "#22d3ee" };
  if (score >= 580) return { label: "Developing", color: "#818cf8" };
  if (score >= 450) return { label: "Emerging", color: "#a78bfa" };
  return { label: "Getting started", color: "#94a3b8" };
}

export function improvementTips(breakdown: Partial<ScoreBreakdown>, academicStatus?: string): string[] {
  const tips: string[] = [];
  const { total, onChainCount, deliveryScore, pathwayScore } = breakdown || {};
  const inSchool = academicStatus === "in_school" || academicStatus === "nysc";

  if (!total) {
    tips.push(
      inSchool
        ? "Start your Verified Ledger: accept a credential from a verified issuer or complete a Coursera course via Platform Integration."
        : "Add your first credential to start building your score."
    );
  }
  if ((onChainCount || 0) < (total || 0)) {
    tips.push("Accept all pending credentials to anchor them on Solana — each one increases your pathway weight.");
  }
  if ((deliveryScore || 0) === 0) {
    tips.push(
      inSchool
        ? "Apply for a Micro-Bounty in the Earn tab — even one confirmed paid delivery adds +15 points and makes you discoverable to employers searching for paid experience."
        : "Complete a marketplace task — each confirmed delivery adds +15 points."
    );
  }
  if ((pathwayScore || 0) < 100) {
    tips.push("Add a professional certification (Coursera, Meta, Google) — platform-verified credentials carry stronger pathway weight than self-reported skills.");
  }
  tips.push("Tenure bonus grows +10 every quarter you stay active — students who start in year one graduate with a significant head start.");
  return tips.slice(0, 4);
}

export const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  learner:             { label: "Learner",             color: "#94a3b8", icon: "🌱" },
  practitioner:        { label: "Practitioner",        color: "#818cf8", icon: "⚙️" },
  proven_practitioner: { label: "Proven Practitioner", color: "#22d3ee", icon: "✅" },
  expert:              { label: "Expert",              color: "#10b981", icon: "🏆" },
  master:              { label: "Master",              color: "#f59e0b", icon: "👑" },
};

export const TIER_ORDER = ["learner", "practitioner", "proven_practitioner", "expert", "master"];

export const ACADEMIC_STATUS_LABEL: Record<string, string> = {
  in_school: "📚 Currently in school",
  nysc: "🪖 NYSC",
  graduate: "🎓 Graduate",
  professional: "💼 Professional",
};

export function tierMeetsRequirement(studentHighestTier?: string, requiredTier?: string) {
  const studentIdx = TIER_ORDER.indexOf(studentHighestTier || "learner");
  const requiredIdx = TIER_ORDER.indexOf(requiredTier || "learner");
  return studentIdx >= requiredIdx;
}

export function shortHash(value?: string | null, head = 8, tail = 6) {
  if (!value) return "";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function timeAgo(dateish?: string | Date | null) {
  if (!dateish) return "";
  const d = new Date(dateish);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}
