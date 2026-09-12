/**
 * Radar profile — one item's shape across several normalised metrics against a reference.
 * Values are 0–100 where 100 is best, so a bigger shape is always better.
 */
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART } from "@/lib/chartPalette";

export type RadarAxis = { key: string; label: string; value: number; reference?: number; raw?: string; referenceRaw?: string };

export default function RadarProfile({ axes, height = 260, name = "Selected", referenceName = "Portfolio average", compact = false, color = CHART.olive }: {
  axes: RadarAxis[]; height?: number; name?: string; referenceName?: string; compact?: boolean; color?: string;
}) {
  const data = axes.map((a) => ({ ...a }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius={compact ? "78%" : "72%"} margin={compact ? { top: 4, right: 4, bottom: 4, left: 4 } : { top: 12, right: 24, bottom: 12, left: 24 }}>
        <PolarGrid stroke={CHART.grid} />
        <PolarAngleAxis dataKey="label" tick={compact ? false : { fontSize: 10, fill: CHART.axis }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {!compact && (
          <Tooltip
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as RadarAxis | undefined;
              if (!active || !p) return null;
              return (
                <div className="popover rounded-xl px-3 py-2 text-[12px] min-w-[160px]">
                  <div className="text-[11px] font-semibold text-ink-900 mb-1">{p.label}</div>
                  <div className="flex justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-ink-600"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />{name}</span><span className="font-medium tabular-nums">{p.raw ?? `${Math.round(p.value)}`}</span></div>
                  {p.reference !== undefined && <div className="flex justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-ink-600"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART.reference }} />{referenceName}</span><span className="font-medium tabular-nums">{p.referenceRaw ?? `${Math.round(p.reference)}`}</span></div>}
                </div>
              );
            }}
          />
        )}
        {axes.some((a) => a.reference !== undefined) && (
          <Radar name={referenceName} dataKey="reference" stroke={CHART.reference} strokeWidth={1.25} strokeDasharray="4 3" fill={CHART.sage} fillOpacity={0.5} isAnimationActive={false} />
        )}
        <Radar name={name} dataKey="value" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.35} isAnimationActive={false} dot={compact ? false : { r: 2.5, fill: color }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
