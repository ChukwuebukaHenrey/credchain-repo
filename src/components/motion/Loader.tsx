"use client";

/**
 * Concentric conic-gradient ring loader with breathing title/subtitle.
 * Adapted from kokonutui (MIT) to CredChain's token theme: the source used
 * hardcoded black/white + `dark:` variants; here the rings use the brand
 * purple and text uses theme tokens, so it reads correctly in both themes.
 */

import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

export default function Loader({
  title = "Verifying on-chain…",
  subtitle = "Resolving the credential proof against the Solana ledger",
  size = "md",
  className,
  ...props
}: LoaderProps) {
  const sizeConfig = {
    sm: {
      container: "size-20",
      titleClass: "text-sm/tight font-medium",
      subtitleClass: "text-xs/relaxed",
      spacing: "space-y-2",
      maxWidth: "max-w-48",
    },
    md: {
      container: "size-32",
      titleClass: "text-base/snug font-medium",
      subtitleClass: "text-sm/relaxed",
      spacing: "space-y-3",
      maxWidth: "max-w-56",
    },
    lg: {
      container: "size-40",
      titleClass: "text-lg/tight font-semibold",
      subtitleClass: "text-base/relaxed",
      spacing: "space-y-4",
      maxWidth: "max-w-64",
    },
  };

  const config = sizeConfig[size];

  // Brand-purple conic rings (replaces the source's black/white). Kept as a
  // constant so all three rings stay in sync if the accent changes.
  const RING = "124, 58, 237"; // --brand-purple as rgb

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-8 p-8",
        className
      )}
      {...props}
    >
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        className={cn("relative", config.container)}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.4, 0, 0.6, 1],
        }}
      >
        {/* Outer ring with shimmer */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, rgb(${RING}) 90deg, transparent 180deg)`,
            mask: "radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)",
            opacity: 0.85,
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* Middle ring - fuller sweep */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, rgb(${RING}) 120deg, rgba(${RING}, 0.5) 240deg, transparent 360deg)`,
            mask: "radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)",
            opacity: 0.9,
          }}
          transition={{
            duration: 2.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: [0.4, 0, 0.6, 1],
          }}
        />

        {/* Secondary ring - counter rotation */}
        <motion.div
          animate={{ rotate: [0, -360] }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 180deg, transparent 0deg, rgba(${RING}, 0.6) 45deg, transparent 90deg)`,
            mask: "radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)",
            opacity: 0.4,
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: [0.4, 0, 0.6, 1],
          }}
        />

        {/* Accent particles */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 270deg, transparent 0deg, rgba(${RING}, 0.4) 20deg, transparent 40deg)`,
            mask: "radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)",
            opacity: 0.5,
          }}
          transition={{
            duration: 3.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </motion.div>

      {/* Breathing title/subtitle */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn("text-center", config.spacing, config.maxWidth)}
        initial={{ opacity: 0, y: 12 }}
        transition={{ delay: 0.4, duration: 1, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.h3
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            config.titleClass,
            "font-display text-txt-primary leading-[1.15] tracking-[-0.02em] antialiased"
          )}
          initial={{ opacity: 0, y: 12 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.span
            animate={{ opacity: [0.95, 0.7, 0.95] }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: [0.4, 0, 0.6, 1],
            }}
          >
            {title}
          </motion.span>
        </motion.h3>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            config.subtitleClass,
            "font-sans text-txt-secondary leading-[1.45] tracking-[-0.01em] antialiased"
          )}
          initial={{ opacity: 0, y: 8 }}
          transition={{ delay: 0.8, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.span
            animate={{ opacity: [0.7, 0.45, 0.7] }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: [0.4, 0, 0.6, 1],
            }}
          >
            {subtitle}
          </motion.span>
        </motion.p>
      </motion.div>
    </div>
  );
}

Loader.displayName = "Loader";
