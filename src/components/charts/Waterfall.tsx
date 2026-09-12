/**
 * Waterfall — how one total became another: totals as full bars, steps as floating deltas.
 */
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chartPalette";
import { AXIS_TICK, fmtN, kFmt, niceDomain } from "./ChartBits";

export type WaterfallStep = { name: string; total?: number; delta?: number; good?: boolean };

const FILL = { total: CHART.prior, up: CHART.rose, down: CHART.olive, neutral: CHART.mauve } as const;

export default function Waterfall({ steps, height = 240, unit = "", format = (v: number) => fmtN(v), decreaseIsGood = true, yFormat = kFmt, fromZero = false }: {
  steps: WaterfallStep[]; height?: number; unit?: string; format?: (v: number) => string; decreaseIsGood?: boolean; yFormat?: (v: number) => string; fromZero?: boolean;
}) {
  const rows = useMemo(() => {
    let run = 0;
    return steps.map((s) => {
      if (s.total !== undefined) { run = s.total; return { name: s.name, base: 0, value: s.total, kind: "total" as const, label: format(s.total), signed: s.total }; }
      const d = s.delta ?? 0;
      const goodDir = s.good !== undefined ? s.good : decreaseIsGood ? d <= 0 : d >= 0;
      const row = { name: s.name, base: Math.min(run, run + d), value: Math.abs(d), kind: (d === 0 ? "neutral" : goodDir ? "down" : "up") as keyof typeof FILL, label: `${d > 0 ? "+" : d < 0 ? "−" : ""}${format(Math.abs(d))}`, signed: d };
      run += d;
      return row;
    });
  }, [steps, format, decreaseIsGood]);
  const lows = rows.map((r) => (r.kind === "total" ? r.value : r.base));
  const highs = rows.map((r) => r.base + r.value);
  const domain = fromZero ? ([0, Math.ceil(Math.max(...highs) * 1.06)] as [number, number]) : niceDomain(Math.min(...lows), Math.max(...highs));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
        <YAxis domain={domain} allowDataOverflow tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} tickFormatter={yFormat} />
        <Tooltip
          cursor={{ fill: CHART.grid }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (typeof rows)[number] | undefined;
            if (!active || !p) return null;
            return (
              <div className="popover rounded-xl px-3 py-2 text-[12px]">
                <div className="text-[11px] font-semibold text-ink-900">{p.name}</div>
                <div className="tabular-nums text-ink-700">{p.label}{unit ? ` ${unit}` : ""}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="base" name="_base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" name="Value" stackId="w" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {rows.map((r, i) => <Cell key={i} fill={FILL[r.kind]} />)}
          <LabelList dataKey="label" position="top" style={{ fontSize: 10, fill: CHART.label, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
