/**
 * Shared Benchmarks for Water, Waste, Carbon.
 * Savings callout + 2×2 horizontal bar charts per metric.
 */
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { DollarSign, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Peer = { name: string; isYou: boolean; [k: string]: number | string | boolean };

type MetricDef = { key: string; label: string; unit: string; lowerIsBetter: boolean; format: (v: number) => string };

type BenchCfg = {
  peers:       Peer[];
  metrics:     MetricDef[];
  savingUnit:  string;
  costPerUnit: number;
  bestKey:     string; // which metric drives the main saving
};

/* ─── Configs ────────────────────────────────────────────────────────────── */
const CONFIGS: Record<"water"|"waste"|"carbon", BenchCfg> = {
  water: {
    peers: [
      { name:"You",    isYou:true,  intensity:0.77, perM2:0.32, costPerOrn:0.41, recycled:22 },
      { name:"Peer A", isYou:false, intensity:0.60, perM2:0.24, costPerOrn:0.32, recycled:35 },
      { name:"Peer B", isYou:false, intensity:0.71, perM2:0.28, costPerOrn:0.37, recycled:28 },
      { name:"Peer C", isYou:false, intensity:0.87, perM2:0.36, costPerOrn:0.47, recycled:18 },
    ],
    metrics: [
      { key:"intensity",  label:"Water intensity",     unit:"m³/ORN",  lowerIsBetter:true,  format:v => v.toFixed(2) },
      { key:"perM2",      label:"Water / area",        unit:"m³/m²",   lowerIsBetter:true,  format:v => v.toFixed(2) },
      { key:"costPerOrn", label:"Cost per room night", unit:"USD/ORN", lowerIsBetter:true,  format:v => `$${v.toFixed(2)}` },
      { key:"recycled",   label:"Recycled share",      unit:"%",       lowerIsBetter:false, format:v => `${v}%` },
    ],
    savingUnit:"m³", costPerUnit:1.80, bestKey:"intensity",
  },
  waste: {
    peers: [
      { name:"You",    isYou:true,  intensity:11.78, diversion:64, costPerOrn:0.61, foodPerCover:82 },
      { name:"Peer A", isYou:false, intensity:9.01, diversion:74, costPerOrn:0.47, foodPerCover:62 },
      { name:"Peer B", isYou:false, intensity:10.63, diversion:69, costPerOrn:0.55, foodPerCover:72 },
      { name:"Peer C", isYou:false, intensity:13.63, diversion:58, costPerOrn:0.71, foodPerCover:96 },
    ],
    metrics: [
      { key:"intensity",  label:"Waste intensity",  unit:"kg/ORN",   lowerIsBetter:true,  format:v => v.toFixed(2) },
      { key:"diversion",  label:"Diversion rate",   unit:"%",        lowerIsBetter:false, format:v => `${v}%` },
      { key:"costPerOrn", label:"Disposal cost",    unit:"USD/ORN",  lowerIsBetter:true,  format:v => `$${v.toFixed(2)}` },
      { key:"foodPerCover",label:"Food waste",      unit:"g/cover",  lowerIsBetter:true,  format:v => `${v}g` },
    ],
    savingUnit:"tonnes", costPerUnit:40, bestKey:"intensity",
  },
  carbon: {
    peers: [
      { name:"You",    isYou:true,  intensity:25.2, scope2:18.24, costPerOrn:0.82, renewable:12 },
      { name:"Peer A", isYou:false, intensity:18.24, scope2:12.99,  costPerOrn:0.59, renewable:92 },
      { name:"Peer B", isYou:false, intensity:21.95, scope2:15.77, costPerOrn:0.71, renewable:84 },
      { name:"Peer C", isYou:false, intensity:29.99, scope2:21.80, costPerOrn:0.97, renewable:65 },
    ],
    metrics: [
      { key:"intensity",  label:"Carbon intensity",   unit:"kgCO₂e/ORN", lowerIsBetter:true,  format:v => v.toFixed(1) },
      { key:"scope2",     label:"Scope 2 intensity",  unit:"kgCO₂e/ORN", lowerIsBetter:true,  format:v => v.toFixed(1) },
      { key:"costPerOrn", label:"Carbon cost/ORN",    unit:"USD/ORN",     lowerIsBetter:true,  format:v => `$${v.toFixed(2)}` },
      { key:"renewable",  label:"Renewable share",    unit:"%",           lowerIsBetter:false, format:v => `${v}%` },
    ],
    savingUnit:"tCO₂e", costPerUnit:50, bestKey:"intensity",
  },
};

/* ─── Bar tooltip ────────────────────────────────────────────────────────── */
function Tip({ active, payload, label, format }: { active?: boolean; payload?: { value: number }[]; label?: string; format:(v:number)=>string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <span className="font-semibold text-ink-800">{label}</span>
      <span className="ml-2 font-bold text-ink-900">{format(payload[0].value)}</span>
    </div>
  );
}

/* ─── Single metric card ─────────────────────────────────────────────────── */
function MetricChart({ metric, peers }: { metric: MetricDef; peers: Peer[] }) {
  const vals = peers.map(p => p[metric.key] as number);
  const bestVal = metric.lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
  const sorted = [...peers].sort((a, b) =>
    metric.lowerIsBetter
      ? (a[metric.key] as number) - (b[metric.key] as number)
      : (b[metric.key] as number) - (a[metric.key] as number)
  ).map(p => ({ name: p.name, value: p[metric.key] as number, isYou: p.isYou }));

  const maxVal = metric.lowerIsBetter
    ? Math.max(...vals) * 1.15
    : metric.key === "renewable" || metric.key === "diversion" ? 100 : Math.max(...vals) * 1.15;

  return (
    <Card>
      <div className="px-5 pt-5 pb-1">
        <div className="text-[13px] font-semibold text-ink-900">{metric.label}</div>
        <div className="text-[11px] text-ink-400">{metric.unit}</div>
      </div>
      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart layout="vertical" data={sorted} barCategoryGap="22%">
            <XAxis type="number" domain={[0, maxVal]} tick={{ fontSize:10, fill:"#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={metric.format} />
            <YAxis type="category" dataKey="name"
              tick={({ x, y, payload }) => (
                <text x={x-4} y={y} textAnchor="end" dominantBaseline="middle"
                  fontSize={11} fontWeight={payload.value==="You"?700:400}
                  fill={payload.value==="You"?"#0F6A3C":"#6b7280"}>
                  {payload.value}
                </text>
              )}
              width={48} axisLine={false} tickLine={false}
            />
            <Tooltip content={<Tip format={metric.format} />} cursor={{ fill:"rgba(0,0,0,0.03)" }} />
            <ReferenceLine x={bestVal} stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Bar dataKey="value" radius={[0,3,3,0]} isAnimationActive={false}>
              {sorted.map((e,i) => <Cell key={i} fill={e.isYou ? "#0F6A3C" : "#e2e8f0"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-1.5 px-3 text-[10px] text-ink-400">
          <span className="w-4 border-t border-dashed border-good opacity-60" />
          Best {metric.format(bestVal)}
        </div>
      </div>
    </Card>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function PillarBenchmarks({ pillar }: { pillar: "water"|"waste"|"carbon" }) {
  const { peers, metrics, savingUnit, costPerUnit, bestKey } = CONFIGS[pillar];
  const you  = peers.find(p => p.isYou)!;
  const best = peers.filter(p => !p.isYou).reduce((a,b) =>
    (a[bestKey] as number) < (b[bestKey] as number) ? a : b
  );
  const yourVal = you[bestKey] as number;
  const bestVal = best[bestKey] as number;

  // Approximate ORN count from total consumption
  const approxORNs = pillar === "water" ? 552000/yourVal : pillar === "waste" ? 8420000/yourVal : 17997000/yourVal;
  const savingAmount = Math.round(Math.abs(yourVal - bestVal) * approxORNs / (pillar === "waste" ? 1000 : 1));
  const savingUSD = Math.round(savingAmount * costPerUnit);

  const youRank = [...peers].sort((a,b) => (a[bestKey] as number)-(b[bestKey] as number)).findIndex(p=>p.isYou)+1;

  return (
    <div className="space-y-5">
      {/* Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-brand-600">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center shrink-0"><TrendingDown size={15} className="text-brand-700" /></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Opportunity vs best peer</span>
          </div>
          <div className="text-[2rem] font-extrabold text-brand-700 leading-none tabular-nums">{savingAmount.toLocaleString()} {savingUnit}</div>
          <div className="text-[12px] text-ink-500 mt-0.5">if you matched {best.name}</div>
        </div>
        <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-good">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center shrink-0"><DollarSign size={15} className="text-good" /></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Value of the gap</span>
          </div>
          <div className="text-[2rem] font-extrabold text-good leading-none tabular-nums">${savingUSD.toLocaleString()}</div>
          <div className="text-[12px] text-ink-500 mt-0.5">per year · you rank {youRank} of {peers.length}</div>
        </div>
      </div>

      {/* Metric charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map(m => <MetricChart key={m.key} metric={m} peers={peers} />)}
      </div>

      <p className="text-[11px] text-ink-400">Peers are anonymised same-type hotels · no adjustments applied · raw operational data</p>
    </div>
  );
}
