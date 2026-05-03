import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** "md" = 720, "lg" = 960, "xl" = 1120 */
  size?: "md" | "lg" | "xl";
  /** A pinned summary below the title (e.g. value + delta) */
  hero?: ReactNode;
  /** Optional segmented tabs in the header */
  tabs?: ReactNode;
  /** Optional sticky footer */
  footer?: ReactNode;
  children: ReactNode;
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  md: "max-w-[720px]",
  lg: "max-w-[960px]",
  xl: "max-w-[1120px]",
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "lg",
  hero,
  tabs,
  footer,
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-pop border border-ink-200 max-h-[88vh] flex flex-col overflow-hidden animate-[fadein_.18s_ease-out]",
          SIZE[size]
        )}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-ink-200">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink-900 truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[12px] text-ink-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100 text-ink-500 shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          {hero && <div className="mt-3">{hero}</div>}
          {tabs && <div className="mt-3 -mb-1">{tabs}</div>}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-ink-50/40">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3 border-t border-ink-200 bg-white flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>,
    document.body
  );
}
