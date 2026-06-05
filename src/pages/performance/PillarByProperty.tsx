/**
 * Shared By-Property league table for Water, Waste, Carbon.
 * Sorted best→worst by intensity metric.
 */
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type PropRow = { name: string; rooms: number; total: number; intensity: number; yoy: number; rag: "green"|"amber"|"red" };

/* ─── Property data per pillar ───────────────────────────────────────────── */
const DATA: Record<"water"|"waste"|"carbon", { rows: PropRow[]; avg: number; unit: string; totalUnit: string; intensityUnit: string }> = {
  water: {
    avg: 0.23, unit:"m³/ORN", totalUnit:"m³",
    intensityUnit:"m³/ORN",
    rows: [
      { name:"The Pavilion London",         rooms:312, total:8900,  intensity:0.18, yoy:-6.2, rag:"green" },
      { name:"Grand Harbour Lisbon",        rooms:248, total:7700,  intensity:0.19, yoy:-4.8, rag:"green" },
      { name:"The Montrose Paris",          rooms:180, total:5800,  intensity:0.20, yoy:-3.5, rag:"green" },
      { name:"Skyline Dubai",               rooms:520, total:16600, intensity:0.21, yoy:-2.8, rag:"amber" },
      { name:"Bay View Singapore",          rooms:410, total:14200, intensity:0.22, yoy:-1.5, rag:"amber" },
      { name:"Oceanfront Cape Town",        rooms:168, total:6800,  intensity:0.25, yoy: 1.8, rag:"amber" },
      { name:"Marina Residences Barcelona", rooms:205, total:8700,  intensity:0.27, yoy: 2.1, rag:"red"   },
      { name:"Peaks Resort Zermatt",        rooms: 94, total:4500,  intensity:0.30, yoy: 3.5, rag:"red"   },
      { name:"Riverside Bangkok",           rooms:220, total:9800,  intensity:0.34, yoy: 7.2, rag:"red"   },
      { name:"Airport Hotel Dubai",         rooms:360, total:15300, intensity:0.42, yoy: 5.6, rag:"red"   },
    ],
  },
  waste: {
    avg: 1.02, unit:"kg/ORN", totalUnit:"kg",
    intensityUnit:"kg/ORN",
    rows: [
      { name:"The Pavilion London",         rooms:312, total:32200, intensity:0.78, yoy:-8.1, rag:"green" },
      { name:"Grand Harbour Lisbon",        rooms:248, total:33900, intensity:0.82, yoy:-5.5, rag:"green" },
      { name:"The Montrose Paris",          rooms:180, total:24700, intensity:0.86, yoy:-4.2, rag:"green" },
      { name:"Skyline Dubai",               rooms:520, total:75200, intensity:0.92, yoy:-3.1, rag:"amber" },
      { name:"Bay View Singapore",          rooms:410, total:65200, intensity:0.98, yoy:-1.8, rag:"amber" },
      { name:"Oceanfront Cape Town",        rooms:168, total:27600, intensity:1.08, yoy: 2.3, rag:"amber" },
      { name:"Marina Residences Barcelona", rooms:205, total:36000, intensity:1.14, yoy: 1.9, rag:"red"   },
      { name:"Peaks Resort Zermatt",        rooms: 94, total:18800, intensity:1.22, yoy: 3.8, rag:"red"   },
      { name:"Riverside Bangkok",           rooms:220, total:51700, intensity:1.35, yoy: 6.5, rag:"red"   },
      { name:"Airport Hotel Dubai",         rooms:360, total:79200, intensity:1.68, yoy: 4.2, rag:"red"   },
    ],
  },
  carbon: {
    avg: 16.3, unit:"kgCO₂e/ORN", totalUnit:"tCO₂e",
    intensityUnit:"kgCO₂e/ORN",
    rows: [
      { name:"The Pavilion London",         rooms:312, total:462,  intensity:11.2, yoy:-8.5, rag:"green" },
      { name:"Grand Harbour Lisbon",        rooms:248, total:528,  intensity:12.8, yoy:-5.2, rag:"green" },
      { name:"The Montrose Paris",          rooms:180, total:391,  intensity:13.6, yoy:-4.8, rag:"green" },
      { name:"Skyline Dubai",               rooms:520, total:1190, intensity:14.4, yoy:-3.5, rag:"amber" },
      { name:"Bay View Singapore",          rooms:410, total:1052, intensity:15.8, yoy:-2.1, rag:"amber" },
      { name:"Oceanfront Cape Town",        rooms:168, total:497,  intensity:18.2, yoy: 1.5, rag:"amber" },
      { name:"Marina Residences Barcelona", rooms:205, total:658,  intensity:20.4, yoy: 2.6, rag:"red"   },
      { name:"Peaks Resort Zermatt",        rooms: 94, total:382,  intensity:24.6, yoy: 4.1, rag:"red"   },
      { name:"Riverside Bangkok",           rooms:220, total:1110, intensity:28.8, yoy: 7.8, rag:"red"   },
      { name:"Airport Hotel Dubai",         rooms:360, total:1460, intensity:38.2, yoy: 5.4, rag:"red"   },
    ],
  },
};

