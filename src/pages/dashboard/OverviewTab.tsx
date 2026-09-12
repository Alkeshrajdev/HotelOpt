import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, Cloud, DollarSign, Droplet, Recycle, TrendingDown, Zap } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import { ACTION_CENTRE, PORTFOLIO_HOTELS } from "@/lib/mock";
import { portfolioCostPerOrn, portfolioWaterPerGn, portfolioEnergyPerOrnTotal, carbonS12PerOrn, PORTFOLIO, CARBON, wasteDiversionDual } from "@/lib/normalise";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import StackedArea from "@/components/charts/StackedArea";
import Waterfall from "@/components/charts/Waterfall";
import Donut from "@/components/charts/Donut";
import Bubble, { type BubblePoint } from "@/components/charts/Bubble";
import RadialGauge from "@/components/charts/RadialGauge";
import { AXIS_TICK, ChartTip, LegendRow, fmtN } from "@/components/charts/ChartBits";

// Carbon Scope 1+2 / ORN 2030 target (SBTi −50% pathway, base ≈ 34 kgCO₂e/ORN).
const CARBON_ORN_TARGET_2030 = 17.0;

type Props = { onNavigate: (tab: string) => void };

/* ─── Trend data (seasonal shape, rescaled to the canonical portfolio spine) ── */
const RAW_MONTHLY = [
  { month: "May", energyTY: 226, waterTY: 70, wasteTY: 52, energyPY: 241, waterPY: 74, wastePY: 56, costPY: 371, intensity: 11.6 },
  { month: "Jun", energyTY: 263, waterTY: 81, wasteTY: 61, energyPY: 280, waterPY: 86, wastePY: 65, costPY: 431, intensity: 13.1 },
  { month: "Jul", energyTY: 298, waterTY: 92, wasteTY: 68, energyPY: 317, waterPY: 98, wastePY: 73, costPY: 488, intensity: 14.8 },
  { month: "Aug", energyTY: 303, waterTY: 93, wasteTY: 70, energyPY: 322, waterPY: 99, wastePY: 75, costPY: 496, intensity: 15.1 },
  { month: "Sep", energyTY: 274, waterTY: 84, wasteTY: 63, energyPY: 291, waterPY: 90, wastePY: 67, costPY: 448, intensity: 13.7 },
  { month: "Oct", energyTY: 261, waterTY: 80, wasteTY: 60, energyPY: 278, waterPY: 85, wastePY: 64, costPY: 427, intensity: 14.8 },
  { month: "Nov", energyTY: 245, waterTY: 75, wasteTY: 57, energyPY: 261, waterPY: 80, wastePY: 60, costPY: 401, intensity: 15.9 },
  { month: "Dec", energyTY: 254, waterTY: 78, wasteTY: 58, energyPY: 270, waterPY: 83, wastePY: 62, costPY: 415, intensity: 15.6 },
  { month: "Jan", energyTY: 239, waterTY: 73, wasteTY: 55, energyPY: 254, waterPY: 78, wastePY: 59, costPY: 391, intensity: 15.3 },
  { month: "Feb", energyTY: 224, waterTY: 68, wasteTY: 52, energyPY: 238, waterPY: 73, wastePY: 55, costPY: 366, intensity: 14.8 },
  { month: "Mar", energyTY: 250, waterTY: 77, wasteTY: 57, energyPY: 266, waterPY: 82, wastePY: 61, costPY: 409, intensity: 14.5 },
  { month: "Apr", energyTY: 274, waterTY: 84, wasteTY: 63, energyPY: 291, waterPY: 90, wastePY: 67, costPY: 448, intensity: 17.7 },
];
const RAW_QUARTERLY = [
  { quarter: "Q1 '24", energyTY: 758, waterTY: 232, wasteTY: 174, energyPY: 807, waterPY: 247, wastePY: 185, costPY: 1239, intensity: 16.2 },
  { quarter: "Q2 '24", energyTY: 812, waterTY: 250, wasteTY: 187, energyPY: 865, waterPY: 266, wastePY: 199, costPY: 1330, intensity: 15.4 },
  { quarter: "Q3 '24", energyTY: 931, waterTY: 286, wasteTY: 214, energyPY: 991, waterPY: 305, wastePY: 228, costPY: 1524, intensity: 16.5 },
  { quarter: "Q4 '24", energyTY: 808, waterTY: 248, wasteTY: 186, energyPY: 860, waterPY: 264, wastePY: 198, costPY: 1322, intensity: 15.8 },
  { quarter: "Q1 '25", energyTY: 713, waterTY: 218, wasteTY: 164, energyPY: 758, waterPY: 232, wastePY: 174, costPY: 1164, intensity: 15.1 },
  { quarter: "Q2 '25", energyTY: 763, waterTY: 235, wasteTY: 176, energyPY: 812, waterPY: 250, wastePY: 187, costPY: 1249, intensity: 12.8 },
  { quarter: "Q3 '25", energyTY: 875, waterTY: 269, wasteTY: 201, energyPY: 931, waterPY: 286, wastePY: 214, costPY: 1431, intensity: 14.5 },
  { quarter: "Q4 '25", energyTY: 760, waterTY: 233, wasteTY: 175, energyPY: 808, waterPY: 248, wastePY: 186, costPY: 1242, intensity: 15.4 },
];
const RAW_ANNUAL = [
  { year: "2022", energyTY: 3680, waterTY: 1132, wasteTY: 849, costPY: 0, intensity: 18.4 },
  { year: "2023", energyTY: 3450, waterTY: 1062, wasteTY: 797, costPY: 5661, intensity: 17.1 },
  { year: "2024", energyTY: 3309, waterTY: 1016, wasteTY: 761, costPY: 5309, intensity: 15.9 },
  { year: "2025", energyTY: 3111, waterTY: 955, wasteTY: 716, costPY: 5086, intensity: 14.8 },
];
const RAW_TOTAL_TY = RAW_MONTHLY.reduce((s, m) => s + m.energyTY + m.waterTY + m.wasteTY, 0);
const RAW_AVG_INT = RAW_MONTHLY.reduce((s, m) => s + m.intensity, 0) / RAW_MONTHLY.length;
const COST_SCALE = (PORTFOLIO.utilityCostUsd / 1000) / RAW_TOTAL_TY;
const INT_SCALE = carbonS12PerOrn() / RAW_AVG_INT;
const COST_KEYS = ["energyTY", "waterTY", "wasteTY", "energyPY", "waterPY", "wastePY", "costPY"];
type Row = Record<string, number | string>;
const scaleRow = (m: Row): Row => {
  const out: Row = { ...m };
  for (const k of COST_KEYS) if (typeof out[k] === "number") out[k] = Math.round((out[k] as number) * COST_SCALE);
  if (typeof out.intensity === "number") out.intensity = +((out.intensity as number) * INT_SCALE).toFixed(1);
  return out;
};
const MONTHLY = RAW_MONTHLY.map(scaleRow);
const QUARTERLY = RAW_QUARTERLY.map(scaleRow);
const ANNUAL = RAW_ANNUAL.map(scaleRow);
const sum = (rows: Row[], k: string) => rows.reduce((s, m) => s + ((m[k] as number) || 0), 0);
const TY = { energy: sum(MONTHLY, "energyTY"), water: sum(MONTHLY, "waterTY"), waste: sum(MONTHLY, "wasteTY") };
const PY = { energy: sum(MONTHLY, "energyPY"), water: sum(MONTHLY, "waterPY"), waste: sum(MONTHLY, "wastePY") };
const TOTAL_TY = TY.energy + TY.water + TY.waste;
const TOTAL_PY = sum(MONTHLY, "costPY");
const SAVINGS = TOTAL_PY - TOTAL_TY;

