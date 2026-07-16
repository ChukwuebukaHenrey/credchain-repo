import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  ExternalLink,
  Award,
  Building2,
  Calendar,
  Bookmark,
  ShieldCheck,
  ArrowLeft,
  Hash,
  SearchX,
} from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { getPublicProfile, badgeUrl } from "../services/api";

interface ProfileCredential {
  id: string;
  title: string;
  issuer: string;
  year?: string | number;
  issueDate?: string;
  /** Solana tx signature — present once the credential is anchored on-chain. */
  txSignature?: string;
  verificationId?: string;
  network?: string;
  /** Backend-provided explorer URL (already carries the correct cluster). */
  explorerUrl?: string;
}

interface CandidateProfile {
  id: string;
  name: string;
  photo?: string;
  bio?: string;
  skills: string[];
  credentials: ProfileCredential[];
}

// Backend: GET /api/student/profile/:credchainId → { profile: { name, credchainId,
// bio, skills, credentials } } — credentials are ACCEPTED only, with txSignature.
// The mock branch returns a slightly different fixture shape; normalize both here.
function normalizeProfile(p: any, routeId: string): CandidateProfile {
  const creds = Array.isArray(p.credentials) ? p.credentials : [];
  return {
    id: p.credchainId || p.candidateId || p.id || routeId,
    name: p.name || "Candidate",
    photo: p.avatar || p.photo,
    bio: p.bio,
    skills: Array.isArray(p.skills) ? p.skills : [],
    credentials: creds
      .filter((c: any) => c && c.verified !== false)
      .map((c: any, i: number): ProfileCredential => ({
        id: String(c._id || c.id || `cred-${i}`),
        title: c.title,
        issuer: c.issuer || "CredChain Accredited Institution",
        year: c.year || (c.createdAt ? new Date(c.createdAt).getFullYear() : undefined),
        issueDate: c.createdAt
          ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : c.issueDate,
        txSignature: c.txSignature || c.txHash,
        verificationId: c.verificationId,
        network: c.network || "Solana Devnet",
        explorerUrl: c.explorerUrl,
      })),
  };
}

