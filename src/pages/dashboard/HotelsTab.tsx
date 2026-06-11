import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp, ExternalLink, ArrowUpDown } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PORTFOLIO_HOTELS, PORTFOLIO_GOVERNANCE_BY_HOTEL } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Region = "All" | "EMEA" | "APAC" | "Africa";
type SortField = "name" | "carbonIntensity" | "energyIntensity" | "waterIntensity" | "diversion_pct" | "renewablePct" | "dataConfidence";

const REGIONS: Region[] = ["All", "EMEA", "APAC", "Africa"];

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "carbonIntensity", label: "Carbon" },
  { field: "energyIntensity", label: "Energy" },
  { field: "waterIntensity",  label: "Water" },
  { field: "diversion_pct",  label: "Diversion" },
  { field: "renewablePct",   label: "Renewable" },
  { field: "dataConfidence", label: "Data" },
  { field: "name",           label: "Name" },
];

const CERT_MAP = Object.fromEntries(
  PORTFOLIO_GOVERNANCE_BY_HOTEL.map((g) => {
    const status: "certified" | "in-progress" | "gap" =
      g.certifications.length > 0 ? "certified" :
      g.attestationsPct >= 60 ? "in-progress" : "gap";
    return [g.hotel, status];
  })
);

function certTone(s: "certified" | "in-progress" | "gap"): "good" | "warn" | "bad" {
  return s === "certified" ? "good" : s === "in-progress" ? "warn" : "bad";
}
function certLabel(s: "certified" | "in-progress" | "gap") {
  return s === "certified" ? "Certified" : s === "in-progress" ? "In progress" : "Gap";
}

function RagDot({ tone }: { tone: "good" | "warn" | "bad" }) {
  return (
    <span className={cn(
      "inline-block w-2 h-2 rounded-full shrink-0",
      tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad"
    )} />
  );
}

function YoY({ val }: { val: number }) {
  const good = val < 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
      good ? "text-good" : "text-bad"
    )}>
      {val < 0 ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
      {val > 0 ? "+" : ""}{val.toFixed(1)}%
    </span>
  );
}

function biggestGap(h: typeof PORTFOLIO_HOTELS[0]): { text: string; tone: "bad" | "warn" } {
  const AVG_CARBON = 54.3;
  const AVG_ENERGY = 106.6;
  const AVG_WATER  = 476;
  const TARGET_DIV = 60;
  const issues: { text: string; severity: number; tone: "bad" | "warn" }[] = [];
  if (h.dataConfidence < 50)
    issues.push({ text: `Data ${Math.round(h.dataConfidence / 100 * 12)}/12 months — incomplete`, severity: 10, tone: "bad" });
  if (h.carbonIntensity > AVG_CARBON * 1.3)
    issues.push({ text: `Carbon ${h.carbonIntensity.toFixed(0)} kgCO₂/RN — ${Math.round((h.carbonIntensity / AVG_CARBON - 1) * 100)}% above avg`, severity: h.carbonIntensity / AVG_CARBON, tone: "bad" });
  if (h.energyIntensity > AVG_ENERGY * 1.25)
    issues.push({ text: `Energy ${h.energyIntensity.toFixed(0)} kWh/RN — ${Math.round((h.energyIntensity / AVG_ENERGY - 1) * 100)}% above avg`, severity: h.energyIntensity / AVG_ENERGY, tone: "warn" });
  if (h.waterIntensity > AVG_WATER * 1.3)
    issues.push({ text: `Water ${h.waterIntensity.toFixed(0)} L/GN — ${Math.round((h.waterIntensity / AVG_WATER - 1) * 100)}% above avg`, severity: h.waterIntensity / AVG_WATER, tone: "warn" });
  if (h.diversion_pct < TARGET_DIV - 25)
    issues.push({ text: `Waste diversion ${h.diversion_pct}% — ${TARGET_DIV - h.diversion_pct}% below target`, severity: (TARGET_DIV - h.diversion_pct) / TARGET_DIV + 1, tone: "bad" });
  if (issues.length === 0) return { text: "All metrics on track", tone: "warn" };
  issues.sort((a, b) => b.severity - a.severity);
  return { text: issues[0].text, tone: issues[0].tone };
}

