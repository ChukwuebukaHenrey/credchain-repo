// components/verifier/FindTalentTab.tsx
// Full port of monorepo TalentSearch + AssignTaskModal (employer economy
// layer). Search by skill/name/university, filter by tier, academic status,
// category, min CredScore, paid-deliveries; sort by score/deliveries/tier.
// Loads real verified students from /v1/talent/search (limit 50) and falls
// back to the monorepo TALENT_FEED fixture so the tab is never empty.
// Actions per card: Send message (credit-gated chat), Assign a task
// (POST /v1/bounties/direct with escrow), open the public verify page.
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Hexagon,
  Loader2,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  Target,
  X,
} from "lucide-react";
import { searchTalent, createDirectTask } from "../../services/api";
import { TIER_CONFIG, TIER_ORDER, scoreBand } from "../../lib/credscore";
import { TALENT_FEED, SKILL_CATEGORIES, adaptProfile, TalentProfile } from "./talentData";

const ACADEMIC_FILTERS = [
  { value: "all", label: "All students" },
  { value: "in_school", label: "📚 Currently in school" },
  { value: "nysc", label: "🪖 NYSC" },
  { value: "graduate", label: "🎓 Graduates" },
  { value: "professional", label: "💼 Professionals" },
];

const SORT_OPTIONS: Array<[string, string]> = [
  ["score", "CredScore"],
  ["deliveries", "Deliveries"],
  ["tier", "Tier"],
];

