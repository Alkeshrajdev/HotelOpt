import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: ReactNode;
  iconBg?: string;
  label: string;
  value: ReactNode;
  suffix?: string;
  delta?: number;
  deltaUnit?: string;
  spark?: ReactNode;
  /** if higher number = better, set to "up". Default "down" (lower is better, e.g. intensity). */
  goodDirection?: "up" | "down";
};

export default function StatCard({
  icon,
  iconBg = "bg-brand-50 text-brand-700",
  label,
  value,
  suffix,
  delta,
  deltaUnit = "vs prior year",
  spark,
  goodDirection = "down",
}: Props) {
  const showDelta = typeof delta === "number";
  const isGood =
    showDelta && (goodDirection === "down" ? delta! < 0 : delta! > 0);
  return (
    <div className="card card-pad">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl grid place-items-center shrink-0",
            iconBg
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-ink-500 truncate">
            {label}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <div className="text-[26px] leading-none font-bold text-ink-900">
              {value}
            </div>
            {suffix && (
              <span className="text-[12px] font-medium text-ink-500">
                {suffix}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {showDelta ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[12px] font-semibold",
                  isGood ? "text-good" : "text-bad"
                )}
              >
                {delta! < 0 ? (
                  <ArrowDownRight size={14} />
                ) : (
                  <ArrowUpRight size={14} />
                )}
                {Math.abs(delta!).toFixed(1)}%
                <span className="font-normal text-ink-500 ml-1">
                  {deltaUnit}
                </span>
              </span>
            ) : (
              <span />
            )}
            {spark && <div className="opacity-90">{spark}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
