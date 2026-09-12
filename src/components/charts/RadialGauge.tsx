/**
 * Radial gauge — one number's progress toward a target, as a 270° arc.
 */
import { CHART } from "@/lib/chartPalette";

export default function RadialGauge({
  value, size = 104, stroke = 10, color = CHART.olive, track = CHART.sage, label, sub, valueText,
}: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; label?: string; sub?: string; valueText?: string;
}) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const sweep = 270;
  const start = 135;
  const pct = Math.max(0, Math.min(100, value));
  const arc = (from: number, to: number) => {
    const a0 = ((from - 90) * Math.PI) / 180, a1 = ((to - 90) * Math.PI) / 180;
    const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
    return `M${x0},${y0} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1},${y1}`;
  };
  return (
    <div className="inline-flex flex-col items-center">
      <svg width={size} height={size} className="block">
        <path d={arc(start, start + sweep)} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round" />
        {pct > 0 && <path d={arc(start, start + (sweep * pct) / 100)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />}
        <text x={c} y={c - 2} textAnchor="middle" dominantBaseline="central" fontSize={size >= 100 ? 20 : 15} fontWeight={700} fill={CHART.label}>{valueText ?? `${Math.round(pct)}%`}</text>
        {sub && <text x={c} y={c + (size >= 100 ? 16 : 12)} textAnchor="middle" fontSize={10} fill={CHART.axis}>{sub}</text>}
      </svg>
      {label && <div className="text-[11px] font-medium text-ink-700 text-center leading-snug -mt-1">{label}</div>}
    </div>
  );
}