export default function FindTalentTab({
  onContact,
  onInviteToBounty,
  onNotify,
}: {
  onContact?: (student: TalentProfile) => void;
  onInviteToBounty?: () => void;
  onNotify?: (message: string, variant: "success" | "danger") => void;
}) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deliveriesOnly, setDeliveriesOnly] = useState(false);
  const [minScore, setMinScore] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feed, setFeed] = useState<TalentProfile[]>(TALENT_FEED);
  const [assignTo, setAssignTo] = useState<TalentProfile | null>(null);

  // Load real verified students once; keep the rich client-side filtering.
  // Falls back to the mock feed if the request fails or returns none.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data: any = await searchTalent({ limit: 50 });
        const students = (data?.students || []).map(adaptProfile).filter((s: TalentProfile) => s.id);
        if (alive && students.length) setFeed(students);
      } catch {
        /* keep the mock feed — the tab is never empty */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    let pool = feed.filter((s) => s.discoverable !== false);

    // Free text: search name, headline, skill tags, university
    if (query.trim()) {
      const terms = query.toLowerCase().split(" ").filter(Boolean);
      pool = pool.filter((s) =>
        terms.some(
          (t) =>
            s.name?.toLowerCase().includes(t) ||
            s.headline?.toLowerCase().includes(t) ||
            (s.skillTags || []).some((tag) => tag.toLowerCase().includes(t)) ||
            s.university?.toLowerCase().includes(t) ||
            s.course?.toLowerCase().includes(t)
        )
      );
    }

    if (tierFilter !== "all") {
      const minIdx = TIER_ORDER.indexOf(tierFilter);
      pool = pool.filter((s) => TIER_ORDER.indexOf(s.highestTier || "learner") >= minIdx);
    }
    if (statusFilter !== "all") {
      pool = pool.filter((s) => s.academicStatus === statusFilter);
    }
    if (categoryFilter !== "all") {
      pool = pool.filter((s) => (s.skillCategories || []).includes(categoryFilter));
    }
    if (deliveriesOnly) {
      pool = pool.filter((s) => (s.deliveries || 0) >= 1);
    }
    if (minScore && !isNaN(parseInt(minScore))) {
      pool = pool.filter((s) => s.credScore >= parseInt(minScore));
    }

    if (sortBy === "score") pool = [...pool].sort((a, b) => b.credScore - a.credScore);
    if (sortBy === "deliveries") pool = [...pool].sort((a, b) => b.deliveries - a.deliveries);
    if (sortBy === "tier") {
      pool = [...pool].sort(
        (a, b) =>
          TIER_ORDER.indexOf(b.highestTier || "learner") - TIER_ORDER.indexOf(a.highestTier || "learner")
      );
    }

    return pool;
  }, [feed, query, tierFilter, statusFilter, categoryFilter, deliveriesOnly, minScore, sortBy]);

  const inSchoolCount = results.filter((s) => s.academicStatus === "in_school").length;

  return (
    <div className="space-y-5 text-left">
      {/* Header — dark premium banner (monorepo design) */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 to-[#0f1e35] p-6 border border-border-main">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-purple/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-display font-extrabold text-white">
              <ShieldCheck className="h-5 w-5 text-role-verifier" /> Search verified talent
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300">
              Everyone here has at least one verified skill you can trust. Search by skill, level, or work history.
              <strong className="text-white"> You can hire great people before they even graduate.</strong>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-4xl font-display font-black leading-none text-white tabular-nums">{results.length}</p>
            <p className="mt-1 text-xs text-slate-400">verified profiles</p>
            {inSchoolCount > 0 && (
              <p className="mt-1 text-[11px] font-medium text-role-verifier">{inSchoolCount} currently in school</p>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
          <input
            type="text"
            placeholder="Search by skill, name, university, e.g. 'React Lagos' or 'SQL data analyst'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-bg-surface border border-border-main pl-9 pr-3 py-2.5 rounded-md text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-verifier transition-colors"
          />
        </div>
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md border border-border-main hover:border-border-strong text-txt-secondary text-xs font-semibold transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="h-9 bg-bg-surface border border-border-main rounded-md px-2.5 text-xs text-txt-primary focus:outline-none focus:border-role-verifier cursor-pointer"
        >
          <option value="all">All tiers</option>
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {TIER_CONFIG[t]?.icon} {TIER_CONFIG[t]?.label}+
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 bg-bg-surface border border-border-main rounded-md px-2.5 text-xs text-txt-primary focus:outline-none focus:border-role-verifier cursor-pointer"
        >
          {ACADEMIC_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 bg-bg-surface border border-border-main rounded-md px-2.5 text-xs text-txt-primary focus:outline-none focus:border-role-verifier cursor-pointer"
        >
          <option value="all">All skills</option>
          {SKILL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min CredScore"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          min={300}
          max={850}
          className="h-9 w-32 rounded-md border border-border-main bg-bg-surface px-3 text-xs text-txt-primary placeholder:text-txt-muted focus:border-role-verifier focus:outline-none"
        />

        <button
          type="button"
          onClick={() => setDeliveriesOnly(!deliveriesOnly)}
          className={`h-9 rounded-md border px-3 text-xs font-semibold transition-colors cursor-pointer ${
            deliveriesOnly
              ? "border-role-verifier bg-role-verifier-soft text-role-verifier"
              : "border-border-main bg-bg-surface text-txt-secondary hover:border-border-strong"
          }`}
        >
          {deliveriesOnly ? "✓ Paid deliveries only" : "Has paid deliveries"}
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-txt-muted font-mono">Sort:</span>
          {SORT_OPTIONS.map(([val, lab]) => (
            <button
              key={val}
              type="button"
              onClick={() => setSortBy(val)}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                sortBy === val
                  ? "border-role-verifier bg-role-verifier-soft text-role-verifier"
                  : "border-border-main bg-bg-surface text-txt-muted hover:border-border-strong"
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="border border-dashed border-border-main rounded-lg p-10 text-center bg-bg-surface">
          <p className="text-sm font-semibold text-txt-secondary">No verified students match this search</p>
          <p className="mt-1 text-xs text-txt-muted">Try broader filters or a different skill term</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((student) => (
            <FindTalentCard
              key={student.id}
              student={student}
              expanded={expanded === student.id}
              onToggle={() => setExpanded(expanded === student.id ? null : student.id)}
              onContact={() => onContact?.(student)}
              onInvite={() => setAssignTo(student)}
            />
          ))}
        </div>
      )}

      {/* Recruiting insight */}
      <div className="bg-bg-sunken border border-border-main rounded-lg p-4 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-txt-primary">
          <GraduationCap className="h-4 w-4 text-role-verifier" /> Hire before graduation day
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[11px] text-txt-secondary">
          Students build their CredScore and delivery record while still in school. Post a bounty to find and test
          talent before anyone else does.
        </p>
        {onInviteToBounty && (
          <button
            type="button"
            onClick={onInviteToBounty}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-role-verifier text-role-verifier hover:bg-role-verifier-soft text-xs font-semibold transition-colors cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" /> Go to Bounties
          </button>
        )}
      </div>

      {/* Direct "live task" assignment */}
      <AssignTaskModal
        student={assignTo}
        onClose={() => setAssignTo(null)}
        onAssigned={() => setAssignTo(null)}
        onNotify={onNotify}
      />
    </div>
  );
}

function FindTalentCard({
  student,
  expanded,
  onToggle,
  onContact,
  onInvite,
}: {
  student: TalentProfile;
  expanded: boolean;
  onToggle: () => void;
  onContact: () => void;
  onInvite: () => void;
}) {
  const band = scoreBand(student.credScore);
  const tierConf = TIER_CONFIG[student.highestTier] || TIER_CONFIG.learner;
  const inSchool = student.academicStatus === "in_school";

  return (
    <div
      className={`h-full overflow-hidden bg-bg-surface border rounded-lg transition-colors ${
        expanded ? "border-role-verifier" : "border-border-main hover:border-border-strong"
      }`}
    >
      <button type="button" onClick={onToggle} className="w-full p-4 text-left cursor-pointer">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-role-verifier text-base font-bold text-white">
            {student.name.charAt(0)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-txt-primary">{student.name}</span>
              <span className="text-sm">{student.flag}</span>
              {student.globalTrustPass && (
                <span className="inline-flex items-center gap-1 rounded-full bg-hash-green/10 text-hash-green px-2 py-0.5 text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Global Trust Pass
                </span>
              )}
              {inSchool && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple-soft text-brand-purple px-2 py-0.5 text-[10px] font-semibold">
                  <BookOpen className="w-3 h-3" /> In school Y{student.yearOfStudy}
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-txt-muted">{student.headline}</p>
          </div>

          {/* Compact score pill */}
          <div className="shrink-0 text-right">
            <span
              className="inline-block rounded-lg px-2 py-1 text-lg font-black leading-none tabular-nums"
              style={{ color: band.color, background: `${band.color}1f` }}
            >
              {student.credScore}
            </span>
            <p className="mt-1 text-[10px] text-txt-muted">CredScore</p>
          </div>
        </div>

        {/* Tier + stats row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border-main bg-bg-sunken px-2 py-0.5 text-[11px] font-semibold text-txt-secondary">
            {tierConf.icon} {tierConf.label}
          </span>
          <span className="text-[11px] text-txt-muted">
            {student.deliveries} paid {student.deliveries === 1 ? "delivery" : "deliveries"}
          </span>
          {student.totalEarnedSOL > 0 && (
            <span className="text-[11px] font-medium text-brand-purple">◎ {student.totalEarnedSOL} SOL earned</span>
          )}
          {(student.ratingCount || 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-500">
              <Star className="h-3 w-3 fill-current" /> {student.ratingAvg} ({student.ratingCount})
            </span>
          )}
        </div>

        {/* Skill tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {(student.skillTags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-txt-secondary">
              {tag}
            </span>
          ))}
          {(student.skillTags || []).length > 4 && (
            <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-txt-muted">
              +{student.skillTags.length - 4} more
            </span>
          )}
        </div>
      </button>

      {/* Expanded: full credential list + actions */}
      {expanded && (
        <div className="border-t border-border-subtle px-4 pb-4 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-txt-muted font-mono">
            Verified Credentials
          </p>
          <div className="space-y-2">
            {(student.verified || []).map((cred, i) => {
              const ct = TIER_CONFIG[cred.tier] || TIER_CONFIG.learner;
              return (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border-main bg-bg-sunken px-3 py-2">
                  <span className="mt-0.5 text-sm">{ct.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-txt-primary">{cred.title}</p>
                    <p className="text-[11px] text-txt-muted">{cred.issuer}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-medium" style={{ color: ct.color }}>
                        {ct.label}
                      </span>
                      {cred.onChain && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-purple">
                          <Hexagon className="h-2.5 w-2.5" /> On Solana
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {student.sandbox?.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-semibold text-txt-muted">Self-reported (unverified)</p>
              <div className="flex flex-wrap gap-1">
                {student.sandbox.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-dashed border-border-main bg-bg-surface px-2 py-0.5 text-[10px] text-txt-muted"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onContact}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" /> Send message
            </button>
            <button
              type="button"
              onClick={onInvite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-main hover:border-role-verifier text-txt-primary text-xs font-semibold transition-colors cursor-pointer"
            >
              <Target className="h-4 w-4" /> Assign a task
            </button>
            <a
              href={`/verify/${encodeURIComponent(student.id)}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-brand-purple hover:text-brand-purple-dim"
            >
              <ExternalLink className="h-3 w-3" /> Verify credentials
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Assign Task modal (monorepo AssignTaskModal) ──────────────
   The employer hand-picks ONE student and assigns them a paid "live task"
   directly. POST /v1/bounties/direct holds escrow up front and drops an
   invite into the student's Earn tab. */
const BLANK_TASK = {
  title: "",
  description: "",
  skill: "",
  skillName: "",
  skillCategory: "Backend",
  skillTags: "",
  reward: "",
  rewardUSD: "",
  rewardSOL: "",
  tests: "",
  requiredTier: "learner",
  deadline: "",
};

function AssignTaskModal({
  student,
  onClose,
  onAssigned,
  onNotify,
}: {
  student: TalentProfile | null;
  onClose: () => void;
  onAssigned?: () => void;
  onNotify?: (message: string, variant: "success" | "danger") => void;
}) {
  const [form, setForm] = useState(BLANK_TASK);
  const [busy, setBusy] = useState(false);

  if (!student) return null;

  const set = (k: keyof typeof BLANK_TASK) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.title.trim() || !form.description.trim()) {
      onNotify?.("Title and description are required.", "danger");
      return;
    }
    setBusy(true);
    try {
      await createDirectTask({
        studentId: student!.id,
        ...form,
        rewardUSD: Number(form.rewardUSD) || 0,
        rewardSOL: Number(form.rewardSOL) || 0,
        tests: Number(form.tests) || 0,
      });
      onNotify?.(
        `Task sent to ${student!.name}. Payment is held in escrow until they deliver.`,
        "success"
      );
      setForm(BLANK_TASK);
      onAssigned?.();
      onClose();
    } catch (err: any) {
      onNotify?.(err?.message || "Could not assign the task.", "danger");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-verifier transition-colors";
  const labelCls = "text-xs font-medium text-txt-primary block mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-[640px] bg-bg-surface border border-border-main rounded-lg p-6 text-left space-y-4 relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 rounded-md text-txt-muted hover:text-txt-primary border border-transparent hover:border-border-strong flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h2 className="font-display font-bold text-[20px] text-txt-primary">Assign a task to {student.name}</h2>
          <p className="text-xs text-txt-secondary mt-1">
            A direct, paid offer to this one student. Payment is held in escrow up front — they accept, deliver, and
            earn a verified credential.
          </p>
        </div>

        <div>
          <label className={labelCls}>
            Title <span className="text-hash-red">*</span>
          </label>
          <input className={inputCls} placeholder="e.g. Build a rate-limited payments webhook handler" value={form.title} onChange={set("title")} />
        </div>
        <div>
          <label className={labelCls}>
            Description <span className="text-hash-red">*</span>
          </label>
          <textarea className={inputCls} rows={4} placeholder="What needs building, acceptance criteria, tests to pass…" value={form.description} onChange={set("description")} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Skill (display)</label>
            <input className={inputCls} placeholder="Backend / Node.js" value={form.skill} onChange={set("skill")} />
          </div>
          <div>
            <label className={labelCls}>Skill name (awarded on the credential)</label>
            <input className={inputCls} placeholder="Paystack Integration" value={form.skillName} onChange={set("skillName")} />
          </div>
          <div>
            <label className={labelCls}>Skill category</label>
            <select className={inputCls} value={form.skillCategory} onChange={set("skillCategory")}>
              {SKILL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Credential tier (if delivered)</label>
            <select className={inputCls} value={form.requiredTier} onChange={set("requiredTier")}>
              {TIER_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TIER_CONFIG[t]?.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Skill tags (comma-separated)</label>
          <input className={inputCls} placeholder="Node.js, Webhooks, REST APIs" value={form.skillTags} onChange={set("skillTags")} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Reward (display)</label>
            <input className={inputCls} placeholder="₦250,000 or $600" value={form.reward} onChange={set("reward")} />
          </div>
          <div>
            <label className={labelCls}>Reward USD</label>
            <input className={inputCls} type="number" placeholder="155" value={form.rewardUSD} onChange={set("rewardUSD")} />
          </div>
          <div>
            <label className={labelCls}>Escrow (SOL)</label>
            <input className={inputCls} type="number" placeholder="1.5" value={form.rewardSOL} onChange={set("rewardSOL")} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Automated tests</label>
            <input className={inputCls} type="number" placeholder="0 = portfolio review" value={form.tests} onChange={set("tests")} />
          </div>
          <div>
            <label className={labelCls}>Deadline</label>
            <input className={inputCls} placeholder="7 days" value={form.deadline} onChange={set("deadline")} />
          </div>
        </div>
        <p className="rounded-md border border-border-main bg-bg-sunken px-3 py-2 text-[11px] text-txt-muted">
          The credential this earns is weighted by real corroboration — deliveries and independent issuers — so it can't
          be gamed. A great direct delivery is proof of work, not just a signature.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-md text-txt-secondary hover:text-txt-primary text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            {busy ? "Assigning…" : "Assign & hold escrow"}
          </button>
        </div>
      </div>
    </div>
  );
}
