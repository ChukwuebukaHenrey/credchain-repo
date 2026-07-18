import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  FileCheck,
  Shield,
  ShieldCheck,
  Check,
  X,
  CheckCircle2,
  XCircle,
  Cpu,
  Link as LinkIcon,
  QrCode,
  SlidersHorizontal,
  LifeBuoy,
  UploadCloud,
  Wand2,
  Plus,
  Send,
  Signal,
  Ban,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import DashboardShell, { NavGroup } from "../components/DashboardShell";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket } from "../services/socket";
import { issueVerifiedCredential, revokeCredential, badgeUrl } from "../services/api";
import { loadAvatar, saveAvatar, validateAvatarFile, readAvatarFile, getAvatarFor } from "../lib/avatars";
import { getBrandLogo } from "../lib/brandLogos";
import BatchSigner from "../components/issuer/BatchSigner";
import GetVerifiedFlow from "../components/issuer/GetVerifiedFlow";
import IssueCredentialTab, { IssuedCredential } from "../components/issuer/IssueCredentialTab";
import RevokeCredentialTab from "../components/issuer/RevokeCredentialTab";
import ResultsAnalytics from "../components/issuer/ResultsAnalytics";

interface RequestItem {
  id: string;
  candidate: string;
  matric: string;
  /** Recipient email — passed to issueVerifiedCredential as recipientEmail. */
  email: string;
  credential: string;
  status: "pending" | "approved" | "denied";
  txHash?: string;
  denyReason?: string;
}

// A credential actually issued this session via POST /api/v1/issuer/credentials.
interface SessionCredential {
  id: string;
  title: string;
  recipient: string;
  trustTier?: string;
  status: string;
  date: string;
  revokedTxSignature?: string;
}

type Tab = "verify" | "requests" | "issue" | "revoke" | "history" | "batch" | "qr" | "settings" | "help";
type FilterTab = "all" | "pending" | "approved" | "denied";

