import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";

/* ─── Waterfall data ─────────────────────────────────────────────────────────
   Each step tracks:
   - spacer: transparent portion (positions the visible bar at the right height)
   - delta:  visible portion
   - type:   controls colour
   - label:  displayed above/below the bar
   - desc:   short explanation for the factor
*/
type WfStep = {
  name: string;
  spacer: number;
  delta: number;
  type: "base" | "up" | "down-neutral" | "down-good" | "total";
  label: string;
  desc: string;
};

// Running totals (MWh):
// Last year:  3,094
// + Occupancy:  +148  → 3,242
// + Weather:     −52  → 3,190
// + Events:      +90  → 3,280   ← adjusted baseline
// + Actions:    −440  → 2,840   ← actual this year
const WATERFALL: WfStep[] = [
  {
    name: "Last year",
    spacer: 0, delta: 3094,
    type: "base",
    label: "3,094 MWh",
    desc: "Actual consumption last period",
  },
  {
    name: "Occupancy",
    spacer: 3094, delta: 148,
    type: "up",
    label: "+148",
    desc: "Higher occupancy required more energy",
  },
  {
    name: "Weather",
    spacer: 3190, delta: 52,     // bar spans 3190 → 3242 (down step)
    type: "down-neutral",
    label: "−52",
    desc: "Cooler year reduced cooling load",
  },
  {
    name: "Events",
    spacer: 3190, delta: 90,
    type: "up",
    label: "+90",
    desc: "Larger conference & banqueting calendar",
  },
  {
    name: "Your actions",
    spacer: 2840, delta: 440,    // bar spans 2840 → 3280 (down step)
    type: "down-good",
    label: "−440",
    desc: "LED, BMS optimisation, heat pump",
  },
  {
    name: "This year",
    spacer: 0, delta: 2840,
    type: "total",
    label: "2,840 MWh",
    desc: "Actual consumption this period",
  },
];

const BAR_COLOR: Record<WfStep["type"], string> = {
  base:         "#94a3b8",   // slate — reference
  up:           "#fb923c",   // orange — external factor, consumption up
  "down-neutral": "#7dd3fc", // sky   — external factor, consumption down (lucky)
  "down-good":  "#16a34a",   // green — management action
  total:        "#0F6A3C",   // brand
};

/* Adjusted baseline = 3,280 (after external adjustments, before actions) */
const ADJUSTED_BASELINE = 3280;
const GENUINE_SAVING_MWH = 440;
const COST_PER_MWH = 105; // USD
const GENUINE_SAVING_USD = GENUINE_SAVING_MWH * COST_PER_MWH; // $46,200

/* ─── Management actions breakdown ──────────────────────────────────────────*/
const ACTIONS = [
  { action: "LED lighting retrofit",  mwh: 180, properties: "4 properties" },
  { action: "BMS optimisation",       mwh: 145, properties: "6 properties" },
  { action: "Heat pump upgrade",      mwh: 115, properties: "2 properties" },
];

/* ─── Custom tooltip ─────────────────────────────────────────────────────────*/
function WfTooltip({ active, payload }: { active?: boolean; payload?: { payload: WfStep }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.type === "base" || d.type === "total") return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2.5 text-[12px]">
      <div className="font-semibold text-ink-900 mb-0.5">{d.name}</div>
      <div className="text-ink-500 mb-1">{d.desc}</div>
      <div className={d.type === "up" ? "text-bad font-semibold" : "text-good font-semibold"}>
        {d.type === "up" ? `+${d.delta}` : `−${d.delta}`} MWh
      </div>
    </div>
  );
}

export default function EnergyPerformance() {
  return (
    <div className="space-y-5">

      {/* ── Headline summary ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center">
              <TrendingDown size={15} className="text-good" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Genuine saving
            </span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-good leading-none tabular-nums">
            440 MWh
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            −13.4% after all adjustments
          </div>
        </div>

        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center">
              <DollarSign size={15} className="text-good" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Financial impact
            </span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-good leading-none tabular-nums">
            $46,200
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            saved · at avg $105 / MWh
          </div>
        </div>

        <div className="card p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink-100 grid place-items-center">
              <TrendingUp size={15} className="text-ink-500" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Without your actions
            </span>
          </div>
          <div className="mt-2 text-[2rem] font-extrabold text-ink-800 leading-none tabular-nums">
            3,280 MWh
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            adjusted baseline — what you would have used
          </div>
        </div>
      </div>

      {/* ── Waterfall chart ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="From last year to this year"
          hint="What was outside your control vs what your team actually changed"
        />
        <div className="px-6 pb-2">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={WATERFALL} barCategoryGap="28%">
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[2500, 3400]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<WfTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              {/* Adjusted baseline reference line */}
              <ReferenceLine
                y={ADJUSTED_BASELINE}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                label={{ value: "Adjusted baseline 3,280", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
              />
              {/* Invisible spacer — positions the real bar */}
              <Bar dataKey="spacer" stackId="wf" fill="transparent" stroke="none" isAnimationActive={false} />
              {/* Visible delta bar */}
              <Bar dataKey="delta" stackId="wf" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {WATERFALL.map((entry, i) => (
                  <Cell key={i} fill={BAR_COLOR[entry.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-6 pb-5 text-[11px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#94a3b8" }} />
            Reference year
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#fb923c" }} />
            External factor — consumption up
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#7dd3fc" }} />
            External factor — consumption down
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#16a34a" }} />
            Your management actions
          </span>
        </div>
      </Card>

      {/* ── Actions breakdown ────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="What drove the saving"
          hint={`${GENUINE_SAVING_MWH} MWh · $${GENUINE_SAVING_USD.toLocaleString()} total`}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Action</th>
                <th className="table-th">Saving</th>
                <th className="table-th">$ Value</th>
                <th className="table-th">Share</th>
                <th className="table-th">Properties</th>
              </tr>
            </thead>
            <tbody>
              {ACTIONS.map((a) => {
                const pct = Math.round((a.mwh / GENUINE_SAVING_MWH) * 100);
                const dollars = a.mwh * COST_PER_MWH;
                return (
                  <tr key={a.action} className="hover:bg-ink-50/50">
                    <td className="table-td font-medium text-ink-900">{a.action}</td>
                    <td className="table-td">
                      <span className="font-semibold text-good">−{a.mwh} MWh</span>
                    </td>
                    <td className="table-td text-good font-semibold">
                      ${dollars.toLocaleString()}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-ink-100 min-w-[60px]">
                          <div
                            className="h-full rounded-full bg-good"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-ink-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="table-td text-ink-500">{a.properties}</td>
                  </tr>
                );
              })}
              <tr className="bg-ink-50 font-semibold">
                <td className="table-td text-ink-900">Total</td>
                <td className="table-td text-good">−{GENUINE_SAVING_MWH} MWh</td>
                <td className="table-td text-good">${GENUINE_SAVING_USD.toLocaleString()}</td>
                <td className="table-td text-ink-500">100%</td>
                <td className="table-td" />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
