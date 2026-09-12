import { useMemo, useState, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ShieldCheck, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import {
  PORTFOLIO_HOTELS, PORTFOLIO_SCOPE3_CATEGORIES, PORTFOLIO_ENERGY_SOURCES, PORTFOLIO_WATER_SOURCES, PORTFOLIO_WASTE_STREAMS,
  PORTFOLIO_MONTHLY_TREND, SCOPE1_BREAKDOWN, SCOPE2_METHODS, ENERGY_END_USE, WATER_END_USE, WASTE_BY_SOURCE,
} from "@/lib/mock";
import { DRILLDOWN_DATA } from "@/lib/drilldownData";
import { CARBON_SANKEY, ENERGY_SANKEY, HOTEL_FUEL_MIX, MONTHS, WASTE_SANKEY, WATER_SANKEY, hotelMonthly } from "@/lib/flows";
import { rawYoyPct } from "@/lib/genuinePerformance";
import { hotelCarbon } from "@/lib/normalise";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import Sankey from "@/components/charts/Sankey";
import Donut from "@/components/charts/Donut";
import Pareto from "@/components/charts/Pareto";
import Dumbbell from "@/components/charts/Dumbbell";
import Heatmap from "@/components/charts/Heatmap";
import StackedArea from "@/components/charts/StackedArea";
import Waterfall from "@/components/charts/Waterfall";
import RadialGauge from "@/components/charts/RadialGauge";
import StripPlot from "@/components/charts/StripPlot";
import { AXIS_TICK, ChartTip, LegendRow, fmtN, kFmt } from "@/components/charts/ChartBits";

type Section = "carbon" | "energy" | "water" | "waste";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "carbon", label: "Carbon" }, { key: "energy", label: "Energy" }, { key: "water", label: "Water" }, { key: "waste", label: "Waste" },
];
const AVG_CONFIDENCE = Math.round(PORTFOLIO_HOTELS.reduce((s, h) => s + h.dataConfidence, 0) / PORTFOLIO_HOTELS.length);

/* ─── Shared bits ──────────────────────────────────────────────────────────── */

