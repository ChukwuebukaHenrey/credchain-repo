// ─────────────────────────────────────────────────────────────
// CredChain Frontend — Dashboard (Week 4)
// Loads the logged-in user's profile + credentials from the backend
// and renders credential cards with status badges + explorer links.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { getStudent } from '../services/api';
import { getUser } from '../services/auth';

const STATUS_STYLES = {
  accepted: 'bg-emerald-900/50 text-emerald-300',
  pending: 'bg-amber-900/50 text-amber-300',
  rejected: 'bg-red-900/50 text-red-300',
};

export default function Dashboard() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) {
      setError('No logged-in user found.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await getStudent(user.id);
        if (!cancelled) setStudent(res?.student || null);
      } catch (err) {
        console.error('[Dashboard] failed to load student', err);
        if (!cancelled) setError('Could not load your dashboard. Is the backend running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="w-full max-w-2xl rounded-2xl bg-slate-800/60 p-6 shadow-xl ring-1 ring-slate-700">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 rounded bg-slate-700" />
          <div className="h-4 w-1/2 rounded bg-slate-700" />
          <div className="h-20 rounded bg-slate-700" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full max-w-2xl rounded-2xl bg-slate-800/60 p-6 shadow-xl ring-1 ring-slate-700">
        <p className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>
      </section>
    );
  }

  const credentials = student?.credentials || [];

  return (
    <section className="w-full max-w-2xl rounded-2xl bg-slate-800/60 p-6 shadow-xl ring-1 ring-slate-700">
      <h2 className="text-xl font-bold text-credchain-primary">My Dashboard</h2>
      <p className="mt-1 text-slate-300">{student?.name}</p>
      {student?.credchainId && (
        <p className="font-mono text-sm text-credchain-accent">{student.credchainId}</p>
      )}
      {student?.bio && <p className="mt-2 text-sm text-slate-400">{student.bio}</p>}

      {student?.skills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {student.skills.map((skill, i) => (
            <span key={i} className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-200">
              {skill}
            </span>
          ))}
        </div>
      )}

      <h3 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
        Credentials ({credentials.length})
      </h3>

      {credentials.length === 0 ? (
        <p className="text-sm text-slate-500">No credentials yet.</p>
      ) : (
        <ul className="space-y-3">
          {credentials.map((cred) => (
            <li key={cred.id} className="rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{cred.title}</p>
                  <p className="text-sm text-slate-400">{cred.issuer}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[cred.status] || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {cred.status}
                </span>
              </div>
              {cred.txSignature && cred.explorerUrl && (
                <a
                  href={cred.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-credchain-accent underline"
                >
                  View on Solana Explorer ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
