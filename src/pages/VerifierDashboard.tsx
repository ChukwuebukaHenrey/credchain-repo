import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Search,
  Bookmark,
  User,
  SlidersHorizontal,
  LifeBuoy,
  Key,
  FileText,
  Check,
  Signal,
  Loader2,
  MessageSquare,
  Sparkles,
  Trophy,
  Coins,
} from "lucide-react";
import DashboardShell, { NavGroup } from "../components/DashboardShell";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket, getSocket } from "../services/socket";
import {
  searchTalent,
  getTalentFeed,
  getChatRooms,
  initializeChat,
  sendChatMessageV1,
  getMyBounties,
} from "../services/api";
import { TalentEntry, normalizeTalent, useShortlist } from "../components/verifier/talent";
import TalentCard from "../components/verifier/TalentCard";
import ChatDrawer, { ChatRoom, roomCounterpart } from "../components/verifier/ChatDrawer";
import BountiesTab, { Bounty } from "../components/verifier/BountiesTab";

type Tab = "verify" | "shortlist" | "bounties" | "logs" | "api" | "settings" | "help";

// Backend trust-tier vocabulary (minimum-tier filter): learner → practitioner →
// proven_practitioner → expert → master. Empty string = any tier.
const TIER_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Any tier" },
  { value: "learner", label: "Learner+" },
  { value: "practitioner", label: "Practitioner+" },
  { value: "proven_practitioner", label: "Proven practitioner+" },
  { value: "expert", label: "Expert+" },
  { value: "master", label: "Master" },
];