const RAG_BAR = { green:"#16a34a", amber:"#f59e0b", red:"#ef4444" };
const RAG_CHIP = {
  green:"bg-good/10 text-good border border-good/20",
  amber:"bg-warn/10 text-warn border border-warn/25",
  red:  "bg-bad/10 text-bad border border-bad/20",
};

export default function PillarByProperty({ pillar }: { pillar: "water"|"waste"|"carbon" }) {
  const { rows, avg, unit, totalUnit, intensityUnit } = DATA[pillar];
  const best  = rows[0].intensity;
  const worst = rows[rows.length - 1].intensity;
  const green = rows.filter(r => r.rag === "green").length;
  const red   = rows.filter(r => r.rag === "red").length;

  return (
    <div className="space-y-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Best",       value:`${best}`,  unit, sub:rows[0].name,          color:"text-good"  },
          { label:"Portfolio avg",value:`${avg}`, unit, sub:"across all hotels",  color:"text-ink-900"},
          { label:"Worst",      value:`${worst}`, unit, sub:rows[rows.length-1].name, color:"text-bad"},
          { label:"On track",   value:`${green}`, unit:"", sub:`${red} need attention`, color:"text-ink-900"},
        ].map(t => (
          <div key={t.label} className="card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{t.label}</div>
            <div className={cn("text-[1.75rem] font-extrabold leading-none tabular-nums mt-2", t.color)}>
              {t.value}{t.unit && <span className="text-[12px] font-semibold text-ink-500 ml-1">{t.unit}</span>}
            </div>
            <div className="text-[11px] text-ink-400 mt-1 truncate">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar + table */}
      <Card>
        <CardHeader title={`${intensityUnit} by property`} />
        {/* Bars */}
        <div className="px-6 pt-4 pb-2 space-y-2">
          {rows.map(p => {
            const pct = ((p.intensity - best) / (worst - best)) * 100;
            const avgPct = ((avg - best) / (worst - best)) * 100;
            return (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-[180px] shrink-0 text-[12px] text-ink-700 font-medium truncate">{p.name}</div>
                <div className="flex-1 relative h-6 flex items-center">
                  <div className="w-full h-2 rounded-full bg-ink-100" />
                  <div className="absolute left-0 h-2 rounded-full" style={{ width:`${Math.max(pct,3)}%`, background:RAG_BAR[p.rag], opacity:0.85 }} />
                  <div className="absolute w-0.5 h-4 bg-ink-400 rounded-full" style={{ left:`${avgPct}%` }} />
                </div>
                <div className="w-[80px] text-right text-[13px] font-bold tabular-nums text-ink-900">
                  {p.intensity}<span className="text-[10px] font-normal text-ink-400 ml-0.5">{unit}</span>
                </div>
                <div className={cn("w-[52px] text-right text-[12px] font-semibold tabular-nums", p.yoy < 0 ? "text-good":"text-bad")}>
                  {p.yoy > 0 ? "+" : ""}{p.yoy}%
                </div>
              </div>
            );
          })}
          <div className="text-[10px] text-ink-400 pt-1">┆ marker = portfolio avg ({avg} {unit})</div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto mt-4 border-t border-ink-100">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Property</th>
                <th className="table-th text-right">Rooms</th>
                <th className="table-th text-right">Total ({totalUnit})</th>
                <th className="table-th text-right">{intensityUnit}</th>
                <th className="table-th text-right">vs last year</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.name} className={cn("hover:bg-ink-50/50", i%2===1 && "bg-ink-50/30")}>
                  <td className="table-td font-medium text-ink-900">{p.name}</td>
                  <td className="table-td text-right tabular-nums text-ink-600">{p.rooms}</td>
                  <td className="table-td text-right tabular-nums font-semibold text-ink-900">{p.total.toLocaleString()}</td>
                  <td className="table-td text-right tabular-nums font-bold text-ink-900">{p.intensity}</td>
                  <td className={cn("table-td text-right tabular-nums font-semibold", p.yoy < 0 ? "text-good":"text-bad")}>
                    {p.yoy > 0 ? "+" : ""}{p.yoy}%
                  </td>
                  <td className="table-td">
                    <span className={cn("chip text-[11px] font-semibold", RAG_CHIP[p.rag])}>
                      {p.rag.charAt(0).toUpperCase()+p.rag.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
