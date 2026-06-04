import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { TrendingDown, TrendingUp, DollarSign, ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/* ─── Waterfall ──────────────────────────────────────────────────────────────
   Running totals (MWh):
   Last year 3,094 → +Occupancy 148 → −Weather 52 → +Events 90
   → Adjusted baseline 3,280 → −Genuine saving 440 → This year 2,840
*/
type WfStep = {
  name: string;
  spacer: number;
  delta: number;
  type: "base" | "up" | "down-neutral" | "down-good" | "total";
  desc: string;
};

const WATERFALL: WfStep[] = [
  { name: "Last year",    spacer: 0,    delta: 3094, type: "base",         desc: "Actual consumption last period" },
  { name: "Occupancy",   spacer: 3094, delta: 148,  type: "up",           desc: "Higher occupancy required more energy" },
  { name: "Weather",     spacer: 3190, delta: 52,   type: "down-neutral", desc: "Cooler year reduced cooling load" },
  { name: "Events",      spacer: 3190, delta: 90,   type: "up",           desc: "Larger conference & banqueting calendar" },
  { name: "Net change",  spacer: 2840, delta: 440,  type: "down-good",    desc: "Combined effect of all management changes this period" },
  { name: "This year",   spacer: 0,    delta: 2840, type: "total",        desc: "Actual consumption this period" },
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
const GENUINE_SAVING_USD = GENUINE_SAVING_MWH * COST_PER_MWH; // 46,200

/* ─── Monthly intensity data (kWh / ORN) ────────────────────────────────────
   Derived from monthly MWh ÷ estimated occupied room nights per month.
   Both years use the same ORN base so the comparison is like-for-like.
*/
const INTENSITY = [
  { month: "May", ty: 24.0, py: 25.9 },
  { month: "Jun", ty: 23.3, py: 25.2 },
  { month: "Jul", ty: 23.8, py: 25.6 },
  { month: "Aug", ty: 24.1, py: 26.0 },
  { month: "Sep", ty: 24.2, py: 26.1 },
  { month: "Oct", ty: 25.2, py: 27.1 },
  { month: "Nov", ty: 26.0, py: 28.0 },
  { month: "Dec", ty: 25.2, py: 27.1 },
  { month: "Jan", ty: 25.3, py: 27.3 },
  { month: "Feb", ty: 25.4, py: 27.3 },
  { month: "Mar", ty: 24.8, py: 26.8 },
  { month: "Apr", ty: 25.0, py: 27.0 },
];

/* ─── Initiatives active this period ────────────────────────────────────────
   Listed without MWh attribution — individual savings attribution
   requires sub-metering (IPMVP) which is not available.
*/
const INITIATIVES = [
  { name: "LED lighting retrofit",  properties: "4 properties", status: "Completed"   },
  { name: "BMS optimisation",       properties: "6 properties", status: "In progress" },
  { name: "Heat pump upgrade",       properties: "2 properties", status: "Completed"   },
];

/* ─── Waterfall tooltip ──────────────────────────────────────────────────────*/
function WfTooltip({ active, payload }: { active?: boolean; payload?: { payload: WfStep }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.type === "base" || d.type === "total") return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2.5 text-[12px] max-w-[200px]">
      <div className="font-semibold text-ink-900 mb-0.5">{d.name}</div>
      <div className="text-ink-500 mb-1 leading-snug">{d.desc}</div>
      <div className={cn("font-semibold", d.type === "up" ? "text-bad" : "text-good")}>
        {d.type === "up" ? `+${d.delta}` : `−${d.delta}`} MWh
      </div>
    </div>
  );
}

/* ─── Intensity tooltip ──────────────────────────────────────────────────────*/
function IntensityTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const ty = payload.find((p) => p.dataKey === "ty");
  const py = payload.find((p) => p.dataKey === "py");
  const diff = ty && py ? ty.value - py.value : null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2.5 text-[12px]">
      <div className="font-semibold text-ink-800 mb-1.5">{label}</div>
      {ty && <div className="flex justify-between gap-4"><span className="text-ink-500">This year</span><span className="font-bold text-ink-900">{ty.value.toFixed(1)} kWh/ORN</span></div>}
      {py && <div className="flex justify-between gap-4"><span className="text-ink-500">Prior year</span><span className="text-ink-400">{py.value.toFixed(1)} kWh/ORN</span></div>}
      {diff !== null && (
        <div className={cn("flex justify-between gap-4 mt-1 pt-1 border-t border-ink-100 font-semibold", diff < 0 ? "text-good" : "text-bad")}>
          <span>Change</span>
          <span>{diff > 0 ? "+" : ""}{diff.toFixed(1)} kWh/ORN</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────*/
export default function EnergyPerformance() {
  const annualAvgTY = parseFloat((INTENSITY.reduce((s, m) => s + m.ty, 0) / INTENSITY.length).toFixed(1));

  return (
    <div className="space-y-5">

      {/* ── Headline tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center shrink-0">
              <TrendingDown size={15} className="text-good" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Genuine saving</span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-good leading-none tabular-nums">440 MWh</div>
          <div className="text-[12px] text-ink-500 mt-0.5">−13.4% after adjusting for external factors</div>
        </div>

        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center shrink-0">
              <DollarSign size={15} className="text-good" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Financial impact</span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-good leading-none tabular-nums">
            ${GENUINE_SAVING_USD.toLocaleString()}
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5">saved · at avg $105 / MWh</div>
        </div>

        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink-100 grid place-items-center shrink-0">
              <TrendingUp size={15} className="text-ink-500" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Adjusted baseline</span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-ink-800 leading-none tabular-nums">3,280 MWh</div>
          <div className="text-[12px] text-ink-500 mt-0.5">what you would have used with no improvement</div>
        </div>
      </div>

      {/* ── Waterfall ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="From last year to this year"
          hint="External factors are modelled from occupancy, climate, and operational data · Net change = combined effect of all management activity"
        />
        <div className="px-6 pb-2 pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={WATERFALL} barCategoryGap="28%">
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[2500, 3400]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                axisLine={false} tickLine={false} width={42}
              />
              <Tooltip content={<WfTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <ReferenceLine
                y={ADJUSTED_BASELINE}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                label={{ value: "Adjusted baseline  3,280", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
              />
              <Bar dataKey="spacer" stackId="wf" fill="transparent" stroke="none" isAnimationActive={false} />
              <Bar dataKey="delta"  stackId="wf" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {WATERFALL.map((entry, i) => (
                  <Cell key={i} fill={BAR_COLOR[entry.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend + methodology note */}
        <div className="px-6 pb-5 space-y-3">
          <div className="flex flex-wrap gap-4 text-[11px] text-ink-500">
            {[
              { color: "#94a3b8", label: "Reference year" },
              { color: "#fb923c", label: "External factor — consumption up" },
              { color: "#7dd3fc", label: "External factor — consumption down" },
              { color: "#16a34a", label: "Net management change" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
          <div className="flex items-start gap-2 bg-ink-50 rounded-xl px-3 py-2.5 text-[11px] text-ink-500 leading-snug">
            <Info size={13} className="shrink-0 mt-0.5 text-ink-400" />
            <span>
              Adjustments are modelled estimates based on available operational data.
              Individual action attribution is not shown — accurately linking specific initiatives to MWh
              savings requires sub-metering and IPMVP-standard M&V, which is not available at portfolio level.
            </span>
          </div>
        </div>
      </Card>

      {/* ── Monthly intensity trend ──────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Monthly intensity — this year vs prior year"
          hint="kWh per occupied room night · both years normalised to the same room-night base"
        />
        <div className="px-6 pb-6 pt-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={INTENSITY}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={[22, 30]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(v) => `${v}`}
                axisLine={false} tickLine={false}
                width={32}
                label={{ value: "kWh/ORN", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 10, fill: "#9ca3af" } }}
              />
              <Tooltip content={<IntensityTooltip />} cursor={{ stroke: "#e5e7eb" }} />
              <ReferenceLine
                y={annualAvgTY}
                stroke="#0F6A3C"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
                label={{ value: `Avg ${annualAvgTY}`, position: "insideTopRight", fontSize: 10, fill: "#0F6A3C" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value) => (
                  <span style={{ color: "#6b7280" }}>
                    {value === "ty" ? "This year" : "Prior year"}
                  </span>
                )}
              />
              <Line
                dataKey="py"
                name="py"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="ty"
                name="ty"
                stroke="#0F6A3C"
                strokeWidth={2.5}
                dot={{ fill: "#0F6A3C", r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Initiatives this period ──────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Initiatives active this period"
          hint={`${INITIATIVES.length} initiatives · combined genuine saving ${GENUINE_SAVING_MWH} MWh · individual attribution not available`}
        />
        <div className="px-6 pb-6 pt-4 space-y-3">
          {INITIATIVES.map((init) => (
            <div
              key={init.name}
              className="flex items-center justify-between gap-4 py-2.5 border-b border-ink-100 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900">{init.name}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{init.properties}</div>
              </div>
              <span className={cn(
                "chip shrink-0 text-[11px] font-semibold",
                init.status === "Completed"
                  ? "bg-good/10 text-good border border-good/20"
                  : "bg-warn/10 text-warn border border-warn/25"
              )}>
                {init.status}
              </span>
            </div>
          ))}

          <div className="pt-1 flex items-center justify-between">
            <p className="text-[11px] text-ink-400 max-w-lg leading-snug">
              Individual MWh attribution per initiative requires sub-metering (IPMVP M&V).
              The 440 MWh saving above is the total residual after accounting for all external factors.
            </p>
            <Link
              to="/actions"
              className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:text-brand-900"
            >
              View in Actions <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Card>

    </div>
  );
}
