import { useState, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Info, X, ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  PORTFOLIO_HOTELS,
  PORTFOLIO_SCOPE3_CATEGORIES,
  PORTFOLIO_ENERGY_SOURCES,
  PORTFOLIO_WATER_SOURCES,
  PORTFOLIO_WASTE_STREAMS,
  PORTFOLIO_MONTHLY_TREND,
  SCOPE1_BREAKDOWN,
  SCOPE2_METHODS,
  ENERGY_END_USE,
  WATER_END_USE,
  WASTE_BY_SOURCE,
} from "@/lib/mock";
import { DRILLDOWN_DATA } from "@/lib/drilldownData";
import { cn } from "@/lib/utils";

type Section = "carbon" | "energy" | "water" | "waste";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "carbon", label: "Carbon" },
  { key: "energy", label: "Energy" },
  { key: "water",  label: "Water"  },
  { key: "waste",  label: "Waste"  },
];

const AVG_CONFIDENCE = Math.round(
  PORTFOLIO_HOTELS.reduce((s, h) => s + h.dataConfidence, 0) / PORTFOLIO_HOTELS.length
);

// ─── shared helpers ───────────────────────────────────────────────────────────

function DataConfidenceBadge({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
      <ShieldCheck size={12} className={pct >= 85 ? "text-good" : pct >= 70 ? "text-warn" : "text-bad"} />
      <span>Data confidence:</span>
      <span className={cn("font-semibold", pct >= 85 ? "text-good" : pct >= 70 ? "text-warn" : "text-bad")}>
        {pct}%
      </span>
      <span className="text-ink-400">portfolio-wide</span>
    </div>
  );
}

