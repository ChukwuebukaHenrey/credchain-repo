import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bookmark,
  User,
  SlidersHorizontal,
  LifeBuoy,
  Key,
  FileText,
  Check,
  MessageSquare,
  Trophy,
} from "lucide-react";
import DashboardShell, { NavGroup } from "../components/DashboardShell";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket, getSocket } from "../services/socket";
import {
  getTalentFeed,
  getChatRooms,
  initializeChat,
  sendChatMessageV1,
  getMyBounties,
} from "../services/api";
import { TalentEntry, normalizeTalent, useShortlist } from "../components/verifier/talent";
import TalentCard from "../components/verifier/TalentCard";
import FindTalentTab from "../components/verifier/FindTalentTab";
import { TALENT_FEED, TalentProfile } from "../components/verifier/talentData";
import { getPortraitFor } from "../lib/portraits";
import ChatDrawer, { ChatRoom, roomCounterpart } from "../components/verifier/ChatDrawer";
import BountiesTab, { Bounty } from "../components/verifier/BountiesTab";
import { getAvatarFor, saveAvatar, validateAvatarFile, readAvatarFile } from "../lib/avatars";

type Tab = "talent" | "shortlist" | "bounties" | "chats" | "logs" | "api" | "settings" | "help";

export default function VerifierDashboard() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const myUserId = authUser?.id || "";
  const [activeTab, setActiveTab] = useState<Tab>("talent");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Display identity from AuthContext (no raw localStorage parsing) ──
  // avatarVersion bumps after an upload so the memo re-reads localStorage.
  const [avatarVersion, setAvatarVersion] = useState(0);
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
      photo:
        getAvatarFor({ id: myUserId || "demo-verifier", email: authUser?.email, name }) ||
        authUser?.photo ||
        localStorage.getItem("credchain_profile_photo"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, myUserId, avatarVersion]);

  // Client-side avatar upload — data-URL under cc_avatar_<userId>, per-browser.
  const handleAvatarSelect = async (file: File) => {
    const error = validateAvatarFile(file);
    if (error) {
      alert(error);
      return;
    }
    try {
      const dataUrl = await readAvatarFile(file);
      saveAvatar(myUserId || "demo-verifier", dataUrl);
      setAvatarVersion((v) => v + 1);
    } catch (err: any) {
      alert(err?.message || "Could not read the selected image.");
    }
  };

  useEffect(() => {
    localStorage.setItem("credchain_role", "verifier");
  }, []);

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

  // "Send message" from a Find Talent card (monorepo TalentSearch onContact) —
  // same credit-gated initialize flow, adapted from the TalentProfile shape.
  const handleContactProfile = (student: TalentProfile) => {
    handleMessage({
      userId: student.id,
      name: student.name,
      headline: student.headline,
      credScore: student.credScore,
      highestTier: student.highestTier,
      skillTags: student.skillTags,
      university: student.university,
    } as TalentEntry);
  };

  // Toast for Find Talent (assign-task feedback).
  const [talentToast, setTalentToast] = useState<{ message: string; variant: "success" | "danger" } | null>(null);
  const showTalentToast = (message: string, variant: "success" | "danger") => {
    setTalentToast({ message, variant });
    setTimeout(() => setTalentToast(null), 3200);
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

  // Shortlist suggestions: same profile pool as Find Talent (TALENT_FEED),
  // topped up with live feed entries when available. Highest CredScore first.
  const suggestions = useMemo(() => {
    const fromPool: TalentEntry[] = TALENT_FEED.map((p) => ({
      userId: p.id,
      name: p.name,
      headline: p.headline,
      credScore: p.credScore,
      highestTier: p.highestTier,
      skillTags: p.skillTags,
      university: p.university,
      location: [p.location?.city, p.location?.country].filter(Boolean).join(", ") || undefined,
      // Seed id doubles as the public CredChain id so "View profile" links to a
      // real public portfolio at /verify/:id; portrait keeps the avatar visible.
      credchainId: p.id,
      photo: getPortraitFor(p.name),
      deliveriesCompleted: p.deliveries,
    }));
    const seen = new Set(fromPool.map((t) => t.userId));
    // The live /employer/talent-feed returns a sparse shape ({id, name,
    // credchainId, verified[]}) with no credScore/skills/tier, so those entries
    // normalize to near-empty cards. Only top up with feed entries that carry
    // enough data to render a real suggestion — otherwise an empty shell
    // backfills the slot freed when a rich profile is shortlisted.
    const liveEntries = feed.filter(
      (t) => !seen.has(t.userId) && (typeof t.credScore === "number" || t.skillTags.length > 0)
    );
    const merged = [...fromPool, ...liveEntries];
    return merged
      .filter((t) => !isShortlisted(t.userId))
      .sort((a, b) => (b.credScore || 0) - (a.credScore || 0))
      .slice(0, 6);
  }, [feed, isShortlisted]);

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
        { id: "talent", label: "Find Talent", icon: <Search className="w-4 h-4" strokeWidth={1.75} /> },
        { id: "shortlist", label: "Saved Shortlist", icon: <Bookmark className="w-4 h-4" strokeWidth={1.75} />, badge: shortlist.length },
        { id: "bounties", label: "Bounties", icon: <Trophy className="w-4 h-4" strokeWidth={1.75} />, badge: bounties.length || undefined },
        { id: "chats", label: "Conversations", icon: <MessageSquare className="w-4 h-4" strokeWidth={1.75} />, badge: rooms.length || undefined },
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
      onNotificationsClick={() => setActiveTab("chats")}
      showProfileMenu
      onAvatarSelect={handleAvatarSelect}
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
        </>
      }
    >
      {activeTab === "talent" && (
        <div className="space-y-6">
          <div className="text-left max-w-3xl">
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              TALENT DISCOVERY
            </div>
            <h1 className="font-display font-bold text-[28px] text-txt-primary tracking-tight leading-tight">
              Find talent.
            </h1>
            <p className="font-sans text-txt-secondary scale-base mt-2 leading-relaxed">
              Search verified students and graduates by skill, tier, and delivery history.
            </p>
          </div>
          <FindTalentTab
            onContact={handleContactProfile}
            onInviteToBounty={() => setActiveTab("bounties")}
            onNotify={showTalentToast}
          />
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
              body="Star candidates from Find Talent or the suggestions below to build your shortlist."
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

          {/* Suggestions — same verified pool as Find Talent */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase">
                SUGGESTED CANDIDATES
              </div>
              <p className="text-xs text-txt-secondary -mt-2">
                Top-scoring verified profiles from the talent pool — star one to add it to your shortlist.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                {suggestions.map((t) => (
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

      {activeTab === "chats" && (
        <div className="space-y-6 text-left">
          <div>
            <div className="border-l-2 border-role-verifier pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
              CREDIT-GATED OUTREACH
            </div>
            <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">
              My conversations.
            </h1>
            <p className="text-sm text-txt-secondary mt-1">
              Outreach is refunded the moment a candidate replies.
            </p>
          </div>

          {/* Stats strip (monorepo EmployerPortal: credits / messaged / replied) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCell label="CHAT CREDITS" value={typeof chatCredits === "number" ? String(chatCredits) : "—"} tone="role" />
            <StatCell label="MESSAGED" value={String(rooms.filter((r) => r.iInitiated).length)} />
            <StatCell label="REPLIED" value={String(rooms.filter((r) => r.iInitiated && r.isUnlocked).length)} tone="green" />
          </div>

          {roomsLoading ? (
            <div className="text-txt-muted text-sm py-10 text-center font-mono">Loading conversations…</div>
          ) : rooms.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              body="Message a candidate from Find Talent or the talent feed to start a conversation."
            />
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => {
                const other = roomCounterpart(room, myUserId);
                const last = room.messages?.[room.messages.length - 1];
                return (
                  <button
                    key={room._id}
                    type="button"
                    onClick={() => {
                      setActiveRoomId(room._id);
                      setChatOpen(true);
                    }}
                    className="w-full text-left bg-bg-surface border border-border-main hover:border-border-strong rounded-lg p-4 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-role-verifier-soft text-role-verifier border border-border-main font-mono font-bold text-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {getAvatarFor({ name: other?.name }) ? (
                          <img src={getAvatarFor({ name: other?.name })!} alt={other?.name || "Candidate"} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(other?.name || "?")
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-txt-primary">{other?.name || "Candidate"}</p>
                        <p className="mt-0.5 truncate text-xs text-txt-muted">{last?.text || "No messages yet"}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border flex-shrink-0 ${
                        room.isUnlocked
                          ? "text-hash-green border-hash-green/30"
                          : "text-role-verifier border-role-verifier/30"
                      }`}
                    >
                      {room.isUnlocked ? <Check className="w-3 h-3" strokeWidth={2.5} /> : null}
                      {room.isUnlocked ? "Unlocked" : "Locked"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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

      {/* Toast (Find Talent assign-task feedback) */}
      {talentToast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] px-5 py-3.5 rounded-md bg-bg-surface border border-border-main border-l-2 text-xs font-semibold text-txt-primary ${
            talentToast.variant === "success" ? "border-l-hash-green" : "border-l-hash-red"
          }`}
        >
          {talentToast.message}
        </div>
      )}
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
