import { Send, Stamp, Search } from "lucide-react";
import FadeIn from "./FadeIn";
import SpotlightCard from "./motion/SpotlightCard";

interface Step {
  numeral: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  tag: string;
  borderClass: string;
  iconColorClass: string;
  /** CSS color for the hover spotlight — matches the role accent. */
  accent: string;
}

const steps: Step[] = [
  {
    numeral: "01",
    icon: <Send className="w-6 h-6" strokeWidth={1.75} />,
    title: "Candidates Request",
    body: "Sign up, link your institution, and request a verified copy of any academic or professional credential. AI-assisted document matching confirms identity before the issuer ever sees the request.",
    tag: "// CANDIDATE ROLE",
    borderClass: "border-t-role-candidate",
    iconColorClass: "text-role-candidate",
    accent: "var(--role-candidate)",
  },
  {
    numeral: "02",
    icon: <Stamp className="w-6 h-6" strokeWidth={1.75} />,
    title: "Institutions Issue",
    body: "Registrars approve requests and anchor a cryptographic proof on Solana. The proof is permanent and tamper-evident. No personally identifying information is written to the chain.",
    tag: "// ISSUER ROLE",
    borderClass: "border-t-role-issuer",
    iconColorClass: "text-role-issuer",
    accent: "var(--role-issuer)",
  },
  {
    numeral: "03",
    icon: <Search className="w-6 h-6" strokeWidth={1.75} />,
    title: "Employers Verify",
    body: "Scan a QR code or enter a credential ID. The ledger returns a verified match in under a second. No registration, no email back-and-forth, no manual transcript checks.",
    tag: "// VERIFIER ROLE",
    borderClass: "border-t-role-verifier",
    iconColorClass: "text-role-verifier",
    accent: "var(--role-verifier)",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-[120px] bg-bg-base overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-left mb-16 max-w-2xl">
          <FadeIn>
            <div className="border-l-2 border-brand-purple pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-4">
              VERIFICATION FLOW
            </div>
            <h2 className="font-display text-txt-primary scale-2xl font-bold mb-4">
              Three steps. One chain. Full trust.
            </h2>
            <p className="font-sans text-txt-secondary scale-base leading-relaxed">
              The entire credential lifecycle, handled end to end. Each role does its part, the ledger ties it together.
            </p>
          </FadeIn>
        </div>

        {/* Cards Grid — asymmetric: card 1 spans full width, cards 2 and 3 split below */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 — Candidates Request (wide, top) */}
          <div className="md:col-span-2">
            <FadeIn delay={100}>
              <StepCard step={steps[0]} minH="min-h-[220px]" />
            </FadeIn>
          </div>

          {/* Card 2 — Institutions Issue */}
          <div>
            <FadeIn delay={150}>
              <StepCard step={steps[1]} minH="min-h-[280px]" />
            </FadeIn>
          </div>

          {/* Card 3 — Employers Verify */}
          <div>
            <FadeIn delay={200}>
              <StepCard step={steps[2]} minH="min-h-[280px]" />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, minH }: { step: Step; minH: string }) {
  return (
    <SpotlightCard
      accent={step.accent}
      className={`bg-bg-surface border border-border-main border-t-[3px] ${step.borderClass} rounded-xl p-8 flex flex-col justify-between ${minH} transition-colors duration-200 hover:border-border-strong`}
    >
      {/* Watermark numeral at 4% opacity — lifts to 8% on hover for depth. */}
      <span
        className="font-display font-bold text-[140px] leading-none text-txt-primary opacity-[0.04] group-hover/spot:opacity-[0.08] transition-opacity duration-300 absolute bottom-[-24px] right-2 pointer-events-none select-none"
        aria-hidden
      >
        {step.numeral}
      </span>

      {/* Content */}
      <div className="relative z-10 space-y-4 max-w-2xl text-left">
        <span className={step.iconColorClass}>{step.icon}</span>
        <h3 className="font-display text-txt-primary text-[20px] font-semibold">
          {step.title}
        </h3>
        <p className="font-sans text-txt-secondary scale-base leading-relaxed">
          {step.body}
        </p>
      </div>

      {/* Role tag */}
      <div className="relative z-10 font-mono text-[10px] text-txt-muted tracking-wider uppercase mt-6">
        {step.tag}
      </div>
    </SpotlightCard>
  );
}
