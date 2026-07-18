// ─────────────────────────────────────────────────────────────
// CredChain — Vouch page (/vouch/:candidateId/:skillIndex)
// Ported from monorepo frontend/src/pages/VouchPage.jsx.
// Target of a candidate's shareable "request a vouch" link. Any signed-in
// member can land here; if their reputation is ≥ 60 they can stake 10 points
// to attest the candidate's self-declared skill (sandbox → attested).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Handshake, ShieldCheck, SearchX, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getStudentPortfolio, vouchSkill } from "../services/api";
import Logo from "../components/Logo";

export default function VouchPage() {
  const { candidateId, skillIndex } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [state, setState] = useState<"loading" | "ready" | "error" | "notfound">("loading");
  const [student, setStudent] = useState<any>(null);
  const [skill, setSkill] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const idx = Number(skillIndex);
  const isSelf = isAuthenticated && String(user?.id) === String(candidateId);

  useEffect(() => {
    if (!isAuthenticated) {
      setState("ready");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const data: any = await getStudentPortfolio(candidateId!);
        if (!alive) return;
        const sandbox = data?.portfolio?.sandboxSkills || data?.sandboxLedger || [];
        setStudent(data?.portfolio?.student || data?.student || null);
        if (!Number.isInteger(idx) || idx < 0 || idx >= sandbox.length) {
          setState("notfound");
          return;
        }
        setSkill(sandbox[idx]);
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAuthenticated, candidateId, idx]);

  async function handleVouch() {
    setSubmitting(true);
    setResult(null);
    try {
      const res: any = await vouchSkill(candidateId!, idx, user?.name);
      setResult({ ok: true, message: res?.message || "Vouch recorded." });
    } catch (err: any) {
      setResult({ ok: false, message: err?.message || "Could not record the vouch." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <header className="border-b border-border-subtle px-6 py-4">
        <Link to="/"><Logo /></Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Not signed in */}
          {!isAuthenticated && (
            <div className="bg-bg-surface border border-border-main rounded-lg p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                <Handshake className="w-7 h-7" />
              </div>
              <h1 className="font-display text-xl font-bold text-txt-primary">Sign in to vouch</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-txt-secondary">
                Someone asked you to vouch for a skill. You'll need to sign in first — vouching stakes your own reputation, so it can't be anonymous.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                <ShieldCheck className="w-4 h-4" /> Sign in to continue
              </Link>
            </div>
          )}

          {isAuthenticated && state === "loading" && (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 className="w-5 h-5 animate-spin text-role-candidate" />
              <span className="text-sm text-txt-secondary">Loading the skill…</span>
            </div>
          )}

          {isAuthenticated && (state === "error" || state === "notfound") && (
            <div className="bg-bg-surface border border-border-main rounded-lg p-8 text-center">
              <SearchX className="mx-auto w-8 h-8 text-txt-muted mb-3" />
              <h2 className="font-display font-bold text-txt-primary">
                {state === "error" ? "Couldn't load this request" : "Skill not found"}
              </h2>
              <p className="mt-1 text-sm text-txt-secondary">
                {state === "error"
                  ? "Please try the link again in a moment."
                  : "This vouch link is no longer valid — the skill may have already been vouched for or removed."}
              </p>
            </div>
          )}

          {isAuthenticated && state === "ready" && skill && (
            <div className="bg-bg-surface border border-border-main rounded-lg p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                  <Handshake className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display text-lg font-bold text-txt-primary">
                    Vouch for {student?.name || "this candidate"}
                  </h1>
                  <p className="mt-0.5 text-sm text-txt-secondary">
                    You're about to put your reputation behind a self-declared skill.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-md border border-border-subtle bg-bg-sunken p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-txt-primary">{skill.skillName || skill.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-500 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">
                    <Handshake className="w-3 h-3" /> Attested
                  </span>
                </div>
                <p className="mt-1 text-xs text-txt-muted">
                  {skill.source || "Self-taught"}{skill.link ? ` · ${skill.link}` : ""}
                </p>
              </div>

              {result && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-md border p-3.5 text-sm ${
                    result.ok
                      ? "border-hash-green/40 bg-hash-green/10 text-hash-green"
                      : "border-red-500/40 bg-red-500/10 text-red-500"
                  }`}
                >
                  {result.ok ? <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" /> : <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />}
                  <span>{result.message}</span>
                </div>
              )}

              {!result?.ok && (
                <div className="mt-5">
                  {isSelf ? (
                    <p className="text-center text-sm text-txt-secondary">
                      You can't vouch for your own skill — share this link with someone who knows your work.
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 rounded-md bg-bg-sunken px-3 py-2 text-xs text-txt-secondary">
                        Vouching stakes <span className="font-semibold text-txt-primary">10 reputation points</span>. You keep them if the vouch holds up — you lose them for good if it's ever proven false. You need a reputation of <span className="font-semibold">60+</span> to vouch.
                      </div>
                      <button
                        disabled={submitting}
                        onClick={handleVouch}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
                        Vouch &amp; stake 10 points
                      </button>
                    </>
                  )}
                </div>
              )}

              {result?.ok && (
                <div className="mt-5 text-center">
                  <button
                    onClick={() => navigate("/")}
                    className="rounded-md border border-border-main hover:border-role-candidate px-4 py-2 text-sm font-semibold text-txt-primary transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
