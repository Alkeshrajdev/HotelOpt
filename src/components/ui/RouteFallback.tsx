import { Loader2 } from "lucide-react";

/**
 * Shown while a lazily-loaded route chunk is fetched. Inside the app shell the
 * sidebar and top bar stay in place and only the content area waits; `full`
 * is for the rare top-level case (before the shell itself has rendered).
 */
export default function RouteFallback({ full = false }: { full?: boolean }) {
  return (
    <div
      className={full ? "min-h-screen grid place-items-center" : "min-h-[50vh] grid place-items-center"}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <Loader2 size={22} className="animate-spin text-ink-400" />
    </div>
  );
}
