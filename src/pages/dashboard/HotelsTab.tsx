import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import { Card, CardHeader } from "@/components/ui/Card";
import { PORTFOLIO_HOTELS, PORTFOLIO_CERTS_BY_HOTEL } from "@/lib/mock";
import { hotelMonthly, MONTHS } from "@/lib/flows";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import Bubble, { type BubblePoint } from "@/components/charts/Bubble";
import RadarProfile, { type RadarAxis } from "@/components/charts/RadarProfile";
import { LegendRow, fmtN } from "@/components/charts/ChartBits";

type Hotel = (typeof PORTFOLIO_HOTELS)[number];
type Region = "All" | "EMEA" | "APAC" | "Africa";
type Tone = "good" | "warn" | "bad";

const CERT_MAP = Object.fromEntries(PORTFOLIO_CERTS_BY_HOTEL.map((g) => [g.hotel, g.certifications.length > 0 ? "certified" : g.enrolling ? "in-progress" : "gap"])) as Record<string, "certified" | "in-progress" | "gap">;

/* One definition of every metric: field, unit, thresholds, direction. Everything below reads it. */
const METRICS = [
  { key: "carbon", label: "Carbon", unit: "kgCO₂/RN", field: "carbonIntensity", higherIsBetter: false, format: (v: number) => v.toFixed(0), tone: (v: number): Tone => (v < 55 ? "good" : v < 75 ? "warn" : "bad") },
  { key: "energy", label: "Energy", unit: "kWh/RN", field: "energyIntensity", higherIsBetter: false, format: (v: number) => v.toFixed(0), tone: (v: number): Tone => (v < 100 ? "good" : v < 140 ? "warn" : "bad") },
  { key: "water", label: "Water", unit: "L/GN", field: "waterIntensity", higherIsBetter: false, format: (v: number) => v.toFixed(0), tone: (v: number): Tone => (v < 450 ? "good" : v < 700 ? "warn" : "bad") },
  { key: "diversion", label: "Diversion", unit: "%", field: "diversion_pct", higherIsBetter: true, format: (v: number) => `${v}%`, tone: (v: number): Tone => (v >= 55 ? "good" : v >= 35 ? "warn" : "bad") },
  { key: "renewable", label: "Renewable", unit: "%", field: "renewablePct", higherIsBetter: true, format: (v: number) => `${v}%`, tone: (v: number): Tone => (v >= 30 ? "good" : v >= 10 ? "warn" : "bad") },
  { key: "data", label: "Data", unit: "months", field: "dataConfidence", higherIsBetter: true, format: (v: number) => `${Math.round((v / 100) * 12)}/12`, tone: (v: number): Tone => (v >= 90 ? "good" : v >= 65 ? "warn" : "bad") },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];
const val = (h: Hotel, m: (typeof METRICS)[number]) => h[m.field as keyof Hotel] as number;

const TONE_CHART: Record<Tone, string> = { good: CHART.olive, warn: CHART.sand, bad: CHART.rose };
const TONE_TEXT: Record<Tone, string> = { good: "text-good-700", warn: "text-warn-700", bad: "text-bad-700" };
const TONE_CELL: Record<Tone, string> = { good: "bg-good/12 text-good-700", warn: "bg-warn/15 text-warn-700", bad: "bg-bad/12 text-bad-700" };

/** 0–100 where 100 is the best hotel in the portfolio and 0 the worst — a shape everyone can read. */
function scoreFor(m: (typeof METRICS)[number], v: number) {
  const vals = PORTFOLIO_HOTELS.map((h) => val(h, m));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) return 50;
  return m.higherIsBetter ? ((v - lo) / (hi - lo)) * 100 : ((hi - v) / (hi - lo)) * 100;
}
const avgOf = (m: (typeof METRICS)[number]) => PORTFOLIO_HOTELS.reduce((s, h) => s + val(h, m), 0) / PORTFOLIO_HOTELS.length;

function radarAxes(h: Hotel): RadarAxis[] {
  return METRICS.map((m) => ({ key: m.key, label: m.label, value: scoreFor(m, val(h, m)), reference: scoreFor(m, avgOf(m)), raw: `${m.format(val(h, m))} ${m.unit}`, referenceRaw: `${m.format(avgOf(m))} ${m.unit}` }));
}

