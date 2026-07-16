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

// Tier → badge classes. Covers both the backend trust-tier vocabulary
// (learner | practitioner | proven_practitioner | expert | master) and the
// legacy cc-v2 display vocab (verified | trusted | elite).
export const TIER_CLASS: Record<string, string> = {
  learner: "text-txt-muted border-border-main",
  practitioner: "text-hash-green border-hash-green/30",
  proven_practitioner: "text-role-verifier border-role-verifier/30",
  expert: "text-brand-purple border-brand-purple/30",
  master: "text-brand-purple border-brand-purple/50",
  verified: "text-hash-green border-hash-green/30",
  trusted: "text-role-verifier border-role-verifier/30",
  elite: "text-brand-purple border-brand-purple/30",
};

export function tierBadgeClass(tier?: string): string {
  return TIER_CLASS[(tier || "").toLowerCase()] || TIER_CLASS.learner;
}

export function normalizeTalent(raw: any): TalentEntry {
  const stats = raw?.deliveryStats || {};
  // /v1/talent/search returns StudentProfile docs with a populated userId
  // ({_id, name, email}); /v1/employer/talent-feed returns a flatter shape.
  const userRef = raw?.userId && typeof raw.userId === "object" ? raw.userId : null;
  const rawScore = raw?.credScore;
  return {
    userId: String(userRef?._id || raw?.userId || raw?._id || raw?.id || ""),
    name: raw?.name || userRef?.name || "Unknown candidate",
    headline: raw?.headline || undefined,
    credScore:
      typeof rawScore === "number" ? rawScore : rawScore?.value ?? rawScore?.total ?? undefined,
    highestTier: raw?.highestTier || raw?.tier || undefined,
    skillTags: Array.isArray(raw?.skillTags) ? raw.skillTags : [],
    university: raw?.university || raw?.institution || undefined,
    location:
      typeof raw?.location === "string"
        ? raw.location
        : [raw?.location?.city, raw?.location?.country].filter(Boolean).join(", ") || undefined,
    credchainId: raw?.credchainId || userRef?.credchainId || undefined,
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
