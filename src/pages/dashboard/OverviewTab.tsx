import { Link } from "react-router-dom";
import {
  Zap, Droplet, Cloud, Recycle,
  DollarSign, TrendingDown, ArrowRight,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

type Props = { onNavigate: (tab: string) => void };

/* ─── Mock data ──────────────────────────────────────────────────────────── */

// Monthly portfolio-level cost ($k) + carbon intensity (kgCO₂e/ORN)
// TY = May 2025 – Apr 2026 | PY = May 2024 – Apr 2025
const MONTHLY = [
  { month:"May", costTY:348, costPY:371, intensity:11.6 },
  { month:"Jun", costTY:405, costPY:431, intensity:13.1 },
  { month:"Jul", costTY:458, costPY:488, intensity:14.8 },
  { month:"Aug", costTY:466, costPY:496, intensity:15.1 },
  { month:"Sep", costTY:421, costPY:448, intensity:13.7 },
  { month:"Oct", costTY:401, costPY:427, intensity:14.8 },
  { month:"Nov", costTY:377, costPY:401, intensity:15.9 },
  { month:"Dec", costTY:390, costPY:415, intensity:15.6 },
  { month:"Jan", costTY:367, costPY:391, intensity:15.3 },
  { month:"Feb", costTY:344, costPY:366, intensity:14.8 },
  { month:"Mar", costTY:384, costPY:409, intensity:14.5 },
  { month:"Apr", costTY:421, costPY:448, intensity:17.7 },
];

const TOTAL_TY   = MONTHLY.reduce((s, m) => s + m.costTY, 0); // 4,782
const TOTAL_PY   = MONTHLY.reduce((s, m) => s + m.costPY, 0); // 5,091
const SAVINGS    = TOTAL_PY - TOTAL_TY; // ~309

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
function ChartTip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const ty = payload.find(p => p.dataKey === "costTY");
  const py = payload.find(p => p.dataKey === "costPY");
  const int = payload.find(p => p.dataKey === "intensity");
  const diff = ty && py ? ty.value - py.value : null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[180px]">
      <div className="font-semibold text-ink-800 mb-2">{label}</div>
      {ty && <div className="flex justify-between gap-4"><span className="text-ink-500">Cost (this year)</span><span className="font-bold text-ink-900">${ty.value}k</span></div>}
      {py && <div className="flex justify-between gap-4"><span className="text-ink-500">Cost (prior year)</span><span className="text-ink-400">${py.value}k</span></div>}
      {diff !== null && (
        <div className={cn("flex justify-between gap-4 mt-1 pt-1 border-t border-ink-100 font-semibold", diff < 0 ? "text-good" : "text-bad")}>
          <span>Saving</span><span>{diff < 0 ? "+" : "−"}${Math.abs(diff)}k</span>
        </div>
      )}
      {int && <div className="flex justify-between gap-4 mt-1.5 border-t border-ink-100 pt-1.5"><span className="text-ink-500">Carbon intensity</span><span className="font-bold text-teal-700">{int.value} kgCO₂e/ORN</span></div>}
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
        <SectionLabel
          title="Portfolio Cost & Performance Trend"
          action="View environment"
          onClick={() => onNavigate("environment")}
        />
        <div className="card p-6">
          {/* Summary strip */}
          <div className="flex flex-wrap gap-6 mb-5 text-[12px]">
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
            <div className="ml-auto flex items-center gap-3 text-[11px] text-ink-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-brand-700 opacity-80" />This year</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-slate-200" />Prior year</span>
              <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-teal-600 inline-block" />Carbon intensity</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={MONTHLY} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="cost" orientation="left"
                tick={{ fontSize:11, fill:"#6b7280" }}
                tickFormatter={v => `$${v}k`}
                axisLine={false} tickLine={false} width={52}
                domain={[200, 600]}
              />
              <YAxis
                yAxisId="int" orientation="right"
                tick={{ fontSize:11, fill:"#0f766e" }}
                tickFormatter={v => `${v}`}
                axisLine={false} tickLine={false} width={36}
                domain={[8, 22]}
                label={{ value:"kgCO₂e/ORN", angle:90, position:"insideRight", offset:8, style:{ fontSize:9, fill:"#0f766e" } }}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill:"rgba(0,0,0,0.025)" }} />
              <Bar yAxisId="cost" dataKey="costPY" name="Prior year" fill="#e2e8f0" radius={[3,3,0,0]} isAnimationActive={false} />
              <Bar yAxisId="cost" dataKey="costTY" name="This year"  fill="#0F6A3C" radius={[3,3,0,0]} isAnimationActive={false} opacity={0.85} />
              <Line
                yAxisId="int" dataKey="intensity" name="Carbon intensity"
                stroke="#0f766e" strokeWidth={2} strokeDasharray="5 3"
                dot={{ fill:"#0f766e", r:3 }} activeDot={{ r:5 }}
                isAnimationActive={false}
              />
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
