import type { ReactNode } from "react";

export default function PageHeader({
  title,
  eyebrow,
  actions,
}: {
  title: string;
  // `subtitle` is accepted for backwards-compat but intentionally not rendered —
  // page headers stay data-dense (no filler paragraphs). `eyebrow` IS rendered
  // as a compact context label: it's the only breadcrumb signal on several
  // sub-pages (e.g. "Smart Operations · …") and costs almost no vertical space.
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  showContext?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-0.5">{eyebrow}</div>
        )}
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
      )}
    </div>
  );
}
