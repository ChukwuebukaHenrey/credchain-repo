import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion foundation for the marketing surface.
 *
 * `Reveal` replaces the old opacity-only <FadeIn>: it reveals on scroll with a
 * short rise, and — crucially — respects prefers-reduced-motion by collapsing
 * to an instant, transform-free appearance. `Stagger` orchestrates a group so
 * children arrive in sequence rather than all at once (the skill's "an
 * orchestrated moment lands harder than scattered effects").
 *
 * Everything routes through the same easing/timing constants so motion across
 * the site feels like one system, not per-component guesses.
 */

// Shared spring-ish easing. Matches the cubic-beziers already used in index.css
// (pageEnter / riseIn) so CSS and JS motion feel of a piece.
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DURATION = 0.55;

type RevealProps = {
  children: ReactNode;
  /** Seconds to delay the reveal. */
  delay?: number;
  /** Rise distance in px (default 14). */
  y?: number;
  className?: string;
  /** Re-run the reveal every time it scrolls into view. Default false (once). */
  repeat?: boolean;
  as?: "div" | "section" | "li" | "span";
};

export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
  repeat = false,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: !repeat, amount: 0.2, margin: "0px 0px -10% 0px" }}
      transition={{ duration: DURATION, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Wrap a group to stagger its <Reveal>/<StaggerItem> children. Put StaggerItem
 * (or any motion child reading the `item` variants) inside.
 */
export function Stagger({
  children,
  className,
  gap = 0.09,
  once = true,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Seconds between each child. */
  gap?: number;
  once?: boolean;
  as?: "div" | "section" | "ul";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : gap },
    },
  };

  return (
    <MotionTag
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.15 }}
    >
      {children}
    </MotionTag>
  );
}

/** A child of <Stagger>. Reads the shared item variants. */
export function StaggerItem({
  children,
  className,
  y = 16,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: "div" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION, ease: EASE },
    },
  };

  return (
    <MotionTag className={className} variants={item}>
      {children}
    </MotionTag>
  );
}
