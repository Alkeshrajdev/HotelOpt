import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  /** Active text/icon colour class (e.g. a pillar colour). Defaults to brand. */
  activeColor?: string;
  badge?: string | number;
};

/**
 * One shared tab control for the whole app — replaces the four hand-rolled tab
 * treatments (border-b-2 strips, .tab pills, segmented boxes) that had drifted
 * apart. Accessible: role=tablist/tab + aria-selected, real focusable buttons
 * (the global :focus-visible ring shows keyboard focus).
 *
 *   variant="underline"  → primary tabs (sits on a bottom border)
 *   variant="segmented"  → a pill group in a tinted track (good for a selector)
 */
export default function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  ariaLabel,
  className,
  size = "md",
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  variant?: "underline" | "segmented";
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  if (variant === "segmented") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn("inline-flex flex-wrap items-center gap-1 rounded-xl bg-ink-100 p-1", className)}
      >
        {items.map((t) => {
          const Icon = t.icon;
          const active = t.key === value;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors",
                size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-sm",
                active
                  ? "bg-white shadow-card text-ink-900"
                  : "text-ink-500 hover:text-ink-900"
              )}
            >
              {Icon && <Icon size={size === "sm" ? 13 : 15} className={active ? t.activeColor ?? "text-brand-700" : "text-ink-400"} />}
              {t.label}
              {t.badge != null && (
                <span className={cn("ml-0.5 rounded-full px-1.5 text-[10px] font-semibold", active ? "bg-ink-100 text-ink-600" : "bg-ink-200 text-ink-500")}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // underline
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex items-center gap-1 border-b border-ink-200 overflow-x-auto", className)}
    >
      {items.map((t) => {
        const Icon = t.icon;
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-2 font-medium transition-colors -mb-px border-b-2 whitespace-nowrap",
              size === "sm" ? "px-3 py-2 text-[13px]" : "px-4 py-3 text-sm",
              active
                ? "text-ink-900 border-brand-700"
                : "text-ink-500 hover:text-ink-900 border-transparent"
            )}
          >
            {Icon && <Icon size={size === "sm" ? 14 : 16} className={active ? t.activeColor ?? "text-brand-700" : "text-ink-400"} />}
            {t.label}
            {t.badge != null && (
              <span className="rounded-full bg-ink-100 px-1.5 text-[10px] font-semibold text-ink-600">{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
