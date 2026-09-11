import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Wrench } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { DEVIATIONS, LEVEL_TEXT, RAISED_ACTIONS, THRESHOLDS, type DeviationFact, type FactStatus, type Level } from "@/lib/smartOps";
import { FactRow } from "@/components/smart-ops/Shared";

type Band = "all" | DeviationFact["band"];

export default function AlertsCentre() {
  const toast = useToast();
  const [band, setBand] = useState<Band>("all");
  const [resource, setResource] = useState<"all" | DeviationFact["resource"]>("all");
  const [status, setStatus] = useState<Record<string, FactStatus>>({});

  const facts = useMemo(() => DEVIATIONS
    .map((f) => ({ ...f, status: status[f.id] ?? f.status }))
    .filter((f) => band === "all" || f.band === band)
    .filter((f) => resource === "all" || f.resource === resource), [band, resource, status]);

  const counts = {
    above: DEVIATIONS.filter((f) => f.band === "above-threshold").length,
    watch: DEVIATIONS.filter((f) => f.band === "watch").length,
    dq: DEVIATIONS.filter((f) => f.band === "data-quality").length,
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Smart operations · facts" title="Alerts" actions={<Link to="/actions" className="btn-secondary">Actions</Link>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Above threshold" value={String(counts.above)} hint={`≥ ${THRESHOLDS.materialityPct}% for ${THRESHOLDS.persistenceDays}+ days`} tone={counts.above ? "bad" : "neutral"} />
        <StatTile label="Watch" value={String(counts.watch)} hint="below the threshold, trending" tone="warn" />
        <StatTile label="Data quality" value={String(counts.dq)} hint="gaps, flat-lines, reconciliation" />
        <StatTile label="Actions raised" value={String(RAISED_ACTIONS.length)} hint={`${RAISED_ACTIONS.filter((a) => /today/i.test(a.due)).length} due today`} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs
          variant="segmented" size="sm" ariaLabel="Band"
          items={[
            { key: "all", label: "All", badge: DEVIATIONS.length },
            { key: "above-threshold", label: "Above threshold", badge: counts.above },
            { key: "watch", label: "Watch", badge: counts.watch },
            { key: "data-quality", label: "Data quality", badge: counts.dq },
          ]}
          value={band} onChange={(k) => setBand(k as Band)}
        />
        <select className="input h-9 max-w-[180px]" value={resource} onChange={(e) => setResource(e.target.value as typeof resource)} aria-label="Resource">
          <option value="all">All resources</option>
          <option value="electricity">Electricity</option>
          <option value="water">Water</option>
          <option value="thermal">Thermal / sensors</option>
        </select>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          {facts.length === 0 && (
            <EmptyState icon={<Bell size={20} />} title="No facts match" description="Try a different band or resource." action={<button className="btn-secondary" onClick={() => { setBand("all"); setResource("all"); }}>Clear filters</button>} />
          )}
          {facts.map((f) => (
            <div key={f.id} className="card">
              <FactRow fact={f} />
              <div className="px-5 pb-4 -mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-ink-400 mr-auto">{f.id}{f.actionId ? ` · ${f.actionId}` : ""}</span>
                {f.status === "open" && (
                  <button className="btn-ghost h-8 px-3 text-[12px]" onClick={() => { setStatus((s) => ({ ...s, [f.id]: "acknowledged" })); toast.info(`${f.id} acknowledged`); }}>
                    <Check size={13} /> Acknowledge
                  </button>
                )}
                {f.band !== "data-quality" && f.status !== "action-raised" && f.status !== "resolved" && (
                  <button className="btn-secondary h-8 px-3 text-[12px]" onClick={() => { setStatus((s) => ({ ...s, [f.id]: "action-raised" })); toast.success(`Maintenance action raised from ${f.id}`); }}>
                    <Wrench size={13} /> Raise action
                  </button>
                )}
                <Link
                  to={f.target.type === "asset" ? "/smart-ops/assets" : f.target.type === "end-use" ? "/smart-ops/end-uses" : "/smart-ops/meters"}
                  className="btn-ghost h-8 px-3 text-[12px]"
                >
                  Open {f.target.type === "asset" ? "asset" : f.target.type === "end-use" ? "end-use" : "meter"}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="flex flex-col">
            <CardHeader title="Thresholds" hint={`Methodology ${THRESHOLDS.version} · owned by the ${THRESHOLDS.owner}`} right={<Badge tone="neutral">Read-only</Badge>} />
            <dl className="px-6 pb-5 pt-3 text-[12px] divide-y divide-ink-100">
              <Row k="Persistence" v={`${THRESHOLDS.persistenceDays} consecutive days`} />
              <Row k="Materiality" v={`≥ ${THRESHOLDS.materialityPct}% beyond the reference`} />
              <Row k="Quantity floor" v={`${THRESHOLDS.floorKwh} kWh · ${THRESHOLDS.floorM3} m³`} />
              <Row k="Reconciliation tolerance" v={`±${THRESHOLDS.reconciliationTolPct}%`} />
              <Row k="Parent coverage · min" v={`${THRESHOLDS.parentCoverageMinPct}%`} />
              <Row k="End-use separation · min" v={`${THRESHOLDS.endUseSeparationMinPct}%`} />
              <Row k="Baseline" v={`provisional ${THRESHOLDS.baselineProvisionalMonths} mo · established ${THRESHOLDS.baselineEstablishedMonths} mo`} />
              <Row k="Refrigerant leak rate" v={`${THRESHOLDS.leakRateThresholdPct}% rolling 12 mo`} />
            </dl>
          </Card>

          <Card className="flex flex-col">
            <CardHeader title="What a level may say" hint="Every fact carries the level its metering entitles" />
            <ul className="px-6 pb-5 pt-3 space-y-2.5 text-[12px]">
              {(Object.keys(LEVEL_TEXT) as Level[]).map((l) => (
                <li key={l} className="flex items-start gap-2.5">
                  <span className="inline-flex items-center rounded-full bg-ink-900 text-white px-2 py-0.5 text-[10px] font-semibold shrink-0 mt-0.5">{l}</span>
                  <span className="text-ink-700 leading-snug">{LEVEL_TEXT[l]}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto px-6 pb-5 text-[11px] text-ink-500">No cause is named, no asset is called faulty, no saving is projected. Those are the audit's conclusions, not the platform's.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-ink-600">{k}</dt>
      <dd className="font-medium text-ink-900 text-right tabular-nums">{v}</dd>
    </div>
  );
}
