import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Cloud,
  Zap,
  Droplet,
  Recycle,
  Users,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ESG_TOTALS, PORTFOLIO_HOTELS, PORTFOLIO_TARGETS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Props = { onNavigate: (tab: string) => void };

type Metric = "carbon" | "energy" | "water" | "waste";

const METRIC_OPTIONS: { key: Metric; label: string; field: keyof typeof PORTFOLIO_HOTELS[0]; unit: string; color: string }[] = [
  { key: "carbon", label: "Carbon (tCO₂e)",  field: "carbon_t",    unit: "tCO₂e", color: "#0F766E" },
  { key: "energy", label: "Energy (MWh)",    field: "energy_mwh",  unit: "MWh",   color: "#CA8A04" },
  { key: "water",  label: "Water (m³)",      field: "water_m3",    unit: "m³",    color: "#0EA5E9" },
  { key: "waste",  label: "Waste (tonnes)",  field: "waste_t",     unit: "t",     color: "#9333EA" },
];

const CERT_ALERTS = [
  { text: "Green Globe renewal — evidence 12% short", href: "/portfolio/reports-certifications", tone: "warn" as const },
  { text: "2 hotels have no active certification",    href: "/portfolio/reports-certifications", tone: "bad"  as const },
  { text: "Travelife audit scheduled in 45 days",     href: "/portfolio/reports-certifications", tone: "neutral" as const },
];

