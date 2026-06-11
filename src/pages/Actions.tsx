import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Filter,
  Leaf,
  Columns,
  List,
  Lightbulb,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingDown,
  UserCheck,
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

type Stage = "proposed" | "approved" | "in-progress" | "completed" | "verified";
type Priority = "critical" | "high" | "medium" | "low";
type MeasureType = "retrofit" | "behaviour" | "procurement" | "policy";
type Capex = "capex" | "opex" | "mixed";

type Measure = {
  id: string;
  code: string;
  name: string;
  description: string;
  pillar: "energy" | "water" | "waste" | "carbon" | "social" | "governance";
  property: string;
  capexClass: Capex;
  capexAmount: number;
  capexCurrency: string;
  paybackYears: number;
  expectedImpactPct: number;
  actualImpactPct?: number;
  co2eSaving: number;         // tCO2e per year
  priority: Priority;
  measureType: MeasureType;
  trigger: string;
  triggerLink?: string;
  owner: string;
  dueDate: string;
  stage: Stage;
  evidenceCount: number;
  createsOpEvent?: boolean;
  source: "ai" | "library" | "manager";
};

const STAGES: { key: Stage; label: string; hint?: string }[] = [
  { key: "proposed",    label: "To Do",       hint: "Awaiting GM approval" },
  { key: "approved",    label: "Approved",    hint: "GM signed-off" },
  { key: "in-progress", label: "In Progress", hint: "Implementation under way" },
  { key: "completed",   label: "Completed",   hint: "Work done · awaiting verification" },
  { key: "verified",    label: "Verified",    hint: "GP impact measured" },
];

const STAGE_INDEX: Record<Stage, number> = {
  proposed: 0, approved: 1, "in-progress": 2, completed: 3, verified: 4,
};

// Kanban columns — map stages to 4 columns
const KANBAN_COLS: { label: string; stages: Stage[]; color: string }[] = [
  { label: "To Do",       stages: ["proposed"],              color: "border-ink-300" },
  { label: "In Progress", stages: ["approved","in-progress"],color: "border-brand-400" },
  { label: "Completed",   stages: ["completed"],             color: "border-warn" },
  { label: "Verified",    stages: ["verified"],              color: "border-good" },
];

const PRIORITY_TONE: Record<Priority, "bad" | "warn" | "info" | "neutral"> = {
  critical: "bad", high: "warn", medium: "info", low: "neutral",
};

const PILLAR_TONE: Record<string, "good" | "info" | "brand" | "warn" | "neutral"> = {
  energy: "good", water: "info", waste: "info", carbon: "brand", social: "warn", governance: "neutral",
};

