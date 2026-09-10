import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight feedback layer — every save / submit / approve / delete should
 * confirm itself. Usage:
 *   const toast = useToast();
 *   toast.success("Settings saved");
 *   toast.error("Couldn't save", "Check the required fields and try again.");
 */

type Tone = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; tone: Tone; title: string; description?: string };

type ToastApi = {
  toast: (t: Omit<ToastItem, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-3), { ...t, id }]); // keep at most 4 on screen
      window.setTimeout(() => dismiss(id), t.tone === "error" ? 6000 : 3800);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast({ tone: "success", title, description }),
      error:   (title, description) => toast({ tone: "error",   title, description }),
      warning: (title, description) => toast({ tone: "warning", title, description }),
      info:    (title, description) => toast({ tone: "info",    title, description }),
    }),
    [toast]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(<ToastViewport items={items} onDismiss={dismiss} />, document.body)}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const TONE: Record<Tone, { icon: typeof Info; ring: string; icon_: string; bar: string }> = {
  success: { icon: CheckCircle2,  ring: "border-good/30", icon_: "text-good-700", bar: "bg-good" },
  error:   { icon: XCircle,       ring: "border-bad/30",  icon_: "text-bad-700",  bar: "bg-bad" },
  warning: { icon: AlertTriangle, ring: "border-warn/30", icon_: "text-warn-700", bar: "bg-warn" },
  info:    { icon: Info,          ring: "border-info/30", icon_: "text-info-700", bar: "bg-info" },
};

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2.5rem)] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {items.map((t) => {
        const cfg = TONE[t.tone];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto relative overflow-hidden card shadow-pop pl-4 pr-2 py-3 flex items-start gap-3",
              "animate-[toastin_160ms_ease-out]",
              cfg.ring
            )}
          >
            <span className={cn("absolute left-0 inset-y-0 w-1", cfg.bar)} aria-hidden />
            <Icon size={16} className={cn("mt-0.5 shrink-0", cfg.icon_)} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink-900">{t.title}</div>
              {t.description && (
                <div className="text-[12px] text-ink-500 mt-0.5 leading-snug">{t.description}</div>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="btn-ghost w-7 h-7 p-0 shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
