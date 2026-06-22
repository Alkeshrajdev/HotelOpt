import { AlertTriangle, CheckCircle2, Clock, Pencil } from "lucide-react";
import type { ReadinessStatus } from "@/lib/dataReadiness";

/** Shared monthly-capture status chip. One source of truth for the Capture Status
 *  tab (ReviewApproval) and the property Data Readiness matrix. */
export default function CaptureStatusChip({ status }: { status: ReadinessStatus }) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-good/10 text-good"><CheckCircle2 size={10} />Approved</span>;
  if (status === "submitted") return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-warn/10 text-amber-700"><Clock size={10} />Submitted</span>;
  if (status === "draft")    return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-brand-50 text-brand-700"><Pencil size={10} />Draft</span>;
  if (status === "missing")  return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-bad/10 text-bad"><AlertTriangle size={10} />Missing</span>;
  return <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium bg-ink-100 text-ink-400">N/A</span>;
}
