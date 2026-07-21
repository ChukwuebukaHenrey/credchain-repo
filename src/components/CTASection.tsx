import { useNavigate } from "react-router-dom";
import { Play, ArrowRight, ShieldCheck, Lock, Award } from "lucide-react";
import { Reveal } from "./motion/Reveal";
import Counter from "./motion/Counter";

/** Real network figures + trust badges, merged in from the retired TrustStrip
 *  so the closing CTA's right card carries live proof, not filler. */
const STATS = [
  { value: "42,000+", label: "Credentials Issued" },
  { value: "8,700+", label: "Verified Candidates" },
  { value: "120+", label: "Institutions Onboarded" },
  { value: "0.38s", label: "Avg Verification Time" },
];

const BADGES = [
  { icon: Lock, text: "SOC 2 Compliant" },
  { icon: Award, text: "Solana Verified Builder" },
  { icon: ShieldCheck, text: "Zero PII On-Chain" },
];

/**
 * Closing CTA — two-up colored blocks (bitcoin.com's structure, CredChain's
 * palette). Left: a deep-purple wash panel with the headline + dual CTAs.
 * Right: a dark panel carrying a compact "verified proof" motif so the last
 * thing the visitor sees restates the product's promise.
 */
export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 md:py-[120px] bg-bg-base overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — purple wash panel */}
          <Reveal>
            <div
              className="relative overflow-hidden rounded-2xl border border-border-main p-10 md:p-12 h-full flex flex-col justify-center"
              style={{ background: "linear-gradient(145deg, var(--fill-purple), var(--bg-surface))" }}
            >
              {/* Soft brand glow bleeding from the corner */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-40"
                style={{ background: "var(--brand-purple)" }}
              />
              <div className="relative z-10 max-w-md">
                <div className="border-l-2 border-brand-purple pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-5">
                  OPEN LEDGER
                </div>
                <h2 className="font-display font-bold text-txt-primary text-[34px] md:text-[44px] leading-[1.05] mb-4">
                  Your credentials,{" "}
                  <span className="text-role-candidate">permanently verified.</span>
                </h2>
                <p className="font-sans text-txt-secondary scale-base leading-relaxed mb-8">
                  Join as a candidate, institution, or employer. No fees, no PII
                  on-chain, sub-second verification.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate("/role")}
                    className="inline-flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple-dim text-white rounded-full px-6 py-3 font-semibold text-sm transition-colors cursor-pointer shadow-[0_0_24px_-6px_rgba(124,58,237,0.6)]"
                  >
                    <span>Create your account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate("/login?demo=true")}
                    className="btn-fill btn-fill-primary inline-flex items-center justify-center gap-2 bg-transparent border border-border-main text-txt-primary rounded-full px-6 py-3 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Try a demo</span>
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right — trust-at-scale panel. Carries the real network figures
              (merged in from the old TrustStrip) so the closing card restates
              the product's promise with live proof instead of filler. */}
          <Reveal delay={0.1}>
            <div
              className="relative overflow-hidden rounded-2xl border border-border-main p-10 md:p-12 h-full flex flex-col justify-between min-h-[320px]"
              style={{ background: "linear-gradient(145deg, var(--fill-indigo), var(--bg-base))" }}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] text-txt-muted uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-hash-green" />
                <span>Trusted at scale · anchored on Solana</span>
              </div>

              {/* Real network figures — 2×2, count up on scroll-in. */}
              <div className="relative z-10 grid grid-cols-2 gap-x-8 gap-y-7 py-8">
                {STATS.map((s) => (
                  <div key={s.label} className="text-left">
                    <Counter
                      value={s.value}
                      className="block font-display font-bold text-txt-primary text-3xl md:text-[34px] leading-none tracking-tight tabular-nums"
                    />
                    <div className="font-mono text-[11px] text-txt-muted uppercase tracking-wider mt-2">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust badges. */}
              <div className="relative z-10 flex flex-wrap items-center gap-2 pt-6 border-t border-border-subtle">
                {BADGES.map((b) => (
                  <span
                    key={b.text}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-surface/50 px-3 py-1.5 font-mono text-[11px] text-txt-secondary tracking-wide"
                  >
                    <b.icon className="w-3.5 h-3.5 text-hash-green" strokeWidth={2} />
                    {b.text}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
