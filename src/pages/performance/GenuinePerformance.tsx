/**
 * Genuine performance — one property, one pillar. Measured → Expected → Genuine
 * from the GP engine, so the waterfall, the drivers and the monthly chart all
 * reconcile to the same raw change for the property in the top bar.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarPlus, FlaskConical } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import RawVsGPChart from "@/components/charts/RawVsGPChart";
import { useToast } from "@/components/ui/Toast";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { useTopbar } from "@/lib/topbarContext";
import {
  GP_EVENTS, GP_INITIATIVES, GP_UTILITY_META, gpBridge, gpCostImpact, gpMonthly, gpResult, type GpUtility,
} from "@/lib/genuinePerformance";
import type { PillarKey } from "./Shell";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtUsd = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${Math.round(a)}`;
  return v < 0 ? `−${s}` : s;
};
const fmtQty = (v: number, u: GpUtility) => (u === "waste" ? v.toLocaleString("en-US", { maximumFractionDigits: 1 }) : Math.round(v).toLocaleString("en-US"));
const kFmt = (v: number) => (Math.abs(v) >= 10000 ? `${Math.round(v / 1000)}k` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));
const BRIDGE_FILL = { total: CHART.prior, external: CHART.mauve, "genuine-good": CHART.olive, "genuine-bad": CHART.rose } as const;

export default function GenuinePerformance({ pillar }: { pillar: PillarKey }) {
  const { propertyName, year } = useTopbar();
  const toast = useToast();
  const utility = pillar as GpUtility;
  const meta = GP_UTILITY_META[utility];
  const r = gpResult(propertyName, utility);
  const monthly = useMemo(() => gpMonthly(propertyName, utility), [propertyName, utility]);
  const cost = gpCostImpact(propertyName);
  const usd = cost.byUtility.find((c) => c.utility === utility)?.impactUsd;
  const events = GP_EVENTS.filter((e) => e.property === propertyName && e.pillars.includes(utility));
  const initiatives = GP_INITIATIVES[utility].filter((i) => i.startYear <= year && (i.endYear === null || i.endYear >= year));

  if (!r) {
    return <EmptyState icon={<FlaskConical size={20} />} title="No genuine performance yet" description={`${propertyName} has no baseline year on record for ${meta.label.toLowerCase()}.`} />;
  }

  const bridge = gpBridge(r);
  const lows = bridge.map((s) => (s.kind === "total" ? s.value : s.base));
  const highs = bridge.map((s) => s.base + s.value);
  const lowest = Math.min(...lows);
  const highest = Math.max(...highs);
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(1, (highest - lowest * 0.9) / 4))));
  const lo = Math.floor((lowest * 0.9) / step) * step;
  const hi = Math.ceil((highest * 1.03) / step) * step;
  const drivers = r.decomposition.filter((d) => d.key !== "genuine");
  const genuine = r.decomposition.find((d) => d.key === "genuine")!;
  const maxAbs = Math.max(...r.decomposition.map((d) => Math.abs(d.pct)), 0.1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Measured" value={`${fmtQty(r.measured, utility)} ${meta.unit}`} hint={`this year · raw ${pct(r.rawPct)} vs last year`} />
        <StatTile label="Expected" value={`${fmtQty(r.expected, utility)} ${meta.unit}`} hint="last year, with this year's weather, occupancy and activity" tone="info" />
        <StatTile label="Genuine change" value={pct(r.genuinePct)} hint="measured vs expected · negative = a real efficiency gain" tone={r.genuinePct <= 0 ? "good" : "bad"} />
        <StatTile
          label="$ impact / yr"
          value={usd === undefined ? "—" : fmtUsd(usd)}
          hint={usd === undefined ? "carbon is an emission, not a bill" : usd > 0 ? "used more than expected · recoverable" : "saved against expected"}
          tone={usd === undefined ? "neutral" : usd > 0 ? "bad" : "good"}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="From last year to this year" hint={`${meta.unit} · the drivers explain part of the change; genuine is what they don't`} />
          <div className="px-3 pt-3 flex-1">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bridge} margin={{ top: 20, right: 12, left: 0, bottom: 0 }} barCategoryGap="26%">
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[lo, hi]} allowDataOverflow tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={44} tickFormatter={kFmt} />
                <Tooltip cursor={{ fill: CHART.grid }} content={<BridgeTip unit={meta.unit} utility={utility} />} />
                <Bar dataKey="base" name="_base" stackId="b" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="value" name="Value" stackId="b" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {bridge.map((s, i) => <Cell key={i} fill={BRIDGE_FILL[s.kind]} />)}
                  <LabelList dataKey="delta" position="top" style={{ fontSize: 10, fill: CHART.label, fontWeight: 600 }} formatter={(v: number) => (bridge.find((s) => s.delta === v)?.kind === "total" ? fmtQty(v, utility) : `${v > 0 ? "+" : "−"}${fmtQty(Math.abs(v), utility)}`)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center gap-4 flex-wrap text-[11px] text-ink-600">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-prior" />Last year · this year</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-mauve" />External drivers</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-olive" />Genuine gain</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-rose" />Genuine overspend</span>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="What drove the change" hint={`Raw ${pct(r.rawPct)} = weather + occupancy + activity + genuine`} />
          <div className="px-6 pt-4 pb-2 flex-1 space-y-3">
            {[...drivers, genuine].map((d) => {
              const w = (Math.abs(d.pct) / maxAbs) * 50;
              const isGenuine = d.key === "genuine";
              return (
                <div key={d.key} className={cn("grid grid-cols-[136px_1fr_auto] items-center gap-3", isGenuine && "pt-3 border-t border-ink-100")}>
                  <span className={cn("text-[12px] truncate", isGenuine ? "font-semibold text-ink-900" : "text-ink-700")}>{d.label.replace(/ \(.*\)$/, "")}</span>
                  <span className="relative block h-2.5 rounded-full bg-ink-100">
                    <span className="absolute inset-y-0 w-px bg-ink-500" style={{ left: "50%" }} />
                    <span
                      className={cn("absolute inset-y-0 rounded-full", isGenuine ? (d.pct <= 0 ? "bg-chart-olive" : "bg-chart-rose") : "bg-chart-mauve")}
                      style={d.pct <= 0 ? { right: "50%", width: `${Math.max(1, w)}%` } : { left: "50%", width: `${Math.max(1, w)}%` }}
                    />
                  </span>
                  <span className={cn("text-[12px] font-semibold tabular-nums w-14 text-right", isGenuine ? (d.pct <= 0 ? "text-good-700" : "text-bad-700") : "text-ink-900")}>{pct(d.pct)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Percentage points of last year's consumption. Expected = last year scaled by how each driver moved; sensitivities are documented assumptions. Genuine is the own-history lens only, never used for external comparison.
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Raw vs genuine, by month" hint="% better than the same month last year · raw swings with the weather, genuine is the underlying signal" />
          <div className="px-4 pb-4 pt-2 flex-1">
            <RawVsGPChart data={monthly} />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader
            title="Events on the timeline"
            hint="Non-routine changes at this property · genuine is recalculated before and after each"
            right={<button className="btn-secondary h-8 px-3 text-[12px]" onClick={() => toast.info("Event logging opens the property's configuration")}><CalendarPlus size={13} /> Log event</button>}
          />
          <div className="px-6 pt-4 pb-6 flex-1 flex flex-col">
            {events.length === 0 ? (
              <EmptyState inset icon={<CalendarPlus size={20} />} title="No events logged" description={`Nothing non-routine is recorded for ${meta.label.toLowerCase()} at ${propertyName}.`} />
            ) : (
              <ol className="relative pl-5 space-y-4 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-ink-200">
                {events.map((e) => (
                  <li key={`${e.date}-${e.event}`} className="relative">
                    <span className="absolute -left-5 top-[3px] w-[11px] h-[11px] rounded-full bg-white ring-2 ring-chart-cocoa" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-ink-400">{e.date}</span>
                      <Badge tone={e.status === "Approved" ? "good" : "warn"}>{e.status}</Badge>
                    </div>
                    <div className="text-[12px] font-semibold text-ink-900 mt-0.5">{e.event}</div>
                    <div className="text-[11px] text-ink-500">{e.desc}</div>
                    <div className="flex gap-1 mt-1.5">{e.pillars.map((p) => <Badge key={p} tone="neutral">{GP_UTILITY_META[p].label}</Badge>)}</div>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-auto pt-4 text-[11px] text-ink-500">Approved events become non-routine adjustments; pending ones are shown but not applied.</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`Initiatives active in ${year}`}
          hint="What the property is doing about it · potential is the project's own estimate, not a verified saving"
          right={<Link to="/actions" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-900">Actions <ArrowRight size={13} /></Link>}
        />
        <div className="divide-y divide-ink-100 mt-2">
          {initiatives.length === 0 && (
            <div className="px-6 py-8 text-center text-[13px] text-ink-400">No initiatives recorded for {year}.</div>
          )}
          {initiatives.map((init) => {
            const start = `${MONTH_SHORT[init.startMonth - 1]} ${init.startYear}`;
            const range = init.endYear ? `${start} – ${MONTH_SHORT[init.endMonth! - 1]} ${init.endYear}` : `${start} – ongoing`;
            return (
              <div key={init.name} className="px-6 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-ink-900">{init.name}</span>
                    <Badge tone="neutral">{init.category}</Badge>
                  </div>
                  <div className="text-[11px] text-ink-400 mt-0.5">{range}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-semibold text-ink-700 tabular-nums">{init.savingPotential}</div>
                  <div className="text-[10px] text-ink-400">est. potential</div>
                </div>
                <Badge tone={init.status === "completed" ? "good" : "warn"}>{init.status === "completed" ? "Completed" : "Active"}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function BridgeTip({ active, payload, unit, utility }: { active?: boolean; payload?: { payload: { name: string; kind: string; delta: number } }[]; unit: string; utility: GpUtility }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const total = d.kind === "total";
  return (
    <div className="popover rounded-xl px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-900">{d.name}</div>
      <div className={cn("tabular-nums", total ? "text-ink-700" : d.kind === "genuine-good" ? "text-good-700" : d.kind === "genuine-bad" ? "text-bad-700" : "text-ink-700")}>
        {total ? "" : d.delta > 0 ? "+" : "−"}{fmtQty(Math.abs(d.delta), utility)} {unit}
      </div>
    </div>
  );
}
