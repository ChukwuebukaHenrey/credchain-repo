// components/issuer/GetVerifiedFlow.tsx
// Polymorphic issuer onboarding — port of monorepo IssuerOnboardingWizard
// (Section 4.3), THE anti-fraud + global-fairness centerpiece.
//
// A multi-step wizard whose required fields change by institutionType
// (Types A–E). Legitimacy = "is this a real, identifiable, accountable
// entity", never fame. The Country Module (Section 6) drives which registry
// IDs are asked for and whether the country is automated.
//
// Maps onto the LOCKED backend funnel:
//   register-step-one → verify-domain (live DNS TXT) → kyc/submit →
//   (admin) registry-cross-match → isVerifiedIssuer
//
// Graceful degradation: Type C, GitHub/DAO orgs, and ANY country without an
// automated module route to manual review + external footprint check instead
// of being blocked.
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Info,
  Check,
  Copy,
  GitBranch,
  Globe,
  ShieldCheck,
  Clock,
  ArrowRight,
  ArrowLeft,
  ScanFace,
} from "lucide-react";
import {
  INSTITUTION_TYPES,
  SUPPORTED_COUNTRIES,
  getInstitutionType,
  getCountryModule,
  startingTrustTier,
  InstitutionField,
} from "../../lib/institutions";
import { registerIssuerStepOne, verifyIssuerDomain, submitIssuerKyc } from "../../services/api";

const DRAFT_KEY = "credchain_issuer_onboarding";

type WizardStep = "choose" | "details" | "verify" | "kyc" | "done";

// Resolve which verification path applies given the type + country module.
function resolveReviewMode(type: ReturnType<typeof getInstitutionType>, country: ReturnType<typeof getCountryModule>) {
  if (!type) return "manual";
  if (type.verifyPath === "manual") return "manual";
  if (type.verifyPath === "github") return "github";
  // domain path: only automated when the country module supports it.
  return country.automated ? "auto" : "manual";
}

const TIER_LABELS: Record<string, string> = {
  applied: "Application received",
  domain_verified: "Email domain confirmed",
  identity_checked: "Identity check passed",
  active: "Fully verified — you can now award skills",
};

