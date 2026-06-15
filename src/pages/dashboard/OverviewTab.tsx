import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Zap, Droplet, Cloud, Recycle,
  DollarSign, TrendingDown, ArrowRight,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { ACTION_CENTRE } from "@/lib/mock";
import {
  portfolioCostPerOrn, portfolioWaterPerGn, portfolioEnergyPerOrnTotal,
  carbonS12PerOrn, PORTFOLIO, CARBON, wasteDiversionDual,
} from "@/lib/normalise";
import { cn } from "@/lib/utils";

// Carbon Scope 1+2 / ORN 2030 target (SBTi −50% pathway, base ≈ 34 kgCO₂e/ORN).
const CARBON_ORN_TARGET_2030 = 17.0;

type Props = { onNavigate: (tab: string) => void };

/* ─── Mock data ──────────────────────────────────────────────────────────── */

// Monthly portfolio-level cost ($k) broken out by utility + carbon intensity
// TY = May 2025 – Apr 2026  |  PY = May 2024 – Apr 2025
// Split: Energy ≈65% · Water ≈20% · Waste ≈15%
const RAW_MONTHLY = [
  { month:"May", energyTY:226, waterTY:70,  wasteTY:52,  energyPY:241, waterPY:74,  wastePY:56,  costPY:371,  intensity:11.6 },
  { month:"Jun", energyTY:263, waterTY:81,  wasteTY:61,  energyPY:280, waterPY:86,  wastePY:65,  costPY:431,  intensity:13.1 },
  { month:"Jul", energyTY:298, waterTY:92,  wasteTY:68,  energyPY:317, waterPY:98,  wastePY:73,  costPY:488,  intensity:14.8 },
  { month:"Aug", energyTY:303, waterTY:93,  wasteTY:70,  energyPY:322, waterPY:99,  wastePY:75,  costPY:496,  intensity:15.1 },
  { month:"Sep", energyTY:274, waterTY:84,  wasteTY:63,  energyPY:291, waterPY:90,  wastePY:67,  costPY:448,  intensity:13.7 },
  { month:"Oct", energyTY:261, waterTY:80,  wasteTY:60,  energyPY:278, waterPY:85,  wastePY:64,  costPY:427,  intensity:14.8 },
  { month:"Nov", energyTY:245, waterTY:75,  wasteTY:57,  energyPY:261, waterPY:80,  wastePY:60,  costPY:401,  intensity:15.9 },
  { month:"Dec", energyTY:254, waterTY:78,  wasteTY:58,  energyPY:270, waterPY:83,  wastePY:62,  costPY:415,  intensity:15.6 },
  { month:"Jan", energyTY:239, waterTY:73,  wasteTY:55,  energyPY:254, waterPY:78,  wastePY:59,  costPY:391,  intensity:15.3 },
  { month:"Feb", energyTY:224, waterTY:68,  wasteTY:52,  energyPY:238, waterPY:73,  wastePY:55,  costPY:366,  intensity:14.8 },
  { month:"Mar", energyTY:250, waterTY:77,  wasteTY:57,  energyPY:266, waterPY:82,  wastePY:61,  costPY:409,  intensity:14.5 },
  { month:"Apr", energyTY:274, waterTY:84,  wasteTY:63,  energyPY:291, waterPY:90,  wastePY:67,  costPY:448,  intensity:17.7 },
];

