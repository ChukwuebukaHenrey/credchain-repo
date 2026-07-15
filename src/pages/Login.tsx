import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Lock, LogIn, User, GraduationCap, Briefcase, ArrowRight, Eye, EyeOff } from "lucide-react";
import Logo from "../components/Logo";
import AuthLeftPanel from "../components/AuthLeftPanel";
import ThemeToggle from "../components/ThemeToggle";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

type Role = "candidate" | "issuer" | "verifier";

interface OneTapRole {
  role: Role;
  label: string;
  email: string;
  icon: React.ReactNode;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  route: string;
}

const ONE_TAP: OneTapRole[] = [
  {
    role: "candidate",
    label: "Candidate Vault",
    email: "demo-student@credchain.demo",
    icon: <User className="w-4 h-4" strokeWidth={1.75} />,
    accentText: "text-role-candidate",
    accentBg: "hover:bg-role-candidate-soft",
    accentBorder: "hover:border-role-candidate",
    route: "/dashboard",
  },
  {
    role: "issuer",
    label: "Institution Desk",
    email: "demo-issuer@credchain.demo",
    icon: <GraduationCap className="w-4 h-4" strokeWidth={1.75} />,
    accentText: "text-role-issuer",
    accentBg: "hover:bg-role-issuer-soft",
    accentBorder: "hover:border-role-issuer",
    route: "/issuer",
  },
  {
    role: "verifier",
    label: "Employer Desk",
    email: "demo-employer@credchain.demo",
    icon: <Briefcase className="w-4 h-4" strokeWidth={1.75} />,
    accentText: "text-role-verifier",
    accentBg: "hover:bg-role-verifier-soft",
    accentBorder: "hover:border-role-verifier",
    route: "/verifier",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const roleParam = (searchParams.get("role") || "candidate") as Role;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ROUTE_BY_ROLE: Record<Role, string> = { candidate: "/dashboard", issuer: "/issuer", verifier: "/verifier" };

  // Complete a successful auth response: hand token+user to AuthContext, route to
  // the role's dashboard. Backend roles arrive pre-translated by api.ts.
  const finishAuth = (res: any) => {
    const role = (res?.user?.role || "candidate") as Role;
    authLogin(res.token || localStorage.getItem("cc_token") || "", res.user);
    navigate(ROUTE_BY_ROLE[role] || "/dashboard");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      if (res?.success === false) throw new Error(res?.message || "Invalid credentials");
      finishAuth(res);
    } catch (err: any) {
      setError(err?.message || "Sign-in failed — check your email and password.");
    } finally {
      setBusy(false);
    }
  };

  // One-tap demo auth → backend DEMO_MODE accounts (seeded, no password).
  const handleOneTapAuth = async (_route: string, role: Role) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.demoLogin(role);
      if (res?.success === false) throw new Error(res?.message || "Demo login unavailable");
      finishAuth(res);
    } catch (err: any) {
      setError(err?.message || "Demo login failed — is the backend running on :5000?");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = api.googleAuthUrl(roleParam);
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#07030d] text-txt-primary flex flex-col relative select-none overflow-hidden">
      {/* Mobile top header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between min-[900px]:hidden p-4">
        <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
          <Logo wordmarkSize="md" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex w-full h-full min-h-0">
        {/* DESKTOP — two-panel full viewport layout */}
        <div className="hidden min-[900px]:flex w-full h-screen bg-bg-base overflow-hidden relative">
          
          {/* Top-Right controls (Back to Home + Theme Toggle) of the whole page */}
          <div className="absolute top-6 right-8 z-25 flex items-center gap-4">
            <Link
              to="/"
              className="text-xs font-mono text-txt-muted hover:text-txt-primary transition-colors inline-flex items-center gap-1.5 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to home</span>
            </Link>
            <div className="h-4 w-px bg-border-main" />
            <ThemeToggle />
          </div>

          <AuthLeftPanel role={roleParam} />

          <div className="w-[48%] bg-bg-base p-6 lg:p-10 xl:p-12 flex flex-col justify-center text-left relative overflow-y-auto h-full">
            <div className="w-full max-w-md mx-auto space-y-3.5">
              <div className="space-y-1">
                <div className="border-l-2 border-brand-purple pl-3 font-mono text-[10px] tracking-[0.18em] text-txt-muted uppercase">
                  SIGN IN
                </div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-txt-primary">
                  Welcome back.
                </h1>
                <p className="text-xs text-txt-secondary font-sans">
                  Access your CredChain identity or portal desk.
                </p>
              </div>

              {/* One-tap demo block (Horizontal 3-column grid to prevent scrolling) */}
              <div className="bg-bg-surface border border-border-main rounded-lg p-2.5 space-y-2">
                <div className="text-[10px] font-mono font-semibold text-txt-muted tracking-wider uppercase">
                  // ONE-TAP DEMO AUTH
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ONE_TAP.map((t) => (
                    <button
                      key={t.role}
                      type="button"
                      onClick={() => handleOneTapAuth(t.route, t.role)}
                      className={`flex flex-col items-center justify-center p-2 bg-bg-sunken border border-border-main ${t.accentBorder} ${t.accentBg} rounded-md cursor-pointer transition-all duration-200 hover:scale-[1.02] group`}
                    >
                      <span className={`w-7 h-7 rounded-full border border-border-main bg-bg-surface flex items-center justify-center ${t.accentText} mb-1 group-hover:scale-110 transition-transform`}>
                        {t.icon}
                      </span>
                      <span className="text-[11px] font-bold text-txt-primary leading-tight text-center">
                        {t.role === "candidate" ? "Student" : t.role === "issuer" ? "Institution" : "Employer"}
                      </span>
                      <span className="font-mono text-[9px] text-txt-muted leading-tight text-center truncate w-full mt-0.5">
                        {t.email.split("@")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-[10px] font-mono font-semibold text-txt-muted tracking-wider uppercase">
                  OR MANUAL LOGIN
                </span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              {error && (
                <div className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-2.5">
                <LabeledInput
                  label="EMAIL ADDRESS"
                  icon={<Mail className="w-4 h-4" />}
                  type="email"
                  required
                  value={email}
                  onChange={setEmail}
                  placeholder="name@example.com"
                />
                <LabeledInput
                  label="PASSWORD"
                  icon={<Lock className="w-4 h-4" />}
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                {/* Terms / Keep me signed in Checkbox */}
                <div className="flex items-center justify-between text-xs font-mono pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-txt-secondary hover:text-txt-primary select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-border-main bg-bg-sunken text-brand-purple focus:ring-brand-purple focus:ring-opacity-25 w-4 h-4 cursor-pointer"
                    />
                    <span>Accept terms & keep signed in</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 mt-1 shadow-lg shadow-brand-purple/20"
                >
                  <LogIn className="w-4 h-4" strokeWidth={2} />
                  <span>{busy ? "Signing in…" : "Sign in"}</span>
                </button>
              </form>

              {/* Social login buttons */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border-subtle" />
                  <span className="text-[10px] font-mono font-semibold text-txt-muted tracking-wider uppercase">
                    OR REGISTER WITH
                  </span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogle}
                    className="py-1.5 px-4 border border-border-main hover:border-border-strong rounded-md text-xs font-mono text-txt-primary flex items-center justify-center gap-2 bg-bg-sunken hover:bg-bg-elevated/40 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOneTapAuth("/dashboard", "candidate")}
                    className="py-1.5 px-4 border border-border-main hover:border-border-strong rounded-md text-xs font-mono text-txt-primary flex items-center justify-center gap-2 bg-bg-sunken hover:bg-bg-elevated/40 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                      />
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 text-center text-xs text-txt-secondary border-t border-border-subtle font-sans">
                Don't have an account?{" "}
                <Link
                  to={roleParam ? `/signup/${roleParam}` : "/role"}
                  className="text-brand-purple font-semibold hover:text-txt-primary"
                >
                  Create one here
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE — single column */}
        <div className="block min-[900px]:hidden w-full max-w-md bg-bg-surface border border-border-main rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="text-left space-y-2">
            <div className="border-l-2 border-brand-purple pl-3 font-mono text-[11px] tracking-[0.18em] text-txt-muted uppercase">
              SIGN IN
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-txt-primary">
              Welcome back.
            </h1>
            <p className="text-xs text-txt-secondary font-sans">
              Access your CredChain identity or portal desk.
            </p>
          </div>

          <div className="bg-bg-sunken border border-border-main rounded-md p-4 space-y-3">
            <div className="text-[11px] font-mono font-semibold text-txt-muted tracking-wider uppercase">
              // ONE-TAP DEMO AUTH
            </div>
            <div className="space-y-2">
              {ONE_TAP.map((t) => (
                <button
                  key={t.role}
                  type="button"
                  onClick={() => handleOneTapAuth(t.route, t.role)}
                  className={`w-full py-2.5 px-3 bg-bg-surface border border-border-main ${t.accentBorder} ${t.accentBg} rounded-md text-xs font-medium text-txt-primary transition-colors cursor-pointer flex justify-between items-center group`}
                >
                  <div className={`flex items-center gap-2.5 ${t.accentText}`}>
                    {t.icon}
                    <span className="font-semibold text-txt-primary">{t.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-txt-muted">
                    <span>{t.email}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-[10px] font-mono text-txt-muted uppercase tracking-wider">
              Or manual login
            </span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {error && (
            <div className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <LabeledInput
              label="EMAIL ADDRESS"
              icon={<Mail className="w-4 h-4" />}
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="name@example.com"
            />
            <LabeledInput
              label="PASSWORD"
              icon={<Lock className="w-4 h-4" />}
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Terms Checkbox */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-border-main bg-bg-sunken text-brand-purple focus:ring-brand-purple focus:ring-opacity-25 w-4 h-4"
              />
              <span className="text-txt-secondary">Accept terms & keep signed in</span>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" strokeWidth={2} />
              <span>{busy ? "Signing in…" : "Sign In"}</span>
            </button>
          </form>

          {/* Mobile social auth */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-[10px] font-mono text-txt-muted uppercase tracking-wider">
                Or sign in with
              </span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogle}
                className="py-2.5 px-4 border border-border-main hover:border-border-strong rounded-md text-xs font-mono text-txt-primary flex items-center justify-center gap-2 bg-bg-sunken hover:bg-bg-elevated/40 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleOneTapAuth("/dashboard", "candidate")}
                className="py-2.5 px-4 border border-border-main hover:border-border-strong rounded-md text-xs font-mono text-txt-primary flex items-center justify-center gap-2 bg-bg-sunken hover:bg-bg-elevated/40 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                  />
                </svg>
                <span>GitHub</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle text-center text-xs text-txt-secondary font-sans">
            Don't have an account?{" "}
            <Link to="/role" className="text-brand-purple font-semibold hover:text-txt-primary">
              Create one here
            </Link>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl w-full mx-auto pt-6 border-t border-border-subtle block min-[900px]:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-txt-muted hover:text-txt-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </Link>
      </footer>
    </div>
  );
}

function LabeledInput({
  label,
  icon,
  type,
  required,
  value,
  onChange,
  placeholder,
  rightElement,
}: {
  label: string;
  icon: React.ReactNode;
  type: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted">{icon}</span>
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-bg-sunken border border-border-main rounded-md pl-10 pr-10 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple transition-colors font-mono"
        />
        {rightElement}
      </div>
    </div>
  );
}
