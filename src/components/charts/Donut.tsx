/**
 * Donut — composition of a whole. Centre carries the total; the legend carries the
 * exact figures so nobody has to read angles.
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { fmtN } from "./ChartBits";

export type Slice = { name: string; value: number; color: string; sub?: string; id?: string };

export default function Donut({
  data, height = 200, centre: centreProp, totalValue, totalLabel, unit = "", format = (v: number) => fmtN(v), legend = "right", onSelect, selected, thickness = 0.3, digits = 1,
}: {
  data: Slice[]; height?: number; centre?: { value: string; label: string }; unit?: string; format?: (v: number) => string;
  legend?: "right" | "below" | "none"; onSelect?: (id: string) => void; selected?: string | null; thickness?: number; digits?: number;
  /** Legacy centre props (drill-down panels). */
  totalValue?: string; totalLabel?: string;
}) {
  const centre = centreProp ?? (totalValue || totalLabel ? { value: totalValue ?? "", label: totalLabel ?? "" } : undefined);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const chart = (
    <div className="relative shrink-0" style={{ height, width: legend === "right" ? height : "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as Slice | undefined;
              if (!active || !p) return null;
              return (
                <div className="popover rounded-xl px-3 py-2 text-[12px]">
                  <div className="inline-flex items-center gap-1.5 font-semibold text-ink-900"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</div>
                  <div className="text-ink-700 tabular-nums">{format(p.value)}{unit ? ` ${unit}` : ""} · {((p.value / total) * 100).toFixed(digits)}%</div>
                </div>
              );
            }}
          />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={`${Math.round((1 - thickness) * 92)}%`} outerRadius="92%" paddingAngle={1.5} stroke="#fff" strokeWidth={2} isAnimationActive={false}
            onClick={(d) => onSelect?.((d as unknown as Slice).id ?? (d as unknown as Slice).name)} className={onSelect ? "cursor-pointer" : undefined}>
            {data.map((s) => <Cell key={s.name} fill={s.color} fillOpacity={selected && selected !== (s.id ?? s.name) ? 0.35 : 1} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centre && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-[17px] font-bold text-ink-900 tabular-nums leading-none">{centre.value}</div>
            <div className="text-[10px] text-ink-500 mt-1">{centre.label}</div>
          </div>
        </div>
      )}
    </div>
  );
  if (legend === "none") return chart;
  const rows = (
    <ul className={cn("min-w-0", legend === "right" ? "flex-1 space-y-1.5" : "w-full grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3")}>
      {data.map((s) => {
        const key = s.id ?? s.name;
        return (
          <li key={key} onClick={() => onSelect?.(key)} className={cn("flex items-center justify-between gap-3 text-[12px] rounded-lg -mx-1.5 px-1.5 py-0.5", onSelect && "cursor-pointer hover:bg-ink-50", selected === key && "bg-ink-50")}>
            <span className="inline-flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} /><span className="text-ink-700 truncate">{s.name}</span></span>
            <span className="tabular-nums whitespace-nowrap"><span className="text-ink-400">{format(s.value)}{unit ? ` ${unit}` : ""}</span> <span className="font-semibold text-ink-900 inline-block w-11 text-right">{((s.value / total) * 100).toFixed(digits)}%</span></span>
          </li>
        );
      })}
    </ul>
  );
  return legend === "right"
    ? <div className="flex items-center gap-5">{chart}{rows}</div>
    : <div className="flex flex-col items-center">{chart}{rows}</div>;
}

export const DONUT_SERIES = [CHART.olive, CHART.mauve, CHART.moss, CHART.blush, CHART.cocoa, CHART.sand, CHART.sage];
