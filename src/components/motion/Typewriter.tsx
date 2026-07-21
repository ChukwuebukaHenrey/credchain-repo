import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Inline typewriter that cycles a list of words in place — types a word,
 * holds it, deletes it, moves to the next, then loops. Built to sit INSIDE a
 * headline: it inherits font family / size / weight / color from its parent,
 * so wrapping it in a coloured span (e.g. text-role-candidate) tints both the
 * text and the caret.
 *
 * Adapted from the kokonutui typewriter (MIT) with two project changes:
 *  - inline/inherit styling instead of a fixed mono heading + container, and
 *  - `prefers-reduced-motion` support (renders the first word statically, no
 *    caret blink) to match CredChain's global motion policy.
 */
interface TypewriterProps {
  words: string[];
  /** ms per character while typing. */
  typingSpeed?: number;
  /** ms per character while deleting. */
  deleteSpeed?: number;
  /** ms to hold a completed word before deleting it. */
  pauseAfter?: number;
  /** +/- jitter on typing speed so it reads like a human, not a metronome. */
  naturalVariance?: boolean;
  className?: string;
}

export default function Typewriter({
  words,
  typingSpeed = 65,
  deleteSpeed = 32,
  pauseAfter = 1500,
  naturalVariance = true,
  className,
}: TypewriterProps) {
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const wordRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordsRef = useRef(words);
  wordsRef.current = words;

  useEffect(() => {
    // Reduced motion / empty: show the first word and stop — no looping.
    if (reduce || words.length === 0) {
      setText(words[0] ?? "");
      return;
    }

    const jitter = () => {
      if (!naturalVariance) return typingSpeed;
      const r = Math.random();
      if (r < 0.1) return typingSpeed * 2; // occasional hesitation
      if (r > 0.9) return typingSpeed * 0.5; // occasional burst
      return typingSpeed * (0.6 + Math.random() * 0.8);
    };

    const step = () => {
      const word = wordsRef.current[wordRef.current] ?? "";
      if (!deletingRef.current) {
        // typing forward
        if (charRef.current < word.length) {
          charRef.current += 1;
          setText(word.slice(0, charRef.current));
          timer.current = setTimeout(step, jitter());
        } else {
          deletingRef.current = true;
          timer.current = setTimeout(step, pauseAfter);
        }
      } else {
        // deleting back
        if (charRef.current > 0) {
          charRef.current -= 1;
          setText(word.slice(0, charRef.current));
          timer.current = setTimeout(step, deleteSpeed);
        } else {
          deletingRef.current = false;
          wordRef.current = (wordRef.current + 1) % wordsRef.current.length;
          timer.current = setTimeout(step, typingSpeed);
        }
      }
    };

    timer.current = setTimeout(step, typingSpeed);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reduce, typingSpeed, deleteSpeed, pauseAfter, naturalVariance, words]);

  return (
    <span className={className}>
      <span>{text}</span>
      {!reduce && (
        <span
          aria-hidden
          className="caret-blink ml-1 inline-block h-[0.82em] w-[3px] translate-y-[0.06em] bg-current"
        />
      )}
    </span>
  );
}