// Quarterly portfolio costs ($k) — last 8 quarters
// Q1=Jan-Mar  Q2=Apr-Jun  Q3=Jul-Sep  Q4=Oct-Dec
const RAW_QUARTERLY = [
  { quarter:"Q1 '24", energyTY:758, waterTY:232, wasteTY:174, energyPY:807, waterPY:247, wastePY:185, costPY:1239, intensity:16.2 },
  { quarter:"Q2 '24", energyTY:812, waterTY:250, wasteTY:187, energyPY:865, waterPY:266, wastePY:199, costPY:1330, intensity:15.4 },
  { quarter:"Q3 '24", energyTY:931, waterTY:286, wasteTY:214, energyPY:991, waterPY:305, wastePY:228, costPY:1524, intensity:16.5 },
  { quarter:"Q4 '24", energyTY:808, waterTY:248, wasteTY:186, energyPY:860, waterPY:264, wastePY:198, costPY:1322, intensity:15.8 },
  { quarter:"Q1 '25", energyTY:713, waterTY:218, wasteTY:164, energyPY:758, waterPY:232, wastePY:174, costPY:1164, intensity:15.1 },
  { quarter:"Q2 '25", energyTY:763, waterTY:235, wasteTY:176, energyPY:812, waterPY:250, wastePY:187, costPY:1249, intensity:12.8 },
  { quarter:"Q3 '25", energyTY:875, waterTY:269, wasteTY:201, energyPY:931, waterPY:286, wastePY:214, costPY:1431, intensity:14.5 },
  { quarter:"Q4 '25", energyTY:760, waterTY:233, wasteTY:175, energyPY:808, waterPY:248, wastePY:186, costPY:1242, intensity:15.4 },
];

// Annual portfolio costs ($k) — 4-year YoY view
const RAW_ANNUAL = [
  { year:"2022", energyTY:3680, waterTY:1132, wasteTY:849, costPY:0,    intensity:18.4 },
  { year:"2023", energyTY:3450, waterTY:1062, wasteTY:797, costPY:5661, intensity:17.1 },
  { year:"2024", energyTY:3309, waterTY:1016, wasteTY:761, costPY:5309, intensity:15.9 },
  { year:"2025", energyTY:3111, waterTY:955,  wasteTY:716, costPY:5086, intensity:14.8 },
];

// ── Reconcile trend magnitudes to the canonical portfolio spine ──────────────
// Raw arrays carry the seasonal SHAPE; we rescale so the annual cost total
// equals the canonical utility cost and the carbon-intensity series centres on
// the canonical Scope 1+2 / ORN. (Quarterly & annual raw totals already match
// the monthly annual total, so one factor serves all three.)
const RAW_TOTAL_TY = RAW_MONTHLY.reduce((s, m) => s + m.energyTY + m.waterTY + m.wasteTY, 0);
const RAW_AVG_INT  = RAW_MONTHLY.reduce((s, m) => s + m.intensity, 0) / RAW_MONTHLY.length;
const COST_SCALE   = (PORTFOLIO.utilityCostUsd / 1000) / RAW_TOTAL_TY; // $k basis
const INT_SCALE    = carbonS12PerOrn() / RAW_AVG_INT;
const COST_KEYS = ["energyTY", "waterTY", "wasteTY", "energyPY", "waterPY", "wastePY", "costPY"];
const scaleRow = (m: Record<string, number | string>) => {
  const out: any = { ...m };
  for (const k of COST_KEYS) if (typeof out[k] === "number") out[k] = Math.round(out[k] * COST_SCALE);
  if (typeof out.intensity === "number") out.intensity = +(out.intensity * INT_SCALE).toFixed(1);
  return out;
};
const MONTHLY   = RAW_MONTHLY.map(scaleRow);
const QUARTERLY = RAW_QUARTERLY.map(scaleRow);
const ANNUAL    = RAW_ANNUAL.map(scaleRow);

const TOTAL_TY   = MONTHLY.reduce((s, m) => s + m.energyTY + m.waterTY + m.wasteTY, 0); // ≈ 12,892
const TOTAL_PY   = MONTHLY.reduce((s, m) => s + m.costPY, 0);
const SAVINGS    = TOTAL_PY - TOTAL_TY;

type Aggregation = "monthly" | "quarterly" | "annually";

/* ─── Metric toggle config ────────────────────────────────────────────────── */
type Metric = "energy" | "water" | "waste" | "combined" | "carbon";

const METRICS: { key: Metric; label: string; color: string; pyKey: string }[] = [
  { key: "energy",   label: "Energy",   color: "#D97706", pyKey: "energyPY" },
  { key: "water",    label: "Water",    color: "#0EA5E9", pyKey: "waterPY"  },
  { key: "waste",    label: "Waste",    color: "#7C3AED", pyKey: "wastePY"  },
  { key: "combined", label: "Combined", color: "#0F6A3C", pyKey: "costPY"   },
  { key: "carbon",   label: "Carbon",   color: "#0f766e", pyKey: ""         },
];

