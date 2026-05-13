import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Users, ShieldCheck, ArrowRight, X, Info, AlertTriangle,
  ChevronRight, BookOpen, Building2, AlertCircle, FileText,
  ClipboardList, TrendingUp, CheckCircle2, ExternalLink,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, LineChart, Line, CartesianGrid, ComposedChart,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  PORTFOLIO_SOCIAL_BY_HOTEL,
  PORTFOLIO_GOVERNANCE_BY_HOTEL,
  SG_TRAINING_BY_HOTEL,
  SG_LTIFR_TREND,
  SG_INCIDENTS_BY_HOTEL,
  SG_POLICY_MATRIX,
  SG_SUPPLIER_FUNNEL,
  SG_GOV_GAPS_BY_TYPE,
  SG_EVIDENCE_GAPS,
  SG_HOTEL_GAP_TABLE,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

// ── types ─────────────────────────────────────────────────────────────────────

type HotelStatus = "complete" | "partial" | "missing" | "needs-review" | "na";
type TrainingFilter = "overall" | "general" | "sustainability" | "hs" | "coc";
type Drilldown = { key: string; label: string } | null;

// ── shared helpers ────────────────────────────────────────────────────────────

function stTone(s: string): "good" | "warn" | "bad" {
  if (s === "complete" || s === "current") return "good";
  if (s === "partial" || s === "needs-review" || s === "expiring") return "warn";
  return "bad";
}

function stLabel(s: HotelStatus) {
  const m: Record<HotelStatus, string> = {
    complete: "Complete", partial: "Partial",
    missing: "Missing", "needs-review": "Review", na: "N/A",
  };
  return m[s];
}

function InsightLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-3 text-[11px] text-ink-500 px-1">
      <Info size={11} className="shrink-0 mt-0.5 text-ink-400" />
      <span>{text}</span>
    </div>
  );
}

function ConfNote({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-ink-400 mt-1.5">
      <ShieldCheck size={9} className="text-ink-300 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function SectionDivider({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-2">
      <div className="h-px flex-1 bg-ink-100" />
      <div className="text-center shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{title}</div>
        {sub && <div className="text-[10px] text-ink-400 mt-0.5">{sub}</div>}
      </div>
      <div className="h-px flex-1 bg-ink-100" />
    </div>
  );
}

// ── Drilldown Panel ───────────────────────────────────────────────────────────

