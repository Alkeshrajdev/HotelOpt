import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Droplet,
  FileCheck2,
  FileText,
  GraduationCap,
  Layers,
  Leaf,
  Lightbulb,
  Plus,
  Recycle,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  UserCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusPipeline from "@/components/shared/StatusPipeline";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  ACTIONS,
  ACTION_TYPE_META,
  CONVERTIBLE_ALERTS,
  LENS_META,
  MARKET_DISCLAIMER,
  PATHWAY_REQUIRED_TCO2E,
  PILLAR_TONE,
  PRIORITY_TONE,
  SOURCE_META,
  STAGES,
  STAGE_INDEX,
  type Action,
  type ActionType,
  type ConvertibleAlert,
  type Lens,
  type Pillar,
  type Priority,
  type Source,
  type Stage,
  isMarketInstrument,
  matchesLens,
  pillarProgress,
  savingsBuckets,
} from "@/lib/actionsData";

/* ── icon maps ─────────────────────────────────────────────────────────────── */
const TYPE_ICON: Record<ActionType, any> = {
  "operational-efficiency": Zap,
  water: Droplet,
  waste: Recycle,
  "renewable-procurement": Sun,
  "carbon-offset": Leaf,
  "behaviour-training": GraduationCap,
  "policy-governance": ScrollText,
  "smartops-maintenance": Wrench,
};
const SOURCE_ICON: Record<Source, any> = {
  "smart-ops": Activity,
  "performance-gap": TrendingUp,
  "certification-gap": ShieldCheck,
  ai: Sparkles,
  manual: UserCheck,
  marketplace: ShoppingBag,
  audit: FileCheck2,
};
const SOURCE_TONE: Record<Source, "good" | "warn" | "bad" | "info" | "neutral" | "brand"> = {
  "smart-ops": "info",
  "performance-gap": "warn",
  "certification-gap": "brand",
  ai: "brand",
  manual: "neutral",
  marketplace: "info",
  audit: "warn",
};
const STAGE_TONE: Record<Stage, "good" | "warn" | "bad" | "info" | "neutral" | "brand"> = {
  proposed: "neutral", approved: "info", "in-progress": "brand", completed: "warn", verified: "good",
};

