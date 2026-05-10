import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PORTFOLIO_ACTIONS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type AreaFilter = "All" | "Energy" | "Water" | "Waste" | "Carbon" | "Social" | "Governance";
type StatusFilter = "All" | "Overdue" | "In Progress" | "Proposed" | "Approved";

const AREA_FILTERS: AreaFilter[] = ["All", "Energy", "Water", "Waste", "Carbon", "Social", "Governance"];
const STATUS_FILTERS: StatusFilter[] = ["All", "Overdue", "In Progress", "Proposed", "Approved"];

const STATUS_TONE: Record<string, "bad" | "brand" | "neutral" | "good"> = {
  overdue:     "bad",
  "in-progress": "brand",
  proposed:    "neutral",
  approved:    "good",
};

const STATUS_LABEL: Record<string, string> = {
  overdue:     "Overdue",
  "in-progress": "In Progress",
  proposed:    "Proposed",
  approved:    "Approved",
};

const AREA_CLASS: Record<string, string> = {
  Energy:     "bg-pillar-energy/10 text-pillar-energy",
  Water:      "bg-pillar-water/10 text-pillar-water",
  Waste:      "bg-pillar-waste/10 text-pillar-waste",
  Carbon:     "bg-pillar-carbon/10 text-pillar-carbon",
  Social:     "bg-pillar-social/10 text-pillar-social",
  Governance: "bg-pillar-gov/10 text-pillar-gov",
};

export default function ActionsTab() {
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const filtered = PORTFOLIO_ACTIONS.filter((a) => {
    const areaOk = areaFilter === "All" || a.area === areaFilter;
    const statusOk =
      statusFilter === "All" ||
      (statusFilter === "Overdue" && a.status === "overdue") ||
      (statusFilter === "In Progress" && a.status === "in-progress") ||
      (statusFilter === "Proposed" && a.status === "proposed") ||
      (statusFilter === "Approved" && a.status === "approved");
    return areaOk && statusOk;
  });

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <div className="flex divide-x divide-ink-100 min-w-max">
          {[
            { label: "Open Actions",     value: "46" },
            { label: "Overdue",          value: "12" },
            { label: "Awaiting Approval",value: "8" },
            { label: "Planned CAPEX",    value: "AED 4.2M" },
            { label: "Expected Savings", value: "AED 1.1M/yr" },
            { label: "Verified Savings", value: "AED 420k/yr" },
            { label: "Carbon Reduction", value: "3,250 tCO₂e/yr" },
          ].map((kpi) => (
            <div key={kpi.label} className="px-5 py-4 min-w-[140px]">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400 truncate">
                {kpi.label}
              </div>
              <div className="text-xl font-bold text-ink-900 tabular-nums mt-1">{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-1">
          {AREA_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setAreaFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                areaFilter === f
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-ink-200 mx-1" />
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                statusFilter === f
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="min-w-full">
          <thead>
            <tr className="bg-ink-50">
              <th className="table-th">ID</th>
              <th className="table-th">Action</th>
              <th className="table-th">Hotel</th>
              <th className="table-th">Area</th>
              <th className="table-th">Status</th>
              <th className="table-th">Owner</th>
              <th className="table-th">Due</th>
              <th className="table-th">CAPEX</th>
              <th className="table-th">Expected</th>
              <th className="table-th">Verified</th>
              <th className="table-th text-right pr-6">Open</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-ink-50/60">
                <td className="table-td font-mono text-[11px] text-ink-500 whitespace-nowrap">{a.id}</td>
                <td className="table-td text-[13px] font-medium text-ink-900 max-w-[220px]">
                  <span className="line-clamp-1">{a.action}</span>
                </td>
                <td className="table-td whitespace-nowrap">
                  <Link
                    to="/properties"
                    className="text-[12px] text-brand-700 hover:text-brand-800 font-medium"
                  >
                    {a.hotel}
                  </Link>
                </td>
                <td className="table-td">
                  <span className={cn("chip text-[11px]", AREA_CLASS[a.area] ?? "bg-ink-100 text-ink-700")}>
                    {a.area}
                  </span>
                </td>
                <td className="table-td">
                  <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                </td>
                <td className="table-td text-[12px] text-ink-700 whitespace-nowrap">{a.owner}</td>
                <td className="table-td text-[12px] text-ink-700 whitespace-nowrap">
                  <span
                    className={cn(
                      a.status === "overdue" ? "text-bad font-semibold" : "text-ink-700"
                    )}
                  >
                    {a.due}
                  </span>
                </td>
                <td className="table-td text-[12px] text-ink-700 whitespace-nowrap">{a.capex}</td>
                <td className="table-td text-[12px] text-ink-700 whitespace-nowrap">{a.expected}</td>
                <td className="table-td text-[12px] text-ink-700 whitespace-nowrap">
                  {a.verified !== "—" ? (
                    <span className="text-good font-semibold">{a.verified}</span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="table-td text-right pr-6">
                  <Link
                    to="/actions"
                    className="btn-secondary h-7 px-3 text-[12px] text-brand-700 border-brand-200 hover:bg-brand-50 inline-flex items-center gap-1"
                  >
                    Open <ArrowRight size={11} />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="table-td text-center text-ink-400 py-8">
                  No actions match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="CAPEX Summary" hint="planned investment across portfolio" />
          <div className="p-6 pt-4 space-y-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-500">Total planned CAPEX</span>
              <span className="font-bold text-ink-900">AED 4.2M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Expected annual savings</span>
              <span className="font-bold text-good">AED 1.1M/yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Average payback period</span>
              <span className="font-bold text-ink-900">3.8 years</span>
            </div>
            <div className="h-px bg-ink-100 my-1" />
            <div className="flex justify-between">
              <span className="text-ink-500">Expected carbon reduction</span>
              <span className="font-bold text-pillar-carbon">3,250 tCO₂e/yr</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Action Status Summary" />
          <div className="p-6 pt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Overdue",      count: 12, icon: <AlertTriangle size={14} />, cls: "text-bad"  },
              { label: "In Progress",  count: 18, icon: <Clock size={14} />,         cls: "text-brand-700" },
              { label: "Proposed",     count: 11, icon: <ArrowRight size={14} />,    cls: "text-ink-500" },
              { label: "Approved",     count: 5,  icon: <CheckCircle2 size={14} />,  cls: "text-good" },
            ].map((s) => (
              <div key={s.label} className="card-level-3 p-3 flex items-center gap-2">
                <span className={s.cls}>{s.icon}</span>
                <div>
                  <div className="text-lg font-bold text-ink-900 tabular-nums">{s.count}</div>
                  <div className="text-[11px] text-ink-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
