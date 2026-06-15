/**
 * Shared genuine-performance view for Water, Waste, Carbon.
 * Waterfall → monthly intensity trend → year-aware initiatives.
 */
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { TrendingDown, TrendingUp, DollarSign, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { useTopbar } from "@/lib/topbarContext";
import { cn } from "@/lib/utils";
import type { PillarKey } from "./Shell";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type WfStep = { name: string; spacer: number; delta: number; type: "base"|"up"|"down-neutral"|"down-good"|"total" };
type Initiative = { name: string; category: string; startYear: number; startMonth: number; endYear: number|null; endMonth: number|null; status: "completed"|"in-progress"; savingPotential: string };

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BAR_COLOR: Record<WfStep["type"], string> = {
  base:"#94a3b8", up:"#fb923c", "down-neutral":"#7dd3fc", "down-good":"#16a34a", total:"#0F6A3C"
};

function isActiveInYear(i: Initiative, yr: number) {
  return i.startYear <= yr && (i.endYear === null || i.endYear >= yr);
}
function dateRange(i: Initiative) {
  const s = `${MONTH_SHORT[i.startMonth-1]} ${i.startYear}`;
  return i.endYear ? `${s} – ${MONTH_SHORT[i.endMonth!-1]} ${i.endYear}` : `${s} – ongoing`;
}

/* ─── Waterfall configs ──────────────────────────────────────────────────── */
type WfConfig = {
  steps: WfStep[];
  baseline: number;
  savingValue: number;
  savingUnit: string;
  savingCost: number;
  costUnit: string;
  baselineLabel: string;
};

const WF: Record<"water"|"waste"|"carbon", WfConfig> = {
  water: {
    steps: [
      { name:"Last year",  spacer:0,      delta:599769, type:"base" },
      { name:"Occupancy",  spacer:599769, delta:13975,  type:"up" },
      { name:"Laundry",    spacer:603263, delta:4658,   type:"down-neutral" },
      { name:"Banqueting", spacer:598604, delta:8152,   type:"up" },
      { name:"Net change", spacer:487967, delta:64053,  type:"down-good" },
      { name:"This year",  spacer:0,      delta:552020, type:"total" },
    ],
    baseline:603263+8152,  // ~611,415
    savingValue:64053, savingUnit:"m³", savingCost:115295, costUnit:"at avg $1.80/m³",
    baselineLabel:"Baseline  611,415",
  },
  waste: {
    steps: [
      { name:"Last year",  spacer:0,    delta:9323, type:"base" },
      { name:"Occupancy",  spacer:9323, delta:160,  type:"up" },
      { name:"F&B volume", spacer:9323, delta:241,  type:"up" },
      { name:"Events",     spacer:9564, delta:100,  type:"up" },
      { name:"Net change", spacer:8421, delta:1404, type:"down-good" },
      { name:"This year",  spacer:0,    delta:8421, type:"total" },
    ],
    baseline:9825,
    savingValue:1404, savingUnit:"tonnes", savingCost:56140, costUnit:"gate fee avoided @$40/t",
    baselineLabel:"Baseline  9,825 t",
  },
  carbon: {
    steps: [
      { name:"Last year",   spacer:0,     delta:19868, type:"base" },
      { name:"Occupancy",   spacer:19868, delta:396,   type:"up" },
      { name:"Weather",     spacer:20023, delta:241,   type:"down-neutral" },
      { name:"Grid factor", spacer:19782, delta:503,   type:"down-neutral" },
      { name:"Net change",  spacer:17996, delta:1284,  type:"down-good" },
      { name:"This year",   spacer:0,     delta:17996, type:"total" },
    ],
    baseline:19520,
    savingValue:1284, savingUnit:"tCO₂e", savingCost:64176, costUnit:"at $50/tCO₂e",
    baselineLabel:"Baseline  19,520",
  },
};

/* ─── Monthly intensity (12 months, TY vs PY) ───────────────────────────── */
const INTENSITY: Record<"water"|"waste"|"carbon", { month:string; ty:number; py:number }[]> = {
  water: [
    {month:"May",ty:0.165,py:0.180},{month:"Jun",ty:0.178,py:0.194},{month:"Jul",ty:0.188,py:0.205},
    {month:"Aug",ty:0.190,py:0.208},{month:"Sep",ty:0.185,py:0.202},{month:"Oct",ty:0.198,py:0.215},
    {month:"Nov",ty:0.205,py:0.225},{month:"Dec",ty:0.200,py:0.218},{month:"Jan",ty:0.198,py:0.217},
    {month:"Feb",ty:0.196,py:0.214},{month:"Mar",ty:0.193,py:0.212},{month:"Apr",ty:0.207,py:0.222},
  ],
  waste: [
    {month:"May",ty:0.92,py:1.01},{month:"Jun",ty:0.95,py:1.04},{month:"Jul",ty:1.00,py:1.10},
    {month:"Aug",ty:1.00,py:1.11},{month:"Sep",ty:0.98,py:1.08},{month:"Oct",ty:1.02,py:1.12},
    {month:"Nov",ty:1.04,py:1.16},{month:"Dec",ty:1.07,py:1.18},{month:"Jan",ty:1.03,py:1.15},
    {month:"Feb",ty:0.98,py:1.08},{month:"Mar",ty:1.00,py:1.11},{month:"Apr",ty:1.11,py:1.20},
  ],
  carbon: [
    {month:"May",ty:11.6,py:13.0},{month:"Jun",ty:13.1,py:14.4},{month:"Jul",ty:14.8,py:16.4},
    {month:"Aug",ty:15.1,py:16.7},{month:"Sep",ty:13.7,py:15.0},{month:"Oct",ty:14.8,py:16.4},
    {month:"Nov",ty:15.9,py:17.7},{month:"Dec",ty:15.6,py:17.3},{month:"Jan",ty:15.3,py:17.0},
    {month:"Feb",ty:14.8,py:16.4},{month:"Mar",ty:14.5,py:16.2},{month:"Apr",ty:17.7,py:19.2},
  ],
};

const INTENSITY_UNIT: Record<"water"|"waste"|"carbon", string> = {
  water:"m³/ORN", waste:"kg/ORN", carbon:"kgCO₂e/ORN"
};

/* ─── Initiatives per pillar ─────────────────────────────────────────────── */
const INITIATIVES: Record<"water"|"waste"|"carbon", Initiative[]> = {
  water: [
    { name:"Low-flow fixture rollout",    category:"Fixtures",    startYear:2024,startMonth:6,  endYear:2025,endMonth:4,  status:"completed",   savingPotential:"4,000–6,000 m³/yr" },
    { name:"Greywater recycling system",  category:"Recycling",   startYear:2025,startMonth:2,  endYear:null,endMonth:null,status:"in-progress",savingPotential:"6,000–9,000 m³/yr" },
    { name:"Leak detection upgrade",      category:"Monitoring",  startYear:2025,startMonth:8,  endYear:2025,endMonth:11, status:"completed",   savingPotential:"2,000–4,000 m³/yr" },
    { name:"Smart irrigation controller", category:"Irrigation",  startYear:2023,startMonth:10, endYear:2024,endMonth:3,  status:"completed",   savingPotential:"1,000–2,000 m³/yr" },
    { name:"Cooling tower optimisation",  category:"HVAC",        startYear:2026,startMonth:1,  endYear:null,endMonth:null,status:"in-progress",savingPotential:"3,000–5,000 m³/yr" },
  ],
  waste: [
    { name:"Food waste monitoring",       category:"Food & Bev",  startYear:2024,startMonth:5,  endYear:null,endMonth:null,status:"in-progress",savingPotential:"15–25 t/yr" },
    { name:"Segregation improvement",     category:"Operations",  startYear:2025,startMonth:1,  endYear:2025,endMonth:9,  status:"completed",   savingPotential:"20–30 t/yr" },
    { name:"On-site composting",          category:"Composting",  startYear:2025,startMonth:4,  endYear:null,endMonth:null,status:"in-progress",savingPotential:"10–18 t/yr" },
    { name:"Supplier packaging reduction",category:"Procurement", startYear:2024,startMonth:9,  endYear:2025,endMonth:12, status:"completed",   savingPotential:"8–14 t/yr" },
    { name:"Hazardous waste audit",       category:"Compliance",  startYear:2026,startMonth:3,  endYear:2026,endMonth:6,  status:"in-progress",savingPotential:"2–4 t/yr" },
  ],
  carbon: [
    { name:"Renewable PPA",               category:"Energy",      startYear:2024,startMonth:7,  endYear:null,endMonth:null,status:"in-progress",savingPotential:"400–600 tCO₂e/yr" },
    { name:"Scope 3 supplier engagement", category:"Supply chain",startYear:2025,startMonth:1,  endYear:null,endMonth:null,status:"in-progress",savingPotential:"500–800 tCO₂e/yr" },
    { name:"HVAC efficiency upgrade",     category:"HVAC",        startYear:2025,startMonth:5,  endYear:2025,endMonth:11, status:"completed",   savingPotential:"150–220 tCO₂e/yr" },
    { name:"EV fleet transition",         category:"Transport",   startYear:2024,startMonth:3,  endYear:2025,endMonth:8,  status:"completed",   savingPotential:"40–70 tCO₂e/yr" },
    { name:"I-REC certification",         category:"Renewables",  startYear:2026,startMonth:1,  endYear:null,endMonth:null,status:"in-progress",savingPotential:"200–350 tCO₂e/yr" },
  ],
};

/* ─── Waterfall tooltip ──────────────────────────────────────────────────── */
function WfTip({ active, payload }: { active?: boolean; payload?: { payload: WfStep }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.type === "base" || d.type === "total") return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-800 mb-0.5">{d.name}</div>
      <div className={cn("font-bold", d.type === "up" ? "text-bad" : "text-good")}>
        {d.type === "up" ? "+" : "−"}{d.delta.toLocaleString()}
      </div>
    </div>
  );
}

