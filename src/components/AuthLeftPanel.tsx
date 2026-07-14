import { Link } from "react-router-dom";
import { Check, ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import authSidebarImg from "../assets/images/Duck.png";

export interface RoleInfo {
  id: "candidate" | "issuer" | "verifier";
  badge: string;
  textColor: string;
  borderColor: string;
  heading: string;
  perks: string[];
}

export const ROLE_SPECS: Record<string, RoleInfo> = {
  candidate: {
    id: "candidate",
    badge: "CANDIDATE",
    textColor: "text-role-candidate",
    borderColor: "border-role-candidate",
    heading: "Build your verified identity.",
    perks: [
      "Request credentials from your institution",
      "Generate AI-powered verified resumes",
      "Share a tamper-proof public profile",
      "QR code for instant employer verification",
    ],
  },
  issuer: {
    id: "issuer",
    badge: "INSTITUTION",
    textColor: "text-role-issuer",
    borderColor: "border-role-issuer",
    heading: "Issue tamper-evident credentials.",
    perks: [
      "Cryptographically sign academic records",
      "Instant verification portal for employers",
      "Batch issuance via secure CSV upload",
      "Revocation & status ledger management",
    ],
  },
  verifier: {
    id: "verifier",
    badge: "EMPLOYER",
    textColor: "text-role-verifier",
    borderColor: "border-role-verifier",
    heading: "Verify credentials instantly.",
    perks: [
      "Zero-fraud cryptographic proof check",
      "One-click applicant background audit",
      "Direct institutional verification ledger",
      "Download verified candidate dossiers",
    ],
  },
};

interface AuthLeftPanelProps {
  role: "candidate" | "issuer" | "verifier";
  currentStep?: number;
  totalSteps?: number;
}

export default function AuthLeftPanel({ role, currentStep, totalSteps }: AuthLeftPanelProps) {
  const spec = ROLE_SPECS[role] || ROLE_SPECS.candidate;

  return (
    <div className="w-1/2 h-full relative select-none">
      {/* Image fills the entire half edge-to-edge (matches monorepo). No padded card. */}
      <div className="w-full h-full overflow-hidden relative flex flex-col justify-between p-10 lg:p-12 xl:p-14 select-none">
        {/* Background infrastructure image - edge-to-edge */}
        <img
          src={authSidebarImg}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />
        {/* Dark gradient overlay to guarantee white text readability in light and dark themes */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25 z-10" />

        {/* Top-Right: Logo placed in the top right corner of the image with custom padding */}
        <div className="absolute top-6 right-6 z-20">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <Logo showWordmark={true} wordmarkSize="md" />
          </Link>
        </div>

        {/* Bottom: content overlaid in white text */}
        <div className="relative z-20 mt-auto space-y-4 max-w-sm text-left">
          {/* Role label — left border rule, no pill */}
          <div className={`border-l-2 ${spec.borderColor} pl-3 font-mono text-[10px] tracking-[0.2em] uppercase font-bold text-white/90`}>
            {spec.badge}
          </div>

          <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight leading-snug">
            {spec.heading}
          </h2>

          <p className="text-xs lg:text-sm text-white/75 leading-relaxed font-sans">
            {role === "candidate"
              ? "Your sovereign identity vault. Request credentials from institutions, generate AI-powered resumes, and share your tamper-proof profile with verified cryptographic proofs."
              : role === "issuer"
              ? "De-risk academic records. Issue, manage, and sign academic credentials cryptographically via the public ledger with complete revocation safety."
              : "Audit instantly, hire with trust. Direct verification checks against institutional registries with cryptographic zero-fraud proof guarantees."}
          </p>

          {/* Step indicator + back link */}
          <div className="pt-5 border-t border-white/15 space-y-4">
            {typeof currentStep === "number" && typeof totalSteps === "number" && totalSteps > 0 && (
              <div className="flex items-center gap-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-sm transition-all duration-200 ${
                      currentStep === i + 1
                        ? `w-8 bg-white`
                        : i + 1 < currentStep
                        ? `w-4 bg-white/50`
                        : "w-2 bg-white/20"
                    }`}
                  />
                ))}
                <span className="ml-2 font-mono text-[10px] text-white/60">
                  {currentStep} / {totalSteps}
                </span>
              </div>
            )}

            <Link
              to="/role"
              className="text-[11px] font-mono text-white/60 hover:text-white transition-colors inline-flex items-center gap-2 group pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Choose a different role</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