type Aggregation = "monthly" | "quarterly" | "annually";
type Metric = "energy" | "water" | "waste" | "combined" | "carbon";
const METRICS: { key: Metric; label: string; color: string; pyKey: string }[] = [
  { key: "combined", label: "Combined", color: CHART.olive, pyKey: "costPY" },
  { key: "energy", label: "Energy", color: CHART.olive, pyKey: "energyPY" },
  { key: "water", label: "Water", color: CHART.mauve, pyKey: "waterPY" },
  { key: "waste", label: "Waste", color: CHART.blush, pyKey: "wastePY" },
  { key: "carbon", label: "Carbon", color: CHART.cocoa, pyKey: "" },
];
const usd = (k: number) => (k >= 1000 ? `$${(k / 1000).toFixed(1)}M` : `$${fmtN(k)}k`);

/* ─── Executive snapshot tiles ────────────────────────────────────────────── */
type SnapTile = { icon: React.ElementType; iconBg: string; label: string; value: string; unit: string; delta: string; deltaGood: boolean; highlight?: boolean };
const SNAP_TILES: SnapTile[] = [
  { icon: DollarSign, iconBg: "bg-ink-100 text-ink-600", label: "Total spend", value: usd(TOTAL_TY), unit: "energy · water · waste", delta: `−${((1 - TOTAL_TY / TOTAL_PY) * 100).toFixed(1)}% vs last year`, deltaGood: true },
  { icon: TrendingDown, iconBg: "bg-good/10 text-good", label: "Savings", value: `$${SAVINGS}k`, unit: "avoided vs last year", delta: "from reduced consumption", deltaGood: true, highlight: true },
  { icon: DollarSign, iconBg: "bg-ink-100 text-ink-600", label: "Cost per ORN", value: `$${portfolioCostPerOrn().toFixed(1)}`, unit: "utility cost / occupied room night", delta: `−${((1 - TOTAL_TY / TOTAL_PY) * 100).toFixed(1)}% vs last year`, deltaGood: true },
  { icon: Zap, iconBg: "bg-pillar-energy/10 text-pillar-energy", label: "Energy", value: PORTFOLIO.energyMwh.toLocaleString("en-US"), unit: "MWh total", delta: "−7.3% vs last year", deltaGood: true },
  { icon: Droplet, iconBg: "bg-pillar-water/10 text-pillar-water", label: "Water", value: PORTFOLIO.waterM3.toLocaleString("en-US"), unit: "m³ total", delta: "−7.8% vs last year", deltaGood: true },
  { icon: Cloud, iconBg: "bg-pillar-carbon/10 text-pillar-carbon", label: "Carbon", value: CARBON.s1s2.toLocaleString("en-US"), unit: `tCO₂e S1+2 · S3 ${CARBON.scope3.toLocaleString("en-US")} sep.`, delta: "−9.4% vs last year", deltaGood: true },
  { icon: Recycle, iconBg: "bg-pillar-waste/10 text-pillar-waste", label: "Waste diversion", value: `${wasteDiversionDual()}%`, unit: "diversion · excl / incl WtE", delta: "+6 pp vs last year", deltaGood: true },
];
const isPctDelta = (d: string) => d.includes("%") || d.includes("pp");
const isNegDelta = (d: string) => d.trimStart().startsWith("−") || d.trimStart().startsWith("-");

