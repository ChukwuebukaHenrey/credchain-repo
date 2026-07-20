import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "./Reveal";

/**
 * Wraps a routed screen so navigations cross-fade + lift instead of hard-cutting.
 * Paired with <AnimatePresence mode="wait"> in App.tsx, keyed on the pathname.
 *
 * Under prefers-reduced-motion the transform is dropped and only a fast opacity
 * fade remains, so the app never feels janky for motion-sensitive users.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: reduce ? 0.15 : 0.32, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
