import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "good" | "warn" | "bad" | "info" | "neutral" | "brand";

const toneClass: Record<Tone, string> = {
  good:    "bg-good/10 text-good border border-good/25",
  warn:    "bg-warn/10 text-warn border border-warn/25",
  bad:     "bg-bad/10  text-bad  border border-bad/25",
  info:    "bg-info/10 text-info border border-info/25",
  neutral: "bg-ink-100 text-ink-700 border border-ink-200",
  brand:   "bg-brand-50 text-brand-700 border border-brand-100",
};

export default function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "chip rounded-full px-2 py-[1px] text-[11px] font-medium",
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