/* ─── Executive Snapshot tiles ───────────────────────────────────────────── */
type SnapTile = {
  icon:    React.ElementType;
  iconBg:  string;
  label:   string;
  value:   string;
  unit:    string;
  delta:   string;
  deltaGood: boolean;
  highlight?: boolean;
};

const SNAP_TILES: SnapTile[] = [
  {
    icon: DollarSign, iconBg: "bg-ink-100 text-ink-600",
    label: "Total spend",
    value: `$${(TOTAL_TY / 1000).toFixed(1)}M`,
    unit: "energy · water · waste",
    delta: `−${((1 - TOTAL_TY / TOTAL_PY) * 100).toFixed(1)}% vs last year`,
    deltaGood: true,
  },
  {
    icon: TrendingDown, iconBg: "bg-good/10 text-good",
    label: "Savings vs last year",
    value: `$${SAVINGS}k`,
    unit: "cost avoided",
    delta: `from reduced consumption`,
    deltaGood: true,
    highlight: true,
  },
  {
    icon: DollarSign, iconBg: "bg-ink-100 text-ink-600",
    label: "Cost per ORN",
    value: `$${portfolioCostPerOrn().toFixed(1)}`,
    unit: "utility cost / occupied room night",
    delta: `−${((1 - TOTAL_TY / TOTAL_PY) * 100).toFixed(1)}% vs last year`,
    deltaGood: true,
  },
  {
    icon: Zap, iconBg: "bg-pillar-energy/10 text-pillar-energy",
    label: "Energy",
    value: PORTFOLIO.energyMwh.toLocaleString("en-US"),
    unit: "MWh total",
    delta: "−7.3% vs last year",
    deltaGood: true,
  },
  {
    icon: Droplet, iconBg: "bg-pillar-water/10 text-pillar-water",
    label: "Water",
    value: PORTFOLIO.waterM3.toLocaleString("en-US"),
    unit: "m³ total",
    delta: "−7.8% vs last year",
    deltaGood: true,
  },
  {
    icon: Cloud, iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
    label: "Carbon",
    value: CARBON.s1s2.toLocaleString("en-US"),
    unit: `tCO₂e S1+2 · S3 ${CARBON.scope3.toLocaleString("en-US")} sep.`,
    delta: "−9.4% vs last year",
    deltaGood: true,
  },
  {
    icon: Recycle, iconBg: "bg-pillar-waste/10 text-pillar-waste",
    label: "Waste diversion",
    value: `${wasteDiversionDual()}%`,
    unit: "diversion · excl / incl WtE",
    delta: "+6 pp vs last year",
    deltaGood: true,
  },
];

/* ─── Efficiency tiles ────────────────────────────────────────────────────── */
type EffTile = {
  icon:     React.ElementType;
  color:    string;
  accentBg: string;
  label:    string;
  value:    string;
  unit:     string;
  delta:    number;
  progress: number; // 0–100, % of journey from baseline to 2030 target
  targetLabel: string;
};

const EFF_TILES: EffTile[] = [
  {
    icon: Zap, color: "#D97706", accentBg: "border-l-[#D97706]",
    label: "Energy intensity", value: portfolioEnergyPerOrnTotal().toFixed(0), unit: "kWh / ORN",
    delta: -6.0,
    progress: 42, // (137−118)/(137−91)
    targetLabel: "Target 91 kWh/ORN by 2030",
  },
  {
    icon: Droplet, color: "#0EA5E9", accentBg: "border-l-[#0EA5E9]",
    label: "Water intensity", value: portfolioWaterPerGn().toFixed(0), unit: "L / GN",
    delta: -8.0,
    progress: 50, // (612−556)/(612−500) — water on guest-night basis
    targetLabel: "Target 500 L/GN by 2030",
  },
  {
    icon: Cloud, color: "#0F6A3C", accentBg: "border-l-[#0F6A3C]",
    label: "Carbon intensity", value: carbonS12PerOrn().toFixed(1), unit: "kgCO₂e / ORN",
    delta: -10.0,
    progress: 52, // (34.0−25.2)/(34.0−17.0) — Scope 1+2 basis
    targetLabel: "SBTi −50% by 2030 (17.0)",
  },
  {
    icon: Recycle, color: "#7C3AED", accentBg: "border-l-[#7C3AED]",
    label: "Waste diversion", value: `${wasteDiversionDual()}%`, unit: "TRUE / incl WtE",
    delta: 6.0,
    progress: 50, // TRUE 42%: (42−24)/(60−24)
    targetLabel: "Target 60% by 2030 (excl WtE)",
  },
];

