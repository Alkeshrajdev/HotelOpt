import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { DollarSign, TrendingDown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/* ─── Peer data ──────────────────────────────────────────────────────────── */
type Peer = {
  name:        string;
  intensity:   number;   // kWh/ORN
  perM2:       number;   // kWh/m²
  costPerOrn:  number;   // USD/ORN
  renewable:   number;   // %
  isYou:       boolean;
};

const PEERS: Peer[] = [
  { name: "You",    intensity: 24.0, perM2: 112, costPerOrn: 3.20, renewable: 12, isYou: true  },
  { name: "Peer A", intensity: 19.2, perM2:  89, costPerOrn: 2.58, renewable: 22, isYou: false },
  { name: "Peer B", intensity: 21.8, perM2:  98, costPerOrn: 2.91, renewable: 16, isYou: false },
  { name: "Peer C", intensity: 26.4, perM2: 124, costPerOrn: 3.42, renewable:  9, isYou: false },
];

/* ─── Savings vs best peer ───────────────────────────────────────────────── */
const YOUR_MWH      = 9900;
const YOUR_INT      = 24.0;
const ORN_COUNT     = Math.round((YOUR_MWH * 1000) / YOUR_INT);
const BEST_PEER     = PEERS.filter((p) => !p.isYou).reduce((a, b) => a.intensity < b.intensity ? a : b);
const SAVING_MWH    = Math.round(((YOUR_INT - BEST_PEER.intensity) / YOUR_INT) * YOUR_MWH);
const SAVING_USD    = Math.round(SAVING_MWH * 105);

/* ─── Metric chart configs ───────────────────────────────────────────────── */
type MetricConfig = {
  key:          keyof Omit<Peer, "name" | "isYou">;
  label:        string;
  unit:         string;
  lowerIsBetter: boolean;
  format:       (v: number) => string;
};

const METRIC_CONFIGS: MetricConfig[] = [
  { key: "intensity",  label: "Energy intensity",  unit: "kWh / ORN", lowerIsBetter: true,  format: (v) => v.toFixed(1) },
  { key: "perM2",      label: "Energy / area",     unit: "kWh / m²",  lowerIsBetter: true,  format: (v) => v.toFixed(0) },
  { key: "costPerOrn", label: "Cost per room night",unit: "USD / ORN", lowerIsBetter: true,  format: (v) => `$${v.toFixed(2)}` },
  { key: "renewable",  label: "Renewable share",   unit: "%",          lowerIsBetter: false, format: (v) => `${v}%` },
];

/* ─── Bar tooltip ────────────────────────────────────────────────────────── */
function BarTip({ active, payload, label, format }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <span className="font-semibold text-ink-800">{label}</span>
      <span className="ml-2 font-bold text-ink-900">{format(payload[0].value)}</span>
    </div>
  );
}

/* ─── Single metric chart card ───────────────────────────────────────────── */
function MetricChart({ metric }: { metric: MetricConfig }) {
  // Sort best → worst so best is always at top
  const data = [...PEERS]
    .sort((a, b) =>
      metric.lowerIsBetter
        ? (a[metric.key] as number) - (b[metric.key] as number)
        : (b[metric.key] as number) - (a[metric.key] as number)
    )
    .map((p) => ({ name: p.name, value: p[metric.key] as number, isYou: p.isYou }));

  const bestVal = data[0].value;
  const maxVal  = metric.lowerIsBetter
    ? Math.max(...data.map((d) => d.value)) * 1.12
    : 100;
  const domain: [number, number] = metric.lowerIsBetter ? [0, maxVal] : [0, maxVal];

  return (
    <Card>
      <div className="px-5 pt-5 pb-1">
        <div className="text-[13px] font-semibold text-ink-900">{metric.label}</div>
        <div className="text-[11px] text-ink-400">{metric.unit}</div>
      </div>
      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart layout="vertical" data={data} barCategoryGap="22%">
            <XAxis
              type="number"
              domain={domain}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={metric.format}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={({ x, y, payload }) => (
                <text
                  x={x - 4} y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={payload.value === "You" ? 700 : 400}
                  fill={payload.value === "You" ? "#0F6A3C" : "#6b7280"}
                >
                  {payload.value}
                </text>
              )}
              width={46}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<BarTip format={metric.format} />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
            {/* Reference line at best peer value */}
            <ReferenceLine
              x={bestVal}
              stroke="#16a34a"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isYou ? "#0F6A3C" : "#e2e8f0"}
                />
              ))}
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
export default function EnergyBenchmarks() {
  const youRank = [...PEERS]
    .sort((a, b) => a.intensity - b.intensity)
    .findIndex((p) => p.isYou) + 1;

  return (
    <div className="space-y-5">

      {/* ── Savings callout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-brand-600">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center shrink-0">
              <TrendingDown size={15} className="text-brand-700" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Opportunity vs best peer</span>
          </div>
          <div className="text-[2rem] font-extrabold text-brand-700 leading-none tabular-nums">{SAVING_MWH.toLocaleString()} MWh</div>
          <div className="text-[12px] text-ink-500 mt-0.5">if you matched {BEST_PEER.name} ({BEST_PEER.intensity} kWh/ORN)</div>
        </div>

        <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-good">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center shrink-0">
              <DollarSign size={15} className="text-good" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Value of the gap</span>
          </div>
          <div className="text-[2rem] font-extrabold text-good leading-none tabular-nums">${SAVING_USD.toLocaleString()}</div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            per year · you rank {youRank} of {PEERS.length} on intensity
          </div>
        </div>
      </div>

      {/* ── Metric charts ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {METRIC_CONFIGS.map((m) => (
          <MetricChart key={m.key} metric={m} />
        ))}
      </div>

      <p className="text-[11px] text-ink-400">
        Peers are anonymised same-type hotels · no adjustments applied · raw operational data only
      </p>

    </div>
  );
}
