import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { PORTFOLIO_HOTELS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Region = "All" | "EMEA" | "APAC" | "Africa";
type SortField = "carbon_t" | "energyIntensity" | "waterIntensity" | "diversion_pct" | "dataConfidence";

const REGIONS: Region[] = ["All", "EMEA", "APAC", "Africa"];

function confidenceTone(pct: number): "good" | "warn" | "bad" {
  return pct >= 85 ? "good" : pct >= 70 ? "warn" : "bad";
}

function diversionTone(pct: number): "good" | "warn" | "bad" {
  return pct >= 55 ? "good" : pct >= 40 ? "warn" : "bad";
}

function carbonTone(val: number): "good" | "warn" | "bad" {
  return val < 50 ? "good" : val < 70 ? "warn" : "bad";
}

function statusDot(tone: "good" | "warn" | "bad") {
  return (
    <span className={cn(
      "inline-block w-2 h-2 rounded-full shrink-0",
      tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad"
    )} />
  );
}

export default function HotelsTab() {
  const [region, setRegion] = useState<Region>("All");
  const [sortField, setSortField] = useState<SortField>("carbon_t");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = PORTFOLIO_HOTELS.filter((h) => region === "All" || h.region === region);
  const sorted = [...filtered].sort((a, b) => {
    const diff = (a[sortField] as number) - (b[sortField] as number);
    return sortAsc ? diff : -diff;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(false); }
  }

  const totalCarbon = PORTFOLIO_HOTELS.reduce((s, h) => s + h.carbon_t, 0);

  // Pareto data — sorted descending by carbon
  const paretoData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.carbon_t - a.carbon_t)
    .map((h, i, arr) => {
      const cumulative = arr.slice(0, i + 1).reduce((s, x) => s + x.carbon_t, 0);
      return { name: h.shortName, carbon: h.carbon_t, cumPct: Math.round((cumulative / totalCarbon) * 100) };
    });

  // Intensity comparison
  const intensityData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.energyIntensity - a.energyIntensity)
    .map((h) => ({ name: h.shortName, intensity: h.energyIntensity }));

  const avgIntensity = Math.round(PORTFOLIO_HOTELS.reduce((s, h) => s + h.energyIntensity, 0) / PORTFOLIO_HOTELS.length);

  return (
    <div className="space-y-6">
      {/* Region filter */}
      <div className="flex gap-1">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              region === r ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Full metric table */}
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="min-w-full">
          <thead>
            <tr className="bg-ink-50">
              <th className="table-th">Hotel</th>
              <th className="table-th">Region</th>
              <th className="table-th">Type</th>
              <th className="table-th text-right">
                <button onClick={() => toggleSort("carbon_t")} className="inline-flex items-center gap-1 hover:text-ink-900">
                  tCO₂e <ArrowUpDown size={10} />
                </button>
              </th>
              <th className="table-th text-right">% Portfolio</th>
              <th className="table-th text-right">
                <button onClick={() => toggleSort("energyIntensity")} className="inline-flex items-center gap-1 hover:text-ink-900">
                  kWh/RN <ArrowUpDown size={10} />
                </button>
              </th>
              <th className="table-th text-right">
                <button onClick={() => toggleSort("waterIntensity")} className="inline-flex items-center gap-1 hover:text-ink-900">
                  L/GN <ArrowUpDown size={10} />
                </button>
              </th>
              <th className="table-th text-right">
                <button onClick={() => toggleSort("diversion_pct")} className="inline-flex items-center gap-1 hover:text-ink-900">
                  Diversion <ArrowUpDown size={10} />
                </button>
              </th>
              <th className="table-th text-right">
                <button onClick={() => toggleSort("dataConfidence")} className="inline-flex items-center gap-1 hover:text-ink-900">
                  Data <ArrowUpDown size={10} />
                </button>
              </th>
              <th className="table-th text-right pr-6">Open</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => {
              const pct = Math.round((h.carbon_t / totalCarbon) * 100);
              return (
                <tr key={h.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-semibold text-ink-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {statusDot(carbonTone(h.carbonIntensity))}
                      {h.name}
                    </div>
                  </td>
                  <td className="table-td text-[12px] text-ink-500">{h.region}</td>
                  <td className="table-td text-[12px] text-ink-500 whitespace-nowrap">{h.type}</td>
                  <td className="table-td text-right tabular-nums text-[13px] font-semibold text-ink-900 whitespace-nowrap">
                    {h.carbon_t.toLocaleString()}
                  </td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-14 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-pillar-carbon rounded-full" style={{ width: `${Math.min(100, pct * 2.5)}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-ink-700 tabular-nums w-6 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="table-td text-right">
                    <span className={cn(
                      "text-[12px] font-semibold tabular-nums",
                      h.energyIntensity > 150 ? "text-bad" : h.energyIntensity > 100 ? "text-warn" : "text-good"
                    )}>
                      {h.energyIntensity.toFixed(1)}
                    </span>
                  </td>
                  <td className="table-td text-right">
                    <span className={cn(
                      "text-[12px] font-semibold tabular-nums",
                      h.waterIntensity > 700 ? "text-bad" : h.waterIntensity > 500 ? "text-warn" : "text-good"
                    )}>
                      {h.waterIntensity.toFixed(0)}
                    </span>
                  </td>
                  <td className="table-td text-right">
                    <Badge tone={diversionTone(h.diversion_pct)}>{h.diversion_pct}%</Badge>
                  </td>
                  <td className="table-td text-right">
                    <Badge tone={confidenceTone(h.dataConfidence)}>{h.dataConfidence}%</Badge>
                  </td>
                  <td className="table-td text-right pr-6">
                    <Link
                      to="/properties"
                      className="btn-secondary h-7 px-3 text-[11px] text-brand-700 border-brand-200 hover:bg-brand-50 inline-flex items-center gap-1"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="table-td text-center text-ink-400 py-8">
                  No hotels match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Carbon Contribution — Pareto"
            hint="cumulative % shown on bars"
          />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paretoData} margin={{ top: 0, right: 50, bottom: 40, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                  angle={-40}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(val: number, name: string) => [
                    name === "carbon"
                      ? `${val.toLocaleString()} tCO₂e`
                      : `${val}% cumulative`,
                    name === "carbon" ? "Emissions" : "Cumulative %",
                  ]}
                />
                <Bar dataKey="carbon" maxBarSize={32} radius={[4, 4, 0, 0]}>
                  {paretoData.map((d, i) => (
                    <Cell key={d.name} fill={i < 3 ? "#0F766E" : "#99F6E4"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-ink-400 mt-1 text-center">
              Top 3 hotels contribute {paretoData[2]?.cumPct ?? 0}% of portfolio emissions
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Energy Intensity Ranking"
            hint="kWh per room night — portfolio avg shown"
          />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={intensityData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 110 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={106}
                  tick={{ fontSize: 11, fill: "#334155" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toFixed(1)} kWh/RN`, "Intensity"]}
                />
                <ReferenceLine
                  x={avgIntensity}
                  stroke="#94A3B8"
                  strokeDasharray="4 3"
                  label={{ value: `Avg ${avgIntensity}`, position: "top", fontSize: 10, fill: "#64748B" }}
                />
                <Bar dataKey="intensity" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {intensityData.map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.intensity > 150 ? "#EF4444" : d.intensity > 100 ? "#F59E0B" : "#22C55E"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Hotspot heatmap */}
      <Card>
        <CardHeader
          title="Portfolio Hotspot Summary"
          hint="hotels with the most risk across pillars"
        />
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PORTFOLIO_HOTELS.filter((h) =>
              h.dataConfidence < 70 || h.diversion_pct < 30 || h.energyIntensity > 140 || h.carbonIntensity > 70
            ).map((h) => {
              const risks: string[] = [];
              if (h.dataConfidence < 70) risks.push(`Data ${h.dataConfidence}%`);
              if (h.diversion_pct < 30) risks.push(`Diversion ${h.diversion_pct}%`);
              if (h.energyIntensity > 140) risks.push(`Energy ${h.energyIntensity.toFixed(0)} kWh/RN`);
              if (h.carbonIntensity > 70) risks.push(`Carbon ${h.carbonIntensity.toFixed(0)} kgCO₂/RN`);

              return (
                <Link
                  key={h.id}
                  to="/properties"
                  className="card-level-3 p-3 rounded-lg hover:bg-ink-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[12px] font-semibold text-ink-900">{h.name}</span>
                    <Badge tone="bad">{risks.length} risk{risks.length > 1 ? "s" : ""}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {risks.map((r) => (
                      <span key={r} className="chip bg-bad/10 text-bad text-[10px]">{r}</span>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-ink-400">{h.region} · {h.type}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
