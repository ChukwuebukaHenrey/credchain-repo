import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "motion/react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The card that "compels the viewer to go into it" (frontend-design skill).
 *
 * A cursor-tracked radial spotlight follows the pointer across the card, the
 * card lifts on hover, and an accent-colored edge blooms. The spotlight color
 * is driven by `accent` (a CSS color / token var) so each card can carry its
 * role hue — cyan candidate, green issuer, amber verifier — without new code.
 *
 * Under prefers-reduced-motion the pointer tracking and lift are dropped; only
 * a flat border-strengthen on hover remains (handled by the caller's classes).
 */
export default function SpotlightCard({
  children,
  accent = "var(--brand-purple)",
  className = "",
  style,
  /** Lift distance in px on hover. */
  lift = 6,
}: {
  children: ReactNode;
  accent?: string;
  className?: string;
  style?: CSSProperties;
  lift?: number;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(-999);
  const my = useMotionValue(-999);
  // Hooks must run unconditionally — build the template regardless, only render
  // the spotlight layer when motion is allowed.
  const spotlight = useMotionTemplate`radial-gradient(240px circle at ${mx}px ${my}px, color-mix(in srgb, ${accent} 22%, transparent), transparent 70%)`;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }
  function onLeave() {
    mx.set(-999);
    my.set(-999);
  }

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileHover={reduce ? undefined : { y: -lift }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group/spot relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Cursor spotlight — a soft radial wash in the accent hue that tracks the
          pointer. Sits above the card bg but below content (content is z-10). */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
          style={{ background: spotlight }}
        />
      )}
      {children}
    </motion.div>
  );
}
