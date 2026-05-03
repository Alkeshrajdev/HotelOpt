import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Leaf, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { session, signIn, loading } = useAuth();
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center">
            <Leaf size={20} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight">HOTEL</div>
            <div className="text-[15px] font-extrabold -mt-1 tracking-tight">OPTIMIZER</div>
          </div>
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
        <form onSubmit={onSubmit} className="w-full max-w-sm">
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

          <p className="text-[12px] text-ink-500 mt-4">
            Demo accounts (after seeding) — <code className="kbd">maker@demo.test</code> / <code className="kbd">checker@demo.test</code>, password <code className="kbd">demo123!</code>.
          </p>
        </form>
      </div>
    </div>
  );
}
