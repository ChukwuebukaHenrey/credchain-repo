import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "motion/react";
import { Play, ShieldCheck, Check, Hexagon } from "lucide-react";
import FadeIn from "./FadeIn";
import Typewriter from "./motion/Typewriter";

export default function Hero() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

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

  // Scroll parallax: the wave backdrop drifts up slower than the content as the
  // hero scrolls away, giving the section depth instead of a flat image.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  // Pointer drift: the backdrop leans a few px toward the cursor. Springed so it
  // trails smoothly rather than snapping. Both disabled under reduced-motion.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const driftX = useSpring(useTransform(pointerX, [-0.5, 0.5], [-14, 14]), {
    stiffness: 60,
    damping: 18,
  });
  const driftY = useSpring(useTransform(pointerY, [-0.5, 0.5], [-10, 10]), {
    stiffness: 60,
    damping: 18,
  });

  function handlePointer(e: React.PointerEvent<HTMLElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - r.left) / r.width - 0.5);
    pointerY.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <section
      ref={sectionRef}
      onPointerMove={handlePointer}
      className="relative min-h-[92vh] bg-bg-base pt-32 pb-16 flex items-center overflow-hidden"
    >
      {/* Full-bleed flowing-wave backdrop. Two nested layers so the two motions
          don't fight over the same transform: the outer layer drifts on scroll
          (parallax), the inner leans toward the pointer. Over-sized (scale) so
          neither motion ever exposes an edge. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ y: reduce ? 0 : bgY }}
      >
        <motion.div
          className="absolute inset-0 w-screen bg-no-repeat bg-cover bg-center scale-110"
          style={{
            backgroundImage: "url('/sol-waves.png')",
            x: reduce ? 0 : driftX,
            y: reduce ? 0 : driftY,
          }}
        />
      </motion.div>
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
                <span className="text-role-candidate">
                  Get{" "}
                  <Typewriter
                    words={["hired.", "noticed.", "vouched for.", "paid."]}
                  />
                </span>
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
                  className="btn-fill btn-fill-primary bg-transparent border border-border-main text-txt-primary rounded-md px-6 py-3 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
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

/**
 * Hero centerpiece — a single verified credential, read top-down like a person
 * would: WHO (candidate + the credential they earned), THEN the trust stamp
 * (verified on Solana), THEN the on-chain proof metadata for the skeptics.
 * Fully static — no looping scramble, no pulsing/spinning icons. The one bit of
 * life is a soft green ring on the verified stamp; everything else holds still.
 */
function ProofBlockCard({
  txSignature,
  slot,
  credentialType,
  candidate,
  issuer,
  issuedDate,
}: ProofBlockCardProps) {
  const initials = candidate
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  // Compact on-chain proof rows — the evidence, de-emphasized under the identity.
  const proof: Array<[string, React.ReactNode]> = [
    ["Issuer", <span className="font-sans text-[13px] text-txt-primary font-medium text-right">{issuer}</span>],
    ["Issued", <span className="font-sans text-[13px] text-txt-primary font-medium text-right">{issuedDate}</span>],
    ["Slot", <span className="font-mono text-[12px] text-txt-secondary text-right">{slot}</span>],
    ["Tx", <span className="font-mono text-[12px] text-txt-secondary select-all break-all text-right">{txSignature}</span>],
  ];

  return (
    <div className="bg-bg-surface/80 backdrop-blur-xl border border-border-main rounded-xl w-full max-w-[420px] shadow-[0_8px_28px_-12px_rgba(0,0,0,0.55)] overflow-hidden transition-colors duration-300 hover:border-border-strong">
      {/* Top rail — network context, quiet */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-bg-base/40">
        <span className="font-mono text-[10px] text-txt-muted uppercase tracking-[0.16em]">
          Verified Credential
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-role-candidate">
          <Hexagon className="w-3 h-3" strokeWidth={2} />
          Solana
        </span>
      </div>

      {/* Identity — who earned what */}
      <div className="px-6 pt-6 flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-role-candidate-soft border border-border-subtle flex items-center justify-center font-display font-bold text-role-candidate text-lg">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-txt-primary text-[17px] leading-tight truncate">
            {candidate}
          </div>
          <div className="font-sans text-[13px] text-txt-secondary leading-snug mt-0.5">
            {credentialType}
          </div>
        </div>
      </div>

      {/* Verified stamp — the trust moment, held (soft static ring, no pulse) */}
      <div className="px-6 mt-5">
        <div className="flex items-center gap-3 rounded-lg border border-hash-green/30 bg-hash-green/5 px-4 py-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-hash-green/15 text-hash-green ring-4 ring-hash-green/10">
            <Check className="w-5 h-5" strokeWidth={2.75} />
          </span>
          <div className="leading-tight">
            <div className="font-display font-bold text-hash-green text-[14px]">Verified match</div>
            <div className="font-mono text-[10px] text-txt-muted">Cryptographic proof · zero PII</div>
          </div>
        </div>
      </div>

      {/* Proof metadata — the evidence, compact */}
      <div className="px-6 py-5 mt-1 space-y-2.5">
        {proof.map(([label, value], i) => (
          <div key={i} className="flex items-baseline justify-between gap-4">
            <span className="font-mono text-[10px] text-txt-muted uppercase tracking-wider flex-shrink-0">
              {label}
            </span>
            <span className="min-w-0 truncate">{value}</span>
          </div>
        ))}
      </div>

      {/* Footer — hash provenance */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-bg-base/40">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-txt-muted">
          <ShieldCheck className="w-3.5 h-3.5" />
          Memo-anchored
        </span>
        <span className="font-mono text-[10px] text-hash-green">SHA-256</span>
      </div>
    </div>
  );
}

export { ProofBlockCard };
