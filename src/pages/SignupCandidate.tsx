import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X, CheckCircle2 } from "lucide-react";
import AuthScreen from "../components/AuthScreen";
import { StepHeader, StepNav, Field, SelectField } from "./SignupVerifier";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function SignupCandidate() {
  const { login: authLogin } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [bio, setBio] = useState("");

  // Step 3
  const [institution, setInstitution] = useState("");
  const [studentId, setStudentId] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");

  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(["React", "TypeScript", "Solidity"]);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const handleNextStep = () => {
    if (step === 1 && (!firstName || !lastName || !email || !password)) {
      alert("Please fill in First Name, Last Name, Email, and Password.");
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const fullName = `${firstName} ${lastName}`.trim();
    setBusy(true);
    setError(null);
    try {
      // Real registration: backend creates the user + JWT. Extra profile fields
      // (bio, skills, links) ride on the follow-up profile update.
      const res = await api.signup({ name: fullName, email, password, role: "candidate" });
      if (res?.success === false || !res?.token) throw new Error(res?.message || "Registration failed");
      authLogin(res.token, res.user);
      // Best-effort profile enrichment — non-blocking for signup success.
      try {
        await api.updateStudentProfile({ id: res.user?.id || res.user?._id, bio, skills, links: linkedInUrl ? [linkedInUrl] : [] });
      } catch { /* profile enrichment is optional */ }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Registration failed — is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  const stepTitle = step === 1 ? "Basic info" : step === 2 ? "Personal details" : "Academic & skills";

  if (submitted) {
    return (
      <AuthScreen role="candidate" currentStep={step} totalSteps={totalSteps}>
        <div className="py-12 text-center space-y-6 my-auto">
          <div className="w-14 h-14 rounded-md bg-role-candidate-soft border border-border-main text-role-candidate flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-txt-primary">
              Welcome to CredChain.
            </h1>
            <p className="text-txt-secondary text-sm max-w-md mx-auto">
              Your candidate vault is live. We've sent a confirmation to{" "}
              <span className="text-txt-primary font-mono">{email}</span>.
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
              to="/dashboard"
              className="px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-sm transition-colors"
            >
              Enter my vault
            </Link>
          </div>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen role="candidate" currentStep={step} totalSteps={totalSteps}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div>
          <StepHeader step={step} totalSteps={totalSteps} stepTitle={stepTitle} />

          <div className="mb-8 space-y-2">
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-txt-primary">
              Create candidate account.
            </h1>
            <p className="text-sm text-txt-secondary font-sans">
              Already a candidate?{" "}
              <Link
                to="/login?role=candidate"
                className="text-brand-purple font-semibold hover:text-txt-primary"
              >
                Sign in
              </Link>
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="FIRST NAME *" value={firstName} onChange={setFirstName} placeholder="Emeka" required />
                <Field label="LAST NAME *" value={lastName} onChange={setLastName} placeholder="Obi" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="PHONE" value={phone} onChange={setPhone} placeholder="+234 802 …" />
                <Field label="EMAIL *" type="email" value={email} onChange={setEmail} placeholder="emeka@example.com" required />
              </div>
              <Field label="PASSWORD *" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />

              {/* Terms Checkbox */}
              <div className="flex items-center gap-2 text-xs font-mono pt-1 text-txt-secondary hover:text-txt-primary">
                <input
                  type="checkbox"
                  required
                  defaultChecked
                  className="rounded border-border-main bg-bg-sunken text-brand-purple focus:ring-brand-purple focus:ring-opacity-25 w-4 h-4 cursor-pointer"
                />
                <span>I accept the Terms & Privacy Policy *</span>
              </div>

              {/* Social auth buttons */}
              <div className="space-y-2.5 pt-2">
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
                    onClick={() => {
                      setFirstName("Emeka");
                      setLastName("Obi");
                      setEmail("emeka@example.com");
                      setPassword("candidate123");
                    }}
                    className="py-2 px-4 border border-border-main hover:border-border-strong rounded-md text-xs font-mono text-txt-primary flex items-center justify-center gap-2 bg-bg-sunken hover:bg-bg-elevated/40 transition-all cursor-pointer"
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
                    onClick={() => {
                      setFirstName("Emeka");
                      setLastName("Obi");
                      setEmail("emeka@example.com");
                      setPassword("candidate123");
                    }}
                    className="py-2 px-4 border border-border-main hover:border-border-strong rounded-md text-xs font-mono text-txt-primary flex items-center justify-center gap-2 bg-bg-sunken hover:bg-bg-elevated/40 transition-all cursor-pointer"
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="DATE OF BIRTH" type="date" value={dob} onChange={setDob} />
                <SelectField
                  label="GENDER"
                  value={gender}
                  onChange={setGender}
                  options={[
                    { value: "", label: "Prefer not to say" },
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "non-binary", label: "Non-binary" },
                  ]}
                />
              </div>
              <Field label="NATIONALITY" value={nationality} onChange={setNationality} placeholder="Nigerian" />
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-semibold text-txt-muted uppercase tracking-wider block">
                  SHORT BIO
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Frontend-leaning Software Engineering student passionate about verifiable web apps…"
                  className="w-full bg-bg-sunken border border-border-main rounded-md px-4 py-3 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple transition-colors font-sans"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="INSTITUTION" value={institution} onChange={setInstitution} placeholder="Federal University of Technology, Owerri" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="STUDENT ID / MATRIC" value={studentId} onChange={setStudentId} placeholder="2021/104256" />
                <Field label="GRADUATION YEAR" value={graduationYear} onChange={setGraduationYear} placeholder="2026" />
              </div>
              <Field label="FIELD OF STUDY" value={fieldOfStudy} onChange={setFieldOfStudy} placeholder="B.Eng Computer Engineering" />
              <Field label="LINKEDIN URL" type="url" value={linkedInUrl} onChange={setLinkedInUrl} placeholder="https://linkedin.com/in/yourname" />

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-semibold text-txt-muted uppercase tracking-wider block">
                  SKILLS
                </label>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  placeholder="Type a skill and press Enter"
                  className="w-full bg-bg-sunken border border-border-main rounded-md px-4 py-3 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-brand-purple transition-colors font-mono"
                />
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-main bg-bg-surface text-role-candidate text-xs font-mono"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        className="text-txt-muted hover:text-hash-red"
                        aria-label={`Remove ${s}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <StepNav
          step={step}
          totalSteps={totalSteps}
          onBack={() => setStep(step - 1)}
          onNext={handleNextStep}
          submitLabel="Create my vault"
        />
      </form>
    </AuthScreen>
  );
}
