import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

// Google OAuth return leg. The backend redirects here with ?token=<jwt> (user is
// reconstructed from JWT claims by AuthContext) or ?error=<code>.
const ERROR_COPY: Record<string, string> = {
  oauth_not_configured: "Google sign-in is not configured on the server.",
  oauth_failed: "Google sign-in failed. Please try again.",
  oauth_denied: "Google sign-in was cancelled.",
  invalid_state: "Sign-in session expired — please try again.",
  email_exists: "An account with this email already exists. Sign in with your password instead.",
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
    if (err) {
      setError(ERROR_COPY[err] || `Sign-in failed (${err}).`);
      return;
    }
    if (!token) {
      setError("No sign-in token received.");
      return;
    }
    login(token); // AuthContext decodes claims → user
    const role = params.get("role");
    const home = role === "issuer" ? "/issuer" : role === "employer" || role === "verifier" ? "/verifier" : "/dashboard";
    navigate(home, { replace: true });
  }, [params, login, navigate]);

  return (
    <div className="min-h-screen bg-bg-base text-txt-primary flex flex-col items-center justify-center gap-6 p-6">
      <Logo wordmarkSize="md" />
      {error ? (
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-red-400 font-mono">{error}</p>
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white font-semibold text-sm transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-txt-secondary font-mono">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-brand-purple" />
          Completing sign-in…
        </div>
      )}
    </div>
  );
}
