import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { ShieldCheck, Zap, Globe, Users, Award, Lock } from "lucide-react";

const stats = [
  { icon: ShieldCheck, value: "42,000+", label: "Credentials Issued" },
  { icon: Users,       value: "8,700+",  label: "Verified Candidates" },
  { icon: Globe,       value: "120+",    label: "Institutions Onboarded" },
  { icon: Zap,         value: "0.38s",   label: "Avg Verification Time" },
];

const badges = [
  { icon: Lock,  text: "SOC 2 Compliant" },
  { icon: Award, text: "Solana Verified Builder" },
  { icon: ShieldCheck, text: "Zero PII On-Chain" },
];

// Per-stat stagger: each counter starts STAGGER_MS after the previous one, all
// keyed off a single section-level viewport trigger (not per-number observers).
const STAGGER_MS = 110;
// Snappy, confident count — short enough to feel decisive, not dramatic.
const DURATION_MS = 900;

/* ------------------------------------------------------------------ *
 * Value parsing — split a display string ("42,000+", "0.38s", "120+")
 * into a numeric target plus prefix/suffix/formatting so the count-up
 * re-assembles the exact source string on every frame.
 * ------------------------------------------------------------------ */
interface Parsed {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouped: boolean;
}

function parse(value: string): Parsed {
  const match = value.match(/-?[\d,]*\.?\d+/);
  if (!match) return { prefix: value, suffix: "", target: 0, decimals: 0, grouped: false };
  const numStr = match[0];
  const start = match.index ?? 0;
  const prefix = value.slice(0, start);
  const suffix = value.slice(start + numStr.length);
  const grouped = numStr.includes(",");
  const bare = numStr.replace(/,/g, "");
  const dot = bare.indexOf(".");
  const decimals = dot === -1 ? 0 : bare.length - dot - 1;
  return { prefix, suffix, target: parseFloat(bare), decimals, grouped };
}

function format(n: number, p: Parsed): string {
  const fixed = n.toFixed(p.decimals);
  const withGroups = p.grouped
    ? Number(fixed).toLocaleString("en-US", {
        minimumFractionDigits: p.decimals,
        maximumFractionDigits: p.decimals,
      })
    : fixed;
  return `${p.prefix}${withGroups}${p.suffix}`;
}

/**
 * Count a single number up from 0 → target once `active` flips true, after an
 * initial `delay` (its stagger slot). Runs exactly once — it settles on the
 * exact source string and never loops. Jumps straight to the value under
 * reduced motion.
 */
function StatValue({ value, active, delay }: { value: string; active: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const parsed = useRef(parse(value)).current;
  const [display, setDisplay] = useState(() => format(0, parsed));

  useEffect(() => {
    if (!active) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let startTs = 0;
    const run = (now: number) => {
      if (!startTs) startTs = now;
      const elapsed = now - startTs - delay;
      if (elapsed < 0) {
        raf = requestAnimationFrame(run);
        return;
      }
      const t = Math.min(1, elapsed / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic — quick out, gentle settle
      setDisplay(format(parsed.target * eased, parsed));
      if (t < 1) raf = requestAnimationFrame(run);
      else setDisplay(value); // snap to the exact source string, then stop
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [active, reduce, value, delay, parsed]);

  return (
    <div className="font-display font-bold text-txt-primary text-2xl md:text-3xl tracking-tight tabular-nums">
      {display}
    </div>
  );
}

export default function TrustStrip() {
  // A single IntersectionObserver on the stats row drives every counter — the
  // animation fires once when the section scrolls into view (not on page load),
  // and each number staggers off this one trigger.
  const rowRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rowRef, { once: true, amount: 0.4 });

  return (
    <section className="py-16 md:py-20 bg-bg-base border-t border-border-subtle">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Stats row — only the numbers animate; icons and labels are static. */}
        <div ref={rowRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {stats.map((s, i) => (
            <div key={s.label} className="text-center space-y-2">
              <s.icon className="w-5 h-5 mx-auto text-brand-purple" strokeWidth={1.75} />
              <StatValue value={s.value} active={inView} delay={i * STAGGER_MS} />
              <div className="font-mono text-[11px] text-txt-muted uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges — static. */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          {badges.map((b) => (
            <div
              key={b.text}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-main bg-bg-surface/60 text-txt-secondary text-[12px] font-mono tracking-wide"
            >
              <b.icon className="w-3.5 h-3.5 text-hash-green" strokeWidth={2} />
              {b.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
