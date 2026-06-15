/**
 * Shared Overview for Water, Waste, Carbon pillars.
 * Same structure as EnergyOverview: 4 KPI tiles + consolidated monthly
 * YoY chart + per-source/stream mini-charts.
 */
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  BarChart,
} from "recharts";
import { Droplet, Trash2, Cloud, DollarSign, Recycle, Leaf } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { PillarKey } from "./Shell";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type MonthRow = {
  month: string;
  ty: number; py: number; costTY: number; costPY: number;
  [src: string]: number | string;
};

type Source = {
  key: string; label: string; fullLabel: string; color: string;
};

type PillarCfg = {
  unit: string;
  costUnit: string;
  totalLabel: string;
  intensityLabel: string;
  intensityUnit: string;
  monthly: MonthRow[];
  sources: Source[];
  kpis: { label: string; value: string; unit?: string; delta: number; goodDir: "up"|"down"; iconBg: string }[];
};

/* ─── Monthly data helpers ───────────────────────────────────────────────── */
const MONTHS = ["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"];

// WATER (m³)
const W_TY = [39596,44255,49496,50660,47749,45997,43090,44255,41926,39596,43673,51242];
const W_PY = [43090,47749,54154,55319,51825,50078,47166,48331,45997,43090,47749,53572];
const WATER_MONTHLY: MonthRow[] = MONTHS.map((m,i) => ({
  month: m, ty: W_TY[i], py: W_PY[i],
  costTY: Math.round(W_TY[i] * 1.80 / 1000 * 10) / 10,
  costPY: Math.round(W_PY[i] * 1.80 / 1000 * 10) / 10,
  mains:    Math.round(W_TY[i] * 0.64),
  recycled: Math.round(W_TY[i] * 0.22),
  pool:     Math.round(W_TY[i] * 0.09),
  irrig:    Math.round(W_TY[i] * 0.05),
}));

// WASTE (tonnes)
const WT_TY = [602,682,762,762,742,722,662,702,642,602,682,862];
const WT_PY = [662,742,842,862,822,802,742,782,742,682,762,882];
const WASTE_MONTHLY: MonthRow[] = MONTHS.map((m,i) => ({
  month: m, ty: WT_TY[i], py: WT_PY[i],
  costTY: Math.round(WT_TY[i] * 40 / 1000 * 100) / 100,
  costPY: Math.round(WT_PY[i] * 40 / 1000 * 100) / 100,
  recycling:  Math.round(WT_TY[i] * 0.38),
  landfill:   Math.round(WT_TY[i] * 0.36),
  composting: Math.round(WT_TY[i] * 0.16),
  foodAD:     Math.round(WT_TY[i] * 0.08),
  hazardous:  Math.round(WT_TY[i] * 0.02),
}));

// CARBON (tCO₂e Scope 1+2)
const C_TY = [1284,1492,1690,1722,1551,1476,1385,1436,1353,1265,1414,1928];
const C_PY = [1431,1658,1877,1912,1717,1642,1540,1588,1503,1407,1570,2024];
const CARBON_MONTHLY: MonthRow[] = MONTHS.map((m,i) => ({
  month: m, ty: C_TY[i], py: C_PY[i],
  costTY: Math.round(C_TY[i] * 50 / 1000 * 10) / 10,
  costPY: Math.round(C_PY[i] * 50 / 1000 * 10) / 10,
  scope1: Math.round(C_TY[i] * 0.27),
  scope2: Math.round(C_TY[i] * 0.73),
}));