function IntTip({ active, payload, label, unit }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; unit: string;
}) {
  if (!active || !payload?.length) return null;
  const ty = payload.find(p => p.dataKey === "ty");
  const py = payload.find(p => p.dataKey === "py");
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-800 mb-1">{label}</div>
      {ty && <div className="flex justify-between gap-4"><span className="text-ink-500">This year</span><span className="font-bold">{ty.value.toFixed(2)} {unit}</span></div>}
      {py && <div className="flex justify-between gap-4"><span className="text-ink-500">Prior year</span><span className="text-ink-400">{py.value.toFixed(2)} {unit}</span></div>}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function PillarPerformance({ pillar }: { pillar: "water"|"waste"|"carbon" }) {
  const { year } = useTopbar();
  const wf     = WF[pillar];
  const intData = INTENSITY[pillar];
  const intUnit = INTENSITY_UNIT[pillar];
  const initiatives = INITIATIVES[pillar].filter(i => isActiveInYear(i, year));

  const yDomain: [number,number] = pillar === "water"
    ? [80000, 115000]
    : pillar === "waste"
    ? [380, 520]
    : [5800, 8000];

  const avgTY = parseFloat((intData.reduce((s,m) => s+m.ty, 0) / intData.length).toFixed(2));

  return (
    <div className="space-y-5">
      {/* Headlines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon:<TrendingDown size={15} className="text-good"/>, bg:"bg-good/10", title:"Genuine saving", value:`${wf.savingValue.toLocaleString()} ${wf.savingUnit}`, sub:"after adjusting for external factors", color:"text-good" },
          { icon:<DollarSign   size={15} className="text-good"/>, bg:"bg-good/10", title:"Financial impact", value:`$${wf.savingCost.toLocaleString()}`, sub:wf.costUnit, color:"text-good" },
          { icon:<TrendingUp   size={15} className="text-ink-500"/>, bg:"bg-ink-100", title:"Adjusted baseline", value:wf.baseline.toLocaleString()+" "+(pillar==="water"?"m³":pillar==="waste"?"t":"tCO₂e"), sub:"what you would have used with no improvement", color:"text-ink-800" },
        ].map(t => (
          <div key={t.title} className="card p-6 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-lg grid place-items-center shrink-0", t.bg)}>{t.icon}</div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{t.title}</span>
            </div>
            <div className={cn("mt-2 text-[1.8rem] font-extrabold leading-none tabular-nums", t.color)}>{t.value}</div>
            <div className="text-[12px] text-ink-500 mt-0.5">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Waterfall */}
      <Card>
        <CardHeader title="From last year to this year" />
        <div className="px-6 pb-2 pt-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={wf.steps} barCategoryGap="28%">
              <XAxis dataKey="name" tick={{ fontSize: 11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis domain={yDomain} tick={{ fontSize:11, fill:"#6b7280" }}
                tickFormatter={v => pillar==="water" ? `${(v/1000).toFixed(0)}k` : `${v.toLocaleString()}`}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<WfTip />} cursor={{ fill:"rgba(0,0,0,0.03)" }} />
              <ReferenceLine y={wf.baseline} stroke="#94a3b8" strokeDasharray="4 3"
                label={{ value: wf.baselineLabel, position:"insideTopRight", fontSize:10, fill:"#94a3b8" }}
              />
              <Bar dataKey="spacer" stackId="wf" fill="transparent" stroke="none" isAnimationActive={false} />
              <Bar dataKey="delta"  stackId="wf" radius={[3,3,0,0]} isAnimationActive={false}>
                {wf.steps.map((e,i) => <Cell key={i} fill={BAR_COLOR[e.type]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 px-6 pb-5 text-[11px] text-ink-500">
          {[["#94a3b8","Reference"],["#fb923c","External — up"],["#7dd3fc","External — down"],["#16a34a","Net management change"]].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </Card>

      {/* Monthly intensity */}
      <Card>
        <CardHeader title={`Monthly intensity — ${intUnit}`} />
        <div className="px-6 pb-6 pt-4">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={intData}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<IntTip unit={intUnit} />} cursor={{ stroke:"#e5e7eb" }} />
              <ReferenceLine y={avgTY} stroke="#0F6A3C" strokeDasharray="3 3" strokeOpacity={0.35} />
              <Legend wrapperStyle={{ fontSize:11, paddingTop:10 }}
                formatter={v => <span style={{ color:"#6b7280" }}>{v==="ty"?"This year":"Prior year"}</span>}
              />
              <Line dataKey="py" name="py" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              <Line dataKey="ty" name="ty" stroke="#0F6A3C" strokeWidth={2.5} dot={{ fill:"#0F6A3C",r:3 }} activeDot={{ r:5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Initiatives */}
      <Card>
        <CardHeader
          title={`Initiatives active in ${year}`}
          right={
            <Link to="/actions" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-900">
              View all <ArrowRight size={13} />
            </Link>
          }
        />
        <div className="divide-y divide-ink-100">
          {initiatives.length === 0 && (
            <div className="px-6 py-8 text-center text-[13px] text-ink-400">No initiatives recorded for {year}.</div>
          )}
          {initiatives.map(init => (
            <div key={init.name} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-ink-900">{init.name}</span>
                  <span className="chip text-[10px] bg-ink-100 text-ink-500">{init.category}</span>
                </div>
                <div className="text-[11px] text-ink-400 mt-0.5">{dateRange(init)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[12px] font-semibold text-ink-700">{init.savingPotential}</div>
                <div className="text-[10px] text-ink-400">est. potential</div>
              </div>
              <span className={cn("chip shrink-0 text-[11px] font-semibold",
                init.status === "completed" ? "bg-good/10 text-good border border-good/20" : "bg-warn/10 text-warn border border-warn/25"
              )}>
                {init.status === "completed" ? "Completed" : "Active"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
