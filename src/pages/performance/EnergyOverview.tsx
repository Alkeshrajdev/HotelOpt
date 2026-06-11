import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
} from "recharts";
import { Zap, DollarSign, Leaf, Activity } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/* ─── Monthly data ──────────────────────────────────────────────────────────
   TY = May 2025 – Apr 2026  |  PY = May 2024 – Apr 2025
   Consumption in MWh · cost in $k
   Source split: Grid 64% · Boiler fuel 10% · Kitchen gas 4% ·
                 District cooling 12% · Solar PV 8% · Diesel 2%
*/
const MONTHLY = [
  { month: "May",  ty: 720,  py: 778,  costTY: 335, costPY: 362, grid: 460, boiler:  82, kitchen: 28, distCool:  96, solar: 42, diesel: 12 },
  { month: "Jun",  ty: 840,  py: 906,  costTY: 391, costPY: 422, grid: 538, boiler:  70, kitchen: 33, distCool: 140, solar: 47, diesel: 12 },
  { month: "Jul",  ty: 950,  py:1024,  costTY: 442, costPY: 476, grid: 608, boiler:  56, kitchen: 38, distCool: 160, solar: 76, diesel: 12 },
  { month: "Aug",  ty: 965,  py:1041,  costTY: 449, costPY: 484, grid: 618, boiler:  52, kitchen: 38, distCool: 162, solar: 83, diesel: 12 },
  { month: "Sep",  ty: 870,  py: 938,  costTY: 405, costPY: 436, grid: 556, boiler:  66, kitchen: 33, distCool: 148, solar: 55, diesel: 12 },
  { month: "Oct",  ty: 830,  py: 895,  costTY: 386, costPY: 417, grid: 531, boiler:  80, kitchen: 33, distCool: 120, solar: 54, diesel: 12 },
  { month: "Nov",  ty: 780,  py: 841,  costTY: 363, costPY: 391, grid: 498, boiler:  94, kitchen: 33, distCool:  90, solar: 53, diesel: 12 },
  { month: "Dec",  ty: 805,  py: 868,  costTY: 375, costPY: 404, grid: 515, boiler: 104, kitchen: 42, distCool:  90, solar: 42, diesel: 12 },
  { month: "Jan",  ty: 760,  py: 820,  costTY: 354, costPY: 382, grid: 487, boiler: 100, kitchen: 33, distCool:  82, solar: 46, diesel: 12 },
  { month: "Feb",  ty: 710,  py: 765,  costTY: 330, costPY: 356, grid: 455, boiler:  92, kitchen: 30, distCool:  76, solar: 45, diesel: 12 },
  { month: "Mar",  ty: 795,  py: 857,  costTY: 370, costPY: 399, grid: 509, boiler:  88, kitchen: 33, distCool:  84, solar: 69, diesel: 12 },
  { month: "Apr",  ty: 875,  py: 944,  costTY: 407, costPY: 440, grid: 561, boiler:  76, kitchen: 49, distCool: 140, solar: 37, diesel: 12 },
];

const TOTAL_TY   = MONTHLY.reduce((s, m) => s + m.ty, 0);      // 9,900 MWh
const TOTAL_PY   = MONTHLY.reduce((s, m) => s + m.py, 0);      // 10,677 MWh
const TOTAL_COST = MONTHLY.reduce((s, m) => s + m.costTY, 0);  // ~4,607 $k

/* ─── Source definitions ────────────────────────────────────────────────────*/
type SourceKey = "grid" | "boiler" | "kitchen" | "distCool" | "solar" | "diesel";

const SOURCES: {
  key: SourceKey;
  label: string;
  fullLabel: string;
  color: string;
  lightColor: string;
}[] = [
  { key: "grid",     label: "Grid",          fullLabel: "Grid Electricity",   color: "#0F6A3C", lightColor: "#dcfce7" },
  { key: "boiler",   label: "Boiler fuel",   fullLabel: "Boiler Fuel (Gas)",  color: "#ea580c", lightColor: "#ffedd5" },
  { key: "kitchen",  label: "Kitchen gas",   fullLabel: "Kitchen Gas",        color: "#f59e0b", lightColor: "#fef3c7" },
  { key: "distCool", label: "Dist. cooling", fullLabel: "District Cooling",   color: "#0ea5e9", lightColor: "#e0f2fe" },
  { key: "solar",    label: "Solar PV",      fullLabel: "Solar PV (on-site)", color: "#84cc16", lightColor: "#f0fdf4" },
  { key: "diesel",   label: "Diesel",        fullLabel: "Diesel / Generator", color: "#78716c", lightColor: "#f5f5f4" },
];

