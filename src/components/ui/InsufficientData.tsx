import type { ReactNode } from "react";
import { Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Insufficient-data state per BRD §5.
 *
 * Use when a layer / metric cannot yet be computed because of missing
 * baseline data, insufficient pool size, or pending approvals. Always shows
 * a clear explanation, never a blank chart.
 */
export default function InsufficientData({
  title,
  body,
  hint,
  action,
  tone = "info",
}: {
  title: string;
  body: ReactNode;
  /** Small caption showing progress, e.g. "7 / 12 months of approved data". */
  hint?: ReactNode;
  action?: ReactNode;
  tone?: "info" | "warn";
}) {
  const ring =
    tone === "warn"
      ? "ring-warn/25 bg-warn/5"
      : "ring-info/25 bg-info/5";
  const iconCls =
    tone === "warn"
      ? "bg-warn/15 text-warn"
      : "bg-info/15 text-info";

  return (
    <div className={cn("card-lg p-8 text-center ring-1", ring)}>
      <div
        className={cn(
          "w-12 h-12 mx-auto rounded-2xl grid place-items-center mb-3",
          iconCls
        )}
      >
        <Hourglass size={20} />
      </div>
      <div className="text-base font-semibold text-ink-900">{title}</div>
      <p className="text-sm text-ink-600 mt-1.5 max-w-md mx-auto leading-relaxed">
        {body}
      </p>
      {hint && (
        <div className="text-[12px] text-ink-500 mt-3 inline-flex items-center gap-1">
          {hint}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