function MetricBar({ value, max, tone }: { value: number; max: number; tone: "good" | "warn" | "bad" }) {
  const pct = Math.min(100, (value / max) * 100);
  const avg = pct * 0.55; // rough avg marker position
  return (
    <div className="relative h-2 bg-ink-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all",
          tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function HotelCard({ h }: { h: typeof PORTFOLIO_HOTELS[0] }) {
  const certStatus = CERT_MAP[h.name] ?? "gap";
  const coverage = Math.round(h.dataConfidence / 100 * 12);
  const gap = biggestGap(h);

  const carbonTone: "good" | "warn" | "bad" = h.carbonIntensity < 55 ? "good" : h.carbonIntensity < 75 ? "warn" : "bad";
  const energyTone: "good" | "warn" | "bad" = h.energyIntensity < 100 ? "good" : h.energyIntensity < 140 ? "warn" : "bad";
  const waterTone:  "good" | "warn" | "bad" = h.waterIntensity  < 450 ? "good" : h.waterIntensity  < 700 ? "warn" : "bad";
  const divTone:    "good" | "warn" | "bad" = h.diversion_pct   >= 55  ? "good" : h.diversion_pct  >= 35  ? "warn" : "bad";
  const dataTone:   "good" | "warn" | "bad" = coverage >= 11 ? "good" : coverage >= 8 ? "warn" : "bad";
  const renewTone:  "good" | "warn" | "bad" = h.renewablePct >= 30 ? "good" : h.renewablePct >= 10 ? "warn" : "bad";

  const borderCls = carbonTone === "good" ? "border-good/40" : carbonTone === "warn" ? "border-warn/40" : "border-bad/40";
  const headerBg  = carbonTone === "good" ? "bg-good/5" : carbonTone === "warn" ? "bg-warn/5" : "bg-bad/5";
  const stripeCls = carbonTone === "good" ? "bg-good" : carbonTone === "warn" ? "bg-warn" : "bg-bad";

  return (
    <div className={cn("rounded-xl border-2 bg-white overflow-hidden hover:shadow-md transition-all flex flex-col", borderCls)}>
      {/* Top colour stripe */}
      <div className={cn("h-1", stripeCls)} />

      {/* Header */}
      <div className={cn("px-4 py-3 flex items-start justify-between gap-2", headerBg)}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RagDot tone={carbonTone} />
            <span className="text-[14px] font-bold text-ink-900 leading-tight truncate">{h.name}</span>
          </div>
          <div className="text-[10px] text-ink-400 mt-0.5 pl-4">{h.region} · {h.type}</div>
        </div>
        {/* Cert status is shown in the neutral stats row below — keeping it out of
            the performance-RAG header avoids a green "Certified" pill on a red card. */}
      </div>

      {/* Metric bars */}
      <div className="px-4 pt-3 pb-2 space-y-3 flex-1">

        {/* Carbon */}
        <div>
          <div className="flex justify-between items-baseline mb-1 gap-2">
            <span className="text-[10px] text-ink-500 font-medium">Carbon</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("text-[13px] font-bold tabular-nums", `text-${carbonTone}`)}>
                {h.carbonIntensity.toFixed(1)}
              </span>
              <span className="text-[9px] text-ink-400">kgCO₂/RN</span>
              <YoY val={h.yoyCarbon} />
            </div>
          </div>
          <MetricBar value={h.carbonIntensity} max={120} tone={carbonTone} />
          <div className="flex justify-between text-[8px] text-ink-300 mt-0.5">
            <span>0</span><span className="text-ink-400 font-medium">avg 54</span><span>120</span>
          </div>
        </div>

        {/* Energy */}
        <div>
          <div className="flex justify-between items-baseline mb-1 gap-2">
            <span className="text-[10px] text-ink-500 font-medium">Energy</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("text-[13px] font-bold tabular-nums", `text-${energyTone}`)}>
                {h.energyIntensity.toFixed(1)}
              </span>
              <span className="text-[9px] text-ink-400">kWh/RN</span>
              <YoY val={h.yoyEnergy} />
            </div>
          </div>
          <MetricBar value={h.energyIntensity} max={250} tone={energyTone} />
          <div className="flex justify-between text-[8px] text-ink-300 mt-0.5">
            <span>0</span><span className="text-ink-400 font-medium">avg 107</span><span>250</span>
          </div>
        </div>

        {/* Water */}
        <div>
          <div className="flex justify-between items-baseline mb-1 gap-2">
            <span className="text-[10px] text-ink-500 font-medium">Water</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("text-[13px] font-bold tabular-nums", `text-${waterTone}`)}>
                {h.waterIntensity.toFixed(0)}
              </span>
              <span className="text-[9px] text-ink-400">L/GN</span>
            </div>
          </div>
          <MetricBar value={h.waterIntensity} max={1200} tone={waterTone} />
          <div className="flex justify-between text-[8px] text-ink-300 mt-0.5">
            <span>0</span><span className="text-ink-400 font-medium">avg 476</span><span>1200</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mx-4 mb-3 grid grid-cols-4 gap-1 rounded-lg bg-ink-50 px-2 py-2.5 text-center">
        <div>
          <div className={cn("text-[13px] font-bold tabular-nums leading-none", `text-${divTone}`)}>
            {h.diversion_pct}%
          </div>
          <div className="text-[8px] text-ink-400 mt-0.5">Diversion</div>
        </div>
        <div>
          <div className={cn("text-[13px] font-bold tabular-nums leading-none", `text-${renewTone}`)}>
            {h.renewablePct}%
          </div>
          <div className="text-[8px] text-ink-400 mt-0.5">Renewable</div>
        </div>
        <div>
          <div className={cn("text-[13px] font-bold tabular-nums leading-none", `text-${dataTone}`)}>
            {coverage}/12
          </div>
          <div className="text-[8px] text-ink-400 mt-0.5">Data</div>
        </div>
        <div>
          <div className="flex justify-center">
            <Badge tone={certTone(certStatus)} className="text-[8px] px-1 py-0">
              {certStatus === "certified" ? "✓ Cert" : certStatus === "in-progress" ? "~ Prog" : "✗ Gap"}
            </Badge>
          </div>
          <div className="text-[8px] text-ink-400 mt-0.5">Cert</div>
        </div>
      </div>

      {/* Biggest gap callout */}
      <div className={cn(
        "mx-4 mb-3 rounded-lg px-3 py-2 text-[11px] leading-snug",
        gap.tone === "bad" ? "bg-bad/8 text-bad" : gap.text === "All metrics on track" ? "bg-good/8 text-good" : "bg-warn/8 text-warn"
      )}>
        {gap.text}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <Link
          to="/properties"
          className="btn-secondary h-8 text-[11px] text-brand-700 border-brand-200 hover:bg-brand-50 inline-flex items-center justify-center gap-1.5 w-full rounded-lg"
        >
          Open property <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}

