import { useNavigate } from "react-router-dom";
import { Play, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Reveal } from "./motion/Reveal";

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
                    className="inline-flex items-center justify-center gap-2 bg-transparent border border-border-main hover:border-border-strong text-txt-primary rounded-full px-6 py-3 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Try a demo</span>
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right — dark proof motif panel */}
          <Reveal delay={0.1}>
            <div
              className="relative overflow-hidden rounded-2xl border border-border-main p-10 md:p-12 h-full flex flex-col justify-between min-h-[320px]"
              style={{ background: "linear-gradient(145deg, var(--fill-indigo), var(--bg-base))" }}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] text-txt-muted uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-hash-green" />
                <span>Anchored on Solana</span>
              </div>

              {/* Big verified stamp motif */}
              <div className="relative z-10 py-8">
                <div className="inline-flex items-center gap-3 rounded-xl border border-hash-green/30 bg-hash-green/5 px-5 py-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-hash-green/15 text-hash-green">
                    <Check className="w-6 h-6" strokeWidth={2.75} />
                  </span>
                  <div className="text-left">
                    <div className="font-display font-bold text-txt-primary text-[18px] leading-tight">
                      Verified match
                    </div>
                    <div className="font-mono text-[11px] text-txt-muted">
                      cryptographic proof · zero PII
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 relative z-10">
                {[
                  ["NO FEES", "var(--role-candidate)"],
                  ["NO PII", "var(--role-issuer)"],
                  ["< 1s", "var(--role-verifier)"],
                ].map(([label, color]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border-subtle bg-bg-surface/40 px-3 py-3 text-center"
                  >
                    <div
                      className="font-display font-bold text-[15px]"
                      style={{ color }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
