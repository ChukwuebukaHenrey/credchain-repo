// components/issuer/GetVerifiedFlow.tsx
// Issuer verification funnel (4 layers; the last is admin-side):
//   1. registerIssuerStepOne(institutionType)  → returns a dnsChallengeToken
//   2. verifyIssuerDomain()                    → backend checks a DNS TXT record
//   3. submitIssuerKyc(payload)                → mock KYC provider
//   4. registry cross-match                    → CredChain admin desk (not in this UI)
// The DNS check WILL genuinely fail for domains that don't carry the TXT record —
// that's the expected demo path for a fresh issuer, so errors here must read as
// actionable instructions, never as a broken app.
import { useState } from "react";
import { Building2, Globe, FileCheck, ShieldCheck, Copy, Check, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { registerIssuerStepOne, verifyIssuerDomain, submitIssuerKyc } from "../../services/api";

type FunnelStep = 1 | 2 | 3 | 4;

const INSTITUTION_TYPES = ["University", "Polytechnic", "College of Education", "Professional Body", "Training Provider"];

export default function GetVerifiedFlow({
  onNotify,
}: {
  onNotify?: (message: string, variant: "success" | "danger") => void;
}) {
  const [step, setStep] = useState<FunnelStep>(1);
  const [funnelStatus, setFunnelStatus] = useState<string | null>(null);

  // Step 1
  const [institutionType, setInstitutionType] = useState(INSTITUTION_TYPES[0]);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [dnsChallengeToken, setDnsChallengeToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Step 2
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainVerified, setDomainVerified] = useState(false);

  // Step 3
  const [kycOrgName, setKycOrgName] = useState("");
  const [kycRegNumber, setKycRegNumber] = useState("");
  const [kycContactName, setKycContactName] = useState("");
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycDone, setKycDone] = useState(false);

  const handleRegister = async () => {
    if (registering) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      const res = await registerIssuerStepOne(institutionType);
      setDnsChallengeToken(res?.dnsChallengeToken || null);
      setFunnelStatus(res?.status || "domain_pending");
      if (!res?.dnsChallengeToken) {
        setRegisterError(res?.message || "Registration succeeded but no DNS challenge token was returned — contact ops@credchain.io.");
      } else {
        setStep(2);
      }
    } catch (e: any) {
      setRegisterError(e?.message || "Could not start verification — please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const handleCopyToken = async () => {
    if (!dnsChallengeToken) return;
    try {
      await navigator.clipboard.writeText(dnsChallengeToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify?.("Clipboard unavailable — select the token manually.", "danger");
    }
  };

  const handleVerifyDomain = async () => {
    if (verifyingDomain) return;
    setVerifyingDomain(true);
    setDomainError(null);
    try {
      const res = await verifyIssuerDomain();
      setDomainVerified(true);
      setFunnelStatus(res?.status || "kyc_pending");
      onNotify?.("Domain verified — TXT record found.", "success");
      setStep(3);
    } catch (e: any) {
      // Expected path for a fresh domain: the TXT record isn't live yet.
      setDomainError(
        e?.message ||
          "DNS TXT record not found. Add the record above at your domain registrar, wait for propagation (can take up to an hour), then retry."
      );
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleSubmitKyc = async () => {
    if (submittingKyc) return;
    setSubmittingKyc(true);
    setKycError(null);
    try {
      const res = await submitIssuerKyc({
        organizationName: kycOrgName || undefined,
        registrationNumber: kycRegNumber || undefined,
        contactName: kycContactName || undefined,
      });
      setKycDone(true);
      setFunnelStatus(res?.status || "registry_pending");
      onNotify?.("KYC submitted — awaiting registry cross-match.", "success");
      setStep(4);
    } catch (e: any) {
      setKycError(e?.message || "KYC submission failed — check the details and try again.");
    } finally {
      setSubmittingKyc(false);
    }
  };

  const steps = [
    { n: 1 as const, label: "Institution type", icon: <Building2 className="w-4 h-4" strokeWidth={1.75} />, done: !!dnsChallengeToken },
    { n: 2 as const, label: "Domain (DNS TXT)", icon: <Globe className="w-4 h-4" strokeWidth={1.75} />, done: domainVerified },
    { n: 3 as const, label: "KYC documents", icon: <FileCheck className="w-4 h-4" strokeWidth={1.75} />, done: kycDone },
    { n: 4 as const, label: "Registry review", icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />, done: false },
  ];

  return (
    <div className="space-y-4">
      {/* Funnel status strip */}
      <div className="bg-bg-surface border border-border-main rounded-lg p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">VERIFICATION FUNNEL · 4 LAYERS</div>
          {funnelStatus && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border border-border-main text-role-issuer">
              status: {funnelStatus}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => s.n < 4 && setStep(s.n)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left transition-colors ${
                s.n < 4 ? "cursor-pointer" : "cursor-default"
              } ${
                step === s.n
                  ? "border-role-issuer bg-role-issuer-soft text-txt-primary"
                  : s.done
                  ? "border-hash-green/30 text-txt-secondary"
                  : "border-border-main text-txt-muted"
              }`}
            >
              <span className={s.done ? "text-hash-green" : step === s.n ? "text-role-issuer" : ""}>
                {s.done ? <CheckCircle2 className="w-4 h-4" strokeWidth={2} /> : s.icon}
              </span>
              <span className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-wider">Layer {s.n}</span>
                <span className="text-xs font-semibold">{s.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1 — institution type */}
      {step === 1 && (
        <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
          <div>
            <div className="font-display font-semibold text-[16px] text-txt-primary">Register your institution</div>
            <p className="text-xs text-txt-secondary mt-1">
              Choose your institution type. We lock verification to your account's email domain and issue a DNS challenge token.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">Institution type</label>
            <select
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value)}
              className="w-full bg-bg-sunken border border-border-main focus:border-role-issuer rounded-md px-3 py-2.5 text-sm text-txt-primary outline-none transition-colors cursor-pointer"
            >
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {registerError && <ErrorNotice message={registerError} />}
          <button
            onClick={handleRegister}
            disabled={registering}
            className="px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            {registering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> Registering…
              </>
            ) : (
              "Start verification"
            )}
          </button>
        </div>
      )}

      {/* Step 2 — DNS TXT challenge */}
      {step === 2 && (
        <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
          <div>
            <div className="font-display font-semibold text-[16px] text-txt-primary">Prove domain ownership</div>
            <p className="text-xs text-txt-secondary mt-1 leading-relaxed">
              Add this TXT record to your domain's DNS (at your registrar or DNS host), then run the check. Propagation can
              take a few minutes to an hour.
            </p>
          </div>

          {dnsChallengeToken ? (
            <div className="bg-bg-sunken border border-border-main rounded-md p-4 space-y-2">
              <div className="text-[10px] font-mono text-txt-muted uppercase font-semibold tracking-wider">DNS TXT RECORD VALUE</div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono text-xs text-role-issuer break-all flex-1 min-w-[200px] select-all">{dnsChallengeToken}</code>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-main hover:border-role-issuer text-txt-secondary hover:text-role-issuer text-[11px] font-mono cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-hash-green" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={2} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] text-txt-muted font-mono pt-1">
                // record type: TXT · host: @ (root) · value: the token above
              </p>
            </div>
          ) : (
            <ErrorNotice message="No DNS challenge token on this session — complete Layer 1 first." />
          )}

          {domainVerified && (
            <div className="border border-hash-green/30 bg-hash-green/5 rounded-md p-3 flex items-center gap-2.5 text-hash-green">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs font-semibold">Domain verified — TXT record found.</p>
            </div>
          )}
          {domainError && <ErrorNotice message={domainError} />}

          <button
            onClick={handleVerifyDomain}
            disabled={verifyingDomain || !dnsChallengeToken}
            className="px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            {verifyingDomain ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> Checking DNS…
              </>
            ) : (
              "Check TXT record"
            )}
          </button>
        </div>
      )}

      {/* Step 3 — KYC */}
      {step === 3 && (
        <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
          <div>
            <div className="font-display font-semibold text-[16px] text-txt-primary">Submit KYC details</div>
            <p className="text-xs text-txt-secondary mt-1">
              Verified against our KYC provider. All fields are optional in the demo environment.
            </p>
          </div>
          <div className="space-y-3">
            <KycField label="Organization legal name" value={kycOrgName} onChange={setKycOrgName} placeholder="Federal University of Technology Owerri" />
            <KycField label="Registration / accreditation number" value={kycRegNumber} onChange={setKycRegNumber} placeholder="NUC/FUTO/1980/001" />
            <KycField label="Authorized contact name" value={kycContactName} onChange={setKycContactName} placeholder="Registrar's full name" />
          </div>
          {kycError && <ErrorNotice message={kycError} />}
          <button
            onClick={handleSubmitKyc}
            disabled={submittingKyc}
            className="px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            {submittingKyc ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> Submitting…
              </>
            ) : (
              "Submit KYC"
            )}
          </button>
        </div>
      )}

      {/* Step 4 — registry review (admin-side, read-only) */}
      {step === 4 && (
        <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-md bg-role-issuer-soft border border-border-main text-role-issuer flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <div className="font-display font-semibold text-[16px] text-txt-primary">Awaiting registry cross-match</div>
            <p className="text-xs text-txt-secondary mt-1.5 leading-relaxed max-w-md mx-auto">
              The final layer is a manual cross-match against the national accreditation registry by the CredChain admin
              desk. You'll be notified once approved — no action needed from you.
            </p>
          </div>
          <p className="text-[11px] text-txt-muted font-mono">// questions? ops@credchain.io</p>
        </div>
      )}
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="border border-hash-red/30 bg-hash-red/5 rounded-md p-3 flex items-start gap-2.5 text-hash-red">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
      <p className="text-xs leading-relaxed">{message}</p>
    </div>
  );
}

function KycField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-sunken border border-border-main focus:border-role-issuer rounded-md px-3 py-2.5 text-sm text-txt-primary outline-none transition-colors"
      />
    </div>
  );
}