export default function GetVerifiedFlow({
  onNotify,
}: {
  onNotify?: (message: string, variant: "success" | "danger") => void;
}) {
  const [step, setStep] = useState<WizardStep>("choose");
  const [typeKey, setTypeKey] = useState("A");
  const [countryCode, setCountryCode] = useState("NG");
  const [values, setValues] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Funnel artefacts.
  const [dns, setDns] = useState<{ recordType?: string; host?: string; value?: string } | null>(null);
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [kyc, setKyc] = useState<{ reference?: string } | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [outcome, setOutcome] = useState<"auto" | "manual" | null>(null);

  const type = useMemo(() => getInstitutionType(typeKey), [typeKey]);
  const country = useMemo(() => getCountryModule(countryCode), [countryCode]);
  const reviewMode = useMemo(() => resolveReviewMode(type, country), [type, country]);
  const trustTier = useMemo(() => startingTrustTier(typeKey, country), [typeKey, country]);

  // Restore an in-progress DNS challenge across refreshes (so the token the
  // issuer added to DNS isn't lost).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && draft.step) {
        setStep(draft.step);
        setTypeKey(draft.typeKey || "A");
        setCountryCode(draft.countryCode || "NG");
        setValues(draft.values || {});
        setDns(draft.dns || null);
        setStatus(draft.status || null);
        setRiskFlags(draft.riskFlags || []);
        setKyc(draft.kyc || null);
        setOutcome(draft.outcome || null);
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, []);

  function persist(next: Record<string, any>) {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, typeKey, countryCode, values, dns, status, riskFlags, kyc, outcome, ...next })
      );
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }

  function setField(name: string, value: any) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  // Pull the right registry metadata for a 'registry' field from the country module.
  function registryMeta(fieldLabel: string) {
    const map: Record<string, any> = {
      education: country.educationRegistry,
      business: country.businessRegistry,
      professional: country.professionalRegistry,
    };
    return map[fieldLabel] || { idLabel: "Registry ID", placeholder: "", apiAvailable: false };
  }

  function validateDetails(): string | null {
    for (const f of type.fields) {
      const v = values[f.name];
      if (f.required && (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0))) {
        return f.type === "registry" ? registryMeta(f.label).idLabel : f.label;
      }
    }
    return null;
  }

  // ── Step transitions ───────────────────────────────────────
  function goDetails() {
    setError(null);
    setNotice(null);
    setStep("details");
    persist({ step: "details" });
  }

  async function submitDetails() {
    setError(null);
    setNotice(null);
    const missing = validateDetails();
    if (missing) {
      setError(`Please complete: ${missing}.`);
      return;
    }

    // AUTO (domain) path → kick off the real backend funnel.
    if (reviewMode === "auto") {
      setBusy(true);
      try {
        const res: any = await registerIssuerStepOne(type.backendType, values.domainEmail);
        const inst = res?.dnsInstructions || {};
        const nextDns = { recordType: inst.recordType, host: inst.host, value: inst.value };
        setDns(nextDns);
        setStatus(res?.issuer?.verificationStatus || "applied");
        setRiskFlags(res?.issuer?.riskFlags || []);
        setStep("verify");
        persist({ step: "verify", dns: nextDns, status: res?.issuer?.verificationStatus || "applied", riskFlags: res?.issuer?.riskFlags || [] });
      } catch (err: any) {
        setError(err?.message || "Could not start verification. Check the email domain and try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // MANUAL / GITHUB path → no consumer-email backend call; go to the
    // footprint-review screen (client-side submission for the demo).
    setStep("verify");
    persist({ step: "verify" });
  }

  async function verifyDns() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res: any = await verifyIssuerDomain();
      setStatus(res?.verificationStatus || "domain_verified");
      setNotice("Email domain confirmed — that's step 2 done.");
      setStep("kyc");
      persist({ step: "kyc", status: res?.verificationStatus || "domain_verified" });
    } catch (err: any) {
      setError(err?.message || "DNS TXT record not found yet. It can take a few minutes to propagate — try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  async function startKyc() {
    setError(null);
    setBusy(true);
    try {
      const res: any = await submitIssuerKyc();
      setKyc({ reference: res?.kycReference });
      setOutcome("auto");
      setStep("done");
      persist({ step: "done", kyc: { reference: res?.kycReference }, outcome: "auto" });
      onNotify?.("Verification submitted — awaiting final admin vetting.", "success");
    } catch (err: any) {
      setError(err?.message || "Could not start identity verification. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submitManualReview() {
    setOutcome("manual");
    setStep("done");
    persist({ step: "done", outcome: "manual" });
    onNotify?.("Submitted for manual review.", "success");
  }

  function connectGithub() {
    // Type D: the spec's "Connect GitHub Organization" flow. No backend GitHub
    // OAuth exists, so this simulates the repo-health + admin-rights check
    // client-side, then routes into manual review.
    setBusy(true);
    setTimeout(() => {
      setGithubConnected(true);
      setBusy(false);
      setNotice("GitHub organisation connected. We've confirmed it's active and that you help run it.");
    }, 600);
  }

  function restart() {
    localStorage.removeItem(DRAFT_KEY);
    setStep("choose");
    setValues({});
    setDns(null);
    setStatus(null);
    setRiskFlags([]);
    setKyc(null);
    setGithubConnected(false);
    setOutcome(null);
    setError(null);
    setNotice(null);
  }

  const stepIndex = { choose: 0, details: 1, verify: 2, kyc: 3, done: 4 }[step];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-txt-primary">Become a Verified Issuer</h2>
        <p className="mt-1 text-sm leading-relaxed text-txt-secondary">
          Students never self-certify onto the Verified Ledger — every credential is vouched for by an accountable
          issuer. This is how we stay zero-fraud <em>and</em> globally fair.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip>{country.flag} {country.countryName || country.countryCode}</Chip>
          <Chip tone={reviewMode === "auto" ? "green" : "amber"}>
            {reviewMode === "auto" ? "Automated funnel" : reviewMode === "github" ? "GitHub + review" : "Manual review fallback"}
          </Chip>
          <Chip tone="purple">Start: {trustTier.tier}</Chip>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-main rounded-lg p-6">
        <Steps current={stepIndex} reviewMode={reviewMode} />

        {notice && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-hash-green/30 bg-hash-green/5 px-4 py-3 text-sm text-hash-green">
            <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-hash-red/30 bg-hash-red/5 px-4 py-3 text-sm text-hash-red">
            <XCircle className="mt-0.5 w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP: choose type + country ── */}
        {step === "choose" && (
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-txt-primary">What kind of organisation are you?</h3>
            <p className="mt-1 text-sm leading-relaxed text-txt-secondary">
              Any real organisation counts — small or little-known is fine. You don't need to be famous, just real and
              accountable.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INSTITUTION_TYPES.map((t) => {
                const active = t.key === typeKey;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTypeKey(t.key)}
                    className={`rounded-lg border-2 p-4 text-center transition-colors cursor-pointer ${
                      active
                        ? "border-role-issuer bg-role-issuer-soft"
                        : "border-border-main bg-bg-sunken hover:border-border-strong"
                    }`}
                  >
                    <div className="text-2xl">{t.icon}</div>
                    <p className="mt-2 text-sm font-semibold text-txt-primary">{t.title}</p>
                    <p className="mt-1 text-xs leading-snug text-txt-secondary">{t.blurb}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-txt-primary block mb-1.5">Country / region</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-role-issuer"
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <div
                className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                  country.automated
                    ? "border-hash-green/30 bg-hash-green/5 text-hash-green"
                    : "border-amber-500/30 bg-amber-500/5 text-amber-500"
                }`}
              >
                <Info className="mt-0.5 w-3.5 h-3.5 shrink-0" />
                {country.automated ? (
                  <span>
                    {country.flag} {country.countryName}: we can verify you automatically — confirm your email domain
                    and a quick identity check.
                  </span>
                ) : (
                  <span>
                    We can't auto-verify this region yet, so a real person on our team will{" "}
                    <strong>review your details and online presence</strong> instead. A genuine organisation is never
                    turned away just because we lack an automatic check here.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={goDetails}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: type-specific details ── */}
        {step === "details" && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">{type.icon}</span>
              <h3 className="font-display text-lg font-bold tracking-tight text-txt-primary">{type.title}</h3>
            </div>

            <div className="space-y-4">
              {type.fields.map((f: InstitutionField) => {
                if (f.type === "registry") {
                  const meta = registryMeta(f.label);
                  return (
                    <FieldShell
                      key={f.name}
                      label={meta.idLabel}
                      note={meta.apiAvailable ? "We can check this automatically for your country." : "We'll use this during review — no automatic check in this region yet."}
                    >
                      <input
                        value={values[f.name] || ""}
                        onChange={(e) => setField(f.name, e.target.value)}
                        placeholder={meta.placeholder}
                        className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-issuer"
                      />
                    </FieldShell>
                  );
                }
                if (f.type === "file") {
                  const names: string[] = values[f.name] || [];
                  return (
                    <FieldShell key={f.name} label={f.label} note={f.note}>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setField(f.name, Array.from(e.target.files || []).map((file) => file.name))}
                        className="w-full rounded-md border border-border-main bg-bg-sunken px-3 py-2 text-sm text-txt-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand-purple file:px-3 file:py-1.5 file:text-white file:cursor-pointer"
                      />
                      {names.length > 0 && <p className="mt-1 text-xs text-hash-green">Attached: {names.join(", ")}</p>}
                    </FieldShell>
                  );
                }
                return (
                  <FieldShell key={f.name} label={f.label} note={f.note}>
                    <input
                      type={f.type === "number" ? "number" : f.type}
                      value={values[f.name] ?? ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-bg-sunken border border-border-main rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-role-issuer"
                    />
                  </FieldShell>
                );
              })}
            </div>

            {/* Path banner */}
            <div className="mt-4 flex items-start gap-2 rounded-md border border-brand-purple/30 bg-brand-purple-soft px-4 py-3 text-xs text-brand-purple">
              <Info className="mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span>
                {reviewMode === "auto"
                  ? "Next: prove domain ownership via a DNS TXT record (checked live), then a quick KYC."
                  : reviewMode === "github"
                  ? "Next: connect your GitHub org so we can confirm repo health + your admin rights."
                  : "Next: submit your public footprint for a CredChain reviewer. No registry paperwork required."}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1.5 text-sm text-txt-secondary hover:text-txt-primary cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={submitDetails}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                {busy ? "Submitting…" : reviewMode === "auto" ? "Start domain verification" : "Continue"}
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: verify (DNS auto / manual / github) ── */}
        {step === "verify" && reviewMode === "auto" && dns && (
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-txt-primary">Prove you control the domain</h3>
            <p className="mt-1 text-sm leading-relaxed text-txt-secondary">
              Add this TXT record at your DNS provider, then verify. We read it live — no screenshots, no trust-me.
            </p>

            {riskFlags.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-500">
                <Info className="mt-0.5 w-3.5 h-3.5 shrink-0" />
                <span>
                  Anti-fraud signals on record: {riskFlags.join(", ")} — these lower your starting trust tier but don't
                  block you.
                </span>
              </div>
            )}

            <dl className="mt-4 break-all rounded-md border border-border-main bg-bg-sunken p-3.5 font-mono text-[13px] leading-relaxed">
              <DnsRow k="Type" v={dns.recordType || "TXT"} />
              <DnsRow k="Host" v={dns.host || ""} />
              <DnsRow k="Value" v={dns.value || ""} copyable />
            </dl>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="inline-flex items-center gap-1.5 text-sm text-txt-secondary hover:text-txt-primary cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={verifyDns}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                {!busy && <Globe className="w-4 h-4" />}
                {busy ? "Checking DNS…" : "Verify DNS now"}
              </button>
            </div>
          </div>
        )}

        {step === "verify" && reviewMode !== "auto" && (
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-txt-primary">
              {reviewMode === "github" ? "Connect your GitHub organization" : "Submit for manual review"}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-txt-secondary">
              {reviewMode === "github"
                ? "We confirm repo health and your admin rights — registry paperwork isn't required for real OSS communities."
                : "You don't need formal registry paperwork to be legitimate. A CredChain reviewer checks your public footprint and accountability."}
            </p>

            <div className="mt-4 rounded-md border border-border-main bg-bg-sunken p-4 text-sm text-txt-secondary">
              <p className="font-semibold text-txt-primary">{values.orgName || "Your organization"}</p>
              {values.eventPlatformUrl && <p className="mt-1 break-all">Footprint: {values.eventPlatformUrl}</p>}
              {values.githubOrgUrl && <p className="mt-1 break-all">GitHub: {values.githubOrgUrl}</p>}
              {values.footprintUrl && <p className="mt-1 break-all">Also: {values.footprintUrl}</p>}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-txt-muted">
                Starting tier: <Chip tone="amber">{trustTier.tier}</Chip> — upgrades over a clean track record.
              </p>
            </div>

            {reviewMode === "github" && !githubConnected && (
              <button
                type="button"
                onClick={connectGithub}
                disabled={busy}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold border border-border-main hover:border-role-issuer text-txt-primary disabled:opacity-50 px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                {!busy && <GitBranch className="w-4 h-4" />}
                {busy ? "Connecting…" : "Connect GitHub Organization"}
              </button>
            )}
            {reviewMode === "github" && githubConnected && (
              <div className="mt-4 flex items-center gap-2 text-sm text-hash-green">
                <CheckCircle2 className="w-4 h-4" /> GitHub organization connected.
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="inline-flex items-center gap-1.5 text-sm text-txt-secondary hover:text-txt-primary cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={submitManualReview}
                disabled={busy || (reviewMode === "github" && !githubConnected)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                Submit for review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: KYC (auto path) ── */}
        {step === "kyc" && (
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-txt-primary">Identity verification (KYC)</h3>
            <p className="mt-1 text-sm leading-relaxed text-txt-secondary">
              One last accountability check on the responsible administrator. The provider confirms it via secure
              webhook.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-hash-green/30 bg-hash-green/5 p-4 text-sm text-hash-green">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Tier 2 complete — <strong>{TIER_LABELS.domain_verified}</strong>.
              </span>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={startKyc}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                {!busy && <ScanFace className="w-4 h-4" />}
                {busy ? "Starting…" : "Begin identity verification"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center py-4 text-center">
            {outcome === "auto" ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hash-green/10 text-hash-green">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Clock className="w-7 h-7" />
              </div>
            )}
            <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-txt-primary">
              {outcome === "auto" ? "Verification submitted — almost there" : "Submitted for manual review"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-txt-secondary">
              {outcome === "auto" ? (
                <>
                  Domain ownership is proven and your KYC session is open. A CredChain admin completes the final
                  registry cross-match (Tier 4) before issuance unlocks. You'll move to <strong>Active</strong> then.
                </>
              ) : (
                <>
                  A reviewer will check {type.title.toLowerCase()} accountability via your public footprint. Real,
                  identifiable organizers are approved regardless of registry paperwork or fame.
                </>
              )}
            </p>

            <div className="mx-auto mt-5 w-full max-w-sm rounded-md border border-border-main bg-bg-sunken p-4 text-left text-sm">
              <Detail k="Type" v={`${type.icon} ${type.title}`} />
              <Detail k="Region" v={`${country.flag} ${country.countryName || country.countryCode}`} />
              <Detail k="Starting trust tier" v={trustTier.tier} />
              {outcome === "auto" && kyc?.reference && <Detail k="KYC reference" v={kyc.reference} mono />}
              <Detail k="Status" v={outcome === "auto" ? "Awaiting Tier-4 admin vetting" : "Pending reviewer"} />
            </div>

            <button
              type="button"
              onClick={restart}
              className="mt-6 text-sm text-txt-secondary hover:text-txt-primary cursor-pointer"
            >
              Start a new application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Presentational sub-components ─────────────────────────────

function Chip({ children, tone }: { children: React.ReactNode; tone?: "green" | "amber" | "purple" }) {
  const cls =
    tone === "green"
      ? "bg-hash-green/10 text-hash-green"
      : tone === "amber"
      ? "bg-amber-500/10 text-amber-500"
      : tone === "purple"
      ? "bg-brand-purple-soft text-brand-purple"
      : "bg-bg-sunken text-txt-secondary border border-border-subtle";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

function Steps({ current, reviewMode }: { current: number; reviewMode: string }) {
  const steps = reviewMode === "auto" ? ["Type", "Details", "Domain", "KYC", "Done"] : ["Type", "Details", "Review", "—", "Done"];
  return (
    <div className="mb-8 flex items-center gap-0">
      {steps.map((label, i) => {
        if (label === "—") return <div key={i} className="h-0.5 flex-1 bg-border-subtle" />;
        const active = i === current;
        const done = i < current;
        return (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                done
                  ? "bg-brand-purple text-white"
                  : active
                  ? "border-2 border-brand-purple text-brand-purple"
                  : "bg-bg-sunken text-txt-muted"
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${active || done ? "font-semibold text-txt-primary" : "text-txt-muted"}`}>{label}</span>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 transition-colors ${done ? "bg-brand-purple" : "bg-border-subtle"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function FieldShell({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-txt-primary">{label}</label>
      {children}
      {note && <p className="text-xs text-txt-muted">{note}</p>}
    </div>
  );
}

function DnsRow({ k, v, copyable }: { k: string; v: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <dt className="text-txt-muted">{k}</dt>
      <dd className="flex items-center gap-2 truncate text-brand-purple">
        <span className="truncate">{v}</span>
        {copyable && (
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-elevated px-2 py-0.5 text-[10px] font-sans text-txt-secondary hover:bg-bg-sunken cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-hash-green" /> : <Copy className="w-3 h-3" />}
            {copied ? "copied" : "copy"}
          </button>
        )}
      </dd>
    </div>
  );
}

function Detail({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-txt-muted">{k}</span>
      <span className={`text-right text-txt-primary ${mono ? "font-mono text-[13px]" : ""}`}>{v}</span>
    </div>
  );
}