const fmtUsd = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${n}`);
const fmtNum = (n: number) => n.toLocaleString();

/* ================================================================== */

export default function Actions() {
  const [tab, setTab] = useState<"reduction" | "market">("reduction");
  const [extra, setExtra] = useState<Action[]>([]);     // actions converted from Smart Ops
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [lens, setLens] = useState<Lens | null>(null);
  const [pillarFilter, setPillarFilter] = useState<"all" | Pillar>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | Source>("all");
  const [newOpen, setNewOpen] = useState(false);

  const all = useMemo(() => [...ACTIONS, ...extra], [extra]);
  const reduction = all.filter((a) => !isMarketInstrument(a));
  const market = all.filter(isMarketInstrument);

  const buckets = useMemo(() => savingsBuckets(reduction), [reduction]);
  const pathwayVerified = buckets.verified.co2e;
  const pathwayPct = Math.min(100, Math.round((pathwayVerified / PATHWAY_REQUIRED_TCO2E) * 100));
  const pillars = useMemo(() => pillarProgress(), []);

  const base = tab === "reduction" ? reduction : market;
  const filtered = base.filter((a) =>
    (lens === null || matchesLens(a, lens)) &&
    (pillarFilter === "all" || a.pillar === pillarFilter) &&
    (sourceFilter === "all" || a.source === sourceFilter)
  );

  function convertAlert(alert: ConvertibleAlert) {
    const isWater = alert.category === "water";
    const action: Action = {
      id: `conv-${alert.id}`,
      code: `OPS-${alert.id}`,
      name: alert.title,
      description: `${alert.recommended} Converted from Smart Ops alert ${alert.id}.`,
      actionType: "smartops-maintenance",
      pillar: alert.category,
      property: alert.property,
      source: "smart-ops",
      sourceRef: alert.id,
      triggerLink: alert.link,
      priority: alert.severity === "Critical" ? "critical" : alert.severity === "High" ? "high" : "medium",
      impact: isWater
        ? [{ key: "cost_usd", label: "Cost saving", value: alert.estimatedLossUsd, unit: "$/yr" }]
        : [
            { key: "cost_usd", label: "Cost saving", value: alert.estimatedLossUsd, unit: "$/yr" },
            { key: "co2e_t", label: "Carbon", value: alert.estCo2e, unit: "tCO₂e/yr" },
          ],
      co2e: alert.estCo2e,
      costUsd: 0, capexClass: "opex", paybackYears: 0, ease: "easy", confidence: 75,
      owner: "Facilities Manager", dueDate: "2026-07-15", requiredApproval: "None — within ops budget",
      evidenceStatus: "none", verificationStatus: "unverified", stage: "proposed",
      calculationNote: `Estimated loss ${fmtUsd(alert.estimatedLossUsd)}/yr while the alert is open. Savings will be verified after closure.`,
      approvalLog: [
        { at: "2026-06-22", by: "Smart Ops", action: `Alert ${alert.id} raised (${alert.severity})` },
        { at: "2026-06-22", by: "You", action: "Converted to action" },
      ],
      smartOps: { asset: alert.asset, alertId: alert.id, alertTitle: alert.title, estimatedLossUsd: alert.estimatedLossUsd, alertLink: alert.link },
    };
    setExtra((e) => [action, ...e]);
    setConvertedIds((s) => new Set([...s, alert.id]));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Action control centre"
        title="Actions & Measures"
        subtitle="Plan, approve and verify physical reduction measures. Only verified savings count toward the 2030 pathway — market instruments are tracked separately."
        actions={<button className="btn-primary" onClick={() => setNewOpen(true)}><Plus size={14} /> New action</button>}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ink-200">
        <TabBtn active={tab === "reduction"} onClick={() => { setTab("reduction"); setLens(null); }} icon={<Target size={14} />}>
          Reduction actions <Badge tone="neutral" className="ml-1">{reduction.length}</Badge>
        </TabBtn>
        <TabBtn active={tab === "market"} onClick={() => { setTab("market"); setLens(null); }} icon={<Banknote size={14} />}>
          Market instruments <Badge tone="neutral" className="ml-1">{market.length}</Badge>
        </TabBtn>
      </div>

      {tab === "reduction" ? (
        <>
          {/* Savings buckets + pathway (req 3 + 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <SavingsTile
              label="Estimated pipeline" tone="info"
              co2e={buckets.estimated.co2e} usd={buckets.estimated.usd}
              hint="Proposed · approved · in progress — not yet delivered"
            />
            <SavingsTile
              label="Implemented · monitoring" tone="warn"
              co2e={buckets.monitoring.co2e} usd={buckets.monitoring.usd}
              hint="Work done, savings being measured"
            />
            <SavingsTile
              label="Verified savings" tone="good"
              co2e={buckets.verified.co2e} usd={buckets.verified.usd}
              hint="Measured & verified — the only achieved reduction"
            />
            {/* Pathway */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 flex flex-col">
              <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">Verified reduction vs 2030 pathway</div>
              <div className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">
                {pathwayVerified} <span className="text-ink-400 text-base font-semibold">/ {PATHWAY_REQUIRED_TCO2E} tCO₂e</span>
              </div>
              <div className="mt-2"><ProgressBar value={pathwayPct} tone={pathwayPct >= 60 ? "good" : pathwayPct >= 30 ? "warn" : "bad"} /></div>
              <div className="text-[11px] text-ink-500 mt-1">{pathwayPct}% of required annual reduction verified</div>
            </div>
          </div>

          {/* Lens filters (req 7) */}
          <LensFilters lens={lens} setLens={(l) => { if (l === "market-instrument") { setTab("market"); setLens(null); } else setLens(l); }} actions={reduction} />

          {/* Base filters */}
          <BaseFilters
            pillarFilter={pillarFilter} setPillarFilter={setPillarFilter}
            sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
          />

          {/* Pillar-specific progress (req 9) */}
          <Card>
            <CardHeader title="Progress by pillar" hint="Delivered (implemented + verified) actions, with each pillar's own indicator — not forced to CO₂e." />
            <div className="p-5 space-y-2.5">
              {pillars.map((p) => (
                <div key={p.pillar} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-12 sm:col-span-2">
                    <Badge tone={PILLAR_TONE[p.pillar]} className="capitalize w-full justify-center">{p.pillar}</Badge>
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <div className="flex items-center justify-between text-[11px] text-ink-500 mb-0.5">
                      <span>Actions delivered</span><span>{p.delivered}/{p.total}</span>
                    </div>
                    <ProgressBar value={p.total ? Math.round((p.delivered / p.total) * 100) : 0} tone={p.delivered === p.total ? "good" : p.delivered > 0 ? "warn" : "bad"} />
                  </div>
                  <div className="col-span-7 sm:col-span-7 flex flex-wrap gap-x-5 gap-y-1">
                    {p.metrics.map((m) => (
                      <div key={m.label} className="text-[12px]">
                        <span className="text-ink-400">{m.label}: </span>
                        <span className="font-semibold text-ink-800 tabular-nums">
                          {m.unit === "$" ? fmtUsd(m.value) : `${fmtNum(m.value)} ${m.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Smart Ops → action (req 12) */}
          <SmartOpsConvertPanel alerts={CONVERTIBLE_ALERTS.filter((a) => !convertedIds.has(a.id))} onConvert={convertAlert} />

          {/* Action list */}
          <Card>
            <CardHeader title="Actions" hint={`${filtered.length} of ${reduction.length}`} />
            <ul className="p-2 space-y-2">
              {filtered.map((a) => <ActionCard key={a.id} action={a} />)}
              {filtered.length === 0 && <li className="p-8 text-center text-sm text-ink-500">No actions match the selected filters.</li>}
            </ul>
          </Card>

          <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-brand-700 mt-0.5" />
            <div className="text-[13px] text-brand-900">
              Actions need their <strong>required approval</strong> before implementation. Once <strong>verified</strong>, savings count toward the 2030 pathway and a GP operational event is logged so before/after performance is measurable.
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Market instruments disclaimer (req 2) */}
          <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 flex items-start gap-3">
            <Banknote size={18} className="text-amber-700 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-bold text-ink-900">Market Instruments</div>
              <div className="text-[13px] text-ink-600 mt-0.5">{MARKET_DISCLAIMER}</div>
            </div>
          </div>

          <LensFilters lens={lens} setLens={(l) => { if (l === "market-instrument") setLens(null); else setLens(l); }} actions={market} />
          <BaseFilters
            pillarFilter={pillarFilter} setPillarFilter={setPillarFilter}
            sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
          />

          <Card>
            <CardHeader title="Market instruments" hint={`${filtered.length} of ${market.length} · excluded from verified reduction`} />
            <ul className="p-2 space-y-2">
              {filtered.map((a) => <ActionCard key={a.id} action={a} />)}
              {filtered.length === 0 && <li className="p-8 text-center text-sm text-ink-500">No instruments match the selected filters.</li>}
            </ul>
          </Card>
        </>
      )}

      <NewActionModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

