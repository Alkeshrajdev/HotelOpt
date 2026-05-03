import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

/** BRD §1.2 — three card levels.
 *  1 = primary KPI / urgent insight  (stronger shadow, 1.5rem padding)
 *  2 = standard data card            (0.5px border, regular shadow)
 *  3 = supporting / contextual       (muted bg, lighter border, compact padding)
 *  undefined / "default" = legacy base card (unchanged)
 */
type CardLevel = 1 | 2 | 3;
type CardSize  = "default" | "lg";

const levelClass: Record<CardLevel, string> = {
  1: "card-level-1",
  2: "card-level-2",
  3: "card-level-3",
};

export function Card({
  className,
  size = "default",
  level,
  accentColor,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  size?: CardSize;
  /** BRD §1.2 card level (1 | 2 | 3). Falls back to base .card when omitted. */
  level?: CardLevel;
  /** Optional pillar hex colour for a left-border accent on level-1 cards. */
  accentColor?: string;
}) {
  const base = level
    ? levelClass[level]
    : size === "lg"
    ? "card-lg"
    : "card";

  return (
    <div
      className={cn(
        base,
        level === 1 && accentColor && "card-level-1-accent",
        className
      )}
      style={
        level === 1 && accentColor
          ? { borderLeftColor: accentColor }
          : undefined
      }
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  hint,
  right,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-6 pt-6", className)}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold text-ink-900 leading-snug">{title}</h3>
        {hint && <span className="text-[12px] text-ink-500">{hint}</span>}
      </div>
      {right && <div className="shrink-0 pt-0.5">{right}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