function MetricStrip({ items }: { items: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {items.map((it) => (
        <div key={it.label} className="card px-5 py-4">
          <div className="text-[10px] uppercase font-semibold tracking-[0.06em] text-ink-400 truncate">{it.label}</div>
          <div className="text-stat font-bold text-ink-900 tabular-nums mt-1 leading-none">{it.value}</div>
          <div className={cn("text-[11px] mt-1.5 font-medium truncate", it.tone === "good" ? "text-good-700" : it.tone === "warn" ? "text-warn-700" : it.tone === "bad" ? "text-bad-700" : "text-ink-400")}>{it.sub ?? " "}</div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ hubTo, hubLabel }: { hubTo: string; hubLabel: string }) {
  const pct = AVG_CONFIDENCE;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
        <ShieldCheck size={12} className={pct >= 85 ? "text-good-700" : pct >= 70 ? "text-warn-700" : "text-bad-700"} />
        <span>Data confidence</span>
        <span className={cn("font-semibold", pct >= 85 ? "text-good-700" : pct >= 70 ? "text-warn-700" : "text-bad-700")}>{pct}%</span>
        <span className="text-ink-400">portfolio-wide</span>
      </div>
      <Link to={hubTo} className="text-[12px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">{hubLabel} <ArrowRight size={12} /></Link>
    </div>
  );
}

function TargetLine({ baseline, baseYear, current, target, targetYear, gap, status, owner }: {
  baseline: string; baseYear: number; current: string; target: string; targetYear: number; gap: string; status: "bad" | "warn" | "good"; owner: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 py-4 border-t border-ink-100">
      <div><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Baseline {baseYear}</div><div className="text-[12px] font-semibold text-ink-900 tabular-nums">{baseline}</div></div>
      <div><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Current</div><div className={cn("text-[12px] font-semibold tabular-nums", status === "bad" ? "text-bad-700" : status === "warn" ? "text-warn-700" : "text-good-700")}>{current}</div></div>
      <div><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Target {targetYear}</div><div className="text-[12px] font-semibold text-ink-900 tabular-nums">{target}</div></div>
      <div><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Gap</div><div className="text-[12px] font-semibold text-ink-900">{gap}</div></div>
      <div className="flex items-center justify-between gap-2"><div><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Owner</div><div className="text-[12px] font-semibold text-ink-900">{owner}</div></div><Badge tone={status}>{status === "bad" ? "Off track" : status === "warn" ? "At risk" : "On track"}</Badge></div>
    </div>
  );
}

/* ─── Drill-down (contribution by property for a chosen slice) ─────────────── */
type Drill = { key: string; label: string } | null;

function DrilldownPanel({ drilldownKey, label, onClose }: { drilldownKey: string; label: string; onClose: () => void }) {
  const data = DRILLDOWN_DATA[drilldownKey];
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const main = document.querySelector("main");
      if (!main) return;
      main.scrollTo({ top: el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 16, behavior: "smooth" });
    });
  }, [drilldownKey]);
  if (!data) return null;
  const sorted = [...data.hotels].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, h) => s + h.value, 0);
  const color = (flag?: "bad" | "warn" | "good") => (flag === "bad" ? CHART.rose : flag === "warn" ? CHART.sand : flag === "good" ? CHART.olive : data.color);
  return (
    <Card className="ring-1 ring-ink-900/10">
      <div ref={ref} />
      <CardHeader
        title={label}
        hint={`${data.parentLabel} · ${fmtN(total)} ${data.unit} across all properties`}
        right={<button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full" title="Close"><X size={14} /></button>}
      />
      <div className="px-6 pt-4 pb-5 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={kFmt} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: CHART.label }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip unit={data.unit} />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" name="Contribution" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                {sorted.map((h) => <Cell key={h.name} fill={color(h.flag)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <LegendRow className="mt-1" items={[{ label: "Action required", color: CHART.rose }, { label: "Monitor", color: CHART.sand }, { label: "On track", color: CHART.olive }]} />
        </div>
        <div className="col-span-12 lg:col-span-5 space-y-2">
          {sorted.slice(0, 5).map((h) => (
            <div key={h.name} className="rounded-xl2 bg-ink-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-ink-900 truncate">{h.name}</span>
                <span className="text-[12px] font-bold text-ink-900 tabular-nums">{fmtN(h.value)} <span className="text-[10px] font-normal text-ink-400">{total ? ((h.value / total) * 100).toFixed(1) : 0}%</span></span>
              </div>
              <div className="text-[10px] text-ink-500 mt-0.5 leading-snug">{h.context}</div>
            </div>
          ))}
          <div className="text-[11px] text-ink-600 leading-snug pt-1">{data.insight}</div>
        </div>
      </div>
    </Card>
  );
}

/* ─── CARBON ───────────────────────────────────────────────────────────────── */

function CarbonSection() {
  const [drill, setDrill] = useState<Drill>(null);
  const [share, setShare] = useState(false);
  const [row, setRow] = useState<string | null>(null);
  const totalS1 = SCOPE1_BREAKDOWN.reduce((s, x) => s + x.tco2e, 0);
  const totalS3 = PORTFOLIO_SCOPE3_CATEGORIES.reduce((s, x) => s + x.tco2e, 0);
  const total = totalS1 + SCOPE2_METHODS.locationBased.tco2e + totalS3;
  const hotels = [...PORTFOLIO_HOTELS].sort((a, b) => b.carbon_t - a.carbon_t).map((h) => {
    const c = hotelCarbon(h);
    const s1 = c.s1s2 * (totalS1 / (totalS1 + SCOPE2_METHODS.locationBased.tco2e));
    const s2 = c.s1s2 - s1;
    const t = share ? 100 : 1;
    return { name: h.shortName, "Scope 1": Math.round((s1 / (share ? h.carbon_t : 1)) * t), "Scope 2": Math.round((s2 / (share ? h.carbon_t : 1)) * t), "Scope 3": Math.round((c.s3 / (share ? h.carbon_t : 1)) * t), total: h.carbon_t };
  });
  const heat = useMemo(() => hotelMonthly("carbon"), []);
  const nodeDrill = (id: string) => {
    const i = Number(id.split("-")[1]);
    if (id.startsWith("s1-") && SCOPE1_BREAKDOWN[i]?.drilldownKey) setDrill({ key: SCOPE1_BREAKDOWN[i].drilldownKey, label: SCOPE1_BREAKDOWN[i].source });
    if (id.startsWith("s3-") && PORTFOLIO_SCOPE3_CATEGORIES[i]?.drilldownKey) setDrill({ key: PORTFOLIO_SCOPE3_CATEGORIES[i].drilldownKey, label: PORTFOLIO_SCOPE3_CATEGORIES[i].category });
  };
  const trend = PORTFOLIO_MONTHLY_TREND.map((m) => ({ month: m.month, "Scope 1+2": Math.round(m.carbon * 0.42), "Scope 3": Math.round(m.carbon * 0.58), target: m.carbonTarget }));

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total emissions", value: `${fmtN(total)} t`, sub: "−4.2% YoY · tCO₂e", tone: "good" },
        { label: "Scope 1 · direct", value: `${fmtN(totalS1)} t`, sub: `${((totalS1 / total) * 100).toFixed(0)}% of total` },
        { label: "Scope 2 · electricity", value: `${fmtN(SCOPE2_METHODS.locationBased.tco2e)} t`, sub: `${((SCOPE2_METHODS.locationBased.tco2e / total) * 100).toFixed(0)}% · location-based` },
        { label: "Scope 3 · value chain", value: `${fmtN(totalS3)} t`, sub: `${((totalS3 / total) * 100).toFixed(0)}% of total` },
        { label: "Carbon intensity", value: "59.5 kg/RN", sub: "−3.8 vs prior year", tone: "good" },
        { label: "Renewable coverage", value: `${SCOPE2_METHODS.recCoverage.pct}%`, sub: "of electricity · RECs + on-site", tone: "warn" },
      ]} />
      <SectionHeader hubTo="/performance/carbon/overview" hubLabel="Open carbon hub" />

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Where the emissions come from" hint="Source → scope → total · tCO₂e · click a source with a breakdown to see it by property" />
          <div className="px-4 pt-3 pb-2 flex-1">
            <Sankey nodes={CARBON_SANKEY.nodes} links={CARBON_SANKEY.links} height={380} unit="t" labelWidth={168} onNodeClick={nodeDrill} selectedId={drill ? null : undefined} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <LegendRow items={[{ label: "Scope 1", color: CHART.moss }, { label: "Scope 2", color: CHART.mauve }, { label: "Scope 3", color: CHART.blush }]} />
            <span>Scope 2 shown location-based; market-based is {fmtN(SCOPE2_METHODS.marketBased.tco2e)} t after RECs.</span>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Scope 3 — the few that make 80%" hint="Categories ranked · line = cumulative share" />
          <div className="px-3 pt-3 flex-1">
            <Pareto height={250} unit="t" items={PORTFOLIO_SCOPE3_CATEGORIES.map((c) => ({ id: c.drilldownKey || c.category, label: c.category, value: c.tco2e, color: c.drilldownKey ? CHART.olive : CHART.moss }))} onSelect={(id) => { const c = PORTFOLIO_SCOPE3_CATEGORIES.find((x) => (x.drilldownKey || x.category) === id); if (c?.drilldownKey) setDrill({ key: c.drilldownKey, label: c.category }); }} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Purchased goods and business travel are two thirds of Scope 3; 18 suppliers still report on default emission factors.
          </div>
        </Card>
      </div>

      {drill && <DrilldownPanel drilldownKey={drill.key} label={drill.label} onClose={() => setDrill(null)} />}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader
            title="Emissions by hotel, by scope"
            hint={share ? "Share of each hotel's footprint" : "tCO₂e · ranked by total"}
            right={<Tabs variant="segmented" size="sm" ariaLabel="Mode" items={[{ key: "abs", label: "tCO₂e" }, { key: "share", label: "Share" }]} value={share ? "share" : "abs"} onChange={(k) => setShare(k === "share")} />}
          />
          <div className="px-3 pt-3 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hotels} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="28%">
                <CartesianGrid horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => (share ? `${v}%` : kFmt(v))} domain={share ? [0, 100] : ["auto", "auto"]} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: CHART.label }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip unit={share ? "%" : "t"} hide={["total"]} />} cursor={{ fill: CHART.grid }} />
                <Bar dataKey="Scope 1" stackId="a" fill={CHART.moss} maxBarSize={16} isAnimationActive={false} />
                <Bar dataKey="Scope 2" stackId="a" fill={CHART.mauve} maxBarSize={16} isAnimationActive={false} />
                <Bar dataKey="Scope 3" stackId="a" fill={CHART.blush} radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100">
            <LegendRow items={[{ label: "Scope 1", color: CHART.moss }, { label: "Scope 2", color: CHART.mauve }, { label: "Scope 3", color: CHART.blush }]} />
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Scope 2 — location vs market" hint="Both methods are required · the gap is what RECs and green tariffs remove" />
          <div className="px-6 pt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl2 bg-ink-50 p-3"><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Location-based</div><div className="text-[17px] font-bold text-ink-900 tabular-nums">{fmtN(SCOPE2_METHODS.locationBased.tco2e)} t</div><div className="text-[10px] text-ink-500">grid factor {SCOPE2_METHODS.gridEF.value} {SCOPE2_METHODS.gridEF.unit}</div></div>
            <div className="rounded-xl2 bg-ink-50 p-3"><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Market-based</div><div className="text-[17px] font-bold text-good-700 tabular-nums">{fmtN(SCOPE2_METHODS.marketBased.tco2e)} t</div><div className="text-[10px] text-ink-500">−{fmtN(SCOPE2_METHODS.saving.tco2e)} t after RECs</div></div>
          </div>
          <div className="px-3 pt-3 flex-1">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={SCOPE2_MONTHLY} barGap={1} barCategoryGap="30%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="m" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} tickFormatter={kFmt} />
                <Tooltip content={<ChartTip unit="t" />} cursor={{ fill: CHART.grid }} />
                <Bar dataKey="loc" name="Location-based" fill={CHART.mauve} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="mkt" name="Market-based" fill={CHART.olive} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 pt-2 pb-4 flex items-center gap-4">
            <RadialGauge value={SCOPE2_METHODS.recCoverage.pct} size={72} stroke={8} color={CHART.olive} />
            <div className="text-[11px] text-ink-600 leading-snug"><span className="font-semibold text-ink-900">{SCOPE2_METHODS.recCoverage.pct}% renewable electricity</span> · {fmtN(SCOPE2_METHODS.recCoverage.mwh)} MWh covered by RECs and on-site solar · target 100% by 2030 · gap {fmtN(47316)} MWh</div>
          </div>
          <div className="mt-auto px-6 py-3 border-t border-ink-100">
            <LegendRow items={[{ label: "Location-based", color: CHART.mauve }, { label: "Market-based", color: CHART.olive }]} />
          </div>
        </Card>
      </div>

      <Card className="flex flex-col">
        <CardHeader title="Monthly emissions against the 2030 trajectory" hint="tCO₂e · Scope 1+2 and Scope 3 stacked · dotted = target path" />
        <div className="px-3 pt-3">
          <StackedArea data={trend} xKey="month" height={230} unit="t" series={[{ key: "Scope 1+2", name: "Scope 1+2", color: CHART.mauve }, { key: "Scope 3", name: "Scope 3", color: CHART.blush }]} targetKey="target" targetName="2030 trajectory" />
        </div>
        <TargetLine baseline="54,900 t" baseYear={2019} current="42,850 t (−22%)" target="−40%" targetYear={2030} gap="18% remaining" status="bad" owner="Sarah Chen" />
      </Card>

      <Card>
        <CardHeader title="Carbon intensity by hotel and month" hint="kgCO₂e per room night · seasonality is the shape, the hotel is the level · click a row to keep it" />
        <div className="px-6 pt-4 pb-5">
          <Heatmap rows={heat.map((h) => h.hotel)} cols={MONTHS} values={heat.map((h) => h.values)} format={(v) => fmtN(v, 0)} unit="kgCO₂e/RN" rowTotals={heat.map((h) => h.total)} onRowClick={(r) => setRow(r === row ? null : r)} selectedRow={row} />
        </div>
      </Card>
    </div>
  );
}

