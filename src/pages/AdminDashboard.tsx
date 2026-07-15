// ─────────────────────────────────────────────────────────────
// CredChain v2 — Platform Admin Console
// The gatekeeper page: Tier-4 issuer vetting (registry cross-match),
// the independent dispute queue, the fraud-report queue, and the
// institution demand list. Admin is NOT a Role — the backend gates
// /api/v1/admin/* by the ADMIN_EMAILS allowlist and returns 403 for
// everyone else, so any authenticated user may open this page and
// non-admins get a clear notice.
// Decision vocab mirrors backend/src/controllers exactly:
//   disputes  → 'reinstate' | 'uphold'
//   fraud     → 'uphold' | 'dismiss'
//   inst-reqs → 'reviewing' | 'onboarded' | 'declined'
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Gavel,
  ShieldAlert,
  Inbox,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ExternalLink,
  Eye,
  RotateCcw,
  ShieldX,
  Loader2,
  Check,
  X,
  Quote,
  Flag,
} from "lucide-react";
import DashboardShell, { NavGroup } from "../components/DashboardShell";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket } from "../services/socket";
import {
  getAdminIssuers,
  registryCrossMatch,
  listDisputes,
  resolveDispute,
  listFraudReports,
  resolveFraudReport,
  getInstitutionRequests,
  resolveInstitutionRequest,
} from "../services/api";
import { AdminIssuer, Dispute, FraudReport, InstitutionRequest } from "../types";

type Tab = "overview" | "issuers" | "disputes" | "fraud" | "institutions";
type LoadState = "loading" | "ready" | "forbidden" | "error";

