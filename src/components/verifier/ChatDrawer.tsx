import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, LockOpen, MessageSquare, Send, X } from "lucide-react";
import { getAvatarFor } from "../../lib/avatars";

// Chat drawer — credit-gated employer↔candidate chat over /api/v1/chat.
// The dashboard owns room fetching + the socket subscription (it also needs
// both for the talent feed and the audit log); this component only renders
// the rooms list / open-room thread and sends messages.

export interface ChatMessage {
  from: string | { _id?: string; name?: string };
  text: string;
  sentAt?: string;
}

export interface ChatRoom {
  _id: string;
  participants: Array<{ _id: string; name?: string; role?: string }>;
  messages: ChatMessage[];
  isUnlocked?: boolean;
  iInitiated?: boolean;
}

function msgFromId(m: ChatMessage): string {
  return typeof m.from === "string" ? m.from : String(m.from?._id || "");
}

export function roomCounterpart(room: ChatRoom, myUserId: string) {
  return room.participants?.find((p) => String(p._id) !== String(myUserId));
}

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Participant avatar — seeded/uploaded image when one matches, else initials. */
function ParticipantAvatar({ name, size = "w-9 h-9" }: { name?: string; size?: string }) {
  const src = getAvatarFor({ name });
  const initials =
    (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "?";
  return (
    <div
      className={`${size} rounded-md bg-role-verifier-soft text-role-verifier border border-border-main font-mono text-xs font-semibold flex items-center justify-center flex-shrink-0 overflow-hidden`}
    >
      {src ? <img src={src} alt={name || "Candidate"} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

export default function ChatDrawer({
  open,
  onClose,
  rooms,
  loading,
  activeRoomId,
  onSelectRoom,
  myUserId,
  onSend,
  notice,
  chatCredits,
}: {
  open: boolean;
  onClose: () => void;
  rooms: ChatRoom[];
  loading: boolean;
  activeRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  myUserId: string;
  /** Resolves when the message is persisted (dashboard refetches rooms after). */
  onSend: (roomId: string, text: string) => Promise<void>;
  /** e.g. out-of-credits warning surfaced by a failed initializeChat. */
  notice?: string | null;
  chatCredits?: number | null;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((r) => r._id === activeRoomId) || null;

  // Keep the thread pinned to the latest message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeRoom?.messages?.length, activeRoomId, open]);

  useEffect(() => {
    setDraft("");
    setSendError(null);
  }, [activeRoomId]);

  if (!open) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeRoom || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await onSend(activeRoom._id, text);
      setDraft("");
    } catch (err: any) {
      setSendError(err?.message || "Message failed to send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[420px] bg-bg-surface border-l border-border-main flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-main flex items-center gap-3">
          {activeRoom && (
            <button
              type="button"
              onClick={() => onSelectRoom(null)}
              aria-label="Back to rooms"
              className="text-txt-muted hover:text-txt-primary p-1 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {activeRoom && (
            <ParticipantAvatar name={roomCounterpart(activeRoom, myUserId)?.name} size="w-8 h-8" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-[15px] text-txt-primary truncate">
              {activeRoom ? roomCounterpart(activeRoom, myUserId)?.name || "Candidate" : "Candidate chat"}
            </div>
            <div className="text-[11px] font-mono text-txt-muted">
              {activeRoom
                ? activeRoom.isUnlocked
                  ? "Unlocked — unlimited messages"
                  : "Locked — awaiting candidate's first reply"
                : typeof chatCredits === "number"
                  ? `${chatCredits} chat credit${chatCredits === 1 ? "" : "s"} remaining`
                  : "Credit-gated messaging"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="text-txt-muted hover:text-txt-primary p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice (e.g. out of credits) */}
        {notice && (
          <div className="mx-5 mt-4 px-3 py-2.5 rounded-md border border-role-verifier/30 bg-role-verifier-soft text-role-verifier text-xs">
            {notice}
          </div>
        )}

        {/* Body */}
        {!activeRoom ? (
          // ── Rooms list ──
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="text-txt-muted text-sm py-12 text-center font-mono">Loading conversations…</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-16 px-6 border border-dashed border-border-main rounded-lg">
                <MessageSquare className="w-6 h-6 text-txt-muted mx-auto mb-3" strokeWidth={1.75} />
                <p className="text-xs text-txt-secondary max-w-[240px] mx-auto">
                  No conversations yet. Use "Message" on a candidate card to start one — it spends one chat credit, refunded when they reply.
                </p>
              </div>
            ) : (
              rooms.map((room) => {
                const other = roomCounterpart(room, myUserId);
                const last = room.messages?.[room.messages.length - 1];
                return (
                  <button
                    key={room._id}
                    type="button"
                    onClick={() => onSelectRoom(room._id)}
                    className="w-full text-left bg-bg-base border border-border-main hover:border-border-strong rounded-lg p-4 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <ParticipantAvatar name={other?.name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm text-txt-primary truncate">{other?.name || "Candidate"}</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-sm border flex-shrink-0 ${
                              room.isUnlocked
                                ? "text-hash-green border-hash-green/30"
                                : "text-role-verifier border-role-verifier/30"
                            }`}
                          >
                            {room.isUnlocked ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {room.isUnlocked ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                        <div className="text-xs text-txt-secondary truncate">
                          {last ? last.text : "No messages yet"}
                        </div>
                        {last?.sentAt && (
                          <div className="text-[10px] font-mono text-txt-muted mt-1">{formatTime(last.sentAt)}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          // ── Open room thread ──
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {(activeRoom.messages || []).length === 0 ? (
                <div className="text-txt-muted text-xs py-12 text-center font-mono">No messages yet — say hello.</div>
              ) : (
                activeRoom.messages.map((m, i) => {
                  const mine = msgFromId(m) === String(myUserId);
                  return (
                    <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                          mine
                            ? "bg-brand-purple text-white rounded-br-sm"
                            : "bg-bg-base border border-border-main text-txt-primary rounded-bl-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        {m.sentAt && (
                          <div className={`text-[10px] font-mono mt-1 ${mine ? "text-white/60" : "text-txt-muted"}`}>
                            {formatTime(m.sentAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {sendError && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-md border border-hash-red/30 text-hash-red text-xs">
                {sendError}
              </div>
            )}

            <form onSubmit={handleSend} className="p-4 border-t border-border-main flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-bg-base border border-border-main rounded-md px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-verifier transition-colors"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