/* ─── Custom tooltips ───────────────────────────────────────────────────────*/
function ConsolidatedTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const ty    = payload.find((p) => p.dataKey === "ty");
  const py    = payload.find((p) => p.dataKey === "py");
  const cost  = payload.find((p) => p.dataKey === "costTY");
  const costPY = payload.find((p) => p.dataKey === "costPY");
  const diff  = ty && py ? ty.value - py.value : null;

  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[180px]">
      <div className="font-semibold text-ink-800 mb-2">{label}</div>
      {ty    && <div className="flex justify-between gap-4"><span className="text-ink-500">This year</span><span className="font-bold text-ink-900">{ty.value.toLocaleString()} MWh</span></div>}
      {py    && <div className="flex justify-between gap-4"><span className="text-ink-500">Prior year</span><span className="font-semibold text-ink-400">{py.value.toLocaleString()} MWh</span></div>}
      {diff !== null && (
        <div className={cn("flex justify-between gap-4 mt-1 font-semibold", diff < 0 ? "text-good" : "text-bad")}>
          <span>Change</span>
          <span>{diff < 0 ? "" : "+"}{diff.toLocaleString()} MWh</span>
        </div>
      )}
      {cost  && <div className="flex justify-between gap-4 mt-2 border-t border-ink-100 pt-1.5"><span className="text-ink-500">Cost (TY)</span><span className="font-bold text-amber-600">${cost.value}k</span></div>}
      {costPY && <div className="flex justify-between gap-4"><span className="text-ink-500">Cost (PY)</span><span className="text-ink-400">${costPY.value}k</span></div>}
    </div>
  );
}

function SourceTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const ty = payload.find((p) => p.dataKey === "ty");
  const py = payload.find((p) => p.dataKey === "py");
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2.5 text-[12px]">
      <div className="font-semibold text-ink-800 mb-1">{label}</div>
      {ty && <div className="flex justify-between gap-4"><span className="text-ink-500">This year</span><span className="font-bold">{ty.value} MWh</span></div>}
      {py && <div className="flex justify-between gap-4"><span className="text-ink-500">Prior year</span><span className="text-ink-400">{py.value} MWh</span></div>}
    </div>
  );
}