export default function PublicProfile() {
  const { candidateId = "demo-candidate" } = useParams();

  const [isVerifier] = useState(() => localStorage.getItem("credchain_role") === "verifier");
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    let alive = true;
    setLoadState("loading");
    setProfile(null);

    getPublicProfile(decodeURIComponent(candidateId).trim())
      .then((p: any) => {
        if (!alive) return;
        if (!p || !p.name) {
          setLoadState("notfound");
          return;
        }
        setProfile(normalizeProfile(p, candidateId));
        setLoadState("ready");
      })
      .catch(() => {
        if (alive) setLoadState("notfound");
      });

    return () => {
      alive = false;
    };
  }, [candidateId]);

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || "";
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  };

  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-bg-base text-txt-primary flex items-center justify-center">
        <div className="text-txt-secondary text-sm font-mono">Loading verified profile…</div>
      </div>
    );
  }

  if (loadState === "notfound" || !profile) {
    return (
      <div className="min-h-screen bg-bg-base text-txt-primary flex flex-col select-none overflow-x-hidden">
        <header className="w-full max-w-[760px] mx-auto pt-6 px-4 sm:px-6 pb-2 flex items-center justify-between">
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <Logo wordmarkSize="md" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/"
              className="text-xs font-mono text-txt-secondary hover:text-txt-primary inline-flex items-center gap-1.5 border border-border-main hover:border-border-strong px-2.5 py-1.5 rounded-md transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </Link>
          </div>
        </header>
        <main className="flex-1 w-full flex justify-center items-center py-4 px-4 sm:px-6">
          <div className="w-full max-w-[560px] border border-dashed border-border-main rounded-lg p-10 text-center space-y-3">
            <SearchX className="w-8 h-8 text-txt-muted mx-auto" strokeWidth={1.5} />
            <h1 className="font-display font-semibold text-lg text-txt-primary">Profile not found</h1>
            <p className="text-xs text-txt-secondary leading-relaxed max-w-sm mx-auto">
              No verified candidate matches identity anchor{" "}
              <span className="font-mono text-role-candidate break-all">{candidateId}</span>. Check the
              CredChain ID and try again.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    window.location.href
  )}&size=168x168`;

  return (
    <div className="min-h-screen bg-bg-base text-txt-primary flex flex-col select-none overflow-x-hidden">
      {/* Top bar */}
      <header className="w-full max-w-[760px] mx-auto pt-6 px-4 sm:px-6 pb-2 flex items-center justify-between">
        <Link to="/" className="hover:opacity-90 transition-opacity">
          <Logo wordmarkSize="md" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="text-xs font-mono text-txt-secondary hover:text-txt-primary inline-flex items-center gap-1.5 border border-border-main hover:border-border-strong px-2.5 py-1.5 rounded-md transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full flex justify-center py-4 px-4 sm:px-6 pb-20">
        <div className="w-full max-w-[760px] flex flex-col gap-4">
          {/* Profile header */}
          <section className="bg-bg-surface border border-border-main rounded-lg p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-md flex items-center justify-center font-display font-bold text-2xl text-role-candidate bg-role-candidate-soft border border-border-main relative overflow-hidden flex-shrink-0">
              <span>{getInitials(profile.name)}</span>
              {profile.photo && (
                <img
                  src={profile.photo}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )}
            </div>

            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-txt-primary leading-tight">
                {profile.name}
              </h1>
              <p className="text-xs font-mono text-txt-muted mt-1">
                Identity anchor: {profile.id}
              </p>
            </div>

            {profile.bio && (
              <p className="text-xs text-txt-secondary leading-relaxed max-w-md">{profile.bio}</p>
            )}

            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 rounded-sm border border-border-main bg-bg-sunken text-role-candidate text-xs font-mono"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <span className="inline-flex items-center gap-1.5 border border-hash-green/30 text-hash-green px-3 py-1 rounded-sm text-[11px] font-mono uppercase font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
              Verified by CredChain
            </span>
          </section>

          {/* QR card */}
          <section className="bg-bg-surface border border-border-main rounded-lg p-6 sm:p-8 flex flex-col items-center gap-4">
            <div className="bg-white p-3 rounded-md border border-border-main">
              <img src={qrUrl} alt="QR code linking to this profile" className="w-[168px] h-[168px] block" />
            </div>
            <div className="flex items-center gap-2 text-txt-secondary text-xs sm:text-sm font-mono">
              <ExternalLink className="w-3.5 h-3.5 text-role-candidate" strokeWidth={1.75} />
              <span>Scan to verify or share this profile</span>
            </div>
          </section>

          {/* Verified credentials */}
          <section className="bg-bg-surface border border-border-main rounded-lg p-6 sm:p-8 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="font-display font-semibold text-base text-txt-primary flex items-center gap-2">
                <Award className="w-4 h-4 text-hash-green" strokeWidth={1.75} />
                Verified credentials ({profile.credentials.length})
              </h2>
              <span className="text-[11px] font-mono text-hash-green border border-hash-green/30 px-2 py-0.5 rounded-sm uppercase">
                On-chain
              </span>
            </div>

            {profile.credentials.length === 0 ? (
              <div className="text-txt-muted text-sm py-6 text-center border border-dashed border-border-main rounded-lg">
                No accepted credentials on this profile yet.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {profile.credentials.map((cred) => (
                  <article
                    key={cred.id}
                    className="bg-bg-sunken border border-border-main border-l-2 border-l-hash-green rounded-md p-5 flex flex-col gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-main bg-bg-surface text-role-candidate text-[11px] font-mono mb-2">
                          <Hash className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[220px]">
                            {cred.verificationId || cred.id}
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-base sm:text-lg text-txt-primary leading-snug">
                          {cred.title}
                        </h3>
                      </div>

                      <span className="inline-flex items-center gap-1.5 border border-hash-green/30 text-hash-green px-2.5 py-1 rounded-sm text-[11px] font-mono uppercase font-semibold whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                        Verified on-chain
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border-main text-xs">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-txt-muted font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-role-candidate shrink-0" strokeWidth={1.75} />
                          Issuing institution
                        </span>
                        <span className="text-txt-primary font-medium break-words leading-relaxed">
                          {cred.issuer}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-txt-muted font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-role-candidate shrink-0" strokeWidth={1.75} />
                          Issuance date
                        </span>
                        <span className="text-txt-primary font-medium">
                          {cred.issueDate || cred.year || "—"}
                        </span>
                      </div>

                      {cred.txSignature && (
                        <div className="flex flex-col gap-1.5 sm:col-span-2 bg-bg-base border border-border-main p-3 rounded-md">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-txt-muted font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3 text-hash-green shrink-0" strokeWidth={2} />
                              Solana transaction hash
                            </span>
                            <span className="text-[10px] font-mono text-hash-green border border-hash-green/30 px-1.5 py-0.5 rounded-sm">
                              {cred.network || "Solana Devnet"}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                            <span className="font-mono text-role-candidate text-xs break-all select-all leading-relaxed">
                              {cred.txSignature}
                            </span>
                            <a
                              href={
                                cred.explorerUrl ||
                                `https://explorer.solana.com/tx/${cred.txSignature}?cluster=devnet`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="self-end sm:self-auto text-xs font-mono font-semibold inline-flex items-center gap-1.5 shrink-0 border border-border-main hover:border-role-candidate text-txt-primary hover:text-role-candidate px-2.5 py-1 rounded-sm transition-colors"
                            >
                              <span>Solana Explorer</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Live-status SVG badge served by the backend; hidden if unavailable. */}
                    <img
                      src={badgeUrl(cred.id)}
                      alt="Live credential status badge"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="h-6 w-auto self-start"
                    />
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Verifier-only save */}
          {isVerifier && (
            <button
              onClick={() => setSaved(true)}
              disabled={saved}
              className={`w-full py-3 px-5 rounded-md font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                saved
                  ? "border border-hash-green/30 text-hash-green cursor-default"
                  : "bg-brand-purple hover:bg-brand-purple-dim text-white"
              }`}
            >
              <Bookmark className="w-4 h-4" strokeWidth={1.75} />
              <span>
                {saved
                  ? "Saved to verified candidates directory"
                  : "Save to verified candidates directory"}
              </span>
            </button>
          )}
        </div>
      </main>

      <footer className="py-8 px-5 text-center text-txt-muted text-xs flex flex-col sm:flex-row items-center justify-center gap-2 border-t border-border-subtle font-mono">
        <div className="flex items-center gap-1.5 text-txt-secondary">
          <ShieldCheck className="w-3.5 h-3.5 text-hash-green" strokeWidth={2} />
          <span>CredChain cryptographic proof engine</span>
        </div>
        <span className="hidden sm:inline text-txt-muted">·</span>
        <span>All academic claims verified immutable on Solana Devnet</span>
      </footer>
    </div>
  );
}
