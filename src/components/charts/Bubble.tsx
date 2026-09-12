/**
 * Bubble — three variables per item (x, y, size), with the portfolio averages as
 * quadrant lines. Used for hotels: intensity vs intensity, sized by rooms or volume.
 */
import { CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { CHART } from "@/lib/chartPalette";
import { AXIS_TICK, fmtN } from "./ChartBits";

export type BubblePoint = { id: string; label: string; x: number; y: number; z: number; color?: string; note?: string };

export default function Bubble({
  data, xLabel, yLabel, zLabel, xUnit = "", yUnit = "", zUnit = "", height = 300, xAvg, yAvg, onSelect, selectedId, xFormat, yFormat, zFormat, sizeRange = [80, 1100],
}: {
  data: BubblePoint[]; xLabel: string; yLabel: string; zLabel: string; xUnit?: string; yUnit?: string; zUnit?: string; height?: number;
  xAvg?: number; yAvg?: number; onSelect?: (id: string) => void; selectedId?: string | null;
  xFormat?: (v: number) => string; yFormat?: (v: number) => string; zFormat?: (v: number) => string; sizeRange?: [number, number];
}) {
  const fx = xFormat ?? ((v: number) => fmtN(v, 1));
  const fy = yFormat ?? ((v: number) => fmtN(v, 1));
  const fz = zFormat ?? ((v: number) => fmtN(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} />
        <XAxis type="number" dataKey="x" name={xLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} domain={["auto", "auto"]}
          label={{ value: `${xLabel}${xUnit ? ` (${xUnit})` : ""}`, position: "insideBottom", offset: -4, fontSize: 10, fill: CHART.axis }} />
        <YAxis type="number" dataKey="y" name={yLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} domain={["auto", "auto"]}
          label={{ value: `${yLabel}${yUnit ? ` (${yUnit})` : ""}`, angle: -90, position: "insideLeft", offset: 12, fontSize: 10, fill: CHART.axis }} />
        <ZAxis type="number" dataKey="z" range={sizeRange} name={zLabel} />
        {xAvg !== undefined && <ReferenceLine x={xAvg} stroke={CHART.reference} strokeDasharray="4 3" label={{ value: "avg", position: "top", fontSize: 10, fill: CHART.axis }} />}
        {yAvg !== undefined && <ReferenceLine y={yAvg} stroke={CHART.reference} strokeDasharray="4 3" label={{ value: "avg", position: "insideRight", fontSize: 10, fill: CHART.axis }} />}
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: CHART.reference }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as BubblePoint | undefined;
            if (!active || !p) return null;
            return (
              <div className="popover rounded-xl px-3 py-2 text-[12px] min-w-[170px]">
                <div className="text-[11px] font-semibold text-ink-900 mb-1 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color ?? CHART.olive }} />{p.label}</div>
                <div className="flex justify-between gap-4"><span className="text-ink-600">{xLabel}</span><span className="font-medium tabular-nums">{fx(p.x)}{xUnit ? ` ${xUnit}` : ""}</span></div>
                <div className="flex justify-between gap-4"><span className="text-ink-600">{yLabel}</span><span className="font-medium tabular-nums">{fy(p.y)}{yUnit ? ` ${yUnit}` : ""}</span></div>
                <div className="flex justify-between gap-4"><span className="text-ink-600">{zLabel}</span><span className="font-medium tabular-nums">{fz(p.z)}{zUnit ? ` ${zUnit}` : ""}</span></div>
                {p.note && <div className="text-[10px] text-ink-400 mt-1">{p.note}</div>}
              </div>
            );
          }}
        />
        <Scatter data={data} isAnimationActive={false} onClick={(d) => onSelect?.((d as unknown as { payload?: BubblePoint }).payload?.id ?? (d as unknown as BubblePoint).id)} className={onSelect ? "cursor-pointer" : undefined}>
          {data.map((p) => (
            <Cell key={p.id} fill={p.color ?? CHART.olive} fillOpacity={selectedId && selectedId !== p.id ? 0.35 : 0.8} stroke={selectedId === p.id ? CHART.label : "#fff"} strokeWidth={selectedId === p.id ? 2 : 1} />
          ))}
          <LabelList dataKey="label" position="top" offset={6} style={{ fontSize: 10, fill: CHART.label, fontWeight: 600 }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
