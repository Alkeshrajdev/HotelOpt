import { cn } from "@/lib/utils";

export default function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  className,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "good" | "warn" | "bad";
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const toneClass = {
    brand: "bg-brand-500",
    good: "bg-good",
    warn: "bg-warn",
    bad: "bg-bad",
  }[tone];
  return (
    <div className={cn("progress", className)}>
      <span className={toneClass} style={{ width: `${pct}%` }} />
    </div>
  );
}
