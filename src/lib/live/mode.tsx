import { useLocation } from "react-router-dom";
import { Database, FlaskConical } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Which screens read the platform, and which still show the sample dataset.
 *
 * The front end is wired to v2's database and engine one screen at a time. Until a screen
 * is wired it keeps the sample data it was designed with, and it says so on every visit —
 * a person signed in to the platform must never mistake a sample figure for their hotel's.
 *
 * A route is live when a prefix here matches it. Add the prefix in the same change that
 * wires the screen; a screen wired without an entry here is a live screen wearing a
 * sample-data notice, which is merely confusing, and a screen listed here before it is
 * wired is a sample figure presented as real, which is the thing this file exists to
 * prevent.
 */
export const LIVE_ROUTES: readonly string[] = [
  "/properties",
  "/performance/energy/overview",
];

export function isLiveRoute(pathname: string): boolean {
  return LIVE_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type DataMode = "live" | "sample";

/** Live when a real person is signed in to the platform; sample in the demo session. */
export function useDataMode(): DataMode {
  const { session, isDemo } = useAuth();
  return session && !isDemo ? "live" : "sample";
}

/** The notice a signed-in reader sees on a screen that is not yet wired. */
export function SampleDataNotice() {
  const mode = useDataMode();
  const { pathname } = useLocation();
  if (mode !== "live" || isLiveRoute(pathname)) return null;
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200 text-[12px] text-amber-800 shrink-0">
      <FlaskConical size={14} className="shrink-0 text-amber-600" />
      <span className="leading-snug">
        <span className="font-semibold">Sample data</span>
        {" — this screen is not yet connected to your hotels. The figures on it are illustrative."}
      </span>
    </div>
  );
}

/** A chip a wired screen can put beside its title. */
export function LiveChip() {
  const mode = useDataMode();
  if (mode !== "live") return null;
  return (
    <span className="chip rounded-full bg-good/10 text-good border border-good/25 gap-1">
      <Database size={11} /> Live data
    </span>
  );
}
