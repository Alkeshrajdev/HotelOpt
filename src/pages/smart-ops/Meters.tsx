import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import {
  ASSETS, CONDITIONS, END_USES, METERS, MODE_LABEL, PEAK_DEMAND, SERVICE_EDGES, THRESHOLDS,
  childrenOf, fmt, reconcile, type Resource,
} from "@/lib/smartOps";
import { DataSourcePill, LastUpdated, StatusDot } from "@/components/smart-ops/Shared";

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
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Meter</th>
                  <th className="table-th">Source</th>
                  <th className="table-th text-right">Month to date</th>
                  <th className="table-th text-right">Share</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Last reading</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="table-td font-semibold text-ink-900">{boundary.name}<div className="text-[10px] font-mono text-ink-400">{boundary.id} · billing meter</div></td>
                  <td className="table-td"><DataSourcePill label={boundary.source} /></td>
                  <td className="table-td text-right tabular-nums font-semibold whitespace-nowrap">{fmt(boundary.periodTotal ?? 0)} {unit}</td>
                  <td className="table-td text-right tabular-nums">100%</td>
                  <td className="table-td"><StatusDot status={boundary.status} /></td>
                  <td className="table-td text-ink-500">{boundary.lastReading}</td>
                </tr>
                {children.map((m) => (
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
                    <td className="table-td text-right tabular-nums text-ink-600">{rec.parent ? (((m.periodTotal ?? 0) / rec.parent) * 100).toFixed(1) : "—"}%</td>
                    <td className="table-td"><StatusDot status={m.status} /></td>
                    <td className="table-td text-ink-500">{m.lastReading}</td>
                  </tr>
                ))}
                <tr className="bg-ink-50/60">
                  <td className="table-td font-medium text-ink-700">
                    <div className="flex items-center gap-2"><span className="w-4 border-t border-ink-300 shrink-0" />Unallocated</div>
                    <div className="text-[10px] text-ink-400 pl-6">parent − Σ children · published, never distributed</div>
                  </td>
                  <td className="table-td" />
                  <td className="table-td text-right tabular-nums font-medium text-ink-700 whitespace-nowrap">{rec.status === "failed" ? "not determinable" : `${fmt(rec.unallocated)} ${unit}`}</td>
                  <td className="table-td text-right tabular-nums text-ink-600">{rec.status === "failed" ? "—" : `${rec.unallocatedPct.toFixed(1)}%`}</td>
                  <td className="table-td" colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Reconciliation + coverage gates */}
        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="Reconciliation" hint="Σ sub-meters against the source of record for the same period" />
          <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Cell label="Source of record" value={`${fmt(rec.parent)} ${unit}`} />
              <Cell label="Σ sub-meters" value={`${fmt(rec.children)} ${unit}`} />
              <Cell label="Difference" value={`${rec.differencePct > 0 ? "+" : ""}${rec.differencePct.toFixed(1)}%`} />
              <Cell label="Tolerance" value={`±${THRESHOLDS.reconciliationTolPct}%`} />
            </div>
            <div className="flex items-center justify-between rounded-xl2 bg-ink-50 p-4">
              <div>
                <div className="text-[12px] font-semibold text-ink-900">{rec.status === "reconciled" ? "Reconciled" : rec.status === "over-measured" ? "Over-measured within tolerance" : "Reconciliation failed"}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  {rec.status === "reconciled" && "Sub-meters measure what the invoice measures. Attribution is entitled."}
                  {rec.status === "over-measured" && "Unallocated reported as zero; the excess is disclosed as an over-measurement note."}
                  {rec.status === "failed" && "Attribution suspended for this boundary; a data-quality item names the meters."}
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
        <div className="overflow-x-auto">
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
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${CHART.grid}` }} formatter={(v: number) => [`${fmt(v)} kW`, "Demand"]} />
                  <ReferenceLine y={PEAK_DEMAND.contractedKw} stroke={CHART.reference} strokeDasharray="4 3" label={{ value: "Contracted", position: "insideTopRight", fontSize: 10, fill: CHART.axis }} />
                  <Bar dataKey="kw" fill={CHART.olive} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
              Contracted capacity is a factual observation from the {PEAK_DEMAND.tariffBand}. The platform states it; it does not recommend a contract change.
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-5 flex flex-col">
            <CardHeader title="Outputs & conditions" hint="What the asset ratios need beyond the sub-meter" />
            <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-3">
              {outputs.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-ink-900 truncate">{m.name}</div>
                    <div className="text-[10px] font-mono text-ink-400">{m.id} · {m.kind === "output" ? "cooling output" : "condition / load"} · {m.interval}</div>
                  </div>
                  <StatusDot status={m.status} />
                </div>
              ))}
              <div className="mt-auto rounded-xl2 bg-ink-50 p-4 text-[11px] text-ink-600">
                <div className="font-semibold text-ink-900 text-[12px] mb-1">Wet-bulb {CONDITIONS.wetBulbC} °C · dry-bulb {CONDITIONS.dryBulbC} °C</div>
                {CONDITIONS.source}. Manual overrides this period: {CONDITIONS.manualOverrides.length} ({CONDITIONS.manualOverrides.map((o) => o.date).join(", ")}) — kept as optional entries with reason and author.
              </div>
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

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl2 bg-ink-50 p-3">
      <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">{label}</div>
      <div className="text-[15px] font-bold text-ink-900 tabular-nums mt-0.5">{value}</div>
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
        <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div className={cn("h-full rounded-full", pass ? "bg-chart-olive" : "bg-chart-rose")} style={{ width: `${Math.min(100, value)}%` }} />
        </div>
      </div>
    </div>
  );
}
