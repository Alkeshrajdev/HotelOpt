import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = {
  key: string;
  label: string;
  hint?: string;
};

/**
 * Horizontal status pipeline. Used by:
 *  - Actions  · Proposed → Approved → In Progress → Completed → Verified
 *  - Certifications · Not Ready → Partial → Ready → Audited
 *  - Public Page · Draft → Pending Approval → Live → Disabled
 */
export default function StatusPipeline({
  steps,
  active,
  size = "md",
}: {
  steps: PipelineStep[];
  /** index of the current step (0-based) — earlier steps render as complete */
  active: number;
  size?: "sm" | "md";
}) {
  const dot = size === "sm" ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-[11px]";
  return (
    <ol className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const done = i < active;
        const isActive = i === active;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full grid place-items-center font-bold shrink-0",
                  dot,
                  done
                    ? "bg-good text-white"
                    : isActive
                      ? "bg-brand-700 text-white shadow-sm"
                      : "bg-ink-100 text-ink-500"
                )}
              >
                {done ? <Check size={size === "sm" ? 11 : 14} /> : i + 1}
              </span>
              <div className="leading-tight">
                <div
                  className={cn(
                    size === "sm" ? "text-[12px]" : "text-[13px]",
                    "font-semibold",
                    isActive ? "text-ink-900" : done ? "text-good" : "text-ink-500"
                  )}
                >
                  {s.label}
                </div>
                {s.hint && size !== "sm" && (
                  <div className="text-[11px] text-ink-500">{s.hint}</div>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px w-8",
                  done ? "bg-good" : "bg-ink-200"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
