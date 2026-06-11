import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  showContext?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-ink-500 mt-1 max-w-2xl leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
      )}
    </div>
  );
}
