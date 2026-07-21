"use client";

/**
 * Feature grid with magnetic 3D tilt, hover glow, and focus-dim siblings.
 * Adapted from kokonutui SpotlightCards (MIT, @dorianbaffier) to CredChain's
 * token theme — zinc/dark: classes swapped for [data-theme] tokens, default
 * accent colors mapped to the brand + role palette.
 */

import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Zap, Coins, QrCode, FileCheck, Layers } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "../../lib/utils";

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 } as const;
const GLOW_SPRING = { stiffness: 180, damping: 22 } as const;

export interface SpotlightItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

// CredChain palette: brand purple + role accents (cyan/green/amber).
const DEFAULT_ITEMS: SpotlightItem[] = [
  {
    icon: ShieldCheck,
    title: "Tamper-proof",
    description: "Every credential is a cryptographic proof on Solana — it can't be edited, faked, or revoked out from under you.",
    color: "#7C3AED",
  },
  {
    icon: Zap,
    title: "Sub-second verify",
    description: "Employers confirm a skill instantly against the ledger — no email chains, no forgeable PDFs.",
    color: "#F59E0B",
  },
  {
    icon: QrCode,
    title: "Scan to trust",
    description: "Any CredChain QR resolves to a live on-chain match. Zero registration required to verify.",
    color: "#00D4FF",
  },
  {
    icon: Coins,
    title: "Earn from skills",
    description: "A verified profile unlocks paid bounties. Payment held in Solana escrow, released on delivery.",
    color: "#10B981",
  },
  {
    icon: FileCheck,
    title: "Owned by you",
    description: "Your credentials live in your vault, not an institution's silo. Portable, permanent, yours.",
    color: "#A78BFA",
  },
  {
    icon: Layers,
    title: "Zero PII on-chain",
    description: "Only proofs touch the chain — never personal data. Privacy and verifiability, together.",
    color: "#22C55E",
  },
];

interface CardProps {
  item: SpotlightItem;
  dimmed: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function Card({ item, dimmed, onHoverStart, onHoverEnd }: CardProps) {
  const Icon = item.icon;
  const cardRef = useRef<HTMLDivElement>(null);

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    glowOpacity.set(1);
    onHoverStart();
  };

  const handleMouseLeave = () => {
    normX.set(0.5);
    normY.set(0.5);
    glowOpacity.set(0);
    onHoverEnd();
  };

  return (
    <motion.div
      animate={{ scale: dimmed ? 0.96 : 1, opacity: dimmed ? 0.5 : 1 }}
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-2xl border p-6",
        "border-border-main bg-bg-surface",
        "transition-[border-color] duration-300 hover:border-border-strong"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {/* Static accent tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 20% 20%, ${item.color}14, transparent 65%)` }}
      />
      {/* Hover glow layer */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(ellipse at 20% 20%, ${item.color}2e, transparent 65%)`,
        }}
      />
      {/* Shimmer sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[55%] -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[280%]"
      />
      {/* Icon badge */}
      <div
        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: `${item.color}18`, boxShadow: `inset 0 0 0 1px ${item.color}30` }}
      >
        <Icon size={17} strokeWidth={1.9} style={{ color: item.color }} />
      </div>
      {/* Text */}
      <div className="relative z-10 flex flex-col gap-2">
        <h3 className="font-display font-semibold text-[15px] text-txt-primary tracking-tight">
          {item.title}
        </h3>
        <p className="text-[12.5px] text-txt-secondary leading-relaxed">{item.description}</p>
      </div>
      {/* Accent bottom line */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full transition-all duration-500 group-hover:w-full"
        style={{ background: `linear-gradient(to right, ${item.color}80, transparent)` }}
      />
    </motion.div>
  );
}

Card.displayName = "Card";

export interface SpotlightCardsProps {
  items?: SpotlightItem[];
  eyebrow?: string;
  heading?: string;
  className?: string;
}

export default function SpotlightCards({
  items = DEFAULT_ITEMS,
  eyebrow = "Why CredChain",
  heading = "Trust you can verify.",
  className,
}: SpotlightCardsProps) {
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl px-6 pt-9 pb-10 sm:px-8", "bg-bg-base", className)}>
      {/* Header */}
      <div className="relative mb-8 flex flex-col gap-1.5">
        <p className="font-mono text-[11px] text-brand-purple uppercase tracking-[0.18em]">{eyebrow}</p>
        <h2 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">{heading}</h2>
      </div>
      {/* Card grid */}
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card
            dimmed={hoveredTitle !== null && hoveredTitle !== item.title}
            item={item}
            key={item.title}
            onHoverEnd={() => setHoveredTitle(null)}
            onHoverStart={() => setHoveredTitle(item.title)}
          />
        ))}
      </div>
    </div>
  );
}
