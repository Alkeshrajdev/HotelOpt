import type { ReactNode } from "react";
import { useTopbar } from "@/lib/topbarContext";

export default function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  /** Set true on any data-driven page to show the applied-context line (BRD §2.1). */
  showContext = true,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  showContext?: boolean;
}) {
  const { contextLine } = useTopbar();

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700 mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {showContext && (
          <p className="hidden sm:block text-[11px] text-ink-400 mt-1 font-medium tracking-wide truncate">
            {contextLine}
          </p>
        )}
        {subtitle && (
          <p className="hidden sm:block text-sm text-ink-500 mt-1.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
