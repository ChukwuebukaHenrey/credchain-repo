import { ShieldCheck, Zap, Globe, Users, Award, Lock } from "lucide-react";
import FadeIn from "./FadeIn";

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

export default function TrustStrip() {
  return (
    <section className="py-16 md:py-20 bg-bg-base border-t border-border-subtle">
      <div className="max-w-[1200px] mx-auto px-6">
        <FadeIn>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center space-y-2">
                <s.icon className="w-5 h-5 mx-auto text-brand-purple" strokeWidth={1.75} />
                <div className="font-display font-bold text-txt-primary text-2xl md:text-3xl tracking-tight">
                  {s.value}
                </div>
                <div className="font-mono text-[11px] text-txt-muted uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
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
        </FadeIn>
      </div>
    </section>
  );
}