function YoY({ v }: { v: number }) {
  const good = v < 0;
  return <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums", good ? "text-good-700" : "text-bad-700")}>{good ? <TrendingDown size={9} /> : <TrendingUp size={9} />}{v > 0 ? "+" : ""}{v.toFixed(1)}%</span>;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const w = 72, h = 20;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - lo) / (hi - lo || 1)) * (h - 2) - 1}`).join(" ");
  return (
    <svg width={w} height={h} className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function HotelsTab() {
  const [region, setRegion] = useState<Region>("All");
  const [sortKey, setSortKey] = useState<MetricKey>("carbon");
  const [selected, setSelected] = useState<string>(PORTFOLIO_HOTELS[0].id);
  const monthly = useMemo(() => hotelMonthly("carbon"), []);

  const sortMetric = METRICS.find((m) => m.key === sortKey)!;
  const filtered = PORTFOLIO_HOTELS.filter((h) => region === "All" || h.region === region);
  const sorted = [...filtered].sort((a, b) => (sortMetric.higherIsBetter ? val(a, sortMetric) - val(b, sortMetric) : val(b, sortMetric) - val(a, sortMetric)));
  const sel = PORTFOLIO_HOTELS.find((h) => h.id === selected) ?? PORTFOLIO_HOTELS[0];

  const points: BubblePoint[] = filtered.map((h) => ({
    id: h.id, label: h.shortName, x: h.energyIntensity, y: h.waterIntensity, z: h.rooms,
    color: TONE_CHART[METRICS[0].tone(h.carbonIntensity)], note: `${h.region} · ${h.type} · carbon ${h.carbonIntensity.toFixed(0)} kgCO₂/RN`,
  }));
  const avgEnergy = avgOf(METRICS[1]);
  const avgWater = avgOf(METRICS[2]);
  const tones = METRICS.map((m) => m.tone(val(sel, m)));
  const worst = METRICS.map((m, i) => ({ m, tone: tones[i], score: scoreFor(m, val(sel, m)) })).sort((a, b) => a.score - b.score)[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs variant="segmented" size="sm" ariaLabel="Region" items={(["All", "EMEA", "APAC", "Africa"] as Region[]).map((r) => ({ key: r, label: r }))} value={region} onChange={(k) => setRegion(k as Region)} />
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-400">Rank by</span>
          <Tabs variant="segmented" size="sm" ariaLabel="Sort" items={METRICS.map((m) => ({ key: m.key, label: m.label }))} value={sortKey} onChange={(k) => setSortKey(k as MetricKey)} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Energy against water, by hotel" hint="Bubble = rooms · colour = carbon status · lines = portfolio average · click a hotel to profile it" />
          <div className="px-2 pt-2 flex-1">
            <Bubble data={points} height={300} xLabel="Energy" xUnit="kWh/RN" yLabel="Water" yUnit="L/GN" zLabel="Rooms" xAvg={avgEnergy} yAvg={avgWater} onSelect={setSelected} selectedId={selected} xFormat={(v) => fmtN(v, 0)} yFormat={(v) => fmtN(v, 0)} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <LegendRow items={[{ label: "Carbon on track", color: CHART.olive }, { label: "Monitor", color: CHART.sand }, { label: "Action needed", color: CHART.rose }]} />
            <span>{filtered.length} hotel{filtered.length === 1 ? "" : "s"}</span>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title={sel.shortName} hint={`${sel.region} · ${sel.type} · ${sel.rooms} rooms · profile against the portfolio`} right={<Badge tone={worst.tone}>{worst.tone === "good" ? "All on track" : `${worst.m.label} weakest`}</Badge>} />
          <div className="px-2 flex-1">
            <RadarProfile axes={radarAxes(sel)} height={240} name={sel.shortName} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-3 gap-3">
            {METRICS.slice(0, 3).map((m) => (
              <div key={m.key} className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">{m.label}</div>
                <div className={cn("text-[13px] font-bold tabular-nums", TONE_TEXT[m.tone(val(sel, m))])}>{m.format(val(sel, m))} <span className="text-[10px] font-normal text-ink-400">{m.unit}</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Portfolio heat map" hint={`${sorted.length} hotels × 6 metrics · ranked by ${sortMetric.label.toLowerCase()} · trend = monthly carbon intensity`} right={<Link to="/portfolio/compare" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">Compare by pillar <ChevronRight size={12} /></Link>} />
        <div className="px-4 pb-4 pt-3 overflow-x-auto">
          <table className="w-full text-[11px] min-w-[760px]">
            <thead>
              <tr>
                <th className="text-left pr-3 pb-2 font-medium text-ink-500 min-w-[150px]">Hotel</th>
                {METRICS.map((m) => (
                  <th key={m.key} className="pb-2 font-medium text-ink-500 text-center min-w-[76px]">
                    <div>{m.label}</div><div className="text-[10px] font-normal text-ink-400">{m.unit}</div>
                  </th>
                ))}
                <th className="pb-2 font-medium text-ink-500 text-left pl-3 min-w-[110px]"><div>Trend</div><div className="text-[10px] font-normal text-ink-400">{MONTHS[0]}–{MONTHS[MONTHS.length - 1]}</div></th>
                <th className="pb-2 font-medium text-ink-500 text-center min-w-[70px]"><div>Cert</div></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => {
                const trend = monthly.find((m) => m.hotel === h.shortName)?.values ?? [];
                const cert = CERT_MAP[h.name] ?? "gap";
                return (
                  <tr key={h.id} onClick={() => setSelected(h.id)} className={cn("cursor-pointer transition-colors", selected === h.id ? "bg-ink-50" : "hover:bg-ink-50/60")}>
                    <td className="pr-3 py-1 font-medium text-ink-900 text-[12px] truncate max-w-[160px] rounded-l-lg pl-2">{h.shortName}</td>
                    {METRICS.map((m) => {
                      const v = val(h, m);
                      return (
                        <td key={m.key} className="py-1 px-1 text-center">
                          <div className={cn("rounded-lg px-2 py-1.5 text-[11px] font-semibold tabular-nums", TONE_CELL[m.tone(v)])}>{m.format(v)}</div>
                        </td>
                      );
                    })}
                    <td className="py-1 pl-3"><Sparkline values={trend} color={TONE_CHART[METRICS[0].tone(h.carbonIntensity)]} /></td>
                    <td className="py-1 text-center rounded-r-lg"><Badge tone={cert === "certified" ? "good" : cert === "in-progress" ? "warn" : "bad"}>{cert === "certified" ? "Certified" : cert === "in-progress" ? "In progress" : "Gap"}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-[10px] text-ink-400">
            <span>Carbon <span className="text-good-700">&lt;55</span> / <span className="text-warn-700">55–75</span> / <span className="text-bad-700">&gt;75</span></span>
            <span>Energy <span className="text-good-700">&lt;100</span> / <span className="text-warn-700">100–140</span> / <span className="text-bad-700">&gt;140</span></span>
            <span>Water <span className="text-good-700">&lt;450</span> / <span className="text-warn-700">450–700</span> / <span className="text-bad-700">&gt;700</span></span>
            <span>Diversion <span className="text-good-700">≥55%</span> / <span className="text-warn-700">35–54%</span> / <span className="text-bad-700">&lt;35%</span></span>
            <span>Data <span className="text-good-700">≥11/12</span> / <span className="text-warn-700">8–10</span> / <span className="text-bad-700">&lt;8</span></span>
          </div>
        </div>
      </Card>

      {/* Small multiples — every hotel's shape at once */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {sorted.map((h) => {
          const t = METRICS.map((m) => m.tone(val(h, m)));
          const weakest = METRICS.map((m, i) => ({ m, tone: t[i], score: scoreFor(m, val(h, m)) })).sort((a, b) => a.score - b.score)[0];
          const overall: Tone = t.includes("bad") ? "bad" : t.includes("warn") ? "warn" : "good";
          return (
            <button key={h.id} type="button" onClick={() => setSelected(h.id)} className={cn("card p-4 text-left flex flex-col transition-all duration-150 hover:shadow-pop hover:-translate-y-0.5", selected === h.id && "ring-1 ring-ink-900/20")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink-900 truncate">{h.shortName}</div>
                  <div className="text-[10px] text-ink-400 truncate">{h.region} · {h.type}</div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: TONE_CHART[overall] }} />
              </div>
              <div className="-mx-2">
                <RadarProfile axes={radarAxes(h)} height={120} compact color={TONE_CHART[overall]} />
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                {METRICS.slice(0, 3).map((m) => (
                  <div key={m.key} className="min-w-0">
                    <div className={cn("text-[12px] font-bold tabular-nums leading-none", TONE_TEXT[m.tone(val(h, m))])}>{m.format(val(h, m))}</div>
                    <div className="text-[10px] text-ink-400 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-ink-500 truncate">{weakest.tone === "good" ? "All metrics on track" : `${weakest.m.label} ${weakest.m.format(val(h, weakest.m))} ${weakest.m.unit}`}</span>
                <YoY v={h.yoyCarbon} />
              </div>
              <div className="mt-auto pt-3">
                <Link to="/properties" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-900">Open property <ExternalLink size={10} /></Link>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
