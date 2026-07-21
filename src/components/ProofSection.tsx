import { ShieldCheck, Zap, Coins } from "lucide-react";
import FadeIn from "./FadeIn";
import Counter from "./motion/Counter";

// Community / trust-at-scale section — inspired by Solana's "Join a community of
// millions" (inspo 3/4): oversized gradient stat numbers over a flowing-wave
// backdrop, followed by a feature grid. Replaces the old duplicate proof-card
// section. Uses CredChain's own metrics, not Solana's.

interface Stat {
  value: string;
  label: string;
  sub: string;
}

const STATS: Stat[] = [
  { value: "14,520+", label: "Credentials verified", sub: "anchored on Solana" },
  { value: "84", label: "Partner institutions", sub: "issuing on-chain" },
  { value: "$212K", label: "Bounties paid out", sub: "to verified talent" },
  { value: "0.38s", label: "Avg. verification", sub: "no email, no waiting" },
];

interface Feature {
  icon: React.ReactNode;
  title: string;
  copy: string;
}

const FEATURES: Feature[] = [
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Tamper-proof",
    copy: "Every credential is a cryptographic proof on Solana. It can't be edited, faked, or revoked out from under you — and no personal data ever touches the chain.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Verified in under a second",
    copy: "Employers confirm a skill instantly against the ledger — replacing slow, forgeable email chains and PDF certificates no one trusts.",
  },
  {
    icon: <Coins className="w-5 h-5" />,
    title: "Earn from your skills",
    copy: "A verified profile unlocks paid bounties from real employers. Payment is held in Solana escrow and released on delivery. From verified, to hired, to earning.",
  },
];

export default function ProofSection() {
  return (
    <section id="ledger" className="relative py-24 md:py-[120px] bg-bg-base overflow-hidden">
      {/* Flowing-wave backdrop (sol.png), faded so text stays legible */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-no-repeat bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/sol-waves.png')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, var(--bg-base), transparent 30%, transparent 70%, var(--bg-base))" }}
      />

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* Heading */}
        <FadeIn>
          <div className="max-w-2xl mb-16">
            <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-4">
              A GROWING NETWORK OF TRUST
            </div>
            <h2 className="font-display text-txt-primary scale-3xl font-bold leading-tight">
              Trusted proof,
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#9D00FF] bg-clip-text text-transparent">
                built for everyone.
              </span>
            </h2>
          </div>
        </FadeIn>

        {/* Oversized gradient stat numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-4 mb-20">
          {STATS.map((s, i) => (
            <FadeIn key={s.label} delay={i * 80}>
              <div className="text-left">
                <Counter
                  value={s.value}
                  delay={i * 140}
                  className="block font-display font-bold scale-3xl leading-none bg-gradient-to-br from-[#00D4FF] via-[#7C3AED] to-[#9D00FF] bg-clip-text text-transparent tabular-nums"
                />
                <div className="text-txt-primary font-semibold text-sm mt-3">{s.label}</div>
                <div className="text-txt-muted font-mono text-[11px] uppercase tracking-wider mt-1">{s.sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 100}>
              <div className="h-full bg-bg-surface/60 backdrop-blur-md border border-border-main rounded-xl p-6 transition-colors hover:border-border-strong">
                <div className="w-10 h-10 rounded-lg bg-brand-purple-soft border border-border-subtle flex items-center justify-center text-role-candidate mb-4">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-txt-primary text-lg mb-2">{f.title}</h3>
                <p className="font-sans text-sm text-txt-secondary leading-relaxed">{f.copy}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
