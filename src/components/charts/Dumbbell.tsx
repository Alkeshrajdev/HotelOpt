/**
 * Dumbbell — two values per row on one scale (prior year → this year), the gap drawn
 * as a bar so direction and size of change read at a glance.
 */
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { fmtN } from "./ChartBits";

export type DumbbellRow = { id: string; label: string; a: number; b: number; note?: string };

export default function Dumbbell({
  rows, aLabel = "Prior year", bLabel = "This year", unit = "", lowerIsBetter = true, format = (v: number) => fmtN(v, 1), avg, onSelect, selectedId, labelWidth = 168,
}: {
  rows: DumbbellRow[]; aLabel?: string; bLabel?: string; unit?: string; lowerIsBetter?: boolean; format?: (v: number) => string;
  avg?: number; onSelect?: (id: string) => void; selectedId?: string | null; labelWidth?: number;
}) {
  const all = rows.flatMap((r) => [r.a, r.b]).concat(avg !== undefined ? [avg] : []);
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  const min = lo - pad, max = hi + pad;
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center gap-4 text-[11px] text-ink-600 mb-2" style={{ paddingLeft: labelWidth }}>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART.prior }} />{aLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART.olive }} />{bLabel} · improved</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART.rose }} />{bLabel} · worsened</span>
        {avg !== undefined && <span className="inline-flex items-center gap-1.5"><span className="w-px h-3 bg-ink-500" />avg {format(avg)}</span>}
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const improved = lowerIsBetter ? r.b <= r.a : r.b >= r.a;
          const color = improved ? CHART.olive : CHART.rose;
          const delta = r.a ? ((r.b - r.a) / r.a) * 100 : 0;
          const row = (
            <div className="grid items-center gap-3" style={{ gridTemplateColumns: `${labelWidth}px 1fr 64px` }}>
              <span className="text-[12px] font-medium text-ink-900 truncate">{r.label}</span>
              <span className="relative block h-6">
                <span className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-px bg-ink-100" />
                {avg !== undefined && <span className="absolute top-0.5 bottom-0.5 w-px bg-ink-400" style={{ left: `${pos(avg)}%` }} />}
                <span className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ left: `${Math.min(pos(r.a), pos(r.b))}%`, width: `${Math.abs(pos(r.b) - pos(r.a))}%`, backgroundColor: color, opacity: 0.45 }} />
                <span className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ left: `calc(${pos(r.a)}% - 5px)`, backgroundColor: CHART.prior }} title={`${aLabel} ${format(r.a)}${unit ? ` ${unit}` : ""}`} />
                <span className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-white" style={{ left: `calc(${pos(r.b)}% - 6px)`, backgroundColor: color }} title={`${bLabel} ${format(r.b)}${unit ? ` ${unit}` : ""}`} />
              </span>
              <span className={cn("text-[12px] font-semibold tabular-nums text-right whitespace-nowrap", improved ? "text-good-700" : "text-bad-700")}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}%</span>
            </div>
          );
          return onSelect ? (
            <button key={r.id} type="button" onClick={() => onSelect(r.id)} className={cn("w-full text-left rounded-xl -mx-2 px-2 py-0.5 hover:bg-ink-50/70 transition-colors", selectedId === r.id && "bg-ink-50")}>{row}</button>
          ) : <div key={r.id} className="py-0.5">{row}</div>;
        })}
      </div>
    </div>
  );
}
