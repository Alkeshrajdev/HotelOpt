import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingDown } from "lucide-react";

type Peer = {
  name: string;
  intensity: number;  // kWh/ORN
  perM2: number;      // kWh/m²
  costPerOrn: number; // USD/ORN
  renewable: number;  // %
  isYou: boolean;
};

const PEERS: Peer[] = [
  { name: "Your portfolio", intensity: 24.0, perM2: 112, costPerOrn: 3.20, renewable: 78, isYou: true  },
  { name: "Peer A",         intensity: 19.2, perM2:  89, costPerOrn: 2.58, renewable: 85, isYou: false },
  { name: "Peer B",         intensity: 21.8, perM2:  98, costPerOrn: 2.91, renewable: 72, isYou: false },
  { name: "Peer C",         intensity: 26.4, perM2: 124, costPerOrn: 3.42, renewable: 61, isYou: false },
];

/* Savings calculation:
   Peer A best intensity = 19.2 kWh/ORN
   Your intensity = 24.0 kWh/ORN
   Your ORNs = (2,840 MWh × 1000) / 24.0 = ~118,333
   Saving = (24.0 − 19.2) × 118,333 kWh = 568,000 kWh ≈ 568 MWh
   $ saving = 568 MWh × $105/MWh = $59,640
*/
const YOUR_MWH = 2840;
const YOUR_INTENSITY = 24.0;
const ORN_COUNT = Math.round((YOUR_MWH * 1000) / YOUR_INTENSITY);
const BEST_PEER = PEERS.filter((p) => !p.isYou).reduce((a, b) =>
  a.intensity < b.intensity ? a : b
);
const SAVING_MWH = Math.round(((YOUR_INTENSITY - BEST_PEER.intensity) / YOUR_INTENSITY) * YOUR_MWH);
const SAVING_USD = Math.round(SAVING_MWH * 105);

type MetricKey = "intensity" | "perM2" | "costPerOrn" | "renewable";

type MetricDef = {
  key: MetricKey;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  format: (v: number) => string;
};

const METRICS: MetricDef[] = [
  { key: "intensity",   label: "Energy intensity",  unit: "kWh / ORN", lowerIsBetter: true,  format: (v) => v.toFixed(1)  },
  { key: "perM2",       label: "Energy / area",     unit: "kWh / m²",  lowerIsBetter: true,  format: (v) => v.toFixed(0)  },
  { key: "costPerOrn",  label: "Cost",              unit: "USD / ORN",  lowerIsBetter: true,  format: (v) => `$${v.toFixed(2)}` },
  { key: "renewable",   label: "Renewable share",   unit: "%",          lowerIsBetter: false, format: (v) => `${v}%`       },
];

function best(metric: MetricDef): number {
  const vals = PEERS.map((p) => p[metric.key] as number);
  return metric.lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
}

function isBest(peer: Peer, metric: MetricDef): boolean {
  const b = best(metric);
  return (peer[metric.key] as number) === b;
}

function cellTone(peer: Peer, metric: MetricDef): string {
  if (peer.isYou) return "";
  if (isBest(peer, metric)) return "text-good font-semibold";
  return "";
}

function youTone(peer: Peer, metric: MetricDef): string {
  if (!peer.isYou) return "";
  const b = best(metric);
  const v = peer[metric.key] as number;
  const pct = metric.lowerIsBetter
    ? ((v - b) / b) * 100
    : ((b - v) / b) * 100;
  if (pct <= 5) return "text-good font-bold";
  if (pct <= 20) return "text-warn font-bold";
  return "text-bad font-bold";
}

export default function EnergyBenchmarks() {
  return (
    <div className="space-y-5">

      {/* ── Savings callout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-brand-600">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
              <TrendingDown size={15} className="text-brand-700" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Savings opportunity
            </span>
          </div>
          <div className="text-[2rem] font-extrabold text-brand-700 leading-none tabular-nums">
            {SAVING_MWH} MWh
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            if you matched Peer A's intensity ({BEST_PEER.intensity} kWh/ORN)
          </div>
        </div>

        <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-good">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-good/10 grid place-items-center">
              <DollarSign size={15} className="text-good" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Equivalent value
            </span>
          </div>
          <div className="text-[2rem] font-extrabold text-good leading-none tabular-nums">
            ${SAVING_USD.toLocaleString()}
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            per year · at avg $105 / MWh
          </div>
        </div>
      </div>

      {/* ── KPI comparison table ─────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="KPI comparison"
          hint="Peer identities are anonymised · no adjustments applied · raw operational data"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Metric</th>
                {PEERS.map((p) => (
                  <th
                    key={p.name}
                    className={cn("table-th text-right", p.isYou && "bg-brand-50/60 text-brand-700")}
                  >
                    {p.isYou ? <span className="font-bold">You</span> : p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => (
                <tr key={m.key} className="hover:bg-ink-50/50">
                  <td className="table-td">
                    <div className="font-medium text-ink-900">{m.label}</div>
                    <div className="text-[11px] text-ink-400">{m.unit}</div>
                  </td>
                  {PEERS.map((p) => {
                    const v = p[m.key] as number;
                    const isB = isBest(p, m);
                    return (
                      <td
                        key={p.name}
                        className={cn(
                          "table-td text-right tabular-nums",
                          p.isYou && "bg-brand-50/40",
                          p.isYou ? youTone(p, m) : cellTone(p, m)
                        )}
                      >
                        {m.format(v)}
                        {isB && (
                          <span className="ml-1 text-[10px] text-good">★</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-4 pt-2 text-[11px] text-ink-400">
          ★ Best in peer group &nbsp;·&nbsp; Peers are same-type hotels with comparable room count and climate zone
        </div>
      </Card>

      {/* ── Visual gap bars ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Gap to best peer — kWh / ORN"
          hint="How far each hotel in the peer group sits from the lowest intensity"
        />
        <div className="p-6 space-y-4">
          {PEERS.map((p) => {
            const v = p.intensity;
            const b = BEST_PEER.intensity;
            const worst = Math.max(...PEERS.map((x) => x.intensity));
            const pct = ((v - b) / (worst - b)) * 100;
            return (
              <div key={p.name} className="space-y-1">
                <div className="flex justify-between text-[12px]">
                  <span className={cn("font-medium", p.isYou ? "text-brand-700" : "text-ink-700")}>
                    {p.isYou ? "Your portfolio" : p.name}
                  </span>
                  <span className="tabular-nums font-bold text-ink-900">{v.toFixed(1)} kWh/ORN</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100">
                  <div
                    className={cn("h-full rounded-full", p.isYou ? "bg-brand-500" : "bg-ink-300")}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                {p.isYou && pct > 2 && (
                  <div className="text-[11px] text-ink-400">
                    Gap to best: {(v - b).toFixed(1)} kWh/ORN
                    · saving potential ≈ ${SAVING_USD.toLocaleString()}/yr
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}
