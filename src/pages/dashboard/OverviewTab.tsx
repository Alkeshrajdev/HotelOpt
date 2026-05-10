import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Droplet,
  FileText,
  Recycle,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ACTION_CENTRE, NEEDS_ATTENTION, ESG_TOTALS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Props = { onNavigate: (tab: string) => void };

const SEVERITY_COLOR: Record<string, string> = { bad: "#DC2626", warn: "#F59E0B", info: "#0EA5E9" };
const SEVERITY_ORDER: Record<string, number> = { bad: 0, warn: 1, info: 2 };

const REPORTS_BLOCKED = [
  {
    name: "SBTi Net-Zero",
    issue: "Scope 3 travel data incomplete",
    coverage: 71,
  },
  {
    name: "CSRD / ESRS Draft",
    issue: "Social indicators gap — 3 KPIs missing",
    coverage: 61,
  },
  {
    name: "Certification Evidence Pack",
    issue: "Green Globe evidence 12% short",
    coverage: 74,
  },
];

const sortedActions = [...ACTION_CENTRE].sort(
  (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
);

export default function OverviewTab({ onNavigate }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiTile
          prominent
          icon={<TrendingUp size={18} />}
          iconBg="bg-good/10 text-good"
          label="Hotels On Track"
          value="58 / 72"
          caption="14 to review · 9 critical"
        />
        <KpiTile
          prominent
          icon={<AlertTriangle size={18} />}
          iconBg="bg-warn/10 text-warn"
          label="Hotels to Review"
          value="14"
          caption="click to open hotel matrix"
          onClick={() => onNavigate("hotels")}
        />
        <KpiTile
          prominent
          icon={<AlertTriangle size={18} />}
          iconBg="bg-bad/10 text-bad"
          label="Critical Issues"
          value="9"
          caption="3 cert · 4 data · 2 carbon"
          onClick={() => onNavigate("assurance")}
        />
        <KpiTile
          prominent
          icon={<FileText size={18} />}
          iconBg="bg-bad/10 text-bad"
          label="Reports Blocked"
          value="3"
          caption="evidence pack, SBTi, CSRD"
          onClick={() => onNavigate("reporting")}
        />
        <KpiTile
          prominent
          icon={<AlertTriangle size={18} />}
          iconBg="bg-warn/10 text-warn"
          label="Overdue Actions"
          value="12"
          caption="4 critical · 8 moderate"
          onClick={() => onNavigate("actions")}
        />
        <KpiTile
          prominent
          icon={<Award size={18} />}
          iconBg="bg-warn/10 text-warn"
          label="Next Audit"
          value="45 days"
          caption="Green Globe · evidence 12% short"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader
            title="Urgent Issues"
            hint="sorted by severity — click to resolve"
            right={
              <Badge tone="bad">
                {ACTION_CENTRE.filter((a) => a.severity === "bad").length} critical
              </Badge>
            }
          />
          <ul className="px-3 pb-4 mt-3 space-y-0.5">
            {sortedActions.map((a) => (
              <li key={a.label}>
                <Link
                  to={a.href}
                  className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-ink-50 group border-l-2 transition-all"
                  style={{ borderLeftColor: SEVERITY_COLOR[a.severity] ?? "#0EA5E9" }}
                >
                  <div className="flex items-center gap-2.5 text-[13px] font-medium text-ink-700 group-hover:text-ink-900 transition-colors">
                    <AlertTriangle
                      size={14}
                      className="shrink-0"
                      style={{ color: SEVERITY_COLOR[a.severity] ?? "#0EA5E9" }}
                    />
                    {a.label}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-[15px] text-ink-900 tabular-nums">{a.count}</span>
                    <ChevronRight size={14} className="text-ink-400 group-hover:text-brand-700 transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/actions"
                className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
              >
                View all actions <ArrowRight size={12} />
              </Link>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Hotels to Review"
            hint="performance below threshold or data incomplete"
            right={
              <button
                onClick={() => onNavigate("hotels")}
                className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
              >
                View matrix <ArrowRight size={12} />
              </button>
            }
          />
          <ul className="px-2 pb-4 mt-2">
            {NEEDS_ATTENTION.map((p) => (
              <li
                key={p.property}
                className="flex items-start gap-3 px-3 py-3 hover:bg-ink-50 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-warn/10 grid place-items-center shrink-0 mt-0.5">
                  <AlertTriangle size={13} className="text-warn" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink-900 truncate">{p.property}</div>
                  <div className="text-[11px] text-ink-500 truncate">{p.location}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5 line-clamp-1 leading-relaxed">
                    {p.reason}
                  </div>
                </div>
                <span
                  className={cn(
                    "chip text-[10px] shrink-0 mt-0.5",
                    p.score < 45 ? "bg-bad/10 text-bad" : "bg-warn/10 text-warn"
                  )}
                >
                  {p.score < 45 ? "Critical" : "Moderate"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Reports Blocked"
            hint="issues that will delay framework submissions"
            right={
              <button
                onClick={() => onNavigate("reporting")}
                className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
              >
                Open Reports <ArrowRight size={12} />
              </button>
            }
          />
          <ul className="px-3 pb-4 mt-3 space-y-2">
            {REPORTS_BLOCKED.map((r) => (
              <li key={r.name} className="rounded-lg border border-warn/25 bg-warn/10 p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[12px] font-bold text-ink-900">{r.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-14 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-warn" style={{ width: `${r.coverage}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-warn tabular-nums">{r.coverage}%</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-warn">
                  <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{r.issue}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-ink-100">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-500">
            ESG Snapshot
          </span>
          <Badge tone="neutral">Click any metric to drill down</Badge>
        </div>
        <div className="flex divide-x divide-ink-100 min-w-max">
          <button
            onClick={() => onNavigate("esg")}
            className="px-5 py-4 flex flex-col cursor-pointer hover:bg-ink-50 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Cloud size={12} className="text-pillar-carbon" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">Carbon</span>
            </div>
            <span className="text-xl font-bold text-ink-900 tabular-nums mt-0.5">
              {ESG_TOTALS.carbon.displayTotal}
            </span>
            <span className="text-[10px] text-ink-400">{ESG_TOTALS.carbon.unit}</span>
            <span className="text-[10px] font-semibold text-good mt-0.5">
              {ESG_TOTALS.carbon.delta}% YoY
            </span>
          </button>

          <button
            onClick={() => onNavigate("esg")}
            className="px-5 py-4 flex flex-col cursor-pointer hover:bg-ink-50 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={12} className="text-pillar-energy" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">Energy</span>
            </div>
            <span className="text-xl font-bold text-ink-900 tabular-nums mt-0.5">
              {ESG_TOTALS.energy.displayTotal}
            </span>
            <span className="text-[10px] text-ink-400">{ESG_TOTALS.energy.unit}</span>
            <span className="text-[10px] font-semibold text-good mt-0.5">
              {ESG_TOTALS.energy.delta}% YoY
            </span>
          </button>

          <button
            onClick={() => onNavigate("esg")}
            className="px-5 py-4 flex flex-col cursor-pointer hover:bg-ink-50 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Droplet size={12} className="text-pillar-water" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">Water</span>
            </div>
            <span className="text-xl font-bold text-ink-900 tabular-nums mt-0.5">
              {ESG_TOTALS.water.displayTotal}
            </span>
            <span className="text-[10px] text-ink-400">{ESG_TOTALS.water.unit}</span>
            <span className="text-[10px] font-semibold text-good mt-0.5">
              {ESG_TOTALS.water.delta}% YoY
            </span>
          </button>

          <button
            onClick={() => onNavigate("esg")}
            className="px-5 py-4 flex flex-col cursor-pointer hover:bg-ink-50 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Recycle size={12} className="text-pillar-waste" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">Waste</span>
            </div>
            <span className="text-xl font-bold text-ink-900 tabular-nums mt-0.5">
              {ESG_TOTALS.waste.displayTotal}
            </span>
            <span className="text-[10px] text-ink-400">{ESG_TOTALS.waste.unit}</span>
            <span className="text-[10px] font-semibold text-bad mt-0.5">
              +{ESG_TOTALS.waste.delta}% YoY
            </span>
          </button>

          <button
            onClick={() => onNavigate("targets")}
            className="px-5 py-4 flex flex-col cursor-pointer hover:bg-ink-50 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Recycle size={12} className="text-pillar-waste" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
                Waste Diversion
              </span>
            </div>
            <span className="text-xl font-bold text-ink-900 tabular-nums mt-0.5">
              {ESG_TOTALS.waste.diversionPct}%
            </span>
            <span className="text-[10px] text-ink-400">vs 60% target</span>
            <span className="text-[10px] font-semibold text-warn mt-0.5">18% below target</span>
          </button>

          <button
            onClick={() => onNavigate("assurance")}
            className="px-5 py-4 flex flex-col cursor-pointer hover:bg-ink-50 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={12} className="text-good" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
                Approved Data
              </span>
            </div>
            <span className="text-xl font-bold text-ink-900 tabular-nums mt-0.5">86%</span>
            <span className="text-[10px] text-ink-400">portfolio-wide</span>
            <span className="text-[10px] font-semibold text-warn mt-0.5">4 hotels below 80%</span>
          </button>
        </div>
      </div>
    </div>
  );
}
