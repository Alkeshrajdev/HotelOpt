/**
 * Heatmap — a matrix (rows × columns) coloured on one ramp, values shown in the cells.
 */
import { CHART, CHART_RAMP } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { fmtN } from "./ChartBits";

export default function Heatmap({
  rows, cols, values, format = (v: number) => fmtN(v), unit = "", ramp = CHART_RAMP.olive, lowIsGood = true, rowWidth = 150, onRowClick, selectedRow, rowTotals,
}: {
  rows: string[]; cols: string[]; values: number[][]; format?: (v: number) => string; unit?: string; ramp?: readonly string[];
  lowIsGood?: boolean; rowWidth?: number; onRowClick?: (row: string) => void; selectedRow?: string | null; rowTotals?: number[];
}) {
  const flat = values.flat();
  const lo = Math.min(...flat), hi = Math.max(...flat);
  const steps = ramp.slice(0, 5); // light → mid; the deepest steps can't carry 10px text
  const colorFor = (v: number) => {
    const t = hi === lo ? 0 : (v - lo) / (hi - lo);
    const idx = Math.min(steps.length - 1, Math.floor((lowIsGood ? t : 1 - t) * steps.length));
    return steps[idx];
  };
  const textFor = (v: number) => {
    const t = hi === lo ? 0 : (v - lo) / (hi - lo);
    const strong = (lowIsGood ? t : 1 - t) >= 0.6;
    return strong ? "#fff" : CHART.label;
  };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid items-center gap-1 mb-1" style={{ gridTemplateColumns: `${rowWidth}px repeat(${cols.length}, minmax(0, 1fr))${rowTotals ? " 64px" : ""}` }}>
          <span />
          {cols.map((c) => <span key={c} className="text-[10px] font-semibold text-ink-400 text-center">{c}</span>)}
          {rowTotals && <span className="text-[10px] font-semibold text-ink-400 text-right">Year</span>}
        </div>
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div
              key={r}
              onClick={() => onRowClick?.(r)}
              className={cn("grid items-center gap-1 rounded-lg", onRowClick && "cursor-pointer hover:bg-ink-50/70", selectedRow === r && "bg-ink-50")}
              style={{ gridTemplateColumns: `${rowWidth}px repeat(${cols.length}, minmax(0, 1fr))${rowTotals ? " 64px" : ""}` }}
            >
              <span className="text-[12px] font-medium text-ink-900 truncate pr-2">{r}</span>
              {values[i].map((v, j) => (
                <span key={j} className="h-7 rounded-md grid place-items-center text-[10px] font-semibold tabular-nums" style={{ backgroundColor: colorFor(v), color: textFor(v) }} title={`${r} · ${cols[j]}: ${format(v)}${unit ? ` ${unit}` : ""}`}>
                  {format(v)}
                </span>
              ))}
              {rowTotals && <span className="text-[11px] font-semibold text-ink-900 tabular-nums text-right">{format(rowTotals[i])}</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-2 text-[10px] text-ink-400">
          <span>{lowIsGood ? "low" : "high"}</span>
          <span className="flex gap-px">{steps.map((s) => <span key={s} className="w-5 h-2 first:rounded-l-full last:rounded-r-full" style={{ backgroundColor: s }} />)}</span>
          <span>{lowIsGood ? "high" : "low"}</span>
        </div>
      </div>
    </div>
  );
}
