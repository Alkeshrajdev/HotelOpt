/**
 * Strip plot — every item as a dot on one axis, against a target and an average.
 * Shows spread and who sits on the wrong side of the line, in one row.
 */
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { fmtN } from "./ChartBits";

export type StripPoint = { id: string; label: string; value: number };

export default function StripPlot({
  points, target, avg, higherIsBetter = false, unit = "", format = (v: number) => fmtN(v, 0), onSelect, selectedId, labelExtremes = true,
}: {
  points: StripPoint[]; target?: number; avg?: number; higherIsBetter?: boolean; unit?: string; format?: (v: number) => string;
  onSelect?: (id: string) => void; selectedId?: string | null; labelExtremes?: boolean;
}) {
  const all = points.map((p) => p.value).concat(target !== undefined ? [target] : [], avg !== undefined ? [avg] : []);
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || 1;
  const min = lo - pad, max = hi + pad;
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const onSide = (v: number) => (target === undefined ? true : higherIsBetter ? v >= target : v <= target);
  const best = higherIsBetter ? sorted[sorted.length - 1] : sorted[0];
  const worst = higherIsBetter ? sorted[0] : sorted[sorted.length - 1];
  return (
    <div>
      <div className="relative h-10">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-ink-200" />
        {target !== undefined && (
          <span className="absolute top-1 bottom-1 w-0.5 rounded-full" style={{ left: `${pos(target)}%`, backgroundColor: CHART.label }} title={`Target ${format(target)}${unit ? ` ${unit}` : ""}`} />
        )}
        {avg !== undefined && (
          <span className="absolute top-2 bottom-2 w-px bg-ink-400" style={{ left: `${pos(avg)}%` }} title={`Average ${format(avg)}${unit ? ` ${unit}` : ""}`} />
        )}
        {sorted.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect?.(p.id)}
            className={cn("absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-white transition-transform hover:scale-125", onSelect ? "cursor-pointer" : "cursor-default")}
            style={{ left: `calc(${pos(p.value)}% - 6px)`, backgroundColor: onSide(p.value) ? CHART.olive : CHART.rose, opacity: selectedId && selectedId !== p.id ? 0.4 : 0.9, zIndex: selectedId === p.id ? 2 : 1 }}
            title={`${p.label}: ${format(p.value)}${unit ? ` ${unit}` : ""}`}
            aria-label={p.label}
          />
        ))}
      </div>
      <div className="relative h-4 text-[10px] text-ink-500 tabular-nums">
        {labelExtremes && best && <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(best.value)}%` }}>{best.label.split(" ")[0]} {format(best.value)}</span>}
        {labelExtremes && worst && worst !== best && <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(worst.value)}%` }}>{worst.label.split(" ")[0]} {format(worst.value)}</span>}
        {target !== undefined && <span className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-ink-900 top-0" style={{ left: `${pos(target)}%`, marginTop: 0 }}>{/* target label sits in the row below to avoid collisions */}</span>}
      </div>
    </div>
  );
}