/* ─── Pillar configs ─────────────────────────────────────────────────────── */
const CONFIGS: Record<"water"|"waste"|"carbon", PillarCfg> = {
  water: {
    unit: "m³", costUnit: "$/m³ avg $1.80", totalLabel: "Total consumption",
    intensityLabel: "Water intensity", intensityUnit: "m³/ORN",
    monthly: WATER_MONTHLY,
    sources: [
      { key:"mains",    label:"Mains",          fullLabel:"Mains water",         color:"#0ea5e9" },
      { key:"recycled", label:"Recycled",        fullLabel:"Recycled / grey water",color:"#22c55e" },
      { key:"pool",     label:"Pool & spa",      fullLabel:"Pool & Spa",           color:"#a78bfa" },
      { key:"irrig",    label:"Irrigation",      fullLabel:"Irrigation",           color:"#fb923c" },
    ],
    kpis: [
      { label:"Total consumption", value:"552,000",unit:"m³",    delta:-7.8, goodDir:"down", iconBg:"bg-pillar-water/10 text-pillar-water" },
      { label:"Water intensity",   value:"0.77",   unit:"m³/ORN",delta:-8.0, goodDir:"down", iconBg:"bg-warn/10 text-warn" },
      { label:"Water cost",        value:"$994k",  unit:"",       delta:-5.0, goodDir:"down", iconBg:"bg-pillar-water/10 text-pillar-water" },
      { label:"Recycled share",    value:"22",     unit:"%",      delta: 4.0, goodDir:"up",  iconBg:"bg-brand-50 text-brand-700" },
    ],
  },
  waste: {
    unit: "t", costUnit: "disposal $40/t avg", totalLabel: "Total generated",
    intensityLabel: "Waste intensity", intensityUnit: "kg/ORN",
    monthly: WASTE_MONTHLY,
    sources: [
      { key:"recycling",  label:"Recycling",   fullLabel:"Recycling",         color:"#22c55e" },
      { key:"landfill",   label:"Landfill",    fullLabel:"Landfill (general)", color:"#94a3b8" },
      { key:"composting", label:"Composting",  fullLabel:"Composting",         color:"#84cc16" },
      { key:"foodAD",     label:"Food / AD",   fullLabel:"Food waste (AD)",    color:"#f59e0b" },
      { key:"hazardous",  label:"Hazardous",   fullLabel:"Hazardous waste",    color:"#ef4444" },
    ],
    kpis: [
      { label:"Total generated",  value:"8,420", unit:"t",      delta:-9.7, goodDir:"down", iconBg:"bg-pillar-waste/10 text-pillar-waste" },
      { label:"Waste intensity",  value:"11.78", unit:"kg/ORN", delta:-10.0,goodDir:"down", iconBg:"bg-warn/10 text-warn" },
      { label:"Diversion rate",   value:"64",    unit:"%",      delta: 6.0, goodDir:"up",  iconBg:"bg-brand-50 text-brand-700" },
      { label:"Food waste",       value:"82",    unit:"g/cover",delta:-8.0, goodDir:"down", iconBg:"bg-pillar-waste/10 text-pillar-waste" },
    ],
  },
  carbon: {
    unit: "tCO₂e", costUnit: "carbon cost $50/t", totalLabel: "Scope 1+2 emissions",
    intensityLabel: "Carbon intensity", intensityUnit: "kgCO₂e/ORN",
    monthly: CARBON_MONTHLY,
    sources: [
      { key:"scope1", label:"Scope 1", fullLabel:"Scope 1 — direct",          color:"#dc2626" },
      { key:"scope2", label:"Scope 2", fullLabel:"Scope 2 — purchased energy", color:"#f97316" },
    ],
    kpis: [
      { label:"Scope 1+2 total",  value:"17,997",unit:"tCO₂e",    delta:-9.4, goodDir:"down", iconBg:"bg-pillar-carbon/10 text-pillar-carbon" },
      { label:"Carbon intensity", value:"25.2",  unit:"kgCO₂e/ORN",delta:-10.0,goodDir:"down",iconBg:"bg-warn/10 text-warn" },
      { label:"Renewable share",  value:"12",    unit:"%",          delta: 3.0, goodDir:"up",  iconBg:"bg-brand-50 text-brand-700" },
      { label:"Scope 3 (annual)", value:"24,853",unit:"tCO₂e",     delta:-2.2, goodDir:"down", iconBg:"bg-pillar-carbon/10 text-pillar-carbon" },
    ],
  },
};

const PILLAR_ICON: Record<"water"|"waste"|"carbon", React.ElementType> = {
  water:  Droplet,
  waste:  Trash2,
  carbon: Cloud,
};

/* ─── Shared tooltip ─────────────────────────────────────────────────────── */
function MainTooltip({ active, payload, label, unit }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; unit: string;
}) {
  if (!active || !payload?.length) return null;
  const ty = payload.find(p => p.dataKey === "ty");
  const py = payload.find(p => p.dataKey === "py");
  if (!ty || !py) return null;
  const diff = ty.value - py.value;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-800 mb-1">{label}</div>
      <div className="flex justify-between gap-4"><span className="text-ink-500">This year</span><span className="font-bold">{ty.value.toLocaleString()} {unit}</span></div>
      <div className="flex justify-between gap-4"><span className="text-ink-500">Prior year</span><span className="text-ink-400">{py.value.toLocaleString()} {unit}</span></div>
      <div className={cn("flex justify-between gap-4 mt-1 pt-1 border-t border-ink-100 font-semibold", diff < 0 ? "text-good" : "text-bad")}>
        <span>Change</span><span>{diff > 0 ? "+" : ""}{diff.toLocaleString()} {unit}</span>
      </div>
    </div>
  );
}

function SourceTooltip({ active, payload, label, unit }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-800 mb-0.5">{label}</div>
      <div className="font-bold text-ink-900">{payload[0].value.toLocaleString()} {unit}</div>
    </div>
  );
}

