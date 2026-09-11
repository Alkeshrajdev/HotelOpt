import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { MV_MEASURES, MV_MONTHLY, fmt, type MvMeasure } from "@/lib/smartOps";
import { KV, LevelBadge } from "@/components/smart-ops/Shared";

const STATUS_TONE: Record<MvMeasure["status"], "neutral" | "info" | "warn" | "good" | "brand"> = {
  "awaiting-approval": "warn", implemented: "neutral", monitoring: "info", verified: "good", reported: "brand",
};
const STATUS_LABEL: Record<MvMeasure["status"], string> = {
  "awaiting-approval": "Awaiting plan approval", implemented: "Implemented", monitoring: "Monitoring", verified: "Verified", reported: "Reported",
};
const OPTION_TEXT: Record<MvMeasure["option"], string> = {
  A: "A — retrofit isolation, key parameter measured",
  B: "B — retrofit isolation, all parameters measured",
  C: "C — whole facility",
  D: "D — calibrated simulation",
};

export default function Verification() {
  const [resource, setResource] = useState<"all" | "electricity" | "water">("all");
  const [selectedId, setSelectedId] = useState(MV_MEASURES[0].id);
  const list = MV_MEASURES.filter((m) => resource === "all" || m.resource === resource);
  const sel = MV_MEASURES.find((m) => m.id === selectedId)!;
  const signed = MV_MEASURES.filter((m) => m.status === "verified" || m.status === "reported");
  const kwh = signed.filter((m) => m.resource === "electricity").reduce((s, m) => s + (m.result?.saving ?? 0), 0);
  const m3 = signed.filter((m) => m.resource === "water").reduce((s, m) => s + (m.result?.saving ?? 0), 0);
  const monitoring = MV_MEASURES.filter((m) => m.status === "monitoring").length;
  const implemented = MV_MEASURES.filter((m) => m.status === "implemented").length;
  const awaiting = MV_MEASURES.filter((m) => m.status === "awaiting-approval").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Smart operations · measurement & verification"
        title="Verification"
        actions={
          <Tabs variant="segmented" size="sm" ariaLabel="Resource"
            items={[{ key: "all", label: "All" }, { key: "electricity", label: "Electricity" }, { key: "water", label: "Water" }]}
            value={resource} onChange={(k) => setResource(k as typeof resource)} />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Signed measures" value={String(signed.length)} hint="L4 · approved plan · named signatory" tone="good" />
        <StatTile label="Verified · electricity" value={`${fmt(kwh)} kWh`} hint="Σ signed savings, reporting periods" />
        <StatTile label="Verified · water" value={`${fmt(m3)} m³`} hint="Σ signed savings, reporting periods" />
        <StatTile label="In monitoring" value={String(monitoring)} hint={`${implemented} implemented · ${awaiting} awaiting approval`} tone="info" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Measures" hint="A figure appears only once the plan is approved, the period reconciles and a signatory has signed" />
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Measure</th>
                  <th className="table-th">Option</th>
                  <th className="table-th">Reporting period</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Verified saving</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} onClick={() => setSelectedId(m.id)} className={cn("cursor-pointer hover:bg-ink-50/60", m.id === selectedId && "bg-ink-50")}>
                    <td className="table-td">
                      <div className="font-medium text-ink-900">{m.name}</div>
                      <div className="text-[10px] font-mono text-ink-400">{m.id} · {m.code} · {m.target}</div>
                    </td>
                    <td className="table-td">{m.option}</td>
                    <td className="table-td text-ink-600">{m.reportingPeriod}</td>
                    <td className="table-td"><Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge></td>
                    <td className="table-td text-right tabular-nums font-semibold text-ink-900">
                      {m.result ? `${fmt(m.result.saving)} ${m.result.unit}` : <span className="text-ink-400 font-normal">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Nothing here is projected, estimated or indicative. A measure without a signed result shows no figure.
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader
            title={sel.name}
            hint={`${sel.property} · ${sel.target}`}
            right={sel.result ? <LevelBadge level="L4" /> : <Badge tone={STATUS_TONE[sel.status]}>{STATUS_LABEL[sel.status]}</Badge>}
          />
          <div className="px-6 pb-6 pt-3 flex-1 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <KV label="IPMVP option" value={OPTION_TEXT[sel.option]} />
              <KV label="Interval" value={sel.interval} />
              <KV label="Baseline period" value={sel.baselinePeriod} />
              <KV label="Reporting period" value={sel.reportingPeriod} />
              {sel.fit && <KV label="Model fit" value={`CV(RMSE) ${sel.fit.cvrmse}% · NMBE ${sel.fit.nmbe > 0 ? "+" : ""}${sel.fit.nmbe}%`} />}
              {sel.signatory && <KV label="Signed" value={`${sel.signatory} · ${sel.signedOn}`} />}
            </div>

            {sel.result ? (
              <div className="rounded-xl2 bg-ink-50 p-4">
                <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-2">Result — the six lines, published together</div>
                <dl className="text-[12px] divide-y divide-ink-200/70">
                  <Line k="Raw change vs same period, baseline year" v={`${sel.result.rawChange > 0 ? "+" : ""}${fmt(sel.result.rawChange)} ${sel.result.unit}`} />
                  <Line k={`Routine adjustment — ${sel.result.routine.variables}`} v={`${sel.result.routine.qty > 0 ? "+" : ""}${fmt(sel.result.routine.qty)} ${sel.result.unit}`} />
                  {sel.result.nonRoutine.length === 0
                    ? <Line k="Non-routine adjustment" v="none documented" muted />
                    : sel.result.nonRoutine.map((n, i) => <Line key={i} k={`Non-routine — ${n.note}`} v={`${n.qty > 0 ? "+" : ""}${fmt(n.qty)} ${sel.result!.unit}`} />)}
                  <Line k="Adjusted baseline" v={`${fmt(sel.result.adjustedBaseline)} ${sel.result.unit}`} />
                  <Line k="Reporting period consumption" v={`${fmt(sel.result.reporting)} ${sel.result.unit}`} />
                  <Line k="Saving" v={`${fmt(sel.result.saving)} ${sel.result.unit}`} strong />
                  <Line k="Measurement reconciliation (meters vs source of record)" v={`${sel.result.reconciliationPct > 0 ? "+" : ""}${sel.result.reconciliationPct}% · within ±5%`} />
                </dl>
              </div>
            ) : (
              <div className="rounded-xl2 bg-ink-50 p-4">
                <div className="text-[12px] font-semibold text-ink-900">No figure until verified</div>
                <div className="text-[11px] text-ink-500 mt-1 leading-snug">
                  {sel.status === "monitoring" && sel.monitoringDay !== undefined && `Monitoring day ${sel.monitoringDay} of ${sel.monitoringDays}. The reporting period must complete and reconcile to the billed record before a saving can be determined.`}
                  {sel.status === "implemented" && "Implemented; the reporting period has not started. The baseline is fitted and reconciles within ±5%."}
                  {sel.status === "awaiting-approval" && "The M&V plan (option, baseline, reporting period, boundary) is awaiting Platform Admin approval. Nothing is measured against it yet."}
                </div>
                {sel.status === "monitoring" && sel.monitoringDay !== undefined && sel.monitoringDays && (
                  <div className="h-1.5 rounded-full bg-ink-200 overflow-hidden mt-3"><div className="h-full rounded-full bg-chart-olive" style={{ width: `${(sel.monitoringDay / sel.monitoringDays) * 100}%` }} /></div>
                )}
              </div>
            )}
            <div className="mt-auto text-[11px] text-ink-500">Savings are determined against an adjusted baseline (IPMVP). They are not required to equal the change in the bill.</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Verified savings recognised per month" hint="Electricity · signed L4 outputs only" />
          <div className="px-3 pt-2 pb-2 flex-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MV_MONTHLY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${CHART.grid}` }} formatter={(v: number) => [`${fmt(v)} kWh`, "Verified"]} />
                <Bar dataKey="kwh" fill={CHART.olive} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">M&V outputs never populate a KPI, an inventory figure or a comparison.</div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="A saving can be real while consumption rises" hint="Why the raw change and the saving are shown side by side" />
          <div className="px-6 pb-6 pt-3 flex-1 flex flex-col text-[12px] text-ink-700 leading-relaxed">
            <p>
              Chiller 01's VFD retrofit (MV-002) sits next to a bill that went <strong>up</strong> by 4,100 kWh. Cooling degree-days rose 9% and occupied room nights 11%, which alone would have added 32,500 kWh. Against that adjusted baseline the measure saved <strong>28,400 kWh</strong>, and the meters reconcile to the bill within 0.9%.
            </p>
            <p className="mt-3">Requiring a saving to show up as a fall in the bill would make every genuine project in a growing hotel unreportable.</p>
            <div className="mt-auto pt-4 text-[11px] text-ink-500">Every result states its routine and non-routine adjustments with their evidence, the option, the signatory and the reconciliation for the same boundary and period.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Line({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className={cn("text-ink-600 leading-snug", strong && "font-semibold text-ink-900")}>{k}</dt>
      <dd className={cn("text-right tabular-nums whitespace-nowrap", strong ? "font-bold text-ink-900" : muted ? "text-ink-400" : "font-medium text-ink-900")}>{v}</dd>
    </div>
  );
}
