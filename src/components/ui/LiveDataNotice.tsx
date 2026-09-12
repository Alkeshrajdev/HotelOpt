import { Database } from "lucide-react";
import { useDataMode } from "@/lib/data/mode";

/** Shown on portfolio analytics while they still read the demo dataset in a live session. */
export default function LiveDataNotice() {
  const mode = useDataMode();
  if (mode !== "live") return null;
  return (
    <div className="flex items-center gap-2.5 rounded-xl2 bg-info/10 px-4 py-2.5 text-[12px] text-info-700">
      <Database size={14} className="shrink-0" />
      <span><span className="font-semibold">Portfolio analytics use the demo dataset.</span> Properties, data capture, review and each property's performance overview run on live data.</span>
    </div>
  );
}
