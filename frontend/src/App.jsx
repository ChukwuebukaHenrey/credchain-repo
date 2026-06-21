import { useEffect, useState } from 'react';
import { healthCheck } from './services/api';
import { isLoggedIn, getUser, clearSession } from './services/auth';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import AiTools from './components/AiTools';
import ChatPanel from './components/ChatPanel';

export default function App() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [apiStatus, setApiStatus] = useState('checking…');

  // Read the session once on mount so a refresh keeps us "logged in".
  const [loggedIn] = useState(() => isLoggedIn());
  const [user] = useState(() => getUser());

  useEffect(() => {
    // Probe the backend health endpoint on mount (uses the existing wrapper).
    healthCheck()
      .then((data) => setApiStatus(data?.status || 'ok'))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  function handleLogout() {
    clearSession();
    window.location.reload();
  }

  const tabClass = (name) =>
    [
      'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition',
      tab === name
        ? 'bg-credchain-primary text-white'
        : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
    ].join(' ');

  return (
    <div className="min-h-screen bg-credchain-dark text-white flex flex-col items-center justify-center gap-6 p-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-credchain-primary">CredChain</h1>
        <p className="mt-1 text-slate-400">
          Blockchain-powered universal credential network · Solana
        </p>
      </header>

      {loggedIn ? (
        // ── Logged-in experience: dashboard + AI tools + live chat ──
        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full max-w-2xl items-center justify-between rounded-2xl bg-slate-800/60 px-6 py-4 shadow-xl ring-1 ring-slate-700">
            <div>
              <p className="text-lg font-semibold text-white">
                Welcome, {user?.name || 'CredChain user'} 👋
              </p>
              {user?.credchainId && (
                <p className="font-mono text-sm text-credchain-accent">{user.credchainId}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-credchain-primary px-4 py-2 font-semibold text-white transition hover:opacity-90"
            >
              Log out
            </button>
          </div>

          <Dashboard />
          <AiTools />
          <ChatPanel />
        </div>
      ) : (
        // ── Auth card: login / register tabs ──
        <div className="w-full max-w-md rounded-2xl bg-slate-800/60 p-6 shadow-xl ring-1 ring-slate-700">
          <div className="mb-6 flex gap-2">
            <button type="button" className={tabClass('login')} onClick={() => setTab('login')}>
              Log in
            </button>
            <button
              type="button"
              className={tabClass('register')}
              onClick={() => setTab('register')}
            >
              Register
            </button>
          </div>

          {tab === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      )}

      <footer className="text-xs text-slate-500">
        Backend API:{' '}
        <span className="font-mono text-credchain-accent">{apiStatus}</span>
      </footer>
    </div>
  );
}
