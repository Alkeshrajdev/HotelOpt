/**
 * Shared chart furniture — one tooltip, one legend, one set of formatters — so every
 * chart in the product reads the same way. Colours come from the chart palette only.
 */
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";

export const AXIS_TICK = { fontSize: 10, fill: CHART.axis } as const;
export const LABEL_TICK = { fontSize: 11, fill: CHART.label } as const;

export const kFmt = (v: number) =>
  Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));
export const fmtN = (v: number, digits = 0) => v.toLocaleString("en-US", { maximumFractionDigits: digits });
export const pctFmt = (v: number, digits = 1) => `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

type TipItem = { name?: string; value?: number | string; color?: string; dataKey?: string; payload?: Record<string, unknown> };

/** Recharts tooltip content: label on top, one dotted row per series, palette colours. */
export function ChartTip({ active, payload, label, unit = "", format, hide = [] }: {
  active?: boolean; payload?: TipItem[]; label?: string; unit?: string; format?: (v: number) => string; hide?: string[];
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value !== null && p.value !== undefined && !String(p.name ?? "").startsWith("_") && !hide.includes(String(p.dataKey)));
  if (!items.length) return null;
  return (
    <div className="popover rounded-xl px-3 py-2 text-[12px] min-w-[150px]">
      {label && <div className="text-[11px] font-semibold text-ink-900 mb-1">{label}</div>}
      {items.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="inline-flex items-center gap-1.5 text-ink-600"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />{p.name}</span>
          <span className="font-medium text-ink-900 tabular-nums">{typeof p.value === "number" ? (format ? format(p.value) : fmtN(p.value, 1)) : p.value}{unit ? ` ${unit}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

export function Swatch({ color, className, label, dashed = false, ring = false }: { color?: string; className?: string; label: string; dashed?: boolean; ring?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-600 whitespace-nowrap">
      {dashed
        ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: color }} />
        : <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", className, ring && "ring-2 ring-inset")} style={color ? (ring ? { boxShadow: `inset 0 0 0 2px ${color}` } : { backgroundColor: color }) : undefined} />}
      {label}
    </span>
  );
}

export function LegendRow({ items, className }: { items: { label: string; color?: string; className?: string; dashed?: boolean }[]; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 flex-wrap", className)}>
      {items.map((it) => <Swatch key={it.label} {...it} />)}
    </div>
  );
}

/** Nice axis bounds around a data range so deltas stay readable (used by bridges and dumbbells). */
export function niceDomain(lowest: number, highest: number, padLow = 0.9, padHigh = 1.04): [number, number] {
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(1, (highest - lowest * padLow) / 4))));
  return [Math.floor((lowest * padLow) / step) * step, Math.ceil((highest * padHigh) / step) * step];
}
