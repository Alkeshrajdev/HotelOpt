import type { ReactNode } from "react";

/**
 * The one empty state for the app. Standalone it is its own card; `inset` drops the
 * card chrome for use inside an existing card, list or table (e.g. a filtered table
 * with no matching rows), so every "nothing here" moment looks the same.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  inset = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  inset?: boolean;
}) {
  return (
    <div className={inset ? "py-10 px-6 text-center" : "card card-pad py-12 text-center"}>
      {icon && (
        <div className="w-12 h-12 mx-auto rounded-2xl bg-ink-50 grid place-items-center text-ink-400 mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="text-sm text-ink-500 max-w-md mx-auto mt-1.5">
          {description}
        </p>
      )}
      {action && <div className="mt-4 inline-flex">{action}</div>}
    </div>
  );
}
