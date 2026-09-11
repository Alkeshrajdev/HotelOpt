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
import { DEVIATIONS, RAISED_ACTIONS, THRESHOLDS, fmt, type DeviationFact, type FactStatus } from "@/lib/smartOps";
import { FactRow, SegmentStrip } from "@/components/smart-ops/Shared";

type Band = "all" | DeviationFact["band"];

export default function AlertsCentre() {
  const toast = useToast();
  const [band, setBand] = useState<Band>("all");
  const [resource, setResource] = useState<"all" | DeviationFact["resource"]>("all");
  const [status, setStatus] = useState<Record<string, FactStatus>>({});

  const all = useMemo(() => DEVIATIONS.map((f) => ({ ...f, status: status[f.id] ?? f.status })), [status]);
  const facts = all
    .filter((f) => band === "all" || f.band === band)
    .filter((f) => resource === "all" || f.resource === resource);

  const counts = {
    above: DEVIATIONS.filter((f) => f.band === "above-threshold").length,
    watch: DEVIATIONS.filter((f) => f.band === "watch").length,
    dq: DEVIATIONS.filter((f) => f.band === "data-quality").length,
  };
  const byStatus = (s: FactStatus) => all.filter((f) => f.status === s).length;
  const excessKwh = all.filter((f) => f.excess?.unit === "kWh").sort((a, b) => (b.excess?.value ?? 0) - (a.excess?.value ?? 0));
  const excessM3 = all.filter((f) => f.excess?.unit === "m³").sort((a, b) => (b.excess?.value ?? 0) - (a.excess?.value ?? 0));
  const maxKwh = Math.max(...excessKwh.map((f) => f.excess?.value ?? 0), 1);
  const maxM3 = Math.max(...excessM3.map((f) => f.excess?.value ?? 0), 1);

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
            <CardHeader title="Excess since start" hint="Measured minus reference, summed from the day each fact began" />
            <div className="px-6 pb-5 pt-4 flex flex-col gap-4">
              <SegmentStrip segments={[
                { label: "Open", value: byStatus("open"), className: "bg-chart-rose" },
                { label: "Acknowledged", value: byStatus("acknowledged"), className: "bg-chart-sand" },
                { label: "Action raised", value: byStatus("action-raised"), className: "bg-chart-olive" },
                { label: "Resolved", value: byStatus("resolved"), className: "bg-chart-sage" },
              ]} />
              <div className="space-y-2.5">
                {excessKwh.map((f) => <ExcessRow key={f.id} fact={f} max={maxKwh} />)}
                {excessM3.length > 0 && <div className="border-t border-ink-100" />}
                {excessM3.map((f) => <ExcessRow key={f.id} fact={f} max={maxM3} className="bg-chart-mauve" />)}
              </div>
              <div className="text-[11px] text-ink-500">A quantity, not a loss. It is what was measured above the reference while the fact stood.</div>
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader title="Thresholds" hint={`Methodology ${THRESHOLDS.version} · owned by the ${THRESHOLDS.owner}`} right={<Badge tone="neutral">Read-only</Badge>} />
            <div className="px-6 pb-5 pt-4 grid grid-cols-2 gap-2">
              <Setting k="Persistence" v={`${THRESHOLDS.persistenceDays} days`} sub="consecutive" />
              <Setting k="Materiality" v={`≥ ${THRESHOLDS.materialityPct}%`} sub="beyond the reference" />
              <Setting k="Quantity floor" v={`${THRESHOLDS.floorKwh} kWh`} sub={`${THRESHOLDS.floorM3} m³ for water`} />
              <Setting k="Reconciliation" v={`±${THRESHOLDS.reconciliationTolPct}%`} sub="over-measurement" />
              <Setting k="Parent coverage" v={`${THRESHOLDS.parentCoverageMinPct}%`} sub="minimum for L2" />
              <Setting k="End-use separation" v={`${THRESHOLDS.endUseSeparationMinPct}%`} sub="evidenced edges" />
              <Setting k="Own baseline" v={`${THRESHOLDS.baselineProvisionalMonths} · ${THRESHOLDS.baselineEstablishedMonths} mo`} sub="provisional · established" />
              <Setting k="Leak rate" v={`${THRESHOLDS.leakRateThresholdPct}%`} sub="rolling 12 months" />
            </div>
            <div className="mt-auto px-6 pb-5 text-[11px] text-ink-500">No cause is named, no asset is called faulty, no saving is projected. Those are the audit's conclusions, not the platform's.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ExcessRow({ fact, max, className = "bg-chart-olive" }: { fact: DeviationFact; max: number; className?: string }) {
  const v = fact.excess!.value;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-ink-900 truncate">{fact.target.label}</div>
        <div className="text-[10px] text-ink-400 truncate">since {fact.since}</div>
      </div>
      <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden"><div className={`h-full rounded-full ${className}`} style={{ width: `${(v / max) * 100}%` }} /></div>
      <span className="text-[12px] font-semibold text-ink-900 tabular-nums whitespace-nowrap w-20 text-right">{fmt(v)} {fact.excess!.unit}</span>
    </div>
  );
}

function Setting({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="rounded-xl2 bg-ink-50 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 truncate">{k}</div>
      <div className="text-[13px] font-bold text-ink-900 tabular-nums mt-0.5">{v}</div>
      <div className="text-[10px] text-ink-500 truncate">{sub}</div>
    </div>
  );
}
