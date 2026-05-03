// Shared shell for every admin sub-page — breadcrumb, title, actions, tabs.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AdminShell({
  title,
  eyebrow,
  subtitle,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center text-[12px] text-ink-500 gap-1.5 mb-1">
        <Link to="/admin" className="hover:text-brand-700 inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Admin
        </Link>
        <span>/</span>
        <span>{title}</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700 mb-1">
              {eyebrow}
            </div>
          )}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 mt-1.5 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
