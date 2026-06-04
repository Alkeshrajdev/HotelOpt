import type { ReactNode } from "react";

export default function PageHeader({
  title,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  showContext?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
      <h1 className="page-title">{title}</h1>
      {actions && <div className="flex items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
