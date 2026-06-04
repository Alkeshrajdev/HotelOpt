import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { SUPABASE_CONFIGURED } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function DemoNotice({ message }: { message?: string }) {
  const [dismissed, setDismissed] = useState(false);
  const { session } = useAuth();
  const isDemoSession = session?.user?.id === "demo";
  const isDemo = !SUPABASE_CONFIGURED || isDemoSession;
  if (!isDemo || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-[12px] text-amber-800 shrink-0">
      <FlaskConical size={14} className="shrink-0 text-amber-600" />
      <span className="flex-1 leading-snug">
        <span className="font-semibold">Demo mode</span>
        {" — "}
        {message || "Sample data only. Connect real Supabase credentials to enable live data, approvals, and data capture."}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 w-6 h-6 grid place-items-center rounded hover:bg-amber-100 text-amber-600 transition-colors"
        aria-label="Dismiss demo notice"
      >
        <X size={12} />
      </button>
    </div>
  );
}