function DrilldownPanel({ drilldown, onClose }: { drilldown: { key: string; label: string }; onClose: () => void }) {
  const { key, label } = drilldown;

  function TrainingDetail() {
    return (
      <div className="p-5 space-y-4">
        <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Training completion by hotel — all types</div>
        <div className="space-y-2">
          {[...SG_TRAINING_BY_HOTEL].sort((a, b) => b.overall - a.overall).map((h) => (
            <div key={h.hotel} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50">
              <div className="w-[130px] shrink-0 text-[11px] font-medium text-ink-800 truncate">{h.shortName}</div>
              <div className="flex gap-2 flex-1 min-w-0">
                {[
                  { label: "Gen", val: h.general },
                  { label: "S'ity", val: h.sustainability },
                  { label: "H&S", val: h.hs },
                  { label: "CoC", val: h.coc },
                ].map((t) => (
                  <div key={t.label} className="flex flex-col items-center min-w-[44px]">
                    <span className={cn("text-[11px] font-bold tabular-nums",
                      t.val >= 85 ? "text-good" : t.val >= 70 ? "text-warn" : "text-bad"
                    )}>{t.val}%</span>
                    <span className="text-[9px] text-ink-400">{t.label}</span>
                  </div>
                ))}
              </div>
              <div className={cn("shrink-0 text-[12px] font-bold tabular-nums",
                h.overall >= 85 ? "text-good" : h.overall >= 70 ? "text-warn" : "text-bad"
              )}>{h.overall}%</div>
              <Link to="/properties" className="shrink-0 text-[10px] text-brand-600 hover:underline flex items-center gap-0.5">
                Detail <ChevronRight size={9} />
              </Link>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-ink-400 px-1">Gen = General · S'ity = Sustainability · H&S = Health &amp; Safety · CoC = Code of Conduct</div>
      </div>
    );
  }

  function SupplierDetail() {
    return (
      <div className="p-5 space-y-4">
        <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Supplier governance — hotel breakdown</div>
        <div className="space-y-2">
          {[...PORTFOLIO_GOVERNANCE_BY_HOTEL].sort((a, b) => a.supplierCodePct - b.supplierCodePct).map((h) => (
            <div key={h.hotel} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50">
              <div className="w-[150px] shrink-0 text-[11px] font-medium text-ink-800 truncate">{h.hotel}</div>
              <div className="flex-1">
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", h.supplierCodePct >= 75 ? "bg-good" : h.supplierCodePct >= 55 ? "bg-warn" : "bg-bad")}
                    style={{ width: `${h.supplierCodePct}%` }}
                  />
                </div>
              </div>
              <span className={cn("text-[12px] font-bold tabular-nums shrink-0 w-10 text-right",
                h.supplierCodePct >= 75 ? "text-good" : h.supplierCodePct >= 55 ? "text-warn" : "text-bad"
              )}>{h.supplierCodePct}%</span>
              <Link to="/properties" className="shrink-0 text-[10px] text-brand-600 hover:underline flex items-center gap-0.5">
                Detail <ChevronRight size={9} />
              </Link>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-1.5 rounded-lg bg-warn/10 px-3 py-2 text-[11px] text-warn">
          <Info size={11} className="shrink-0 mt-0.5" />
          <span>31 suppliers have not submitted ESG assessments. Riverside Bangkok and Zermatt have the lowest adoption rates.</span>
        </div>
      </div>
    );
  }

  function AttestationDetail() {
    return (
      <div className="p-5 space-y-3">
        <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Attestation completion — all hotels</div>
        <div className="space-y-2">
          {[...PORTFOLIO_GOVERNANCE_BY_HOTEL].sort((a, b) => a.attestationsPct - b.attestationsPct).map((h) => {
            const total = 12;
            const done = Math.round(h.attestationsPct / 100 * total);
            const pending = total - done;
            return (
              <div key={h.hotel} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50">
                <div className="w-[150px] shrink-0 text-[11px] font-medium text-ink-800 truncate">{h.hotel}</div>
                <div className="flex-1">
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", h.attestationsPct >= 85 ? "bg-good" : h.attestationsPct >= 70 ? "bg-warn" : "bg-bad")}
                      style={{ width: `${h.attestationsPct}%` }}
                    />
                  </div>
                </div>
                <span className={cn("text-[12px] font-bold tabular-nums shrink-0 w-10 text-right",
                  h.attestationsPct >= 85 ? "text-good" : h.attestationsPct >= 70 ? "text-warn" : "text-bad"
                )}>{h.attestationsPct}%</span>
                <span className="text-[10px] text-ink-400 shrink-0 w-20 text-right">{done}/{total} · {pending} pending</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function PolicyDetail() {
    return (
      <div className="p-5 space-y-3">
        <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Policy status — portfolio-wide</div>
        <div className="space-y-1.5">
          {SG_POLICY_MATRIX.map((p) => (
            <div key={p.policy} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-ink-50">
              <div className={cn("w-2 h-2 rounded-full shrink-0",
                p.status === "current" ? "bg-good" : p.status === "expiring" ? "bg-warn" : "bg-bad"
              )} />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-medium text-ink-800">{p.policy}</span>
                <span className="text-[10px] text-ink-400 ml-2">{p.category}</span>
              </div>
              {p.status === "expired" && <Badge tone="bad">Expired {Math.abs(p.expiryDays)}d ago</Badge>}
              {p.status === "expiring" && <Badge tone="warn">Expires in {p.expiryDays}d</Badge>}
              {p.status === "current" && <Badge tone="good">Current</Badge>}
              {p.missingEvidence > 0 && <Badge tone="warn">{p.missingEvidence} evidence gap{p.missingEvidence > 1 ? "s" : ""}</Badge>}
              <span className="text-[10px] text-ink-400 shrink-0">{p.owner}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function LtifrDetail() {
    return (
      <div className="p-5 space-y-4">
        <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Safety — incidents by hotel</div>
        <div className="space-y-1.5">
          {SG_INCIDENTS_BY_HOTEL.map((h) => (
            <div key={h.shortName} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50">
              <div className="w-[130px] shrink-0 text-[11px] font-medium text-ink-800">{h.shortName}</div>
              <div className="flex gap-3 text-[10px] text-ink-500">
                <span className="text-ink-400">{h.total} total</span>
                {h.lostTime > 0 && <span className="text-bad font-semibold">{h.lostTime} LTI</span>}
                {h.major > 0 && <span className="text-warn">{h.major} major</span>}
                <span>{h.minor} minor</span>
              </div>
              <div className="flex-1">
                <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden flex">
                  <div className="bg-bad h-full" style={{ width: `${(h.lostTime / 8) * 100}%` }} />
                  <div className="bg-warn h-full" style={{ width: `${(h.major / 8) * 100}%` }} />
                  <div className="bg-ink-300 h-full" style={{ width: `${(h.minor / 8) * 100}%` }} />
                </div>
              </div>
              <Link to="/properties" className="shrink-0 text-[10px] text-brand-600 hover:underline flex items-center gap-0.5">
                Detail <ChevronRight size={9} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const contentMap: Record<string, React.ReactNode> = {
    training: <TrainingDetail />,
    supplier: <SupplierDetail />,
    attestations: <AttestationDetail />,
    policies: <PolicyDetail />,
    ltifr: <LtifrDetail />,
  };

  const content = contentMap[key];
  if (!content) return null;

  return (
    <div className="rounded-2xl border-2 border-brand-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-ink-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" />
          <span className="text-[14px] font-bold text-ink-900">{label} — Portfolio Detail</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors">
          <X size={15} />
        </button>
      </div>
      {content}
      <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-[12px] text-brand-800">
        <Info size={13} className="shrink-0 mt-0.5 text-brand-600" />
        <span>Click any hotel name to open its property-level social &amp; governance detail.</span>
      </div>
    </div>
  );
}

// ── 1. Summary Cards ──────────────────────────────────────────────────────────

function SummaryCards({ onDrilldown }: { onDrilldown: (key: string, label: string) => void }) {
  const SOCIAL = [
    {
      key: "fte", icon: Users, label: "Employees / FTE", value: "1,985",
      sub: "across 10 hotels", tone: undefined as "good" | "warn" | "bad" | undefined,
      coverage: "10 of 10 hotels reported", confidence: "94% approved",
    },
    {
      key: "turnover", icon: TrendingUp, label: "Employee Turnover", value: "22%",
      sub: "portfolio avg · annualised", tone: "warn" as const,
      coverage: "9 of 10 hotels reported", confidence: "88% approved",
    },
    {
      key: "training", icon: BookOpen, label: "Training Completion", value: "76%",
      sub: "all training types", tone: "warn" as const,
      coverage: "9 of 10 hotels reported", confidence: "92% approved · 2 evidence gaps",
    },
    {
      key: "ltifr", icon: AlertTriangle, label: "LTIFR", value: "0.82",
      sub: "per 200k hrs · −0.30 YoY", tone: "good" as const,
      coverage: "10 of 10 hotels reported", confidence: "96% approved",
    },
  ];

  const GOV = [
    {
      key: "policies", icon: FileText, label: "Policies Current", value: "75%",
      sub: "6 of 8 policies current", tone: "warn" as const,
      coverage: "10 of 10 hotels covered", confidence: "3 policies expiring soon",
    },
    {
      key: "attestations", icon: ClipboardList, label: "Attestations Complete", value: "81%",
      sub: "portfolio average", tone: "warn" as const,
      coverage: "10 of 10 hotels reported", confidence: "4 hotels below 80%",
    },
    {
      key: "supplier", icon: Building2, label: "Supplier Code Adoption", value: "74%",
      sub: "89 of 120 suppliers signed", tone: "warn" as const,
      coverage: "120 suppliers tracked", confidence: "31 missing ESG assessment",
    },
    {
      key: "gaps", icon: AlertCircle, label: "Open Evidence Gaps", value: "34",
      sub: "across portfolio", tone: "bad" as const,
      coverage: "8 hotels with open gaps", confidence: "10 critical · 24 standard",
    },
  ];

  function SummaryCard({ card, groupColor }: { card: typeof SOCIAL[0]; groupColor: string }) {
    const Icon = card.icon;
    const isClickable = ["training", "ltifr", "attestations", "supplier", "policies"].includes(card.key);
    return (
      <div
        onClick={() => isClickable && onDrilldown(card.key, card.label)}
        className={cn(
          "rounded-xl border border-ink-100 bg-white p-4 flex flex-col gap-1",
          isClickable ? "cursor-pointer hover:border-brand-200 hover:shadow-sm transition-all" : ""
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 truncate">{card.label}</div>
          <div className={cn("w-6 h-6 rounded-lg grid place-items-center shrink-0", groupColor)}>
            <Icon size={12} />
          </div>
        </div>
        <div className={cn("text-2xl font-bold tabular-nums",
          card.tone === "good" ? "text-good" : card.tone === "warn" ? "text-warn" : card.tone === "bad" ? "text-bad" : "text-ink-900"
        )}>
          {card.value}
        </div>
        {card.sub && <div className="text-[11px] text-ink-500">{card.sub}</div>}
        <div className="mt-auto pt-2 border-t border-ink-50 space-y-0.5">
          <ConfNote text={card.coverage} />
          <ConfNote text={card.confidence} />
        </div>
        {isClickable && (
          <div className="text-[10px] text-brand-600 flex items-center gap-0.5 font-medium">
            View detail <ChevronRight size={9} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
          <Users size={10} className="text-pillar-social" /> Social
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SOCIAL.map((c) => <SummaryCard key={c.key} card={c} groupColor="bg-pillar-social/10 text-pillar-social" />)}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
          <ShieldCheck size={10} className="text-pillar-gov" /> Governance
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {GOV.map((c) => <SummaryCard key={c.key} card={c} groupColor="bg-pillar-gov/10 text-pillar-gov" />)}
        </div>
      </div>
    </div>
  );
}

// ── 2. Social Performance ─────────────────────────────────────────────────────

const AVG_TURNOVER = Math.round(
  PORTFOLIO_SOCIAL_BY_HOTEL.reduce((s, h) => s + h.turnoverPct, 0) / PORTFOLIO_SOCIAL_BY_HOTEL.length
);
const AVG_LOCAL = Math.round(
  PORTFOLIO_SOCIAL_BY_HOTEL.reduce((s, h) => s + h.localSourcingPct, 0) / PORTFOLIO_SOCIAL_BY_HOTEL.length
);

const TRAINING_FILTER_OPTS: { key: TrainingFilter; label: string }[] = [
  { key: "overall",       label: "Overall"       },
  { key: "general",       label: "General"       },
  { key: "sustainability",label: "Sustainability" },
  { key: "hs",            label: "H&S"           },
  { key: "coc",           label: "CoC"           },
];

function SocialPerformance({ onDrilldown }: { onDrilldown: (k: string, l: string) => void }) {
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilter>("overall");

  const turnoverData = [...PORTFOLIO_SOCIAL_BY_HOTEL]
    .sort((a, b) => b.turnoverPct - a.turnoverPct)
    .map((h) => ({ name: h.hotel.replace(" Hotel", "").replace("Residences ", "").replace(" Resort", "").replace("The ", ""), val: h.turnoverPct }));

  const trainingData = [...SG_TRAINING_BY_HOTEL]
    .sort((a, b) => (b[trainingFilter] as number) - (a[trainingFilter] as number))
    .map((h) => ({ name: h.shortName, val: h[trainingFilter] as number }));
  const avgTraining = Math.round(trainingData.reduce((s, d) => s + d.val, 0) / trainingData.length);

  const localData = [...PORTFOLIO_SOCIAL_BY_HOTEL]
    .sort((a, b) => b.localSourcingPct - a.localSourcingPct)
    .map((h) => ({ name: h.hotel.replace(" Hotel", "").replace("Residences ", "").replace(" Resort", "").replace("The ", ""), val: h.localSourcingPct }));

  const aboveAvgTurnover = turnoverData.filter((d) => d.val > AVG_TURNOVER).length;
  const belowTraining = trainingData.filter((d) => d.val < 75).length;
  const aboveLocalTarget = localData.filter((d) => d.val >= 40).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Turnover by Hotel */}
      <Card>
        <CardHeader title="Turnover by Hotel" hint="% annualised — ranked highest first" />
        <div className="px-4 pb-2 pt-2">
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={turnoverData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 110 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v}%`, "Turnover"]} />
              <ReferenceLine x={AVG_TURNOVER} stroke="#94A3B8" strokeDasharray="4 3"
                label={{ value: `Avg ${AVG_TURNOVER}%`, position: "top", fontSize: 10, fill: "#64748B" }} />
              <Bar dataKey="val" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {turnoverData.map((d) => (
                  <Cell key={d.name} fill={d.val > 25 ? "#EF4444" : d.val > 18 ? "#F59E0B" : "#22C55E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <InsightLine text={`${aboveAvgTurnover} hotel${aboveAvgTurnover !== 1 ? "s" : ""} have turnover above the portfolio average of ${AVG_TURNOVER}%.`} />
          <ConfNote text="9 of 10 hotels reported · 88% approved" />
        </div>
      </Card>

      {/* Training Completion */}
      <Card>
        <CardHeader
          title="Training Completion by Hotel"
          hint="% of staff completed required training"
          right={
            <div className="flex gap-0.5">
              {TRAINING_FILTER_OPTS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setTrainingFilter(o.key)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                    trainingFilter === o.key ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="px-4 pb-2 pt-2"
          onClick={() => onDrilldown("training", "Training Completion")}
          style={{ cursor: "pointer" }}
        >
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={trainingData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 110 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v}%`, "Completion"]} />
              <ReferenceLine x={avgTraining} stroke="#94A3B8" strokeDasharray="4 3"
                label={{ value: `Avg ${avgTraining}%`, position: "top", fontSize: 10, fill: "#64748B" }} />
              <ReferenceLine x={75} stroke="#EF4444" strokeDasharray="3 3" opacity={0.4} />
              <Bar dataKey="val" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {trainingData.map((d) => (
                  <Cell key={d.name} fill={d.val >= 85 ? "#22C55E" : d.val >= 70 ? "#F59E0B" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <InsightLine text={`${belowTraining} hotel${belowTraining !== 1 ? "s" : ""} are below 75% training completion. Click to see breakdown by training type.`} />
          <ConfNote text="9 of 10 hotels reported · 92% approved · 2 evidence gaps" />
        </div>
      </Card>

      {/* Safety Performance */}
      <Card>
        <CardHeader
          title="Safety Performance"
          hint="LTIFR trend + incidents by hotel"
          right={<span className="text-[11px] text-good font-semibold">LTIFR improving ↓</span>}
        />
        <div className="px-4 pb-2 pt-2" onClick={() => onDrilldown("ltifr", "Safety — LTIFR & Incidents")} style={{ cursor: "pointer" }}>
          <div className="text-[10px] text-ink-500 font-semibold uppercase tracking-wide mb-1">LTIFR trend — 12 months</div>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={SG_LTIFR_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} width={28} domain={[0, 1.3]} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v.toFixed(2)}`, "LTIFR"]} />
              <Line type="monotone" dataKey="ltifr" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-ink-500 font-semibold uppercase tracking-wide mb-1 mt-3">Incidents by hotel (total)</div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={SG_INCIDENTS_BY_HOTEL} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 110 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="shortName" width={106} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number, n: string) => [`${v}`, n === "lostTime" ? "Lost-time" : n === "major" ? "Major" : "Minor"]} />
              <Bar dataKey="minor"    name="minor"    stackId="a" fill="#D1D5DB" maxBarSize={14} />
              <Bar dataKey="major"    name="major"    stackId="a" fill="#F59E0B" maxBarSize={14} />
              <Bar dataKey="lostTime" name="lostTime" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-1 text-[10px] text-ink-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#D1D5DB] rounded-full inline-block" />Minor</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-warn rounded-full inline-block" />Major</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-bad rounded-full inline-block" />Lost-time</span>
          </div>
          <InsightLine text="LTIFR improved from 1.12 to 0.82 over the period. Airport Dubai accounts for the highest incident count." />
          <ConfNote text="10 of 10 hotels reported · 96% approved" />
        </div>
      </Card>

      {/* Local Sourcing */}
      <Card>
        <CardHeader title="Local Sourcing by Hotel" hint="% of F&B procurement from local suppliers" />
        <div className="px-4 pb-2 pt-2">
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={localData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 110 }}>
              <XAxis type="number" domain={[0, 85]} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v}%`, "Local sourcing"]} />
              <ReferenceLine x={40} stroke="#94A3B8" strokeDasharray="4 3"
                label={{ value: "Target 40%", position: "top", fontSize: 10, fill: "#64748B" }} />
              <ReferenceLine x={AVG_LOCAL} stroke="#6366F1" strokeDasharray="3 3" opacity={0.5}
                label={{ value: `Avg ${AVG_LOCAL}%`, position: "insideTopRight", fontSize: 10, fill: "#6366F1" }} />
              <Bar dataKey="val" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {localData.map((d) => (
                  <Cell key={d.name} fill={d.val >= 50 ? "#22C55E" : d.val >= 35 ? "#F59E0B" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <InsightLine text={`${aboveLocalTarget} hotels exceed the 40% local sourcing target. Paris and Cape Town lead; Airport Dubai needs attention.`} />
          <ConfNote text="9 of 10 hotels reported · 85% approved" />
        </div>
      </Card>
    </div>
  );
}

// ── 3. Governance & Supplier Controls ─────────────────────────────────────────

function GovernanceControls({ onDrilldown }: { onDrilldown: (k: string, l: string) => void }) {
  const avgAttestation = Math.round(
    PORTFOLIO_GOVERNANCE_BY_HOTEL.reduce((s, h) => s + h.attestationsPct, 0) / PORTFOLIO_GOVERNANCE_BY_HOTEL.length
  );
  const belowAttestation = PORTFOLIO_GOVERNANCE_BY_HOTEL.filter((h) => h.attestationsPct < 80).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Policy Status Matrix */}
      <Card>
        <CardHeader
          title="Policy Status Matrix"
          hint="portfolio-wide coverage · all 10 hotels"
          right={
            <button onClick={() => onDrilldown("policies", "Policy Status")}
              className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 font-medium">
              Detail <ChevronRight size={10} />
            </button>
          }
        />
        <div className="px-4 pb-4 pt-2">
          <div className="space-y-1">
            {SG_POLICY_MATRIX.map((p) => (
              <div key={p.policy}
                onClick={() => onDrilldown("policies", "Policy Status")}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-ink-50 cursor-pointer group transition-colors"
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0",
                  p.status === "current" ? "bg-good" : p.status === "expiring" ? "bg-warn" : "bg-bad"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-ink-800 truncate">{p.policy}</span>
                    <span className="text-[9px] bg-ink-100 text-ink-500 rounded px-1 py-0.5 shrink-0">{p.category}</span>
                  </div>
                  <div className="text-[10px] text-ink-400">{p.owner}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.status === "expired" && <Badge tone="bad">Expired {Math.abs(p.expiryDays)}d ago</Badge>}
                  {p.status === "expiring" && <Badge tone="warn">Expires {p.expiryDays}d</Badge>}
                  {p.status === "current" && <Badge tone="good">Current</Badge>}
                  {p.missingEvidence > 0 && (
                    <span className="text-[10px] text-warn font-semibold">{p.missingEvidence} gap{p.missingEvidence > 1 ? "s" : ""}</span>
                  )}
                  <ChevronRight size={9} className="text-ink-300 group-hover:text-brand-600" />
                </div>
              </div>
            ))}
          </div>
          <InsightLine text="2 policies expiring within 6 weeks. Supplier Code expired 14 days ago — renewal in progress." />
          <ConfNote text="10 of 10 hotels covered · 3 policies expiring soon" />
        </div>
      </Card>

      {/* Attestation Completion */}
      <Card>
        <CardHeader
          title="Attestation Completion by Hotel"
          hint="% of required attestations submitted"
          right={
            <button onClick={() => onDrilldown("attestations", "Attestation Completion")}
              className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 font-medium">
              Detail <ChevronRight size={10} />
            </button>
          }
        />
        <div className="px-4 pb-4 pt-3 space-y-2">
          {[...PORTFOLIO_GOVERNANCE_BY_HOTEL]
            .sort((a, b) => a.attestationsPct - b.attestationsPct)
            .map((h) => {
              const total = 12;
              const done = Math.round(h.attestationsPct / 100 * total);
              const tone = h.attestationsPct >= 85 ? "good" : h.attestationsPct >= 70 ? "warn" : "bad";
              return (
                <div key={h.hotel}
                  onClick={() => onDrilldown("attestations", "Attestation Completion")}
                  className="flex items-center gap-2.5 cursor-pointer group hover:bg-ink-50 rounded-lg px-2 py-1.5 -mx-2"
                >
                  <div className="w-[130px] shrink-0 text-[11px] text-ink-700 truncate">{h.hotel}</div>
                  <div className="flex-1">
                    <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", `bg-${tone}`)}
                        style={{ width: `${h.attestationsPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("text-[12px] font-bold tabular-nums w-9 text-right", `text-${tone}`)}>
                      {h.attestationsPct}%
                    </span>
                    <span className="text-[9px] text-ink-400 w-12">{done}/{total} done</span>
                  </div>
                </div>
              );
            })}
          <div className="mt-1 pt-2 border-t border-ink-50 flex items-center justify-between text-[10px] text-ink-500">
            <span>Portfolio average: <strong className="text-warn">{avgAttestation}%</strong></span>
            <span>Target: <strong className="text-ink-700">≥90%</strong></span>
          </div>
          <InsightLine text={`${belowAttestation} hotel${belowAttestation !== 1 ? "s" : ""} have attestation completion below 80%.`} />
          <ConfNote text="10 of 10 hotels reported · 81% portfolio average" />
        </div>
      </Card>

      {/* Supplier Governance Funnel */}
      <Card>
        <CardHeader
          title="Supplier Governance Funnel"
          hint="120 suppliers invited → approved status"
          right={
            <button onClick={() => onDrilldown("supplier", "Supplier Code Adoption")}
              className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 font-medium">
              Detail <ChevronRight size={10} />
            </button>
          }
        />
        <div className="px-4 pb-4 pt-3">
          <div className="space-y-2">
            {SG_SUPPLIER_FUNNEL.map((step, i) => {
              const prev = i > 0 ? SG_SUPPLIER_FUNNEL[i - 1].count : step.count;
              const dropPct = i > 0 ? Math.round((1 - step.count / prev) * 100) : null;
              const widthPct = Math.max(step.pct, 20);
              return (
                <div key={step.stage}>
                  {i > 0 && dropPct !== null && (
                    <div className="flex items-center gap-1 pl-2 py-0.5 text-[10px] text-ink-400">
                      <span className="text-bad font-semibold">−{dropPct}%</span>
                      <span>drop-off ({prev - step.count} suppliers)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-[120px] shrink-0 text-[11px] font-medium text-ink-700">{step.stage}</div>
                    <div className="flex-1 relative h-8 bg-ink-50 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center px-3"
                        style={{
                          width: `${widthPct}%`,
                          background: i === 0 ? "#6366F1" : i === 1 ? "#818CF8" : i === 2 ? "#A5B4FC" : "#C7D2FE",
                        }}
                      >
                        <span className="text-[11px] font-bold text-white">{step.count}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] font-semibold text-ink-600 tabular-nums w-10 text-right">
                      {step.pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-ink-50 px-3 py-2">
              <div className="text-[18px] font-bold text-ink-900">74%</div>
              <div className="text-[10px] text-ink-400">Code signed</div>
            </div>
            <div className="rounded-lg bg-ink-50 px-3 py-2">
              <div className="text-[18px] font-bold text-warn">52%</div>
              <div className="text-[10px] text-ink-400">ESG submitted</div>
            </div>
            <div className="rounded-lg bg-ink-50 px-3 py-2">
              <div className="text-[18px] font-bold text-bad">43%</div>
              <div className="text-[10px] text-ink-400">Approved</div>
            </div>
          </div>
          <InsightLine text="Supplier governance gaps represent the largest open issue group. 31 suppliers pending ESG assessment." />
          <ConfNote text="120 suppliers tracked · 74% supplier code adoption · 18 pending" />
        </div>
      </Card>

      {/* Governance Gaps by Type */}
      <Card>
        <CardHeader title="Governance Gaps by Type" hint="open items requiring action" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={SG_GOV_GAPS_BY_TYPE} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" width={0} tick={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v} items`, ""]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {SG_GOV_GAPS_BY_TYPE.map((d) => <Cell key={d.type} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ul className="space-y-1 mt-1">
            {SG_GOV_GAPS_BY_TYPE.map((d) => (
              <li key={d.type} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-ink-700">{d.type}</span>
                </div>
                <span className="font-bold tabular-nums" style={{ color: d.color }}>{d.count}</span>
              </li>
            ))}
          </ul>
          <InsightLine text="Supplier governance gaps represent the largest open issue group — focus on ESG assessment completion." />
          <ConfNote text="94 total open governance items · 35 critical" />
        </div>
      </Card>
    </div>
  );
}

// ── 4. Evidence & Reporting Gaps ──────────────────────────────────────────────

function EvidenceGapsTable() {
  const [filterHotel, setFilterHotel] = useState("All");
  const [filterArea, setFilterArea]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const hotels = ["All", ...Array.from(new Set(SG_EVIDENCE_GAPS.map((g) => g.hotel)))];
  const areas  = ["All", "Social", "Governance"];
  const statuses = ["All", "missing", "overdue", "expiring"];

  const visible = SG_EVIDENCE_GAPS.filter((g) =>
    (filterHotel  === "All" || g.hotel  === filterHotel)  &&
    (filterArea   === "All" || g.area   === filterArea)   &&
    (filterStatus === "All" || g.status === filterStatus)
  );

  function statusBadge(s: string) {
    const tone = s === "overdue" ? "bad" : s === "missing" ? "bad" : "warn";
    const label = s === "overdue" ? "Overdue" : s === "missing" ? "Missing" : "Expiring";
    return <Badge tone={tone}>{label}</Badge>;
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] text-ink-500 font-medium">Filter:</span>
        <select
          value={filterHotel}
          onChange={(e) => setFilterHotel(e.target.value)}
          className="text-[11px] border border-ink-200 rounded-lg px-2 py-1.5 bg-white text-ink-700 focus:outline-none focus:border-brand-400"
        >
          {hotels.map((h) => <option key={h}>{h}</option>)}
        </select>
        <div className="flex gap-0.5">
          {areas.map((a) => (
            <button key={a} onClick={() => setFilterArea(a)}
              className={cn("px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                filterArea === a ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}>
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5">
          {statuses.map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn("px-2.5 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors",
                filterStatus === s ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}>
              {s === "All" ? "All statuses" : s}
            </button>
          ))}
        </div>
        {(filterHotel !== "All" || filterArea !== "All" || filterStatus !== "All") && (
          <button
            onClick={() => { setFilterHotel("All"); setFilterArea("All"); setFilterStatus("All"); }}
            className="text-[11px] text-brand-600 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-xl border border-ink-100 bg-white overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-ink-50 border-b border-ink-100">
              <th className="table-th min-w-[220px]">Gap / Evidence Needed</th>
              <th className="table-th min-w-[160px]">Hotel</th>
              <th className="table-th">Area</th>
              <th className="table-th">Owner</th>
              <th className="table-th">Due Date</th>
              <th className="table-th min-w-[140px]">Impact</th>
              <th className="table-th">Status</th>
              <th className="table-th pr-5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {visible.map((g) => (
              <tr key={g.id} className="hover:bg-ink-50/60 transition-colors">
                <td className="table-td">
                  <div className="text-[12px] font-semibold text-ink-800">{g.gap}</div>
                  <div className="text-[10px] text-ink-400">{g.id}</div>
                </td>
                <td className="table-td text-[11px] text-ink-700 whitespace-nowrap">{g.hotel}</td>
                <td className="table-td">
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    g.area === "Social" ? "bg-pillar-social/10 text-pillar-social" : "bg-pillar-gov/10 text-pillar-gov"
                  )}>
                    {g.area}
                  </span>
                </td>
                <td className="table-td text-[11px] text-ink-600 whitespace-nowrap">{g.owner}</td>
                <td className="table-td text-[11px] tabular-nums text-ink-700 whitespace-nowrap">{g.due}</td>
                <td className="table-td text-[11px] text-ink-600">{g.impact}</td>
                <td className="table-td">{statusBadge(g.status)}</td>
                <td className="table-td pr-5">
                  <Link to="/review-approval"
                    className="btn-secondary h-7 px-2.5 text-[11px] text-brand-700 border-brand-200 hover:bg-brand-50 inline-flex items-center gap-1"
                  >
                    {g.status === "overdue" ? "Follow up" : g.status === "expiring" ? "Renew" : "Upload"}
                    <ExternalLink size={9} />
                  </Link>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="table-td text-center text-ink-400 py-8">
                  No evidence gaps match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfNote text={`Showing ${visible.length} of ${SG_EVIDENCE_GAPS.length} evidence gaps · Last updated: May 2025`} />
    </div>
  );
}

// ── 5. Hotel-Level Gap Table ──────────────────────────────────────────────────

function HotelGapTable() {
  function StatusCell({ s }: { s: string }) {
    const tone = stTone(s as HotelStatus);
    return <Badge tone={tone}>{stLabel(s as HotelStatus)}</Badge>;
  }

  const sortedRows = [...SG_HOTEL_GAP_TABLE].sort((a, b) => {
    const order = { "needs-review": 0, missing: 1, partial: 2, complete: 3, na: 4 };
    return (order[a.overall as HotelStatus] ?? 3) - (order[b.overall as HotelStatus] ?? 3);
  });

  return (
    <div className="rounded-xl border border-ink-100 bg-white overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="bg-ink-50 border-b border-ink-100">
            <th className="table-th min-w-[150px]">Hotel</th>
            <th className="table-th text-center">Workforce</th>
            <th className="table-th text-center">Training</th>
            <th className="table-th text-center">H&S</th>
            <th className="table-th text-center">Local Sourcing</th>
            <th className="table-th text-center">Policies</th>
            <th className="table-th text-right">Attestations</th>
            <th className="table-th text-center">Supplier Gov.</th>
            <th className="table-th text-right">Evidence Gaps</th>
            <th className="table-th text-center">Overall</th>
            <th className="table-th pr-5">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-50">
          {sortedRows.map((h) => (
            <tr key={h.hotel} className="hover:bg-ink-50/60 transition-colors">
              <td className="table-td">
                <div className="text-[12px] font-semibold text-ink-900 whitespace-nowrap">{h.shortName}</div>
              </td>
              <td className="table-td text-center"><StatusCell s={h.workforce} /></td>
              <td className="table-td text-center"><StatusCell s={h.training} /></td>
              <td className="table-td text-center"><StatusCell s={h.hs} /></td>
              <td className="table-td text-center"><StatusCell s={h.localSourcing} /></td>
              <td className="table-td text-center"><StatusCell s={h.policies} /></td>
              <td className="table-td text-right">
                <span className={cn("text-[12px] font-bold tabular-nums",
                  h.attestations >= 85 ? "text-good" : h.attestations >= 70 ? "text-warn" : "text-bad"
                )}>{h.attestations}%</span>
              </td>
              <td className="table-td text-center"><StatusCell s={h.supplierGov} /></td>
              <td className="table-td text-right">
                {h.gaps > 0
                  ? <Badge tone={h.gaps <= 2 ? "warn" : "bad"}>{h.gaps}</Badge>
                  : <CheckCircle2 size={14} className="text-good mx-auto" />
                }
              </td>
              <td className="table-td text-center">
                <StatusCell s={h.overall} />
              </td>
              <td className="table-td pr-5">
                <Link to="/properties"
                  className="btn-secondary h-7 px-2.5 text-[11px] text-brand-700 border-brand-200 hover:bg-brand-50 inline-flex items-center gap-1"
                >
                  Review <ExternalLink size={9} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-3 border-t border-ink-50 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-ink-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-good inline-block" />Complete</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn inline-block" />Partial</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bad inline-block" />Missing</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn inline-block" />Review needed</span>
        <span className="ml-auto">Sorted by overall status — attention cases first</span>
      </div>
    </div>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────

export default function SocialGovernanceTab() {
  const [drilldown, setDrilldown] = useState<Drilldown>(null);
  const drilldownRef = useRef<HTMLDivElement>(null);

  function openDrilldown(key: string, label: string) {
    const isClosing = drilldown?.key === key;
    setDrilldown(isClosing ? null : { key, label });
    if (!isClosing) {
      setTimeout(() => {
        drilldownRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    }
  }

  return (
    <div className="space-y-6">

      {/* Hub links */}
      <div className="flex items-center justify-end gap-5 text-[12px]">
        <Link to="/performance/social/overview"
          className="font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Open Social Hub <ArrowRight size={12} />
        </Link>
        <Link to="/performance/governance/overview"
          className="font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Open Governance Hub <ArrowRight size={12} />
        </Link>
      </div>

      {/* 1 — Summary Cards */}
      <SectionDivider title="Social & Governance Summary" sub="8 portfolio indicators · click cards to drill down" />
      <SummaryCards onDrilldown={openDrilldown} />

      {/* Single drilldown panel — scrolled into view on open */}
      <div ref={drilldownRef}>
        {drilldown && (
          <DrilldownPanel drilldown={drilldown} onClose={() => setDrilldown(null)} />
        )}
      </div>

      {/* 2 — Social Performance */}
      <SectionDivider
        title="Social Performance"
        sub="Turnover · Training · Safety · Local Sourcing"
      />
      <SocialPerformance onDrilldown={openDrilldown} />

      {/* 3 — Governance & Supplier Controls */}
      <SectionDivider
        title="Governance & Supplier Controls"
        sub="Policy status · Attestations · Supplier funnel · Gap types"
      />
      <GovernanceControls onDrilldown={openDrilldown} />

      {/* 4 — Evidence & Reporting Gaps */}
      <SectionDivider
        title="Evidence & Reporting Gaps"
        sub="Filterable · sorted by due date · all areas"
      />
      <EvidenceGapsTable />

      {/* 5 — Hotel-Level Overview */}
      <SectionDivider
        title="Hotel-Level Overview"
        sub="Cross-pillar status per hotel · attention cases first"
      />
      <HotelGapTable />

    </div>
  );
}
