/**
 * Slope — every item's value at two points in time as one line each. The eye reads
 * rank changes and crossings that a bar chart hides.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { CHART } from "@/lib/chartPalette";
import { fmtN } from "./ChartBits";

export type SlopeRow = { id: string; label: string; a: number; b: number };

export default function Slope({
  rows, aLabel = "Prior year", bLabel = "This year", height = 320, lowerIsBetter = true, format = (v: number) => fmtN(v, 1), unit = "", onSelect, selectedId,
}: {
  rows: SlopeRow[]; aLabel?: string; bLabel?: string; height?: number; lowerIsBetter?: boolean; format?: (v: number) => string; unit?: string;
  onSelect?: (id: string) => void; selectedId?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => { const w = e[0]?.contentRect.width; if (w) setWidth(Math.max(320, w)); });
    ro.observe(el);
    setWidth(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);
  const all = rows.flatMap((r) => [r.a, r.b]);
  const lo = Math.min(...all), hi = Math.max(...all);
  const padV = (hi - lo) * 0.06 || 1;
  const top = 26, bottom = 14;
  const y = (v: number) => top + ((hi + padV - v) / (hi - lo + padV * 2)) * (height - top - bottom);
  const labelW = 150, valueW = 56;
  const xA = labelW + valueW, xB = width - labelW - valueW;
  // Nudge labels apart when values collide (simple pass, top to bottom).
  const settle = (items: { id: string; y: number }[]) => {
    const sorted = [...items].sort((p, q) => p.y - q.y);
    for (let i = 1; i < sorted.length; i++) if (sorted[i].y - sorted[i - 1].y < 13) sorted[i].y = sorted[i - 1].y + 13;
    return new Map(sorted.map((s) => [s.id, s.y]));
  };
  const la = settle(rows.map((r) => ({ id: r.id, y: y(r.a) })));
  const lb = settle(rows.map((r) => ({ id: r.id, y: y(r.b) })));
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} className="block overflow-visible">
        <text x={xA} y={12} textAnchor="middle" fontSize={11} fontWeight={600} fill={CHART.axis}>{aLabel}</text>
        <text x={xB} y={12} textAnchor="middle" fontSize={11} fontWeight={600} fill={CHART.axis}>{bLabel}</text>
        <line x1={xA} x2={xA} y1={top - 4} y2={height - bottom} stroke={CHART.grid} />
        <line x1={xB} x2={xB} y1={top - 4} y2={height - bottom} stroke={CHART.grid} />
        {rows.map((r) => {
          const improved = lowerIsBetter ? r.b <= r.a : r.b >= r.a;
          const color = improved ? CHART.olive : CHART.rose;
          const dim = selectedId && selectedId !== r.id;
          return (
            <g key={r.id} opacity={dim ? 0.3 : 1} onClick={() => onSelect?.(r.id)} className={onSelect ? "cursor-pointer" : undefined}>
              <line x1={xA} y1={y(r.a)} x2={xB} y2={y(r.b)} stroke={color} strokeWidth={selectedId === r.id ? 3 : 1.75} strokeOpacity={0.85} />
              <circle cx={xA} cy={y(r.a)} r={3.5} fill={CHART.prior} />
              <circle cx={xB} cy={y(r.b)} r={4} fill={color} />
              <text x={xA - 10} y={la.get(r.id)} textAnchor="end" dominantBaseline="central" fontSize={11} fill={CHART.label}>
                <tspan fontWeight={600}>{r.label}</tspan><tspan fill={CHART.axis}>{`  ${format(r.a)}`}</tspan>
              </text>
              <text x={xB + 10} y={lb.get(r.id)} textAnchor="start" dominantBaseline="central" fontSize={11} fill={CHART.label} fontWeight={600}>
                {format(r.b)}{unit ? ` ${unit}` : ""}<tspan fill={color} fontWeight={600}>{`  ${((r.b - r.a) / (r.a || 1) * 100) > 0 ? "+" : ""}${(((r.b - r.a) / (r.a || 1)) * 100).toFixed(1)}%`}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