function MetricStrip({ items }: {
  items: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }[]
}) {
  return (
    <div className="flex divide-x divide-ink-100 overflow-x-auto rounded-xl border border-ink-100 bg-white mb-5">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4 min-w-[140px] flex-1">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400 truncate">{item.label}</div>
          <div className="text-xl font-bold text-ink-900 tabular-nums mt-1">{item.value}</div>
          {item.sub && (
            <div className={cn("text-[11px] mt-0.5 font-medium",
              item.tone === "good" ? "text-good" : item.tone === "warn" ? "text-warn" : item.tone === "bad" ? "text-bad" : "text-ink-400"
            )}>
              {item.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HubLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
      {label} <ArrowRight size={12} />
    </Link>
  );
}

function SectionHeader({ confidence, hubTo, hubLabel }: { confidence: number; hubTo: string; hubLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <DataConfidenceBadge pct={confidence} />
      <HubLink to={hubTo} label={hubLabel} />
    </div>
  );
}

type TargetStatus = "bad" | "warn";
function TargetBanner({
  baseline, baseYear, current, target, targetYear, gap, status, owner,
}: {
  baseline: string; baseYear: number; current: string; target: string;
  targetYear: number; gap: string; status: TargetStatus; owner: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-0 rounded-xl border overflow-hidden text-[11px] mb-1",
      status === "bad" ? "border-bad/20 bg-bad/5" : "border-warn/20 bg-warn/5"
    )}>
      <div className="px-3 py-2 border-r border-ink-100 text-center shrink-0">
        <div className="text-[9px] text-ink-400 uppercase tracking-wide font-semibold">Baseline {baseYear}</div>
        <div className="font-bold text-ink-600 tabular-nums">{baseline}</div>
      </div>
      <div className="flex-1 px-3 py-2 flex items-center gap-2">
        <div className="flex-1">
          <span className="text-ink-500">Current: </span>
          <span className={cn("font-bold tabular-nums", status === "bad" ? "text-bad" : "text-warn")}>{current}</span>
          <span className="mx-2 text-ink-300">·</span>
          <span className="text-ink-500">Gap: </span>
          <span className={cn("font-semibold", status === "bad" ? "text-bad" : "text-warn")}>{gap}</span>
        </div>
        <span className={cn(
          "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold",
          status === "bad" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"
        )}>
          {status === "bad" ? "Off Track" : "At Risk"}
        </span>
      </div>
      <div className="px-3 py-2 border-l border-ink-100 text-center shrink-0">
        <div className="text-[9px] text-ink-400 uppercase tracking-wide font-semibold">Target {targetYear}</div>
        <div className="font-bold text-good tabular-nums">{target}</div>
      </div>
      <div className="px-3 py-2 border-l border-ink-100 shrink-0 hidden lg:block">
        <div className="text-[9px] text-ink-400 uppercase tracking-wide font-semibold">Owner</div>
        <div className="font-semibold text-ink-700">{owner}</div>
      </div>
    </div>
  );
}

// ─── DRILL-DOWN PANEL ────────────────────────────────────────────────────────

type DrilldownState = { key: string; label: string } | null;

function DrilldownPanel({
  drilldownKey,
  label,
  onClose,
}: {
  drilldownKey: string;
  label: string;
  onClose: () => void;
}) {
  const data = DRILLDOWN_DATA[drilldownKey];
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    requestAnimationFrame(() => {
      const scrollContainer = document.querySelector("main");
      if (!scrollContainer) return;
      const containerRect = scrollContainer.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const offset = panelRect.top - containerRect.top + scrollContainer.scrollTop - 16;
      scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
    });
  }, [drilldownKey]);

  if (!data) return null;

  const sorted = [...data.hotels].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, h) => s + h.value, 0);

  const barColor = (flag?: "bad" | "warn" | "good") =>
    flag === "bad" ? "#EF4444" : flag === "warn" ? "#F59E0B" : flag === "good" ? "#22C55E" : data.color;

  return (
    <div ref={panelRef} className="rounded-2xl border-2 border-brand-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-ink-100 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-400 uppercase tracking-wider mb-0.5">
            {data.parentLabel.split(" → ").map((seg, i, arr) => (
              <span key={seg} className="flex items-center gap-1">
                {seg}
                {i < arr.length - 1 && <ChevronRight size={9} />}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: data.color }} />
            <span className="text-[15px] font-bold text-ink-900 leading-tight">{label}</span>
            <span className="text-[12px] text-ink-400 font-medium">
              {total.toLocaleString()} {data.unit} total · all 10 properties
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart */}
        <div>
          <div className="text-[11px] font-semibold text-ink-500 mb-3 uppercase tracking-wide">
            Contribution by property — {data.unit}
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 0, right: 60, bottom: 0, left: 110 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
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
                formatter={(v: number) => [`${v.toLocaleString()} ${data.unit}`, ""]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {sorted.map((h) => (
                  <Cell key={h.name} fill={barColor(h.flag)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-ink-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bad inline-block" />Action required</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn inline-block" />Monitor</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-good inline-block" />On track</span>
          </div>
        </div>

        {/* Hotel list */}
        <div>
          <div className="text-[11px] font-semibold text-ink-500 mb-3 uppercase tracking-wide">
            Property detail
          </div>
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {sorted.map((h) => {
              const pct = total > 0 ? ((h.value / total) * 100).toFixed(1) : "0.0";
              return (
                <div
                  key={h.name}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 bg-ink-50 border border-transparent hover:border-ink-100"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                    style={{ background: barColor(h.flag) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-semibold text-ink-800 leading-snug">
                        {h.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className="text-[10px] text-ink-400">{pct}%</span>
                        <span className="text-[12px] font-bold text-ink-900">
                          {h.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {h.secondary && (
                      <div className="text-[10px] text-ink-500 mt-0.5">{h.secondary}</div>
                    )}
                    <div className="text-[10px] text-ink-400 mt-0.5 leading-snug">
                      {h.context}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-[12px] text-brand-800">
        <Info size={13} className="shrink-0 mt-0.5 text-brand-600" />
        <span>{data.insight}</span>
      </div>
    </div>
  );
}

// ─── CARBON ──────────────────────────────────────────────────────────────────

function CarbonSection() {
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);
  const hotelScopeData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.carbon_t - a.carbon_t)
    .map((h) => ({
      name: h.shortName,
      scope1: Math.round(h.carbon_t * 0.08),
      scope2: Math.round(h.carbon_t * 0.34),
      scope3: Math.round(h.carbon_t * 0.58),
    }));

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Emissions",      value: "42,850 tCO₂e",     sub: "−4.2% YoY",     tone: "good" },
        { label: "Scope 1 — Direct",     value: "3,428 tCO₂e",      sub: "8% of total" },
        { label: "Scope 2 — Electricity",value: "14,569 tCO₂e",     sub: "34% of total (location-based)" },
        { label: "Scope 3 — Value chain",value: "24,853 tCO₂e",     sub: "58% of total" },
        { label: "Carbon Intensity",     value: "59.5 kgCO₂e/RN",   sub: "−3.8 vs prior year", tone: "good" },
        { label: "Renewable Coverage",   value: "12%",               sub: "of electricity (RECs + on-site)", tone: "warn" },
      ]} />

      <SectionHeader confidence={AVG_CONFIDENCE} hubTo="/performance/carbon/overview" hubLabel="Open Carbon Hub" />

      {/* Scope 1 + Scope 2 + Scope 3 breakdown — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Scope 1 detail */}
        <Card>
          <CardHeader
            title="Scope 1 — Source Breakdown"
            hint="3,428 tCO₂e · direct combustion & fugitives"
          />
          <div className="px-4 pb-4 pt-2 space-y-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={SCOPE1_BREAKDOWN} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="source" width={0} tick={false} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toLocaleString()} tCO₂e`, ""]}
                />
                <Bar dataKey="tco2e" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {SCOPE1_BREAKDOWN.map((s) => <Cell key={s.source} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ul className="space-y-1">
              {SCOPE1_BREAKDOWN.map((s) => (
                <li
                  key={s.source}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                    s.drilldownKey
                      ? "cursor-pointer hover:bg-ink-50 group"
                      : ""
                  )}
                  onClick={() => s.drilldownKey && setDrilldown({ key: s.drilldownKey, label: s.source })}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[11px] font-semibold leading-snug",
                        s.drilldownKey ? "text-brand-700 group-hover:underline" : "text-ink-800"
                      )}>
                        {s.source}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] tabular-nums font-bold text-ink-900">{s.pct}%</span>
                        {s.drilldownKey && <ChevronRight size={10} className="text-ink-300 group-hover:text-brand-600" />}
                      </div>
                    </div>
                    <div className="text-[10px] text-ink-400">{s.note} · {s.tco2e.toLocaleString()} tCO₂e</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-1.5 rounded-lg bg-warn/10 px-3 py-2 text-[11px] text-warn">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>Refrigerant leaks are the highest Scope 1 reduction opportunity — survey all HVAC units annually.</span>
            </div>
          </div>
        </Card>

        {/* Scope 2 methods */}
        <Card>
          <CardHeader
            title="Scope 2 — Location vs Market"
            hint="both methods required by GHG Protocol"
          />
          <div className="px-4 pb-4 pt-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="card-level-3 p-3 rounded-lg">
                <div className="text-[10px] text-ink-500 font-semibold uppercase tracking-wide mb-1">Location-based</div>
                <div className="text-[20px] font-bold text-ink-900 tabular-nums">14,569</div>
                <div className="text-[10px] text-ink-400">tCO₂e · grid avg factor</div>
                <div className="text-[10px] text-ink-500 mt-1">0.251 kgCO₂/kWh</div>
              </div>
              <div className="card-level-3 p-3 rounded-lg border border-good/20">
                <div className="text-[10px] text-good font-semibold uppercase tracking-wide mb-1">Market-based</div>
                <div className="text-[20px] font-bold text-good tabular-nums">12,400</div>
                <div className="text-[10px] text-ink-400">tCO₂e · after RECs</div>
                <div className="text-[10px] text-good mt-1">−2,169 tCO₂e vs location</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-500">Renewable electricity coverage</span>
                <span className="font-bold text-ink-900">{SCOPE2_METHODS.recCoverage.pct}%</span>
              </div>
              <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full bg-good rounded-full" style={{ width: `${SCOPE2_METHODS.recCoverage.pct}%` }} />
              </div>
              <div className="mt-1.5 text-[10px] text-ink-400">
                {SCOPE2_METHODS.recCoverage.mwh.toLocaleString()} MWh covered · target: 100% by 2030
              </div>
            </div>

            <ul className="space-y-2 text-[11px]">
              <li className="flex justify-between">
                <span className="text-ink-500">RECs purchased</span>
                <span className="font-semibold text-ink-900">6,984 MWh</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-500">On-site solar (PV)</span>
                <span className="font-semibold text-ink-900">3,900 MWh</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-500">Gap to 100% renewable</span>
                <span className="font-semibold text-bad">47,316 MWh</span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-500">Abatement from RECs</span>
                <span className="font-semibold text-good">−2,169 tCO₂e (15%)</span>
              </li>
            </ul>

            <div className="flex items-start gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-700">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>PPAs would allow full market-based abatement — Bay View SG chiller PPA in feasibility.</span>
            </div>
          </div>
        </Card>

        {/* Scope 3 categories */}
        <Card>
          <CardHeader
            title="Scope 3 — Category Breakdown"
            hint="24,853 tCO₂e · upstream & downstream"
          />
          <div className="px-4 pb-4 pt-2 space-y-3">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={PORTFOLIO_SCOPE3_CATEGORIES} layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" width={0} tick={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toLocaleString()} tCO₂e`, ""]} />
                <Bar dataKey="tco2e" fill="#6EE7B7" radius={[0, 4, 4, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
            <ul className="space-y-1">
              {PORTFOLIO_SCOPE3_CATEGORIES.map((c) => (
                <li
                  key={c.category}
                  className={cn(
                    "flex items-center justify-between text-[11px] gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                    c.drilldownKey ? "cursor-pointer hover:bg-ink-50 group" : ""
                  )}
                  onClick={() => c.drilldownKey && setDrilldown({ key: c.drilldownKey, label: c.category })}
                >
                  <span className={cn("truncate", c.drilldownKey ? "text-brand-700 group-hover:underline font-medium" : "text-ink-700")}>
                    {c.category}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1 bg-ink-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pillar-carbon rounded-full" style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="font-semibold text-ink-900 w-8 text-right">{c.pct}%</span>
                    {c.drilldownKey && <ChevronRight size={10} className="text-ink-300 group-hover:text-brand-600" />}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-1.5 rounded-lg bg-warn/10 px-3 py-2 text-[11px] text-warn">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>Purchased goods & services (50%) dominates — 18 suppliers still using default emission factors.</span>
            </div>
          </div>
        </Card>
      </div>

      {drilldown && (
        <DrilldownPanel
          drilldownKey={drilldown.key}
          label={drilldown.label}
          onClose={() => setDrilldown(null)}
        />
      )}

      {/* Emissions by hotel — stacked scope split */}
      <Card>
        <CardHeader title="Emissions by Hotel — Scope Split" hint="tCO₂e ranked by total, stacked by scope" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hotelScopeData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 110 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, n: string) => [`${v.toLocaleString()} tCO₂e`, n === "scope1" ? "Scope 1" : n === "scope2" ? "Scope 2" : "Scope 3"]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === "scope1" ? "Scope 1" : v === "scope2" ? "Scope 2" : "Scope 3"} />
              <Bar dataKey="scope1" name="scope1" stackId="a" fill="#7C3AED" maxBarSize={18} />
              <Bar dataKey="scope2" name="scope2" stackId="a" fill="#0F766E" maxBarSize={18} />
              <Bar dataKey="scope3" name="scope3" stackId="a" fill="#6EE7B7" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Monthly trend + target */}
      <Card>
        <CardHeader title="Monthly Emissions Trend" hint="tCO₂e · solid = actual · dashed = 2030 target trajectory" />
        <div className="px-4 pb-2 pt-1">
          <TargetBanner
            baseline="54,900 tCO₂e" baseYear={2019}
            current="42,850 tCO₂e (−22%)" target="−40% reduction" targetYear={2030}
            gap="18% remaining" status="bad" owner="Sarah Chen"
          />
        </div>
        <div className="px-6 pb-6 pt-1">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={45}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, name: string) => [
                  `${v.toLocaleString()} tCO₂e`,
                  name === "carbonTarget" ? "2030 target" : "Actual"
                ]} />
              <Line type="monotone" dataKey="carbon" name="carbon" stroke="#0F766E" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="carbonTarget" name="carbonTarget" stroke="#0F766E" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} opacity={0.5} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-1 text-[10px] text-ink-400 justify-center">
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#0F766E] rounded" />Actual</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#0F766E] rounded opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg,#0F766E 0,#0F766E 4px,transparent 4px,transparent 8px)" }} />Target trajectory</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── ENERGY ──────────────────────────────────────────────────────────────────

function EnergySection() {
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);
  const intensityData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.energyIntensity - a.energyIntensity)
    .map((h) => ({ name: h.shortName, intensity: h.energyIntensity, total: h.energy_mwh }));

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Energy Use",   value: "84.2 GWh",       sub: "−6.1% YoY",        tone: "good" },
        { label: "Energy Intensity",   value: "116.9 kWh/RN",   sub: "−8.3 vs prior yr",  tone: "good" },
        { label: "Renewable Share",    value: "12%",             sub: "of electricity",     tone: "warn" },
        { label: "HVAC & Cooling",     value: "43.7%",           sub: "of total energy — largest system" },
        { label: "Natural Gas",        value: "19.9%",           sub: "of energy mix" },
        { label: "Diesel",             value: "6.3%",            sub: "high-impact fuel",   tone: "bad" },
      ]} />

      <SectionHeader confidence={AVG_CONFIDENCE} hubTo="/performance/energy/overview" hubLabel="Open Energy Hub" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Energy by system */}
        <Card>
          <CardHeader
            title="Energy by System / End-Use"
            hint="84,200 MWh · where energy is consumed"
          />
          <div className="px-4 pb-4 pt-2 space-y-4">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={ENERGY_END_USE} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="system" width={0} tick={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toLocaleString()} MWh`, ""]} />
                <Bar dataKey="mwh" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {ENERGY_END_USE.map((s) => <Cell key={s.system} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ul className="space-y-1">
              {ENERGY_END_USE.map((s) => (
                <li
                  key={s.system}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                    s.drilldownKey ? "cursor-pointer hover:bg-ink-50 group" : ""
                  )}
                  onClick={() => s.drilldownKey && setDrilldown({ key: s.drilldownKey, label: s.system })}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[11px] font-semibold leading-snug",
                        s.drilldownKey ? "text-brand-700 group-hover:underline" : "text-ink-800"
                      )}>
                        {s.system}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] font-bold text-ink-900 tabular-nums">{s.pct}%</span>
                        {s.drilldownKey && <ChevronRight size={10} className="text-ink-300 group-hover:text-brand-600" />}
                      </div>
                    </div>
                    <div className="text-[10px] text-ink-400">{s.note} · {s.mwh.toLocaleString()} MWh</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-700">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>HVAC alone (43.7%) represents 36.8 GWh — BMS optimisation across 8 hotels targets a 12% reduction.</span>
            </div>
          </div>
        </Card>

        {/* Fuel mix */}
        <Card>
          <CardHeader title="Energy Sources — Fuel Mix" hint="by primary source of energy input" />
          <div className="px-4 pb-4 pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={PORTFOLIO_ENERGY_SOURCES} dataKey="pct" nameKey="source" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {PORTFOLIO_ENERGY_SOURCES.map((s) => <Cell key={s.source} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-2 mt-2">
              {PORTFOLIO_ENERGY_SOURCES.map((s) => (
                <li key={s.source} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-ink-700">{s.source}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-ink-400 tabular-nums">{s.mwh.toLocaleString()} MWh</span>
                    <span className="font-bold text-ink-900 tabular-nums w-10 text-right">{s.pct}%</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 w-full flex items-start gap-1.5 rounded-lg bg-bad/10 px-3 py-2 text-[11px] text-bad">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>Diesel (5,300 MWh, 6.3%) generates disproportionate Scope 1 carbon — generator reduction is high priority.</span>
            </div>
          </div>
        </Card>
      </div>

      {drilldown && (
        <DrilldownPanel
          drilldownKey={drilldown.key}
          label={drilldown.label}
          onClose={() => setDrilldown(null)}
        />
      )}

      {/* Intensity by hotel */}
      <Card>
        <CardHeader title="Energy Intensity by Hotel" hint="kWh per room night — portfolio average 116.9" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={intensityData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 110 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, _n, p) => [`${v.toFixed(1)} kWh/RN · ${p.payload.total.toLocaleString()} MWh total`, "Intensity"]} />
              <Bar dataKey="intensity" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {intensityData.map((d) => (
                  <Cell key={d.name} fill={d.intensity > 150 ? "#EF4444" : d.intensity > 100 ? "#F59E0B" : "#22C55E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Trend + target */}
      <Card>
        <CardHeader title="Monthly Energy Trend" hint="MWh · solid = actual · dashed = 2026 target trajectory" />
        <div className="px-4 pb-2 pt-1">
          <TargetBanner
            baseline="22.5 kWh/RN" baseYear={2022}
            current="116.9 kWh/RN total" target="16.5 kWh/RN" targetYear={2025}
            gap="1.9 kWh/RN above target" status="warn" owner="Sarah Chen"
          />
        </div>
        <div className="px-6 pb-6 pt-1">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, name: string) => [
                  `${v.toLocaleString()} MWh`,
                  name === "energyTarget" ? "Target" : "Actual"
                ]} />
              <Line type="monotone" dataKey="energy" name="energy" stroke="#CA8A04" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="energyTarget" name="energyTarget" stroke="#CA8A04" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} opacity={0.5} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-1 text-[10px] text-ink-400 justify-center">
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#CA8A04] rounded" />Actual</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#CA8A04] rounded opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg,#CA8A04 0,#CA8A04 4px,transparent 4px,transparent 8px)" }} />Target</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── WATER ───────────────────────────────────────────────────────────────────

function WaterSection() {
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);
  const intensityData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.waterIntensity - a.waterIntensity)
    .map((h) => ({ name: h.shortName, intensity: h.waterIntensity, total: h.water_m3 }));

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Water Use",    value: "552,000 m³",    sub: "−3.8% YoY",      tone: "good" },
        { label: "Water Intensity",    value: "532 L/GN",      sub: "−22 vs prior yr", tone: "good" },
        { label: "Recycled Water",     value: "6%",            sub: "of total",         tone: "warn" },
        { label: "Guest Rooms",        value: "35%",           sub: "largest end-use — 193,200 m³" },
        { label: "Laundry",            value: "24%",           sub: "132,480 m³ — high reduction potential" },
        { label: "Hotels over Target", value: "7 / 10",        sub: "above 532 L/GN",  tone: "warn" },
      ]} />

      <SectionHeader confidence={AVG_CONFIDENCE} hubTo="/performance/water/overview" hubLabel="Open Water Hub" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Water by end-use */}
        <Card>
          <CardHeader
            title="Water by End-Use"
            hint="552,000 m³ · where water is consumed"
          />
          <div className="px-4 pb-4 pt-2 space-y-4">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={WATER_END_USE} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="use" width={0} tick={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toLocaleString()} m³`, ""]} />
                <Bar dataKey="m3" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {WATER_END_USE.map((u) => <Cell key={u.use} fill={u.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ul className="space-y-1">
              {WATER_END_USE.map((u) => (
                <li
                  key={u.use}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                    u.drilldownKey ? "cursor-pointer hover:bg-ink-50 group" : ""
                  )}
                  onClick={() => u.drilldownKey && setDrilldown({ key: u.drilldownKey, label: u.use })}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: u.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[11px] font-semibold leading-snug",
                        u.drilldownKey ? "text-brand-700 group-hover:underline" : "text-ink-800"
                      )}>
                        {u.use}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] font-bold text-ink-900 tabular-nums">{u.pct}%</span>
                        {u.drilldownKey && <ChevronRight size={10} className="text-ink-300 group-hover:text-brand-600" />}
                      </div>
                    </div>
                    <div className="text-[10px] text-ink-400">
                      {u.note} · {u.litresPerGN} L/GN
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-700">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>Laundry (24%) is the best ROI: linen reuse + optimised wash cycles can cut 30–40 L/GN with no capital outlay.</span>
            </div>
          </div>
        </Card>

        {/* Water sources */}
        <Card>
          <CardHeader title="Water Supply Sources" hint="where water comes from" />
          <div className="px-4 pb-4 pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={PORTFOLIO_WATER_SOURCES} dataKey="pct" nameKey="source" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {PORTFOLIO_WATER_SOURCES.map((s) => <Cell key={s.source} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-2 mt-2">
              {PORTFOLIO_WATER_SOURCES.map((s) => (
                <li key={s.source} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-ink-700">{s.source}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-ink-400 tabular-nums">{s.m3.toLocaleString()} m³</span>
                    <span className="font-bold text-ink-900 tabular-nums w-10 text-right">{s.pct}%</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 w-full">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-500">Recycled / reused water share</span>
                <span className="font-semibold text-warn">6% · target 20% by 2027</span>
              </div>
              <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full bg-warn rounded-full" style={{ width: "6%" }} />
              </div>
              <div className="mt-1 text-[10px] text-ink-400">Greywater reuse at Skyline Dubai (approved, AED 120k) will add ~3%</div>
            </div>
          </div>
        </Card>
      </div>

      {drilldown && (
        <DrilldownPanel
          drilldownKey={drilldown.key}
          label={drilldown.label}
          onClose={() => setDrilldown(null)}
        />
      )}

      {/* Intensity by hotel */}
      <Card>
        <CardHeader title="Water Intensity by Hotel" hint="litres per guest night — portfolio average 532" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={intensityData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 110 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, _n, p) => [`${v.toFixed(0)} L/GN · ${p.payload.total.toLocaleString()} m³ total`, "Intensity"]} />
              <Bar dataKey="intensity" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {intensityData.map((d) => (
                  <Cell key={d.name} fill={d.intensity > 700 ? "#EF4444" : d.intensity > 500 ? "#F59E0B" : "#22C55E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Trend + target */}
      <Card>
        <CardHeader title="Monthly Water Trend" hint="m³ · solid = actual · dashed = target trajectory" />
        <div className="px-4 pb-2 pt-1">
          <TargetBanner
            baseline="374 L/GN" baseYear={2022}
            current="532 L/GN" target="310 L/GN" targetYear={2025}
            gap="32 L/GN above target" status="warn" owner="Jin Park"
          />
        </div>
        <div className="px-6 pb-6 pt-1">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, name: string) => [
                  `${v.toLocaleString()} m³`,
                  name === "waterTarget" ? "Target" : "Actual"
                ]} />
              <Line type="monotone" dataKey="waterM3" name="waterM3" stroke="#0EA5E9" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="waterTarget" name="waterTarget" stroke="#0EA5E9" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} opacity={0.5} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-1 text-[10px] text-ink-400 justify-center">
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#0EA5E9] rounded" />Actual</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#0EA5E9] rounded opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg,#0EA5E9 0,#0EA5E9 4px,transparent 4px,transparent 8px)" }} />Target</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── WASTE ───────────────────────────────────────────────────────────────────

function WasteSection() {
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);
  const diversionData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => a.diversion_pct - b.diversion_pct)
    .map((h) => ({ name: h.shortName, diversion: h.diversion_pct, total: h.waste_t }));

  // Stacked data: show diversion vs landfill per source
  const sourceStackData = WASTE_BY_SOURCE.map((s) => ({
    source: s.source.replace(" & ", "\n& "),
    recycled:   s.streams.recycled,
    composted:  s.streams.composted,
    energyRec:  s.streams.energyRec,
    landfill:   s.streams.landfill,
    diversion:  s.diversionPct,
  }));

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Waste",        value: "8,420 t",       sub: "+1.4% YoY",           tone: "bad" },
        { label: "Diversion Rate",     value: "42%",           sub: "vs 60% target",        tone: "bad" },
        { label: "Landfill",           value: "3,883 t",       sub: "46.1% — urgent reduction needed", tone: "bad" },
        { label: "F&B Waste",          value: "43%",           sub: "of total — highest source" },
        { label: "Best Diversion",     value: "62%",           sub: "F&B — composting programme" },
        { label: "Food Waste",         value: "82 g/cover",    sub: "−8.6% YoY",           tone: "good" },
      ]} />

      <SectionHeader confidence={AVG_CONFIDENCE} hubTo="/performance/waste/overview" hubLabel="Open Waste Hub" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Waste by source — stacked streams */}
        <Card>
          <CardHeader
            title="Waste by Source & Disposal Route"
            hint="8,420 t · stacked by stream · diversion % labelled"
          />
          <div className="px-4 pb-4 pt-2 space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceStackData} margin={{ top: 0, right: 8, bottom: 20, left: 0 }}>
                <XAxis dataKey="source" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} width={35}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number, n: string) => [`${v.toLocaleString()} t`, n]} />
                <Bar dataKey="recycled"  name="Recycled"     stackId="a" fill="#22C55E" maxBarSize={48} />
                <Bar dataKey="composted" name="Composted"    stackId="a" fill="#84CC16" maxBarSize={48} />
                <Bar dataKey="energyRec" name="Energy rec."  stackId="a" fill="#F59E0B" maxBarSize={48} />
                <Bar dataKey="landfill"  name="Landfill"     stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
            <ul className="space-y-1">
              {WASTE_BY_SOURCE.map((s) => (
                <li
                  key={s.source}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                    s.drilldownKey ? "cursor-pointer hover:bg-ink-50 group" : ""
                  )}
                  onClick={() => s.drilldownKey && setDrilldown({ key: s.drilldownKey, label: s.source })}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[11px] font-semibold leading-snug",
                        s.drilldownKey ? "text-brand-700 group-hover:underline" : "text-ink-800"
                      )}>
                        {s.source}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge tone={s.diversionPct >= 55 ? "good" : s.diversionPct >= 35 ? "warn" : "bad"}>
                          {s.diversionPct}% diverted
                        </Badge>
                        {s.drilldownKey && <ChevronRight size={10} className="text-ink-300 group-hover:text-brand-600" />}
                      </div>
                    </div>
                    <div className="text-[10px] text-ink-400">
                      {s.tonnes.toLocaleString()} t · {s.pct}% of portfolio
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-1.5 rounded-lg bg-warn/10 px-3 py-2 text-[11px] text-warn">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>Events & Conferences (20% diversion) is the weakest stream — mandatory segregation bins at source needed.</span>
            </div>
          </div>
        </Card>

        {/* Waste streams — overall portfolio mix */}
        <Card>
          <CardHeader title="Waste Streams — Portfolio Mix" hint="by disposal method" />
          <div className="px-4 pb-4 pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={PORTFOLIO_WASTE_STREAMS} dataKey="tonnes" nameKey="stream" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {PORTFOLIO_WASTE_STREAMS.map((s) => <Cell key={s.stream} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toLocaleString()} t`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-2 mt-2">
              {PORTFOLIO_WASTE_STREAMS.map((s) => (
                <li key={s.stream} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-ink-700">{s.stream}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-ink-400 tabular-nums">{s.tonnes.toLocaleString()} t</span>
                    <span className="font-bold text-ink-900 tabular-nums w-10 text-right">{s.pct}%</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 w-full">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-500">Diversion rate (non-landfill)</span>
                <span className="font-semibold text-bad">42% · target 60% by 2025</span>
              </div>
              <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "42%", background: "linear-gradient(to right, #22C55E, #84CC16, #F59E0B)" }} />
              </div>
              <div className="mt-1 text-[10px] text-ink-400">9 hotels below target · biggest gap: Zermatt 18%, Airport Dubai 24%</div>
            </div>
          </div>
        </Card>
      </div>

      {drilldown && (
        <DrilldownPanel
          drilldownKey={drilldown.key}
          label={drilldown.label}
          onClose={() => setDrilldown(null)}
        />
      )}

      {/* Diversion by hotel */}
      <Card>
        <CardHeader title="Diversion Rate by Hotel" hint="% diverted from landfill — worst first" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={diversionData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 110 }}>
              <XAxis type="number" domain={[0, 80]} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, _n, p) => [`${v}% diversion · ${p.payload.total.toLocaleString()} t total`, "Diversion"]} />
              <Bar dataKey="diversion" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {diversionData.map((d) => (
                  <Cell key={d.name} fill={d.diversion >= 50 ? "#22C55E" : d.diversion >= 35 ? "#F59E0B" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Trend + target */}
      <Card>
        <CardHeader title="Monthly Diversion Rate Trend" hint="% · solid = actual · dashed = 60% target" />
        <div className="px-4 pb-2 pt-1">
          <TargetBanner
            baseline="24% diversion" baseYear={2022}
            current="42% diversion" target="60% diversion" targetYear={2025}
            gap="18% below target" status="bad" owner="Marco Rossi"
          />
        </div>
        <div className="px-6 pb-6 pt-1">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={35}
                tickFormatter={(v) => `${v}%`} domain={[35, 65]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, name: string) => [
                  `${v}%`,
                  name === "diversionTarget" ? "Target" : "Actual"
                ]} />
              <Line type="monotone" dataKey="diversion" name="diversion" stroke="#9333EA" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="diversionTarget" name="diversionTarget" stroke="#9333EA" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} opacity={0.5} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-1 text-[10px] text-ink-400 justify-center">
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#9333EA] rounded" />Actual</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-[#9333EA] rounded opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg,#9333EA 0,#9333EA 4px,transparent 4px,transparent 8px)" }} />Target (60%)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────

export default function EnvironmentTab() {
  const [section, setSection] = useState<Section>("carbon");

  return (
    <div className="space-y-5">
      <div className="flex gap-0.5 border-b border-ink-100 -mx-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={cn(
              "px-4 py-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              section === s.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "carbon" && <CarbonSection />}
      {section === "energy" && <EnergySection />}
      {section === "water"  && <WaterSection />}
      {section === "waste"  && <WasteSection />}
    </div>
  );
}
