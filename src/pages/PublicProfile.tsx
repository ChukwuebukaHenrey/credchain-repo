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
} from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

interface ProfileCredential {
  id: string;
  title: string;
  issuer: string;
  year: string | number;
  issueDate?: string;
  txHash?: string;
  verificationId?: string;
  network?: string;
  /** Backend-provided explorer URL (already carries the correct cluster). */
  explorerUrl?: string;
}

interface CandidateProfile {
  id: string;
  name: string;
  photo?: string;
  credentials: ProfileCredential[];
}

export default function PublicProfile() {
  const { candidateId = "demo-candidate" } = useParams();

  const [isVerifier] = useState(() => localStorage.getItem("credchain_role") === "verifier");
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [highlightedCredId, setHighlightedCredId] = useState<string | null>(null);

  useEffect(() => {
    const query = decodeURIComponent(candidateId).trim().toLowerCase();

    const staticProfiles: CandidateProfile[] = [
      {
        id: "demo-candidate",
        name: "Emeka Obi",
        photo:
          localStorage.getItem("credchain_profile_photo") ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
        credentials: [
          {
            id: "cred-1",
            title: "B.Eng Computer Engineering",
            issuer: "Federal University of Technology Owerri (FUTO)",
            year: "2026",
            issueDate: "June 15, 2026",
            txHash: "5f2a9c1d8b3e4a7f2c9b1d8e3a7f2c9b1d8e3a7f",
            verificationId: "CC-2026-FUTO-0892",
            network: "Solana Devnet",
          },
        ],
      },
      {
        id: "cand-102",
        name: "Ada Nwosu",
        photo:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
        credentials: [
          {
            id: "cred-2",
            title: "B.Eng in Electrical Engineering",
            issuer: "Federal University of Technology Owerri",
            year: "2026",
            issueDate: "June 18, 2026",
            txHash: "3d7b2e4af1c98a2d1e5b7c8f9a0d3e2b1c4f5a6b",
            verificationId: "CC-2026-FUTO-0914",
            network: "Solana Devnet",
          },
        ],
      },
      {
        id: "cand-103",
        name: "Alex Chen",
        photo:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
        credentials: [
          {
            id: "cred-3",
            title: "B.Sc in Computer Science",
            issuer: "Stanford University",
            year: "2026",
            issueDate: "May 28, 2026",
            txHash: "8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
            verificationId: "CC-2026-STAN-0412",
            network: "Solana Devnet",
          },
          {
            id: "cred-4",
            title: "M.Sc Artificial Intelligence",
            issuer: "Stanford University",
            year: "2027",
            issueDate: "June 10, 2027",
            txHash: "9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a",
            verificationId: "CC-2027-STAN-0891",
            network: "Solana Devnet",
          },
        ],
      },
    ];

    console.log("=== CredChain Search Tracing Step-by-Step ===");
    console.log("1. Input value being searched (query):", JSON.stringify(query));
    console.log("2. Type of query:", typeof query);
    console.log("3. Dataset of profiles being searched against:", staticProfiles);

    let matchedCredId: string | null = null;
    const matched = staticProfiles.find((p) => {
      const matchId = String(p.id).toLowerCase() === query;
      const matchName = String(p.name).toLowerCase().includes(query);
      
      const matchedC = p.credentials.find((c) => {
        // Ensure string conversions for type safety and exact comparisons
        const idStr = String(c.id).toLowerCase();
        const verIdStr = String(c.verificationId || "").toLowerCase();
        const txHashStr = String(c.txHash || "").toLowerCase();
        
        const matchIdVal = idStr === query;
        const matchVerId = verIdStr === query;
        const matchTxHash = txHashStr === query;
        const matchVerIdClean = verIdStr.replace(/[-\s]/g, "") === query.replace(/[-\s]/g, "");
        const matchTxHashInc = txHashStr.includes(query);
        
        console.log(`- Comparing credential [${c.title}] | ID keys: id=${idStr} vs query=${query} (${matchIdVal}), verificationId=${verIdStr} vs query=${query} (${matchVerId} / ${matchVerIdClean}), txHash=${txHashStr} vs query=${query} (${matchTxHash} / ${matchTxHashInc})`);
        
        return matchIdVal || matchVerId || matchTxHash || matchVerIdClean || matchTxHashInc;
      });

      console.log(`- Candidate Profile comparison: name=${p.name}, matchId=${matchId}, matchName=${matchName}, hasMatchedCred=${!!matchedC}`);
      
      if (matchedC) {
        matchedCredId = matchedC.id;
      }
      return matchId || matchName || !!matchedC;
    });

    console.log("4. Final matched result profile:", matched ? matched.name : "NONE (Generating dynamic profile)");
    if (matchedCredId) {
      console.log("5. Visual highlight matched credential ID:", matchedCredId);
    }
    console.log("=========================================");

    setHighlightedCredId(matchedCredId);

    if (matched) {
      setProfile(matched);
    } else {
      const formattedName = decodeURIComponent(candidateId)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      setProfile({
        id: candidateId,
        name: formattedName || "Candidate Profile",
        credentials: [
          {
            id: "cred-dyn",
            title: "Verified Degree Certification",
            issuer: "CredChain Accredited Institution",
            year: "2026",
            issueDate: "June 20, 2026",
            txHash: "7c3aed9b1d8e3a7f2c9b1d8e3a7f2c9b1d8e3a7f",
            verificationId: `CC-2026-GEN-${candidateId.slice(0, 4).toUpperCase()}`,
            network: "Solana Devnet",
          },
        ],
      });
    }
  }, [candidateId]);

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || "";
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg-base text-txt-primary flex items-center justify-center">
        <div className="text-txt-secondary text-sm font-mono">Loading verified profile…</div>
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

            <div className="flex flex-col gap-3">
              {profile.credentials.map((cred) => {
                const isHighlighted = cred.id === highlightedCredId;
                return (
                  <article
                    key={cred.id}
                    className={`bg-bg-sunken border border-l-2 border-l-hash-green rounded-md p-5 flex flex-col gap-4 transition-all duration-500 ${
                      isHighlighted
                        ? "border-brand-purple ring-2 ring-brand-purple/20 scale-[1.01] shadow-lg shadow-brand-purple/5"
                        : "border-border-main"
                    }`}
                  >
                    {isHighlighted && (
                      <div className="bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-bold px-2.5 py-1 rounded-sm flex items-center justify-between">
                        <span>⚡ SEARCH MATCH: Direct ledger cryptographic hit</span>
                        <span className="uppercase tracking-widest text-[9px] opacity-80">Verified</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-main bg-bg-surface text-role-candidate text-[11px] font-mono mb-2">
                        <Hash className="w-3 h-3 shrink-0" />
                        <span>
                          {cred.verificationId ||
                            `CC-${cred.year}-${cred.id.toUpperCase()}`}
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
                        {cred.issueDate || `June 15, ${cred.year}`}
                      </span>
                    </div>

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
                          {cred.txHash}
                        </span>
                        <a
                          href={cred.explorerUrl || `https://explorer.solana.com/tx/${cred.txHash}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="self-end sm:self-auto text-xs font-mono font-semibold inline-flex items-center gap-1.5 shrink-0 border border-border-main hover:border-role-candidate text-txt-primary hover:text-role-candidate px-2.5 py-1 rounded-sm transition-colors"
                        >
                          <span>Solana Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
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