/* ─── ENERGY ───────────────────────────────────────────────────────────────── */

function EnergySection() {
  const [drill, setDrill] = useState<Drill>(null);
  const [hotel, setHotel] = useState<string | null>(null);
  const total = PORTFOLIO_ENERGY_SOURCES.reduce((s, x) => s + x.mwh, 0);
  const renewables = PORTFOLIO_ENERGY_SOURCES.find((s) => s.source === "Renewables")?.mwh ?? 0;
  const dumbbell = [...PORTFOLIO_HOTELS].sort((a, b) => b.energyIntensity - a.energyIntensity).map((h) => ({ id: h.id, label: h.shortName, a: +(h.energyIntensity / (1 + h.yoyEnergy / 100)).toFixed(1), b: h.energyIntensity }));
  const avg = PORTFOLIO_HOTELS.reduce((s, h) => s + h.energyIntensity * h.orn, 0) / PORTFOLIO_HOTELS.reduce((s, h) => s + h.orn, 0);
  const mix = [...PORTFOLIO_HOTELS].sort((a, b) => b.renewablePct - a.renewablePct).map((h) => ({ name: h.shortName, ...HOTEL_FUEL_MIX[h.name] }));
  const trend = PORTFOLIO_MONTHLY_TREND.map((m) => {
    const t = m.energy;
    return { month: m.month, Grid: Math.round(t * 0.691), "Natural gas": Math.round(t * 0.199), Diesel: Math.round(t * 0.063), Renewables: Math.round(t * 0.047), target: m.energyTarget };
  });
  const nodeDrill = (id: string) => {
    if (!id.startsWith("use-")) return;
    const u = ENERGY_END_USE[Number(id.split("-")[1])];
    if (u?.drilldownKey) setDrill({ key: u.drilldownKey, label: u.system });
  };
  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total energy", value: "84.2 GWh", sub: "−6.1% YoY", tone: "good" },
        { label: "Energy intensity", value: "116.9 kWh/RN", sub: "−8.3 vs prior year", tone: "good" },
        { label: "Renewable share", value: `${((renewables / total) * 100).toFixed(1)}%`, sub: "of energy · 12% of electricity", tone: "warn" },
        { label: "HVAC & cooling", value: "43.7%", sub: "largest system · 36.8 GWh" },
        { label: "Natural gas", value: "19.9%", sub: "of the mix" },
        { label: "Diesel", value: "6.3%", sub: "highest carbon per kWh", tone: "bad" },
      ]} />
      <SectionHeader hubTo="/performance/energy/overview" hubLabel="Open energy hub" />

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="From fuel to use" hint="Where each energy source ends up · MWh · click a system to see it by property" />
          <div className="px-4 pt-3 pb-2 flex-1">
            <Sankey nodes={ENERGY_SANKEY.nodes} links={ENERGY_SANKEY.links} height={330} unit="MWh" labelWidth={150} onNodeClick={nodeDrill} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Gas feeds heating, kitchens and laundry; diesel is generator and plant load. Splits are fitted to the metered source and system totals.
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Fuel mix" hint="By primary energy input" />
          <div className="px-6 pt-4 flex-1">
            <Donut legend="below" height={170} unit="MWh" centre={{ value: "84.2 GWh", label: "this year" }} data={PORTFOLIO_ENERGY_SOURCES.map((s) => ({ name: s.source, value: s.mwh, color: s.color }))} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center gap-4">
            <RadialGauge value={12} size={64} stroke={7} color={CHART.olive} />
            <div className="text-[11px] text-ink-600 leading-snug"><span className="font-semibold text-ink-900">12% of electricity is renewable</span> · target 100% by 2030. Diesel's 5,300 MWh carries a disproportionate share of Scope 1.</div>
          </div>
        </Card>
      </div>

      {drill && <DrilldownPanel drilldownKey={drill.key} label={drill.label} onClose={() => setDrill(null)} />}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Intensity by hotel — last year to this year" hint="kWh per room night · highest first · line = portfolio average" />
          <div className="px-6 pt-4 pb-2 flex-1">
            <Dumbbell rows={dumbbell} unit="kWh/RN" avg={+avg.toFixed(1)} onSelect={(id) => setHotel(id === hotel ? null : id)} selectedId={hotel} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">Every hotel moved down; the spread between best and worst is still 2.5×.</div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Fuel mix by hotel" hint="Share of each hotel's energy · sorted by renewable share" />
          <div className="px-3 pt-3 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mix} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
                <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11, fill: CHART.label }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip unit="%" />} cursor={{ fill: CHART.grid }} />
                <Bar dataKey="renewables" name="Renewables" stackId="a" fill={CHART.olive} maxBarSize={14} isAnimationActive={false} />
                <Bar dataKey="grid" name="Grid" stackId="a" fill={CHART.moss} maxBarSize={14} isAnimationActive={false} />
                <Bar dataKey="gas" name="Natural gas" stackId="a" fill={CHART.mauve} maxBarSize={14} isAnimationActive={false} />
                <Bar dataKey="diesel" name="Diesel" stackId="a" fill={CHART.rose} radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100">
            <LegendRow items={[{ label: "Renewables", color: CHART.olive }, { label: "Grid", color: CHART.moss }, { label: "Natural gas", color: CHART.mauve }, { label: "Diesel", color: CHART.rose }]} />
          </div>
        </Card>
      </div>

      <Card className="flex flex-col">
        <CardHeader title="Monthly energy by source against the trajectory" hint="MWh · stacked by fuel · dotted = target path" />
        <div className="px-3 pt-3">
          <StackedArea data={trend} xKey="month" height={230} unit="MWh" series={[{ key: "Grid", name: "Grid", color: CHART.moss }, { key: "Natural gas", name: "Natural gas", color: CHART.mauve }, { key: "Diesel", name: "Diesel", color: CHART.rose }, { key: "Renewables", name: "Renewables", color: CHART.olive }]} targetKey="target" targetName="Target path" />
        </div>
        <TargetLine baseline="22.5 kWh/RN" baseYear={2022} current="116.9 kWh/RN" target="16.5 kWh/RN" targetYear={2025} gap="1.9 kWh/RN above" status="warn" owner="Sarah Chen" />
      </Card>
    </div>
  );
}

