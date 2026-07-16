import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Send,
  Sparkles,
  UserCircle,
  QrCode,
  SlidersHorizontal,
  LifeBuoy,
  Copy,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Link as LinkIcon,
  Paperclip,
  UploadCloud,
  Wand2,
  Download,
  Share2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Building2,
  Trophy,
  FileText,
  ScrollText,
  FileX,
  ShieldCheck,
  Camera,
  ArrowRight,
  Wifi,
  Signal,
} from "lucide-react";
import DashboardShell, { NavGroup } from "../components/DashboardShell";
import EarnTab from "../components/candidate/EarnTab";
import TrustTab from "../components/candidate/TrustTab";
import {
  getCandidate,
  getNotifications,
  getQRCode,
  buildResume,
  getWhitelistedInstitutions,
  getStudentPortfolio,
  acceptCredential,
  rejectCredential,
  disputeCredential,
} from "../services/api";
import { getTheme, toggleTheme, Theme } from "../services/theme";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket } from "../services/socket";

type TabType =
  | "dashboard"
  | "credentials"
  | "request"
  | "resume"
  | "earn"
  | "trust"
  | "portfolio"
  | "qr"
  | "settings"
  | "help";

interface Credential {
  id: string;
  title: string;
  issuer: string;
  status: "verified" | "pending" | "rejected" | "revoked";
  hash: string;
  date: string;
  reason?: string;
  revokedReason?: string;
  dispute?: { status: string; reason: string } | null;
  /** Solana tx signature once the credential is anchored on-chain. */
  txSignature?: string;
  explorerUrl?: string;
  trustTier?: string;
}

// Backend credential statuses → UI vocab. Backend: pending | accepted | rejected | revoked.
const BACKEND_CRED_STATUS: Record<string, Credential["status"]> = {
  accepted: "verified",
  verified: "verified",
  pending: "pending",
  rejected: "rejected",
  revoked: "revoked",
};