const HEATMAP_METRICS = [
  {
    key: "carbon", label: "Carbon", unit: "kgCO₂/RN",
    field: "carbonIntensity",
    format: (v: number) => v.toFixed(0),
    tone: (v: number): "good" | "warn" | "bad" => v < 55 ? "good" : v < 75 ? "warn" : "bad",
  },
  {
    key: "energy", label: "Energy", unit: "kWh/RN",
    field: "energyIntensity",
    format: (v: number) => v.toFixed(0),
    tone: (v: number): "good" | "warn" | "bad" => v < 100 ? "good" : v < 140 ? "warn" : "bad",
  },
  {
    key: "water", label: "Water", unit: "L/GN",
    field: "waterIntensity",
    format: (v: number) => v.toFixed(0),
    tone: (v: number): "good" | "warn" | "bad" => v < 450 ? "good" : v < 700 ? "warn" : "bad",
  },
  {
    key: "diversion", label: "Diversion", unit: "%",
    field: "diversion_pct",
    format: (v: number) => `${v}%`,
    tone: (v: number): "good" | "warn" | "bad" => v >= 55 ? "good" : v >= 35 ? "warn" : "bad",
  },
  {
    key: "renewable", label: "Renewable", unit: "%",
    field: "renewablePct",
    format: (v: number) => `${v}%`,
    tone: (v: number): "good" | "warn" | "bad" => v >= 30 ? "good" : v >= 10 ? "warn" : "bad",
  },
  {
    key: "data", label: "Data", unit: "months",
    field: "dataConfidence",
    format: (v: number) => `${Math.round(v / 100 * 12)}/12`,
    tone: (v: number): "good" | "warn" | "bad" => v >= 90 ? "good" : v >= 65 ? "warn" : "bad",
  },
];

