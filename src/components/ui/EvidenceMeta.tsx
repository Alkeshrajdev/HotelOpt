import { CalendarCheck2, FileCheck2, ShieldCheck } from "lucide-react";

/**
 * Compact provenance line — sits under a KPI value to reinforce audit
 * readiness. Shows record count, evidence-match score, and last-approved
 * date in tiny text.
 *
 * Example: 142 records · 88% evidence match · last approved 20 May 2026
 */
export default function EvidenceMeta({
  records,
  matchPct,
  lastApproved,
}: {
  records: number;
  matchPct: number;
  lastApproved: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
      <span className="inline-flex items-center gap-1">
        <FileCheck2 size={11} className="text-ink-400" />
        {records.toLocaleString()} records
      </span>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck size={11} className="text-ink-400" />
        {matchPct}% evidence match
      </span>
      <span className="inline-flex items-center gap-1">
        <CalendarCheck2 size={11} className="text-ink-400" />
        last approved {lastApproved}
      </span>
    </div>
  );
}
