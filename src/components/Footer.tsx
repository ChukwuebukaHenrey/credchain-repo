import { Github } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { Reveal } from "./motion/Reveal";

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M9.6 0h1.9l-4.2 4.8L12.1 12H8.3L5.3 8.1 1.9 12H0l4.5-5.1L0 0h3.9l2.7 3.6L9.6 0zm-.7 10.1h1L3.9 1h-1.1l6.1 9.1z" />
  </svg>
);

interface FooterLink {
  name: string;
  /** In-page anchor. */
  href?: string;
  /** Router route. */
  to?: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const columns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { name: "How it works", href: "#how-it-works" },
      { name: "Features", href: "#features" },
      { name: "Verification", href: "#ledger" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { name: "Candidates", to: "/signup/candidate" },
      { name: "Institutions", to: "/signup/issuer" },
      { name: "Employers", to: "/signup/verifier" },
    ],
  },
  {
    heading: "Company",
    links: [
      { name: "Who it's for", href: "#who-its-for" },
      { name: "Sign in", to: "/login" },
      { name: "Try a demo", to: "/login?demo=true" },
    ],
  },
];

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-bg-base border-t border-border-main py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-border-subtle">
            {/* Brand column */}
            <div className="md:col-span-5 space-y-5">
              <a href="#" aria-label="CredChain home" className="inline-flex items-center">
                <Logo wordmarkSize="sm" />
              </a>
              <p className="font-sans text-txt-secondary scale-sm leading-relaxed max-w-xs">
                Verified credentials on Solana. Tamper-proof, sub-second, and
                owned by the people who earn them — never the institution.
              </p>
              {/* Live network status pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-hash-green opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-hash-green" />
                </span>
                <span className="font-mono text-[10px] text-txt-muted uppercase tracking-wider">
                  Devnet operational
                </span>
              </div>
            </div>

            {/* Link columns */}
            {columns.map((col) => (
              <div key={col.heading} className="md:col-span-2 space-y-3">
                <div className="font-mono text-[10px] text-txt-muted uppercase tracking-[0.18em]">
                  {col.heading}
                </div>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.name}>
                      {link.to ? (
                        <button
                          onClick={() => navigate(link.to!)}
                          className="font-sans text-[13px] text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer"
                        >
                          {link.name}
                        </button>
                      ) : (
                        <a
                          href={link.href}
                          className="font-sans text-[13px] text-txt-secondary hover:text-txt-primary transition-colors"
                        >
                          {link.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[13px] text-txt-muted font-sans">
          <div>© 2026 CredChain. Secured by Solana.</div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-txt-primary transition-colors">
              Privacy Principles
            </a>
            <div className="flex items-center gap-4 text-txt-muted">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-txt-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-txt-primary transition-colors flex items-center justify-center"
                aria-label="X (formerly Twitter)"
              >
                <XIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
