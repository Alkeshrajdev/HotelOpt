/**
 * Bullet — baseline → current → target on one scale, with where the pace says the
 * value should be by now. The honest target chart: no cheering, just the distance.
 */
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";

export default function Bullet({
  baseline, current, target, expectedNow, higherIsBetter = false, unit = "", format = (v: number) => String(v), baseLabel = "Baseline", targetLabel = "Target", tone = "good",
}: {
  baseline: number; current: number; target: number; expectedNow?: number; higherIsBetter?: boolean; unit?: string;
  format?: (v: number) => string; baseLabel?: string; targetLabel?: string; tone?: "good" | "warn" | "bad";
}) {
  const lo = Math.min(baseline, target, current), hi = Math.max(baseline, target, current);
  const span = (hi - lo) || 1;
  const pad = span * 0.08;
  const min = lo - pad, max = hi + pad;
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  // Progress runs from baseline toward target regardless of direction.
  const left = Math.min(pos(baseline), pos(current));
  const width = Math.abs(pos(current) - pos(baseline));
  const fill = tone === "good" ? "bg-chart-olive" : tone === "warn" ? "bg-chart-sand" : "bg-chart-rose";
  return (
    <div>
      <div className="relative h-8">
        {/* zone between baseline and target */}
        <div className="absolute top-3 h-2 rounded-full bg-ink-100" style={{ left: `${Math.min(pos(baseline), pos(target))}%`, width: `${Math.abs(pos(target) - pos(baseline))}%` }} />
        <div className="absolute top-0 bottom-0 left-0 right-0 border-b border-ink-100" />
        {/* achieved */}
        <div className={cn("absolute top-3 h-2 rounded-full", fill)} style={{ left: `${left}%`, width: `${width}%` }} />
        {/* pace marker */}
        {expectedNow !== undefined && (
          <span className="absolute top-1.5 w-px h-5 bg-ink-500" style={{ left: `${pos(expectedNow)}%` }} title={`On pace now: ${format(expectedNow)}${unit ? ` ${unit}` : ""}`} />
        )}
        {/* target tick */}
        <span className="absolute top-1 w-0.5 h-6 rounded-full" style={{ left: `${pos(target)}%`, backgroundColor: CHART.label }} title={`${targetLabel} ${format(target)}${unit ? ` ${unit}` : ""}`} />
        {/* current dot */}
        <span className="absolute top-[7px] w-3.5 h-3.5 rounded-full bg-white ring-2" style={{ left: `calc(${pos(current)}% - 7px)`, boxShadow: `inset 0 0 0 2px ${tone === "good" ? CHART.olive : tone === "warn" ? CHART.sand : CHART.rose}` }} title={`Current ${format(current)}${unit ? ` ${unit}` : ""}`} />
      </div>
      <div className="relative h-4 text-[10px] text-ink-500 tabular-nums">
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(baseline)}%` }}>{baseLabel} {format(baseline)}</span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-ink-900" style={{ left: `${pos(target)}%` }}>{targetLabel} {format(target)}</span>
      </div>
      <div className="sr-only">{higherIsBetter ? "higher is better" : "lower is better"}</div>
    </div>
  );
}