/* ─── Progress to 2030 (normalised intensity) ─────────────────────────────── */
const GAUGES = [
  { key: "energy", label: "Energy intensity", value: `${portfolioEnergyPerOrnTotal().toFixed(0)} kWh/ORN`, delta: "−6.0%", progress: 42, target: "91 by 2030", color: CHART.olive },
  { key: "water", label: "Water intensity", value: `${portfolioWaterPerGn().toFixed(0)} L/GN`, delta: "−8.0%", progress: 50, target: "500 by 2030", color: CHART.mauve },
  { key: "carbon", label: "Carbon intensity", value: `${carbonS12PerOrn().toFixed(1)} kgCO₂e/ORN`, delta: "−10.0%", progress: 52, target: "17.0 by 2030 · SBTi −50%", color: CHART.cocoa },
  { key: "waste", label: "Waste diversion", value: `${wasteDiversionDual()}%`, delta: "+6 pp", progress: 50, target: "60% by 2030 · excl. WtE", color: CHART.moss },
];

/* ─── Hotels at a glance: energy × carbon, sized by rooms ─────────────────── */
const REGION_COLOR: Record<string, string> = { EMEA: CHART.olive, APAC: CHART.mauve, Africa: CHART.moss };
const HOTEL_POINTS: BubblePoint[] = PORTFOLIO_HOTELS.map((h) => ({
  id: h.id, label: h.shortName, x: h.energyIntensity, y: h.carbonIntensity, z: h.rooms, color: REGION_COLOR[h.region] ?? CHART.sand, note: `${h.region} · ${h.type}`,
}));
const wAvg = (pick: (h: (typeof PORTFOLIO_HOTELS)[number]) => number) => PORTFOLIO_HOTELS.reduce((s, h) => s + pick(h) * h.orn, 0) / PORTFOLIO_HOTELS.reduce((s, h) => s + h.orn, 0);
const AVG_ENERGY = wAvg((h) => h.energyIntensity);
const AVG_CARBON = wAvg((h) => h.carbonIntensity);

