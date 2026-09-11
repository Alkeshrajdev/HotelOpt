import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import {
  ASSETS, CONDITIONS, END_USES, METERS, MODE_LABEL, PEAK_DEMAND, SERVICE_EDGES, THRESHOLDS, WETBULB_48H,
  childrenOf, fmt, reconcile, type Resource,
} from "@/lib/smartOps";
import { ChartTip, DataSourcePill, KV, LastUpdated, StatusDot, Swatch } from "@/components/smart-ops/Shared";

const BASIS_TONE = { measured: "good", schedule: "info", assumption: "warn" } as const;
const BASIS_LABEL = { measured: "Measured", schedule: "Evidenced schedule", assumption: "Assumption" } as const;

export default function Meters() {
  const [resource, setResource] = useState<Resource>("electricity");
  const boundaryId = resource === "water" ? "WATER-MAIN" : "ELEC-MAIN";
  const boundary = METERS.find((m) => m.id === boundaryId)!;
  const rec = useMemo(() => reconcile(boundaryId), [boundaryId]);
  const children = childrenOf(boundaryId).sort((a, b) => (b.periodTotal ?? 0) - (a.periodTotal ?? 0));
  const elec = reconcile("ELEC-MAIN");
  const water = reconcile("WATER-MAIN");
  const live = METERS.filter((m) => m.status === "live").length;
  const outputs = METERS.filter((m) => m.kind === "output" || m.kind === "sensor");
  const unit = boundary.unit;
  const largestShare = Math.max(...children.map((m) => (m.periodTotal ?? 0) / (rec.parent || 1)), 0.01);
  const tol = THRESHOLDS.reconciliationTolPct;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Smart operations · metering"
        title="Meters"
        actions={
          <Tabs
            variant="segmented" size="sm" ariaLabel="Resource"
            items={[{ key: "electricity", label: "Electricity" }, { key: "water", label: "Water" }]}
            value={resource} onChange={(k) => setResource(k as Resource)}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Electricity coverage" value={`${Math.round(elec.coveragePct)}%`} hint={`${fmt(elec.unallocated)} kWh unallocated`} />
        <StatTile label="Water coverage" value={`${Math.round(water.coveragePct)}%`} hint={`${fmt(water.unallocated)} m³ unallocated`} />
        <StatTile label="Peak demand" value={`${fmt(PEAK_DEMAND.monthPeakKw)} kW`} hint={`vs ${fmt(PEAK_DEMAND.contractedKw)} kW contracted · ${PEAK_DEMAND.daysAboveContract} days above`} tone="warn" />
        <StatTile label="Meters live" value={`${live} / ${METERS.length}`} hint={`${METERS.filter((m) => m.status === "offline").length} offline · ${METERS.filter((m) => m.status === "delayed").length} delayed`} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Meter tree */}
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Meter tree" hint="Measurement topology — billing meter → sub-meters. What reconciliation and Unallocated use." />
          <div className="overflow-x-auto flex-1 mt-2">
            <table className="w-full table-fixed min-w-[640px]">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Meter</th>
                  <th className="table-th w-[118px]">Source</th>
                  <th className="table-th text-right w-[118px]">Month to date</th>
                  <th className="table-th w-[118px]">Share</th>
                  <th className="table-th w-[148px]">Status · last reading</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="table-td font-semibold text-ink-900"><div className="truncate">{boundary.name}</div><div className="text-[10px] font-mono text-ink-400 truncate">{boundary.id} · billing meter</div></td>
                  <td className="table-td"><DataSourcePill label={boundary.source} /></td>
                  <td className="table-td text-right tabular-nums font-semibold whitespace-nowrap">{fmt(boundary.periodTotal ?? 0)} {unit}</td>
                  <td className="table-td"><ShareCell pct={100} width={100} className="bg-chart-moss" /></td>
                  <td className="table-td whitespace-nowrap"><StatusDot status={boundary.status} /> <span className="text-[11px] text-ink-400 ml-1">{boundary.lastReading}</span></td>
                </tr>
                {children.map((m) => {
                  const pct = rec.parent ? ((m.periodTotal ?? 0) / rec.parent) * 100 : 0;
                  return (
                    <tr key={m.id} className="hover:bg-ink-50/60">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <span className="w-4 border-t border-ink-300 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-ink-900 font-medium truncate">{m.name}</div>
                            <div className="text-[10px] font-mono text-ink-400">{m.id} · {m.interval}{m.gapHours ? ` · gap ${m.gapHours} h` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td"><DataSourcePill label={m.source} /></td>
                      <td className="table-td text-right tabular-nums whitespace-nowrap">{fmt(m.periodTotal ?? 0)} {unit}</td>
                      <td className="table-td"><ShareCell pct={pct} width={(pct / 100 / largestShare) * 100} className="bg-chart-olive" /></td>
                      <td className="table-td whitespace-nowrap"><StatusDot status={m.status} /> <span className="text-[11px] text-ink-400 ml-1">{m.lastReading}</span></td>
                    </tr>
                  );
                })}
                <tr className="bg-ink-50/60">
                  <td className="table-td font-medium text-ink-700">
                    <div className="flex items-center gap-2"><span className="w-4 border-t border-ink-300 shrink-0" />Unallocated</div>
                    <div className="text-[10px] text-ink-400 pl-6">parent − Σ children · published, never distributed</div>
                  </td>
                  <td className="table-td" />
                  <td className="table-td text-right tabular-nums font-medium text-ink-700 whitespace-nowrap">{rec.status === "failed" ? "not determinable" : `${fmt(rec.unallocated)} ${unit}`}</td>
                  <td className="table-td">{rec.status === "failed" ? <span className="text-ink-400">—</span> : <ShareCell pct={rec.unallocatedPct} width={(rec.unallocatedPct / 100 / largestShare) * 100} className="bg-chart-remainder" />}</td>
                  <td className="table-td" />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Reconciliation + coverage gates */}
        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="Reconciliation" hint="Σ sub-meters against the source of record for the same period" />
          <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-5">
            <div className="space-y-3">
              <BalanceRow label="Source of record" value={`${fmt(rec.parent)} ${unit}`}>
                <div className="h-3 rounded-full bg-chart-moss w-full" />
              </BalanceRow>
              <BalanceRow label="Σ sub-meters" value={`${fmt(rec.children)} ${unit}`}>
                <div className="relative">
                  <div className="flex h-3 gap-px rounded-full overflow-hidden bg-white">
                    {children.map((m) => (
                      <span key={m.id} className="h-full bg-chart-olive" style={{ width: `${((m.periodTotal ?? 0) / (rec.parent || 1)) * 100}%` }} title={`${m.name} · ${fmt(m.periodTotal ?? 0)} ${unit}`} />
                    ))}
                    {rec.unallocated > 0 && <span className="h-full bg-chart-remainder" style={{ width: `${rec.unallocatedPct}%` }} title={`Unallocated · ${fmt(rec.unallocated)} ${unit}`} />}
                  </div>
                  <span className="absolute -top-1 -bottom-1 border-x border-ink-400/70" style={{ left: `${100 - tol}%`, width: `${tol}%` }} title={`Over-measurement tolerance ±${tol}%`} />
                </div>
              </BalanceRow>
              <div className="flex items-center gap-4 flex-wrap">
                <Swatch className="bg-chart-moss" label="Billed record" />
                <Swatch className="bg-chart-olive" label="Sub-meters (one segment each)" />
                <Swatch className="bg-chart-remainder" label="Unallocated" />
              </div>
            </div>

            <div className="rounded-xl2 bg-ink-50 p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-ink-900">
                  {rec.status === "reconciled" ? "Reconciled" : rec.status === "over-measured" ? "Over-measured within tolerance" : "Reconciliation failed"}
                </div>
                <div className="text-[11px] text-ink-500 mt-0.5 leading-snug">
                  {rec.status === "reconciled" && `Sub-meters sit ${Math.abs(rec.differencePct).toFixed(1)}% ${rec.differencePct < 0 ? "below" : "above"} the record; the gap is Unallocated. Attribution is entitled.`}
                  {rec.status === "over-measured" && "Unallocated reported as zero; the excess is disclosed as an over-measurement note."}
                  {rec.status === "failed" && "Attribution suspended for this boundary; a data-quality item names the meters."}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <KV label="Difference" value={`${rec.differencePct > 0 ? "+" : ""}${rec.differencePct.toFixed(1)}%`} />
                  <KV label="Tolerance · over-measurement" value={`±${tol}%`} />
                </div>
              </div>
              <Badge tone={rec.status === "reconciled" ? "good" : rec.status === "over-measured" ? "warn" : "bad"}>{rec.status === "reconciled" ? "Pass" : rec.status === "over-measured" ? "Note" : "Fail"}</Badge>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-2">Coverage gate for end-use statements</div>
              <Gate label="Parent coverage" value={rec.coveragePct} min={THRESHOLDS.parentCoverageMinPct} />
              <Gate label="End-use separation (evidenced edges)" value={100} min={THRESHOLDS.endUseSeparationMinPct} />
            </div>
            <div className="mt-auto text-[11px] text-ink-500">
              Where sub-meters and the bill disagree, the bill governs every reported figure. Interval data stays in the time-series store.
            </div>
          </div>
        </Card>
      </div>

      {/* Service mapping */}
      <Card>
        <CardHeader title="Service mapping" hint="What each meter measures — the graph reconciliation does not use. Each edge carries its mode and the basis for its share." />
        <div className="overflow-x-auto mt-2">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Meter</th>
                <th className="table-th">Measures</th>
                <th className="table-th">Mode</th>
                <th className="table-th text-right">Share</th>
                <th className="table-th">Basis</th>
                <th className="table-th">Since</th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_EDGES.filter((e) => METERS.find((m) => m.id === e.meterId)?.resource === resource).map((e, i) => {
                const m = METERS.find((x) => x.id === e.meterId)!;
                const target = e.target.type === "asset" ? ASSETS.find((a) => a.id === e.target.id)?.name : END_USES.find((u) => u.id === e.target.id)?.label;
                return (
                  <tr key={`${e.meterId}-${i}`} className="hover:bg-ink-50/60">
                    <td className="table-td"><div className="text-ink-900 font-medium">{m.name}</div><div className="text-[10px] font-mono text-ink-400">{m.id}</div></td>
                    <td className="table-td"><Badge tone={e.target.type === "asset" ? "brand" : "neutral"}>{e.target.type === "asset" ? "Asset" : "End-use"}</Badge> <span className="ml-1.5">{target}</span></td>
                    <td className="table-td text-ink-700">{MODE_LABEL[e.mode]}</td>
                    <td className="table-td text-right tabular-nums">{Math.round(e.share * 100)}%</td>
                    <td className="table-td"><Badge tone={BASIS_TONE[e.basis]}>{BASIS_LABEL[e.basis]}</Badge></td>
                    <td className="table-td text-ink-500">{e.since}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
          A split by assumption counts toward a combined group, never toward a named end-use. Splits need a metered sub-split, a load survey, or a manufacturer schedule with recorded runtime.
        </div>
      </Card>

      {resource === "electricity" ? (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-7 flex flex-col">
            <CardHeader title="Peak demand — electricity boundary" hint={`Month peak ${fmt(PEAK_DEMAND.monthPeakKw)} kW at ${PEAK_DEMAND.at} · contracted ${fmt(PEAK_DEMAND.contractedKw)} kW`} right={<LastUpdated text="15-min · 2 min ago" />} />
            <div className="px-4 pb-4 pt-2 flex-1">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={PEAK_DEMAND.profile} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="h" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<ChartTip unit="kW" />} cursor={{ fill: CHART.grid }} />
                  <ReferenceLine y={PEAK_DEMAND.contractedKw} stroke={CHART.reference} strokeDasharray="4 3" label={{ value: "Contracted", position: "insideTopRight", fontSize: 10, fill: CHART.axis }} />
                  <Bar dataKey="kw" name="Demand" fill={CHART.olive} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
              Contracted capacity is a factual observation from the {PEAK_DEMAND.tariffBand}. The platform states it; it does not recommend a contract change.
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-5 flex flex-col">
            <CardHeader title="Outputs & conditions" hint="What the asset ratios need beyond the sub-meter" />
            <div className="px-6 pt-4 flex flex-col gap-1">
              {outputs.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-ink-100 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink-900 truncate">{m.name}</div>
                    <div className="text-[10px] font-mono text-ink-400">{m.id} · {m.kind === "output" ? "cooling output" : "condition / load"} · {m.interval}</div>
                  </div>
                  <StatusDot status={m.status} />
                </div>
              ))}
            </div>
            <div className="px-6 pt-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Wet-bulb · last 48 h</div>
                <div className="text-[12px] text-ink-500">{CONDITIONS.source}</div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-bold text-ink-900 tabular-nums leading-none">{CONDITIONS.wetBulbC} °C</div>
                <div className="text-[10px] text-ink-400 mt-1">dry-bulb {CONDITIONS.dryBulbC} °C</div>
              </div>
            </div>
            <div className="px-3 pt-1 pb-1 flex-1">
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={WETBULB_48H} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="h" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={11} />
                  <YAxis domain={[24, 30]} ticks={[24, 27, 30]} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTip unit="°C" />} />
                  <Area type="monotone" dataKey="wb" name="Wet-bulb" stroke={CHART.mauve} strokeWidth={1.75} fill={CHART.blush} fillOpacity={0.5} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
              Manual overrides this period: {CONDITIONS.manualOverrides.length} ({CONDITIONS.manualOverrides.map((o) => o.date).join(", ")}) — kept as optional entries with reason and author.
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader title="Water boundary" hint="Hourly on the main meter; risers and process meters hourly or daily" />
          <div className="px-6 pb-6 pt-2 text-[12px] text-ink-600">
            Night-flow facts are computed per riser between 01:00 and 06:00 against a ≤ 0.1 m³/h expectation with no scheduled use. Open facts appear under Alerts.
          </div>
        </Card>
      )}
    </div>
  );
}

