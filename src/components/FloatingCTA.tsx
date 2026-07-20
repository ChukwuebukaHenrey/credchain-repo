import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useReducedMotion,
} from "motion/react";
import { ShieldCheck, X } from "lucide-react";

/**
 * Persistent conversion action, bottom-right — CredChain's take on
 * bitcoin.com's floating "Get Bitcoin" pill. Appears once the visitor has
 * scrolled past the hero (so it doesn't compete with the hero's own CTAs),
 * and is dismissible. Session-dismissal is intentionally in-memory only: it
 * returns on the next visit but stays gone while the user reads this page.
 *
 * Respects reduced motion (no slide/spring — a plain fade) and is keyboard
 * reachable with a labelled dismiss control.
 */
export default function FloatingCTA() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [past, setPast] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Reveal after ~85% of one viewport of scroll — comfortably past the hero.
  useMotionValueEvent(scrollY, "change", (y) => {
    setPast(y > window.innerHeight * 0.85);
  });

  const show = past && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-5 right-5 z-50 flex items-center"
        >
          <button
            onClick={() => navigate("/role")}
            className="inline-flex items-center gap-2 bg-brand-purple hover:bg-brand-purple-dim text-white rounded-full pl-4 pr-5 py-3 font-semibold text-sm shadow-[0_8px_30px_-6px_rgba(124,58,237,0.7)] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Get verified</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="ml-1.5 grid place-items-center w-7 h-7 rounded-full bg-bg-surface border border-border-main text-txt-muted hover:text-txt-primary hover:border-border-strong transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
