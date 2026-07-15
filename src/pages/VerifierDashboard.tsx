import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Search,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  User,
  SlidersHorizontal,
  LifeBuoy,
  Key,
  FileText,
  Check,
  Copy,
  Signal,
} from "lucide-react";
import DashboardShell, { NavGroup } from "../components/DashboardShell";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket } from "../services/socket";

interface SavedCandidate {
  id: string;
  name: string;
  field: string;
  verifiedCount: number;
}

type Tab = "verify" | "shortlist" | "logs" | "api" | "settings" | "help";

export default function VerifierDashboard() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("verify");
  const [searchQuery, setSearchQuery] = useState("");
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  const [verifierUser, setVerifierUser] = useState<{
    name: string;
    subtitle: string;
    initials: string;
    photo?: string | null;
  }>({
    name: "Tunde Bello",
    subtitle: "Paystack · Verifier",
    initials: "TB",
    photo: localStorage.getItem("credchain_profile_photo")
  });

  useEffect(() => {
    localStorage.setItem("credchain_role", "verifier");
    const storedUserStr = localStorage.getItem("cc_user");
    if (storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser.role === "verifier") {
          const name = storedUser.fullName || storedUser.name || "Tunde Bello";
          const comp = storedUser.companyName || storedUser.company || "Paystack";
          const initials = name.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() || "").join("");
          setVerifierUser({
            name,
            subtitle: `${comp} · Verifier`,
            initials: initials || "TB",
            photo: storedUser.photo || localStorage.getItem("credchain_profile_photo")
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const [savedCandidates] = useState<SavedCandidate[]>([
    { id: "demo-candidate", name: "Emeka Obi", field: "Computer Engineering", verifiedCount: 1 },
    { id: "cand-102", name: "Ada Nwosu", field: "Electrical Engineering", verifiedCount: 1 },
    { id: "cand-103", name: "Alex Chen", field: "Computer Science", verifiedCount: 2 },
  ]);

  const [verificationLogs] = useState([
    { id: "log-1", candidate: "Emeka Obi", action: "Merkle Root Verification", status: "valid", time: "10 mins ago", tx: "5xLp...9zQm" },
    { id: "log-2", candidate: "Ada Nwosu", action: "DID Signature Check", status: "valid", time: "2 hours ago", tx: "8vKq...2yRn" },
    { id: "log-3", candidate: "Alex Chen", action: "Solana Account Proof", status: "valid", time: "Yesterday", tx: "3bNz...7wPt" },
  ]);

  const filteredLogs = verificationLogs.filter(
    (log) =>
      searchQuery === "" ||
      log.candidate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tx.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim() || "demo-candidate";
    navigate(`/verify/${encodeURIComponent(cleanQuery)}`);
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || "";
    return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText("sk_live_solana_verif_99x81726aa109bb4");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const navGroups: NavGroup[] = [
    {
      label: "VERIFICATION DESK",
      items: [
        { id: "verify", label: "Search & Verify", icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "shortlist", label: "Saved Shortlist", icon: <Bookmark className="w-4 h-4" strokeWidth={1.75} />, badge: savedCandidates.length },
        { id: "logs", label: "Audit & Logs", icon: <FileText className="w-4 h-4" strokeWidth={1.75} /> },
      ],
    },
    {
      label: "PROTOCOL API",
      items: [{ id: "api", label: "API Keys & Webhooks", icon: <Key className="w-4 h-4" strokeWidth={1.75} /> }],
    },
    {
      label: "ACCOUNT",
      items: [
        { id: "settings", label: "Verifier Settings", icon: <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "help", label: "Help & Support", icon: <LifeBuoy className="w-4 h-4" strokeWidth={1.75} /> },
      ],
    },
  ];

  return (
    <DashboardShell
      role="verifier"
      user={verifierUser}
      navGroups={navGroups}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as Tab)}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search candidate profiles…"
      notificationCount={1}
      onLogout={handleLogout}
      topbarRightExtra={
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-main text-txt-secondary text-[11px] font-mono">
          <Signal className="w-2.5 h-2.5 text-hash-green animate-pulse-custom" />
          Solana Mainnet
        </span>
      }
    >
      {activeTab === "verify" && (
        <div className="space-y-8">
          {/* Page header */}
          <div className="text-left max-w-3xl">
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-4">
              EMPLOYER VERIFICATION CONSOLE
            </div>
            <h1 className="font-display font-bold text-[28px] sm:text-[34px] text-txt-primary tracking-tight leading-tight">
              Instant on-chain degree verification.
            </h1>
            <p className="font-sans text-txt-secondary scale-base mt-2 leading-relaxed">
              Enter a CredChain credential ID, candidate DID, or Solana transaction hash. The ledger returns a cryptographic match in under a second.
            </p>
          </div>

          {/* DOMINANT credential ID search */}
          <form
            onSubmit={handleSearch}
            className="bg-bg-surface border border-border-main rounded-lg p-2 focus-within:border-role-verifier transition-colors"
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="w-5 h-5 text-role-verifier flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Candidate ID, DID, or Solana tx hash"
                  className="flex-1 bg-transparent border-none py-4 text-base font-mono text-txt-primary focus:outline-none placeholder:text-txt-muted"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify on-chain</span>
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-txt-muted">
            <span className="uppercase tracking-wider">// Quick demo query:</span>
            <button
              type="button"
              onClick={() => setQuery("demo-candidate")}
              className="font-mono text-[11px] text-role-verifier border border-border-main hover:border-role-verifier rounded-md px-2.5 py-1 hover:bg-role-verifier-soft transition-colors cursor-pointer"
            >
              demo-candidate
            </button>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCell label="VERIFICATIONS RUN" value="42" />
            <StatCell label="VERIFIED PROFILES" value="38" tone="role" />
            <StatCell label="SAVED SHORTLIST" value={String(savedCandidates.length)} />
            <StatCell label="FRAUD FLAGS" value="0" tone="green" />
          </div>

          {/* Recent verifications — preview of the logs */}
          <RecentVerificationsTable logs={filteredLogs.slice(0, 3)} />
        </div>
      )}

      {activeTab === "shortlist" && (
        <div className="space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              SAVED CANDIDATES
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Verified talent pool.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Candidates whose credentials you've cryptographically verified.
            </p>
          </div>

          {savedCandidates.filter((c) => filterMatch(c, searchQuery)).length === 0 ? (
            <EmptyState
              title="No candidates match your search"
              body="Verify candidates on the Search & Verify tab, then save them to build your talent pool."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCandidates
                .filter((c) => filterMatch(c, searchQuery))
                .map((cand) => (
                  <div
                    key={cand.id}
                    className="bg-bg-surface border border-border-main hover:border-border-strong rounded-lg p-5 flex flex-col gap-5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-role-verifier-soft text-role-verifier border border-border-main font-mono font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {getInitials(cand.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-semibold text-[15px] text-txt-primary truncate">
                          {cand.name}
                        </div>
                        <div className="text-xs text-txt-secondary truncate mt-0.5">{cand.field}</div>
                      </div>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-main text-hash-green text-[11px] font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.25} />
                        {cand.verifiedCount} on-chain proof{cand.verifiedCount > 1 ? "s" : ""}
                      </span>
                    </div>

                    <Link
                      to={`/verify/${cand.id}`}
                      className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-border-main hover:border-role-verifier text-txt-primary text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on-chain dossier
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              VERIFICATION AUDIT
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Verification audit log.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Cryptographic receipts for every check made against the Solana ledger.
            </p>
          </div>
          <RecentVerificationsTable logs={filteredLogs} />
        </div>
      )}

      {activeTab === "api" && (
        <div className="max-w-3xl space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              PROTOCOL ACCESS
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              API keys & webhooks.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Integrate CredChain verification directly into Greenhouse, Lever, or Workday via REST or the TypeScript SDK.
            </p>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">
                Live secret verifier key
              </label>
              <div className="flex items-center gap-2 bg-bg-sunken border border-border-main rounded-md p-3 font-mono text-[13px] text-role-verifier">
                <span className="flex-1 truncate select-all">sk_live_solana_verif_99x81726aa109bb4</span>
                <button
                  type="button"
                  onClick={copyApiKey}
                  className="px-2.5 py-1 rounded-sm border border-border-main hover:border-role-verifier text-txt-secondary hover:text-txt-primary flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-hash-green" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="bg-bg-sunken border border-border-main rounded-md p-4 font-mono text-[12px] text-txt-secondary space-y-1">
              <div className="text-txt-muted">{"// Install the official Solana verification package"}</div>
              <div className="text-txt-primary select-all">npm install @credchain/solana-verify-sdk</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="max-w-2xl space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              ORGANIZATION
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Verifier org profile.
            </h1>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-5">
            <ReadOnlyField label="Organization Name" value="Paystack Talent Acquisition" />
            <ReadOnlyField
              label="Verifier Authority Wallet"
              value="9zQm...2yRn"
              mono
              accent="role-verifier"
            />
            <p className="text-[11px] text-txt-muted font-mono pt-2 border-t border-border-subtle">
              // Enterprise SLA · unlimited daily on-chain RPC queries
            </p>
          </div>
        </div>
      )}

      {activeTab === "help" && (
        <div className="max-w-2xl space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              SUPPORT
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Verifier hotline.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Need help with Merkle proofs or HRIS webhook wiring? Our protocol engineers respond within minutes.
            </p>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-lg p-6">
            <div className="border-l-2 border-role-verifier pl-4 py-1">
              <div className="font-mono text-[11px] text-txt-muted uppercase tracking-wider mb-1">CONTACT</div>
              <div className="font-mono text-sm text-txt-primary">support@credchain.io</div>
              <div className="text-xs text-txt-secondary mt-1">24/7 priority protocol response</div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function filterMatch(c: SavedCandidate, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return c.name.toLowerCase().includes(needle) || c.field.toLowerCase().includes(needle);
}

function StatCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "role" | "green";
}) {
  const valueClass =
    tone === "role" ? "text-role-verifier" : tone === "green" ? "text-hash-green" : "text-txt-primary";
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">{label}</div>
      <div className={`font-display font-bold text-[28px] leading-none mt-3 ${valueClass}`}>{value}</div>
    </div>
  );
}

function RecentVerificationsTable({
  logs,
}: {
  logs: Array<{ id: string; candidate: string; action: string; status: string; time: string; tx: string }>;
}) {
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-bg-sunken text-txt-muted uppercase font-mono text-[10px] border-b border-border-main">
            <tr>
              <th className="p-4 pl-5">Candidate</th>
              <th className="p-4">Verification Type</th>
              <th className="p-4">Time</th>
              <th className="p-4">Solana TX</th>
              <th className="p-4 text-right pr-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-bg-elevated/40 transition-colors">
                <td className="p-4 pl-5 font-semibold text-txt-primary">{log.candidate}</td>
                <td className="p-4 text-txt-secondary">{log.action}</td>
                <td className="p-4 font-mono text-txt-muted">{log.time}</td>
                <td className="p-4 font-mono text-role-verifier break-all">{log.tx}</td>
                <td className="p-4 text-right pr-5">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border ${
                      log.status === "valid"
                        ? "text-hash-green border-hash-green/30"
                        : "text-hash-red border-hash-red/30"
                    }`}
                  >
                    {log.status === "valid" ? (
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    ) : null}
                    {log.status === "valid" ? "VALID" : "INVALID"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-16 px-6 bg-bg-surface border border-dashed border-border-main rounded-lg">
      <div className="w-12 h-12 rounded-md border border-border-main bg-bg-sunken text-txt-muted flex items-center justify-center mx-auto mb-4">
        <User className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <h3 className="font-display font-semibold text-base text-txt-primary mb-1">{title}</h3>
      <p className="text-xs text-txt-secondary max-w-sm mx-auto">{body}</p>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  mono = false,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: "role-verifier";
}) {
  const valueClass = mono
    ? `font-mono ${accent === "role-verifier" ? "text-role-verifier" : "text-txt-primary"}`
    : "font-sans text-txt-primary";
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">{label}</label>
      <input
        type="text"
        readOnly
        value={value}
        className={`w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2.5 text-sm ${valueClass}`}
      />
    </div>
  );
}
