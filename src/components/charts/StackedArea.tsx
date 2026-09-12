/**
 * Stacked area — composition over time, with an optional prior-year line and target line.
 */
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chartPalette";
import { AXIS_TICK, ChartTip, kFmt } from "./ChartBits";

export type AreaSeries = { key: string; name: string; color: string };

export default function StackedArea({
  data, xKey, series, height = 260, unit = "", format, priorKey, priorName = "Prior year", targetKey, targetName = "Target", yFormat = kFmt, yDomain,
}: {
  data: Record<string, number | string>[]; xKey: string; series: AreaSeries[]; height?: number; unit?: string; format?: (v: number) => string;
  priorKey?: string; priorName?: string; targetKey?: string; targetName?: string; yFormat?: (v: number) => string; yDomain?: [number | "auto", number | "auto"];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} tickFormatter={yFormat} domain={yDomain} />
        <Tooltip content={<ChartTip unit={unit} format={format} />} cursor={{ stroke: CHART.reference, strokeDasharray: "3 3" }} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stackId="a" stroke={s.color} strokeWidth={1.25} fill={s.color} fillOpacity={0.75} isAnimationActive={false} />
        ))}
        {priorKey && <Line type="monotone" dataKey={priorKey} name={priorName} stroke={CHART.reference} strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />}
        {targetKey && <Line type="monotone" dataKey={targetKey} name={targetName} stroke={CHART.label} strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
