import { Link } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DATA_ASSURANCE_BY_HOTEL } from "@/lib/mock";
import { cn } from "@/lib/utils";

const AREA_COMPLETENESS = [
  { area: "Energy",     approved: 88, coverage: 92, status: "ok"   as const },
  { area: "Carbon",     approved: 84, coverage: 86, status: "ok"   as const },
  { area: "Water",      approved: 81, coverage: 84, status: "warn" as const },
  { area: "Waste",      approved: 76, coverage: 79, status: "warn" as const },
  { area: "Social",     approved: 68, coverage: 74, status: "bad"  as const },
  { area: "Governance", approved: 91, coverage: 93, status: "ok"   as const },
];

const METHOD_BREAKDOWN = [
  { method: "Meter API",  pct: 42 },
  { method: "OCR",        pct: 28 },
  { method: "Manual",     pct: 22 },
  { method: "Bulk CSV",   pct: 8  },
];

type AreaStatus = "ok" | "warn" | "bad";
const STATUS_TONE: Record<AreaStatus, "good" | "warn" | "bad"> = {
  ok:   "good",
  warn: "warn",
  bad:  "bad",
};

export default function AssuranceTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold text-ink-900 mb-1">Data & Assurance Control</h2>
        <p className="text-[13px] text-ink-500">
          Data completeness, approval status, evidence gaps, and assurance readiness across the portfolio.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <div className="flex divide-x divide-ink-100 min-w-max">
          <div className="px-5 py-4 min-w-[140px]">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Approved Data
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={14} className="text-good" />
              <span className="text-xl font-bold text-ink-900 tabular-nums">86%</span>
            </div>
          </div>
          <div className="px-5 py-4 min-w-[140px]">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Estimated Data
            </div>
            <div className="text-xl font-bold text-ink-900 tabular-nums mt-1">9%</div>
            <div className="text-[10px] text-ink-400">of total</div>
          </div>
          <div className="px-5 py-4 min-w-[160px]">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Missing Submissions
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle size={14} className="text-bad" />
              <span className="text-xl font-bold text-bad tabular-nums">31</span>
            </div>
          </div>
          <div className="px-5 py-4 min-w-[160px]">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Waiting for Review
            </div>
            <Link to="/review-approval" className="flex items-center gap-1.5 mt-1 group">
              <span className="text-xl font-bold text-warn tabular-nums">24</span>
              <ArrowRight size={12} className="text-brand-600 group-hover:text-brand-800 transition-colors" />
            </Link>
          </div>
          <div className="px-5 py-4 min-w-[160px]">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Evidence Gaps
            </div>
            <Link to="/portfolio/reports-certifications" className="flex items-center gap-1.5 mt-1 group">
              <span className="text-xl font-bold text-warn tabular-nums">18</span>
              <ArrowRight size={12} className="text-brand-600 group-hover:text-brand-800 transition-colors" />
            </Link>
          </div>
          <div className="px-5 py-4 min-w-[180px]">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Low-confidence Records
            </div>
            <div className="text-xl font-bold text-ink-900 tabular-nums mt-1">22</div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Data Completeness by Hotel"
          hint="approved data rate · missing and pending submissions"
          right={
            <Link
              to="/review-approval"
              className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
            >
              Open Review Queue <ArrowRight size={12} />
            </Link>
          }
        />
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Hotel</th>
                <th className="table-th">Approved %</th>
                <th className="table-th">Estimated %</th>
                <th className="table-th">Missing</th>
                <th className="table-th">Pending Review</th>
                <th className="table-th">Evidence Gaps</th>
                <th className="table-th">Low Conf.</th>
                <th className="table-th text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {DATA_ASSURANCE_BY_HOTEL.map((h) => (
                <tr key={h.hotel} className="hover:bg-ink-50/60">
                  <td className="table-td font-semibold text-ink-900 whitespace-nowrap">{h.hotel}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            h.approved >= 90 ? "bg-good" : h.approved >= 70 ? "bg-warn" : "bg-bad"
                          )}
                          style={{ width: `${h.approved}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-semibold text-[12px] tabular-nums",
                          h.approved >= 90 ? "text-good" : h.approved >= 70 ? "text-warn" : "text-bad"
                        )}
                      >
                        {h.approved}%
                      </span>
                    </div>
                  </td>
                  <td className="table-td text-[12px] text-ink-700 tabular-nums">{h.estimated}%</td>
                  <td className="table-td">
                    {h.missing > 0 ? (
                      <span className="text-[12px] font-semibold text-bad tabular-nums">{h.missing}</span>
                    ) : (
                      <span className="text-[12px] text-good">—</span>
                    )}
                  </td>
                  <td className="table-td">
                    {h.pending > 0 ? (
                      <span className="text-[12px] font-semibold text-warn tabular-nums">{h.pending}</span>
                    ) : (
                      <span className="text-[12px] text-good">—</span>
                    )}
                  </td>
                  <td className="table-td text-[12px] text-ink-700 tabular-nums">{h.evidenceGaps}</td>
                  <td className="table-td text-[12px] text-ink-700 tabular-nums">{h.lowConfidence}</td>
                  <td className="table-td text-right pr-6">
                    {h.pending > 0 ? (
                      <Link
                        to="/review-approval"
                        className="btn-secondary h-7 px-3 text-[12px] text-brand-700 border-brand-200 hover:bg-brand-50"
                      >
                        Review
                      </Link>
                    ) : (
                      <span className="text-[12px] text-ink-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Data Completeness by Area" hint="approved data and coverage rates" />
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Area</th>
                  <th className="table-th">Approved</th>
                  <th className="table-th">Coverage</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {AREA_COMPLETENESS.map((a) => (
                  <tr key={a.area} className="hover:bg-ink-50/60">
                    <td className="table-td font-semibold text-ink-900">{a.area}</td>
                    <td className="table-td text-[12px] font-semibold text-ink-900 tabular-nums">
                      {a.approved}%
                    </td>
                    <td className="table-td text-[12px] text-ink-700 tabular-nums">{a.coverage}%</td>
                    <td className="table-td">
                      <Badge tone={STATUS_TONE[a.status]}>
                        {a.status === "ok" ? "On Track" : a.status === "warn" ? "Review" : "Critical"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Assurance Readiness" hint="method breakdown and confidence" />
          <div className="p-6 pt-4 space-y-4">
            <div>
              <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-500 mb-3">
                Data Capture Method
              </div>
              <div className="space-y-2">
                {METHOD_BREAKDOWN.map((m) => (
                  <div key={m.method} className="flex items-center gap-3">
                    <span className="w-24 text-[12px] text-ink-600 shrink-0">{m.method}</span>
                    <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[12px] font-semibold text-ink-700 tabular-nums">
                      {m.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-ink-100" />
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ink-500">AI / OCR confidence</span>
                <div className="flex items-center gap-1.5">
                  <Badge tone="good">88% high</Badge>
                  <Badge tone="warn">12% flagged</Badge>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Checker approval rate</span>
                <span className="font-semibold text-ink-900">82%</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to="/review-approval" className="btn-secondary text-[12px] inline-flex items-center gap-1">
                <FileCheck2 size={13} /> Review Queue
              </Link>
              <Link to="/data-capture" className="btn-secondary text-[12px] inline-flex items-center gap-1">
                <ShieldCheck size={13} /> Data Capture
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
