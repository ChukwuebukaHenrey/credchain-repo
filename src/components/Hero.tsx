import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ShieldCheck, Check, Radio } from "lucide-react";
import FadeIn from "./FadeIn";

export default function Hero() {
  const navigate = useNavigate();

  // Option A — landing is a designed dark composition (like solana.com, which has
  // no light landing). The arc background + white headline only read correctly on
  // dark, so we lock the marketing page to dark regardless of the global toggle.
  // The toggle still governs the authenticated dashboards, where light is designed.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute("data-theme");
    html.setAttribute("data-theme", "dark");
    return () => {
      if (prev) html.setAttribute("data-theme", prev);
    };
  }, []);

  return (
    <section className="relative min-h-[92vh] bg-bg-base pt-32 pb-16 flex items-center overflow-hidden">
      {/* Full-bleed flowing-wave backdrop (sol.png). Spans edge-to-edge across the
          whole viewport width — the previous arc image was concentrated on the
          right, which left the left side looking empty. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 w-screen bg-no-repeat bg-cover bg-center"
        style={{ backgroundImage: "url('/sol-waves.png')" }}
      />
      {/* Left-weighted dark overlay keeps the headline column high-contrast while
          letting the waves breathe on the right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--bg-base) 0%, color-mix(in srgb, var(--bg-base) 80%, transparent) 35%, color-mix(in srgb, var(--bg-base) 40%, transparent) 70%, transparent 100%)",
        }}
      />
      {/* Bottom fade so the section blends into the next block */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{ background: "linear-gradient(180deg, transparent, var(--bg-base))" }}
      />

      <div className="relative w-full max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            <FadeIn>
              {/* Section eyebrow — left border rule, mono uppercase */}
              <div className="border-l-2 border-brand-purple pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-6">
                VERIFIED SKILLS · ANCHORED ON SOLANA
              </div>

              <h1 className="font-display text-txt-primary tracking-tight scale-3xl md:scale-4xl font-bold leading-none mb-6">
                Prove your skills.
                <br />
                <span className="text-role-candidate">Get hired.</span>
                <br />
                Start earning.
              </h1>

              <p className="font-sans text-txt-secondary scale-base max-w-[500px] mb-8 leading-relaxed">
                CredChain turns your real skills into tamper-proof, blockchain-verified credentials employers trust — then connects you to paid bounties. From verified, to hired, to earning.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-12">
                <button
                  onClick={() => navigate("/role")}
                  className="bg-brand-purple hover:bg-brand-purple-dim text-white rounded-md px-6 py-3 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Get Started
                </button>
                <a
                  href="#how-it-works"
                  className="bg-transparent border border-border-main hover:border-border-strong text-txt-primary rounded-md px-6 py-3 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>See How It Works</span>
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 border-t border-border-subtle pt-6 text-[11px] font-mono text-txt-muted uppercase tracking-wider">
                <div>// SECURED BY SOLANA</div>
                <div className="h-3 w-[1px] bg-border-main hidden sm:block" />
                <div>// ZERO PII ON-CHAIN</div>
                <div className="h-3 w-[1px] bg-border-main hidden sm:block" />
                <div>// 0.38s VERIFICATION</div>
              </div>
            </FadeIn>
          </div>

          {/* Right Column — Proof block card centerpiece */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <FadeIn delay={150}>
              <ProofBlockCard
                txSignature="4Qy3…tX9pKf2v"
                slot="182,901,321"
                credentialType="B.Eng in Computer Engineering"
                candidate="Emeka Obi"
                issuer="Federal University of Technology, Owerri"
                issuedDate="June 2026"
              />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ProofBlockCardProps {
  txSignature: string;
  slot: string;
  credentialType: string;
  candidate: string;
  issuer: string;
  issuedDate: string;
}

function ProofBlockCard({
  txSignature,
  slot,
  credentialType,
  candidate,
  issuer,
  issuedDate,
}: ProofBlockCardProps) {
  const rows: Array<[string, React.ReactNode]> = [
    ["TX SIGNATURE", <span className="font-mono text-[13px] text-txt-primary select-all break-all">{txSignature}</span>],
    ["SLOT", <span className="font-mono text-[13px] text-txt-primary font-medium">{slot}</span>],
    ["CREDENTIAL TYPE", <span className="font-sans text-[13px] text-txt-primary font-medium">{credentialType}</span>],
    ["CANDIDATE", <span className="font-sans text-[13px] text-txt-primary font-medium">{candidate}</span>],
    ["AUTHORIZED ISSUER", <span className="font-sans text-[13px] text-txt-primary font-medium">{issuer}</span>],
    ["ISSUED DATE", <span className="font-sans text-[13px] text-txt-primary font-medium">{issuedDate}</span>],
  ];

  return (
    // Clean glass card — subtle border + soft shadow (no heavy purple glow/ring).
    <div className="bg-bg-surface/80 backdrop-blur-xl border border-border-main rounded-xl p-6 w-full max-w-[480px] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] transition-colors duration-200 hover:border-border-strong">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-border-main mb-5">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-hash-green animate-pulse-custom" aria-hidden />
          <span className="font-mono text-[11px] text-txt-muted uppercase tracking-wider font-semibold">
            ON-CHAIN CREDENTIAL PROOF
          </span>
        </div>
        <div className="border border-border-main rounded-sm px-2 py-1 text-[11px] font-mono text-role-candidate">
          Solana Devnet
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4">
        {rows.map(([label, value], i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-5 font-mono text-[10px] text-txt-muted uppercase tracking-wider pt-0.5">
              {label}
            </div>
            <div className="col-span-7">{value}</div>
          </div>
        ))}

        {/* Authenticity Result */}
        <div className="grid grid-cols-12 gap-2 items-center pt-2">
          <div className="col-span-5 font-mono text-[10px] text-txt-muted uppercase tracking-wider">
            AUTHENTICITY
          </div>
          <div className="col-span-7 font-sans text-[13px] text-hash-green font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4" strokeWidth={2.5} />
            <span>VERIFIED MATCH</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-border-main">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-txt-muted">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Memo-anchored</span>
        </div>
        <div className="font-mono text-[11px] text-hash-green">
          HASH: SHA-256
        </div>
      </div>
    </div>
  );
}

export { ProofBlockCard };
