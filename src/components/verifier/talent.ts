// Shared talent-entry shape + client-side shortlist for the verifier console.
// The backend returns slightly different field names across /v1/talent/search
// and /v1/employer/talent-feed — normalizeTalent() flattens both into one shape.
import { useCallback, useState } from "react";

export interface TalentEntry {
  userId: string;
  name: string;
  headline?: string;
  credScore?: number;
  highestTier?: string;
  skillTags: string[];
  university?: string;
  location?: string;
  credchainId?: string;
  deliveriesCompleted?: number;
}

// Tier → badge classes, matching the trust-tier vocabulary used across cc-v2
// (learner | verified | trusted | elite).
export const TIER_CLASS: Record<string, string> = {
  learner: "text-txt-muted border-border-main",
  verified: "text-hash-green border-hash-green/30",
  trusted: "text-role-verifier border-role-verifier/30",
  elite: "text-brand-purple border-brand-purple/30",
};

export function tierBadgeClass(tier?: string): string {
  return TIER_CLASS[(tier || "").toLowerCase()] || TIER_CLASS.learner;
}

export function normalizeTalent(raw: any): TalentEntry {
  const stats = raw?.deliveryStats || {};
  return {
    userId: String(raw?.userId || raw?._id || raw?.id || ""),
    name: raw?.name || "Unknown candidate",
    headline: raw?.headline || undefined,
    credScore: typeof raw?.credScore === "number" ? raw.credScore : raw?.credScore?.total,
    highestTier: raw?.highestTier || raw?.tier || undefined,
    skillTags: Array.isArray(raw?.skillTags) ? raw.skillTags : [],
    university: raw?.university || raw?.institution || undefined,
    location: raw?.location || undefined,
    credchainId: raw?.credchainId || undefined,
    deliveriesCompleted:
      typeof stats?.completed === "number" ? stats.completed : typeof stats?.delivered === "number" ? stats.delivered : undefined,
  };
}

// ── Client-side shortlist (starred candidates), persisted to localStorage ──
const SHORTLIST_KEY = "cc_verifier_shortlist";

function readShortlist(): TalentEntry[] {
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function useShortlist() {
  const [shortlist, setShortlist] = useState<TalentEntry[]>(readShortlist);

  const isShortlisted = useCallback(
    (userId: string) => shortlist.some((s) => s.userId === userId),
    [shortlist]
  );

  const toggleShortlist = useCallback((entry: TalentEntry) => {
    setShortlist((prev) => {
      const next = prev.some((s) => s.userId === entry.userId)
        ? prev.filter((s) => s.userId !== entry.userId)
        : [...prev, entry];
      try {
        localStorage.setItem(SHORTLIST_KEY, JSON.stringify(next));
      } catch {
        /* quota errors are non-fatal — shortlist stays in memory */
      }
      return next;
    });
  }, []);

  return { shortlist, isShortlisted, toggleShortlist };
}