/* ─── Tooltip ────────────────────────────────────────────────────────────── */
function ChartTip({ active, payload, label, metric }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string; name?: string }[];
  label?: string;
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;

  if (metric === "carbon") {
    const int = payload.find((p) => p.dataKey === "intensity");
    return (
      <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[160px]">
        <div className="font-semibold text-ink-800 mb-2">{label}</div>
        {int && (
          <div className="flex justify-between gap-4">
            <span className="text-ink-500">Carbon intensity</span>
            <span className="font-bold text-teal-700">{int.value} kgCO₂e/ORN</span>
          </div>
        )}
        <div className="flex justify-between gap-4 mt-1 text-ink-400 text-[11px]">
          <span>2030 target</span><span>{CARBON_ORN_TARGET_2030.toFixed(1)} kgCO₂e/ORN</span>
        </div>
      </div>
    );
  }

  const metricCfg = METRICS.find((m) => m.key === metric)!;
  const pyKey     = metricCfg.pyKey;

  if (metric === "combined") {
    const eTY = payload.find((p) => p.dataKey === "energyTY")?.value ?? 0;
    const wTY = payload.find((p) => p.dataKey === "waterTY")?.value  ?? 0;
    const dTY = payload.find((p) => p.dataKey === "wasteTY")?.value  ?? 0;
    const tot = eTY + wTY + dTY;
    const py  = payload.find((p) => p.dataKey === pyKey)?.value ?? 0;
    const diff = tot - py;
    return (
      <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[190px]">
        <div className="font-semibold text-ink-800 mb-2">{label}</div>
        <div className="space-y-0.5">
          <div className="flex justify-between gap-4"><span className="text-amber-600">Energy</span><span className="font-medium">${eTY}k</span></div>
          <div className="flex justify-between gap-4"><span className="text-sky-500">Water</span><span className="font-medium">${wTY}k</span></div>
          <div className="flex justify-between gap-4"><span className="text-violet-600">Waste</span><span className="font-medium">${dTY}k</span></div>
        </div>
        <div className="border-t border-ink-100 mt-1.5 pt-1.5 space-y-0.5">
          <div className="flex justify-between gap-4 font-semibold"><span className="text-ink-700">Total TY</span><span>${tot}k</span></div>
          <div className="flex justify-between gap-4 text-ink-400"><span>Prior year</span><span>${py}k</span></div>
          <div className={cn("flex justify-between gap-4 font-semibold", diff < 0 ? "text-good" : "text-bad")}>
            <span>vs PY</span><span>{diff < 0 ? "−" : "+"}${Math.abs(diff)}k</span>
          </div>
        </div>
      </div>
    );
  }

  // Energy / Water / Waste
  const tyKey  = `${metric}TY` as const;
  const ty     = payload.find((p) => p.dataKey === tyKey)?.value ?? 0;
  const py     = payload.find((p) => p.dataKey === pyKey)?.value ?? 0;
  const diff   = ty - py;
  const labels: Record<string, string> = { energy: "Energy", water: "Water", waste: "Waste" };

  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[170px]">
      <div className="font-semibold text-ink-800 mb-2">{label}</div>
      <div className="flex justify-between gap-4"><span className="text-ink-500">{labels[metric]} (TY)</span><span className="font-bold text-ink-900">${ty}k</span></div>
      <div className="flex justify-between gap-4"><span className="text-ink-400">{labels[metric]} (PY)</span><span className="text-ink-400">${py}k</span></div>
      <div className={cn("flex justify-between gap-4 mt-1 pt-1 border-t border-ink-100 font-semibold", diff < 0 ? "text-good" : "text-bad")}>
        <span>vs PY</span><span>{diff < 0 ? "−" : "+"}${Math.abs(diff)}k</span>
      </div>
    </div>
  );
}

