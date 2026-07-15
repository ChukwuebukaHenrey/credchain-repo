import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Eye, EyeOff } from "lucide-react";
import AuthScreen from "../components/AuthScreen";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function SignupVerifier() {
  const { login: authLogin } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [companyWebsite, setCompanyWebsite] = useState("");
  const [reason, setReason] = useState("hiring");

  const handleNextStep = () => {
    if (step === 1 && (!fullName || !companyName || !workEmail || !password)) {
      alert("Please fill in Full Name, Company Name, Work Email, and Password.");
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Real registration — api.ts maps role verifier -> employer at the boundary.
      const res = await api.signup({ name: fullName, email: workEmail, password, role: "verifier" });
      if (res?.success === false || !res?.token) throw new Error(res?.message || "Registration failed");
      authLogin(res.token, res.user);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Registration failed — is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  const stepTitle = step === 1 ? "Professional identity" : "Organization details";

  if (submitted) {
    return (
      <AuthScreen role="verifier" currentStep={step} totalSteps={totalSteps}>
        <SuccessPanel
          email={workEmail}
          headline="Organization anchor submitted."
          body="We verify all employer query nodes to maintain candidate privacy compliance."
          ctaTo="/verifier"
          ctaLabel="Preview Employer Desk"
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen role="verifier" currentStep={step} totalSteps={totalSteps}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div>
          <StepHeader step={step} totalSteps={totalSteps} stepTitle={stepTitle} />

          <div className="mb-8 space-y-2">
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-txt-primary">
              Register employer desk.
            </h1>
            <p className="text-sm text-txt-secondary font-sans">
              Already verified?{" "}
              <Link to="/login?role=verifier" className="text-brand-purple font-semibold hover:text-txt-primary">
                Sign in
              </Link>
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="FULL NAME *" value={fullName} onChange={setFullName} placeholder="Sarah Jenkins" required />
                <Field label="JOB TITLE *" value={jobTitle} onChange={setJobTitle} placeholder="Head of Talent Acquisition" required />
              </div>
              <Field label="COMPANY NAME *" value={companyName} onChange={setCompanyName} placeholder="Acme Global Technologies" required />
              <Field label="WORK EMAIL *" type="email" value={workEmail} onChange={setWorkEmail} placeholder="s.jenkins@acmeglobal.com" required />
              <Field label="PASSWORD *" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="COMPANY WEBSITE *" type="url" value={companyWebsite} onChange={setCompanyWebsite} placeholder="https://acmeglobal.com" required />
              <SelectField
                label="PRIMARY VERIFICATION REASON"
                value={reason}
                onChange={setReason}
                options={[
                  { value: "hiring", label: "New applicant hiring audit" },
                  { value: "background_check", label: "Standard background audit" },
                  { value: "academic_transfer", label: "Academic credit transfer" },
                  { value: "compliance_audit", label: "Regulatory compliance audit" },
                ]}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 my-3">
            {error}
          </div>
        )}

        <StepNav
          step={step}
          totalSteps={totalSteps}
          onBack={() => setStep(step - 1)}
          onNext={handleNextStep}
          submitLabel={busy ? "Submitting…" : "Submit organization anchor"}
        />
      </form>
    </AuthScreen>
  );
}

/* Shared bits used by all three signup pages — kept local to keep imports tight */

export function StepHeader({ step, totalSteps, stepTitle }: { step: number; totalSteps: number; stepTitle: string }) {
  return (
    <div className="flex items-center justify-between mb-6 border-b border-border-subtle pb-4">
      <span className="text-[11px] font-mono font-semibold text-txt-muted">
        Step {step} of {totalSteps} — <span className="text-txt-primary">{stepTitle}</span>
      </span>
      <div className="w-32 h-1 bg-bg-sunken border border-border-main rounded-sm overflow-hidden">
        <div
          className="h-full bg-brand-purple transition-all duration-200"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function StepNav({
  step,
  totalSteps,
  onBack,
  onNext,
  submitLabel,
}: {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-3 mt-8 pt-6 border-t border-border-subtle">
      {step > 1 ? (
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 px-5 bg-transparent border border-border-main hover:border-border-strong rounded-md text-sm font-semibold text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer"
        >
          Back
        </button>
      ) : (
        <Link
          to="/role"
          className="flex-1 py-3 px-5 bg-transparent border border-border-main hover:border-border-strong rounded-md text-sm font-semibold text-txt-secondary hover:text-txt-primary transition-colors text-center inline-flex items-center justify-center"
        >
          Cancel
        </Link>
      )}

      {step < totalSteps ? (
        <button
          type="button"
          onClick={onNext}
          className="flex-[2] py-3 px-5 bg-brand-purple hover:bg-brand-purple-dim rounded-md text-sm font-semibold text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="submit"
          className="flex-[2] py-3 px-5 bg-brand-purple hover:bg-brand-purple-dim rounded-md text-sm font-semibold text-white transition-colors cursor-pointer inline-flex items-center justify-center"
        >
          {submitLabel}
        </button>
      )}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-1.5 text-left w-full">
      <label className="text-[11px] font-mono font-semibold text-txt-muted uppercase tracking-wider block">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-bg-sunken border border-border-main rounded-md px-4 py-3 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple transition-colors font-mono ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary focus:outline-none transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono font-semibold text-txt-muted uppercase tracking-wider block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-sunken border border-border-main rounded-md px-4 py-3 text-sm text-txt-primary focus:outline-none focus:border-brand-purple transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SuccessPanel({
  email,
  headline,
  body,
  ctaTo,
  ctaLabel,
}: {
  email: string;
  headline: string;
  body: string;
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="py-12 text-center space-y-6 my-auto">
      <div className="w-14 h-14 rounded-md bg-role-verifier-soft border border-border-main text-role-verifier flex items-center justify-center mx-auto">
        <Clock className="w-7 h-7 animate-pulse-custom" strokeWidth={1.75} />
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-txt-primary">{headline}</h1>
        <p className="text-txt-secondary text-sm max-w-md mx-auto">
          {body} We'll notify <span className="text-txt-primary font-mono">{email}</span> once approved.
        </p>
      </div>
      <div className="pt-4 flex justify-center gap-3">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-md border border-border-main hover:border-border-strong text-txt-primary font-semibold text-sm transition-colors"
        >
          Return Home
        </Link>
        <Link
          to={ctaTo}
          className="px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-sm transition-colors"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