const MEASURES: Measure[] = [
  {
    id: "m1", code: "ENG-001",
    name: "LED retrofit — back-of-house",
    description: "Replace 3,200 fluorescent fittings with LED across kitchens, BoH corridors, and laundry.",
    pillar: "energy", property: "Peaks Resort Zermatt",
    capexClass: "capex", capexAmount: 120000, capexCurrency: "USD",
    paybackYears: 1.8, expectedImpactPct: 2.4, actualImpactPct: 2.6,
    co2eSaving: 38, priority: "high", measureType: "retrofit",
    trigger: "GP-E declined 1.4% — lighting share above peer median",
    triggerLink: "/performance/energy/genuine-performance",
    owner: "Engineering Lead", dueDate: "2026-08-30",
    stage: "verified", evidenceCount: 3, createsOpEvent: true, source: "ai",
  },
  {
    id: "m2", code: "ENG-002",
    name: "BMS optimisation — HVAC schedules",
    description: "Re-tune occupancy-driven HVAC setpoints across 14 zones.",
    pillar: "energy", property: "Skyline Dubai",
    capexClass: "opex", capexAmount: 12000, capexCurrency: "USD",
    paybackYears: 0.6, expectedImpactPct: 3.1,
    co2eSaving: 22, priority: "critical", measureType: "behaviour",
    trigger: "Spike in April 2026 cooling load (+11% CDD)",
    triggerLink: "/review-approval?status=submitted&pillar=energy",
    owner: "Engineering Lead", dueDate: "2026-06-15",
    stage: "in-progress", evidenceCount: 1, createsOpEvent: true, source: "manager",
  },
  {
    id: "m3", code: "ENG-003",
    name: "Heat recovery on chillers",
    description: "Capture chiller waste heat for laundry hot water.",
    pillar: "energy", property: "Oceanfront Cape Town",
    capexClass: "capex", capexAmount: 250000, capexCurrency: "AUD",
    paybackYears: 2.6, expectedImpactPct: 4.2,
    co2eSaving: 55, priority: "high", measureType: "retrofit",
    trigger: "Energy benchmark — bottom-quartile vs comparable pool",
    triggerLink: "/performance/energy/external-comparison",
    owner: "Property SM", dueDate: "2026-12-01",
    stage: "approved", evidenceCount: 2, createsOpEvent: true, source: "library",
  },
  {
    id: "m4", code: "WTR-001",
    name: "Greywater reuse — landscaping",
    description: "Divert sink greywater for irrigation, ~22 m³/day.",
    pillar: "water", property: "Marina Residences Barcelona",
    capexClass: "capex", capexAmount: 95000, capexCurrency: "THB",
    paybackYears: 3.0, expectedImpactPct: 2.8,
    co2eSaving: 4, priority: "medium", measureType: "retrofit",
    trigger: "Recycled share at 22% — target is 40% by 2030",
    triggerLink: "/performance/water/overview",
    owner: "Engineering Lead", dueDate: "2026-09-20",
    stage: "approved", evidenceCount: 1, createsOpEvent: true, source: "ai",
  },
  {
    id: "m5", code: "WST-001",
    name: "Food-waste segregation programme",
    description: "Add organic stream + LeanPath weighing in main kitchen.",
    pillar: "waste", property: "The Pavilion London",
    capexClass: "mixed", capexAmount: 12000, capexCurrency: "DKK",
    paybackYears: 0.9, expectedImpactPct: 1.7, actualImpactPct: 2.0,
    co2eSaving: 12, priority: "medium", measureType: "behaviour",
    trigger: "Diversion rate 64% — gap to 75% target",
    triggerLink: "/performance/waste/overview",
    owner: "F&B Manager", dueDate: "2026-06-01",
    stage: "completed", evidenceCount: 4, createsOpEvent: true, source: "library",
  },
  {
    id: "m6", code: "CRB-001",
    name: "On-site solar PV — phase 2",
    description: "Add 240 kWp to the existing rooftop array.",
    pillar: "carbon", property: "Skyline Dubai",
    capexClass: "capex", capexAmount: 480000, capexCurrency: "USD",
    paybackYears: 4.2, expectedImpactPct: 6.5,
    co2eSaving: 142, priority: "critical", measureType: "retrofit",
    trigger: "SBTi pathway — Scope 2 reduction shortfall",
    triggerLink: "/performance/carbon/carbon-inventory",
    owner: "Sustainability Manager", dueDate: "2027-02-28",
    stage: "proposed", evidenceCount: 1, createsOpEvent: true, source: "ai",
  },
  {
    id: "m7", code: "SOC-001",
    name: "Sustainability training rollout",
    description: "12-hour online + 4-hour in-person training for 240 staff.",
    pillar: "social", property: "Peaks Resort Zermatt",
    capexClass: "opex", capexAmount: 8000, capexCurrency: "CAD",
    paybackYears: 0, expectedImpactPct: 0,
    co2eSaving: 0, priority: "low", measureType: "policy",
    trigger: "Training hours/FTE below GRI 404 benchmark",
    triggerLink: "/performance/social/overview",
    owner: "HR Lead", dueDate: "2026-07-31",
    stage: "in-progress", evidenceCount: 0, source: "manager",
  },
];