/* ─── Source mini-chart ──────────────────────────────────────────────────── */
function SourceChart({ source, data, unit }: { source: Source; data: MonthRow[]; unit: string }) {
  const annualTY = data.reduce((s,m) => s + (m[source.key] as number), 0);
  const annualPY = data.reduce((s,m) => s + Math.round(m.py * ((m[source.key] as number) / m.ty)), 0);
  const yoy = ((annualTY - annualPY) / annualPY) * 100;
  const chartData = data.map(m => ({
    month: m.month,
    ty: m[source.key] as number,
    py: Math.round(m.py * ((m[source.key] as number) / m.ty)),
  }));
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] font-semibold text-ink-700">{source.fullLabel}</div>
          <div className="text-[1.5rem] font-extrabold tabular-nums text-ink-900 leading-tight mt-0.5">
            {annualTY.toLocaleString()}<span className="text-[11px] font-semibold text-ink-400 ml-1">{unit}</span>
          </div>
        </div>
        <span className={cn("chip text-[11px] font-semibold mt-0.5", yoy < 0 ? "bg-good/10 text-good" : "bg-bad/10 text-bad")}>
          {yoy < 0 ? "" : "+"}{yoy.toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={chartData} barGap={1} barCategoryGap="32%">
          <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<SourceTooltip unit={unit} />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="py" fill="#e5e7eb" radius={[2,2,0,0]} isAnimationActive={false} />
          <Bar dataKey="ty" fill={source.color} radius={[2,2,0,0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <div className="text-[10px] text-ink-400 flex gap-3 -mt-1">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: source.color }} />This year</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-ink-200" />Prior year</span>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function PillarOverview({ pillar }: { pillar: "water"|"waste"|"carbon" }) {
  const cfg = CONFIGS[pillar];
  const Icon = PILLAR_ICON[pillar];
  const totalTY   = cfg.monthly.reduce((s,m) => s + m.ty, 0);
  const totalPY   = cfg.monthly.reduce((s,m) => s + m.py, 0);
  const totalCost = cfg.monthly.reduce((s,m) => s + m.costTY, 0);
  const costPY    = cfg.monthly.reduce((s,m) => s + m.costPY, 0);
  const yoy       = ((totalTY - totalPY) / totalPY * 100).toFixed(1);
  const costSaved = (costPY - totalCost).toFixed(1);

  return (
    <div className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cfg.kpis.map((k) => (
          <KpiTile
            key={k.label}
            icon={<Icon size={18} />}
            iconBg={k.iconBg}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            goodDirection={k.goodDir}
          />
        ))}
      </div>

      {/* Consolidated chart */}
      <Card>
        <CardHeader title={`Monthly ${cfg.totalLabel.toLowerCase()} — this year vs prior year`} />
        <div className="px-6 pb-6 pt-4">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={cfg.monthly} barGap={2} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="vol" orientation="left" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={40}
                label={{ value: cfg.unit, angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 10, fill: "#9ca3af" } }}
              />
              <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11, fill: "#b45309" }} tickFormatter={v => `$${v}k`} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<MainTooltip unit={cfg.unit} />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <Bar yAxisId="vol" dataKey="ty" name="This year" fill="#0F6A3C" radius={[3,3,0,0]} isAnimationActive={false} />
              <Bar yAxisId="vol" dataKey="py" name="Prior year" fill="#cbd5e1" radius={[3,3,0,0]} isAnimationActive={false} />
              <Line yAxisId="cost" dataKey="costTY" name="Cost (this year)" stroke="#d97706" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="cost" dataKey="costPY" name="Cost (prior year)" stroke="#fcd34d" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} formatter={(v) => <span style={{ color: "#6b7280" }}>{v}</span>} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="border-t border-ink-100 px-6 py-3 flex flex-wrap gap-6 text-[12px]">
          <span><span className="text-ink-500">This year  </span><span className="font-bold text-ink-900">{totalTY.toLocaleString()} {cfg.unit}</span></span>
          <span><span className="text-ink-500">Prior year  </span><span className="font-semibold text-ink-400">{totalPY.toLocaleString()} {cfg.unit}</span></span>
          <span className={cn("font-bold", Number(yoy) < 0 ? "text-good" : "text-bad")}>
            <span className="text-ink-500 font-normal">Change  </span>{yoy}%
          </span>
          <span><span className="text-ink-500">Cost saving  </span><span className="font-bold text-good">${costSaved}k</span></span>
        </div>
      </Card>

      {/* Source / stream mini-charts */}
      <div>
        <h2 className="text-[13px] font-semibold text-ink-700 mb-3">By source</h2>
        <div className={cn("grid gap-4", cfg.sources.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")}>
          {cfg.sources.map(s => (
            <SourceChart key={s.key} source={s} data={cfg.monthly} unit={cfg.unit} />
          ))}
        </div>
      </div>
    </div>
  );
}
