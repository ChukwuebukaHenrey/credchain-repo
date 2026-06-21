// ─────────────────────────────────────────────────────────────
// CredChain Frontend — RegisterForm
// Controlled registration form (name / email / password / role).
// Calls the existing register() wrapper in ../services/api — does NOT
// create its own axios instance. On success it stores the returned JWT
// under localStorage key 'credchain_token'.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { register } from '../services/api';
import { saveSession } from '../services/auth';

const ROLES = ['student', 'issuer', 'employer'];

export default function RegisterForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }

  // One handler updates whichever field fired the change.
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const data = await register(form);

      // Persist the JWT + user so authenticated requests work afterwards.
      if (data?.token) {
        saveSession(data.token, data.user);
      }

      setStatus({
        type: 'success',
        text: data?.message || 'Account created successfully.',
      });

      // Refresh so App.jsx re-reads the session and shows the welcome panel.
      if (data?.token) {
        window.location.reload();
      }
    } catch (error) {
      console.error('[RegisterForm] registration failed', error);
      setStatus({
        type: 'error',
        text:
          error?.response?.data?.message ||
          'Registration failed. Please check your details and try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="register-name" className="text-sm font-medium text-slate-200">
          Full name
        </label>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={form.name}
          onChange={handleChange}
          placeholder="Ada Lovelace"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-credchain-primary focus:outline-none focus:ring-2 focus:ring-credchain-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-email" className="text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          id="register-email"
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
        <label htmlFor="register-password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={form.password}
          onChange={handleChange}
          placeholder="••••••••"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-credchain-primary focus:outline-none focus:ring-2 focus:ring-credchain-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-role" className="text-sm font-medium text-slate-200">
          I am a…
        </label>
        <select
          id="register-role"
          name="role"
          value={form.role}
          onChange={handleChange}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-credchain-primary focus:outline-none focus:ring-2 focus:ring-credchain-primary"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-credchain-primary px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Create account'}
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