function SectionLabel({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">{title}</h2>
      {action && onClick && (
        <button onClick={onClick} className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">{action} <ArrowRight size={12} /></button>
      )}
    </div>
  );
}

function NeedsAttention() {
  if (!ACTION_CENTRE.length) return null;
  const toneText = (s: string) => (s === "bad" ? "text-bad" : s === "warn" ? "text-warn-700" : "text-info");
  const toneChip = (s: string) => (s === "bad" ? "bg-bad/10 text-bad" : s === "warn" ? "bg-warn/15 text-warn-700" : "bg-info/10 text-info");
  return (
    <div>
      <SectionLabel title="Needs attention" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {ACTION_CENTRE.map((it) => (
          <Link key={it.label} to={it.href} className="group card p-3 flex items-center gap-3 hover:shadow-card-lg hover:-translate-y-px transition-all duration-150">
            <div className={cn("w-9 h-9 rounded-full grid place-items-center shrink-0 text-[15px] font-bold tabular-nums leading-none", toneChip(it.severity))}>{it.count}</div>
            <div className="min-w-0 flex-1 text-[11px] font-medium text-ink-700 leading-tight">{it.label}</div>
            <ChevronRight size={14} className={cn("shrink-0 transition-all group-hover:translate-x-0.5", toneText(it.severity), "opacity-40 group-hover:opacity-100")} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function OverviewTab({ onNavigate }: Props) {
  const [metric, setMetric] = useState<Metric>("combined");
  const [aggregation, setAggregation] = useState<Aggregation>("monthly");
  const [hotel, setHotel] = useState<string | null>(null);
  const metricCfg = METRICS.find((m) => m.key === metric)!;
  const chartData = aggregation === "monthly" ? MONTHLY : aggregation === "quarterly" ? QUARTERLY : ANNUAL;
  const xKey = aggregation === "monthly" ? "month" : aggregation === "quarterly" ? "quarter" : "year";
  const showPY = aggregation !== "annually";
  const series = metric === "combined"
    ? [{ key: "energyTY", name: "Energy", color: CHART.olive }, { key: "waterTY", name: "Water", color: CHART.mauve }, { key: "wasteTY", name: "Waste", color: CHART.blush }]
    : [{ key: `${metric}TY`, name: metricCfg.label, color: metricCfg.color }];

  return (
    <div className="space-y-5">
      <NeedsAttention />

      {/* Executive snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {SNAP_TILES.map((t) => {
          const Icon = t.icon;
          const pct = isPctDelta(t.delta);
          const neg = isNegDelta(t.delta);
          return (
            <div key={t.label} className="relative overflow-hidden rounded-xl2 bg-white p-4 shadow-card transition-all duration-150 hover:shadow-card-lg hover:-translate-y-px">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-500 leading-snug">{t.label}</div>
                <div className={cn("w-8 h-8 rounded-full grid place-items-center shrink-0", t.iconBg)}><Icon size={15} /></div>
              </div>
              <div className={cn("text-kpi font-bold tabular-nums mt-2.5 leading-none tracking-tight", t.highlight ? "text-good" : "text-ink-900")}>{t.value}</div>
              <div className="text-[11px] text-ink-400 mt-1 truncate">{t.unit}</div>
              <div className="mt-3 pt-2.5 border-t border-ink-100 text-[11px]">
                {pct ? (
                  <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold", t.deltaGood ? "text-good bg-good/10" : "text-bad bg-bad/10")}>
                    {neg ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}{t.delta}
                  </span>
                ) : <span className={cn("font-medium", t.deltaGood ? "text-good" : "text-ink-500")}>{t.delta}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend + spend split */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-8 flex flex-col">
          <CardHeader
            title="Cost & performance trend"
            hint={metric === "carbon" ? `Carbon intensity · avg ${carbonS12PerOrn().toFixed(1)} kgCO₂e/ORN · 2030 target ${CARBON_ORN_TARGET_2030.toFixed(1)}` : `${usd(TOTAL_TY)} this year · ${usd(TOTAL_PY)} prior year · $${SAVINGS}k saved`}
            right={
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Tabs variant="segmented" size="sm" ariaLabel="Aggregation" items={[{ key: "monthly", label: "Monthly" }, { key: "quarterly", label: "Quarterly" }, { key: "annually", label: "Annually" }]} value={aggregation} onChange={(k) => setAggregation(k as Aggregation)} />
                <Tabs variant="segmented" size="sm" ariaLabel="Metric" items={METRICS.map((m) => ({ key: m.key, label: m.label }))} value={metric} onChange={(k) => setMetric(k as Metric)} />
              </div>
            }
          />
          <div className="px-3 pt-3 flex-1">
            {metric === "carbon" ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[14, 34]} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTip unit="kgCO₂e/ORN" />} />
                  <ReferenceLine y={CARBON_ORN_TARGET_2030} stroke={CHART.label} strokeDasharray="2 3" label={{ value: "2030 target", position: "insideTopRight", fontSize: 10, fill: CHART.axis }} />
                  <Line type="monotone" dataKey="intensity" name="Carbon intensity" stroke={CHART.cocoa} strokeWidth={2} dot={{ r: 3, fill: CHART.cocoa }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <StackedArea data={chartData} xKey={xKey} series={series} height={260} unit="k" format={(v) => `$${fmtN(v)}`} priorKey={showPY ? metricCfg.pyKey : undefined} priorName={aggregation === "quarterly" ? "Same quarter prior year" : "Prior year"} yFormat={(v) => `$${fmtN(v)}k`} />
            )}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100">
            <LegendRow items={metric === "carbon"
              ? [{ label: "Carbon intensity", color: CHART.cocoa }, { label: "2030 target", color: CHART.label, dashed: true }]
              : [...series.map((s) => ({ label: s.name, color: s.color })), ...(showPY ? [{ label: aggregation === "quarterly" ? "Same quarter prior year" : "Prior year", color: CHART.reference, dashed: true }] : [])]} />
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-4 flex flex-col">
          <CardHeader title="Spend by utility" hint="This year · share of the utility bill" />
          <div className="px-6 pt-4 flex-1">
            <Donut
              legend="below" height={170}
              data={[{ name: "Energy", value: TY.energy, color: CHART.olive }, { name: "Water", value: TY.water, color: CHART.mauve }, { name: "Waste", value: TY.waste, color: CHART.blush }]}
              centre={{ value: usd(TOTAL_TY), label: "this year" }} format={(v) => `$${fmtN(v)}k`}
            />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-3 gap-3">
            {(["energy", "water", "waste"] as const).map((k) => {
              const d = ((TY[k] - PY[k]) / PY[k]) * 100;
              return (
                <div key={k} className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">{k}</div>
                  <div className={cn("text-[12px] font-semibold tabular-nums", d <= 0 ? "text-good-700" : "text-bad-700")}>{d > 0 ? "+" : ""}{d.toFixed(1)}% vs PY</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bridge + hotels */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="How the bill moved" hint="Prior year → this year · $k · each utility's contribution" />
          <div className="px-3 pt-3 flex-1">
            <Waterfall
              height={240} unit="k" format={(v) => `$${fmtN(v)}`} yFormat={(v) => `$${fmtN(v)}k`}
              steps={[
                { name: "Prior year", total: TOTAL_PY },
                { name: "Energy", delta: TY.energy - PY.energy },
                { name: "Water", delta: TY.water - PY.water },
                { name: "Waste", delta: TY.waste - PY.waste },
                { name: "This year", total: TOTAL_TY },
              ]}
            />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <LegendRow items={[{ label: "Totals", color: CHART.prior }, { label: "Saving", color: CHART.olive }, { label: "Increase", color: CHART.rose }]} />
            <span className="font-semibold text-ink-900 tabular-nums whitespace-nowrap">−${SAVINGS}k</span>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Hotels at a glance" hint="Energy intensity against carbon intensity · bubble = rooms · lines = portfolio average" right={<button onClick={() => onNavigate("hotels")} className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">Hotels <ChevronRight size={12} /></button>} />
          <div className="px-2 pt-2 flex-1">
            <Bubble data={HOTEL_POINTS} height={280} xLabel="Energy" xUnit="kWh/ORN" yLabel="Carbon" yUnit="kgCO₂e/RN" zLabel="Rooms" xAvg={AVG_ENERGY} yAvg={AVG_CARBON} onSelect={setHotel} selectedId={hotel} xFormat={(v) => fmtN(v, 0)} yFormat={(v) => fmtN(v, 1)} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <LegendRow items={[{ label: "EMEA", color: CHART.olive }, { label: "APAC", color: CHART.mauve }, { label: "Africa", color: CHART.moss }]} />
            <span>Top-right quadrant is above average on both.</span>
          </div>
        </Card>
      </div>

      {/* Progress to target */}
      <div>
        <SectionLabel title="Progress to 2030 targets — normalised intensity" action="View performance" onClick={() => onNavigate("environment")} />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {GAUGES.map((g) => (
            <div key={g.key} className="card p-5 flex items-center gap-4">
              <RadialGauge value={g.progress} color={g.color} size={96} stroke={9} sub="of the way" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-ink-600">{g.label}</div>
                <div className="text-[17px] font-bold text-ink-900 tabular-nums leading-tight mt-0.5">{g.value}</div>
                <div className="text-[11px] mt-1"><span className={cn("font-semibold", g.key === "waste" ? "text-good-700" : "text-good-700")}>{g.delta}</span> <span className="text-ink-400">vs last year</span></div>
                <div className="text-[10px] text-ink-400 mt-1 truncate">Target {g.target}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-ink-100">
        {[{ label: "Environment detail", tab: "environment" }, { label: "Targets & commitments", tab: "targets" }, { label: "Hotels breakdown", tab: "hotels" }].map((l) => (
          <button key={l.tab} onClick={() => onNavigate(l.tab)} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:text-brand-900 border border-brand-100 hover:border-brand-200 rounded-lg px-3 py-1.5 bg-white hover:bg-brand-50 transition-colors">
            {l.label} <ArrowRight size={11} />
          </button>
        ))}
      </div>
    </div>
  );
}