/* ── Action card (compact, expandable — req 6, 8, 11) ─────────────────────── */

function ActionCard({ action: a }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"evidence" | "calc" | "verify" | "approval" | null>(null);
  const TypeIcon = TYPE_ICON[a.actionType];
  const SourceIcon = SOURCE_ICON[a.source];
  const headline = a.impact[0];
  const overdue = matchesLens(a, "overdue");

  return (
    <li className="rounded-xl border border-ink-200 hover:shadow-card transition-shadow">
      {/* Collapsed header */}
      <div className="p-4 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
            <TypeIcon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] text-ink-500">{a.code}</span>
              <Badge tone={PILLAR_TONE[a.pillar]} className="capitalize">{a.pillar}</Badge>
              <Badge tone="neutral">{ACTION_TYPE_META[a.actionType].label}</Badge>
              <Badge tone={SOURCE_TONE[a.source]}><SourceIcon size={10} /> {SOURCE_META[a.source].label}</Badge>
              <Badge tone={PRIORITY_TONE[a.priority]} className="capitalize">{a.priority}</Badge>
              {overdue && <Badge tone="bad">Overdue</Badge>}
            </div>
            <div className="text-sm font-semibold text-ink-900 mt-1">{a.name}</div>
            <div className="text-[12px] text-ink-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1"><Building2 size={11} /> {a.property}</span>
              <span className="inline-flex items-center gap-1"><UserCheck size={11} /> {a.owner}</span>
              <span className={cn("inline-flex items-center gap-1", overdue && "text-bad font-medium")}><Calendar size={11} /> {a.dueDate}</span>
            </div>
          </div>
          {/* headline impact + compact stage badge (req 6) */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
            {headline && (
              <div>
                <div className="text-[10px] text-ink-500">{headline.label}</div>
                <div className="text-good font-bold text-sm tabular-nums">
                  {headline.unit === "$/yr" ? `${fmtUsd(headline.value)}/yr` : `${fmtNum(headline.value)} ${headline.unit}`}
                </div>
              </div>
            )}
            <Badge tone={STAGE_TONE[a.stage]}>{STAGES.find((s) => s.key === a.stage)?.label}</Badge>
            <ChevronDown size={16} className={cn("text-ink-400 transition-transform", open && "rotate-180")} />
          </div>
        </div>
      </div>

      {/* Expanded body (req 6 — full workflow only when expanded) */}
      {open && (
        <div className="px-4 pb-4 -mt-1 space-y-3 border-t border-ink-100 pt-3">
          <div className="text-[13px] text-ink-700">{a.description}</div>

          {/* Full workflow */}
          <div className="rounded-xl bg-ink-50/60 border border-ink-200 p-3">
            <div className="text-[11px] font-semibold text-ink-500 mb-2">Workflow</div>
            <StatusPipeline steps={STAGES} active={STAGE_INDEX[a.stage]} size="sm" />
          </div>

          {/* Trigger / source */}
          {a.sourceRef && (
            <div className="rounded-lg border border-warn/25 bg-warn/10 p-2 text-[12px] text-amber-800 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span><strong>{SOURCE_META[a.source].label}:</strong> {a.sourceRef}
                {a.triggerLink && <Link className="ml-1 underline font-semibold" to={a.triggerLink}>Investigate ›</Link>}</span>
            </div>
          )}

          {/* Smart Ops link block (req 12) */}
          {a.smartOps && (
            <div className="rounded-lg border border-info/30 bg-info/5 p-3 text-[12px]">
              <div className="flex items-center gap-1.5 font-semibold text-ink-800 mb-1.5"><Activity size={13} className="text-info" /> Linked Smart Ops alert {a.smartOps.alertId}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <KV label="Asset" value={a.smartOps.asset} />
                <KV label="Alert" value={a.smartOps.alertTitle} />
                <KV label="Est. loss while open" value={`${fmtUsd(a.smartOps.estimatedLossUsd)}/yr`} />
                <KV label="Verified savings" value={a.smartOps.verifiedSavingsUsd ? `${fmtUsd(a.smartOps.verifiedSavingsUsd)}/yr` : "— (after closure)"} />
              </div>
              <Link to={a.smartOps.alertLink} className="text-info underline text-[11px] mt-1.5 inline-block">Open in Smart Ops ›</Link>
            </div>
          )}

          {/* Full field set (req 8) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <Field icon={<TrendingUp size={12} />} label="Impact" value={a.impact.map((m) => `${fmtNum(m.value)} ${m.unit}`).join(" · ")} />
            <Field icon={<Banknote size={12} />} label="Cost" value={`${fmtUsd(a.costUsd)} · ${a.capexClass}`} />
            <Field icon={<CalendarClock size={12} />} label="Payback" value={a.paybackYears != null ? `${a.paybackYears} yr` : "n/a"} />
            <Field icon={<Layers size={12} />} label="Ease" value={a.ease} />
            <Field icon={<Target size={12} />} label="Confidence" value={`${a.confidence}%`} />
            <Field icon={<UserCheck size={12} />} label="Owner" value={a.owner} />
            <Field icon={<Calendar size={12} />} label="Due" value={a.dueDate} />
            <Field icon={<ShieldCheck size={12} />} label="Required approval" value={a.requiredApproval} />
            <Field icon={<FileText size={12} />} label="Evidence" value={a.evidenceStatus} tone={a.evidenceStatus === "complete" ? "good" : a.evidenceStatus === "partial" ? "warn" : "bad"} />
            <Field icon={<CheckCircle2 size={12} />} label="Verification" value={a.verificationStatus} tone={a.verificationStatus === "verified" ? "good" : a.verificationStatus === "monitoring" ? "warn" : "bad"} />
          </div>

          {/* Evidence / verification buttons (req 11) */}
          <div className="flex flex-wrap gap-2">
            <EvBtn icon={<FileText size={12} />} label="View evidence" active={panel === "evidence"} onClick={() => setPanel(panel === "evidence" ? null : "evidence")} />
            <EvBtn icon={<Cpu size={12} />} label="View calculation" active={panel === "calc"} onClick={() => setPanel(panel === "calc" ? null : "calc")} />
            <EvBtn icon={<CheckCircle2 size={12} />} label="View verification" active={panel === "verify"} onClick={() => setPanel(panel === "verify" ? null : "verify")} />
            <EvBtn icon={<ScrollText size={12} />} label="View approval log" active={panel === "approval"} onClick={() => setPanel(panel === "approval" ? null : "approval")} />
            <div className="ml-auto flex gap-2">
              {a.stage === "proposed" && <button className="btn-secondary h-8 text-[12px]"><Check size={12} /> Approve</button>}
              {a.stage === "completed" && <button className="btn-primary h-8 text-[12px]"><CheckCircle2 size={12} /> Verify savings</button>}
            </div>
          </div>

          {panel && (
            <div className="rounded-lg border border-ink-200 bg-white p-3 text-[12px] text-ink-700">
              {panel === "evidence" && (
                <div>
                  <div className="font-semibold text-ink-800 mb-1">Evidence — {a.evidenceStatus}</div>
                  {a.evidenceStatus === "none"
                    ? "No evidence attached yet. Upload meter exports, invoices or M&V records to support this action."
                    : "Attached: meter exports, supplier invoice, before/after photos. Evidence pack ready for audit review."}
                </div>
              )}
              {panel === "calc" && (
                <div><div className="font-semibold text-ink-800 mb-1">Calculation</div>{a.calculationNote}</div>
              )}
              {panel === "verify" && (
                <div><div className="font-semibold text-ink-800 mb-1">Verification</div>{a.verificationNote ?? "Not yet verified. Savings remain estimated/under monitoring until an M&V check is completed."}</div>
              )}
              {panel === "approval" && (
                <div>
                  <div className="font-semibold text-ink-800 mb-1.5">Approval log</div>
                  <ol className="space-y-1.5">
                    {a.approvalLog.map((e, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-ink-400 tabular-nums shrink-0">{e.at}</span>
                        <span className="text-ink-700"><strong>{e.by}</strong> — {e.action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/* ── Smart Ops convert panel (req 12) ──────────────────────────────────────── */

function SmartOpsConvertPanel({ alerts, onConvert }: { alerts: ConvertibleAlert[]; onConvert: (a: ConvertibleAlert) => void }) {
  if (alerts.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="From Smart Ops — convert alerts to actions"
        hint="Open operational alerts with a quantified loss. Convert to track the fix, then verify the savings after closure."
        right={<Link to="/smart-ops/alerts" className="btn-secondary text-[12px] h-8"><Activity size={13} /> Alerts Centre</Link>}
      />
      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {alerts.map((al) => (
          <div key={al.id} className="rounded-xl border border-info/25 bg-info/5 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge tone={al.severity === "Critical" ? "bad" : al.severity === "High" ? "warn" : "info"}>{al.severity}</Badge>
              <span className="font-mono text-[10px] text-ink-500">{al.id}</span>
            </div>
            <div className="text-[13px] font-semibold text-ink-900 leading-tight">{al.title}</div>
            <div className="text-[11px] text-ink-500 flex flex-wrap gap-x-3">
              <span className="inline-flex items-center gap-1"><Cpu size={10} /> {al.asset}</span>
              <span className="inline-flex items-center gap-1"><Building2 size={10} /> {al.property}</span>
            </div>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="text-bad font-semibold">{fmtUsd(al.estimatedLossUsd)}/yr loss</span>
              <span className="text-ink-500">~{al.estCo2e} tCO₂e/yr</span>
            </div>
            <button onClick={() => onConvert(al)} className="btn-primary text-[12px] h-8 mt-auto"><Plus size={12} /> Convert to action</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Filters ───────────────────────────────────────────────────────────────── */

function LensFilters({ lens, setLens, actions }: { lens: Lens | null; setLens: (l: Lens | null) => void; actions: Action[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mr-1">Prioritise</span>
      <Chip active={lens === null} onClick={() => setLens(null)}>All</Chip>
      {LENS_META.map(({ key, label }) => {
        const count = key === "market-instrument" ? null : actions.filter((a) => matchesLens(a, key)).length;
        return (
          <Chip key={key} active={lens === key} onClick={() => setLens(key)}>
            {label}{count != null && count > 0 ? ` ${count}` : ""}
          </Chip>
        );
      })}
    </div>
  );
}

function BaseFilters({
  pillarFilter, setPillarFilter, sourceFilter, setSourceFilter,
}: {
  pillarFilter: "all" | Pillar; setPillarFilter: (p: "all" | Pillar) => void;
  sourceFilter: "all" | Source; setSourceFilter: (s: "all" | Source) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="input h-9 max-w-[180px]" value={pillarFilter} onChange={(e) => setPillarFilter(e.target.value as any)}>
        <option value="all">All pillars</option>
        {(["energy", "water", "waste", "carbon", "social", "governance"] as Pillar[]).map((p) => (
          <option key={p} value={p} className="capitalize">{p[0].toUpperCase() + p.slice(1)}</option>
        ))}
      </select>
      <select className="input h-9 max-w-[220px]" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)}>
        <option value="all">All sources</option>
        {(Object.keys(SOURCE_META) as Source[]).map((s) => (
          <option key={s} value={s}>{SOURCE_META[s].label}</option>
        ))}
      </select>
      {(pillarFilter !== "all" || sourceFilter !== "all") && (
        <button className="btn-ghost h-9 px-3 text-[12px] text-ink-500" onClick={() => { setPillarFilter("all"); setSourceFilter("all"); }}>
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}

/* ── New action modal ──────────────────────────────────────────────────────── */

type NewActionForm = {
  title: string; actionType: ActionType | ""; pillar: Pillar | ""; property: string;
  owner: string; dueDate: string; priority: Priority | ""; savingValue: string; savingUnit: string;
};
const EMPTY_FORM: NewActionForm = {
  title: "", actionType: "", pillar: "", property: "", owner: "", dueDate: "", priority: "", savingValue: "", savingUnit: "tCO₂e/yr",
};

function NewActionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<NewActionForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof NewActionForm>(k: K, v: NewActionForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.title && form.actionType && form.pillar && form.property && form.owner && form.priority;

  function handleClose() { setForm(EMPTY_FORM); setSubmitted(false); onClose(); }

  return (
    <Modal
      open={open} onClose={handleClose} title="New action"
      subtitle="Actions move through their required approval before implementation. Only verified savings count toward the 2030 pathway."
      size="lg"
      footer={submitted ? (
        <button className="btn-primary" onClick={handleClose}>Done</button>
      ) : (
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className={cn("btn-primary", !canSubmit && "opacity-50 cursor-not-allowed")} onClick={() => canSubmit && setSubmitted(true)} disabled={!canSubmit}>
            <ArrowRight size={14} /> Submit for approval
          </button>
        </>
      )}
    >
      {submitted ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={40} className="text-good" />
          <div className="text-lg font-bold text-ink-900">Action submitted</div>
          <div className="text-sm text-ink-500">"{form.title}" is now Proposed and awaiting its required approval.</div>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="text-[12px] font-medium text-ink-600">Title <span className="text-bad">*</span></span>
            <input className="input mt-1" placeholder="e.g. Solar thermal — pool heating" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Action type <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.actionType} onChange={(e) => set("actionType", e.target.value as any)}>
                <option value="">— Select —</option>
                {(Object.keys(ACTION_TYPE_META) as ActionType[]).map((t) => (
                  <option key={t} value={t}>{ACTION_TYPE_META[t].label}{ACTION_TYPE_META[t].market ? " (market instrument)" : ""}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Pillar <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.pillar} onChange={(e) => set("pillar", e.target.value as any)}>
                <option value="">— Select —</option>
                {["energy", "water", "waste", "carbon", "social", "governance"].map((p) => (
                  <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Property <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.property} onChange={(e) => set("property", e.target.value)}>
                <option value="">— Select —</option>
                {["Skyline Dubai", "Peaks Resort Zermatt", "Oceanfront Cape Town", "The Pavilion London", "Marina Residences Barcelona", "Portfolio"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Owner <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.owner} onChange={(e) => set("owner", e.target.value)}>
                <option value="">— Select —</option>
                {["Engineering Lead", "Property SM", "Sustainability Manager", "F&B Manager", "HR Lead", "Facilities Manager"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Due date</span>
              <input type="date" className="input mt-1" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Priority <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.priority} onChange={(e) => set("priority", e.target.value as any)}>
                <option value="">— Select —</option>
                {(["critical", "high", "medium", "low"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Estimated saving</span>
              <input className="input mt-1" type="number" placeholder="0" value={form.savingValue} onChange={(e) => set("savingValue", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Unit</span>
              <select className="input mt-1" value={form.savingUnit} onChange={(e) => set("savingUnit", e.target.value)}>
                {["tCO₂e/yr", "MWh/yr", "m³/yr", "kg/yr", "$/yr", "people"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900 flex items-start gap-2">
            <Zap size={13} className="text-brand-700 mt-0.5 shrink-0" />
            Submitted as <strong>Proposed</strong>. The estimated saving stays in the pipeline bucket until the action is implemented and verified.
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── small helpers ─────────────────────────────────────────────────────────── */

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors", active ? "text-ink-900 border-brand-700" : "text-ink-500 hover:text-ink-900 border-transparent")}>
      <span className={active ? "text-brand-700" : "text-ink-400"}>{icon}</span>{children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("tab capitalize", active && "tab-active")}>{children}</button>;
}

function SavingsTile({ label, co2e, usd, hint, tone }: { label: string; co2e: number; usd: number; hint: string; tone: "info" | "warn" | "good" }) {
  const ring = { info: "border-ink-200 bg-ink-50", warn: "border-warn/25 bg-warn/10", good: "border-good/25 bg-good/10" }[tone];
  const valTone = { info: "text-ink-900", warn: "text-amber-700", good: "text-good" }[tone];
  return (
    <div className={cn("rounded-xl border p-4", ring)}>
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</div>
      <div className={cn("text-2xl font-bold mt-0.5 tabular-nums", valTone)}>{co2e} <span className="text-base">tCO₂e</span></div>
      <div className="text-[12px] text-ink-500 tabular-nums">{fmtUsd(usd)}/yr cost saving</div>
      <div className="text-[11px] text-ink-400 mt-1">{hint}</div>
    </div>
  );
}

function Field({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const vt = tone === "good" ? "text-good" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-bad" : "text-ink-800";
  return (
    <div className="rounded-lg bg-ink-50 border border-ink-100 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-ink-400">{icon}{label}</div>
      <div className={cn("text-[12px] font-semibold capitalize truncate", vt)} title={value}>{value}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-ink-400">{label}</div>
      <div className="text-[12px] font-medium text-ink-800 truncate" title={value}>{value}</div>
    </div>
  );
}

function EvBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-colors", active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>
      {icon}{label}
    </button>
  );
}
