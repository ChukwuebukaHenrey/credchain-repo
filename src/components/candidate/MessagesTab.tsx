import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Lock, Pin, Send, CheckCircle2 } from "lucide-react";
import { getChatRooms, sendChatMessageV1 } from "../../services/api";
import { connectSocket, getSocket } from "../../services/socket";

// Messages tab — monorepo MessagesInbox parity. Lists conversations from real
// employers. The student's first reply is what UNLOCKS the room and REFUNDS
// the employer's chat credit (token-bucket, backend-enforced). Live via
// Socket.io (chat:message / chat:room-opened).

interface ChatMessage {
  from: string;
  text: string;
}

interface ChatRoom {
  id: string;
  otherParticipant?: { name?: string } | null;
  isUnlocked?: boolean;
  context?: { title?: string } | null;
  messages: ChatMessage[];
}

export default function MessagesTab({ meId }: { meId: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  async function load() {
    try {
      const data: any = await getChatRooms();
      setRooms(data?.rooms || []);
    } catch {
      /* leave as-is */
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    if (!meId) return undefined;
    load();
    connectSocket(meId);
    const socket = getSocket();
    const onMessage = (payload: any) => {
      // Append to the matching room; refresh if it's a room we don't have yet.
      setRooms((prev) => {
        const idx = prev.findIndex((r) => String(r.id) === String(payload.roomId));
        if (idx === -1) {
          load();
          return prev;
        }
        const copy = [...prev];
        copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, { from: payload.from, text: payload.text }] };
        return copy;
      });
    };
    const onOpened = () => load();
    socket.on("chat:message", onMessage);
    socket.on("chat:room-opened", onOpened);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:room-opened", onOpened);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeId) return;
    setText("");
    try {
      const res: any = await sendChatMessageV1(activeId, body);
      setRooms((prev) =>
        prev.map((r) =>
          String(r.id) === String(activeId)
            ? { ...r, messages: [...r.messages, { from: meId, text: body }], isUnlocked: res?.isUnlocked ?? r.isUnlocked }
            : r
        )
      );
    } catch {
      setText(body); // restore on failure
    }
  }

  const active = rooms.find((r) => String(r.id) === String(activeId)) || null;
  const unread = rooms.filter((r) => !r.isUnlocked).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="border-l-2 border-role-candidate pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase mb-3">
          RECRUITER INBOX
        </div>
        <h1 className="font-display font-bold text-[26px] text-txt-primary tracking-tight">Messages.</h1>
        <p className="text-sm text-txt-secondary mt-1">
          Recruiters who found your verified skills. Your first reply unlocks the room.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-border-main bg-bg-surface">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-role-candidate-soft text-role-candidate">
              <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-txt-primary font-display">Messages</h3>
              <p className="text-[11px] text-txt-muted">Recruiters who found your verified skills</p>
            </div>
          </div>
          {unread > 0 && (
            <span className="rounded-full bg-brand-purple text-white px-2 py-0.5 text-[10px] font-bold">{unread}</span>
          )}
        </div>

        {!loaded && (
          <div className="p-5 text-sm font-mono text-txt-muted">Loading conversations…</div>
        )}

        {loaded && rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-md border border-border-main bg-bg-sunken text-txt-muted flex items-center justify-center">
              <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm text-txt-primary">No messages yet</h4>
              <p className="text-xs text-txt-secondary mt-1 max-w-xs mx-auto">
                When a recruiter finds your verified skills, they can message you here.
              </p>
            </div>
          </div>
        )}

        {rooms.length > 0 && (
          <div className="grid sm:grid-cols-[240px_1fr]">
            {/* Room list */}
            <div className="divide-y divide-border-subtle border-b border-border-subtle sm:border-b-0 sm:border-r sm:border-border-subtle">
              {rooms.map((r) => {
                const activeRoom = String(activeId) === String(r.id);
                const name = r.otherParticipant?.name || "Recruiter";
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      activeRoom ? "bg-role-candidate-soft" : "hover:bg-bg-sunken"
                    }`}
                  >
                    <span className="w-8 h-8 shrink-0 rounded-full bg-bg-elevated border border-border-main flex items-center justify-center text-[11px] font-bold text-txt-secondary">
                      {name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase() || "")
                        .join("") || "R"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-txt-primary">{name}</span>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-medium ${
                          r.isUnlocked ? "text-hash-green" : "text-amber-500"
                        }`}
                      >
                        {r.isUnlocked ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> unlocked
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> reply to unlock
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Thread */}
            <div className="p-4">
              {!active ? (
                <p className="py-8 text-center text-sm text-txt-muted">Select a conversation.</p>
              ) : (
                <>
                  {active.context && (
                    <div className="mb-3 flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-sunken px-3 py-1.5 text-xs">
                      <Pin className="w-3 h-3 text-txt-muted" />
                      <span className="text-txt-muted">Re:</span>
                      <span className="font-medium text-brand-purple">{active.context.title}</span>
                    </div>
                  )}
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {active.messages.length === 0 && (
                      <p className="text-center text-xs text-txt-muted">No messages yet.</p>
                    )}
                    {active.messages.map((m, i) => (
                      <div
                        key={i}
                        className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                          String(m.from) === String(meId)
                            ? "ml-auto bg-brand-purple text-white"
                            : "bg-bg-sunken text-txt-primary"
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={send} className="mt-3 flex gap-2">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Reply…"
                      className="h-11 w-full flex-1 rounded-md border border-border-main bg-bg-sunken px-3.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim px-4 text-sm font-semibold text-white transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
