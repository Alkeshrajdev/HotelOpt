import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Wrench } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import {
  DEVIATIONS, END_USES, METERS, MV_MEASURES, RAISED_ACTIONS, SERVICE_EDGES, THRESHOLDS,
  fmt, levelFor, reconcile, verifiedMonthly, type DeviationFact, type Resource,
} from "@/lib/smartOps";
import { CompletenessStrip, FactBar, LevelBadge, MiniBars, SegmentStrip, StatusDot } from "@/components/smart-ops/Shared";

/** Attribution per end-use for a resource, from the service graph, plus the Unallocated line. */
export function attribution(resource: Resource) {
  const boundary = resource === "water" ? "WATER-MAIN" : "ELEC-MAIN";
  const rec = reconcile(boundary);
  const rows = END_USES
    .filter((e) => e.resources.includes(resource))
    .map((e) => {
      const total = SERVICE_EDGES
        .filter((s) => s.target.type === "end-use" && s.target.id === e.id)
        .reduce((sum, s) => {
          const m = METERS.find((x) => x.id === s.meterId);
          return m && m.resource === resource ? sum + (m.periodTotal ?? 0) * s.share : sum;
        }, 0);
      return { endUse: e, total, pct: rec.parent ? (total / rec.parent) * 100 : 0, level: levelFor({ type: "end-use", id: e.id }, resource) };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  return { rec, rows, unit: resource === "water" ? "m³" : "kWh" };
}

export const factLink = (f: DeviationFact) =>
  f.target.type === "asset" ? "/smart-ops/assets" : f.target.type === "end-use" ? "/smart-ops/end-uses" : "/smart-ops/meters";

export default function SmartOpsOverview() {
  const [resource, setResource] = useState<Resource>("electricity");
  const elec = reconcile("ELEC-MAIN");
  const water = reconcile("WATER-MAIN");
  const live = METERS.filter((m) => m.status === "live").length;
  const delayed = METERS.filter((m) => m.status === "delayed").length;
  const offline = METERS.filter((m) => m.status === "offline").length;
  const attention = METERS.filter((m) => m.status !== "live" || m.gapHours > 0);
  const above = DEVIATIONS.filter((d) => d.band === "above-threshold");
  const watch = DEVIATIONS.filter((d) => d.band === "watch");
  const dq = DEVIATIONS.filter((d) => d.band === "data-quality");
  const ranked = [...above, ...watch].sort((a, b) => (b.deviationPct ?? 999) - (a.deviationPct ?? 999));
  const attr = useMemo(() => attribution(resource), [resource]);
  const max = Math.max(...attr.rows.map((r) => r.total), attr.rec.unallocated);

  const mv = {
    signed: MV_MEASURES.filter((m) => m.status === "verified" || m.status === "reported"),
    monitoring: MV_MEASURES.filter((m) => m.status === "monitoring").length,
    implemented: MV_MEASURES.filter((m) => m.status === "implemented").length,
    awaiting: MV_MEASURES.filter((m) => m.status === "awaiting-approval").length,
  };
  const kwh = mv.signed.filter((m) => m.resource === "electricity").reduce((s, m) => s + (m.result?.saving ?? 0), 0);
  const monthly = useMemo(() => verifiedMonthly("electricity").slice(-12), []);
  const monthlyTotals = monthly.map((r) => Object.entries(r).reduce((s, [k, v]) => (typeof v === "number" && k !== "ym" && k !== "m" ? s + v : s), 0));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Smart operations"
        title="Smart Ops"
        actions={<Badge tone="neutral">Methodology {THRESHOLDS.version}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Electricity metered" value={`${Math.round(elec.coveragePct)}%`} hint={`${fmt(elec.unallocated)} kWh unallocated · reconciled`} />
        <StatTile label="Water metered" value={`${Math.round(water.coveragePct)}%`} hint={`${fmt(water.unallocated)} m³ unallocated · reconciled`} />
        <StatTile label="Above threshold" value={String(above.length)} hint={`${watch.length} on watch · ${dq.length} data-quality`} tone={above.length ? "bad" : "neutral"} />
        <StatTile label="Meters live" value={`${live} / ${METERS.length}`} hint={`${attention.length} need attention`} tone={attention.length ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Where it goes */}
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader
            title={resource === "water" ? "Where the water goes" : "Where the electricity goes"}
            hint="Month to date · from the meter tree · Unallocated is published, never distributed"
            right={
              <Tabs
                variant="segmented" size="sm" ariaLabel="Resource"
                items={[{ key: "electricity", label: "Electricity" }, { key: "water", label: "Water" }]}
                value={resource} onChange={(k) => setResource(k as Resource)}
              />
            }
          />
          <div className="px-6 pt-4 pb-2 flex-1 space-y-3">
            {attr.rows.map((r) => (
              <div key={r.endUse.id} className="grid grid-cols-[168px_1fr_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-ink-900 truncate">{r.endUse.label}</div>
                  <div className="text-[10px] text-ink-400 truncate">{r.endUse.department}{r.endUse.combined ? " · combined group" : ""}</div>
                </div>
                <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full rounded-full bg-chart-olive" style={{ width: `${(r.total / max) * 100}%` }} />
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-[12px] font-semibold text-ink-900 w-20 text-right">{fmt(Math.round(r.total))} {attr.unit}</span>
                  <span className="text-[11px] text-ink-500 w-10 text-right">{r.pct.toFixed(1)}%</span>
                  <LevelBadge level={r.level.level} coveragePct={r.level.coveragePct} separationPct={r.level.separationPct} />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-[168px_1fr_auto] items-center gap-3 pt-2 border-t border-ink-100">
              <div className="text-[12px] font-medium text-ink-600">Unallocated</div>
              <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full rounded-full bg-chart-remainder" style={{ width: `${(attr.rec.unallocated / max) * 100}%` }} />
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-[12px] font-semibold text-ink-700 w-20 text-right">{fmt(attr.rec.unallocated)} {attr.unit}</span>
                <span className="text-[11px] text-ink-500 w-10 text-right">{attr.rec.unallocatedPct.toFixed(1)}%</span>
                <span className="w-[26px]" />
              </div>
            </div>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between text-[11px] text-ink-500">
            <span>Parent coverage {Math.round(attr.rec.coveragePct)}% · reconciliation {attr.rec.differencePct > 0 ? "+" : ""}{attr.rec.differencePct.toFixed(1)}% · tolerance ±{THRESHOLDS.reconciliationTolPct}%</span>
            <Link to="/smart-ops/end-uses" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900">End-uses <ChevronRight size={12} /></Link>
          </div>
        </Card>

        {/* Measured deviations, as bars against the threshold */}
        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader
            title="Measured deviations"
            hint="Against each target's own reference · no cause, no verdict, no saving"
            right={<Link to="/smart-ops/alerts" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">All <ChevronRight size={12} /></Link>}
          />
          <div className="px-6 pt-4 pb-2 flex-1 flex flex-col">
            <SegmentStrip segments={[
              { label: "Above threshold", value: above.length, className: "bg-chart-rose" },
              { label: "Watch", value: watch.length, className: "bg-chart-sand" },
              { label: "Data quality", value: dq.length, className: "bg-chart-moss" },
            ]} />
            <div className="mt-3 divide-y divide-ink-100">
              {ranked.map((f) => <FactBar key={f.id} fact={f} to={factLink(f)} />)}
            </div>
            <div className="mt-auto pt-3 flex items-center justify-between gap-3 text-[11px] text-ink-500">
              <span>Tick marks the {THRESHOLDS.materialityPct}% materiality threshold · a fact needs {THRESHOLDS.persistenceDays}+ days above the quantity floor.</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex flex-col">
          <CardHeader title="Meters" hint={`${attention.length} of ${METERS.length} need attention`} right={<Link to="/smart-ops/meters" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">Meters <ChevronRight size={12} /></Link>} />
          <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-4">
            <SegmentStrip segments={[
              { label: "Live", value: live, className: "bg-chart-olive" },
              { label: "Delayed", value: delayed, className: "bg-chart-sand" },
              { label: "Offline", value: offline, className: "bg-chart-rose" },
            ]} />
            <div className="space-y-3">
              {attention.map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-ink-900 truncate">{m.name}</div>
                      <div className="text-[10px] text-ink-400 truncate">{m.id} · last reading {m.lastReading}{m.gapHours ? ` · gap ${m.gapHours} h` : ""}</div>
                    </div>
                    <StatusDot status={m.status} />
                  </div>
                  <CompletenessStrip gapHours={m.gapHours} status={m.status} />
                </div>
              ))}
            </div>
            <div className="mt-auto pt-3 border-t border-ink-100 text-[11px] text-ink-500">Last 24 h per meter. Gaps are shown as gaps; nothing is interpolated into a reported figure.</div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Actions raised" hint="Raised by people from measured facts" right={<Link to="/actions" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">Actions <ChevronRight size={12} /></Link>} />
          <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-3">
            {RAISED_ACTIONS.map((a) => (
              <div key={a.id} className="py-2 border-b border-ink-100 last:border-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono text-ink-400">{a.id} · from {a.fact}</span>
                  <Badge tone={a.status === "In progress" ? "info" : a.status === "Assigned" ? "warn" : "neutral"}>{a.status}</Badge>
                </div>
                <div className="text-[12px] font-semibold text-ink-900 leading-snug">{a.title}</div>
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-ink-500">
                  <span className="inline-flex items-center gap-1"><Wrench size={10} /> {a.owner}</span>
                  <span>Due: {a.due}</span>
                </div>
              </div>
            ))}
            <div className="mt-auto pt-3 border-t border-ink-100 flex items-center justify-between text-[11px] text-ink-500">
              <span>Due today</span>
              <span className="font-semibold text-ink-900">{RAISED_ACTIONS.filter((a) => /today/i.test(a.due)).length} of {RAISED_ACTIONS.length}</span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Verification" hint="Measures under an approved M&V plan" right={<Link to="/smart-ops/verification" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">Open <ChevronRight size={12} /></Link>} />
          <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-4">
            <SegmentStrip segments={[
              { label: "Signed", value: mv.signed.length, className: "bg-chart-olive" },
              { label: "Monitoring", value: mv.monitoring, className: "bg-chart-moss" },
              { label: "Implemented", value: mv.implemented, className: "bg-chart-sage" },
              { label: "Awaiting approval", value: mv.awaiting, className: "bg-chart-sand" },
            ]} />
            <div>
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-ink-600">Verified per month · electricity</span>
                <span className="font-semibold text-ink-900 tabular-nums">Σ {fmt(kwh)} kWh</span>
              </div>
              <MiniBars values={monthlyTotals} height="h-14" />
              <div className="flex items-center justify-between text-[10px] text-ink-400 mt-1.5">
                <span>{monthly[0]?.m}</span><span>{monthly[monthly.length - 1]?.m}</span>
              </div>
            </div>
            <div className="mt-auto pt-3 border-t border-ink-100 text-[11px] text-ink-500">
              A saving exists only as an L4 output under an approved plan. Nothing here is projected or estimated.
            </div>
          </div>
        </Card>
      </div>

      <div className="text-[11px] text-ink-400 flex items-center gap-1">
        Meter data feeds attribution, asset performance, diagnostics and verification. Reported figures come from the source of record.
        <Link to="/performance/energy/overview" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 ml-1">Performance <ArrowRight size={11} /></Link>
      </div>
    </div>
  );
}
