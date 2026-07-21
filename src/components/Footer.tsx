import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

interface FooterLink {
  name: string;
  /** In-page anchor. */
  href?: string;
  /** Router route. */
  to?: string;
  /** Absolute external URL (opens in a new tab). */
  external?: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

// Real footer content — every entry points at a route/anchor that actually
// exists (no aspirational dead links), laid out in the inspo's column grid.
const columns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { name: "How it works", href: "#how-it-works" },
      { name: "Features", href: "#features" },
      { name: "Verification", href: "#ledger" },
      { name: "Who it's for", href: "#who-its-for" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { name: "Candidates", to: "/signup/candidate" },
      { name: "Institutions", to: "/signup/issuer" },
      { name: "Employers", to: "/signup/verifier" },
      { name: "Try a demo", to: "/login?demo=true" },
    ],
  },
  {
    heading: "Company",
    links: [
      { name: "Sign in", to: "/login" },
      { name: "Create account", to: "/role" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { name: "GitHub", external: "https://github.com" },
      { name: "X (Twitter)", external: "https://x.com" },
    ],
  },
];

/** One footer link — router push, in-page anchor, or external tab. Bold white,
 * larger than its muted header; on hover it warms toward the cyan accent. */
function FooterItem({ link }: { link: FooterLink }) {
  const navigate = useNavigate();
  const cls =
    "font-display text-[15px] font-bold text-txt-primary hover:text-role-candidate transition-colors cursor-pointer";
  if (link.to) {
    return (
      <button onClick={() => navigate(link.to!)} className={cls}>
        {link.name}
      </button>
    );
  }
  if (link.external) {
    return (
      <a href={link.external} target="_blank" rel="noopener noreferrer" className={cls}>
        {link.name}
      </a>
    );
  }
  return (
    <a href={link.href} className={cls}>
      {link.name}
    </a>
  );
}

export default function Footer() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);

  // Pointer parallax on the wordmark backdrop — the blueprint grid + waves lean
  // a few px toward the cursor, springed so they trail rather than snap. The
  // wordmark itself drifts the opposite way for depth. All disabled under
  // reduced motion (and the global reduced-motion CSS block is a second guard).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const bgX = useSpring(useTransform(px, [-0.5, 0.5], [-18, 18]), { stiffness: 60, damping: 20 });
  const bgY = useSpring(useTransform(py, [-0.5, 0.5], [-12, 12]), { stiffness: 60, damping: 20 });
  const markX = useSpring(useTransform(px, [-0.5, 0.5], [12, -12]), { stiffness: 50, damping: 22 });

  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <footer className="bg-bg-base">
      {/* ---- Link section — flush full-width, no card, no border ---- */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
          {/* Brand column — leads the row (inspo's first column). */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-txt-muted">
              CredChain
            </div>
            <p className="font-sans text-[13px] text-txt-secondary leading-relaxed max-w-[220px]">
              Verified credentials on Solana — tamper-proof, sub-second, and
              owned by the people who earn them.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="space-y-4">
              <div className="font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-txt-muted">
                {col.heading}
              </div>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <FooterItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Divider ---- */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="h-px bg-border-subtle" />
      </div>

      {/* ---- Bottom bar ---- */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-sans text-[12px] text-txt-muted">
            © 2026 CredChain. All rights reserved.
          </div>
          <div className="flex items-center gap-6 font-sans text-[12px] text-txt-muted">
            <a href="#" className="hover:text-txt-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-txt-primary transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* ---- Wordmark signature — giant, edge-bleeding, bottom-cropped, over the
           landing waves + a blueprint grid. This is the footer's visual sig. ---- */}
      <div
        ref={sectionRef}
        onPointerMove={handlePointer}
        className="relative h-[24vw] min-h-[150px] max-h-[300px] overflow-hidden select-none"
        aria-hidden
      >
        {/* Landing background image (same sol-waves used by Hero), dimmed. */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-no-repeat bg-cover bg-center scale-110 opacity-40"
          style={{
            backgroundImage: "url('/sol-waves.png')",
            x: reduce ? 0 : bgX,
            y: reduce ? 0 : bgY,
          }}
        />
        {/* Blueprint grid — fine white lines, ~5% opacity, architectural feel. */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            x: reduce ? 0 : bgX,
            y: reduce ? 0 : bgY,
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* Top fade so the grid/waves emerge from the bottom bar cleanly. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{ background: "linear-gradient(180deg, var(--bg-base), transparent)" }}
        />
        {/* The wordmark: oversized, pinned to the bottom, bleeding off L/R edges
            so it's cropped by the viewport — cyan→purple to match the brand. */}
        <motion.div
          className="absolute inset-x-0 bottom-0 flex justify-center"
          style={{ x: reduce ? 0 : markX }}
        >
          <span
            className="font-display font-bold leading-[0.8] tracking-tighter whitespace-nowrap translate-y-[0.14em] bg-gradient-to-r from-[#00F0FF] to-[#9D00FF] bg-clip-text text-transparent"
            style={{ fontSize: "clamp(120px, 21vw, 340px)" }}
          >
            CredChain
          </span>
        </motion.div>
      </div>
    </footer>
  );
}
