import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Property = {
  name: string;
  rooms: number;
  mwh: number;
  intensity: number; // kWh/ORN
  perM2: number;     // kWh/m²
  yoy: number;       // % change vs prior year
  rag: "green" | "amber" | "red";
};

/* Sorted best → worst by intensity */
const PROPERTIES: Property[] = [
  { name: "The Pavilion London",         rooms: 312, mwh: 1854,  intensity: 89.3, perM2:  88, yoy: -8.1,  rag: "green" },
  { name: "Grand Harbour Lisbon",        rooms: 248, mwh: 1650,  intensity: 95.2, perM2:  94, yoy: -5.2,  rag: "green" },
  { name: "The Montrose Paris",          rooms: 180, mwh: 1259,  intensity: 98.7, perM2:  97, yoy: -3.8,  rag: "green" },
  { name: "Skyline Dubai",               rooms: 520, mwh: 5086,  intensity: 108.5, perM2: 105, yoy: -3.4,  rag: "amber" },
  { name: "Bay View Singapore",          rooms: 410, mwh: 3581,  intensity: 116.8, perM2: 110, yoy: -1.2,  rag: "amber" },
  { name: "Oceanfront Cape Town",        rooms: 168, mwh: 1548,  intensity: 129.6, perM2: 118, yoy:  2.1,  rag: "amber" },
  { name: "Marina Residences Barcelona", rooms: 205, mwh: 1939,  intensity: 141.8, perM2: 126, yoy:  1.4,  rag: "red"   },
  { name: "Peaks Resort Zermatt",        rooms:  94, mwh: 953,  intensity: 157.5, perM2: 138, yoy:  4.2,  rag: "red"   },
  { name: "Riverside Bangkok",           rooms: 220, mwh: 2245,  intensity: 180.6, perM2: 152, yoy:  8.4,  rag: "red"   },
  { name: "Airport Hotel Dubai",         rooms: 360, mwh: 4652,  intensity: 221.8, perM2: 196, yoy:  6.3,  rag: "red"   },
];

const PORTFOLIO_AVG = 117.8; // kWh/ORN
const BEST = PROPERTIES[0].intensity;
const WORST = PROPERTIES[PROPERTIES.length - 1].intensity;

const RAG_STYLE = {
  green: "bg-good/10 text-good border border-good/20",
  amber: "bg-warn/10 text-warn border border-warn/25",
  red:   "bg-bad/10 text-bad border border-bad/20",
};

const RAG_BAR = {
  green: "#16a34a",
  amber: "#f59e0b",
  red:   "#ef4444",
};

export default function EnergyByProperty() {
  return (
    <div className="space-y-5">

      {/* ── Summary tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Best",            value: `${BEST}`, unit: "kWh/ORN", sub: PROPERTIES[0].name,      color: "text-good" },
          { label: "Portfolio avg",   value: `${PORTFOLIO_AVG}`, unit: "kWh/ORN", sub: "across all hotels",    color: "text-ink-900" },
          { label: "Worst",           value: `${WORST}`, unit: "kWh/ORN", sub: PROPERTIES[PROPERTIES.length-1].name, color: "text-bad" },
          { label: "Spread",          value: `${(WORST - BEST).toFixed(1)}`,  unit: "kWh/ORN", sub: "best to worst gap", color: "text-ink-900" },
        ].map((t) => (
          <div key={t.label} className="card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{t.label}</div>
            <div className={cn("text-[1.75rem] font-extrabold leading-none tabular-nums mt-2", t.color)}>
              {t.value}
              <span className="text-[13px] font-semibold text-ink-500 ml-1">{t.unit}</span>
            </div>
            <div className="text-[11px] text-ink-400 mt-1 truncate">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Bar chart + table ───────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Energy intensity by property"
          hint="kWh per occupied room night · sorted best to worst · dashed line = portfolio avg"
        />

        {/* Horizontal bar chart */}
        <div className="px-6 pt-4 pb-2 space-y-2">
          {PROPERTIES.map((p) => {
            const pct = ((p.intensity - BEST) / (WORST - BEST)) * 100;
            const avgPct = ((PORTFOLIO_AVG - BEST) / (WORST - BEST)) * 100;
            return (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-[180px] shrink-0 text-[12px] text-ink-700 font-medium truncate">
                  {p.name}
                </div>
                <div className="flex-1 relative h-6 flex items-center">
                  {/* Track */}
                  <div className="w-full h-2 rounded-full bg-ink-100" />
                  {/* Filled bar */}
                  <div
                    className="absolute left-0 h-2 rounded-full"
                    style={{
                      width: `${Math.max(pct, 3)}%`,
                      background: RAG_BAR[p.rag],
                      opacity: 0.85,
                    }}
                  />
                  {/* Portfolio avg marker */}
                  <div
                    className="absolute w-0.5 h-4 bg-ink-400 rounded-full"
                    style={{ left: `${avgPct}%` }}
                  />
                </div>
                <div className="w-[72px] text-right text-[13px] font-bold tabular-nums text-ink-900">
                  {p.intensity}
                  <span className="text-[10px] font-normal text-ink-400 ml-0.5">kWh/ORN</span>
                </div>
                <div
                  className={cn(
                    "w-[56px] text-right text-[12px] font-semibold tabular-nums",
                    p.yoy < 0 ? "text-good" : "text-bad"
                  )}
                >
                  {p.yoy > 0 ? "+" : ""}{p.yoy}%
                </div>
              </div>
            );
          })}
          <div className="text-[10px] text-ink-400 pt-1">
            ┆ dashed marker = portfolio avg ({PORTFOLIO_AVG} kWh/ORN)
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4 border-t border-ink-100">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Property</th>
                <th className="table-th text-right">Rooms</th>
                <th className="table-th text-right">Total MWh</th>
                <th className="table-th text-right">kWh / ORN</th>
                <th className="table-th text-right">kWh / m²</th>
                <th className="table-th text-right">vs last year</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {PROPERTIES.map((p, i) => (
                <tr key={p.name} className={cn("hover:bg-ink-50/50", i % 2 === 1 && "bg-ink-50/30")}>
                  <td className="table-td font-medium text-ink-900">{p.name}</td>
                  <td className="table-td text-right tabular-nums text-ink-600">{p.rooms.toLocaleString()}</td>
                  <td className="table-td text-right tabular-nums text-ink-900 font-semibold">{p.mwh.toLocaleString()}</td>
                  <td className="table-td text-right tabular-nums text-ink-900 font-semibold">{p.intensity}</td>
                  <td className="table-td text-right tabular-nums text-ink-600">{p.perM2}</td>
                  <td className={cn("table-td text-right tabular-nums font-semibold", p.yoy < 0 ? "text-good" : "text-bad")}>
                    {p.yoy > 0 ? "+" : ""}{p.yoy}%
                  </td>
                  <td className="table-td">
                    <span className={cn("chip text-[11px] font-semibold", RAG_STYLE[p.rag])}>
                      {p.rag.charAt(0).toUpperCase() + p.rag.slice(1)}
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