/* ─── WATER ────────────────────────────────────────────────────────────────── */

function WaterSection() {
  const [drill, setDrill] = useState<Drill>(null);
  const [hotel, setHotel] = useState<string | null>(null);
  const total = PORTFOLIO_WATER_SOURCES.reduce((s, x) => s + x.m3, 0);
  const recycled = PORTFOLIO_WATER_SOURCES.find((s) => s.source.startsWith("Recycled"))?.m3 ?? 0;
  const dumbbell = [...PORTFOLIO_HOTELS].sort((a, b) => b.waterIntensity - a.waterIntensity).map((h) => ({ id: h.id, label: h.shortName, a: Math.round(h.waterIntensity / (1 + rawYoyPct(h.name, "water") / 100)), b: h.waterIntensity }));
  const avg = Math.round(PORTFOLIO_HOTELS.reduce((s, h) => s + h.waterIntensity * h.gn, 0) / PORTFOLIO_HOTELS.reduce((s, h) => s + h.gn, 0));
  const points = PORTFOLIO_HOTELS.map((h) => ({ id: h.id, label: h.shortName, value: h.waterIntensity }));
  const over = points.filter((p) => p.value > 532).length;
  const trend = PORTFOLIO_MONTHLY_TREND.map((m) => ({ month: m.month, Rooms: Math.round(m.waterM3 * 0.35), Laundry: Math.round(m.waterM3 * 0.24), Kitchen: Math.round(m.waterM3 * 0.18), "Pool & spa": Math.round(m.waterM3 * 0.12), Other: Math.round(m.waterM3 * 0.11), target: m.waterTarget }));
  const nodeDrill = (id: string) => {
    if (!id.startsWith("use-")) return;
    const u = WATER_END_USE[Number(id.split("-")[1])];
    if (u?.drilldownKey) setDrill({ key: u.drilldownKey, label: u.use });
  };
  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total water", value: "552,000 m³", sub: "−3.8% YoY", tone: "good" },
        { label: "Water intensity", value: "532 L/GN", sub: "−22 vs prior year", tone: "good" },
        { label: "Recycled water", value: `${((recycled / total) * 100).toFixed(0)}%`, sub: "of supply · target 20% by 2027", tone: "warn" },
        { label: "Guest rooms", value: "35%", sub: "largest end-use · 193,200 m³" },
        { label: "Laundry", value: "24%", sub: "132,480 m³ · best reduction case" },
        { label: "Hotels over target", value: `${over} / 10`, sub: "above 532 L/GN", tone: "warn" },
      ]} />
      <SectionHeader hubTo="/performance/water/overview" hubLabel="Open water hub" />

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="From supply to use" hint="Where each source ends up · m³ · click an end-use to see it by property" />
          <div className="px-4 pt-3 pb-2 flex-1">
            <Sankey nodes={WATER_SANKEY.nodes} links={WATER_SANKEY.links} height={330} unit="m³" labelWidth={160} onNodeClick={nodeDrill} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">Recycled water goes to irrigation, cooling makeup and laundry rinse — never to rooms or kitchens.</div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Supply sources" hint="Where the water comes from" />
          <div className="px-6 pt-4 flex-1">
            <Donut legend="below" height={170} unit="m³" centre={{ value: "552k m³", label: "this year" }} data={PORTFOLIO_WATER_SOURCES.map((s) => ({ name: s.source, value: s.m3, color: s.color }))} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center gap-4">
            <RadialGauge value={(6 / 20) * 100} size={64} stroke={7} color={CHART.sand} valueText="6%" />
            <div className="text-[11px] text-ink-600 leading-snug"><span className="font-semibold text-ink-900">6% recycled against a 20% target</span> for 2027. Greywater reuse at Skyline Dubai (approved) adds about 3 points.</div>
          </div>
        </Card>
      </div>

      {drill && <DrilldownPanel drilldownKey={drill.key} label={drill.label} onClose={() => setDrill(null)} />}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Intensity by hotel — last year to this year" hint="Litres per guest night · highest first · line = portfolio average" />
          <div className="px-6 pt-4 pb-2 flex-1">
            <Dumbbell rows={dumbbell} unit="L/GN" avg={avg} format={(v) => fmtN(v, 0)} onSelect={(id) => setHotel(id === hotel ? null : id)} selectedId={hotel} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">Three hotels moved the wrong way; Airport Dubai and Riverside Bangkok carry the largest gap to the average.</div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Hotels against the 532 L/GN target" hint="Each dot is a hotel · left of the line is inside target" />
          <div className="px-6 pt-8 flex-1">
            <StripPlot points={points} target={532} avg={avg} unit="L/GN" onSelect={(id) => setHotel(id === hotel ? null : id)} selectedId={hotel} />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl2 bg-ink-50 p-3"><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Inside target</div><div className="text-[17px] font-bold text-good-700 tabular-nums">{10 - over}</div></div>
              <div className="rounded-xl2 bg-ink-50 p-3"><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Over target</div><div className="text-[17px] font-bold text-bad-700 tabular-nums">{over}</div></div>
            </div>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">Laundry is the best return: linen reuse and optimised cycles cut 30–40 L/GN with no capital outlay.</div>
        </Card>
      </div>

      <Card className="flex flex-col">
        <CardHeader title="Monthly water by end-use against the trajectory" hint="m³ · stacked by end-use · dotted = target path" />
        <div className="px-3 pt-3">
          <StackedArea data={trend} xKey="month" height={230} unit="m³" series={[{ key: "Rooms", name: "Rooms", color: CHART.olive }, { key: "Laundry", name: "Laundry", color: CHART.mauve }, { key: "Kitchen", name: "Kitchen", color: CHART.moss }, { key: "Pool & spa", name: "Pool & spa", color: CHART.blush }, { key: "Other", name: "Other", color: CHART.sage }]} targetKey="target" targetName="Target path" />
        </div>
        <TargetLine baseline="374 L/GN" baseYear={2022} current="532 L/GN" target="310 L/GN" targetYear={2025} gap="32 L/GN above" status="warn" owner="Jin Park" />
      </Card>
    </div>
  );
}