const PILLAR_TARGETS: { pillar: string; total: number; co2eTarget: number }[] = [
  { pillar: "energy",     total: 3, co2eTarget: 115 },
  { pillar: "water",      total: 1, co2eTarget: 4   },
  { pillar: "waste",      total: 1, co2eTarget: 12  },
  { pillar: "carbon",     total: 1, co2eTarget: 142 },
  { pillar: "social",     total: 1, co2eTarget: 0   },
];

/* ================================================================== */

export default function Actions() {
  const [view, setView]               = useState<"list" | "kanban">("list");
  const [stageFilter, setStageFilter] = useState<"all" | Stage>("all");
  const [pillarFilter, setPillarFilter] = useState<"all" | Measure["pillar"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [ownerFilter, setOwnerFilter]  = useState("all");
  const [filtersOpen, setFiltersOpen]  = useState(false);
  const [selected, setSelected]        = useState<Measure | null>(null);
  const [newOpen, setNewOpen]          = useState(false);

  const properties = [...new Set(MEASURES.map((m) => m.property))];
  const owners     = [...new Set(MEASURES.map((m) => m.owner))];

  const filtered = useMemo(() =>
    MEASURES.filter((m) =>
      (stageFilter === "all"   || m.stage    === stageFilter) &&
      (pillarFilter === "all"  || m.pillar   === pillarFilter) &&
      (priorityFilter === "all"|| m.priority === priorityFilter) &&
      (propertyFilter === "all"|| m.property === propertyFilter) &&
      (ownerFilter === "all"   || m.owner    === ownerFilter)
    ), [stageFilter, pillarFilter, priorityFilter, propertyFilter, ownerFilter]);

  const summary = useMemo(() => {
    const inProgress = MEASURES.filter((m) => ["approved","in-progress"].includes(m.stage)).length;
    const co2eSaved  = MEASURES.filter((m) => ["completed","verified"].includes(m.stage))
                               .reduce((s, m) => s + m.co2eSaving, 0);
    const totalCo2e  = MEASURES.reduce((s, m) => s + m.co2eSaving, 0);
    const netZeroPct = totalCo2e > 0 ? Math.round((co2eSaved / totalCo2e) * 100) : 0;
    return { total: MEASURES.length, inProgress, co2eSaved, netZeroPct };
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Improvement measures"
        title="Actions & Measures"
        subtitle="3 critical actions need your decision this week. Review AI-suggested measures, approve what's ready, and track in-progress work toward your net-zero target."
        actions={
          <>
            <button className="btn-secondary"><Sparkles size={14} /> AI recommendations</button>
            <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus size={14} /> New action</button>
          </>
        }
      />

      {/* Platform-detected gaps — RE&O recommendations */}
      <GapRecommendations />

      {/* Impact KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile label="Total actions"      value={String(summary.total)}         hint={`${summary.inProgress} in progress`} tone="info" />
        <SummaryTile label="In progress"        value={String(summary.inProgress)}    hint="approved + active"                   tone="brand" />
        <SummaryTile label="CO₂e saved to date" value={`${summary.co2eSaved} tCO₂e`} hint="completed + verified measures"       tone="good" />
        <SummaryTile label="% of net-zero target" value={`${summary.netZeroPct}%`}   hint="of total pipeline CO₂e"              tone="good" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={cn("btn-secondary", filtersOpen && "bg-ink-100")}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter size={13} /> Filters
        </button>
        <span className="h-5 w-px bg-ink-200 mx-1" />
        {(["all","proposed","approved","in-progress","completed","verified"] as const).map((s) => (
          <Chip key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>
            {s === "all" ? "All stages" : STAGES.find(x => x.key === s)?.label ?? s}
          </Chip>
        ))}
        <span className="h-5 w-px bg-ink-200 mx-1" />
        {(["all","energy","water","waste","carbon","social"] as const).map((p) => (
          <Chip key={p} active={pillarFilter === p} onClick={() => setPillarFilter(p)}>
            {p === "all" ? "All pillars" : p}
          </Chip>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setView("list")}
            className={cn("btn-ghost h-8 px-2", view === "list" && "bg-ink-100")}
            title="List view"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setView("kanban")}
            className={cn("btn-ghost h-8 px-2", view === "kanban" && "bg-ink-100")}
            title="Kanban view"
          >
            <Columns size={14} />
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {filtersOpen && (
        <Card className="card-pad">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-[11px] font-medium text-ink-500">Priority</span>
              <select className="input mt-1" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
                <option value="all">All priorities</option>
                {(["critical","high","medium","low"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-ink-500">Property</span>
              <select className="input mt-1" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
                <option value="all">All properties</option>
                {properties.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-ink-500">Owner</span>
              <select className="input mt-1" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                <option value="all">All owners</option>
                {owners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <button
              className="btn-ghost h-9 px-3 text-[12px] text-ink-500"
              onClick={() => { setPriorityFilter("all"); setPropertyFilter("all"); setOwnerFilter("all"); }}
            >
              <X size={12} /> Clear
            </button>
          </div>
        </Card>
      )}

      {/* Per-pillar progress tracker */}
      <Card>
        <CardHeader title="Progress by pillar" hint="Completed + verified actions vs total · CO₂e delivered vs target" />
        <div className="p-5 space-y-3">
          {PILLAR_TARGETS.map(({ pillar, total, co2eTarget }) => {
            const done     = MEASURES.filter((m) => m.pillar === pillar && ["completed","verified"].includes(m.stage)).length;
            const allCount = MEASURES.filter((m) => m.pillar === pillar).length;
            const co2eDone = MEASURES.filter((m) => m.pillar === pillar && ["completed","verified"].includes(m.stage))
                                     .reduce((s, m) => s + m.co2eSaving, 0);
            const pct      = allCount > 0 ? Math.round((done / allCount) * 100) : 0;
            const co2ePct  = co2eTarget > 0 ? Math.min(100, Math.round((co2eDone / co2eTarget) * 100)) : 0;
            return (
              <div key={pillar} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-2">
                  <Badge tone={PILLAR_TONE[pillar]} className="capitalize w-full justify-center">{pillar}</Badge>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center justify-between text-[11px] text-ink-500 mb-0.5">
                    <span>Actions</span>
                    <span>{done}/{allCount}</span>
                  </div>
                  <ProgressBar value={pct} tone={pct >= 80 ? "good" : pct >= 40 ? "warn" : "bad"} />
                </div>
                <div className="col-span-4">
                  <div className="flex items-center justify-between text-[11px] text-ink-500 mb-0.5">
                    <span>CO₂e saved</span>
                    <span>{co2eDone}/{co2eTarget} tCO₂e</span>
                  </div>
                  <ProgressBar value={co2ePct} tone={co2ePct >= 80 ? "good" : co2ePct >= 40 ? "warn" : "bad"} />
                </div>
                <div className="col-span-2 text-right text-[12px] font-semibold text-ink-700 tabular-nums">
                  {co2ePct}%
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Kanban or list view */}
      {view === "kanban" ? (
        <div className="grid grid-cols-4 gap-3">
          {KANBAN_COLS.map((col) => {
            const cards = filtered.filter((m) => col.stages.includes(m.stage));
            return (
              <div key={col.label} className={cn("rounded-xl border-t-2 bg-ink-50/60 p-3 min-h-[200px]", col.color)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[12px] font-bold text-ink-700">{col.label}</div>
                  <Badge tone="neutral">{cards.length}</Badge>
                </div>
                <div className="space-y-2">
                  {cards.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className="rounded-xl border border-ink-200 bg-white p-3 cursor-pointer hover:shadow-card transition-shadow"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Badge tone={PRIORITY_TONE[m.priority]} className="text-[9px] capitalize shrink-0">{m.priority}</Badge>
                        <Badge tone={PILLAR_TONE[m.pillar]} className="text-[9px] capitalize shrink-0">{m.pillar}</Badge>
                      </div>
                      <div className="text-[12px] font-semibold text-ink-900 leading-tight">{m.name}</div>
                      <div className="text-[10px] text-ink-500 mt-1">{m.property}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-ink-500">
                          <Calendar size={10} /> {m.dueDate}
                        </div>
                        {m.co2eSaving > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-good font-semibold">
                            <Leaf size={10} /> {m.co2eSaving}t
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-400">
                        <UserCheck size={10} /> {m.owner}
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center py-4 text-[11px] text-ink-400">No actions</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader title="Measures" hint={`${filtered.length} of ${MEASURES.length}`} />
          <ul className="p-2 space-y-2">
            {filtered.map((m) => (
              <li
                key={m.id}
                onClick={() => setSelected(m)}
                className="rounded-xl border border-ink-200 p-4 hover:shadow-card cursor-pointer transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-ink-500">{m.code}</span>
                      <Badge tone={PILLAR_TONE[m.pillar]}>{m.pillar}</Badge>
                      <Badge tone={PRIORITY_TONE[m.priority]} className="capitalize">{m.priority}</Badge>
                      <Badge tone="neutral" className="capitalize">{m.measureType}</Badge>
                      {m.source === "ai" && <Badge tone="brand"><Sparkles size={10} /> AI suggested</Badge>}
                    </div>
                    <div className="text-sm font-semibold text-ink-900 mt-1">{m.name}</div>
                    <div className="text-[12px] text-ink-500 mt-0.5">{m.description}</div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div>
                      <div className="text-[10px] text-ink-500">Expected uplift</div>
                      <div className="text-good font-bold text-sm">+{m.expectedImpactPct.toFixed(1)} pts</div>
                    </div>
                    {m.co2eSaving > 0 && (
                      <div>
                        <div className="text-[10px] text-ink-500">CO₂e saving</div>
                        <div className="text-good font-bold text-sm flex items-center gap-1 justify-end">
                          <Leaf size={11} /> {m.co2eSaving}t/yr
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <StatusPipeline steps={STAGES} active={STAGE_INDEX[m.stage]} size="sm" />

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                  <Meta icon={<Building2 size={12} />} label="Property" value={m.property} />
                  <Meta icon={<UserCheck size={12} />} label="Owner"    value={m.owner} />
                  <Meta icon={<Calendar size={12} />}  label="Due"      value={m.dueDate} />
                  <Meta icon={<Target size={12} />}    label="Capex"    value={`${m.capexCurrency} ${m.capexAmount.toLocaleString()} · ${m.paybackYears}y`} />
                </div>

                <div className="mt-2 rounded-lg border border-warn/25 bg-warn/10 p-2 text-[11px] text-warn flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-warn mt-0.5 shrink-0" />
                  <span>
                    <strong>Trigger:</strong> {m.trigger}
                    {m.triggerLink && <a className="ml-1 underline font-semibold" href={m.triggerLink}>Investigate ›</a>}
                  </span>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-8 text-center text-sm text-ink-500">No actions match the selected filters.</li>
            )}
          </ul>
        </Card>
      )}

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <ShieldCheck size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">
          Measures need <strong>GM approval</strong> before moving Proposed → Approved. Once <strong>Completed</strong>, the platform auto-creates an <strong>operational event</strong> on the GP timeline so before/after performance is measurable.
        </div>
      </div>

      <MeasureModal measure={selected} onClose={() => setSelected(null)} />
      <NewActionModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

/* ---------- New action modal ---------- */

type NewActionForm = {
  title: string;
  pillar: Measure["pillar"] | "";
  property: string;
  owner: string;
  dueDate: string;
  savingValue: string;
  savingUnit: string;
  priority: Priority | "";
  measureType: MeasureType | "";
};

const EMPTY_FORM: NewActionForm = {
  title: "", pillar: "", property: "", owner: "", dueDate: "",
  savingValue: "", savingUnit: "tCO2e/yr", priority: "", measureType: "",
};

function NewActionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<NewActionForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof NewActionForm>(k: K, v: NewActionForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = form.title && form.pillar && form.property && form.owner && form.priority && form.measureType;

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitted(true);
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New action"
      subtitle="Actions move through GM approval before implementation. CO₂e savings are tracked against the net-zero target."
      size="lg"
      footer={
        submitted ? (
          <button className="btn-primary" onClick={handleClose}>Done</button>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button
              className={cn("btn-primary", !canSubmit && "opacity-50 cursor-not-allowed")}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              <ArrowRight size={14} /> Submit for approval
            </button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={40} className="text-good" />
          <div className="text-lg font-bold text-ink-900">Action submitted</div>
          <div className="text-sm text-ink-500">"{form.title}" is now awaiting GM approval.</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Title <span className="text-bad">*</span></span>
              <input className="input mt-1" placeholder="e.g. Solar thermal — pool heating" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Pillar <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.pillar} onChange={(e) => set("pillar", e.target.value as any)}>
                <option value="">— Select —</option>
                {["energy","water","waste","carbon","social","governance"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Property <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.property} onChange={(e) => set("property", e.target.value)}>
                <option value="">— Select —</option>
                {["Skyline Dubai","Peaks Resort Zermatt","Oceanfront Cape Town","The Pavilion London","Marina Residences Barcelona"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Owner <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.owner} onChange={(e) => set("owner", e.target.value)}>
                <option value="">— Select —</option>
                {["Engineering Lead","Property SM","Sustainability Manager","F&B Manager","HR Lead"].map((o) => (
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
                {(["critical","high","medium","low"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Measure type <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.measureType} onChange={(e) => set("measureType", e.target.value as any)}>
                <option value="">— Select —</option>
                {(["retrofit","behaviour","procurement","policy"] as MeasureType[]).map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Estimated saving (value)</span>
              <input className="input mt-1" type="number" placeholder="0" value={form.savingValue} onChange={(e) => set("savingValue", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Unit</span>
              <select className="input mt-1" value={form.savingUnit} onChange={(e) => set("savingUnit", e.target.value)}>
                <option value="tCO2e/yr">tCO₂e/yr</option>
                <option value="kWh/yr">kWh/yr</option>
                <option value="m3/yr">m³/yr</option>
                <option value="kg/yr">kg/yr</option>
              </select>
            </label>
          </div>
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900 flex items-start gap-2">
            <Zap size={13} className="text-brand-700 mt-0.5 shrink-0" />
            Actions are submitted as <strong>Proposed</strong> and need GM approval before implementation begins.
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Measure detail modal (unchanged) ---------- */

function MeasureModal({ measure, onClose }: { measure: Measure | null; onClose: () => void }) {
  return (
    <Modal
      open={measure !== null}
      onClose={onClose}
      title={measure?.name ?? ""}
      subtitle={measure ? `${measure.code} · ${measure.property}` : ""}
      size="xl"
      hero={
        measure && (
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <div className="text-[11px] uppercase font-semibold text-ink-500">Expected GP uplift</div>
              <div className="text-3xl font-extrabold text-good">+{measure.expectedImpactPct.toFixed(1)} pts</div>
            </div>
            {measure.actualImpactPct != null && (
              <div>
                <div className="text-[11px] uppercase font-semibold text-ink-500">Verified actual</div>
                <div className="text-2xl font-extrabold text-good">+{measure.actualImpactPct.toFixed(1)} pts</div>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase font-semibold text-ink-500">CO₂e saving</div>
              <div className="text-2xl font-bold text-good flex items-center gap-1">
                <Leaf size={18} /> {measure.co2eSaving}t/yr
              </div>
            </div>
            <div className="ml-auto">
              <div className="text-[11px] uppercase font-semibold text-ink-500">Capex</div>
              <div className="text-xl font-bold text-ink-900">{measure.capexCurrency} {measure.capexAmount.toLocaleString()}</div>
            </div>
          </div>
        )
      }
      footer={
        measure && (
          <>
            <button className="btn-secondary" onClick={onClose}>Close</button>
            {measure.stage === "proposed" && (
              <button className="btn-primary"><Check size={14} /> Approve (GM sign-off)</button>
            )}
            {measure.stage === "completed" && (
              <button className="btn-primary"><CheckCircle2 size={14} /> Verify GP impact</button>
            )}
          </>
        )
      }
    >
      {measure && (
        <div className="space-y-4">
          <div className="card-pad-lg bg-white border border-ink-200 rounded-xl2">
            <div className="text-sm font-bold text-ink-900 mb-2">Implementation pipeline</div>
            <StatusPipeline steps={STAGES} active={STAGE_INDEX[measure.stage]} />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Card className="col-span-12 lg:col-span-7 card-pad">
              <div className="text-sm font-bold text-ink-900 mb-2">Why this measure</div>
              <div className="rounded-xl bg-warn/10 border border-warn/25 p-3 text-[13px] text-warn">
                {measure.trigger}
                {measure.triggerLink && (
                  <a className="ml-2 underline font-semibold" href={measure.triggerLink}>Investigate ›</a>
                )}
              </div>
              <div className="mt-3 text-sm text-ink-700">{measure.description}</div>
            </Card>

            <Card className="col-span-12 lg:col-span-5 card-pad">
              <div className="text-sm font-bold text-ink-900 mb-2">Assumptions</div>
              <ul className="space-y-1.5 text-sm">
                <Row label="Pillar"       value={measure.pillar} />
                <Row label="Property"     value={measure.property} />
                <Row label="Priority"     value={measure.priority} />
                <Row label="Type"         value={measure.measureType} />
                <Row label="Class"        value={measure.capexClass} />
                <Row label="Capex"        value={`${measure.capexCurrency} ${measure.capexAmount.toLocaleString()}`} />
                <Row label="Payback"      value={`${measure.paybackYears} years`} />
                <Row label="Owner"        value={measure.owner} />
                <Row label="Due date"     value={measure.dueDate} />
              </ul>
            </Card>
          </div>

          {measure.stage === "verified" && measure.actualImpactPct != null && (
            <Card className="card-pad">
              <div className="flex items-center gap-2 text-good mb-2">
                <CheckCircle2 size={16} /> <span className="font-semibold">Verified GP impact</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[11px] uppercase text-ink-500 font-semibold">Expected</div>
                  <div className="text-2xl font-bold text-ink-900">+{measure.expectedImpactPct.toFixed(1)} pts</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-ink-500 font-semibold">Actual</div>
                  <div className="text-2xl font-bold text-good">+{measure.actualImpactPct.toFixed(1)} pts</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-ink-500 font-semibold">Variance</div>
                  <div className="text-2xl font-bold text-good inline-flex items-center gap-1">
                    <TrendingDown size={16} className="rotate-180" />
                    +{(measure.actualImpactPct - measure.expectedImpactPct).toFixed(1)}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------- helpers ---------- */

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("tab capitalize", active && "tab-active")}>{children}</button>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-ink-700 truncate">
      <span className="text-ink-400">{icon}</span>
      <span className="text-ink-500 shrink-0">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className="text-ink-900 font-medium capitalize">{value}</span>
    </li>
  );
}

/* ---------- Gap-based RE&O recommendation cards ---------- */

type GapCard = {
  id: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  gap: string;
  recommendation: string;
  ctaLabel: string;
  ctaHref: string;
  tone: "bad" | "warn" | "info";
};

const GAP_CARDS: GapCard[] = [
  {
    id: "irec",
    icon: <Sun size={18} />,
    label: "Scope 2 shortfall detected",
    title: "Purchase I-RECs to cover residual market-based Scope 2",
    gap: "Skyline Dubai has a Scope 2 shortfall of ~142 tCO₂e after all committed physical efficiency measures. The SBTi pathway requires market-based coverage before the 2026 reporting period closes.",
    recommendation: "Request I-RECs (Renewable Energy Certificates) in the Solutions Hub to achieve a market-based Scope 2 of zero for the shortfall period.",
    ctaLabel: "Request I-RECs in Solutions Hub",
    ctaHref: "/marketplace",
    tone: "bad",
  },
  {
    id: "carbon",
    icon: <Leaf size={18} />,
    label: "Residual Scope 1 emissions remain",
    title: "Consider verified carbon credits for residual Scope 1 / 2 emissions",
    gap: "After all in-pipeline physical measures are verified, an estimated 38 tCO₂e of Scope 1 emissions remain unaddressed across the portfolio — primarily from refrigerants and backup generators.",
    recommendation: "High-quality, verified carbon credits (VCS / Gold Standard) can offset residual emissions as a last-resort measure once all reduction actions are in progress.",
    ctaLabel: "Explore carbon credits in Solutions Hub",
    ctaHref: "/marketplace",
    tone: "warn",
  },
];

function GapRecommendations() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = GAP_CARDS.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  const borderColor: Record<GapCard["tone"], string> = {
    bad:  "border-bad/25 bg-bad/5",
    warn: "border-warn/25 bg-warn/5",
    info: "border-ink-200 bg-ink-50",
  };
  const labelColor: Record<GapCard["tone"], string> = {
    bad:  "text-bad",
    warn: "text-warn",
    info: "text-ink-500",
  };
  const iconBg: Record<GapCard["tone"], string> = {
    bad:  "bg-bad/10 text-bad",
    warn: "bg-warn/10 text-warn",
    info: "bg-ink-100 text-ink-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">
        <Sparkles size={12} className="text-brand-700" />
        Platform-detected gaps — recommended instruments
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((card) => (
          <div
            key={card.id}
            className={cn("rounded-xl border p-4 flex flex-col gap-3", borderColor[card.tone])}
          >
            <div className="flex items-start gap-3">
              <div className={cn("w-9 h-9 rounded-lg grid place-items-center shrink-0", iconBg[card.tone])}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn("text-[11px] font-semibold uppercase tracking-wide mb-0.5", labelColor[card.tone])}>
                  {card.label}
                </div>
                <div className="text-sm font-bold text-ink-900 leading-tight">{card.title}</div>
              </div>
              <button
                className="text-ink-400 hover:text-ink-600 shrink-0"
                onClick={() => setDismissed((s) => new Set([...s, card.id]))}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
            <div className="text-[12px] text-ink-600 leading-relaxed">{card.gap}</div>
            <div className="rounded-lg bg-white/70 border border-ink-200 p-2.5 text-[12px] text-ink-700 flex items-start gap-1.5">
              <Lightbulb size={12} className="text-brand-700 mt-0.5 shrink-0" />
              {card.recommendation}
            </div>
            <Link
              to={card.ctaHref}
              className="btn-primary self-start text-[12px] flex items-center gap-1.5 h-8 px-3"
            >
              {card.ctaLabel} <ArrowRight size={12} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, hint, tone }: {
  label: string; value: string; hint?: string; tone: "brand" | "good" | "info" | "warn";
}) {
  const ring = {
    brand: "border-brand-200 bg-brand-50/40",
    good:  "border-good/25 bg-good/10",
    info:  "border-ink-200 bg-ink-50",
    warn:  "border-warn/25 bg-warn/10",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-4", ring)}>
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</div>
      <div className="text-2xl font-bold text-ink-900 mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}