export default function IssuerDashboard() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  // Opens on the Get Verified onboarding funnel (monorepo IssuerPortal parity).
  const [activeTab, setActiveTab] = useState<Tab>("verify");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const [issuerUser, setIssuerUser] = useState<{
    name: string;
    subtitle: string;
    initials: string;
    photo?: string | null;
    photoFit?: "cover" | "contain";
  }>(() => {
    const uploaded = localStorage.getItem("credchain_profile_photo");
    return {
      name: "FUTO Registrar",
      subtitle: "Whitelisted Issuer · futo.ng",
      initials: "FU",
      // Institutional identity: uploaded photo wins, else the FUTO logo.
      photo: uploaded || getBrandLogo("FUTO"),
      photoFit: uploaded ? "cover" : "contain",
    };
  });

  const issuerId = authUser?.id || "demo-issuer";

  // Identity comes from AuthContext (single source of truth), not raw cc_user parsing.
  useEffect(() => {
    localStorage.setItem("credchain_role", "issuer");
    if (!authUser) return;
    const name = authUser.name || authUser.institution || "FUTO Registrar";
    const email = authUser.email || "registrar@futo.ng";
    const domain = email.split("@")[1] || "futo.ng";
    const initials = name.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() || "").join("");
    const uploaded =
      loadAvatar(issuerId) || authUser.photo || localStorage.getItem("credchain_profile_photo");
    const brandLogo = getBrandLogo(authUser.institution || name || domain);
    setIssuerUser({
      name,
      subtitle: `Whitelisted Issuer · ${domain}`,
      initials: initials || "FU",
      photo: uploaded || brandLogo,
      photoFit: uploaded ? "cover" : "contain",
    });
  }, [authUser, issuerId]);

  // Client-side avatar upload (no backend avatar field) — data-URL in
  // localStorage under cc_avatar_<userId>, per-browser only.
  const handleAvatarSelect = async (file: File) => {
    const error = validateAvatarFile(file);
    if (error) {
      showToast(error, "danger");
      return;
    }
    try {
      const dataUrl = await readAvatarFile(file);
      saveAvatar(issuerId, dataUrl);
      setIssuerUser((prev) => ({ ...prev, photo: dataUrl, photoFit: "cover" }));
      showToast("Profile photo updated (stored in this browser).", "success");
    } catch (err: any) {
      showToast(err?.message || "Could not read the selected image.", "danger");
    }
  };

  // Pre-existing hardcoded history — kept ONLY as a fallback when this session
  // hasn't issued anything real yet (labelled as sample data in the UI).
  const [issuedHistory] = useState([
    { id: 1, candidate: "Emeka Obi", credential: "B.Eng Computer Engineering", date: "2026-06-10", txHash: "5f2a9c1d...e8b3" },
    { id: 2, candidate: "Ada Nwosu", credential: "B.Eng Electrical Engineering", date: "2026-06-08", txHash: "3d7b2e4a...f1c9" },
    { id: 3, candidate: "Chidi Okafor", credential: "B.Sc Information Technology", date: "2026-06-05", txHash: "9k8m1n2p...4q5r" },
    { id: 4, candidate: "Yusuf Bello", credential: "B.Eng Mechanical Engineering", date: "2026-05-28", txHash: "6a7b8c9d...0e1f" },
  ]);

  // Credentials really issued this session (from issueVerifiedCredential responses).
  const [sessionCreds, setSessionCreds] = useState<SessionCredential[]>([]);
  // Full credential objects for the Issue → Revoke tab bridge (monorepo
  // IssuerPortal pattern: issued list is shared with the Revocation Registry).
  const [issuedCreds, setIssuedCreds] = useState<IssuedCredential[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [badgePreviewId, setBadgePreviewId] = useState<string | null>(null);

  // Called by IssueCredentialTab (single + auto-issuer) — feed both the
  // revocation registry and the session history table.
  const addIssued = (cred: IssuedCredential) => {
    setIssuedCreds((prev) => [cred, ...prev]);
    setSessionCreds((prev) => [
      {
        id: cred.id,
        title: cred.title,
        recipient: cred.recipientEmail || "—",
        trustTier: cred.trustTier,
        status: cred.status || "pending",
        date: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
  };

  const markRevoked = (id: string, revokedTxSignature?: string) => {
    setIssuedCreds((prev) => prev.map((c) => (c.id === id ? { ...c, status: "revoked" } : c)));
    setSessionCreds((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "revoked", revokedTxSignature } : c))
    );
  };

  // NOTE: there is NO backend route for "incoming credential requests from
  // students" — this queue stays mock/local. Only the issue action is live.
  const [requests, setRequests] = useState<RequestItem[]>([
    { id: "req-101", candidate: "Emeka Obi", matric: "2021/104256", email: "emeka@example.com", credential: "B.Eng Computer Engineering", status: "pending" },
    { id: "req-102", candidate: "Ada Nwosu", matric: "2021/108912", email: "ada.nwosu@example.com", credential: "B.Eng Electrical Engineering", status: "pending" },
    { id: "req-103", candidate: "Chidi Okafor", matric: "2020/994103", email: "chidi.okafor@example.com", credential: "B.Sc Information Technology", status: "approved", txHash: "5xK9f8a21b...991a" },
  ]);

  const [reviewModal, setReviewModal] = useState<RequestItem | null>(null);
  const [confirmModal, setConfirmModal] = useState<RequestItem | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{ id: string; trustTier?: string; status: string } | null>(null);
  const [issueError, setIssueError] = useState<{ message: string; unverified: boolean } | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReasonInput, setDenyReasonInput] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" } | null>(null);

  const showToast = (message: string, variant: "success" | "danger") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 2800);
  };

  const getInitials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login");
  };

  const triggerConfirmDeny = (id: string, reason: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "denied", denyReason: reason || "Denied by issuer" } : r))
    );
    setDenyingId(null);
    setDenyReasonInput("");
    showToast("Request denied.", "danger");
  };

  // Real on-chain issuance: POST /api/v1/issuer/credentials with the request's
  // credential title + candidate email. Requires a VERIFIED issuer — the backend
  // returns 403 (enforceVerifiedIssuer) otherwise, which we surface as a steer
  // to the Get Verified flow rather than a fake success.
  const triggerIssue = async (req: RequestItem) => {
    if (issuing) return;
    setIssuing(true);
    setIssuedResult(null);
    setIssueError(null);
    try {
      const res = await issueVerifiedCredential({ title: req.credential, recipientEmail: req.email });
      const cred = res?.credential;
      if (!cred?.id && !cred?._id) throw new Error(res?.message || "Backend did not return a credential.");
      const credId = String(cred.id || cred._id);
      setIssuedResult({ id: credId, trustTier: cred.trustTier, status: cred.status || "pending" });
      setIssuedCreds((prev) => [{ ...cred, id: credId }, ...prev]);
      setSessionCreds((prev) => [
        {
          id: credId,
          title: cred.title || req.credential,
          recipient: req.candidate,
          trustTier: cred.trustTier,
          status: cred.status || "pending",
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]);
    } catch (e: any) {
      const unverified = e?.status === 403;
      setIssueError({
        message: unverified
          ? "Your issuer account isn't verified yet — complete the verification funnel before issuing on-chain credentials."
          : e?.message || "Issuance failed — please try again.",
        unverified,
      });
    } finally {
      setIssuing(false);
    }
  };

  const finishIssue = (id: string, credentialId: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved", txHash: credentialId } : r)));
    setConfirmModal(null);
    setIssuedResult(null);
    setIssueError(null);
    showToast("Credential issued on-chain.", "success");
  };

  // On-chain revocation of a session-issued credential.
  const handleRevoke = async (credentialId: string) => {
    if (revokingId) return;
    setRevokingId(credentialId);
    try {
      const res = await revokeCredential(credentialId);
      const revoked = res?.credential;
      markRevoked(credentialId, revoked?.revokedTxSignature);
      showToast("Credential revoked on-chain.", "danger");
    } catch (e: any) {
      showToast(e?.message || "Revocation failed — please try again.", "danger");
    } finally {
      setRevokingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const navGroups: NavGroup[] = [
    {
      label: "ONBOARDING",
      items: [
        { id: "verify", label: "Get Verified", icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> },
      ],
    },
    {
      label: "REGISTRAR DESK",
      items: [
        { id: "requests", label: "Overview & Requests", icon: <FileCheck className="w-4 h-4" strokeWidth={1.75} />, badge: pendingCount },
        { id: "issue", label: "Issue New Credential", icon: <Plus className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "revoke", label: "Revoke Credential", icon: <Ban className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "history", label: "Issued History", icon: <Clock className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "batch", label: "Batch Signer", icon: <Wand2 className="w-4 h-4" strokeWidth={1.75} /> },
      ],
    },
    {
      label: "INSTITUTIONAL",
      items: [
        { id: "qr", label: "Institutional QR", icon: <QrCode className="w-4 h-4" strokeWidth={1.75} /> },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { id: "settings", label: "Settings", icon: <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "help", label: "Help & Support", icon: <LifeBuoy className="w-4 h-4" strokeWidth={1.75} /> },
      ],
    },
  ];

  // Issuance over time data for the line chart (last 8 weeks)
  const issuancePoints = [3, 5, 4, 7, 6, 9, 11, 14];

  const filteredRequests = requests.filter(
    (r) =>
      (filterTab === "all" || r.status === filterTab) &&
      (searchQuery === "" ||
        r.candidate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.matric.includes(searchQuery) ||
        r.credential.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredHistory = issuedHistory.filter(
    (item) =>
      searchQuery === "" ||
      item.candidate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.credential.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.txHash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSessionCreds = sessionCreds.filter(
    (c) =>
      searchQuery === "" ||
      c.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardShell
      role="issuer"
      user={issuerUser}
      navGroups={navGroups}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as Tab)}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search matric or records…"
      notificationCount={pendingCount}
      onAvatarSelect={handleAvatarSelect}
      onLogout={handleLogout}
      topbarRightExtra={
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-main text-txt-secondary text-[11px] font-mono">
          <Signal className="w-2.5 h-2.5 text-hash-green animate-pulse-custom" />
          Solana Mainnet
        </span>
      }
    >
      {activeTab === "requests" && (
        <div className="space-y-8">
          {/* Page header */}
          <div className="text-left max-w-3xl">
            <div className="border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              ISSUER CONSOLE
            </div>
            <h1 className="font-display font-bold text-[28px] sm:text-[32px] text-txt-primary tracking-tight leading-tight">
              Incoming credential requests.
            </h1>
            <p className="font-sans text-txt-secondary scale-base mt-2 leading-relaxed">
              Review candidate submissions against registrar records before anchoring proofs on Solana Mainnet.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCell label="TOTAL REQUESTS" value="24" />
            <StatCell label="PENDING REVIEW" value={String(pendingCount)} tone="role" />
            <StatCell label="APPROVED THIS MONTH" value="14" tone="green" />
            <StatCell label="DENIED THIS MONTH" value="4" tone="red" />
          </div>

          {/* Issuance line chart + quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-bg-surface border border-border-main rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                    ISSUANCE OVER TIME
                  </div>
                  <div className="font-display font-semibold text-[18px] text-txt-primary mt-1">
                    Credentials issued · last 8 weeks
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-[22px] text-role-issuer">
                    {issuancePoints.reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="font-mono text-[10px] text-txt-muted uppercase tracking-wider">total</div>
                </div>
              </div>
              <IssuanceLineChart points={issuancePoints} />
            </div>

            <div className="bg-bg-surface border border-border-main rounded-lg p-6 flex flex-col">
              <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted mb-4">
                QUICK ACTIONS
              </div>
              <div className="space-y-2 flex-1">
                <QuickActionButton
                  icon={<Plus className="w-4 h-4" strokeWidth={1.75} />}
                  label="Issue new credential"
                  onClick={() => setActiveTab("issue")}
                />
                <QuickActionButton
                  icon={<Ban className="w-4 h-4" strokeWidth={1.75} />}
                  label="Revoke a credential"
                  onClick={() => setActiveTab("revoke")}
                />
                <QuickActionButton
                  icon={<UploadCloud className="w-4 h-4" strokeWidth={1.75} />}
                  label="Batch CSV upload"
                  onClick={() => setActiveTab("batch")}
                />
                <QuickActionButton
                  icon={<Clock className="w-4 h-4" strokeWidth={1.75} />}
                  label="View issued history"
                  onClick={() => setActiveTab("history")}
                />
                <QuickActionButton
                  icon={<QrCode className="w-4 h-4" strokeWidth={1.75} />}
                  label="Show institutional QR"
                  onClick={() => setActiveTab("qr")}
                />
              </div>
            </div>
          </div>

          {/* Monorepo "Your Results" reputation analytics — placed in Overview */}
          <div className="space-y-4">
            <div className="border-b border-border-subtle pb-4">
              <div className="font-display font-semibold text-[18px] text-txt-primary">
                Your results
              </div>
              <p className="text-xs text-txt-secondary mt-1">
                Real outcomes from your people — ready to share and show off.
              </p>
            </div>
            <ResultsAnalytics />
          </div>

          {/* Filter tabs */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-subtle pb-4">
            <div className="font-display font-semibold text-[18px] text-txt-primary">
              Requests queue
            </div>
            <div className="inline-flex items-center gap-1 bg-bg-surface border border-border-main rounded-md p-1 text-xs">
              {(["all", "pending", "approved", "denied"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1.5 rounded-sm capitalize font-medium cursor-pointer transition-colors ${
                    filterTab === tab
                      ? "bg-role-issuer-soft text-role-issuer"
                      : "text-txt-secondary hover:text-txt-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Requests list */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 px-6 bg-bg-surface border border-dashed border-border-main rounded-lg">
              <div className="w-12 h-12 rounded-md border border-border-main bg-bg-sunken text-txt-muted flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display font-semibold text-base text-txt-primary mb-1">No requests match</h3>
              <p className="text-xs text-txt-secondary">Try a different filter or search term.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-bg-surface border border-border-main hover:border-border-strong rounded-lg p-5 transition-colors flex flex-col gap-3 text-left"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-md bg-role-issuer-soft text-role-issuer border border-border-main font-mono font-bold text-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {getAvatarFor({ name: req.candidate }) ? (
                          <img
                            src={getAvatarFor({ name: req.candidate })!}
                            alt={req.candidate}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(req.candidate)
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-display font-semibold text-[15px] text-txt-primary">
                          {req.candidate}
                        </span>
                        <span className="font-mono text-[11px] text-role-issuer tracking-wider">
                          {req.matric}
                        </span>
                        <span className="text-xs text-txt-secondary">{req.credential}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      {req.status === "approved" && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase font-semibold px-2.5 py-1 rounded-sm border border-hash-green/30 text-hash-green">
                          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.25} /> Issued on-chain
                        </span>
                      )}
                      {req.status === "denied" && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase font-semibold px-2.5 py-1 rounded-sm border border-hash-red/30 text-hash-red">
                          <XCircle className="w-3.5 h-3.5" strokeWidth={2.25} /> Denied
                        </span>
                      )}
                      {req.status === "pending" && (
                        <button
                          onClick={() => setReviewModal(req)}
                          className="px-4 py-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" strokeWidth={2} /> Review & sign
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline deny */}
                  {denyingId === req.id && req.status === "pending" && (
                    <div className="w-full pt-3 mt-1 border-t border-border-subtle flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Optional: reason for denial (e.g. ID mismatch)"
                        value={denyReasonInput}
                        onChange={(e) => setDenyReasonInput(e.target.value)}
                        className="flex-1 min-w-[220px] bg-bg-sunken border border-border-main focus:border-role-issuer rounded-md px-3 py-2 text-xs text-txt-primary outline-none transition-colors"
                        autoFocus
                      />
                      <button
                        onClick={() => triggerConfirmDeny(req.id, denyReasonInput)}
                        className="px-3 py-2 rounded-md border border-hash-red text-hash-red hover:bg-hash-red/10 font-semibold text-xs cursor-pointer transition-colors"
                      >
                        Confirm deny
                      </button>
                      <button
                        onClick={() => {
                          setDenyingId(null);
                          setDenyReasonInput("");
                        }}
                        className="px-2.5 py-2 text-xs text-txt-muted hover:text-txt-primary cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "issue" && (
        <IssueCredentialTab onIssued={addIssued} onGoVerify={() => setActiveTab("verify")} />
      )}

      {activeTab === "revoke" && (
        <RevokeCredentialTab issued={issuedCreds} onRevoked={markRevoked} />
      )}

      {activeTab === "history" && (
        <div className="space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              ON-CHAIN RECORD
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Issued credentials history.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Every credential ever anchored from this issuer wallet.
            </p>
          </div>

          {/* Real credentials issued this session — revocable, with live badge preview */}
          {sessionCreds.length > 0 && (
            <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-border-main flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                  ISSUED THIS SESSION · LIVE
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-sm border border-hash-green/30 text-hash-green">
                  {sessionCreds.length} on-chain
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead className="bg-bg-sunken text-txt-muted uppercase font-mono text-[10px] border-b border-border-main">
                    <tr>
                      <th className="p-4 pl-5">Recipient</th>
                      <th className="p-4">Credential</th>
                      <th className="p-4">Credential ID</th>
                      <th className="p-4">Tier</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filteredSessionCreds.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-txt-muted font-mono text-xs">
                          // No session credentials match your search
                        </td>
                      </tr>
                    ) : (
                      filteredSessionCreds.map((cred) => (
                        <tr key={cred.id} className="hover:bg-bg-elevated/40 transition-colors">
                          <td className="p-4 pl-5 font-semibold text-txt-primary">{cred.recipient}</td>
                          <td className="p-4 text-txt-secondary">{cred.title}</td>
                          <td className="p-4 font-mono text-role-issuer break-all max-w-[160px]">{cred.id}</td>
                          <td className="p-4 font-mono text-txt-muted uppercase">{cred.trustTier || "—"}</td>
                          <td className="p-4">
                            {cred.status === "revoked" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border border-hash-red/30 text-hash-red">
                                <Ban className="w-3 h-3" strokeWidth={2.5} /> REVOKED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border border-hash-green/30 text-hash-green">
                                <Check className="w-3 h-3" strokeWidth={2.5} /> {cred.status}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right pr-5">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => setBadgePreviewId(badgePreviewId === cred.id ? null : cred.id)}
                                className="px-2.5 py-1.5 rounded-md border border-border-main hover:border-role-issuer text-txt-secondary hover:text-role-issuer font-semibold text-[11px] cursor-pointer transition-colors"
                              >
                                {badgePreviewId === cred.id ? "Hide badge" : "Badge"}
                              </button>
                              {cred.status !== "revoked" && (
                                <button
                                  onClick={() => handleRevoke(cred.id)}
                                  disabled={revokingId !== null}
                                  className="px-2.5 py-1.5 rounded-md border border-hash-red/40 text-hash-red hover:bg-hash-red/10 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  {revokingId === cred.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} /> Revoking…
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="w-3 h-3" strokeWidth={2} /> Revoke
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Live public SVG badge preview for the selected credential */}
              {badgePreviewId && (
                <div className="px-5 py-4 border-t border-border-subtle bg-bg-sunken flex items-center gap-4 flex-wrap">
                  <img
                    src={badgeUrl(badgePreviewId)}
                    alt="Live credential status badge"
                    className="h-6"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <code className="font-mono text-[11px] text-txt-muted break-all select-all">{badgeUrl(badgePreviewId)}</code>
                </div>
              )}
            </div>
          )}

          {/* Pre-existing rows — fallback sample data shown only when nothing has
              been issued this session (there is no backend list route yet). */}
          {sessionCreds.length === 0 && (
            <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-border-main font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                SAMPLE DATA · issue a credential to see live records here
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-bg-sunken text-txt-muted uppercase font-mono text-[10px] border-b border-border-main">
                    <tr>
                      <th className="p-4 pl-5">Candidate</th>
                      <th className="p-4">Credential</th>
                      <th className="p-4">Issue Date</th>
                      <th className="p-4">Solana TX</th>
                      <th className="p-4 text-right pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-txt-muted font-mono text-xs">
                          // No matching history records found
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-bg-elevated/40 transition-colors">
                          <td className="p-4 pl-5 font-semibold text-txt-primary">{item.candidate}</td>
                          <td className="p-4 text-txt-secondary">{item.credential}</td>
                          <td className="p-4 font-mono text-txt-muted">{item.date}</td>
                          <td className="p-4 font-mono text-role-issuer break-all">{item.txHash}</td>
                          <td className="p-4 text-right pr-5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border border-hash-green/30 text-hash-green">
                              <Check className="w-3 h-3" strokeWidth={2.5} /> VERIFIED
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "batch" && (
        <div className="max-w-3xl space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              BATCH SIGNING
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Sign multiple credentials via CSV.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Upload an institutional roster. The registrar desk will batch-merkle sign and submit transaction bundles to Solana Mainnet.
            </p>
          </div>

          <BatchSigner onNotify={showToast} />
        </div>
      )}

      {activeTab === "verify" && (
        <div className="max-w-3xl space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              ISSUER VERIFICATION
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Get verified to issue on-chain.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              CredChain's four-layer trust funnel: institution registration, DNS domain proof, KYC, and a final registry cross-match by our admin desk.
            </p>
          </div>

          <GetVerifiedFlow onNotify={showToast} />
        </div>
      )}

      {activeTab === "qr" && (
        <div className="max-w-lg mx-auto space-y-6 text-center">
          <div>
            <div className="inline-block border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3 text-left">
              INSTITUTIONAL QR
            </div>
            <h1 className="font-display font-bold text-[24px] text-txt-primary tracking-tight">
              Verification QR
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Display in the registrar office so employers can verify FUTO degrees.
            </p>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-lg p-8 inline-block">
            <div className="p-6 bg-white rounded-md inline-block">
              <QrCode className="w-44 h-44 text-black mx-auto" strokeWidth={1.5} />
            </div>
          </div>

          <div className="font-mono text-xs text-role-issuer bg-bg-surface border border-border-main p-3 rounded-md select-all break-all">
            https://solana.credchain.io/issuer/did:sol:futo_mainnet_registrar_99a
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="max-w-2xl space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              INSTITUTION
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Institution settings.
            </h1>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-border-subtle">
              <div className="w-14 h-14 rounded-md bg-bg-elevated border border-border-main flex items-center justify-center overflow-hidden flex-shrink-0">
                {getBrandLogo("FUTO") ? (
                  <img
                    src={getBrandLogo("FUTO")!}
                    alt="Federal University of Technology Owerri logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <span className="font-mono font-bold text-role-issuer">FU</span>
                )}
              </div>
              <div>
                <div className="font-display font-semibold text-sm text-txt-primary">
                  Federal University of Technology Owerri
                </div>
                <div className="text-[11px] font-mono text-txt-muted">Whitelisted Issuer · futo.ng</div>
              </div>
            </div>
            <ReadOnlyField label="Institution Name" value="Federal University of Technology Owerri (FUTO)" />
            <ReadOnlyField label="Registrar Solana Authority" value="7xKp9W...3mEq1Z" mono accent="role-issuer" />
            <p className="text-[11px] text-txt-muted font-mono pt-2 border-t border-border-subtle">
              // Accreditation verified by National Universities Commission (NUC)
            </p>
          </div>
        </div>
      )}

      {activeTab === "help" && (
        <div className="max-w-2xl space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-issuer pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              SUPPORT
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Issuer support hotline.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              For key rotation, gas refill requests, or adding department sub-signers, contact the CredChain Protocol Ops desk.
            </p>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-lg p-6">
            <div className="border-l-2 border-role-issuer pl-4 py-1">
              <div className="font-mono text-[11px] text-txt-muted uppercase tracking-wider mb-1">CONTACT</div>
              <div className="font-mono text-sm text-txt-primary">ops@credchain.io</div>
              <div className="text-xs text-txt-secondary mt-1">Dedicated Solana priority fee queue active</div>
            </div>
          </div>
        </div>
      )}

      {/* Review & Match Modal */}
      {reviewModal && (
        <Modal onClose={() => setReviewModal(null)}>
          <div>
            <h2 className="font-display font-bold text-[20px] text-txt-primary">Review & match</h2>
            <p className="text-xs text-txt-secondary mt-1">
              Confirm the candidate's details against your records before issuing on-chain.
            </p>
          </div>

          {/* Match banner */}
          <div className="border border-hash-green/30 bg-hash-green/5 rounded-md p-4 flex items-center gap-3 text-hash-green">
            <Shield className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} />
            <div>
              <div className="font-display font-bold text-base">100% match</div>
              <div className="text-xs">AI document check found no discrepancies</div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="border border-border-main rounded-md overflow-hidden text-xs">
            <div className="bg-bg-sunken px-4 py-2.5 grid grid-cols-12 gap-2 text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-wider">
              <div className="col-span-4">Field</div>
              <div className="col-span-4">Candidate submitted</div>
              <div className="col-span-3">Your record</div>
              <div className="col-span-1 text-center" />
            </div>
            {[
              ["Name", reviewModal.candidate, reviewModal.candidate],
              ["Matric / ID", reviewModal.matric, reviewModal.matric],
              ["Course", reviewModal.credential, reviewModal.credential],
              ["Enrollment status", "—", "Graduated"],
              ["Graduation year", "—", "2026"],
            ].map(([field, submitted, record], i) => (
              <div
                key={field}
                className={`px-4 py-3 border-t border-border-subtle grid grid-cols-12 gap-2 items-center ${
                  i % 2 === 0 ? "bg-bg-surface" : ""
                }`}
              >
                <div className="col-span-4 font-semibold text-txt-secondary">{field}</div>
                <div className="col-span-4 text-txt-primary font-mono break-all">{submitted}</div>
                <div className="col-span-3 text-txt-primary font-mono break-all">{record}</div>
                <div className="col-span-1 flex justify-center">
                  <Check className="w-4 h-4 text-hash-green" strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              onClick={() => {
                const target = reviewModal;
                setReviewModal(null);
                setDenyingId(target.id);
              }}
              className="px-5 py-2 rounded-md border border-border-main hover:border-hash-red hover:text-hash-red text-txt-secondary font-semibold text-xs transition-colors cursor-pointer"
            >
              Deny
            </button>
            <button
              onClick={() => {
                const target = reviewModal;
                setReviewModal(null);
                setConfirmModal(target);
              }}
              className="px-5 py-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={2} /> Approve & anchor on Solana
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Issue Modal */}
      {confirmModal && (
        <Modal onClose={() => { setConfirmModal(null); setIssueError(null); }} narrow>
          {issuing ? (
            <div className="py-6 space-y-4 text-center">
              <Cpu className="w-10 h-10 text-role-issuer mx-auto animate-spin" strokeWidth={1.5} />
              <h2 className="font-display font-bold text-[18px] text-txt-primary">Writing to Solana…</h2>
              <p className="text-xs text-txt-secondary leading-relaxed max-w-sm mx-auto">
                Minting the credential on-chain. This can take a few seconds.
              </p>
            </div>
          ) : issuedResult ? (
            <div className="py-2 space-y-4 text-center">
              <div className="w-12 h-12 rounded-md bg-hash-green/10 border border-hash-green/30 text-hash-green flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" strokeWidth={2} />
              </div>
              <h2 className="font-display font-bold text-[18px] text-txt-primary">Credential issued</h2>
              <p className="text-xs text-txt-secondary">
                <strong className="text-txt-primary">{confirmModal.credential}</strong> is now permanently recorded on-chain.
              </p>
              <div className="bg-bg-sunken border border-border-main rounded-md p-4 space-y-2 text-left font-mono">
                <div className="text-[10px] text-txt-muted uppercase font-semibold tracking-wider">
                  CREDENTIAL
                </div>
                <div className="text-xs text-role-issuer break-all">{issuedResult.id}</div>
                {issuedResult.trustTier && (
                  <div className="text-[10px] text-txt-muted uppercase tracking-wider">
                    TIER · <span className="text-txt-primary">{issuedResult.trustTier}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-hash-green/30 text-hash-green text-[10px] font-semibold uppercase mt-1">
                  {issuedResult.status}
                </div>
              </div>
              <button
                onClick={() => finishIssue(confirmModal.id, issuedResult.id)}
                className="w-full py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="py-2 space-y-4 text-center">
              <div className="w-12 h-12 rounded-md bg-role-issuer-soft border border-border-main text-role-issuer flex items-center justify-center mx-auto">
                <LinkIcon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h2 className="font-display font-bold text-[18px] text-txt-primary">Anchor on Solana?</h2>
              <p className="text-xs text-txt-secondary leading-relaxed max-w-sm mx-auto">
                This writes a permanent record to the Solana blockchain. It mints{" "}
                <strong className="text-txt-primary">{confirmModal.credential}</strong> for{" "}
                <strong className="text-txt-primary">{confirmModal.candidate}</strong> and cannot be undone.
              </p>
              {/* Inline issuance error — 403 (unverified issuer) steers to the funnel */}
              {issueError && (
                <div className="border border-hash-red/30 bg-hash-red/5 rounded-md p-3.5 text-left space-y-2.5">
                  <div className="flex items-start gap-2.5 text-hash-red">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                    <p className="text-xs leading-relaxed">{issueError.message}</p>
                  </div>
                  {issueError.unverified && (
                    <button
                      onClick={() => {
                        setConfirmModal(null);
                        setIssueError(null);
                        setActiveTab("verify");
                      }}
                      className="w-full py-2 rounded-md border border-role-issuer text-role-issuer hover:bg-role-issuer-soft font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} /> Go to Get Verified
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    setConfirmModal(null);
                    setIssueError(null);
                  }}
                  className="flex-1 py-2.5 rounded-md border border-border-main hover:border-border-strong text-txt-secondary font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => triggerIssue(confirmModal)}
                  disabled={issuing}
                  className="flex-1 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2} /> {issueError ? "Retry & anchor" : "Confirm & anchor"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-md bg-bg-surface border border-border-main border-l-2 text-xs font-semibold text-txt-primary ${
            toast.variant === "success" ? "border-l-hash-green" : "border-l-hash-red"
          }`}
        >
          {toast.message}
        </div>
      )}
    </DashboardShell>
  );
}

function StatCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "role" | "green" | "red";
}) {
  const valueClass =
    tone === "role"
      ? "text-role-issuer"
      : tone === "green"
      ? "text-hash-green"
      : tone === "red"
      ? "text-hash-red"
      : "text-txt-primary";
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">{label}</div>
      <div className={`font-display font-bold text-[28px] leading-none mt-3 ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-border-main hover:border-role-issuer hover:bg-role-issuer-soft text-txt-secondary hover:text-txt-primary text-sm transition-colors text-left cursor-pointer"
    >
      <span className="text-role-issuer">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function IssuanceLineChart({ points }: { points: number[] }) {
  const width = 600;
  const height = 140;
  const padding = { top: 12, right: 12, bottom: 24, left: 28 };
  const max = Math.max(...points);
  const min = 0;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xStep = innerW / Math.max(1, points.length - 1);
  const yScale = (v: number) => innerH - ((v - min) / (max - min || 1)) * innerH;

  const coords = points.map((p, i) => [padding.left + i * xStep, padding.top + yScale(p)] as const);
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");

  // Area fill path
  const areaPath = `${path} L ${coords[coords.length - 1][0].toFixed(1)} ${(padding.top + innerH).toFixed(1)} L ${coords[0][0].toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

  // X-axis labels: W-7..W-0 (8 points)
  const labels = points.map((_, i) => `W-${points.length - 1 - i}`);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padding.top + innerH - innerH * frac;
        return (
          <line
            key={frac}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="var(--role-issuer-soft)" />

      {/* Line */}
      <path d={path} fill="none" stroke="var(--role-issuer)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {coords.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3" fill="var(--bg-surface)" stroke="var(--role-issuer)" strokeWidth="2" />
        </g>
      ))}

      {/* X-axis labels */}
      {coords.map(([x], i) => (
        <text
          key={i}
          x={x}
          y={height - 6}
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="var(--txt-muted)"
        >
          {labels[i]}
        </text>
      ))}

      {/* Y-axis max label */}
      <text
        x={padding.left - 6}
        y={padding.top + 4}
        textAnchor="end"
        fontSize="9"
        fontFamily="var(--font-mono)"
        fill="var(--txt-muted)"
      >
        {max}
      </text>
      <text
        x={padding.left - 6}
        y={padding.top + innerH}
        textAnchor="end"
        fontSize="9"
        fontFamily="var(--font-mono)"
        fill="var(--txt-muted)"
      >
        0
      </text>
    </svg>
  );
}

function Modal({
  children,
  onClose,
  narrow,
}: {
  children: React.ReactNode;
  onClose: () => void;
  narrow?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`w-full bg-bg-surface border border-border-main rounded-lg p-6 sm:p-7 text-left space-y-5 relative ${
          narrow ? "max-w-[440px]" : "max-w-[580px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 rounded-md text-txt-muted hover:text-txt-primary hover:border-border-strong border border-transparent flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
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
  accent?: "role-issuer";
}) {
  const valueClass = mono
    ? `font-mono ${accent === "role-issuer" ? "text-role-issuer" : "text-txt-primary"}`
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