// The real backend flips issuers actionable at 'identity_checked'; the v2 mock
// funnel names the same stage 'registry_pending'. Accept either so the table
// works against both.
const ACTIONABLE_STATUSES = ["identity_checked", "registry_pending"];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [issuers, setIssuers] = useState<AdminIssuer[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [fraudReports, setFraudReports] = useState<FraudReport[]>([]);
  const [requests, setRequests] = useState<InstitutionRequest[]>([]);

  // One in-flight action at a time, keyed "<queue>:<id>" so every button can
  // derive its own disabled/spinner state.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // Optional reviewer notes, keyed the same way.
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    const results = await Promise.allSettled([
      getAdminIssuers(),
      listDisputes(),
      listFraudReports(),
      getInstitutionRequests(),
    ]);
    const [iss, dis, fra, req] = results;

    // api.ts attaches { status } to thrown errors — 403 across the board means
    // this account isn't on the ADMIN_EMAILS allowlist.
    const allForbidden = results.every(
      (r) => r.status === "rejected" && (r.reason as any)?.status === 403
    );
    if (allForbidden) {
      setLoadState("forbidden");
      return;
    }

    if (iss.status === "fulfilled") setIssuers(iss.value?.issuers || []);
    if (dis.status === "fulfilled") setDisputes(dis.value?.disputes || []);
    if (fra.status === "fulfilled") setFraudReports(fra.value?.reports || []);
    if (req.status === "fulfilled") setRequests(req.value?.requests || []);

    setLoadState(results.every((r) => r.status === "rejected") ? "error" : "ready");
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Per-list refetchers — each resolve action re-pulls only its own queue.
  const refetchIssuers = useCallback(async () => {
    try { setIssuers((await getAdminIssuers())?.issuers || []); } catch (e) { console.error(e); }
  }, []);
  const refetchDisputes = useCallback(async () => {
    try { setDisputes((await listDisputes())?.disputes || []); } catch (e) { console.error(e); }
  }, []);
  const refetchFraud = useCallback(async () => {
    try { setFraudReports((await listFraudReports())?.reports || []); } catch (e) { console.error(e); }
  }, []);
  const refetchRequests = useCallback(async () => {
    try { setRequests((await getInstitutionRequests())?.requests || []); } catch (e) { console.error(e); }
  }, []);

  async function runAction(key: string, action: () => Promise<any>, refetch: () => Promise<void>) {
    setMsg(null);
    setBusyKey(key);
    try {
      const res = await action();
      setMsg({ type: "ok", text: res?.message || "Done." });
      await refetch();
      setNotes((prev) => ({ ...prev, [key]: "" }));
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message || "Action failed." });
    } finally {
      setBusyKey(null);
    }
  }

  const vetIssuer = (issuer: AdminIssuer, matched: boolean) => {
    const id = String(issuer.userId || issuer._id);
    const key = `issuer:${id}`;
    return runAction(key, () => registryCrossMatch(id, matched, notes[key] || undefined), refetchIssuers);
  };

  const resolveDisputeRow = (d: Dispute, decision: "reinstate" | "uphold") => {
    const id = String(d.id || d._id);
    const key = `dispute:${id}`;
    return runAction(key, () => resolveDispute(id, decision, notes[key] || undefined), refetchDisputes);
  };

  const resolveFraudRow = (r: FraudReport, decision: "uphold" | "dismiss") => {
    const id = String(r.id || r._id);
    const key = `fraud:${id}`;
    return runAction(key, () => resolveFraudReport(id, decision, notes[key] || undefined), refetchFraud);
  };

  const resolveRequestRow = (r: InstitutionRequest, status: "reviewing" | "onboarded" | "declined") => {
    const id = String(r.id || r._id);
    return runAction(`request:${id}`, () => resolveInstitutionRequest(id, status), refetchRequests);
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login");
  };

  // ── Derived counts (Overview + sidebar badges) ──
  const awaitingVetting = issuers.filter((i) => ACTIONABLE_STATUSES.includes(i.verificationStatus)).length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  const q = searchQuery.trim().toLowerCase();
  const match = (...fields: Array<string | undefined | null>) =>
    !q || fields.some((f) => (f || "").toLowerCase().includes(q));

  const shownIssuers = issuers.filter((i) => match(i.name, i.email, i.lockedDomain, i.verificationStatus));
  const shownDisputes = disputes.filter((d) => match(d.title, d.issuer, d.student, d.reason));
  const shownFraud = fraudReports.filter((r) => match(r.title, r.issuer, r.student, r.reporter, r.reason));
  const shownRequests = requests.filter((r) => match(r.displayName, r.website ?? undefined, r.status));

  const navGroups: NavGroup[] = [
    {
      label: "PLATFORM ADMIN",
      items: [
        { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "issuers", label: "Issuer Vetting", icon: <Building2 className="w-4 h-4" strokeWidth={1.75} />, badge: awaitingVetting || undefined },
      ],
    },
    {
      label: "INDEPENDENT REVIEW",
      items: [
        { id: "disputes", label: "Disputes", icon: <Gavel className="w-4 h-4" strokeWidth={1.75} />, badge: disputes.length || undefined },
        { id: "fraud", label: "Fraud Reports", icon: <Flag className="w-4 h-4" strokeWidth={1.75} />, badge: fraudReports.length || undefined },
      ],
    },
    {
      label: "GROWTH",
      items: [
        { id: "institutions", label: "Institution Requests", icon: <Inbox className="w-4 h-4" strokeWidth={1.75} />, badge: pendingRequests || undefined },
      ],
    },
  ];

  return (
    <DashboardShell
      role="verifier"
      user={{
        name: user?.name || "Platform Admin",
        subtitle: user?.email || "CredChain · Admin",
        photo: user?.photo || null,
      }}
      navGroups={navGroups}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as Tab)}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search issuers, disputes, reports…"
      onLogout={handleLogout}
      topbarRightExtra={
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-hash-red/30 text-hash-red text-[11px] font-mono uppercase tracking-wider">
          <ShieldAlert className="w-3 h-3" strokeWidth={2} />
          Admin
        </span>
      }
    >
      {loadState === "loading" && (
        <div className="flex items-center justify-center gap-3 py-24">
          <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />
          <span className="text-sm text-txt-secondary font-mono">Loading admin console…</span>
        </div>
      )}

      {loadState === "forbidden" && <ForbiddenPanel email={user?.email} />}

      {loadState === "error" && (
        <div className="max-w-xl bg-bg-surface border border-hash-red/30 rounded-lg p-6 text-left">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-hash-red flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-semibold text-base text-txt-primary">Failed to load the admin console</h2>
              <p className="text-sm text-txt-secondary mt-1">Every admin queue failed to respond. Check the backend, then retry.</p>
              <button
                type="button"
                onClick={() => { setLoadState("loading"); loadAll(); }}
                className="mt-4 px-4 py-2 rounded-md border border-border-main hover:border-brand-purple text-txt-primary text-xs font-semibold transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {loadState === "ready" && (
        <div className="space-y-6 text-left">
          {msg && (
            <div
              className={`flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
                msg.type === "ok"
                  ? "border-hash-green/30 text-hash-green bg-bg-surface"
                  : "border-hash-red/30 text-hash-red bg-bg-surface"
              }`}
            >
              {msg.type === "ok" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-8">
              <PageHeader
                kicker="PLATFORM CONTROL"
                title="Gatekeeper overview."
                body="Vet issuers (the final cross-match that unlocks issuance) and resolve disputes and fraud reports — the independent backstop of the trust network."
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCell label="ISSUERS AWAITING VETTING" value={String(awaitingVetting)} tone={awaitingVetting > 0 ? "amber" : "neutral"} onClick={() => setActiveTab("issuers")} />
                <StatCell label="OPEN DISPUTES" value={String(disputes.length)} tone={disputes.length > 0 ? "amber" : "neutral"} onClick={() => setActiveTab("disputes")} />
                <StatCell label="OPEN FRAUD REPORTS" value={String(fraudReports.length)} tone={fraudReports.length > 0 ? "red" : "neutral"} onClick={() => setActiveTab("fraud")} />
                <StatCell label="INSTITUTION REQUESTS" value={String(pendingRequests)} tone="neutral" onClick={() => setActiveTab("institutions")} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCell label="VERIFIED ISSUERS" value={String(issuers.filter((i) => i.isVerifiedIssuer).length)} tone="green" onClick={() => setActiveTab("issuers")} />
                <StatCell label="ISSUERS WITH RISK FLAGS" value={String(issuers.filter((i) => (i.riskFlags || []).length > 0).length)} tone="red" onClick={() => setActiveTab("issuers")} />
                <StatCell label="TOTAL ISSUER APPLICATIONS" value={String(issuers.length)} tone="neutral" onClick={() => setActiveTab("issuers")} />
              </div>
              <div className="bg-bg-surface border border-border-main rounded-lg p-5">
                <div className="border-l-2 border-brand-purple pl-4 py-1 text-sm text-txt-secondary leading-relaxed">
                  <span className="font-mono text-[11px] text-txt-muted uppercase tracking-wider block mb-1">// Mandate</span>
                  Both queues are designed so one party can never be judge of its own case: revocation disputes and
                  third-party fraud reports route here — never back to the issuer.
                </div>
              </div>
            </div>
          )}

          {activeTab === "issuers" && (
            <div className="space-y-6">
              <PageHeader
                kicker="TIER-4 REGISTRY CROSS-MATCH"
                title="Issuer vetting."
                body="Issuers that passed domain proof and KYC wait here. Approving runs the registry cross-match → active + verified, which unlocks credential issuance."
              />
              {shownIssuers.length === 0 ? (
                <EmptyState icon={<Building2 className="w-5 h-5" strokeWidth={1.75} />} title="No issuer applications" body="Applications from the onboarding funnel will appear here for final vetting." />
              ) : (
                <IssuerTable
                  issuers={shownIssuers}
                  busyKey={busyKey}
                  notes={notes}
                  onNotesChange={(key, v) => setNotes((p) => ({ ...p, [key]: v }))}
                  onVet={vetIssuer}
                />
              )}
            </div>
          )}

          {activeTab === "disputes" && (
            <div className="space-y-6">
              <PageHeader
                kicker="INDEPENDENT REVIEW · DISPUTES"
                title="Dispute queue."
                body="Students contesting a revoked credential or a vouch attestation. Reinstate if the revocation was wrong; uphold it otherwise."
              />
              {shownDisputes.length === 0 ? (
                <EmptyState icon={<Gavel className="w-5 h-5" strokeWidth={1.75} />} title="No disputes awaiting review" body="The queue is clear. New disputes land here for independent resolution." />
              ) : (
                <div className="space-y-4">
                  {shownDisputes.map((d) => {
                    const id = String(d.id || d._id);
                    const key = `dispute:${id}`;
                    const busy = busyKey === key;
                    const isVouch = d.type === "vouch";
                    return (
                      <QueueCard key={key}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display font-semibold text-[15px] text-txt-primary">{d.title}</span>
                              <Chip tone={isVouch ? "purple" : "neutral"}>{isVouch ? "VOUCH" : "CREDENTIAL"}</Chip>
                            </div>
                            <p className="text-xs text-txt-secondary mt-1">
                              {isVouch ? "Vouched by" : "Issued by"}{" "}
                              <span className="text-txt-primary font-medium">{d.issuer || "—"}</span> · disputed by{" "}
                              <span className="text-txt-primary font-medium">{d.student || "—"}</span>
                              {isVouch && d.stakedPoints != null && (
                                <> · <span className="text-txt-primary font-medium">{d.stakedPoints} pts</span> staked</>
                              )}
                            </p>
                          </div>
                          <Chip tone="amber">{timeAgo(d.filedAt)}</Chip>
                        </div>

                        <ReasonBlock reason={d.reason} />
                        <NotesInput value={notes[key] || ""} onChange={(v) => setNotes((p) => ({ ...p, [key]: v }))} disabled={busy} />

                        <div className="flex flex-wrap gap-2 pt-1">
                          <ActionButton tone="primary" busy={busy} icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => resolveDisputeRow(d, "reinstate")}>
                            {isVouch ? "Reinstate vouch (return stake)" : "Reinstate credential"}
                          </ActionButton>
                          <ActionButton tone="danger" busy={busy} icon={<ShieldX className="w-3.5 h-3.5" />} onClick={() => resolveDisputeRow(d, "uphold")}>
                            {isVouch ? "Uphold (forfeit stake)" : "Uphold revocation"}
                          </ActionButton>
                        </div>
                      </QueueCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "fraud" && (
            <div className="space-y-6">
              <PageHeader
                kicker="INDEPENDENT REVIEW · FRAUD"
                title="Fraud report queue."
                body="Third parties alleging a credential was fraudulently issued. Upholding revokes the credential and cascades penalties to the holder and the issuer."
              />
              {shownFraud.length === 0 ? (
                <EmptyState icon={<Flag className="w-5 h-5" strokeWidth={1.75} />} title="No fraud reports under review" body="Third-party fraud reports route here — never back to the issuer." />
              ) : (
                <div className="space-y-4">
                  {shownFraud.map((r) => {
                    const id = String(r.id || r._id);
                    const key = `fraud:${id}`;
                    const busy = busyKey === key;
                    return (
                      <QueueCard key={key}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display font-semibold text-[15px] text-txt-primary">{r.title}</span>
                              {r.trustTier && <Chip tone="neutral">{r.trustTier.toUpperCase()}</Chip>}
                            </div>
                            <p className="text-xs text-txt-secondary mt-1">
                              Issued by <span className="text-txt-primary font-medium">{r.issuer || "—"}</span> · held by{" "}
                              <span className="text-txt-primary font-medium">{r.student || "—"}</span> · reported by{" "}
                              <span className="text-txt-primary font-medium">{r.reporter || "A platform user"}</span>
                              {r.reporterRole ? <span className="text-txt-muted"> ({r.reporterRole})</span> : null}
                            </p>
                          </div>
                          <Chip tone="red">{timeAgo(r.filedAt)}</Chip>
                        </div>

                        <ReasonBlock reason={r.reason} />
                        <NotesInput value={notes[key] || ""} onChange={(v) => setNotes((p) => ({ ...p, [key]: v }))} disabled={busy} />

                        <div className="flex flex-wrap gap-2 pt-1">
                          <ActionButton tone="danger" busy={busy} icon={<ShieldX className="w-3.5 h-3.5" />} onClick={() => resolveFraudRow(r, "uphold")}>
                            Uphold — revoke & penalize
                          </ActionButton>
                          <ActionButton tone="ghost" busy={busy} icon={<X className="w-3.5 h-3.5" />} onClick={() => resolveFraudRow(r, "dismiss")}>
                            Dismiss — credential stands
                          </ActionButton>
                        </div>
                      </QueueCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "institutions" && (
            <div className="space-y-6">
              <PageHeader
                kicker="DEMAND SIGNAL"
                title="Institution requests."
                body="Schools and employers candidates have asked for, most-wanted first. Mark each as reviewing, onboarded, or declined."
              />
              {shownRequests.length === 0 ? (
                <EmptyState icon={<Inbox className="w-5 h-5" strokeWidth={1.75} />} title="No institution requests yet" body="When candidates ask for an institution that isn't listed, the demand shows up here — ranked by how many want it." />
              ) : (
                <div className="space-y-4">
                  {shownRequests.map((r) => {
                    const id = String(r.id || r._id);
                    const key = `request:${id}`;
                    const busy = busyKey === key;
                    const done = r.status === "onboarded" || r.status === "declined";
                    return (
                      <QueueCard key={key}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-md bg-brand-purple-soft text-brand-purple border border-border-main flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-display font-semibold text-[15px] text-txt-primary truncate">{r.displayName}</div>
                              <p className="text-xs text-txt-secondary mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="inline-flex items-center gap-1 text-txt-primary font-medium">
                                  <Users className="w-3.5 h-3.5" /> {r.requestCount} request{r.requestCount === 1 ? "" : "s"}
                                </span>
                                {r.website && (
                                  <a
                                    href={/^https?:\/\//.test(r.website) ? r.website : `https://${r.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-0.5 text-brand-purple hover:underline"
                                  >
                                    {r.website} <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {r.lastRequestedAt && <span className="text-txt-muted">· last asked {timeAgo(r.lastRequestedAt)}</span>}
                              </p>
                            </div>
                          </div>
                          <Chip tone={r.status === "onboarded" ? "green" : r.status === "reviewing" ? "purple" : r.status === "declined" ? "neutral" : "amber"}>
                            {r.status.toUpperCase()}
                          </Chip>
                        </div>

                        {!done && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {r.status !== "reviewing" && (
                              <ActionButton tone="ghost" busy={busy} icon={<Eye className="w-3.5 h-3.5" />} onClick={() => resolveRequestRow(r, "reviewing")}>
                                Mark reviewing
                              </ActionButton>
                            )}
                            <ActionButton tone="primary" busy={busy} icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => resolveRequestRow(r, "onboarded")}>
                              Mark onboarded
                            </ActionButton>
                            <ActionButton tone="ghost" busy={busy} icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => resolveRequestRow(r, "declined")}>
                              Decline
                            </ActionButton>
                          </div>
                        )}
                      </QueueCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Issuer vetting table
// ─────────────────────────────────────────────────────────────

function IssuerTable({
  issuers,
  busyKey,
  notes,
  onNotesChange,
  onVet,
}: {
  issuers: AdminIssuer[];
  busyKey: string | null;
  notes: Record<string, string>;
  onNotesChange: (key: string, v: string) => void;
  onVet: (issuer: AdminIssuer, matched: boolean) => void;
}) {
  return (
    <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[820px]">
          <thead className="bg-bg-sunken text-txt-muted uppercase font-mono text-[10px] border-b border-border-main">
            <tr>
              <th className="p-4 pl-5">Issuer</th>
              <th className="p-4">Type · Domain</th>
              <th className="p-4">Funnel Status</th>
              <th className="p-4">Signals</th>
              <th className="p-4 text-right pr-5">Registry Cross-Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {issuers.map((i) => {
              const id = String(i.userId || i._id);
              const key = `issuer:${id}`;
              const busy = busyKey === key;
              const actionable = ACTIONABLE_STATUSES.includes(i.verificationStatus);
              return (
                <tr key={id} className="align-top hover:bg-bg-elevated/40 transition-colors">
                  <td className="p-4 pl-5">
                    <div className="font-semibold text-txt-primary">{i.name}</div>
                    <div className="text-txt-muted font-mono mt-0.5">{i.email}</div>
                  </td>
                  <td className="p-4 text-txt-secondary">
                    <div className="capitalize">{i.institutionType || "—"}</div>
                    <div className="font-mono text-txt-muted mt-0.5">{i.lockedDomain || "—"}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      <Chip tone={i.verificationStatus === "active" ? "green" : actionable ? "amber" : "neutral"}>
                        {i.verificationStatus?.toUpperCase() || "—"}
                      </Chip>
                      {i.isVerifiedIssuer && <Chip tone="green">VERIFIED</Chip>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-txt-secondary">
                      KYC: <span className="font-mono">{i.kycStatus || "none"}</span>
                      {i.domainAgeMonths != null ? <span className="text-txt-muted"> · domain {i.domainAgeMonths}mo</span> : null}
                    </div>
                    {(i.riskFlags || []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(i.riskFlags || []).map((f) => (
                          <span key={f} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-hash-red/30 text-hash-red text-[10px] font-mono">
                            <AlertTriangle className="w-3 h-3" /> {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4 pr-5">
                    {actionable ? (
                      <div className="flex flex-col items-end gap-2">
                        <input
                          type="text"
                          value={notes[key] || ""}
                          onChange={(e) => onNotesChange(key, e.target.value)}
                          disabled={busy}
                          placeholder="Reviewer notes (optional)"
                          className="w-full max-w-[220px] bg-bg-sunken border border-border-main rounded-md px-2.5 py-1.5 text-[11px] text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple transition-colors disabled:opacity-50"
                        />
                        <div className="flex gap-2">
                          <ActionButton tone="primary" busy={busy} icon={<Check className="w-3.5 h-3.5" />} onClick={() => onVet(i, true)}>
                            Approve
                          </ActionButton>
                          <ActionButton tone="danger" busy={busy} icon={<X className="w-3.5 h-3.5" />} onClick={() => onVet(i, false)}>
                            Reject
                          </ActionButton>
                        </div>
                      </div>
                    ) : i.isVerifiedIssuer ? (
                      <span className="inline-flex items-center gap-1 text-hash-green font-mono text-[11px] justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-txt-muted font-mono text-[11px]">Awaiting prior tiers</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Local UI atoms (match the VerifierDashboard idiom)
// ─────────────────────────────────────────────────────────────

function ForbiddenPanel({ email }: { email?: string }) {
  return (
    <div className="max-w-xl bg-bg-surface border border-role-verifier/40 rounded-lg p-6 text-left">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-role-verifier flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-2">ACCESS DENIED · 403</div>
          <h2 className="font-display font-bold text-lg text-txt-primary">Admins only</h2>
          <p className="text-sm text-txt-secondary mt-2 leading-relaxed">
            This account isn't on the{" "}
            <code className="px-1 py-0.5 rounded-sm bg-bg-sunken border border-border-subtle font-mono text-[12px] text-txt-primary">ADMIN_EMAILS</code>{" "}
            allowlist in the backend <code className="px-1 py-0.5 rounded-sm bg-bg-sunken border border-border-subtle font-mono text-[12px] text-txt-primary">.env</code>.
            Add your email there (comma-separated) and sign in again to vet issuers and resolve disputes.
          </p>
          {email && (
            <div className="mt-4 bg-bg-sunken border border-border-main rounded-md px-3 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-txt-muted block mb-1">Signed in as</span>
              <span className="font-mono text-sm text-txt-primary">{email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageHeader({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <div className="max-w-3xl">
      <div className="border-l-2 border-brand-purple pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
        {kicker}
      </div>
      <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">{title}</h1>
      {body && <p className="text-sm text-txt-secondary mt-1 leading-relaxed">{body}</p>}
    </div>
  );
}

function StatCell({
  label,
  value,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "amber" | "green" | "red";
  onClick?: () => void;
}) {
  const valueClass =
    tone === "amber" ? "text-role-verifier" : tone === "green" ? "text-hash-green" : tone === "red" ? "text-hash-red" : "text-txt-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-bg-surface border border-border-main hover:border-border-strong rounded-lg p-5 text-left transition-colors cursor-pointer"
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">{label}</div>
      <div className={`font-display font-bold text-[28px] leading-none mt-3 ${valueClass}`}>{value}</div>
    </button>
  );
}

function QueueCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg-surface border border-border-main hover:border-border-strong rounded-lg p-5 space-y-4 transition-colors">
      {children}
    </div>
  );
}

function Chip({ tone, children }: { tone: "neutral" | "green" | "red" | "amber" | "purple"; children: ReactNode }) {
  const cls =
    tone === "green"
      ? "text-hash-green border-hash-green/30"
      : tone === "red"
      ? "text-hash-red border-hash-red/30"
      : tone === "amber"
      ? "text-role-verifier border-role-verifier/30"
      : tone === "purple"
      ? "text-brand-purple border-brand-purple/30"
      : "text-txt-secondary border-border-main";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-wider whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

function ReasonBlock({ reason }: { reason?: string }) {
  return (
    <div className="flex items-start gap-2 bg-bg-sunken border border-border-subtle rounded-md px-3 py-2.5 text-sm text-txt-secondary">
      <Quote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-txt-muted" />
      <span className="italic">{reason || "No reason provided."}</span>
    </div>
  );
}

function NotesInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Resolution notes (optional, recorded with the decision)"
      className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple transition-colors disabled:opacity-50"
    />
  );
}

function ActionButton({
  tone,
  busy,
  icon,
  onClick,
  children,
}: {
  tone: "primary" | "danger" | "ghost";
  busy?: boolean;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  const cls =
    tone === "primary"
      ? "bg-brand-purple hover:bg-brand-purple-dim text-white border border-transparent"
      : tone === "danger"
      ? "border border-hash-red/40 text-hash-red hover:bg-hash-red/10"
      : "border border-border-main text-txt-secondary hover:text-txt-primary hover:border-border-strong";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}

function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="text-center py-16 px-6 bg-bg-surface border border-dashed border-border-main rounded-lg">
      <div className="w-12 h-12 rounded-md border border-border-main bg-bg-sunken text-txt-muted flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-base text-txt-primary mb-1">{title}</h3>
      <p className="text-xs text-txt-secondary max-w-sm mx-auto">{body}</p>
    </div>
  );
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
