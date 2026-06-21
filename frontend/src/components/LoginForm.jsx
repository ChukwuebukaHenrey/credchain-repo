// ─────────────────────────────────────────────────────────────
// CredChain Frontend — LoginForm
// Controlled login form (email / password). Calls the existing login()
// wrapper in ../services/api — does NOT create its own axios instance.
// On success it stores the returned JWT under localStorage 'credchain_token'.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { login } from '../services/api';
import { saveSession } from '../services/auth';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const data = await login(form);

      // Save the JWT + user so the axios interceptor and session helpers work.
      if (data?.token) {
        saveSession(data.token, data.user);
      }

      setStatus({
        type: 'success',
        text: data?.message || 'Logged in successfully.',
      });

      // Refresh so App.jsx re-reads the session and shows the welcome panel.
      if (data?.token) {
        window.location.reload();
      }
    } catch (error) {
      console.error('[LoginForm] login failed', error);
      setStatus({
        type: 'error',
        text:
          error?.response?.data?.message ||
          'Login failed. Please check your email and password.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-credchain-primary focus:outline-none focus:ring-2 focus:ring-credchain-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={handleChange}
          placeholder="••••••••"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-credchain-primary focus:outline-none focus:ring-2 focus:ring-credchain-primary"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-credchain-primary px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Log in'}
      </button>

      {status && (
        <p
          role="status"
          className={
            status.type === 'success'
              ? 'rounded-lg bg-emerald-900/40 px-3 py-2 text-sm text-emerald-300'
              : 'rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-300'
          }
        >
          {status.text}
        </p>
      )}
    </form>
  );
}