/** Normalize a backend credential doc (Mongo `_id`, `txSignature`, `createdAt`) into the UI card shape. */
function toUiCredential(c: any): Credential {
  const status = BACKEND_CRED_STATUS[String(c.status || "").toLowerCase()] || "pending";
  const sig: string | undefined = c.txSignature || c.txHash || undefined;
  return {
    id: String(c._id || c.id),
    title: c.title || "Untitled credential",
    issuer: c.issuer || "Unknown issuer",
    status,
    hash: sig || c.sha256Hash || (status === "pending" ? "Awaiting your acceptance" : "Not anchored"),
    date: c.createdAt
      ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : c.date || "—",
    reason: c.reason,
    revokedReason: c.revokedReason || (status === "revoked" ? c.revocation?.reason : undefined),
    dispute: c.dispute || null,
    txSignature: sig,
    explorerUrl: c.explorerUrl || (sig ? `https://explorer.solana.com/tx/${sig}?cluster=devnet` : undefined),
    trustTier: c.trustTier,
  };
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const [candidate, setCandidate] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [credsLoading, setCredsLoading] = useState(true);
  const [credActionId, setCredActionId] = useState<string | null>(null);
  const [credActionMsg, setCredActionMsg] = useState<string | null>(null);
  const [disputeCred, setDisputeCred] = useState<Credential | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [profileBannerOpen, setProfileBannerOpen] = useState(true);
  const [walletCopied, setWalletCopied] = useState(false);
  const [credFilter, setCredFilter] = useState<"all" | "verified" | "pending" | "rejected" | "revoked">("all");

  // Request credential
  const [reqInst, setReqInst] = useState("Federal University of Technology Owerri (FUTO)");
  const [reqType, setReqType] = useState("Transcript / Degree");
  const [reqMatric, setReqMatric] = useState("");
  const [reqProgram, setReqProgram] = useState("");
  const [reqGradYear, setReqGradYear] = useState("");
  const [reqSuccess, setReqSuccess] = useState(false);
  const [whitelistedInstitutions, setWhitelistedInstitutions] = useState<string[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState("");

  // AI Resume
  const [resumePrompt, setResumePrompt] = useState(
    "Emphasise frontend work and Solana protocols, applying for a Web3 engineering role."
  );
  const [generatingResume, setGeneratingResume] = useState(false);
  const [generatedResumeHtml, setGeneratedResumeHtml] = useState<string | null>(null);
  const [refFiles, setRefFiles] = useState<{ id: number; name: string; status: "processing" | "ready" }[]>([
    { id: 1, name: "Academic_Transcript_Unofficial.pdf", status: "ready" },
    { id: 2, name: "Solana_Bootcamp_Certificate.jpg", status: "ready" },
  ]);

  // Portfolio
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() =>
    localStorage.getItem("credchain_profile_photo")
  );
  const [viewAsPublic, setViewAsPublic] = useState(false);
  const [portfolioName, setPortfolioName] = useState("Emeka Obi");
  const [portfolioHeadline, setPortfolioHeadline] = useState(
    "Frontend-leaning Software Engineering student · FUTO"
  );
  const [portfolioBio, setPortfolioBio] = useState(
    "Frontend-leaning software engineering student passionate about building clean, verifiable web apps. Currently exploring blockchain credentialing."
  );
  const [portfolioSkills, setPortfolioSkills] = useState([
    "JavaScript",
    "React",
    "HTML/CSS",
    "Solidity",
    "TypeScript",
  ]);
  const [projects, setProjects] = useState([
    {
      id: 1,
      title: "CredChain Frontend",
      desc: "Static marketing + dashboard for a blockchain credential product.",
      tags: ["React", "Tailwind CSS"],
      published: true,
    },
    { id: 2, title: "Wallet Explorer (draft)", desc: "", tags: ["JavaScript"], published: false },
  ]);

  // QR
  const [qrScope, setQrScope] = useState<"portfolio" | "projects" | "credentials">("portfolio");
  const [qrCopied, setQrCopied] = useState(false);

  // Settings
  const [openToOpps, setOpenToOpps] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [themeSetting, setThemeSetting] = useState<Theme>(() => getTheme());
  const [advSettingsOpen, setAdvSettingsOpen] = useState(false);

  // Help
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Account & Profile");
  const [ticketMsg, setTicketMsg] = useState("");
  const [ticketConfirm, setTicketConfirm] = useState<string | null>(null);

  // Onboarding
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => localStorage.getItem("credchain_onboarded") !== "true"
  );
  const [onboardingStep, setOnboardingStep] = useState(1);

  // Real user id from AuthContext (Mongo _id in live mode). Fall back to the
  // demo fixture id so the mock branch keeps working without a session.
  const userId = authUser?.id || "demo-candidate";

  // Fetch the student profile + credentials + trust portfolio for this user.
  const refetchStudent = React.useCallback(async () => {
    try {
      const cand = await getCandidate(userId);
      setCandidate(cand);
      if (cand) {
        setPortfolioName(cand.name || authUser?.name || "Candidate");
        setPortfolioHeadline(
          `${cand.field || "Student"}${cand.institution ? ` · ${cand.institution}` : ""}`
        );
        if (Array.isArray(cand.skills) && cand.skills.length > 0) setPortfolioSkills(cand.skills);
        if (cand.bio) setPortfolioBio(cand.bio);
        if (Array.isArray(cand.credentials)) setCreds(cand.credentials.map(toUiCredential));
      }
    } catch (err) {
      console.error("Failed to load candidate profile", err);
      // Keep whatever we already have; identity still renders from authUser.
    }
    try {
      const p = await getStudentPortfolio(userId);
      const port = p?.portfolio || null;
      setPortfolio(port);
      // Mock-mode fallback: getCandidate's mock has no credentials array, but the
      // mock portfolio surfaces them as verifiedSkills (full credential fixtures).
      setCreds((prev) =>
        prev.length === 0 && Array.isArray(port?.verifiedSkills) && port.verifiedSkills.some((v: any) => v?.title)
          ? port.verifiedSkills.map(toUiCredential)
          : prev
      );
    } catch (err) {
      console.error("Failed to load student portfolio", err);
    }
  }, [userId, authUser?.name]);

  useEffect(() => {
    async function loadContext() {
      setCredsLoading(true);
      // Seed identity immediately from the authenticated session — no cc_user parsing.
      if (authUser?.name) setPortfolioName(authUser.name);

      await refetchStudent();
      setCredsLoading(false);

      // Notifications + QR stay mock-backed (no backend route for either).
      try {
        const notifs = await getNotifications(userId);
        setNotifications(notifs || []);
      } catch {
        setNotifications([]);
      }
      try {
        const qr = await getQRCode(userId, "public");
        setQrUrl(qr?.qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?data=https://credchain.io/verify/${userId}&size=200x200`);
      } catch {
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?data=https://credchain.io/verify/${userId}&size=200x200`);
      }

      try {
        const insts = await getWhitelistedInstitutions();
        setWhitelistedInstitutions(insts);
      } catch (err) {
        console.error("Failed to load whitelisted institutions", err);
      }
    }
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Credential lifecycle actions (accept anchors on-chain; refetch after) ──
  const handleAcceptCredential = async (c: Credential) => {
    setCredActionId(c.id);
    try {
      const res = await acceptCredential(c.id);
      const sig = res?.credential?.txSignature;
      setCredActionMsg(
        sig
          ? `"${c.title}" accepted and anchored on-chain. Tx: ${sig}`
          : `"${c.title}" accepted.`
      );
      await refetchStudent();
    } catch (err: any) {
      setCredActionMsg(`Could not accept "${c.title}": ${err?.message || "request failed"}`);
    } finally {
      setCredActionId(null);
      setTimeout(() => setCredActionMsg(null), 8000);
    }
  };

  const handleRejectCredential = async (c: Credential) => {
    setCredActionId(c.id);
    try {
      await rejectCredential(c.id);
      setCredActionMsg(`"${c.title}" rejected.`);
      await refetchStudent();
    } catch (err: any) {
      setCredActionMsg(`Could not reject "${c.title}": ${err?.message || "request failed"}`);
    } finally {
      setCredActionId(null);
      setTimeout(() => setCredActionMsg(null), 8000);
    }
  };

  const handleDisputeSubmit = async () => {
    if (!disputeCred) return;
    const target = disputeCred;
    setCredActionId(target.id);
    setDisputeCred(null);
    try {
      await disputeCredential(target.id, disputeReason.trim() || "Revocation believed to be in error.");
      setCredActionMsg(`Dispute filed for "${target.title}" — under independent review.`);
      await refetchStudent();
    } catch (err: any) {
      setCredActionMsg(`Could not file dispute: ${err?.message || "request failed"}`);
    } finally {
      setCredActionId(null);
      setDisputeReason("");
      setTimeout(() => setCredActionMsg(null), 8000);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login");
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const newItem = { id: Date.now(), name: file.name, status: "processing" as const };
    setRefFiles((prev) => [...prev, newItem]);
    setTimeout(() => {
      setRefFiles((prev) =>
        prev.map((f) => (f.id === newItem.id ? { ...f, status: "ready" as const } : f))
      );
    }, 1500);
  };

  const handleGenerateResumeSubmit = async () => {
    setGeneratingResume(true);
    try {
      const res = await buildResume(userId, resumePrompt);
      setGeneratedResumeHtml(res.resume_html);
    } catch (err) {
      setGeneratedResumeHtml(
        "<h3>Emeka Obi</h3><p>B.Eng Computer Engineering · Verified on Solana.</p><p>Blockchain-verified Computer Engineering graduate with verified core competencies in smart contract development, frontend engineering, and cryptographic verification loops.</p>"
      );
    } finally {
      setGeneratingResume(false);
    }
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // NOTE: student-initiated credential requests are not a backend feature yet
    // (issuance is issuer-driven via /v1/issuer/credentials). Keep the optimistic
    // UI so the flow demos; swap in the real endpoint when it exists.
    setReqSuccess(true);
    setTimeout(() => {
      setReqSuccess(false);
      setActiveTab("credentials");
    }, 1500);
  };

  const handleProjectPublishToggle = (id: number, currentPublished: boolean, desc: string) => {
    if (!currentPublished && !desc.trim()) {
      alert("Add a description to publish this project.");
      return;
    }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, published: !currentPublished } : p)));
  };

  // Real credentials fetched from the backend (see refetchStudent). Derived
  // pending/verified/revoked views come straight from credential.status.
  const sampleCreds: Credential[] = creds;
  const pendingCreds = creds.filter((c) => c.status === "pending");
  const verifiedCreds = creds.filter((c) => c.status === "verified");
  const revokedCreds = creds.filter((c) => c.status === "revoked");
  void revokedCreds; // surfaced via the "revoked" filter tab + Trust tab

  // Public share identity — the /verify/:candidateId route resolves by credchainId.
  const publicId = candidate?.credchainId || authUser?.credchainId || userId;
  const publicProfileUrl = `${window.location.origin}/verify/${publicId}`;

  const filteredCreds = sampleCreds.filter((c) => {
    const matchesTab = credFilter === "all" || c.status === credFilter;
    const matchesSearch = searchQuery === "" ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.hash && c.hash.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // Activity ledger derived from real credential state (newest first).
  const sampleActivities = creds.slice(0, 6).map((c) => ({
    title: c.title,
    issuer: c.issuer,
    action:
      c.status === "verified"
        ? "Credential anchored on-chain"
        : c.status === "pending"
        ? "Awaiting your acceptance"
        : c.status === "revoked"
        ? "Revoked by issuer"
        : "Rejected",
    date: c.date,
    status:
      c.status === "verified"
        ? "Verified"
        : c.status === "pending"
        ? "Pending"
        : c.status === "revoked"
        ? "Revoked"
        : "Rejected",
  }));

  const filteredActivities = sampleActivities.filter(
    (act) =>
      searchQuery === "" ||
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const faqs = [
    { id: 1, q: "Why is my credential request still pending?", a: "Requests move through Requested → In Review → Issued or Rejected. The institution registrar reviews and cryptographically signs each one, which can take 1–3 business days." },
    { id: 2, q: "My institution isn't in the directory — what do I do?", a: "Only whitelisted accredited institutions can issue on-chain. Send us their official name via the contact form below and our partnerships team will reach out to onboard them." },
    { id: 3, q: "What does 'Verified On-Chain' mean?", a: "The issuing institution cryptographically signed your academic record and anchored its Merkle root hash on Solana Mainnet. Anyone can independently verify authenticity without contacting the registrar." },
    { id: 4, q: "Can I edit a verified credential?", a: "No. Verified credentials are immutable by design — that's what makes them tamper-proof and trusted by employers. You can control public visibility toggles in My Portfolio." },
    { id: 5, q: "How do I control what's visible on my portfolio?", a: "In My Portfolio, every credential, bio section, and project has a visibility toggle. Clicking 'View as Public' previews the exact read-only view employers see." },
  ];

  const navGroups: NavGroup[] = [
    {
      label: "MAIN",
      items: [
        { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "credentials", label: "My Credentials", icon: <GraduationCap className="w-4 h-4" strokeWidth={1.75} />, badge: sampleCreds.length },
        { id: "request", label: "Request Credential", icon: <Send className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "resume", label: "AI Resume Builder", icon: <Sparkles className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "earn", label: "Earn", icon: <Trophy className="w-4 h-4" strokeWidth={1.75} /> },
      ],
    },
    {
      label: "PROFILE",
      items: [
        { id: "portfolio", label: "My Portfolio", icon: <UserCircle className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "trust", label: "Trust & Disputes", icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "qr", label: "Share QR Code", icon: <QrCode className="w-4 h-4" strokeWidth={1.75} /> },
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

  return (
    <>
      <DashboardShell
        role="candidate"
        user={{
          name: candidate?.name || authUser?.name || portfolioName,
          subtitle: `Candidate · ${candidate?.institution || authUser?.institution || authUser?.email || "CredChain"}`,
          initials:
            (candidate?.name || authUser?.name || portfolioName)
              .split(/\s+/)
              .slice(0, 2)
              .map((w: string) => w[0]?.toUpperCase() || "")
              .join("") || "CC",
          photo: profilePhoto
        }}
        navGroups={navGroups}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Search ${activeTab}…`}
        notificationCount={unreadNotifsCount}
        onLogout={handleLogout}
      >
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Profile banner */}
            {profileBannerOpen && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-surface border border-border-main rounded-lg p-5 text-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-md bg-role-candidate-soft text-role-candidate flex-shrink-0">
                    <UserCircle className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <strong className="block text-txt-primary font-display text-base">
                      Complete your profile
                    </strong>
                    <span className="text-xs text-txt-secondary">
                      Add verified skills and a bio so inquiring employers see the full picture.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={() => setActiveTab("portfolio")}
                    className="px-4 py-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Complete now
                  </button>
                  <button
                    onClick={() => setProfileBannerOpen(false)}
                    className="text-txt-muted hover:text-txt-primary p-1.5 cursor-pointer"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Page header + wallet chip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
              <div className="text-left">
                <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                  CANDIDATE CONSOLE
                </div>
                <h1 className="font-display font-bold text-[28px] sm:text-[32px] text-txt-primary tracking-tight leading-tight">
                  Welcome back, {portfolioName.split(" ")[0]}.
                </h1>
                <p className="font-sans text-txt-secondary scale-base mt-1">
                  Real-time cryptographic overview of your identity vault.
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("0x4f3a9b2c8e1d7a6f5b4c3d2e1f0a9b8c7d6e5f4a");
                  setWalletCopied(true);
                  setTimeout(() => setWalletCopied(false), 2000);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border-main hover:border-role-candidate bg-bg-surface text-txt-primary font-mono text-xs cursor-pointer transition-colors self-start md:self-center"
              >
                <Wifi className="w-3 h-3 text-hash-green animate-pulse-custom" aria-hidden />
                <span className="text-role-candidate">
                  {walletCopied ? "Address copied" : "0x4f3a…b92c"}
                </span>
                <Copy className="w-3.5 h-3.5 text-txt-muted" />
              </button>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCell label="TOTAL CREDENTIALS" value={String(creds.length)} />
              <StatCell label="VERIFIED ON-CHAIN" value={String(verifiedCreds.length)} tone="green" />
              <StatCell label="PENDING ACCEPTANCE" value={String(pendingCreds.length)} tone="role" />
              <StatCell label="CREDSCORE" value={String(portfolio?.credScore?.total ?? portfolio?.credScore ?? "—")} />
            </div>

            {/* Credential wallet preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[18px] text-txt-primary">
                  Credential wallet
                </h3>
                <button
                  onClick={() => setActiveTab("credentials")}
                  className="text-xs font-mono text-role-candidate hover:text-txt-primary inline-flex items-center gap-1 cursor-pointer"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {credsLoading ? (
                  <div className="col-span-full text-center text-txt-muted font-mono text-xs py-10">
                    // Loading credential wallet…
                  </div>
                ) : (
                  sampleCreds.slice(0, 5).map((c) => (
                    <WalletCredentialCard
                      key={c.id}
                      credential={c}
                      onShare={() => setActiveTab("qr")}
                      onView={() => {
                        if (c.explorerUrl) window.open(c.explorerUrl, "_blank", "noopener");
                        else alert("This credential is not anchored on-chain yet.");
                      }}
                      onAccept={c.status === "pending" ? () => handleAcceptCredential(c) : undefined}
                      onReject={c.status === "pending" ? () => handleRejectCredential(c) : undefined}
                      onDispute={c.status === "revoked" && !c.dispute ? () => setDisputeCred(c) : undefined}
                      actionBusy={credActionId === c.id}
                    />
                  ))
                )}
                <button
                  onClick={() => setActiveTab("request")}
                  className="border border-dashed border-border-main hover:border-role-candidate hover:bg-role-candidate-soft rounded-lg p-6 transition-colors flex flex-col items-center justify-center text-center gap-3 min-h-[200px] cursor-pointer"
                >
                  <div className="p-3 rounded-md border border-border-main bg-bg-surface text-txt-muted">
                    <Send className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-sm text-txt-primary">
                      Request credential
                    </div>
                    <div className="text-[11px] font-mono text-txt-muted mt-1">
                      Degree · Certificate · Award
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent activity table */}
            <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
              <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                <h3 className="font-display font-semibold text-[16px] text-txt-primary">
                  Recent activity ledger
                </h3>
                <button
                  onClick={() => setActiveTab("credentials")}
                  className="text-xs font-mono text-role-candidate hover:text-txt-primary cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-bg-sunken text-txt-muted uppercase font-mono text-[10px] border-b border-border-main">
                    <tr>
                      <th className="p-4 pl-5">Credential</th>
                      <th className="p-4 hidden sm:table-cell">Issuer</th>
                      <th className="p-4">Action</th>
                      <th className="p-4 hidden md:table-cell">Date</th>
                      <th className="p-4 text-right pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-txt-muted font-mono text-xs">
                          // No matching activities found
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map((act, i) => (
                        <tr key={i} className="hover:bg-bg-elevated/40 transition-colors">
                          <td className="p-4 pl-5 font-semibold text-txt-primary">{act.title}</td>
                          <td className="p-4 text-txt-secondary hidden sm:table-cell">{act.issuer}</td>
                          <td className="p-4 text-txt-secondary">{act.action}</td>
                          <td className="p-4 font-mono text-txt-muted hidden md:table-cell">{act.date}</td>
                          <td className="p-4 text-right pr-5">
                            <StatusPill status={act.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA strip */}
            <button
              onClick={() => setActiveTab("qr")}
              className="w-full bg-bg-surface border border-border-main hover:border-role-candidate rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left transition-colors cursor-pointer"
            >
              <div>
                <strong className="block text-txt-primary font-display text-base">
                  Share your public proof profile
                </strong>
                <span className="text-xs text-txt-secondary mt-1 block">
                  Generate a tamper-proof QR code that verifiers can scan instantly.
                </span>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-purple text-white font-semibold text-xs flex-shrink-0">
                <QrCode className="w-4 h-4" /> Share portfolio
              </span>
            </button>
          </div>
        )}

        {activeTab === "credentials" && (
          <div className="space-y-6">
            <div>
              <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                CREDENTIAL VAULT
              </div>
              <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
                My credentials.
              </h1>
              <p className="text-sm text-txt-secondary mt-1">
                Track every requested, pending, and anchored proof.
              </p>
            </div>

            {/* Action feedback (accept/reject/dispute results) */}
            {credActionMsg && (
              <div className="border border-hash-green/30 bg-hash-green/5 rounded-md p-3 text-hash-green text-xs font-mono break-all">
                {credActionMsg}
              </div>
            )}

            {/* Filter tabs */}
            <div className="inline-flex items-center gap-1 bg-bg-surface border border-border-main rounded-md p-1 text-xs">
              {(["all", "verified", "pending", "rejected", "revoked"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setCredFilter(f)}
                  className={`px-3 py-1.5 rounded-sm capitalize font-medium cursor-pointer transition-colors ${
                    credFilter === f
                      ? "bg-role-candidate-soft text-role-candidate"
                      : "text-txt-secondary hover:text-txt-primary"
                  }`}
                >
                  {f} ({f === "all" ? sampleCreds.length : sampleCreds.filter((c) => c.status === f).length})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {credsLoading ? (
                <div className="col-span-full text-center text-txt-muted font-mono text-xs py-10">
                  // Loading credential vault…
                </div>
              ) : (
                filteredCreds.map((c) => (
                  <WalletCredentialCard
                    key={c.id}
                    credential={c}
                    large
                    onShare={() => setActiveTab("qr")}
                    onView={() => {
                      if (c.explorerUrl) window.open(c.explorerUrl, "_blank", "noopener");
                      else alert("This credential is not anchored on-chain yet.");
                    }}
                    onResubmit={() => setActiveTab("request")}
                    onAccept={c.status === "pending" ? () => handleAcceptCredential(c) : undefined}
                    onReject={c.status === "pending" ? () => handleRejectCredential(c) : undefined}
                    onDispute={c.status === "revoked" && !c.dispute ? () => setDisputeCred(c) : undefined}
                    actionBusy={credActionId === c.id}
                  />
                ))
              )}
              <button
                onClick={() => setActiveTab("request")}
                className="border border-dashed border-border-main hover:border-role-candidate hover:bg-role-candidate-soft rounded-lg p-6 transition-colors flex flex-col items-center justify-center text-center gap-3 min-h-[220px] cursor-pointer"
              >
                <Plus className="w-7 h-7 text-txt-muted" strokeWidth={1.5} />
                <div className="font-display font-semibold text-sm text-txt-primary">
                  Request new credential
                </div>
                <p className="text-[11px] font-mono text-txt-muted">
                  Submit matric details to registrars
                </p>
              </button>
            </div>
          </div>
        )}

        {activeTab === "request" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                ISSUANCE REQUEST
              </div>
              <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
                Request credential issuance.
              </h1>
              <p className="text-sm text-txt-secondary mt-1">
                Submit a request directly to accredited registrars. You never upload proofs — registrars anchor Merkle roots.
              </p>
            </div>

            {reqSuccess && (
              <div className="border border-hash-green/30 bg-hash-green/5 rounded-md p-4 text-hash-green text-xs font-mono flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
                <span>Request placed in registrar queue. Redirecting to vault…</span>
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Step 1 — institution */}
              <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-border-subtle pb-3 font-display font-semibold text-sm text-txt-primary">
                  <span className="w-6 h-6 rounded-sm bg-role-candidate-soft text-role-candidate flex items-center justify-center text-xs font-mono border border-border-main">
                    1
                  </span>
                  <span>Choose issuing institution</span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search whitelisted institutions..."
                    value={institutionSearch}
                    onChange={(e) => setInstitutionSearch(e.target.value)}
                    className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-role-candidate font-sans"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {whitelistedInstitutions
                    .filter((name) =>
                      name.toLowerCase().includes(institutionSearch.toLowerCase())
                    )
                    .map((instName) => (
                      <button
                        type="button"
                        key={instName}
                        onClick={() => setReqInst(instName)}
                        className={`w-full p-3 rounded-md border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          reqInst === instName
                            ? "bg-role-candidate-soft border-role-candidate"
                            : "bg-bg-sunken border-border-main hover:border-border-strong"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Building2
                            className={`w-4 h-4 flex-shrink-0 ${
                              reqInst === instName ? "text-role-candidate" : "text-txt-muted"
                            }`}
                            strokeWidth={1.75}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-txt-primary truncate">{instName}</div>
                            <div className="text-[10px] font-mono text-txt-muted truncate">
                              Accredited Institution · Whitelisted Root
                            </div>
                          </div>
                        </div>
                        {reqInst === instName && (
                          <Check className="w-4 h-4 text-role-candidate flex-shrink-0 ml-2" strokeWidth={2.5} />
                        )}
                      </button>
                    ))}
                  {whitelistedInstitutions.filter((name) =>
                    name.toLowerCase().includes(institutionSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-4 text-xs text-txt-muted font-sans">
                      No matching whitelisted institutions found.
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2 — details */}
              <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-border-subtle pb-3 font-display font-semibold text-sm text-txt-primary">
                  <span className="w-6 h-6 rounded-sm bg-role-candidate-soft text-role-candidate flex items-center justify-center text-xs font-mono border border-border-main">
                    2
                  </span>
                  <span>Credential type & details</span>
                </div>

                <FormField label="Credential Type">
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    className="w-full bg-bg-sunken border border-border-main rounded-md p-2.5 text-xs text-txt-primary focus:outline-none focus:border-role-candidate"
                  >
                    <option>Transcript / Degree</option>
                    <option>Certificate</option>
                    <option>Internship Letter</option>
                    <option>Award</option>
                  </select>
                </FormField>

                {reqType === "Transcript / Degree" ? (
                  <>
                    <FormField label="Matriculation Number">
                      <TextInput
                        required
                        placeholder="e.g. 2021110045"
                        value={reqMatric}
                        onChange={setReqMatric}
                        mono
                      />
                    </FormField>
                    <FormField label="Program / Major">
                      <TextInput
                        required
                        placeholder="e.g. B.Eng Computer Engineering"
                        value={reqProgram}
                        onChange={setReqProgram}
                      />
                    </FormField>
                    <FormField label="Graduation Year / Session">
                      <TextInput
                        required
                        placeholder="e.g. 2025/2026"
                        value={reqGradYear}
                        onChange={setReqGradYear}
                        mono
                      />
                    </FormField>
                  </>
                ) : (
                  <FormField label="Reference / Cohort Identifier">
                    <TextInput required placeholder="e.g. Cohort 4 Solana Bootcamp" />
                  </FormField>
                )}

                <div className="border border-border-main bg-bg-sunken rounded-md p-3 text-[11px] text-txt-secondary font-mono">
                  {"// Institutional fee covered by CredChain Grant ($0.00)"}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                  <span>Transmit request</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "resume" && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-subtle pb-5">
              <div>
                <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                  AI RESUME
                </div>
                <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
                  Verified resume builder.
                </h1>
                <p className="text-sm text-txt-secondary mt-1">
                  Generate cryptographically verifiable resumes tailored to any role using Gemini + Solana Merkle proofs.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-main text-txt-secondary text-[11px] font-mono">
                <Sparkles className="w-3 h-3 text-role-candidate" /> Powered by Gemini
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Controls */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-bg-surface border border-border-main rounded-lg p-5 space-y-3">
                  <h3 className="font-display font-semibold text-sm text-txt-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-hash-green" strokeWidth={2} />
                    <span>Select verified blocks</span>
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {sampleCreds.filter((c) => c.status === "verified").map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 p-3 rounded-md bg-bg-sunken border border-border-main hover:border-role-candidate cursor-pointer text-xs text-txt-secondary transition-colors"
                      >
                        <input
                          defaultChecked
                          type="checkbox"
                          className="rounded-sm border-border-main text-role-candidate focus:ring-role-candidate"
                        />
                        <span className="truncate flex-1 text-txt-primary">{c.title}</span>
                        <span className="text-txt-muted text-[10px] font-mono ml-auto truncate max-w-[100px]">
                          {c.issuer}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-bg-surface border border-border-main rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-sm text-txt-primary flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-role-candidate" strokeWidth={1.75} />
                      <span>Reference documents</span>
                    </h3>
                    <span className="text-[10px] font-mono text-txt-muted">Max 10MB</span>
                  </div>

                  <label className="border border-dashed border-border-main hover:border-role-candidate rounded-md p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-bg-sunken transition-colors">
                    <UploadCloud className="w-5 h-5 text-txt-muted mb-2" strokeWidth={1.5} />
                    <span className="text-xs font-semibold text-txt-primary">
                      Attach transcript or certificates
                    </span>
                    <span className="text-[10px] font-mono text-txt-muted mt-1">
                      PDF / JPG · AI extracts coursework + GPA for grounding
                    </span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>

                  {refFiles.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {refFiles.map((f) => (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-md bg-bg-sunken border border-border-main flex items-center justify-between text-xs"
                        >
                          <span className="truncate max-w-[200px] text-txt-secondary">{f.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase ${
                              f.status === "ready"
                                ? "text-hash-green border border-hash-green/30"
                                : "text-role-candidate border border-role-candidate/30 animate-pulse-custom"
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-bg-surface border border-border-main rounded-lg p-5 space-y-3">
                  <h3 className="font-display font-semibold text-sm text-txt-primary flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-role-candidate" strokeWidth={1.75} />
                    <span>Target role & prompt</span>
                  </h3>
                  <textarea
                    rows={3}
                    value={resumePrompt}
                    onChange={(e) => setResumePrompt(e.target.value)}
                    className="w-full bg-bg-sunken border border-border-main rounded-md p-3 text-xs text-txt-primary font-mono focus:outline-none focus:border-role-candidate"
                  />

                  <button
                    onClick={handleGenerateResumeSubmit}
                    disabled={generatingResume}
                    className="w-full py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {generatingResume ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Generating…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate verifiable resume</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="lg:col-span-7 bg-bg-surface border border-border-main rounded-lg p-6 space-y-5 lg:sticky lg:top-20">
                <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                  <span className="text-[10px] font-mono font-semibold text-txt-muted uppercase tracking-wider">
                    LIVE OUTPUT PREVIEW
                  </span>
                  {generatedResumeHtml && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(generatedResumeHtml)}
                        className="px-2.5 py-1.5 rounded-sm border border-border-main hover:border-role-candidate text-txt-secondary hover:text-txt-primary text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy HTML
                      </button>
                      <button
                        onClick={() => alert("Downloading verifiable PDF.")}
                        className="px-3 py-1.5 rounded-sm bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Export PDF
                      </button>
                    </div>
                  )}
                </div>

                {!generatedResumeHtml ? (
                  <div className="min-h-[400px] border border-dashed border-border-main rounded-md flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="w-12 h-12 rounded-md border border-border-main bg-bg-sunken text-role-candidate flex items-center justify-center">
                      <FileText className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-txt-primary">
                        Your verified resume will appear here
                      </h4>
                      <p className="text-xs text-txt-secondary mt-1 max-w-xs mx-auto">
                        Select verified blocks and references on the left, then click Generate.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="resume-preview p-6 rounded-md bg-bg-sunken border border-border-main min-h-[400px] max-w-full overflow-x-hidden"
                    >
                      <div
                        className="prose prose-invert max-w-none text-sm text-txt-primary leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: generatedResumeHtml }}
                      />
                    </div>

                    <div className="border border-border-main bg-bg-sunken rounded-md p-3 flex items-center justify-between text-[11px] font-mono">
                      <span className="flex items-center gap-2 text-txt-secondary">
                        <ShieldCheck className="w-4 h-4 text-hash-green" strokeWidth={2} />
                        <span>Anchor: Solana Mainnet (#88f9a1)</span>
                      </span>
                      <a
                        href="#"
                        className="text-role-candidate hover:text-txt-primary inline-flex items-center gap-1"
                      >
                        Verify proof <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
              <div>
                <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                  PUBLIC DESK
                </div>
                <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
                  My portfolio.
                </h1>
                <p className="text-sm text-txt-secondary mt-1">
                  Control what verifiers can inspect.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewAsPublic(!viewAsPublic)}
                  className={`px-3 py-2 rounded-md text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    viewAsPublic
                      ? "bg-brand-purple text-white"
                      : "border border-border-main text-txt-primary hover:border-role-candidate"
                  }`}
                >
                  <Eye className="w-4 h-4" strokeWidth={1.75} />
                  <span>{viewAsPublic ? "Exit public preview" : "View as public"}</span>
                </button>
                <Link
                  to={`/verify/${publicId}`}
                  target="_blank"
                  className="p-2 rounded-md border border-border-main hover:border-role-candidate text-txt-secondary hover:text-txt-primary transition-colors"
                  title="Open public URL"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {viewAsPublic && (
              <div className="border-l-2 border-role-candidate bg-role-candidate-soft p-3 text-xs text-role-candidate font-mono">
                // PUBLIC PREVIEW MODE — exact read-only view employers see
              </div>
            )}

            {/* Profile header */}
            <div className="bg-bg-surface border border-border-main rounded-lg p-6 flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-md bg-role-candidate-soft text-role-candidate font-display font-bold text-2xl flex items-center justify-center overflow-hidden border border-border-main">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={portfolioName} className="w-full h-full object-cover" />
                  ) : (
                    "EO"
                  )}
                </div>
                {!viewAsPublic && (
                  <label className="absolute inset-0 rounded-md bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white text-[10px] font-mono cursor-pointer transition-opacity">
                    <Camera className="w-4 h-4 text-role-candidate" strokeWidth={1.75} />
                    <span>Change</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            setProfilePhoto(res);
                            localStorage.setItem("credchain_profile_photo", res);
                            // Also update inside cc_user
                            try {
                              const storedUserStr = localStorage.getItem("cc_user");
                              if (storedUserStr) {
                                const storedUser = JSON.parse(storedUserStr);
                                storedUser.photo = res;
                                localStorage.setItem("cc_user", JSON.stringify(storedUser));
                              }
                            } catch (err) {
                              console.error("Failed to update user photo in localStorage", err);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="flex-1 space-y-3 w-full">
                <input
                  readOnly={viewAsPublic}
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  className={`w-full text-xl font-display font-bold text-txt-primary rounded-md px-2 py-1 transition-colors ${
                    viewAsPublic
                      ? "border-transparent pointer-events-none bg-transparent"
                      : "border border-border-main focus:border-role-candidate bg-bg-sunken"
                  }`}
                />
                <input
                  readOnly={viewAsPublic}
                  type="text"
                  value={portfolioHeadline}
                  onChange={(e) => setPortfolioHeadline(e.target.value)}
                  className={`w-full text-xs text-txt-secondary font-mono rounded-md px-2 py-1 transition-colors ${
                    viewAsPublic
                      ? "border-transparent pointer-events-none bg-transparent"
                      : "border border-border-main focus:border-role-candidate bg-bg-sunken"
                  }`}
                />

                <div className="flex items-center gap-3 pt-1 text-xs">
                  <span className="flex items-center gap-1.5 text-hash-green font-mono">
                    <ShieldCheck className="w-4 h-4" strokeWidth={2} /> Verified Student
                  </span>
                  <span className="text-txt-muted">·</span>
                  <span className="text-txt-secondary">{candidate?.institution || authUser?.institution || authUser?.email || "CredChain"}</span>
                </div>
              </div>
            </div>

            {/* Bio + skills */}
            <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
              <h3 className="font-display font-semibold text-[16px] text-txt-primary">
                About & verified competencies
              </h3>
              <textarea
                readOnly={viewAsPublic}
                rows={3}
                value={portfolioBio}
                onChange={(e) => setPortfolioBio(e.target.value)}
                className={`w-full text-xs text-txt-secondary leading-relaxed rounded-md p-3 transition-colors ${
                  viewAsPublic
                    ? "border-transparent pointer-events-none bg-transparent pl-0"
                    : "border border-border-main focus:border-role-candidate bg-bg-sunken"
                }`}
              />

              <div className="flex flex-wrap gap-2 pt-2">
                {portfolioSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 rounded-sm border border-border-main bg-bg-sunken text-role-candidate text-xs font-mono inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-hash-green" strokeWidth={2.5} /> {s}
                    {!viewAsPublic && (
                      <X
                        onClick={() => setPortfolioSkills(portfolioSkills.filter((sk) => sk !== s))}
                        className="w-3 h-3 text-txt-muted hover:text-hash-red ml-1 cursor-pointer"
                      />
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[16px] text-txt-primary">
                  Projects & verifiable proofs
                </h3>
                {!viewAsPublic && (
                  <button
                    onClick={() =>
                      setProjects([
                        ...projects,
                        {
                          id: Date.now(),
                          title: "New verifiable project",
                          desc: "Project summary…",
                          tags: ["Solidity"],
                          published: false,
                        },
                      ])
                    }
                    className="text-xs font-mono text-role-candidate hover:text-txt-primary cursor-pointer"
                  >
                    + Add project
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {projects.filter((p) => !viewAsPublic || p.published).map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-md bg-bg-sunken border border-border-main flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <h4 className="font-display font-semibold text-sm text-txt-primary">{p.title}</h4>
                      <p className="text-xs text-txt-secondary">{p.desc || "No description added yet."}</p>
                      <div className="flex gap-1.5 pt-1">
                        {p.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded-sm border border-border-main text-[10px] font-mono text-txt-secondary"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!viewAsPublic && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleProjectPublishToggle(p.id, p.published, p.desc)}
                          className={`px-2.5 py-1.5 rounded-sm text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                            p.published
                              ? "text-hash-green border border-hash-green/30"
                              : "text-txt-secondary border border-border-main hover:text-txt-primary"
                          }`}
                        >
                          {p.published ? "● Published" : "○ Hidden"}
                        </button>
                        <button
                          onClick={() => setProjects(projects.filter((pr) => pr.id !== p.id))}
                          className="text-txt-muted hover:text-hash-red p-1"
                          aria-label="Remove project"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "earn" && <EarnTab />}

        {activeTab === "trust" && <TrustTab candidateId={userId} credentials={creds} onChanged={refetchStudent} />}

        {activeTab === "qr" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center">
              <div className="inline-block text-left border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                PROOF QR
              </div>
              <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
                Share verifier proof QR.
              </h1>
              <p className="text-sm text-txt-secondary mt-1">
                Generate a scoped cryptographic QR. Verifiers scan to audit proof directly on Solana.
              </p>
            </div>

            <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-6 text-center">
              {/* Scope picker */}
              <div className="w-full flex justify-center">
                <div className="inline-flex bg-bg-sunken border border-border-main rounded-md p-1 text-xs max-w-md">
                  {(["portfolio", "projects", "credentials"] as const).map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setQrScope(sc)}
                      className={`flex-1 py-1.5 px-3 rounded-sm capitalize font-medium cursor-pointer transition-colors ${
                        qrScope === sc
                          ? "bg-role-candidate-soft text-role-candidate"
                          : "text-txt-secondary hover:text-txt-primary"
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Code Container */}
              <div className="w-full flex justify-center">
                <div className="bg-white rounded-md p-6 border border-border-main inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`${publicProfileUrl}?scope=${qrScope}`)}&size=220x220`}
                    alt={`Scoped QR · ${qrScope}`}
                    className="w-48 h-48 sm:w-56 sm:h-56 block mx-auto"
                  />
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                <div className="flex items-center gap-2 bg-bg-sunken border border-border-main rounded-md p-2 pl-3">
                  <input
                    readOnly
                    type="text"
                    value={`${publicProfileUrl}?scope=${qrScope}`}
                    className="bg-transparent text-xs text-txt-secondary font-mono flex-1 focus:outline-none truncate"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${publicProfileUrl}?scope=${qrScope}`);
                      setQrCopied(true);
                      setTimeout(() => setQrCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-sm bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                  >
                    {qrCopied ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{qrCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => alert("Downloading High-Res PNG")}
                    className="flex-1 py-2 rounded-md border border-border-main hover:border-role-candidate text-txt-primary font-semibold text-xs cursor-pointer inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" strokeWidth={1.75} /> Download QR
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) navigator.share({ url: window.location.href });
                    }}
                    className="flex-1 py-2 rounded-md border border-border-main hover:border-role-candidate text-txt-primary font-semibold text-xs cursor-pointer inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" strokeWidth={1.75} /> Native Share
                  </button>
                </div>
              </div>
            </div>

            {/* Verifier preview card */}
            <div className="bg-bg-surface border border-border-main rounded-lg p-6 text-center">
              <span className="text-[10px] font-mono text-txt-muted uppercase tracking-widest block mb-4">
                CARD PREVIEW VERIFIERS SEE
              </span>

              <div className="max-w-sm mx-auto bg-bg-sunken border border-border-main rounded-md p-5 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-md bg-role-candidate-soft text-role-candidate font-display font-bold flex items-center justify-center text-xs overflow-hidden border border-border-main">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt={portfolioName} className="w-full h-full object-cover" />
                    ) : (
                      "EO"
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base text-txt-primary">
                      {portfolioName}
                    </h3>
                    <span className="text-[10px] font-mono text-hash-green inline-flex items-center gap-1">
                      <Signal className="w-2.5 h-2.5 text-hash-green animate-pulse-custom" />
                      Verified Solana Anchor
                    </span>
                  </div>
                </div>
                <p className="text-xs text-txt-secondary line-clamp-2">{portfolioHeadline}</p>
                <div className="mt-4 pt-3 border-t border-border-main flex justify-between text-[10px] font-mono text-txt-muted">
                  <span>scope: {qrScope}</span>
                  <span>credchain.io</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                PREFERENCES
              </div>
              <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
                Settings.
              </h1>
              <p className="text-sm text-txt-secondary mt-1">
                Manage notifications, theme, and identity vault access.
              </p>
            </div>

            <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-5">
              <h3 className="font-display font-semibold text-[16px] text-txt-primary border-b border-border-subtle pb-3">
                Quick settings
              </h3>

              <ToggleRow
                title="Open to opportunities"
                description="Display a verified 'Open to Work' indicator on your public desk."
                checked={openToOpps}
                onChange={() => setOpenToOpps(!openToOpps)}
              />

              <div className="border-t border-border-subtle" />

              <ToggleRow
                title="Email notifications"
                description="Receive alerts when registrars approve or sign credentials."
                checked={emailNotifs}
                onChange={() => setEmailNotifs(!emailNotifs)}
              />

              <div className="border-t border-border-subtle" />

              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <div>
                  <strong className="block text-sm text-txt-primary font-display">Theme</strong>
                  <span className="text-xs text-txt-secondary">
                    Light theme is in early preview.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (t !== themeSetting) {
                          toggleTheme();
                          setThemeSetting(t);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md border inline-flex items-center gap-2 text-xs font-semibold capitalize cursor-pointer transition-colors ${
                        themeSetting === t
                          ? "bg-role-candidate-soft border-role-candidate text-role-candidate"
                          : "bg-bg-sunken border-border-main text-txt-secondary hover:text-txt-primary"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-sm ${
                          t === "dark" ? "bg-bg-base border border-border-main" : "bg-white"
                        }`}
                      />
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
              <button
                onClick={() => setAdvSettingsOpen(!advSettingsOpen)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-bg-elevated/40 transition-colors cursor-pointer"
              >
                <div>
                  <strong className="block text-sm text-txt-primary font-display">
                    Advanced identity settings
                  </strong>
                  <span className="text-xs text-txt-secondary">
                    DID export, account deletion.
                  </span>
                </div>
                {advSettingsOpen ? (
                  <ChevronDown className="w-4 h-4 text-txt-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-txt-muted" />
                )}
              </button>

              {advSettingsOpen && (
                <div className="p-5 border-t border-border-subtle bg-bg-sunken space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-md bg-bg-surface border border-border-main">
                    <div>
                      <div className="text-xs font-semibold text-txt-primary">
                        Export W3C Verifiable DID Document
                      </div>
                      <div className="text-[10px] font-mono text-txt-muted">
                        Download JSON-LD identity anchor keys
                      </div>
                    </div>
                    <button
                      onClick={() => alert("Downloading DID Document")}
                      className="px-2.5 py-1.5 rounded-sm border border-border-main hover:border-role-candidate text-xs font-mono text-txt-primary cursor-pointer transition-colors"
                    >
                      Export JSON
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-md border border-hash-red/30 bg-hash-red/5">
                    <div>
                      <div className="text-xs font-semibold text-hash-red">
                        Revoke identity & erase vault
                      </div>
                      <div className="text-[10px] text-hash-red/80">
                        Disassociates your candidate profile permanently
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure? This cannot be undone.")) handleLogout();
                      }}
                      className="px-2.5 py-1.5 rounded-sm border border-hash-red text-hash-red hover:bg-hash-red/10 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Erase account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "help" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                SUPPORT
              </div>
              <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
                Help & protocol support.
              </h1>
              <p className="text-sm text-txt-secondary mt-1">
                Questions about on-chain verification or registrar signatures? We're here.
              </p>
            </div>

            {/* FAQ */}
            <div className="space-y-3">
              <h3 className="font-display font-semibold text-[16px] text-txt-primary border-b border-border-subtle pb-3">
                Frequently asked questions
              </h3>
              <div className="space-y-2">
                {faqs.map((f) => (
                  <div
                    key={f.id}
                    className="bg-bg-surface border border-border-main rounded-md overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaqId(openFaqId === f.id ? null : f.id)}
                      className="w-full p-4 text-left font-semibold text-sm text-txt-primary flex items-center justify-between gap-4 cursor-pointer hover:bg-bg-elevated/40 transition-colors"
                    >
                      <span>{f.q}</span>
                      {openFaqId === f.id ? (
                        <ChevronDown className="w-4 h-4 text-role-candidate flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-txt-muted flex-shrink-0" />
                      )}
                    </button>
                    {openFaqId === f.id && (
                      <div className="px-4 pb-4 pt-1 text-xs text-txt-secondary leading-relaxed border-t border-border-subtle bg-bg-sunken">
                        {f.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket form */}
            <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-5">
              <div>
                <h3 className="font-display font-semibold text-[16px] text-txt-primary">
                  Contact protocol maintainers
                </h3>
                <p className="text-xs text-txt-secondary mt-1">
                  Need your institution whitelisted or having credential sync issues? Open a priority support ticket.
                </p>
              </div>

              {ticketConfirm ? (
                <div className="border border-hash-green/30 bg-hash-green/5 rounded-md p-4 text-hash-green text-xs font-mono">
                  {ticketConfirm}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setTicketConfirm(
                      "Support ticket #CC-8819 created. Maintainers will reply via your registered email within 24 hours."
                    );
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Subject">
                      <TextInput
                        required
                        placeholder="Brief summary"
                        value={ticketSubject}
                        onChange={setTicketSubject}
                      />
                    </FormField>
                    <FormField label="Category">
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full bg-bg-sunken border border-border-main rounded-md p-2.5 text-xs text-txt-primary focus:outline-none focus:border-role-candidate"
                      >
                        <option>Account & Profile</option>
                        <option>Credential Issuance Delay</option>
                        <option>Institution Onboarding</option>
                        <option>Solana Verification Error</option>
                      </select>
                    </FormField>
                  </div>
                  <FormField label="Message">
                    <textarea
                      required
                      rows={4}
                      placeholder="How can we help?"
                      value={ticketMsg}
                      onChange={(e) => setTicketMsg(e.target.value)}
                      className="w-full bg-bg-sunken border border-border-main rounded-md p-3 text-xs text-txt-primary focus:outline-none focus:border-role-candidate"
                    />
                  </FormField>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs cursor-pointer inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                    <span>Submit priority ticket</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </DashboardShell>

      {/* Dispute revoked credential modal */}
      {disputeCred && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setDisputeCred(null)}
        >
          <div
            className="bg-bg-surface border border-border-strong rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-txt-primary flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-hash-red" /> Dispute revocation
              </h3>
              <button
                onClick={() => setDisputeCred(null)}
                className="text-txt-muted hover:text-txt-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-txt-secondary mb-1">{disputeCred.title}</p>
            <p className="text-xs text-txt-muted mb-4">
              Your dispute goes to an independent review queue — never back to the issuer who revoked it.
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain why this revocation is in error…"
              rows={4}
              className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDisputeCred(null)}
                className="text-sm text-txt-secondary hover:text-txt-primary px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDisputeSubmit}
                className="text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                File dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Wizard */}
      {onboardingOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-main rounded-lg p-6 max-w-md w-full relative space-y-5">
            <button
              onClick={() => {
                setOnboardingOpen(false);
                localStorage.setItem("credchain_onboarded", "true");
              }}
              className="absolute top-4 right-4 text-xs font-mono text-txt-muted hover:text-txt-primary cursor-pointer"
            >
              Skip
            </button>

            <div className="flex gap-1.5 justify-center">
              {[1, 2, 3].map((d) => (
                <span
                  key={d}
                  className={`h-1.5 rounded-sm transition-all duration-200 ${
                    onboardingStep >= d ? "w-6 bg-role-candidate" : "w-3 bg-border-main"
                  }`}
                />
              ))}
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-md bg-role-candidate-soft border border-border-main text-role-candidate flex items-center justify-center mx-auto">
                  <UserCircle className="w-7 h-7" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-display font-semibold text-txt-primary">
                  Welcome to CredChain
                </h3>
                <p className="text-xs text-txt-secondary leading-relaxed">
                  Let's set up your verifiable student identity in 60 seconds.
                </p>
                <div className="space-y-3 text-left pt-2">
                  <TextInput placeholder="e.g. Software Engineering student" />
                  <TextInput placeholder="e.g. Owerri, Nigeria" />
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-md bg-hash-green/10 border border-hash-green/30 text-hash-green flex items-center justify-center mx-auto">
                  <Trophy className="w-7 h-7" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-display font-semibold text-txt-primary">
                  Your skills vault
                </h3>
                <p className="text-xs text-txt-secondary">
                  Add core engineering skills. Registrars and bootcamps will endorse them on-chain.
                </p>
                <TextInput placeholder="Type a skill and press Enter" />
                <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                  {portfolioSkills.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded-sm border border-border-main bg-bg-sunken text-role-candidate text-xs font-mono"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-md bg-role-candidate-soft border border-border-main text-role-candidate flex items-center justify-center mx-auto">
                  <LinkIcon className="w-7 h-7" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-display font-semibold text-txt-primary">
                  Social anchors
                </h3>
                <p className="text-xs text-txt-secondary">Attach GitHub or LinkedIn profiles.</p>
                <TextInput placeholder="e.g. github.com/yourname" />
                <textarea
                  rows={2}
                  placeholder="e.g. Seeking Web3 smart contract engineering internship"
                  className="w-full bg-bg-sunken border border-border-main rounded-md p-3 text-xs text-txt-primary focus:outline-none focus:border-role-candidate"
                />
              </div>
            )}

            <div className="pt-4 border-t border-border-subtle flex gap-3">
              {onboardingStep > 1 && (
                <button
                  onClick={() => setOnboardingStep(onboardingStep - 1)}
                  className="px-4 py-2 rounded-md border border-border-main hover:border-border-strong text-xs font-semibold cursor-pointer text-txt-secondary transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (onboardingStep < 3) setOnboardingStep(onboardingStep + 1);
                  else {
                    setOnboardingOpen(false);
                    localStorage.setItem("credchain_onboarded", "true");
                  }
                }}
                className="flex-1 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                {onboardingStep < 3 ? "Continue" : "Launch my vault"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────── Helper components ─────────── */

function StatCell({
  label,
  value,
  tone = "neutral",
  trend,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "role";
  trend?: string;
}) {
  const valueClass =
    tone === "green" ? "text-hash-green" : tone === "role" ? "text-role-candidate" : "text-txt-primary";
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">{label}</div>
        {trend && (
          <span className="text-[10px] font-mono text-hash-green border border-hash-green/30 rounded-sm px-1.5 py-0.5">
            {trend}
          </span>
        )}
      </div>
      <div className={`font-display font-bold text-[28px] leading-none ${valueClass}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isPositive = status === "Verified" || status === "Done";
  const isPending = status === "Pending";
  const color = isPositive
    ? "text-hash-green border-hash-green/30"
    : isPending
    ? "text-role-candidate border-role-candidate/30"
    : "text-hash-red border-hash-red/30";
  return (
    <span
      className={`inline-flex items-center text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border ${color}`}
    >
      {status}
    </span>
  );
}

function WalletCredentialCard({
  credential,
  onShare,
  onView,
  onResubmit,
  onAccept,
  onReject,
  onDispute,
  actionBusy = false,
  large = false,
}: {
  credential: Credential;
  onShare: () => void;
  onView: () => void;
  onResubmit?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onDispute?: () => void;
  actionBusy?: boolean;
  large?: boolean;
}) {
  const borderTopColor =
    credential.status === "verified"
      ? "border-t-hash-green"
      : credential.status === "pending"
      ? "border-t-role-candidate"
      : "border-t-hash-red";

  const Icon =
    credential.status === "verified"
      ? GraduationCap
      : credential.status === "pending"
      ? Clock
      : credential.status === "rejected"
      ? FileX
      : ScrollText;

  const iconColor =
    credential.status === "verified"
      ? "text-hash-green"
      : credential.status === "pending"
      ? "text-role-candidate"
      : "text-hash-red";

  return (
    <div
      className={`bg-bg-surface border border-border-main border-t-[3px] ${borderTopColor} rounded-lg ${
        large ? "p-6" : "p-5"
      } transition-colors hover:border-border-strong flex flex-col justify-between gap-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 rounded-md bg-bg-sunken border border-border-main">
          <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
        </div>
        <span
          className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-sm border ${
            credential.status === "verified"
              ? "text-hash-green border-hash-green/30"
              : credential.status === "pending"
              ? "text-role-candidate border-role-candidate/30"
              : "text-hash-red border-hash-red/30"
          }`}
        >
          {credential.status}
        </span>
      </div>

      <div>
        <h4 className="font-display font-semibold text-sm text-txt-primary leading-snug">
          {credential.title}
        </h4>
        <p className="text-xs text-txt-secondary mt-1 truncate">{credential.issuer}</p>
      </div>

      {credential.reason && (
        <div className="border-l-2 border-hash-red bg-hash-red/5 px-3 py-2 text-[11px] text-hash-red font-mono leading-relaxed">
          <strong>Flagged:</strong> {credential.reason}
        </div>
      )}

      {credential.status === "revoked" && credential.revokedReason && (
        <div className="border-l-2 border-hash-red bg-hash-red/5 px-3 py-2 text-[11px] text-hash-red font-mono leading-relaxed">
          <strong>Revoked:</strong> {credential.revokedReason}
        </div>
      )}

      <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-txt-muted">
        <span className="truncate max-w-[150px]" title={credential.hash}>
          {credential.hash}
        </span>
        <span>{credential.date}</span>
      </div>

      <div className="flex gap-2">
        {credential.status === "pending" && onAccept && onReject ? (
          <>
            <button
              onClick={onAccept}
              disabled={actionBusy}
              className="flex-1 py-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white font-semibold text-xs cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              {actionBusy ? "Anchoring…" : "Accept"}
            </button>
            <button
              onClick={onReject}
              disabled={actionBusy}
              className="flex-1 py-2 rounded-md border border-hash-red text-hash-red hover:bg-hash-red/10 disabled:opacity-50 font-semibold text-xs cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              Reject
            </button>
          </>
        ) : credential.status === "revoked" && onDispute ? (
          <button
            onClick={onDispute}
            disabled={actionBusy}
            className="w-full py-2 rounded-md border border-hash-red text-hash-red hover:bg-hash-red/10 disabled:opacity-50 font-semibold text-xs cursor-pointer transition-colors"
          >
            Dispute revocation
          </button>
        ) : credential.status === "revoked" && credential.dispute ? (
          <span className="w-full py-2 rounded-md border border-role-candidate/30 text-role-candidate font-mono text-[11px] text-center">
            Dispute under review
          </span>
        ) : credential.status === "rejected" && onResubmit ? (
          <button
            onClick={onResubmit}
            className="w-full py-2 rounded-md border border-hash-red text-hash-red hover:bg-hash-red/10 font-semibold text-xs cursor-pointer transition-colors"
          >
            Resubmit request
          </button>
        ) : (
          <>
            <button
              onClick={onShare}
              className="flex-1 py-2 rounded-md border border-border-main hover:border-border-strong text-txt-secondary hover:text-txt-primary font-semibold text-xs cursor-pointer transition-colors"
            >
              Share QR
            </button>
            <button
              onClick={onView}
              className="flex-1 py-2 rounded-md border border-border-main hover:border-role-candidate text-role-candidate font-semibold text-xs cursor-pointer transition-colors"
            >
              View on-chain
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
  mono,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={`w-full bg-bg-sunken border border-border-main rounded-md p-2.5 text-xs text-txt-primary focus:outline-none focus:border-role-candidate ${
        mono ? "font-mono" : ""
      }`}
    />
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <strong className="block text-sm text-txt-primary font-display">{title}</strong>
        <span className="text-xs text-txt-secondary">{description}</span>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className={`w-11 h-6 rounded-md transition-colors relative p-1 cursor-pointer flex-shrink-0 ${
          checked ? "bg-brand-purple" : "bg-bg-sunken border border-border-main"
        }`}
      >
        <span
          className={`w-4 h-4 rounded-sm bg-white block transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