export default function OverviewTab({ onNavigate }: Props) {
  const [metric, setMetric] = useState<Metric>("carbon");
  const active = METRIC_OPTIONS.find((m) => m.key === metric)!;

  const chartData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => (b[active.field] as number) - (a[active.field] as number))
    .map((h) => ({
      name: h.shortName,
      value: h[active.field] as number,
    }));

  const totalValue = PORTFOLIO_HOTELS.reduce((s, h) => s + (h[active.field] as number), 0);

  return (
    <div className="space-y-6">
      {/* 6 ESG Snapshot KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <button
          onClick={() => onNavigate("environment")}
          className="card p-5 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-pillar-carbon/10 grid place-items-center mb-3">
            <Cloud size={18} className="text-pillar-carbon" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-500">Total Emissions</div>
          <div className="text-2xl font-bold text-ink-900 tabular-nums mt-1">{ESG_TOTALS.carbon.displayTotal}</div>
          <div className="text-[11px] text-ink-400">{ESG_TOTALS.carbon.unit}</div>
          <div className="mt-2 text-[11px] font-semibold text-good">{ESG_TOTALS.carbon.delta}% YoY</div>
        </button>

        <button
          onClick={() => onNavigate("environment")}
          className="card p-5 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-pillar-energy/10 grid place-items-center mb-3">
            <Zap size={18} className="text-pillar-energy" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-500">Energy Use</div>
          <div className="text-2xl font-bold text-ink-900 tabular-nums mt-1">{ESG_TOTALS.energy.displayTotal}</div>
          <div className="text-[11px] text-ink-400">{ESG_TOTALS.energy.unit}</div>
          <div className="mt-2 text-[11px] font-semibold text-good">{ESG_TOTALS.energy.delta}% YoY</div>
        </button>

        <button
          onClick={() => onNavigate("environment")}
          className="card p-5 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-pillar-water/10 grid place-items-center mb-3">
            <Droplet size={18} className="text-pillar-water" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-500">Water Use</div>
          <div className="text-2xl font-bold text-ink-900 tabular-nums mt-1">{ESG_TOTALS.water.displayTotal}</div>
          <div className="text-[11px] text-ink-400">{ESG_TOTALS.water.unit}</div>
          <div className="mt-2 text-[11px] font-semibold text-good">{ESG_TOTALS.water.delta}% YoY</div>
        </button>

        <button
          onClick={() => onNavigate("environment")}
          className="card p-5 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-pillar-waste/10 grid place-items-center mb-3">
            <Recycle size={18} className="text-pillar-waste" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-500">Waste Diversion</div>
          <div className="text-2xl font-bold text-ink-900 tabular-nums mt-1">{ESG_TOTALS.waste.diversionPct}%</div>
          <div className="text-[11px] text-ink-400">vs 60% target</div>
          <div className="mt-2 text-[11px] font-semibold text-warn">18% below target</div>
        </button>

        <button
          onClick={() => onNavigate("social")}
          className="card p-5 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-pillar-social/10 grid place-items-center mb-3">
            <Users size={18} className="text-pillar-social" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-500">LTIFR</div>
          <div className="text-2xl font-bold text-ink-900 tabular-nums mt-1">{ESG_TOTALS.social.ltifr}</div>
          <div className="text-[11px] text-ink-400">per 200k hrs worked</div>
          <div className="mt-2 text-[11px] font-semibold text-good">-0.12 YoY</div>
        </button>

        <button
          onClick={() => onNavigate("social")}
          className="card p-5 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-pillar-gov/10 grid place-items-center mb-3">
            <ShieldCheck size={18} className="text-pillar-gov" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-500">Attestations</div>
          <div className="text-2xl font-bold text-ink-900 tabular-nums mt-1">{ESG_TOTALS.governance.attestationsPct}%</div>
          <div className="text-[11px] text-ink-400">complete</div>
          <div className="mt-2 text-[11px] font-semibold text-warn">4 gaps open</div>
        </button>
      </div>

      {/* Portfolio Contribution by Hotel chart */}
      <Card>
        <CardHeader
          title="Portfolio Contribution by Hotel"
          hint="ranked by selected metric — click bars to drill down"
          right={
            <div className="flex gap-1 flex-wrap justify-end">
              {METRIC_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[11px] font-semibold transition-colors",
                    metric === m.key ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="px-6 pb-6 pt-2">
          <div className="mb-3 flex items-center gap-3 text-[12px] text-ink-500">
            <span>Portfolio total: <span className="font-bold text-ink-900">{totalValue.toLocaleString()} {active.unit}</span></span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 60, bottom: 0, left: 120 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={116}
                tick={{ fontSize: 11, fill: "#334155" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(val: number) => [`${val.toLocaleString()} ${active.unit}`, active.label]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {chartData.map((entry, i) => {
                  const pct = entry.value / totalValue;
                  const opacity = 1 - i * 0.07;
                  return <Cell key={entry.name} fill={active.color} fillOpacity={Math.max(opacity, 0.3)} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Target Status Summary + Cert Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Target Status"
              hint="2025–2030 reduction targets"
              right={
                <button
                  onClick={() => onNavigate("targets")}
                  className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
                >
                  View all <ArrowRight size={12} />
                </button>
              }
            />
            <div className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PORTFOLIO_TARGETS.map((t) => {
                const pct = Math.min(100, (t.currentVal / t.targetVal) * 100);
                return (
                  <button
                    key={t.key}
                    onClick={() => onNavigate("targets")}
                    className="card-level-3 p-3 text-left hover:bg-ink-100 transition-colors rounded-lg"
                  >
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[11px] font-semibold text-ink-700 truncate">{t.label}</span>
                      <Badge tone={t.status}>{t.status === "bad" ? "Off Track" : "At Risk"}</Badge>
                    </div>
                    <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={cn("h-full rounded-full", t.status === "bad" ? "bg-bad" : "bg-warn")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-ink-500 truncate">{t.gap}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Certification & Reporting Alerts"
            hint="items needing attention"
          />
          <ul className="px-3 pb-4 mt-2 space-y-1.5">
            {CERT_ALERTS.map((a) => (
              <li key={a.text}>
                <Link
                  to={a.href}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors group"
                >
                  <AlertTriangle
                    size={13}
                    className={cn(
                      "shrink-0 mt-0.5",
                      a.tone === "bad" ? "text-bad" : a.tone === "warn" ? "text-warn" : "text-ink-400"
                    )}
                  />
                  <span className="text-[12px] text-ink-700 group-hover:text-ink-900 leading-snug">{a.text}</span>
                  <ChevronRight size={12} className="shrink-0 mt-0.5 text-ink-300 group-hover:text-brand-700 ml-auto" />
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/portfolio/reports-certifications"
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
              >
                View all certifications <ArrowRight size={12} />
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