/* ─── WASTE ────────────────────────────────────────────────────────────────── */

function WasteSection() {
  const [drill, setDrill] = useState<Drill>(null);
  const [hotel, setHotel] = useState<string | null>(null);
  const total = PORTFOLIO_WASTE_STREAMS.reduce((s, x) => s + x.tonnes, 0);
  const landfill = PORTFOLIO_WASTE_STREAMS.find((s) => s.stream === "Landfill")?.tonnes ?? 0;
  const points = PORTFOLIO_HOTELS.map((h) => ({ id: h.id, label: h.shortName, value: h.diversion_pct }));
  const below = points.filter((p) => p.value < 60).length;
  const trend = PORTFOLIO_MONTHLY_TREND.map((m) => ({ month: m.month, diversion: m.diversion, target: m.diversionTarget }));
  const nodeDrill = (id: string) => {
    if (!id.startsWith("src-")) return;
    const s = WASTE_BY_SOURCE[Number(id.split("-")[1])];
    if (s?.drilldownKey) setDrill({ key: s.drilldownKey, label: s.source });
  };
  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total waste", value: "8,420 t", sub: "+1.4% YoY", tone: "bad" },
        { label: "Diversion rate", value: "42%", sub: "vs 60% target · excl. WtE", tone: "bad" },
        { label: "Landfill", value: `${fmtN(landfill)} t`, sub: `${((landfill / total) * 100).toFixed(1)}% of total`, tone: "bad" },
        { label: "F&B waste", value: "43%", sub: "of total · highest source" },
        { label: "Best diversion", value: "62%", sub: "F&B · composting programme", tone: "good" },
        { label: "Food waste", value: "82 g/cover", sub: "−8.6% YoY", tone: "good" },
      ]} />
      <SectionHeader hubTo="/performance/waste/overview" hubLabel="Open waste hub" />

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="From source to disposal route" hint="Tonnes · what each department's waste becomes · click a source to see it by property" />
          <div className="px-4 pt-3 pb-2 flex-1">
            <Sankey nodes={WASTE_SANKEY.nodes} links={WASTE_SANKEY.links} height={300} unit="t" labelWidth={160} onNodeClick={nodeDrill} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">Grey bands are landfill. Events & conferences send 70% of their waste there — segregation at source is the gap.</div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Disposal mix" hint="Portfolio · by route" />
          <div className="px-6 pt-4 flex-1">
            <Donut legend="below" height={170} unit="t" centre={{ value: "8,420 t", label: "this year" }} data={PORTFOLIO_WASTE_STREAMS.map((s) => ({ name: s.stream, value: s.tonnes, color: s.stream === "Landfill" ? CHART.remainder : s.stream === "Energy rec." ? CHART.sand : s.color }))} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center gap-4">
            <RadialGauge value={(42 / 60) * 100} size={64} stroke={7} color={CHART.rose} valueText="42%" />
            <div className="text-[11px] text-ink-600 leading-snug"><span className="font-semibold text-ink-900">42% true diversion against 60%</span> · 54% once energy recovery is counted. WtE is never folded into the green number.</div>
          </div>
        </Card>
      </div>

      {drill && <DrilldownPanel drilldownKey={drill.key} label={drill.label} onClose={() => setDrill(null)} />}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Diversion change by stream" hint="Percentage points year on year · net portfolio change" />
          <div className="px-3 pt-3 flex-1">
            <Waterfall height={240} unit="pp" fromZero decreaseIsGood={false} format={(v) => fmtN(v)} yFormat={(v) => `${v > 0 ? "+" : ""}${v}`} steps={[
              { name: "F&B", delta: 6 }, { name: "General", delta: -3 }, { name: "Events", delta: 2 }, { name: "Hazardous", delta: -1 }, { name: "Kitchen", delta: 4 }, { name: "Net change", total: 8 },
            ]} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100">
            <LegendRow items={[{ label: "Improved", color: CHART.olive }, { label: "Worsened", color: CHART.rose }, { label: "Net", color: CHART.prior }]} />
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Hotels against the 60% target" hint="Each dot is a hotel · right of the line has reached it" />
          <div className="px-6 pt-8 flex-1">
            <StripPlot points={points} target={60} avg={42} higherIsBetter unit="%" onSelect={(id) => setHotel(id === hotel ? null : id)} selectedId={hotel} />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl2 bg-ink-50 p-3"><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">At target</div><div className="text-[17px] font-bold text-good-700 tabular-nums">{10 - below}</div></div>
              <div className="rounded-xl2 bg-ink-50 p-3"><div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Below target</div><div className="text-[17px] font-bold text-bad-700 tabular-nums">{below}</div></div>
            </div>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">Zermatt (18%) and Airport Dubai (24%) are the two furthest from the line.</div>
        </Card>
      </div>

      <Card className="flex flex-col">
        <CardHeader title="Monthly diversion rate against the target" hint="% diverted excluding energy recovery · dotted = 60% target" />
        <div className="px-3 pt-3">
          <StackedArea data={trend} xKey="month" height={200} unit="%" series={[{ key: "diversion", name: "Diversion", color: CHART.moss }]} targetKey="target" targetName="Target" yFormat={(v) => `${v}%`} yDomain={[0, 70]} />
        </div>
        <TargetLine baseline="24%" baseYear={2022} current="42%" target="60%" targetYear={2025} gap="18 pp below" status="bad" owner="Marco Rossi" />
      </Card>
    </div>
  );
}

