import { Brain, QrCode, Archive, Sparkles, FileSpreadsheet, Coins } from "lucide-react";
import FadeIn from "./FadeIn";
import SpotlightCards, { SpotlightItem } from "./motion/SpotlightCards";

// CredChain's core capabilities, mapped onto the SpotlightCards grid (kokonutui
// 3D-tilt + focus-dim). Per-item colors are decorative accents drawn from the
// role palette (candidate cyan / issuer green / verifier amber) + brand purple,
// never arbitrary hues — so the grid still reads as CredChain.
const FEATURE_ITEMS: SpotlightItem[] = [
  {
    icon: Brain,
    title: "AI Document Processing",
    description:
      "Transcripts and diplomas parsed by multi-modal AI into clean, structured output ready for institutional approval.",
    color: "#7C3AED", // brand-purple
  },
  {
    icon: QrCode,
    title: "QR Verification",
    description:
      "Scan any CredChain QR code for instant on-chain confirmation. Zero registration required.",
    color: "#F59E0B", // role-verifier amber
  },
  {
    icon: Archive,
    title: "Credential Vault",
    description:
      "Every verified credential in one place — owned by the candidate, not the institution.",
    color: "#00D4FF", // role-candidate cyan
  },
  {
    icon: Sparkles,
    title: "AI Resume Builder",
    description:
      "Build a verified resume straight from your on-chain credentials. Every claim backed by institutional proof.",
    color: "#00D4FF", // role-candidate cyan
  },
  {
    icon: FileSpreadsheet,
    title: "Employer Verification",
    description:
      "Bulk-verify candidate pools via CSV upload. Instant results against the Solana ledger.",
    color: "#F59E0B", // role-verifier amber
  },
  {
    icon: Coins,
    title: "Earn From Skills",
    description:
      "A verified profile unlocks paid bounties held in Solana escrow, released on delivery.",
    color: "#10B981", // role-issuer green
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-[120px] bg-bg-base overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <FadeIn>
          <SpotlightCards
            eyebrow="Core capabilities"
            heading="Built for the entire credential lifecycle."
            items={FEATURE_ITEMS}
          />
        </FadeIn>
      </div>
    </section>
  );
}