function ShareCell({ pct, width, className }: { pct: number; width: number; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-14 shrink-0 rounded-full bg-ink-100 overflow-hidden">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.max(2, Math.min(100, width))}%` }} />
      </div>
      <span className="text-[11px] text-ink-600 tabular-nums w-11 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

function BalanceRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr_auto] items-center gap-3">
      <span className="text-[11px] text-ink-600">{label}</span>
      {children}
      <span className="text-[12px] font-semibold text-ink-900 tabular-nums whitespace-nowrap w-24 text-right">{value}</span>
    </div>
  );
}

function Gate({ label, value, min }: { label: string; value: number; min: number }) {
  const pass = value >= min;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-ink-700">{label}</span>
          <span className={cn("font-semibold tabular-nums", pass ? "text-good-700" : "text-bad-700")}>{Math.round(value)}% <span className="text-ink-400 font-normal">/ min {min}%</span></span>
        </div>
        <div className="relative h-1.5 rounded-full bg-ink-100 overflow-visible">
          <div className={cn("h-full rounded-full", pass ? "bg-chart-olive" : "bg-chart-rose")} style={{ width: `${Math.min(100, value)}%` }} />
          <span className="absolute -top-1 -bottom-1 w-px bg-ink-400" style={{ left: `${min}%` }} title={`Minimum ${min}%`} />
        </div>
      </div>
    </div>
  );
}
