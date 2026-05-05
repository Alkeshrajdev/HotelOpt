import { FlaskConical } from "lucide-react";
import { SUPABASE_CONFIGURED } from "@/lib/supabase";

export default function DemoNotice({ message }: { message?: string }) {
  if (SUPABASE_CONFIGURED) return null;
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
      <FlaskConical size={14} className="shrink-0 mt-px text-amber-500" />
      <div>
        <span className="font-semibold">Demo data</span>
        <span className="text-amber-700 ml-2">
          {message ?? "This module shows representative sample data and is not connected to live records."}
        </span>
      </div>
    </div>
  );
}
