// ─────────────────────────────────────────────────────────────
// CredChain Frontend — ChatPanel (Week 4)
// Live 1:1 chat over the existing Socket.io client. Loads history,
// listens for incoming messages, sends + optimistically renders,
// and cleans up its listener on unmount (no duplicate messages).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { socket, connectSocket, disconnectSocket } from '../services/socket';
import { sendChatMessage, getChatHistory } from '../services/api';
import { getUser } from '../services/auth';

export default function ChatPanel() {
  const user = getUser();
  const userId = user?.id;

  const [messages, setMessages] = useState([]);
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Connect, load history, and subscribe to live messages — once.
  useEffect(() => {
    if (!userId) return undefined;

    connectSocket(userId);

    (async () => {
      try {
        const res = await getChatHistory(userId);
        setMessages(res?.messages || []);
      } catch (err) {
        console.error('[ChatPanel] failed to load history', err);
        setError('Could not load chat history.');
      }
    })();

    const handleIncoming = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on('chat:message', handleIncoming);

    // Cleanup: remove THIS listener (prevents stacking/duplicates) + disconnect.
    return () => {
      socket.off('chat:message', handleIncoming);
      disconnectSocket();
    };
  }, [userId]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !to.trim()) return;

    setError(null);
    const optimistic = {
      _id: `local-${Date.now()}`,
      from: userId,
      to: to.trim(),
      text: trimmed,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');

    try {
      await sendChatMessage({ from: userId, to: to.trim(), text: trimmed });
    } catch (err) {
      console.error('[ChatPanel] send failed', err);
      setError('Message failed to send.');
    }
  }

  if (!userId) return null;

  return (
    <section className="flex w-full max-w-2xl flex-col rounded-2xl bg-slate-800/60 p-6 shadow-xl ring-1 ring-slate-700">
      <h2 className="mb-3 text-xl font-bold text-credchain-primary">Live Chat</h2>

      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Recipient user id"
        className="mb-3 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-credchain-primary focus:outline-none"
      />

      <div className="mb-3 h-56 overflow-y-auto rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const mine = String(m.from) === String(userId);
            return (
              <div
                key={m._id || `${m.from}-${m.createdAt}`}
                className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <span
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-credchain-primary text-white' : 'bg-slate-700 text-slate-100'
                  } ${m.pending ? 'opacity-60' : ''}`}
                >
                  {m.text}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 text-sm text-red-300">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-credchain-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || !to.trim()}
          className="rounded-lg bg-credchain-primary px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