export default function HotelsTab() {
  const [region, setRegion] = useState<Region>("All");
  const [sortField, setSortField] = useState<SortField>("carbonIntensity");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = PORTFOLIO_HOTELS.filter((h) => region === "All" || h.region === region);
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "name") return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    const diff = (a[sortField] as number) - (b[sortField] as number);
    return sortAsc ? diff : -diff;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(false); }
  }

  return (
    <div className="space-y-5">

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
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

        {/* Sort pills */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          <span className="text-[10px] text-ink-400 font-medium mr-1">Sort:</span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.field}
              onClick={() => toggleSort(o.field)}
              className={cn(
                "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                sortField === o.field
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-500 hover:bg-ink-200"
              )}
            >
              {o.label}
              {sortField === o.field && <ArrowUpDown size={8} />}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-good inline-block" />On track</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warn inline-block" />Monitor</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-bad inline-block" />Action needed</span>
        <span className="text-ink-400 ml-auto">{sorted.length} hotel{sorted.length !== 1 ? "s" : ""} · sorted by {SORT_OPTIONS.find(o => o.field === sortField)?.label}</span>
      </div>

      {/* ── Heatmap matrix ── */}
      <Card>
        <CardHeader title="Portfolio Heat Map" hint="10 hotels × 6 metrics — green = good, red = needs action" />
        <div className="px-4 pb-4 pt-2 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr>
                <th className="text-left pr-3 pb-2 font-medium text-ink-500 min-w-[140px]">Hotel</th>
                {HEATMAP_METRICS.map(m => (
                  <th key={m.key} className="pb-2 font-medium text-ink-500 text-center min-w-[80px]">
                    <div>{m.label}</div>
                    <div className="text-[9px] font-normal text-ink-400">{m.unit}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-1">
              {PORTFOLIO_HOTELS.map((h) => (
                <tr key={h.name} className="group">
                  <td className="pr-3 py-1 font-medium text-ink-800 text-[11px] truncate max-w-[140px]">
                    {h.shortName}
                  </td>
                  {HEATMAP_METRICS.map(m => {
                    const raw = h[m.field as keyof typeof h] as number;
                    const tone = m.tone(raw);
                    return (
                      <td key={m.key} className="py-1 px-1 text-center">
                        <div className={cn(
                          "rounded-lg px-2 py-1.5 text-[11px] font-semibold tabular-nums mx-auto",
                          tone === "good" ? "bg-good/12 text-good" :
                          tone === "warn" ? "bg-warn/15 text-amber-700" :
                          "bg-bad/12 text-bad"
                        )}>
                          {m.format(raw)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 mt-3 text-[10px] text-ink-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-good/15 inline-block" /> On track</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warn/15 inline-block" /> At risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-bad/15 inline-block" /> Action needed</span>
          </div>
        </div>
      </Card>

      {/* Hotel cards */}
      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((h) => <HotelCard key={h.id} h={h} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-ink-100 bg-white py-12 text-center text-ink-400 text-[13px]">
          No hotels match the selected filter.
        </div>
      )}

      {/* Thresholds footnote */}
      <div className="text-[11px] text-ink-400 flex flex-wrap gap-x-6 gap-y-1 px-1 pt-1 border-t border-ink-100">
        <span>Carbon: <span className="text-good">&#60;55</span> / <span className="text-warn">55–75</span> / <span className="text-bad">&#62;75</span> kgCO₂/RN</span>
        <span>Energy: <span className="text-good">&#60;100</span> / <span className="text-warn">100–140</span> / <span className="text-bad">&#62;140</span> kWh/RN</span>
        <span>Water: <span className="text-good">&#60;450</span> / <span className="text-warn">450–700</span> / <span className="text-bad">&#62;700</span> L/GN</span>
        <span>Diversion: <span className="text-good">≥55%</span> / <span className="text-warn">35–54%</span> / <span className="text-bad">&#60;35%</span></span>
        <span>Data: <span className="text-good">≥11/12</span> / <span className="text-warn">8–10/12</span> / <span className="text-bad">&#60;8/12</span> months</span>
      </div>
    </div>
  );
}
