import { useMemo, useState } from "react";
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import { Layers } from "lucide-react";
import { CHART } from "@/lib/chartPalette";
import {
  DEVIATIONS, END_USES, KITCHEN, KITCHEN_NIGHT, LAUNDRY, LAUNDRY_DAILY, LAUNDRY_THROUGHPUT_SOURCE, LIGHTING, LIGHTING_PROFILE, ROOMS_DAILY,
  THRESHOLDS, defaultReference, fmt, reconcile, type RefKind, type Resource,
} from "@/lib/smartOps";
import { FactRow, KV, LevelBadge, ReferencePicker } from "@/components/smart-ops/Shared";
import { attribution } from "./SmartOpsOverview";

const TIP = { fontSize: 12, borderRadius: 12, border: `1px solid ${CHART.grid}` } as const;

export default function EndUses() {
  const [resource, setResource] = useState<Resource>("electricity");
  const [byDept, setByDept] = useState(false);
  const [lightRef, setLightRef] = useState<RefKind>(defaultReference(LIGHTING.references));
  const [throughput, setThroughput] = useState<string>(LAUNDRY_THROUGHPUT_SOURCE.active);

  const attr = useMemo(() => attribution(resource), [resource]);
  const rec = reconcile(resource === "water" ? "WATER-MAIN" : "ELEC-MAIN");
  const metered = attr.rows.length;
  const combined = attr.rows.filter((r) => r.endUse.combined).length;
  const facts = DEVIATIONS.filter((d) => d.resource === resource && d.target.type !== "meter");

  const rows = useMemo(() => {
    if (!byDept) return attr.rows.map((r) => ({ key: r.endUse.id, label: r.endUse.label, sub: r.endUse.department + (r.endUse.combined ? " · combined group" : ""), total: r.total, pct: r.pct, level: r.level }));
    const map = new Map<string, number>();
    attr.rows.forEach((r) => map.set(r.endUse.department, (map.get(r.endUse.department) ?? 0) + r.total));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([d, t]) => ({ key: d, label: d, sub: `${attr.rows.filter((r) => r.endUse.department === d).length} end-use(s)`, total: t, pct: rec.parent ? (t / rec.parent) * 100 : 0, level: null }));
  }, [attr, byDept, rec.parent]);
  const max = Math.max(...rows.map((r) => r.total), rec.unallocated);

  // Lighting expected profile scales with the reference's daily kWh
  const lightScale = LIGHTING.dailyKwh[lightRef] / LIGHTING.dailyKwh.baseline;
  const lightData = LIGHTING_PROFILE.map((p) => ({ ...p, expected: +(p.expected * lightScale).toFixed(1) }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Smart operations · attribution"
        title="End-uses"
        actions={
          <Tabs variant="segmented" size="sm" ariaLabel="Resource"
            items={[{ key: "electricity", label: "Electricity" }, { key: "water", label: "Water" }]}
            value={resource} onChange={(k) => setResource(k as Resource)} />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Metered end-uses" value={String(metered)} hint={`of ${END_USES.filter((e) => e.resources.includes(resource)).length} in the taxonomy`} />
        <StatTile label="Combined groups" value={String(combined)} hint={combined ? "reported as the group, never split by assumption" : "every end-use separated"} />
        <StatTile label="Unallocated" value={`${rec.unallocatedPct.toFixed(1)}%`} hint={`${fmt(rec.unallocated)} ${attr.unit} · published on its own line`} />
        <StatTile label="Diagnostic level" value="L2" hint={`coverage ${Math.round(rec.coveragePct)}% · separation ≥ ${THRESHOLDS.endUseSeparationMinPct}%`} tone="info" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader
            title={byDept ? "By department" : "By end-use"}
            hint="Month to date · the reconciled parent total is the denominator"
            right={
              <Tabs variant="segmented" size="sm" ariaLabel="Group by"
                items={[{ key: "enduse", label: "End-use" }, { key: "dept", label: "Department" }]}
                value={byDept ? "dept" : "enduse"} onChange={(k) => setByDept(k === "dept")} />
            }
          />
          <div className="px-6 pt-4 pb-2 flex-1 space-y-2.5">
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[176px_1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-ink-900 truncate">{r.label}</div>
                  <div className="text-[10px] text-ink-400 truncate">{r.sub}</div>
                </div>
                <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full rounded-full bg-chart-olive" style={{ width: `${(r.total / max) * 100}%` }} />
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-[12px] font-semibold text-ink-900 w-20 text-right">{fmt(Math.round(r.total))} {attr.unit}</span>
                  <span className="text-[11px] text-ink-500 w-10 text-right">{r.pct.toFixed(1)}%</span>
                  {r.level ? <LevelBadge level={r.level.level} coveragePct={r.level.coveragePct} separationPct={r.level.separationPct} /> : <span className="w-[26px]" />}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-[176px_1fr_auto] items-center gap-3 pt-2 border-t border-ink-100">
              <div className="text-[12px] font-medium text-ink-600">Unallocated</div>
              <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden"><div className="h-full rounded-full bg-chart-remainder" style={{ width: `${(rec.unallocated / max) * 100}%` }} /></div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-[12px] font-semibold text-ink-700 w-20 text-right">{fmt(rec.unallocated)} {attr.unit}</span>
                <span className="text-[11px] text-ink-500 w-10 text-right">{rec.unallocatedPct.toFixed(1)}%</span>
                <span className="w-[26px]" />
              </div>
            </div>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            An L2 statement may say where a variance is concentrated. It may not name a cause, an asset, or a saving.
          </div>
        </Card>

        {resource === "electricity" ? (
          <Card className="col-span-12 lg:col-span-5 flex flex-col">
            <CardHeader title="Lighting — daily profile" hint="Average of the last 7 days vs the selected reference (kW)" />
            <div className="px-6 pt-3 flex items-center justify-between gap-3 flex-wrap">
              <ReferencePicker refs={LIGHTING.references} value={lightRef} onChange={setLightRef} />
              <span className="text-[11px] text-ink-500">Installed {LIGHTING.installedLoadKw.common + LIGHTING.installedLoadKw.facade} kW</span>
            </div>
            <div className="px-3 pt-3 pb-2 flex-1">
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={lightData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="h" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={TIP} />
                  <Area type="monotone" dataKey="expected" name="Expected" stroke={CHART.reference} fill={CHART.sage} fillOpacity={0.6} strokeDasharray="4 3" isAnimationActive={false} />
                  <Line type="monotone" dataKey="measured" name="Measured" stroke={CHART.olive} strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-3 gap-3">
              <KV label="Measured / day" value={`${fmt(LIGHTING.dailyKwh.measured)} kWh`} />
              <KV label={`${lightRef === "design" ? "Design" : lightRef === "commissioned" ? "Commissioned" : "Baseline"} / day`} value={`${fmt(LIGHTING.dailyKwh[lightRef])} kWh`} />
              <KV label="Schedule" value={LIGHTING.schedule.split(" · ")[1]} />
            </div>
          </Card>
        ) : (
          <Card className="col-span-12 lg:col-span-5 flex flex-col">
            <CardHeader title="Laundry — water intensity" hint="Litres per kg processed, daily, vs own baseline" />
            <div className="px-3 pt-3 pb-2 flex-1">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={LAUNDRY_DAILY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis domain={[11, 16]} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={TIP} />
                  <ReferenceLine y={LAUNDRY.lPerKg.baseline} stroke={CHART.reference} strokeDasharray="4 3" label={{ value: "Baseline", position: "insideBottomRight", fontSize: 10, fill: CHART.axis }} />
                  <ReferenceLine y={LAUNDRY.lPerKg.design} stroke={CHART.reference} strokeDasharray="2 3" label={{ value: "Design", position: "insideBottomRight", fontSize: 10, fill: CHART.axis }} />
                  <Line type="monotone" dataKey="lPerKg" name="L/kg" stroke={CHART.mauve} strokeWidth={2} dot={{ r: 2.5, fill: CHART.mauve }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-3 gap-3">
              <KV label="Measured" value={`${LAUNDRY.lPerKg.measured} L/kg`} />
              <KV label="Baseline" value={`${LAUNDRY.lPerKg.baseline} L/kg`} />
              <KV label="Design" value={`${LAUNDRY.lPerKg.design} L/kg`} />
            </div>
          </Card>
        )}
      </div>

      {resource === "electricity" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="flex flex-col">
            <CardHeader title="Guest rooms — per occupied room night" hint="kWh/ORN · last 14 days vs baseline at the same occupancy band" />
            <div className="px-3 pt-3 flex-1">
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={ROOMS_DAILY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis domain={[12, 15]} ticks={[12, 13, 14, 15]} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={TIP} />
                  <Line type="monotone" dataKey="expected" name="Expected" stroke={CHART.reference} strokeDasharray="4 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="kwhPerOrn" name="Measured" stroke={CHART.olive} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-2 gap-3">
              <KV label="Measured" value="14.2 kWh/ORN" />
              <KV label="Baseline · same band" value="13.0 kWh/ORN" />
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader title="Kitchen — night baseload" hint="01:00–05:00 average kW · the step on 28 Apr" />
            <div className="px-3 pt-3 flex-1">
              <ResponsiveContainer width="100%" height={170}>
                <ComposedChart data={KITCHEN_NIGHT} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis domain={[0, 30]} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={TIP} />
                  <ReferenceLine y={KITCHEN.nightExpectedKw} stroke={CHART.reference} strokeDasharray="4 3" />
                  <Bar dataKey="kw" name="Night kW" fill={CHART.olive} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-2 gap-3">
              <KV label="Per cover · month" value={`${KITCHEN.kwhPerCover} kWh`} />
              <KV label="Baseline" value={`${KITCHEN.baselineKwhPerCover} kWh`} />
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader title="Laundry — intensity vs volume" hint="kWh per kg against daily kg processed" />
            <div className="px-6 pt-3">
              <select className="input h-8 text-[12px] w-full" value={throughput} onChange={(e) => setThroughput(e.target.value)} aria-label="Throughput source">
                {LAUNDRY_THROUGHPUT_SOURCE.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="px-3 pt-2 flex-1">
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={LAUNDRY_DAILY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis yAxisId="kg" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={34} />
                  <YAxis yAxisId="int" orientation="right" domain={[1.3, 1.9]} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={TIP} />
                  <Bar yAxisId="kg" dataKey="kg" name="kg" fill={CHART.sage} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <ReferenceLine yAxisId="int" y={LAUNDRY.kwhPerKg.baseline} stroke={CHART.reference} strokeDasharray="4 3" />
                  <Line yAxisId="int" type="monotone" dataKey="kwhPerKg" name="kWh/kg" stroke={CHART.olive} strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-3 gap-3">
              <KV label="Measured" value={`${LAUNDRY.kwhPerKg.measured} kWh/kg`} />
              <KV label="Baseline" value={`${LAUNDRY.kwhPerKg.baseline} kWh/kg`} />
              <KV label="Source" value={throughput.startsWith("Manual") ? `Manual log · ${LAUNDRY_THROUGHPUT_SOURCE.manualEntriesThisMonth} entries` : `Feed · ${LAUNDRY_THROUGHPUT_SOURCE.lastFeed}`} />
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title={`Facts — ${resource}`} hint="Deviations stated at the level the metering entitles" right={<Badge tone="neutral">{facts.length}</Badge>} />
        <div className="p-6 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {facts.length === 0 && (
            <div className="lg:col-span-2"><EmptyState inset icon={<Layers size={20} />} title="No deviations for this resource" description="Every metered end-use is within its expected range and the quantity floor." /></div>
          )}
          {facts.map((f) => <FactRow key={f.id} fact={f} />)}
        </div>
      </Card>
    </div>
  );
}