export default function VerifierDashboard() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const myUserId = authUser?.id || "";
  const [activeTab, setActiveTab] = useState<Tab>("verify");
  const [searchQuery, setSearchQuery] = useState("");
  const [query, setQuery] = useState("");

  // ── Display identity from AuthContext (no raw localStorage parsing) ──
  const verifierUser = useMemo(() => {
    const name = authUser?.name || "Verifier";
    const comp = authUser?.company || "CredChain";
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || "")
      .join("");
    return {
      name,
      subtitle: `${comp} · Verifier`,
      initials: initials || "VF",
      photo: authUser?.photo || localStorage.getItem("credchain_profile_photo"),
    };
  }, [authUser]);

  useEffect(() => {
    localStorage.setItem("credchain_role", "verifier");
  }, []);

  // ── Talent search (GET /api/v1/talent/search) ──
  const [talentQuery, setTalentQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [results, setResults] = useState<TalentEntry[]>([]);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const runTalentSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearching(true);
    setSearchError(null);
    try {
      const res: any = await searchTalent({ q: talentQuery.trim() || undefined, tier: tierFilter || undefined, limit: 12 });
      // Backend returns { students, total, page, pages } (not `results`).
      const list = Array.isArray(res?.students) ? res.students : Array.isArray(res?.results) ? res.results : [];
      setResults(list.map(normalizeTalent).filter((t: TalentEntry) => t.userId));
      setResultsTotal(typeof res?.total === "number" ? res.total : list.length);
      setSearched(true);
    } catch (err: any) {
      setSearchError(err?.message || "Talent search failed.");
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  // ── Discover feed (GET /api/v1/employer/talent-feed) ──
  const [feed, setFeed] = useState<TalentEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [chatCredits, setChatCredits] = useState<number | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res: any = await getTalentFeed();
      const list = Array.isArray(res?.students) ? res.students : [];
      setFeed(list.map(normalizeTalent).filter((t: TalentEntry) => t.userId));
      if (typeof res?.chatCreditsRemaining === "number") setChatCredits(res.chatCreditsRemaining);
      setFeedError(null);
    } catch (err: any) {
      setFeedError(err?.message || "Failed to load the talent feed.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // ── Chat (rooms + socket) ──
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [chatNotice, setChatNotice] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res: any = await getChatRooms();
      const raw = Array.isArray(res?.rooms) ? res.rooms : [];
      // Backend shapes rooms as {id, otherParticipant:{id,name,role}, messages,
      // isUnlocked, iInitiated} — normalize to the drawer's {_id, participants[]}
      // shape (reading r._id directly yields undefined → "Invalid roomId" on send).
      setRooms(
        raw.map((r: any) => ({
          _id: String(r._id || r.id || ""),
          participants: Array.isArray(r.participants)
            ? r.participants
            : [
                { _id: String(r.otherParticipant?.id || ""), name: r.otherParticipant?.name, role: r.otherParticipant?.role },
                { _id: String(myUserId) },
              ],
          messages: Array.isArray(r.messages) ? r.messages : [],
          isUnlocked: Boolean(r.isUnlocked),
          iInitiated: Boolean(r.iInitiated),
        }))
      );
    } catch {
      /* rooms stay as-is; drawer shows its own empty state */
    } finally {
      setRoomsLoading(false);
    }
  }, [myUserId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Live chat: a student's first reply unlocks the room + refunds the credit,
  // so refetch both rooms and the feed (for the updated credit count).
  useEffect(() => {
    const socket = getSocket();
    const onMessage = () => {
      fetchRooms();
      fetchFeed();
    };
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:message", onMessage);
    };
  }, [fetchRooms, fetchFeed]);

  // "Message" on a talent card: reuse an existing room with that candidate, or
  // spend a credit via POST /api/v1/chat/initialize.
  const handleMessage = async (entry: TalentEntry) => {
    setChatNotice(null);
    const existing = rooms.find((r) => r.participants?.some((p) => String(p._id) === entry.userId));
    if (existing) {
      setActiveRoomId(existing._id);
      setChatOpen(true);
      return;
    }
    setMessagingId(entry.userId);
    try {
      const res: any = await initializeChat(entry.userId);
      await fetchRooms();
      await fetchFeed(); // credit count changed
      const roomId = res?.room?._id || res?.room?.id || null;
      setActiveRoomId(roomId);
      setChatOpen(true);
    } catch (err: any) {
      const outOfCredits = err?.status === 402 || /credit/i.test(err?.message || "");
      setChatNotice(
        outOfCredits
          ? "You're out of chat credits. Credits are refunded when a candidate replies — or wait for your monthly allowance to reset."
          : err?.message || "Couldn't start the conversation."
      );
      setChatOpen(true);
      setActiveRoomId(null);
    } finally {
      setMessagingId(null);
    }
  };

  const handleSendMessage = async (roomId: string, text: string) => {
    await sendChatMessageV1(roomId, text);
    await fetchRooms();
  };

  // ── Bounties (GET /api/v1/bounties/mine) ──
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [bountiesLoading, setBountiesLoading] = useState(true);
  const [bountiesError, setBountiesError] = useState<string | null>(null);

  const fetchBounties = useCallback(async () => {
    try {
      const res: any = await getMyBounties();
      const list = Array.isArray(res?.bounties) ? res.bounties : [];
      setBounties(list.map((b: any) => ({ ...b, id: String(b.id || b._id) })));
      setBountiesError(null);
    } catch (err: any) {
      setBountiesError(err?.message || "Failed to load your bounties.");
    } finally {
      setBountiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  // ── Shortlist (starred candidates, localStorage) ──
  const { shortlist, isShortlisted, toggleShortlist } = useShortlist();

  // ── Activity log: client-side assembly from rooms + bounties ──
  const activityLog = useMemo(() => {
    const entries: Array<{ id: string; label: string; detail: string; at: string | undefined; kind: string }> = [];
    for (const room of rooms) {
      const other = roomCounterpart(room, myUserId);
      const first = room.messages?.[0];
      entries.push({
        id: `room-${room._id}`,
        label: `Messaged ${other?.name || "a candidate"}`,
        detail: room.isUnlocked ? "Room unlocked — credit refunded" : "Awaiting first reply",
        at: first?.sentAt,
        kind: "chat",
      });
    }
    for (const b of bounties) {
      entries.push({
        id: `bounty-${b.id}`,
        label: `Bounty posted: ${b.title}`,
        detail: `${b.reward || (b.rewardUSD ? `$${b.rewardUSD.toLocaleString()}` : "")} · ${b.status.replace("_", " ")}`,
        at: b.createdAt,
        kind: "bounty",
      });
      if (b.status === "completed") {
        entries.push({
          id: `bounty-${b.id}-done`,
          label: `Delivery confirmed: ${b.title}`,
          detail: "Escrow released & credential minted",
          at: undefined,
          kind: "confirm",
        });
      }
    }
    return entries.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  }, [rooms, bounties, myUserId]);

  const filteredActivity = activityLog.filter(
    (e) =>
      searchQuery === "" ||
      e.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.detail.toLowerCase().includes(searchQuery.toLowerCase())
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

  const unlockedRooms = rooms.filter((r) => r.isUnlocked).length;

  const navGroups: NavGroup[] = [
    {
      label: "VERIFICATION DESK",
      items: [
        { id: "verify", label: "Search & Verify", icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "shortlist", label: "Saved Shortlist", icon: <Bookmark className="w-4 h-4" strokeWidth={1.75} />, badge: shortlist.length },
        { id: "bounties", label: "Bounties", icon: <Trophy className="w-4 h-4" strokeWidth={1.75} />, badge: bounties.length || undefined },
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
      notificationCount={unlockedRooms || undefined}
      onLogout={handleLogout}
      topbarRightExtra={
        <>
          <button
            type="button"
            onClick={() => {
              setChatOpen(true);
              setActiveRoomId(null);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-main hover:border-role-verifier text-txt-secondary hover:text-txt-primary text-[11px] font-mono transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3 h-3 text-role-verifier" />
            Chat{typeof chatCredits === "number" ? ` · ${chatCredits} credits` : ""}
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-main text-txt-secondary text-[11px] font-mono">
            <Signal className="w-2.5 h-2.5 text-hash-green animate-pulse-custom" />
            Solana Mainnet
          </span>
        </>
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
            <StatCell label="CHAT CREDITS" value={typeof chatCredits === "number" ? String(chatCredits) : "—"} tone="role" />
            <StatCell label="CONVERSATIONS" value={String(rooms.length)} />
            <StatCell label="SAVED SHORTLIST" value={String(shortlist.length)} />
            <StatCell label="ACTIVE BOUNTIES" value={String(bounties.filter((b) => !["completed", "cancelled"].includes(b.status)).length)} tone="green" />
          </div>

          {/* ── Talent search (live /api/v1/talent/search) ── */}
          <div className="space-y-4 text-left">
            <div>
              <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                TALENT SEARCH
              </div>
              <h2 className="font-display font-bold text-[22px] text-txt-primary tracking-tight">
                Search verified talent.
              </h2>
              <p className="text-sm text-txt-secondary mt-1">
                Query candidates by skill or name, filtered by trust tier. Every result is backed by on-chain credentials.
              </p>
            </div>

            <form onSubmit={runTalentSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="text"
                  value={talentQuery}
                  onChange={(e) => setTalentQuery(e.target.value)}
                  placeholder="Skill, name, or keyword — e.g. React, Solana…"
                  className="w-full bg-bg-surface border border-border-main pl-9 pr-3 py-2.5 rounded-md text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-verifier transition-colors"
                />
              </div>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-bg-surface border border-border-main rounded-md px-3 py-2.5 text-sm text-txt-primary focus:outline-none focus:border-role-verifier transition-colors cursor-pointer"
              >
                {TIER_FILTERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {searching ? "Searching…" : "Search talent"}
              </button>
            </form>

            {searchError && <div className="text-hash-red text-xs">{searchError}</div>}

            {searched && !searching && !searchError && (
              results.length === 0 ? (
                <div className="text-txt-muted text-sm py-10 text-center border border-dashed border-border-main rounded-lg">
                  No candidates matched — try a broader query or drop the tier filter.
                </div>
              ) : (
                <>
                  <div className="text-[11px] font-mono text-txt-muted">
                    {resultsTotal} candidate{resultsTotal === 1 ? "" : "s"} found
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map((t) => (
                      <TalentCard
                        key={t.userId}
                        entry={t}
                        shortlisted={isShortlisted(t.userId)}
                        onToggleShortlist={toggleShortlist}
                        onMessage={handleMessage}
                        messaging={messagingId}
                      />
                    ))}
                  </div>
                </>
              )
            )}
          </div>

          {/* ── Discover talent feed (live /api/v1/employer/talent-feed) ── */}
          <div className="space-y-4 text-left">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
                  DISCOVER TALENT
                </div>
                <h2 className="font-display font-bold text-[22px] text-txt-primary tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-role-verifier" strokeWidth={1.75} />
                  Top-ranked candidates.
                </h2>
                <p className="text-sm text-txt-secondary mt-1">
                  Ranked by CredScore across the network — refreshed as candidates earn new credentials.
                </p>
              </div>
              {typeof chatCredits === "number" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-main text-txt-secondary text-[11px] font-mono">
                  <Coins className="w-3 h-3 text-role-verifier" />
                  {chatCredits} chat credit{chatCredits === 1 ? "" : "s"} remaining
                </span>
              )}
            </div>

            {feedLoading ? (
              <div className="text-txt-muted text-sm py-10 text-center font-mono">Loading talent feed…</div>
            ) : feedError ? (
              <div className="text-hash-red text-sm py-10 text-center border border-dashed border-hash-red/30 rounded-lg">{feedError}</div>
            ) : feed.length === 0 ? (
              <div className="text-txt-muted text-sm py-10 text-center border border-dashed border-border-main rounded-lg">
                The talent feed is empty right now — check back as candidates verify credentials.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {feed.map((t) => (
                  <TalentCard
                    key={t.userId}
                    entry={t}
                    shortlisted={isShortlisted(t.userId)}
                    onToggleShortlist={toggleShortlist}
                    onMessage={handleMessage}
                    messaging={messagingId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "shortlist" && (
        <div className="space-y-8 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              SAVED CANDIDATES
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Verified talent pool.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Candidates you've starred from search and the talent feed. Saved locally to this browser.
            </p>
          </div>

          {shortlist.filter((c) => talentFilterMatch(c, searchQuery)).length === 0 ? (
            <EmptyState
              title={shortlist.length === 0 ? "Your shortlist is empty" : "No candidates match your search"}
              body="Star candidates from Search & Verify or the talent feed to build your shortlist."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shortlist
                .filter((c) => talentFilterMatch(c, searchQuery))
                .map((t) => (
                  <TalentCard
                    key={t.userId}
                    entry={t}
                    shortlisted={isShortlisted(t.userId)}
                    onToggleShortlist={toggleShortlist}
                    onMessage={handleMessage}
                    messaging={messagingId}
                  />
                ))}
            </div>
          )}

          {/* Feed suggestions under the shortlist */}
          {feed.length > 0 && (
            <div className="space-y-4">
              <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase">
                SUGGESTED FROM THE TALENT FEED
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {feed
                  .filter((t) => !isShortlisted(t.userId))
                  .slice(0, 6)
                  .map((t) => (
                    <TalentCard
                      key={t.userId}
                      entry={t}
                      shortlisted={false}
                      onToggleShortlist={toggleShortlist}
                      onMessage={handleMessage}
                      messaging={messagingId}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "bounties" && (
        <BountiesTab bounties={bounties} loading={bountiesLoading} error={bountiesError} refetch={fetchBounties} />
      )}

      {activeTab === "logs" && (
        <div className="space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              ACCOUNT ACTIVITY
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              Activity log.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Assembled client-side from your conversations and bounties — outreach, postings, and escrow releases.
            </p>
          </div>

          {filteredActivity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              body="Message candidates or post bounties — your actions show up here as a running log."
            />
          ) : (
            <div className="bg-bg-surface border border-border-main rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[560px]">
                  <thead className="bg-bg-sunken text-txt-muted uppercase font-mono text-[10px] border-b border-border-main">
                    <tr>
                      <th className="p-4 pl-5">Activity</th>
                      <th className="p-4">Detail</th>
                      <th className="p-4 text-right pr-5">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filteredActivity.map((e) => (
                      <tr key={e.id} className="hover:bg-bg-elevated/40 transition-colors">
                        <td className="p-4 pl-5 font-semibold text-txt-primary">
                          <span className="inline-flex items-center gap-2">
                            {e.kind === "chat" ? (
                              <MessageSquare className="w-3.5 h-3.5 text-role-verifier flex-shrink-0" />
                            ) : e.kind === "confirm" ? (
                              <Check className="w-3.5 h-3.5 text-hash-green flex-shrink-0" />
                            ) : (
                              <Trophy className="w-3.5 h-3.5 text-role-verifier flex-shrink-0" />
                            )}
                            {e.label}
                          </span>
                        </td>
                        <td className="p-4 text-txt-secondary">{e.detail}</td>
                        <td className="p-4 text-right pr-5 font-mono text-txt-muted">
                          {e.at ? new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">
                  Live secret verifier key
                </label>
                <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-role-verifier/30 text-role-verifier text-[10px] font-mono uppercase font-semibold">
                  Coming soon
                </span>
              </div>
              <div className="flex items-center gap-2 bg-bg-sunken border border-border-main rounded-md p-3 font-mono text-[13px] text-txt-muted">
                <span className="flex-1 truncate">Programmatic API access is not yet available for verifier accounts.</span>
              </div>
            </div>

            <div className="bg-bg-sunken border border-border-main rounded-md p-4 font-mono text-[12px] text-txt-secondary space-y-1">
              <div className="text-txt-muted">{"// SDK preview — publishing alongside API access"}</div>
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
            <ReadOnlyField label="Organization Name" value={authUser?.company || verifierUser.name} />
            <ReadOnlyField label="Account Email" value={authUser?.email || "—"} mono />
            <ReadOnlyField
              label="Verifier Account ID"
              value={myUserId || "—"}
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

      {/* Chat drawer — available from any tab */}
      <ChatDrawer
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setChatNotice(null);
        }}
        rooms={rooms}
        loading={roomsLoading}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        myUserId={myUserId}
        onSend={handleSendMessage}
        notice={chatNotice}
        chatCredits={chatCredits}
      />
    </DashboardShell>
  );
}

function talentFilterMatch(t: TalentEntry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    t.name.toLowerCase().includes(needle) ||
    (t.headline || "").toLowerCase().includes(needle) ||
    t.skillTags.some((s) => s.toLowerCase().includes(needle))
  );
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
