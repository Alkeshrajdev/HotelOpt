import { CheckCircle2, Circle, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReadinessItem = {
  label: string;
  state: "ready" | "partial" | "missing";
  hint?: string;
};

/**
 * Reusable readiness checklist used by:
 *  - GP Setup tab — baseline year, 12 months data, occupancy, weather, ops events
 *  - External Comparison eligibility — star rating, operation type, size, climate, pool
 *
 * Each item gets a green check, amber hourglass, or empty circle.
 */
export default function ReadinessChecklist({
  items,
  title,
  hint,
}: {
  items: ReadinessItem[];
  title?: string;
  hint?: string;
}) {
  const ready = items.filter((i) => i.state === "ready").length;
  const total = items.length;
  const pct = Math.round((ready / total) * 100);

  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-ink-900">{title}</div>
            {hint && <div className="text-[12px] text-ink-500">{hint}</div>}
          </div>
          <div className="text-[12px] font-semibold text-ink-700">
            {ready}/{total} ready
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((it) => {
          const Icon =
            it.state === "ready"
              ? CheckCircle2
              : it.state === "partial"
                ? Hourglass
                : Circle;
          const tone =
            it.state === "ready"
              ? "text-good"
              : it.state === "partial"
                ? "text-warn"
                : "text-ink-400";
          return (
            <li
              key={it.label}
              className="flex items-start gap-3 rounded-lg border border-ink-200 px-3 py-2.5"
            >
              <Icon size={16} className={cn(tone, "mt-0.5 shrink-0")} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink-900">{it.label}</div>
                {it.hint && (
                  <div className="text-[11px] text-ink-500 mt-0.5">{it.hint}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            pct >= 80 ? "bg-good" : pct >= 50 ? "bg-warn" : "bg-bad"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
