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

/* ─── Waterfall ──────────────────────────────────────────────────────────── */
type WfStep = {
  name: string;
  spacer: number;
  delta: number;
  type: "base" | "up" | "down-neutral" | "down-good" | "total";
};

const WATERFALL: WfStep[] = [
  { name: "Last year",  spacer: 0,    delta: 3094, type: "base"         },
  { name: "Occupancy", spacer: 3094, delta: 148,  type: "up"           },
  { name: "Weather",   spacer: 3190, delta: 52,   type: "down-neutral" },
  { name: "Events",    spacer: 3190, delta: 90,   type: "up"           },
  { name: "Net change",spacer: 2840, delta: 440,  type: "down-good"    },
  { name: "This year", spacer: 0,    delta: 2840, type: "total"        },
];

const BAR_COLOR: Record<WfStep["type"], string> = {
  base:           "#94a3b8",
  up:             "#fb923c",
  "down-neutral": "#7dd3fc",
  "down-good":    "#16a34a",
  total:          "#0F6A3C",
};

const ADJUSTED_BASELINE  = 3280;
const GENUINE_SAVING_MWH = 440;
const COST_PER_MWH       = 105;
const GENUINE_SAVING_USD = GENUINE_SAVING_MWH * COST_PER_MWH;

/* ─── Monthly intensity ──────────────────────────────────────────────────── */
const INTENSITY = [
  { month: "May", ty: 117.8, py: 127.1 },
  { month: "Jun", ty: 114.4, py: 123.7 },
  { month: "Jul", ty: 116.8, py: 125.6 },
  { month: "Aug", ty: 118.3, py: 127.6 },
  { month: "Sep", ty: 118.8, py: 128.1 },
  { month: "Oct", ty: 123.7, py: 133.0 },
  { month: "Nov", ty: 127.6, py: 137.4 },
  { month: "Dec", ty: 123.7, py: 133.0 },
  { month: "Jan", ty: 124.2, py: 134.0 },
  { month: "Feb", ty: 124.7, py: 134.0 },
  { month: "Mar", ty: 121.7, py: 131.5 },
  { month: "Apr", ty: 122.7, py: 132.5 },
];

/* ─── Initiatives ────────────────────────────────────────────────────────── */
type Initiative = {
  name:           string;
  category:       string;
  startYear:      number;
  startMonth:     number;
  endYear:        number | null;
  endMonth:       number | null;
  status:         "completed" | "in-progress";
  savingPotential: string;
};

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ALL_INITIATIVES: Initiative[] = [
  { name: "LED lighting retrofit",  category: "Lighting",   startYear: 2024, startMonth: 9,  endYear: 2025, endMonth: 3,  status: "completed",   savingPotential: "35–55 MWh/yr" },
  { name: "BMS optimisation",       category: "Controls",   startYear: 2025, startMonth: 1,  endYear: null, endMonth: null, status: "in-progress", savingPotential: "60–90 MWh/yr" },
  { name: "Heat pump upgrade",      category: "HVAC",       startYear: 2025, startMonth: 6,  endYear: 2025, endMonth: 11, status: "completed",   savingPotential: "45–70 MWh/yr" },
  { name: "Solar PV expansion",     category: "Renewables", startYear: 2024, startMonth: 3,  endYear: 2024, endMonth: 8,  status: "completed",   savingPotential: "80–110 MWh/yr" },
  { name: "Variable speed drives",  category: "HVAC",       startYear: 2023, startMonth: 11, endYear: 2024, endMonth: 2,  status: "completed",   savingPotential: "20–35 MWh/yr" },
  { name: "Chiller plant upgrade",  category: "HVAC",       startYear: 2026, startMonth: 2,  endYear: null, endMonth: null, status: "in-progress", savingPotential: "90–120 MWh/yr" },
];

function formatDateRange(init: Initiative): string {
  const start = `${MONTH_SHORT[init.startMonth - 1]} ${init.startYear}`;
  if (!init.endYear) return `${start} – ongoing`;
  return `${start} – ${MONTH_SHORT[init.endMonth! - 1]} ${init.endYear}`;
}

function isActiveInYear(init: Initiative, yr: number): boolean {
  const startedBefore = init.startYear <= yr;
  const endedAfter    = init.endYear === null || init.endYear >= yr;
  return startedBefore && endedAfter;
}

/* ─── Tooltips ───────────────────────────────────────────────────────────── */
function WfTooltip({ active, payload }: { active?: boolean; payload?: { payload: WfStep }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.type === "base" || d.type === "total") return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-800 mb-0.5">{d.name}</div>
      <div className={cn("font-bold", d.type === "up" ? "text-bad" : "text-good")}>
        {d.type === "up" ? "+" : "−"}{d.delta} MWh
      </div>
    </div>
  );
}

function IntensityTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const ty = payload.find((p) => p.dataKey === "ty");
  const py = payload.find((p) => p.dataKey === "py");
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-800 mb-1">{label}</div>
      {ty && <div className="flex justify-between gap-4"><span className="text-ink-500">This year</span><span className="font-bold">{ty.value.toFixed(1)}</span></div>}
      {py && <div className="flex justify-between gap-4"><span className="text-ink-500">Prior year</span><span className="text-ink-400">{py.value.toFixed(1)}</span></div>}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function EnergyPerformance() {
  const { year } = useTopbar();
  const initiatives = ALL_INITIATIVES.filter((i) => isActiveInYear(i, year));
  const annualAvgTY = parseFloat(
    (INTENSITY.reduce((s, m) => s + m.ty, 0) / INTENSITY.length).toFixed(1)
  );

  return (
    <div className="space-y-5">

      {/* ── Headlines ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center shrink-0"><TrendingDown size={15} className="text-good" /></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Genuine saving</span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-good leading-none tabular-nums">440 MWh</div>
          <div className="text-[12px] text-ink-500 mt-0.5">−13.4% after adjusting for external factors</div>
        </div>

        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center shrink-0"><DollarSign size={15} className="text-good" /></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Financial impact</span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-good leading-none tabular-nums">${GENUINE_SAVING_USD.toLocaleString()}</div>
          <div className="text-[12px] text-ink-500 mt-0.5">saved · at avg ${COST_PER_MWH} / MWh</div>
        </div>

        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink-100 grid place-items-center shrink-0"><TrendingUp size={15} className="text-ink-500" /></div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Adjusted baseline</span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-ink-800 leading-none tabular-nums">3,280 MWh</div>
          <div className="text-[12px] text-ink-500 mt-0.5">what you would have used with no improvement</div>
        </div>
      </div>

      {/* ── Waterfall ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="From last year to this year" />
        <div className="px-6 pb-2 pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={WATERFALL} barCategoryGap="28%">
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[2500, 3400]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                axisLine={false} tickLine={false} width={40}
              />
              <Tooltip content={<WfTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <ReferenceLine y={ADJUSTED_BASELINE} stroke="#94a3b8" strokeDasharray="4 3"
                label={{ value: "Baseline  3,280", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
              />
              <Bar dataKey="spacer" stackId="wf" fill="transparent" stroke="none" isAnimationActive={false} />
              <Bar dataKey="delta"  stackId="wf" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {WATERFALL.map((e, i) => <Cell key={i} fill={BAR_COLOR[e.type]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 px-6 pb-5 text-[11px] text-ink-500">
          {[
            { color: "#94a3b8", label: "Reference" },
            { color: "#fb923c", label: "External — up" },
            { color: "#7dd3fc", label: "External — down" },
            { color: "#16a34a", label: "Net management change" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </Card>

      {/* ── Monthly intensity ────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Monthly intensity — this year vs prior year" />
        <div className="px-6 pb-6 pt-4">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={INTENSITY}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[108, 147]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false} tickLine={false} width={28}
              />
              <Tooltip content={<IntensityTooltip />} cursor={{ stroke: "#e5e7eb" }} />
              <ReferenceLine y={annualAvgTY} stroke="#0F6A3C" strokeDasharray="3 3" strokeOpacity={0.35} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                formatter={(v) => <span style={{ color: "#6b7280" }}>{v === "ty" ? "This year" : "Prior year"}</span>}
              />
              <Line dataKey="py" name="py" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              <Line dataKey="ty" name="ty" stroke="#0F6A3C" strokeWidth={2.5} dot={{ fill: "#0F6A3C", r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Initiatives ─────────────────────────────────────────────────── */}
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
            <div className="px-6 py-8 text-center text-[13px] text-ink-400">
              No initiatives recorded for {year}.
            </div>
          )}
          {initiatives.map((init) => (
            <div key={init.name} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-ink-900">{init.name}</span>
                  <span className="chip text-[10px] bg-ink-100 text-ink-500">{init.category}</span>
                </div>
                <div className="text-[11px] text-ink-400 mt-0.5">{formatDateRange(init)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[12px] font-semibold text-ink-700">{init.savingPotential}</div>
                <div className="text-[10px] text-ink-400">est. potential</div>
              </div>
              <span className={cn(
                "chip shrink-0 text-[11px] font-semibold",
                init.status === "completed"
                  ? "bg-good/10 text-good border border-good/20"
                  : "bg-warn/10 text-warn border border-warn/25"
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
