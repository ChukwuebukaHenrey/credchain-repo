import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Award, School, Timer, CircleSlash, type LucideIcon } from "lucide-react";

interface StatsBarProps {
  issuedCount: number;
}

interface Stat {
  id: string;
  label: string;
  /** Numeric target for the count-up; omit for non-numeric values like "< 1s". */
  to?: number;
  /** Rendered value when static / suffix formatting. */
  display: (n: number) => string;
  change: string;
  icon: LucideIcon;
  /** Role/brand accent token for the icon tile. */
  accent: string;
}

/**
 * Count up from 0 to `to` once the element scrolls into view. Returns the live
 * value; jumps straight to `to` under reduced motion.
 */
function useCountUp(to: number, active: boolean, durationMs = 1200) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (reduce) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic for a natural settle.
      const eased = 1 - Math.pow(1 - t, 3);
      setN(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setN(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, active, reduce, durationMs]);

  return n;
}

export default function StatsBar({ issuedCount }: StatsBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const stats: Stat[] = [
    {
      id: "stat-issued",
      label: "CREDENTIALS ISSUED",
      to: 120 + issuedCount,
      display: (n) => Math.round(n).toLocaleString(),
      change: "+100% Verified Proofs",
      icon: Award,
      accent: "var(--brand-purple)",
    },
    {
      id: "stat-institutions",
      label: "PARTNER INSTITUTIONS",
      to: 12,
      display: (n) => Math.round(n).toString(),
      change: "Universities & Professional Sectors",
      icon: School,
      accent: "var(--role-candidate)",
    },
    {
      id: "stat-time",
      label: "VERIFICATION SPEED",
      display: () => "< 1s",
      change: "Instant QR Profile Auditing",
      icon: Timer,
      accent: "var(--role-issuer)",
    },
    {
      id: "stat-fraud",
      label: "FRAUD REDUCTION RATE",
      to: 99.9,
      display: (n) => `${n.toFixed(1)}%`,
      change: "Tamper-resistant blockchain proofs",
      icon: CircleSlash,
      accent: "var(--role-verifier)",
    },
  ];

  return (
    <section className="relative py-12 bg-bg-surface border-y border-border-subtle overflow-hidden">
      {/* Decorative wash — pure token colors so the bar tracks the theme. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, transparent, var(--brand-purple-soft), transparent)" }}
      />

      <div ref={ref} className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <StatCell key={stat.id} stat={stat} index={i} active={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCell({ stat, index, active }: { stat: Stat; index: number; active: boolean }) {
  const Icon = stat.icon;
  const n = useCountUp(stat.to ?? 0, active && stat.to !== undefined);
  const value = stat.to !== undefined ? stat.display(n) : stat.display(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="flex flex-col space-y-2 text-left group"
    >
      <div className="flex items-center gap-2">
        <div
          className="p-1.5 rounded-md bg-brand-purple-soft border border-border-subtle transition-colors"
          style={{ color: stat.accent }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-mono text-[10px] sm:text-xs text-txt-muted tracking-wider uppercase">
          {stat.label}
        </span>
      </div>

      <div className="flex flex-col mt-1">
        <span className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-txt-primary tracking-tight tabular-nums">
          {value}
        </span>
        <span className="text-[10px] sm:text-xs font-mono text-txt-secondary mt-0.5">
          {stat.change}
        </span>
      </div>
    </motion.div>
  );
}
