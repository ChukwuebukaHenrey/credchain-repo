import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import AuthLeftPanel from "./AuthLeftPanel";

interface AuthScreenProps {
  role: "candidate" | "issuer" | "verifier";
  currentStep?: number;
  totalSteps?: number;
  /** Content rendered on the right desktop panel and as the mobile card body. */
  children: ReactNode;
  /** Optional footer link (e.g. "Back to role selection"). */
  backHref?: string;
  backLabel?: string;
}

export default function AuthScreen({
  role,
  currentStep,
  totalSteps,
  children,
  backHref = "/",
  backLabel = "Back to home",
}: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-[#07030d] text-txt-primary flex flex-col relative select-none overflow-hidden">
      {/* Mobile top header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between min-[900px]:hidden p-4">
        <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
          <Logo wordmarkSize="md" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex w-full h-full min-h-0">
        {/* Desktop two-panel full viewport layout (No card, edge-to-edge) */}
        <div className="hidden min-[900px]:flex w-full h-screen bg-bg-base overflow-hidden relative">
          
          {/* Top-Right controls (Back to Home + Theme Toggle) of the whole page */}
          <div className="absolute top-6 right-8 z-25 flex items-center gap-4">
            <Link
              to={backHref}
              className="text-xs font-mono text-txt-muted hover:text-txt-primary transition-colors inline-flex items-center gap-1.5 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{backLabel}</span>
            </Link>
            <div className="h-4 w-px bg-border-main" />
            <ThemeToggle />
          </div>

           <AuthLeftPanel role={role} currentStep={currentStep} totalSteps={totalSteps} />

          <div className="w-1/2 bg-bg-base p-6 lg:p-10 xl:p-12 flex flex-col justify-center text-left relative overflow-y-auto h-full">
            <div className="w-full max-w-md mx-auto space-y-3 lg:space-y-4">
              {children}
            </div>
          </div>
        </div>

        {/* Mobile single column */}
        <div className="block min-[900px]:hidden w-full max-w-md bg-bg-surface border border-border-main rounded-2xl p-6 sm:p-8 shadow-xl mx-auto my-auto">
          {children}
        </div>
      </main>

      <footer className="max-w-7xl w-full mx-auto pt-6 border-t border-border-subtle block min-[900px]:hidden p-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-xs font-mono text-txt-muted hover:text-txt-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </Link>
      </footer>
    </div>
  );
}
