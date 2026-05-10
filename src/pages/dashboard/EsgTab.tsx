import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Cloud,
  Zap,
  Droplet,
  Recycle,
  Users,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ESG_TOTALS, PORTFOLIO_TRENDS } from "@/lib/mock";
import { cn } from "@/lib/utils";

const TREND_METRICS = [
  { key: "energyIntensity" as const, label: "Energy / Room Night",  unit: " kWh / room night",   color: "#16A34A", domain: [18, 28]   as [number, number] },
  { key: "carbonIntensity" as const, label: "Carbon / Room Night",  unit: " kgCO₂ / room night", color: "#0F766E", domain: [10, 16]   as [number, number] },
  { key: "waterIntensity"  as const, label: "Water / Guest Night",  unit: " L / guest night",    color: "#0EA5E9", domain: [360, 440] as [number, number] },
] as const;

type TrendKey = (typeof TREND_METRICS)[number]["key"];

export default function EsgTab() {
  const [trendMetric, setTrendMetric] = useState<TrendKey>("energyIntensity");
  const activeTrend = TREND_METRICS.find((m) => m.key === trendMetric)!;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <Card>
          <CardHeader
            title="Carbon"
            right={<span className="chip bg-good/10 text-good">-4.2% YoY</span>}
          />
          <div className="p-6 pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pillar-carbon/10 grid place-items-center shrink-0">
                <Cloud size={18} className="text-pillar-carbon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-ink-900 tabular-nums">
                  {ESG_TOTALS.carbon.displayTotal}
                </div>
                <div className="text-[11px] text-ink-500">{ESG_TOTALS.carbon.unit} total</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="card-level-3 text-center py-2 px-1">
                <div className="text-[13px] font-bold text-ink-900 tabular-nums">
                  {(ESG_TOTALS.carbon.scope1 / 1000).toFixed(1)}k
                </div>
                <div className="text-[10px] text-ink-400 mt-0.5">Scope 1</div>
              </div>
              <div className="card-level-3 text-center py-2 px-1">
                <div className="text-[13px] font-bold text-ink-900 tabular-nums">
                  {(ESG_TOTALS.carbon.scope2 / 1000).toFixed(1)}k
                </div>
                <div className="text-[10px] text-ink-400 mt-0.5">Scope 2</div>
              </div>
              <div className="card-level-3 text-center py-2 px-1">
                <div className="text-[13px] font-bold text-ink-900 tabular-nums">
                  {(ESG_TOTALS.carbon.scope3 / 1000).toFixed(1)}k
                </div>
                <div className="text-[10px] text-ink-400 mt-0.5">Scope 3</div>
              </div>
            </div>
            <div className="text-[12px] text-ink-600">
              Intensity:{" "}
              <span className="font-semibold text-ink-900">
                {ESG_TOTALS.carbon.intensity} {ESG_TOTALS.carbon.intensityUnit}
              </span>
            </div>
            <Link
              to="/performance/carbon/overview"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open Carbon Hub <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Energy"
            right={<span className="chip bg-good/10 text-good">-6.1% YoY</span>}
          />
          <div className="p-6 pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pillar-energy/10 grid place-items-center shrink-0">
                <Zap size={18} className="text-pillar-energy" />
              </div>
              <div>
                <div className="text-2xl font-bold text-ink-900 tabular-nums">
                  {ESG_TOTALS.energy.displayTotal}
                </div>
                <div className="text-[11px] text-ink-500">{ESG_TOTALS.energy.unit} total</div>
              </div>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ink-500">Intensity</span>
                <span className="font-semibold text-ink-900">
                  {ESG_TOTALS.energy.intensity} {ESG_TOTALS.energy.intensityUnit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Renewable share</span>
                <Badge tone="good">{ESG_TOTALS.energy.renewablePct}%</Badge>
              </div>
            </div>
            <Link
              to="/performance/energy/overview"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open Energy Hub <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Water"
            right={<span className="chip bg-good/10 text-good">-3.8% YoY</span>}
          />
          <div className="p-6 pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pillar-water/10 grid place-items-center shrink-0">
                <Droplet size={18} className="text-pillar-water" />
              </div>
              <div>
                <div className="text-2xl font-bold text-ink-900 tabular-nums">
                  {ESG_TOTALS.water.displayTotal}
                </div>
                <div className="text-[11px] text-ink-500">{ESG_TOTALS.water.unit} total</div>
              </div>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ink-500">Intensity</span>
                <span className="font-semibold text-ink-900">
                  {ESG_TOTALS.water.intensity} {ESG_TOTALS.water.intensityUnit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Recycled share</span>
                <Badge tone="warn">{ESG_TOTALS.water.recycledPct}%</Badge>
              </div>
            </div>
            <Link
              to="/performance/water/overview"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open Water Hub <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Waste"
            right={<span className="chip bg-bad/10 text-bad">+1.4% YoY</span>}
          />
          <div className="p-6 pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pillar-waste/10 grid place-items-center shrink-0">
                <Recycle size={18} className="text-pillar-waste" />
              </div>
              <div>
                <div className="text-2xl font-bold text-ink-900 tabular-nums">
                  {ESG_TOTALS.waste.displayTotal}
                </div>
                <div className="text-[11px] text-ink-500">{ESG_TOTALS.waste.unit} total</div>
              </div>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ink-500">Diversion rate</span>
                <div className="flex items-center gap-1.5">
                  <Badge tone="bad">{ESG_TOTALS.waste.diversionPct}%</Badge>
                  <span className="text-ink-400 text-[10px]">vs 60% target</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Food waste</span>
                <span className="font-semibold text-ink-900">
                  {ESG_TOTALS.waste.foodWastePerCover} g/cover
                </span>
              </div>
            </div>
            <Link
              to="/performance/waste/overview"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open Waste Hub <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Social" />
          <div className="p-6 pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pillar-social/10 grid place-items-center shrink-0">
                <Users size={18} className="text-pillar-social" />
              </div>
              <div className="text-[12px] text-ink-500">People & community metrics</div>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ink-500">Training</span>
                <span className="font-semibold text-ink-900">
                  {ESG_TOTALS.social.trainingHoursPerFTE} hrs / FTE
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">LTIFR</span>
                <span className="font-semibold text-ink-900">{ESG_TOTALS.social.ltifr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Staff turnover</span>
                <Badge tone="warn">{ESG_TOTALS.social.turnoverPct}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Local sourcing</span>
                <Badge tone="good">{ESG_TOTALS.social.localSourcingPct}%</Badge>
              </div>
            </div>
            <Link
              to="/performance/social/overview"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open Social Hub <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Governance" />
          <div className="p-6 pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pillar-gov/10 grid place-items-center shrink-0">
                <ShieldCheck size={18} className="text-pillar-gov" />
              </div>
              <div className="text-[12px] text-ink-500">Compliance & accountability</div>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ink-500">Attestations complete</span>
                <Badge tone="warn">{ESG_TOTALS.governance.attestationsPct}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Supplier code adoption</span>
                <Badge tone="warn">{ESG_TOTALS.governance.supplierCodeAdoption}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Open governance gaps</span>
                <Badge tone="bad">{ESG_TOTALS.governance.openGaps}</Badge>
              </div>
            </div>
            <Link
              to="/performance/governance/overview"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open Governance Hub <ArrowRight size={12} />
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Portfolio Trend (12 months)"
          hint="approved data only · operational intensity metrics"
          right={
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {TREND_METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setTrendMetric(m.key)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[11px] font-semibold transition-colors",
                    trendMetric === m.key
                      ? "bg-brand-700 text-white"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="px-6 pb-6 pt-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={PORTFOLIO_TRENDS} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis
                domain={activeTrend.domain}
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(15,23,42,0.08)" }}
                formatter={(val: number) => [`${val}${activeTrend.unit}`, activeTrend.label]}
              />
              <Line
                type="monotone"
                dataKey={activeTrend.key}
                stroke={activeTrend.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