/* ─── Small source chart ────────────────────────────────────────────────────*/
function SourceChart({
  source,
  data,
}: {
  source: typeof SOURCES[number];
  data: typeof MONTHLY;
}) {
  const annualTY = data.reduce((s, m) => s + (m[source.key] as number), 0);
  const annualPY = data.reduce((s, m) => {
    // Approximate PY per source = PY total × (source share from TY)
    const share = (m[source.key] as number) / m.ty;
    return s + Math.round(m.py * share);
  }, 0);
  const yoy = ((annualTY - annualPY) / annualPY) * 100;

  const chartData = data.map((m) => ({
    month: m.month,
    ty: m[source.key] as number,
    py: Math.round(m.py * ((m[source.key] as number) / m.ty)),
  }));

  return (
    <div className="card p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] font-semibold text-ink-700">{source.fullLabel}</div>
          <div className="text-[1.5rem] font-extrabold tabular-nums text-ink-900 leading-tight mt-0.5">
            {annualTY.toLocaleString()}
            <span className="text-[11px] font-semibold text-ink-400 ml-1">MWh</span>
          </div>
        </div>
        <span
          className={cn(
            "chip text-[11px] font-semibold mt-0.5",
            yoy < 0 ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
          )}
        >
          {yoy < 0 ? "" : "+"}{yoy.toFixed(1)}%
        </span>
      </div>

      {/* Mini chart */}
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={chartData} barGap={1} barCategoryGap="30%">
          <XAxis
            dataKey="month"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip content={<SourceTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="py" fill="#e5e7eb" radius={[2, 2, 0, 0]} isAnimationActive={false} name="Prior year" />
          <Bar dataKey="ty" fill={source.color} radius={[2, 2, 0, 0]} isAnimationActive={false} name="This year" />
        </BarChart>
      </ResponsiveContainer>

      <div className="text-[10px] text-ink-400 flex gap-3 -mt-1">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: source.color }} />This year</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-ink-200" />Prior year</span>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────────*/
export default function EnergyOverview() {
  const [showCost, setShowCost] = useState(true);

  const yoyPct = ((TOTAL_TY - TOTAL_PY) / TOTAL_PY) * 100;
  const costYoY = ((TOTAL_COST - MONTHLY.reduce((s, m) => s + m.costPY, 0)) /
    MONTHLY.reduce((s, m) => s + m.costPY, 0)) * 100;

  return (
    <div className="space-y-5">

      {/* ── KPI tiles ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={<Zap size={18} />}
          iconBg="bg-pillar-energy/10 text-pillar-energy"
          label="Total consumption"
          value={TOTAL_TY.toLocaleString()}
          unit="MWh"
          delta={parseFloat(yoyPct.toFixed(1))}
          goodDirection="down"
        />
        <KpiTile
          icon={<Activity size={18} />}
          iconBg="bg-warn/10 text-warn"
          label="Energy intensity"
          value="24.0"
          unit="kWh / ORN"
          delta={-6.0}
          goodDirection="down"
        />
        <KpiTile
          icon={<DollarSign size={18} />}
          iconBg="bg-pillar-energy/10 text-pillar-energy"
          label="Energy cost"
          value="$4.6M"
          delta={parseFloat(costYoY.toFixed(1))}
          goodDirection="down"
        />
        <KpiTile
          icon={<Leaf size={18} />}
          iconBg="bg-brand-50 text-brand-700"
          label="Renewable share"
          value="12"
          unit="%"
          delta={3.0}
          goodDirection="up"
        />
      </div>

      {/* ── Consolidated monthly chart ──────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Monthly consumption & cost — this year vs prior year"
          hint="Bars = MWh consumed (left axis) · Lines = energy cost in $k (right axis)"
          right={
            <button
              onClick={() => setShowCost((v) => !v)}
              className={cn(
                "text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors",
                showCost
                  ? "bg-amber-100 text-amber-700"
                  : "bg-ink-100 text-ink-500 hover:bg-ink-200"
              )}
            >
              {showCost ? "Hide cost" : "Show cost"}
            </button>
          }
        />
        <div className="px-6 pb-6 pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={MONTHLY} barGap={2} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              {/* Left axis — MWh */}
              <YAxis
                yAxisId="mwh"
                orientation="left"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(v) => `${v}`}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={[0, 1200]}
                label={{ value: "MWh", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 10, fill: "#9ca3af" } }}
              />
              {/* Right axis — $k */}
              {showCost && (
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#b45309" }}
                  tickFormatter={(v) => `$${v}k`}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  domain={[0, 560]}
                />
              )}
              <Tooltip content={<ConsolidatedTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              {/* TY bar */}
              <Bar yAxisId="mwh" dataKey="ty" name="This year" fill="#0F6A3C" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              {/* PY bar */}
              <Bar yAxisId="mwh" dataKey="py" name="Prior year" fill="#cbd5e1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              {/* Cost lines */}
              {showCost && (
                <Line
                  yAxisId="cost"
                  dataKey="costTY"
                  name="Cost (this year)"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {showCost && (
                <Line
                  yAxisId="cost"
                  dataKey="costPY"
                  name="Cost (prior year)"
                  stroke="#fcd34d"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value) => (
                  <span style={{ color: "#6b7280" }}>{value}</span>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Annual summary row */}
        <div className="border-t border-ink-100 px-6 py-3 flex flex-wrap gap-6 text-[12px]">
          <div>
            <span className="text-ink-500">This year total  </span>
            <span className="font-bold text-ink-900">{TOTAL_TY.toLocaleString()} MWh</span>
          </div>
          <div>
            <span className="text-ink-500">Prior year total  </span>
            <span className="font-semibold text-ink-400">{TOTAL_PY.toLocaleString()} MWh</span>
          </div>
          <div>
            <span className="text-ink-500">Change  </span>
            <span className={cn("font-bold", yoyPct < 0 ? "text-good" : "text-bad")}>
              {yoyPct.toFixed(1)}%  ·  {(TOTAL_TY - TOTAL_PY).toLocaleString()} MWh
            </span>
          </div>
          <div>
            <span className="text-ink-500">Cost saving  </span>
            <span className="font-bold text-good">
              ${Math.abs(MONTHLY.reduce((s, m) => s + m.costTY, 0) - MONTHLY.reduce((s, m) => s + m.costPY, 0)).toLocaleString()}k
            </span>
          </div>
        </div>
      </Card>

      {/* ── Per-source charts ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-[13px] font-semibold text-ink-700 mb-3">
          Consumption by energy source
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {SOURCES.map((s) => (
            <SourceChart key={s.key} source={s} data={MONTHLY} />
          ))}
        </div>
      </div>

    </div>
  );
}
