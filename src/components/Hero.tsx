import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "motion/react";
import { Play, ShieldCheck, Check, Radio, Loader2 } from "lucide-react";
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

const HEX = "0123456789abcdef";

/** Scramble the alphanumeric chars of a signature, preserving separators like "…". */
function scramble(sig: string): string {
  return sig
    .split("")
    .map((c) => (/[a-zA-Z0-9]/.test(c) ? HEX[Math.floor(Math.random() * HEX.length)] : c))
    .join("");
}

/**
 * Drives the hero's signature moment: the proof "resolves". The TX signature
 * scrambles through hex for a beat while authenticity reads VERIFYING…, then
 * settles to the real signature and pops to VERIFIED MATCH — looping quietly so
 * the card feels alive without demanding attention.
 *
 * Returns the settled state immediately (no interval) under reduced motion.
 */
function useProofResolve(realSig: string) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(realSig);
  const [verified, setVerified] = useState(true);

  useEffect(() => {
    if (reduce) {
      setDisplay(realSig);
      setVerified(true);
      return;
    }

    let scrambleTimer: ReturnType<typeof setInterval> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let cycleTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const runCycle = () => {
      if (cancelled) return;
      setVerified(false);
      // Scramble for ~1.1s, updating a few times a second.
      scrambleTimer = setInterval(() => setDisplay(scramble(realSig)), 70);
      settleTimer = setTimeout(() => {
        clearInterval(scrambleTimer);
        setDisplay(realSig);
        setVerified(true);
      }, 1100);
      // Idle in the verified state, then re-run.
      cycleTimer = setTimeout(runCycle, 6000);
    };

    // Small initial delay so the card is settled on first paint, then animates.
    cycleTimer = setTimeout(runCycle, 1400);

    return () => {
      cancelled = true;
      clearInterval(scrambleTimer);
      clearTimeout(settleTimer);
      clearTimeout(cycleTimer);
    };
  }, [realSig, reduce]);

  return { display, verified };
}

function ProofBlockCard({
  txSignature,
  slot,
  credentialType,
  candidate,
  issuer,
  issuedDate,
}: ProofBlockCardProps) {
  const reduce = useReducedMotion();
  const { display, verified } = useProofResolve(txSignature);

  const rows: Array<[string, React.ReactNode]> = [
    ["TX SIGNATURE", <span className={`font-mono text-[13px] select-all break-all transition-colors duration-200 ${verified ? "text-txt-primary" : "text-role-candidate"}`}>{display}</span>],
    ["SLOT", <span className="font-mono text-[13px] text-txt-primary font-medium">{slot}</span>],
    ["CREDENTIAL TYPE", <span className="font-sans text-[13px] text-txt-primary font-medium">{credentialType}</span>],
    ["CANDIDATE", <span className="font-sans text-[13px] text-txt-primary font-medium">{candidate}</span>],
    ["AUTHORIZED ISSUER", <span className="font-sans text-[13px] text-txt-primary font-medium">{issuer}</span>],
    ["ISSUED DATE", <span className="font-sans text-[13px] text-txt-primary font-medium">{issuedDate}</span>],
  ];

  return (
    // Clean glass card — subtle border + soft shadow (no heavy purple glow/ring).
    // The border warms to hash-green the instant the proof resolves.
    <div
      className="bg-bg-surface/80 backdrop-blur-xl border rounded-xl p-6 w-full max-w-[480px] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] transition-colors duration-300 hover:border-border-strong"
      style={{ borderColor: verified ? "color-mix(in srgb, var(--hash-green) 40%, var(--border-main))" : "var(--border-main)" }}
    >
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

        {/* Authenticity Result — flips between VERIFYING… and VERIFIED MATCH as
            the proof resolves. The verified state pops in for emphasis. */}
        <div className="grid grid-cols-12 gap-2 items-center pt-2">
          <div className="col-span-5 font-mono text-[10px] text-txt-muted uppercase tracking-wider">
            AUTHENTICITY
          </div>
          <div className="col-span-7 font-sans text-[13px] font-bold flex items-center gap-1.5">
            {verified ? (
              <motion.span
                key="verified"
                className="flex items-center gap-1.5 text-hash-green"
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 16 }}
              >
                <Check className="w-4 h-4" strokeWidth={2.5} />
                <span>VERIFIED MATCH</span>
              </motion.span>
            ) : (
              <span className="flex items-center gap-1.5 text-role-candidate">
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                <span>VERIFYING…</span>
              </span>
            )}
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
