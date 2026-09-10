import type { ReactNode } from "react";
import InfoHint from "@/components/ui/InfoHint";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "brand" | "good" | "warn" | "bad" | "info";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Colours the value (and icon chip). Use a status tone only when the number *is* a status. */
  tone?: StatTone;
  icon?: ReactNode;
  /** Tooltip beside the label. */
  info?: string;
  /** `card` sits on the page (white, elevated). `panel` sits inside a card (tinted, flat, compact). */
  variant?: "card" | "panel";
  className?: string;
};

const VALUE: Record<StatTone, string> = {
  neutral: "text-ink-900",
  info: "text-ink-900",
  brand: "text-brand-700",
  good: "text-good-700",
  warn: "text-warn-700",
  bad: "text-bad-700",
};

const CHIP: Record<StatTone, string> = {
  neutral: "bg-ink-100 text-ink-600",
  info: "bg-info/10 text-info-700",
  brand: "bg-brand-50 text-brand-700",
  good: "bg-good/10 text-good-700",
  warn: "bg-warn/10 text-warn-700",
  bad: "bg-bad/10 text-bad-700",
};

/** Summary / hero tile — label · value · hint. The one design for every page-level stat row. */
export default function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  info,
  variant = "card",
  className,
}: Props) {
  const panel = variant === "panel";
  return (
    <div className={cn(panel ? "rounded-xl2 bg-ink-50 p-4" : "card card-pad", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400 leading-snug">
          {label}
          {info && <InfoHint text={info} />}
        </div>
        {icon && (
          <span className={cn("w-8 h-8 rounded-full grid place-items-center shrink-0", CHIP[tone])}>{icon}</span>
        )}
      </div>
      <div className={cn(panel ? "text-2xl" : "text-stat", "leading-none font-bold mt-1.5 tabular-nums", VALUE[tone])}>
        {value}
      </div>
      {hint && <div className="text-[12px] text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}
