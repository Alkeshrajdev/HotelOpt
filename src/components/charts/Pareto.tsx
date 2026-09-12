/**
 * Pareto — ranked bars with the cumulative share, so "which few make 80%" is visible.
 */
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chartPalette";
import { AXIS_TICK, fmtN, kFmt } from "./ChartBits";

export type ParetoItem = { id: string; label: string; value: number; color?: string };

export default function Pareto({ items, unit = "", height = 240, format = (v: number) => fmtN(v), onSelect, selectedId, threshold = 80 }: {
  items: ParetoItem[]; unit?: string; height?: number; format?: (v: number) => string; onSelect?: (id: string) => void; selectedId?: string | null; threshold?: number;
}) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0) || 1;
  let run = 0;
  const data = sorted.map((i) => { run += i.value; return { ...i, cum: +((run / total) * 100).toFixed(1), share: +((i.value / total) * 100).toFixed(1) }; });
  const short = (s: string) => (s.length > 14 ? `${s.slice(0, 13)}…` : s);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickFormatter={short} axisLine={false} tickLine={false} interval={0} />
        <YAxis yAxisId="v" tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} tickFormatter={kFmt} />
        <YAxis yAxisId="p" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} width={34} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          cursor={{ fill: CHART.grid }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (ParetoItem & { cum: number; share: number }) | undefined;
            if (!active || !p) return null;
            return (
              <div className="popover rounded-xl px-3 py-2 text-[12px] min-w-[160px]">
                <div className="text-[11px] font-semibold text-ink-900 mb-1">{p.label}</div>
                <div className="flex justify-between gap-4"><span className="text-ink-600">Value</span><span className="font-medium tabular-nums">{format(p.value)}{unit ? ` ${unit}` : ""}</span></div>
                <div className="flex justify-between gap-4"><span className="text-ink-600">Share</span><span className="font-medium tabular-nums">{p.share}%</span></div>
                <div className="flex justify-between gap-4"><span className="text-ink-600">Cumulative</span><span className="font-medium tabular-nums">{p.cum}%</span></div>
              </div>
            );
          }}
        />
        <ReferenceLine yAxisId="p" y={threshold} stroke={CHART.reference} strokeDasharray="4 3" label={{ value: `${threshold}%`, position: "insideTopRight", fontSize: 10, fill: CHART.axis }} />
        <Bar yAxisId="v" dataKey="value" name="Value" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={44} onClick={(d) => onSelect?.((d as unknown as ParetoItem).id)} className={onSelect ? "cursor-pointer" : undefined}>
          {data.map((d) => <Cell key={d.id} fill={d.color ?? CHART.olive} fillOpacity={selectedId && selectedId !== d.id ? 0.4 : 1} />)}
        </Bar>
        <Line yAxisId="p" type="monotone" dataKey="cum" name="Cumulative" stroke={CHART.cocoa} strokeWidth={2} dot={{ r: 3, fill: CHART.cocoa }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
