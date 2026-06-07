import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { session, signIn, signInDemo, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (session) {
    const next = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={next} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn(email, password);
    setSubmitting(false);
    if (res.error) setError(res.error);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-50">
      {/* Left visual panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div>
          {/* Light coloured logo — white bg with rounded corners floats on the dark panel */}
          <img
            src="/LogoLight.png"
            alt="Hotel Optimizer"
            className="w-48 rounded-2xl shadow-lg"
          />
        </div>
        <div>
          <div className="text-[13px] uppercase tracking-widest opacity-80">
            Sustainability performance, on one platform
          </div>
          <div className="text-3xl font-extrabold mt-3 leading-tight">
            Genuine Performance.<br />Verified data.<br />Action that compounds.
          </div>
          <div className="text-sm opacity-80 mt-4 max-w-md">
            Six pillars · four-layer performance story · maker–checker governance · framework-aligned reporting.
          </div>
        </div>
        <div className="text-[12px] opacity-70">© 2026 Hotel Optimizer</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Light coloured logo — visible on mobile where left panel is hidden */}
          <img src="/LogoLight.png" alt="Hotel Optimizer" className="h-10 w-auto object-contain mb-6 lg:hidden" />

          <form onSubmit={onSubmit}>
            <h1 className="text-2xl font-extrabold text-ink-900">Sign in</h1>
            <p className="text-sm text-ink-500 mt-1">
              Use your Hotel Optimizer credentials.
            </p>

            {error && (
              <div className="mt-4 text-sm rounded-lg border border-bad/25 bg-bad/10 text-bad px-3 py-2">
                {error}
              </div>
            )}

            <label className="block mt-5">
              <span className="text-[12px] font-medium text-ink-600">Email</span>
              <input
                className="input mt-1"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hotel.com"
              />
            </label>
            <label className="block mt-3">
              <span className="text-[12px] font-medium text-ink-600">Password</span>
              <input
                className="input mt-1"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-5"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Sign in
            </button>
          </form>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-ink-200" />
            <span className="text-[11px] text-ink-400">or</span>
            <div className="flex-1 h-px bg-ink-200" />
          </div>
          <button
            type="button"
            onClick={signInDemo}
            className="btn-secondary w-full mt-4 text-[13px]"
          >
            Continue as Demo
          </button>

        </div>
      </div>
    </div>
  );
}