/* ─── ROOT ─────────────────────────────────────────────────────────────────── */

export default function EnvironmentTab() {
  const [section, setSection] = useState<Section>("carbon");
  return (
    <div className="space-y-5">
      <Tabs variant="segmented" ariaLabel="Environment section" items={SECTIONS.map((s) => ({ key: s.key, label: s.label }))} value={section} onChange={(k) => setSection(k as Section)} />
      {section === "carbon" && <CarbonSection />}
      {section === "energy" && <EnergySection />}
      {section === "water" && <WaterSection />}
      {section === "waste" && <WasteSection />}
      <div className="text-[11px] text-ink-400 inline-flex items-center gap-1">Every breakdown reconciles to the portfolio totals; drill into a slice to see it by property. <ChevronRight size={11} /></div>
    </div>
  );
}

/* Scope 2 by month — location-based vs market-based, reconciling to the annual figures above. */
const SCOPE2_MONTHLY = [
  { m: "May", loc: 1130, mkt: 960 }, { m: "Jun", loc: 1240, mkt: 1055 }, { m: "Jul", loc: 1380, mkt: 1175 }, { m: "Aug", loc: 1400, mkt: 1190 },
  { m: "Sep", loc: 1265, mkt: 1075 }, { m: "Oct", loc: 1210, mkt: 1030 }, { m: "Nov", loc: 1140, mkt: 970 }, { m: "Dec", loc: 1180, mkt: 1005 },
  { m: "Jan", loc: 1110, mkt: 945 }, { m: "Feb", loc: 1040, mkt: 885 }, { m: "Mar", loc: 1195, mkt: 1015 }, { m: "Apr", loc: 1279, mkt: 1095 },
];