/* ─── Section label ──────────────────────────────────────────────────────── */
function SectionLabel({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">{title}</h2>
      {action && onClick && (
        <button onClick={onClick} className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          {action} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

/* ─── Needs attention — surfaces the "act" items before the analytics ─────── */
function NeedsAttention() {
  if (!ACTION_CENTRE.length) return null;
  const toneText = (s: string) =>
    s === "bad" ? "text-bad" : s === "warn" ? "text-warn" : "text-info";
  const toneBorder = (s: string) =>
    s === "bad" ? "border-bad/30" : s === "warn" ? "border-warn/30" : "border-info/30";
  return (
    <div>
      <SectionLabel title="Needs attention" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {ACTION_CENTRE.map((it) => (
          <Link
            key={it.label}
            to={it.href}
            className={cn(
              "card p-3 flex items-center gap-3 hover:shadow-md transition-shadow",
              toneBorder(it.severity)
            )}
          >
            <div className={cn("text-2xl font-bold tabular-nums leading-none shrink-0", toneText(it.severity))}>
              {it.count}
            </div>
            <div className="text-[11px] text-ink-600 leading-tight">{it.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function OverviewTab({ onNavigate }: Props) {
  const [metric,      setMetric]      = useState<Metric>("combined");
  const [aggregation, setAggregation] = useState<Aggregation>("monthly");
  const metricCfg = METRICS.find((m) => m.key === metric)!;

  // Pick the right dataset + x-axis key based on aggregation
  const chartData = aggregation === "monthly"   ? MONTHLY
                  : aggregation === "quarterly" ? QUARTERLY
                  : ANNUAL;
  const xKey      = aggregation === "monthly"   ? "month"
                  : aggregation === "quarterly" ? "quarter"
                  : "year";
  // Annual mode: bars tell the YoY story on their own — no prior-year line
  const showPYLine = aggregation !== "annually" && metric !== "carbon";;

  return (
    <div className="space-y-8">

      {/* ── 0. Needs attention — the "act" entry point ────────────────────── */}
      <NeedsAttention />

      {/* ── 1. Executive Snapshot ─────────────────────────────────────────── */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {SNAP_TILES.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className={cn(
                  "card p-4 flex flex-col",
                  t.highlight && "border-good/30 bg-good/3"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500 leading-snug">{t.label}</div>
                  <div className={cn("w-8 h-8 rounded-lg grid place-items-center shrink-0", t.iconBg)}>
                    <Icon size={15} />
                  </div>
                </div>
                <div className={cn(
                  "text-[1.7rem] font-extrabold tabular-nums mt-2 leading-none",
                  t.highlight ? "text-good" : "text-ink-900"
                )}>
                  {t.value}
                </div>
                <div className="text-[11px] text-ink-400 mt-1">{t.unit}</div>
                <div className={cn("text-[11px] font-semibold mt-1.5", t.deltaGood ? "text-good" : "text-bad")}>
                  {t.delta}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Cost & Performance Trend ───────────────────────────────────── */}
      <div>
        {/* Header row: title + controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">
            Portfolio Cost &amp; Performance Trend
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Aggregation toggle */}
            <div className="flex items-center bg-ink-100 rounded-lg p-0.5">
              {(["monthly", "quarterly", "annually"] as Aggregation[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAggregation(a)}
                  className={cn(
                    "px-2.5 h-6 text-[11px] font-medium rounded-md transition-colors capitalize",
                    aggregation === a
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-500 hover:text-ink-700"
                  )}
                >
                  {a === "monthly" ? "Monthly" : a === "quarterly" ? "Quarterly" : "Annually"}
                </button>
              ))}
            </div>

            {/* Divider */}
            <span className="h-4 w-px bg-ink-200" />

            {/* Metric switcher */}
            <div className="flex items-center bg-ink-100 rounded-lg p-0.5">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={cn(
                    "px-2.5 h-6 text-[11px] font-medium rounded-md transition-colors",
                    metric === m.key
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-500 hover:text-ink-700"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6">
          {/* Summary strip */}
          <div className="flex flex-wrap gap-6 mb-5 text-[12px]">
            {metric !== "carbon" && aggregation === "monthly" && (
              <>
                <div>
                  <span className="text-ink-500">This year  </span>
                  <span className="font-bold text-ink-900">${(TOTAL_TY / 1000).toFixed(1)}M total spend</span>
                </div>
                <div>
                  <span className="text-ink-500">Prior year  </span>
                  <span className="font-semibold text-ink-400">${(TOTAL_PY / 1000).toFixed(1)}M</span>
                </div>
                <div>
                  <span className="text-ink-500">Saving  </span>
                  <span className="font-bold text-good">${SAVINGS}k saved</span>
                </div>
              </>
            )}
            {metric !== "carbon" && aggregation === "quarterly" && (
              <div>
                <span className="text-ink-500">Last 8 quarters  </span>
                <span className="font-bold text-ink-900">Q1 2024 — Q4 2025</span>
                <span className="text-ink-400 ml-3">dashed line = prior year equivalent quarter</span>
              </div>
            )}
            {metric !== "carbon" && aggregation === "annually" && (
              <div>
                <span className="text-ink-500">Year-on-year  </span>
                <span className="font-bold text-ink-900">2022 — 2025</span>
                <span className="text-ink-400 ml-3">each bar = full calendar year total</span>
              </div>
            )}
            {metric === "carbon" && (
              <div>
                <span className="text-ink-500">Carbon intensity  </span>
                <span className="font-bold text-ink-900">avg {carbonS12PerOrn().toFixed(1)} kgCO₂e/ORN  </span>
                <span className="text-[11px] text-good font-semibold">2030 target: {CARBON_ORN_TARGET_2030.toFixed(1)}</span>
              </div>
            )}

            {/* Legend */}
            <div className="ml-auto flex items-center gap-3 text-[11px] text-ink-500">
              {metric === "combined" && (
                <>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-amber-500" />Energy</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-sky-400" />Water</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-violet-600" />Waste</span>
                </>
              )}
              {metric !== "combined" && metric !== "carbon" && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: metricCfg.color }} />
                  {metricCfg.label}
                </span>
              )}
              {showPYLine && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2 border-dashed border-slate-400 inline-block" />
                  {aggregation === "quarterly" ? "Same qtr prior year" : "Prior year"}
                </span>
              )}
              {metric === "carbon" && (
                <>
                  <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-teal-600 inline-block" />Intensity</span>
                  <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-green-600 inline-block" />2030 target</span>
                </>
              )}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} barCategoryGap={aggregation === "annually" ? "40%" : "28%"}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey={xKey} tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />

              {/* Cost Y-axis (non-carbon modes) */}
              {metric !== "carbon" && (
                <YAxis
                  yAxisId="main" orientation="left"
                  tick={{ fontSize:11, fill:"#6b7280" }}
                  tickFormatter={(v) => `$${v}k`}
                  axisLine={false} tickLine={false} width={52}
                />
              )}

              {/* Carbon Y-axis */}
              {metric === "carbon" && (
                <YAxis
                  yAxisId="main" orientation="left"
                  tick={{ fontSize:11, fill:"#0f766e" }}
                  tickFormatter={(v) => `${v}`}
                  axisLine={false} tickLine={false} width={40}
                  domain={[14, 34]}
                  label={{ value:"kgCO₂e/ORN", angle:-90, position:"insideLeft", offset:-2, style:{ fontSize:9, fill:"#0f766e" } }}
                />
              )}

              <Tooltip
                content={(props) => (
                  <ChartTip
                    active={props.active}
                    payload={props.payload as { dataKey: string; value: number; color: string }[]}
                    label={props.label}
                    metric={metric}
                  />
                )}
                cursor={{ fill:"rgba(0,0,0,0.025)" }}
              />

              {/* ── Bars — Combined mode (stacked) ── */}
              {metric === "combined" && (
                <>
                  <Bar yAxisId="main" dataKey="energyTY" stackId="s" fill="#F59E0B" radius={[0,0,0,0]} isAnimationActive={false} />
                  <Bar yAxisId="main" dataKey="waterTY"  stackId="s" fill="#38BDF8" radius={[0,0,0,0]} isAnimationActive={false} />
                  <Bar yAxisId="main" dataKey="wasteTY"  stackId="s" fill="#7C3AED" radius={[3,3,0,0]} isAnimationActive={false} />
                </>
              )}

              {/* ── Bar — Energy / Water / Waste single mode ── */}
              {(metric === "energy" || metric === "water" || metric === "waste") && (
                <Bar
                  yAxisId="main"
                  dataKey={`${metric}TY`}
                  fill={metricCfg.color}
                  radius={[3,3,0,0]}
                  isAnimationActive={false}
                  opacity={0.9}
                />
              )}

              {/* ── Dashed prior-year line (monthly + quarterly only, not annually) ── */}
              {showPYLine && (
                <Line
                  yAxisId="main"
                  dataKey={metricCfg.pyKey}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4, fill: "#94a3b8" }}
                  isAnimationActive={false}
                />
              )}

              {/* ── Carbon intensity line ── */}
              {metric === "carbon" && (
                <>
                  <Line
                    yAxisId="main"
                    dataKey="intensity"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={{ fill:"#0f766e", r:3 }}
                    activeDot={{ r:5 }}
                    isAnimationActive={false}
                  />
                  <ReferenceLine
                    yAxisId="main"
                    y={CARBON_ORN_TARGET_2030}
                    stroke="#16a34a"
                    strokeDasharray="4 2"
                    strokeWidth={1.5}
                    label={{ value:"2030 target", position:"insideTopRight", fontSize:10, fill:"#16a34a" }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 3. Efficiency Snapshot ────────────────────────────────────────── */}
      <div>
        <SectionLabel
          title="Efficiency Snapshot — normalised intensity"
          action="View performance"
          onClick={() => onNavigate("environment")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {EFF_TILES.map((t) => {
            const Icon = t.icon;
            const isGood = t.delta < 0 ? true : t.label.includes("diversion");
            return (
              <div
                key={t.label}
                className="card p-5 border-l-4 flex flex-col gap-3"
                style={{ borderLeftColor: t.color }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: `${t.color}18` }}>
                      <Icon size={14} style={{ color: t.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-ink-600">{t.label}</span>
                  </div>
                  <span className={cn(
                    "chip text-[11px] font-bold",
                    isGood ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
                  )}>
                    {t.delta > 0 ? "+" : ""}{t.delta}%
                  </span>
                </div>

                {/* Value */}
                <div>
                  <span className="text-[2rem] font-extrabold tabular-nums text-ink-900 leading-none">{t.value}</span>
                  <span className="text-[12px] text-ink-400 ml-1.5">{t.unit}</span>
                </div>

                {/* Progress to target */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-ink-500">{t.targetLabel}</span>
                    <span className="font-semibold text-ink-700">{t.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${t.progress}%`,
                        background: t.progress >= 60 ? "#16a34a" : t.progress >= 40 ? "#d97706" : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-400">of the way to 2030 target</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick nav to other tabs ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-ink-100">
        {[
          { label:"Environment detail",     tab:"environment"  },
          { label:"Targets & commitments",  tab:"targets"      },
          { label:"Hotels breakdown",       tab:"hotels"       },
          { label:"Social & Governance",    tab:"social"       },
        ].map(l => (
          <button
            key={l.tab}
            onClick={() => onNavigate(l.tab)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:text-brand-900 border border-brand-100 hover:border-brand-200 rounded-lg px-3 py-1.5 bg-white hover:bg-brand-50 transition-colors"
          >
            {l.label} <ArrowRight size={11} />
          </button>
        ))}
      </div>

    </div>
  );
}
