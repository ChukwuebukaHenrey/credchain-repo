import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "How it works", href: "#how-it-works" },
    { name: "Features", href: "#features" },
    { name: "Who it's for", href: "#who-its-for" },
    { name: "Verification", href: "#ledger" },
  ];

  return (
    // Floating capsule nav (inspo-2 / Solana Super App). The outer wrapper is a
    // full-width fixed rail; the inner rounded bar floats with margin and gains a
    // stronger glass background on scroll. All colors come from theme tokens so
    // the light/dark toggle keeps working.
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav
        className={`mx-auto max-w-[1160px] rounded-full flex items-center h-16 px-3 md:px-4 transition-all duration-300 ${
          scrolled
            ? "bg-bg-surface/80 backdrop-blur-xl border border-border-main shadow-[0_8px_32px_-12px_rgba(124,58,237,0.35)]"
            : "bg-bg-surface/50 backdrop-blur-md border border-border-subtle"
        }`}
      >
        <div className="w-full flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <a href="#" aria-label="CredChain home" className="flex items-center pl-2">
            <Logo wordmarkSize="sm" />
          </a>

          {/* Center: Desktop Nav Links — pill hover */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-[13.5px] font-sans text-txt-secondary hover:text-txt-primary hover:bg-brand-purple-soft rounded-full px-4 py-2 transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right: CTAs (landing is dark-locked — no theme toggle here) */}
          <div className="hidden md:flex items-center gap-2 pr-1">
            <button
              onClick={() => navigate("/login")}
              className="text-[13.5px] font-sans text-txt-secondary hover:text-txt-primary transition-colors duration-200 cursor-pointer px-3 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/role")}
              className="bg-brand-purple hover:bg-brand-purple-dim text-white rounded-full px-5 py-2.5 font-semibold text-[13.5px] transition-colors cursor-pointer shadow-[0_0_20px_-4px_rgba(124,58,237,0.6)]"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2 pr-1">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              className="text-txt-secondary hover:text-txt-primary focus:outline-none p-1.5 rounded-full cursor-pointer"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer — floating card matching the capsule */}
      {isOpen && (
        <div className="mx-auto max-w-[1160px] mt-3 rounded-2xl bg-bg-surface/95 backdrop-blur-xl border border-border-main px-6 py-6 flex flex-col gap-6 md:hidden shadow-[0_8px_32px_-12px_rgba(124,58,237,0.35)]">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-[14px] font-sans text-txt-secondary hover:text-txt-primary hover:bg-brand-purple-soft rounded-lg px-3 py-2.5 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/login");
              }}
              className="w-full text-center text-[14px] font-sans text-txt-secondary hover:text-txt-primary py-2.5 rounded-full border border-border-main transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/role");
              }}
              className="w-full text-center bg-brand-purple hover:bg-brand-purple-dim text-white rounded-full py-2.5 font-semibold text-sm transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
