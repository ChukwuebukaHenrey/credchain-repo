import { useEffect, useState } from "react";
import logoImg from "../assets/logo.png";
import { getTheme } from "../services/theme";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showWordmark?: boolean;
  wordmarkSize?: "sm" | "md" | "lg";
  /** Deprecated. Tagline is no longer shown per design spec. */
  tagline?: string;
}

export default function Logo({
  className = "",
  showWordmark = true,
  wordmarkSize = "md",
}: LogoProps) {
  // Minimized icon sizes across the board (sm 28 / md 34 / lg 60 — down from 36/48/80).
  const boxSize = wordmarkSize === "sm" ? 28 : wordmarkSize === "lg" ? 60 : 34;
  const textClass =
    wordmarkSize === "sm" ? "text-base" : wordmarkSize === "lg" ? "text-2xl" : "text-lg";

  // In light theme the cyan→purple gradient wordmark washes out, so we render a
  // solid brand color instead. Track the theme reactively (toggle updates it).
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const sync = () => setIsLight(getTheme() === "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={logoImg}
        alt="CredChain Logo"
        width={boxSize}
        height={boxSize}
        referrerPolicy="no-referrer"
        className="object-contain flex-shrink-0"
      />
      {showWordmark && (
        <span
          className={`font-display font-bold tracking-tight leading-none ${textClass} ${
            isLight
              ? "text-brand-purple"
              : "bg-gradient-to-r from-[#00F0FF] to-[#9D00FF] bg-clip-text text-transparent"
          }`}
        >
          CredChain
        </span>
      )}
    </div>
  );
}
