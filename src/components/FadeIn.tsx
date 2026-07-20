import type { ReactNode } from "react";
import { Reveal } from "./motion/Reveal";

/**
 * Back-compat shim. FadeIn was an opacity-only IntersectionObserver reveal;
 * it now delegates to <Reveal> so every existing call site gets the unified,
 * reduced-motion-aware scroll reveal without a churn of import changes.
 *
 * `delay` stays in milliseconds here (its original unit); Reveal takes seconds.
 */
export default function FadeIn({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return <Reveal delay={delay / 1000}>{children}</Reveal>;
}
