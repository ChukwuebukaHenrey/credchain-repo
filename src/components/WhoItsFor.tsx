import { useNavigate } from "react-router-dom";
import { User, GraduationCap, Briefcase, Check } from "lucide-react";
import FadeIn from "./FadeIn";

interface RoleCard {
  id: "candidate" | "issuer" | "verifier";
  tag: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  capabilities: string[];
  btnText: string;
  route: string;
  topBorderClass: string;
  textColorClass: string;
  /** Role accent color (CSS var) used for the hover fill. */
  accent: string;
  btnBorderClass: string;
  tagTextClass: string;
}

const cards: RoleCard[] = [
  {
    id: "candidate",
    tag: "CANDIDATE PORTAL",
    icon: <User className="w-5 h-5 text-txt-muted" strokeWidth={1.75} />,
    title: "Students & Job Seekers",
    body: "Request verified credentials from your institution. Build AI-powered resumes. Share a verified public profile with employers.",
    capabilities: [
      "Request & store academic credentials",
      "Build verifiable interactive resumes",
      "Share tamper-proof public profile links",
      "Zero-fee blockchain anchor verification",
    ],
    btnText: "Create Candidate Account",
    route: "/signup/candidate",
    topBorderClass: "border-t-role-candidate",
    textColorClass: "text-role-candidate",
    accent: "var(--role-candidate)",
    btnBorderClass: "border-role-candidate",
    tagTextClass: "text-role-candidate",
  },
  {
    id: "issuer",
    tag: "ISSUER CENTRAL",
    icon: <GraduationCap className="w-5 h-5 text-txt-muted" strokeWidth={1.75} />,
    title: "Universities & Academies",
    body: "Become a trusted credential anchor. Approve student requests. Issue electronic qualifications backed by blockchain proof.",
    capabilities: [
      "Establish digital signature authority",
      "Batch upload student transcripts",
      "Approve and mint secure records",
      "Direct candidate credential sync",
    ],
    btnText: "Register as Issuer",
    route: "/signup/issuer",
    topBorderClass: "border-t-role-issuer",
    textColorClass: "text-role-issuer",
    accent: "var(--role-issuer)",
    btnBorderClass: "border-role-issuer",
    tagTextClass: "text-role-issuer",
  },
  {
    id: "verifier",
    tag: "VERIFIER INTERFACE",
    icon: <Briefcase className="w-5 h-5 text-txt-muted" strokeWidth={1.75} />,
    title: "Employers & Recruiters",
    body: "Verify any credential instantly. No back-and-forth, no waiting. One query returns a cryptographic confirmation from the Solana ledger.",
    capabilities: [
      "Instant QR-based verification scan",
      "Bulk candidate pool CSV checking",
      "Full Solana ledger state lookup",
      "Verify without system registration",
    ],
    btnText: "Register as Verifier",
    route: "/signup/verifier",
    topBorderClass: "border-t-role-verifier",
    textColorClass: "text-role-verifier",
    accent: "var(--role-verifier)",
    btnBorderClass: "border-role-verifier",
    tagTextClass: "text-role-verifier",
  },
];

export default function WhoItsFor() {
  const navigate = useNavigate();

  return (
    <section id="who-its-for" className="py-24 md:py-[120px] bg-bg-base overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section header — left-aligned per design rule */}
        <div className="text-left mb-16 max-w-2xl">
          <FadeIn>
            <div className="border-l-2 border-brand-purple pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-4">
              TARGET ECOSYSTEM
            </div>
            <h2 className="font-display text-txt-primary scale-2xl font-bold">
              Unified ecosystem. Specialized access.
            </h2>
          </FadeIn>
        </div>

        {/* Roles 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {cards.map((card, idx) => (
            <FadeIn key={card.id} delay={100 + idx * 75}>
              <div
                className={`bg-bg-surface border border-border-main border-t-[3px] ${card.topBorderClass} rounded-lg p-8 flex flex-col justify-between h-full transition-colors duration-200 hover:border-border-strong`}
              >
                {/* Tag + icon */}
                <div className="flex justify-between items-center mb-6">
                  <span
                    className={`font-mono text-[10px] font-semibold tracking-wider rounded-sm px-0 ${card.tagTextClass}`}
                  >
                    // {card.tag}
                  </span>
                  {card.icon}
                </div>

                {/* Title + body + capabilities */}
                <div className="text-left flex-grow">
                  <h3 className="font-display text-txt-primary text-[20px] font-bold mb-3">
                    {card.title}
                  </h3>
                  <p className="font-sans text-txt-secondary scale-sm leading-relaxed mb-6">
                    {card.body}
                  </p>

                  <ul className="space-y-3 pt-6 border-t border-border-subtle mb-8">
                    {card.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-start gap-3 text-[13px] text-txt-secondary">
                        <Check
                          className={`w-4 h-4 ${card.textColorClass} flex-shrink-0 mt-0.5`}
                          strokeWidth={2.5}
                        />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="pt-6 border-t border-border-subtle w-full">
                  <button
                    onClick={() => navigate(card.route)}
                    style={{ ["--btn-fill" as string]: card.accent }}
                    className={`btn-fill btn-fill-role w-full py-2.5 px-4 bg-transparent border ${card.btnBorderClass} text-txt-primary rounded-md font-semibold text-sm transition-colors cursor-pointer text-center`}
                  >
                    {card.btnText}
                  </button>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
