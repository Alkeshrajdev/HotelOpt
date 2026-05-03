import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: ReactNode;
  iconBg?: string;
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: number;
  deltaUnit?: string;
  /** Higher = better? Default false (e.g. intensity, cost). */
  goodDirection?: "up" | "down";
  caption?: string;
  onClick?: () => void;
  active?: boolean;
  /** Use card-level-1 shadow for top-priority KPIs. */
  prominent?: boolean;
};

export default function KpiTile({
  icon,
  iconBg = "bg-brand-50 text-brand-700",
  label,
  value,
  unit,
  delta,
  deltaUnit = "vs prior year",
  goodDirection = "down",
  caption,
  onClick,
  active,
  prominent = false,
}: Props) {
  const showDelta = typeof delta === "number";
  const isGood =
    showDelta && (goodDirection === "down" ? delta! < 0 : delta! > 0);

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        prominent ? "card-level-1" : "card",
        "text-left p-6 w-full transition-all duration-150",
        onClick && "hover:shadow-pop hover:-translate-y-0.5 cursor-pointer",
        active && "ring-2 ring-brand-500 border-brand-200"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl grid place-items-center shrink-0",
            iconBg
          )}
        >
          {icon}
        </div>
        {onClick && (
          <span className="text-[11px] font-semibold text-ink-400 inline-flex items-center gap-0.5">
            Drill down <ChevronRight size={12} />
          </span>
        )}
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-500 truncate">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <div className="text-kpi text-ink-900 tabular-nums">{value}</div>
        {unit && (
          <span className="text-[12px] font-medium text-ink-500">{unit}</span>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2 min-h-[18px]">
        {showDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[12px] font-semibold rounded-md px-1.5 py-0.5",
              isGood ? "text-good bg-good/10" : "text-bad bg-bad/10"
            )}
          >
            {delta! < 0 ? (
              <ArrowDownRight size={12} />
            ) : (
              <ArrowUpRight size={12} />
            )}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
        {showDelta && (
          <span className="text-[11px] text-ink-500">{deltaUnit}</span>
        )}
        {!showDelta && caption && (
          <span className="text-[12px] text-ink-500">{caption}</span>
        )}
      </div>
    </Component>
  );
}
