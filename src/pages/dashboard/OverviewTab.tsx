import { useState } from "react";
import {
  Zap, Droplet, Cloud, Recycle,
  DollarSign, TrendingDown, ArrowRight,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

type Props = { onNavigate: (tab: string) => void };

/* ─── Mock data ──────────────────────────────────────────────────────────── */

// Monthly portfolio-level cost ($k) broken out by utility + carbon intensity
// TY = May 2025 – Apr 2026  |  PY = May 2024 – Apr 2025
// Split: Energy ≈65% · Water ≈20% · Waste ≈15%
const MONTHLY = [
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

const TOTAL_TY   = MONTHLY.reduce((s, m) => s + m.energyTY + m.waterTY + m.wasteTY, 0); // 4,782
const TOTAL_PY   = MONTHLY.reduce((s, m) => s + m.costPY, 0);                           // 5,091
const SAVINGS    = TOTAL_PY - TOTAL_TY; // ~309

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
    icon: Zap, iconBg: "bg-pillar-energy/10 text-pillar-energy",
    label: "Energy",
    value: "9,900",
    unit: "MWh total",
    delta: "−7.3% vs last year",
    deltaGood: true,
  },
  {
    icon: Droplet, iconBg: "bg-pillar-water/10 text-pillar-water",
    label: "Water",
    value: "94,800",
    unit: "m³ total",
    delta: "−7.8% vs last year",
    deltaGood: true,
  },
  {
    icon: Cloud, iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
    label: "Carbon",
    value: "6,730",
    unit: "tCO₂e Scope 1+2",
    delta: "−9.4% vs last year",
    deltaGood: true,
  },
  {
    icon: Recycle, iconBg: "bg-pillar-waste/10 text-pillar-waste",
    label: "Waste diversion",
    value: "64%",
    unit: "420 t generated",
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
    label: "Energy intensity", value: "24.0", unit: "kWh / ORN",
    delta: -6.0,
    progress: 42, // (28.0−24.0)/(28.0−18.5) = 42%
    targetLabel: "Target 18.5 by 2030",
  },
  {
    icon: Droplet, color: "#0EA5E9", accentBg: "border-l-[#0EA5E9]",
    label: "Water intensity", value: "0.23", unit: "m³ / ORN",
    delta: -8.0,
    progress: 50, // (0.28−0.23)/(0.28−0.18) = 50%
    targetLabel: "Target 0.18 by 2030",
  },
  {
    icon: Cloud, color: "#0F6A3C", accentBg: "border-l-[#0F6A3C]",
    label: "Carbon intensity", value: "16.3", unit: "kgCO₂e / ORN",
    delta: -10.0,
    progress: 52, // (22.0−16.3)/(22.0−11.0) = 52%
    targetLabel: "SBTi pathway − 50% by 2030",
  },
  {
    icon: Recycle, color: "#7C3AED", accentBg: "border-l-[#7C3AED]",
    label: "Waste diversion", value: "64%", unit: "diversion rate",
    delta: 6.0,
    progress: 54, // (64−45)/(80−45) = 54%
    targetLabel: "Target 80% by 2030",
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
          <span>2030 target</span><span>11.0 kgCO₂e/ORN</span>
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

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function OverviewTab({ onNavigate }: Props) {
  const [metric, setMetric] = useState<Metric>("combined");
  const metricCfg = METRICS.find((m) => m.key === metric)!;

  return (
    <div className="space-y-8">

      {/* ── 1. Executive Snapshot ─────────────────────────────────────────── */}
      <div>
        <SectionLabel title="Executive Snapshot" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {SNAP_TILES.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className={cn(
                  "card p-5 flex flex-col gap-0",
                  t.highlight && "border-good/30 bg-good/3"
                )}
              >
                <div className={cn("w-9 h-9 rounded-xl grid place-items-center mb-3 shrink-0", t.iconBg)}>
                  <Icon size={16} />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500 leading-snug">{t.label}</div>
                <div className={cn(
                  "text-[1.7rem] font-extrabold tabular-nums mt-1 leading-none",
                  t.highlight ? "text-good" : "text-ink-900"
                )}>
                  {t.value}
                </div>
                <div className="text-[11px] text-ink-400 mt-0.5">{t.unit}</div>
                <div className={cn("text-[11px] font-semibold mt-2", t.deltaGood ? "text-good" : "text-bad")}>
                  {t.delta}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Cost & Performance Trend ───────────────────────────────────── */}
      <div>
        {/* Header row: title + metric switcher */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400">
            Portfolio Cost &amp; Performance Trend
          </h2>
          <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-0.5">
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

        <div className="card p-6">
          {/* Summary strip */}
          <div className="flex flex-wrap gap-6 mb-5 text-[12px]">
            {metric !== "carbon" && (
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
            {metric === "carbon" && (
              <div>
                <span className="text-ink-500">Carbon intensity  </span>
                <span className="font-bold text-ink-900">avg 14.6 kgCO₂e/ORN  </span>
                <span className="text-[11px] text-good font-semibold">2030 target: 11.0</span>
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
              {metric !== "carbon" && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2 border-dashed border-slate-400 inline-block" />
                  Prior year
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
            <ComposedChart data={MONTHLY} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />

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
                  domain={[8, 22]}
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

              {/* ── Dashed prior-year line (all non-carbon) ── */}
              {metric !== "carbon" && (
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
                    y={11}
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
          title="Efficiency Snapshot — intensity per occupied room night"
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
