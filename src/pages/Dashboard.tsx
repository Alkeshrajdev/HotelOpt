// PORTFOLIO DASHBOARD
// All figures use approved, audit-tracked records only.

import { useState } from "react";
import { useTopbar } from "@/lib/topbarContext";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Download,
  Droplet,
  FileCheck2,
  FileText,
  Info,
  Recycle,
  ShieldCheck,
  ShieldCheck as TrustIcon,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import WorkflowStrip from "@/components/ui/WorkflowStrip";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import InsufficientData from "@/components/ui/InsufficientData";
import {
  ACTION_CENTRE,
  NEEDS_ATTENTION,
  OPERATING_METRICS,
  PORTFOLIO_TRENDS,
  CERTIFICATIONS_OVERVIEW,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

// Performance areas — show operational intensity KPIs, not index scores.
// `score` is used internally for bar width / threshold logic only — never displayed as a badge.
const PILLARS = [
  {
    key: "energy",
    label: "Energy",
    score: 82,
    kpi: "18.4 kWh",
    kpiUnit: "/ room night",
    delta: 4.2,
    icon: Zap,
    iconBg: "bg-pillar-energy/10 text-pillar-energy",
  },
  {
    key: "water",
    label: "Water",
    score: 69,
    kpi: "342 L",
    kpiUnit: "/ guest night",
    delta: 2.7,
    icon: Droplet,
    iconBg: "bg-pillar-water/10 text-pillar-water",
  },
  {
    key: "waste",
    label: "Waste",
    score: 78,
    kpi: "0.41 kg",
    kpiUnit: "/ guest night",
    delta: 3.8,
    icon: Recycle,
    iconBg: "bg-pillar-waste/10 text-pillar-waste",
  },
  {
    key: "carbon",
    label: "Carbon",
    score: 76,
    kpi: "2.9 kg",
    kpiUnit: "CO₂e / room night",
    delta: 5.4,
    icon: Cloud,
    iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
  },
  {
    key: "social",
    label: "Social",
    score: 74,
    kpi: "3 KPIs",
    kpiUnit: "above target",
    delta: null,
    icon: Users,
    iconBg: "bg-pillar-social/10 text-pillar-social",
  },
  {
    key: "governance",
    label: "Governance",
    score: 81,
    kpi: "85%",
    kpiUnit: "attestations complete",
    delta: null,
    icon: ShieldCheck,
    iconBg: "bg-pillar-gov/10 text-pillar-gov",
  },
] as const;

const REPORT_READINESS = [
  { name: "GHG Inventory",           status: "Ready"  as const, coverage: 92, blockingIssue: null },
  { name: "GRI Standards",           status: "Mapped" as const, coverage: 86, blockingIssue: null },
  { name: "SBTi corporate net-zero", status: "Draft"  as const, coverage: 71, blockingIssue: "Scope 3 travel & logistics data incomplete" },
  { name: "HCMI per-stay footprint", status: "Ready"  as const, coverage: 88, blockingIssue: null },
  { name: "CSRD / ESRS draft",       status: "Draft"  as const, coverage: 61, blockingIssue: "Social indicators gap — 3 KPIs missing" },
  { name: "GRESB submission",        status: "Mapped" as const, coverage: 81, blockingIssue: null },
  { name: "Certification dossier",   status: "Draft"  as const, coverage: 74, blockingIssue: "Green Globe evidence pack 12% short" },
];

const DATA_QUALITY = {
  score:     86,
  approved:  182,
  pending:   24,
  estimated: 9,
  breakdown: [
    { name: "Completeness",      value: 91 },
    { name: "Timeliness",        value: 84 },
    { name: "Evidence match",    value: 74 },
    { name: "AI/OCR confidence", value: 88 },
    { name: "Checker approval",  value: 82 },
  ],
};

// Chart toggle options — real operational metrics only; no composite scores.
const TREND_METRICS = [
  { key: "energyIntensity",  label: "Energy / Room Night",  unit: " kWh / room night",   color: "#16A34A", domain: [18, 28]   as [number, number] },
  { key: "carbonIntensity",  label: "Carbon / Room Night",  unit: " kgCO₂ / room night", color: "#0F766E", domain: [10, 16]   as [number, number] },
  { key: "waterIntensity",   label: "Water / Guest Night",  unit: " L / guest night",    color: "#0EA5E9", domain: [360, 440] as [number, number] },
] as const;

const PILLAR_HEX: Record<string, string> = {
  energy:     "#16A34A",
  water:      "#0EA5E9",
  waste:      "#14B8A6",
  carbon:     "#0F766E",
  social:     "#7C3AED",
  governance: "#EA580C",
};

const SEVERITY_COLOR: Record<string, string> = { bad: "#DC2626", warn: "#F59E0B", info: "#0EA5E9" };
const SEVERITY_ORDER: Record<string, number>  = { bad: 0, warn: 1, info: 2 };

// Derive portfolio status from area scores — plain business language.
const areasAboveTarget = PILLARS.filter((p) => p.score >= 75).length;
const anyAreaCritical  = PILLARS.some((p) => p.score < 60);
const portfolioStatus  = anyAreaCritical ? "Off Track" : areasAboveTarget >= 4 ? "On Track" : "At Risk";

export default function Dashboard() {
  const { property, period, dataBasis } = useTopbar();
  const isPortfolioView = property === "All Properties (72)";

  const [trendMetric, setTrendMetric] = useState<(typeof TREND_METRICS)[number]["key"]>("energyIntensity");
  const activeTrend = TREND_METRICS.find((m) => m.key === trendMetric)!;

  const topActions = [...ACTION_CENTRE]
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    .slice(0, 3);

  const reportingBlockers = REPORT_READINESS.filter((r) => r.blockingIssue);

  return (
    <div>

      {/* ── Demo notice ── */}
      <div className="mb-3 px-4 py-2 rounded-lg bg-ink-100 border border-ink-200 text-[11px] text-ink-500 text-center">
        Demo environment — sample data only. Not connected to live client records.
      </div>

      {/* ── Approved-data trust banner ── */}
      <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-[12px] text-brand-700">
        <TrustIcon size={13} className="shrink-0" />
        <span>
          All figures are based on <strong>approved records</strong>. Draft and unapproved submissions are excluded from KPIs and reports.
        </span>
        <Link
          to="/review-approval"
          className="ml-auto shrink-0 font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
        >
          Review queue <ChevronRight size={11} />
        </Link>
      </div>

      {/* ── Page Header ── */}
      <PageHeader
        eyebrow={isPortfolioView ? "Portfolio overview" : "Property overview"}
        title="Portfolio Dashboard"
        subtitle={
          isPortfolioView
            ? `Cross-property performance, data approval, reporting blockers, and actions across selected hotels · ${period} · ${dataBasis === "approved" ? "Approved data" : dataBasis === "approved+provisional" ? "Approved + provisional" : dataBasis}`
            : `Performance, data approval, and actions for ${property} · ${period}`
        }
        actions={
          <button className="btn-primary">
            <Download size={14} /> Export
          </button>
        }
      />

      {/* ── Data & Reporting Workflow ── */}
      <div className="mt-5">
        <WorkflowStrip
          stations={[
            { key: "capture",  label: "Data Capture",     value: "82% complete",                    tone: "ok",       href: "/data-capture" },
            { key: "review",   label: "Waiting for Review", value: "24 records",                    tone: "warn",     href: "/review-approval?status=submitted" },
            { key: "quality",  label: "Approved Data",    value: `${DATA_QUALITY.score}% approved`, tone: "ok" },
            { key: "gp",       label: "Performance",      value: "Baseline 2022",                   tone: "complete" },
            { key: "reports",  label: "Reports Ready",    value: "5 of 7 frameworks",               tone: "info",     href: "/reports" },
          ]}
        />
      </div>

      {/* ══════════════════════════════════════════
          FOLD 1 — answers the 5 executive questions
          1. Are we on track?            → Portfolio Status
          2. Which hotels need attention? → Hotels Needing Attention + Needs Attention section
          3. What is blocking reports?   → Reports Ready / Reports Blocked
          4. What records need review?   → Waiting for Review
          5. What action next?           → Urgent items in Needs Attention
      ══════════════════════════════════════════ */}

      {/* ── Zone 1: 6 executive status tiles ── */}
      <div className="mt-8">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

          {/* 1 · Portfolio Status */}
          <KpiTile
            prominent
            icon={
              portfolioStatus === "On Track"
                ? <TrendingUp size={18} />
                : <AlertTriangle size={18} />
            }
            iconBg={
              portfolioStatus === "On Track"
                ? "bg-good/10 text-good"
                : portfolioStatus === "At Risk"
                  ? "bg-warn/10 text-warn"
                  : "bg-bad/10 text-bad"
            }
            label="Portfolio Status"
            value={portfolioStatus}
            caption={`${areasAboveTarget} of ${PILLARS.length} areas above target`}
          />

          {/* 2 · Approved Data */}
          <Link to="/review-approval" className="block">
            <KpiTile
              prominent
              icon={<ShieldCheck size={18} />}
              iconBg="bg-info/10 text-info"
              label="Approved Data"
              value={`${DATA_QUALITY.score}%`}
              caption={`${DATA_QUALITY.approved} records approved · ${DATA_QUALITY.pending} waiting review`}
            />
          </Link>

          {/* 3 · Waiting for Review */}
          <Link to="/review-approval?status=submitted" className="block">
            <KpiTile
              prominent
              icon={<AlertTriangle size={18} />}
              iconBg="bg-warn/10 text-warn"
              label="Waiting for Review"
              value={`${DATA_QUALITY.pending} records`}
              caption="6 overdue · 9 low-confidence"
            />
          </Link>

          {/* 4 · Hotels Needing Attention */}
          <Link to="/properties" className="block">
            <KpiTile
              prominent
              icon={<AlertTriangle size={18} />}
              iconBg="bg-bad/10 text-bad"
              label="Hotels Needing Attention"
              value={`${NEEDS_ATTENTION.length} hotels`}
              caption="3 critical · 5 moderate"
            />
          </Link>

          {/* 5 · Reports Ready */}
          <Link to="/reports" className="block">
            <KpiTile
              prominent
              icon={<FileText size={18} />}
              iconBg="bg-warn/10 text-warn"
              label="Reports Ready"
              value="5 of 7"
              caption={`${reportingBlockers.length} reports have blockers`}
            />
          </Link>

          {/* 6 · Next Audit */}
          <Link to="/certifications" className="block">
            <KpiTile
              prominent
              icon={<Award size={18} />}
              iconBg={CERTIFICATIONS_OVERVIEW.nextAuditDays <= 60 ? "bg-warn/10 text-warn" : "bg-good/10 text-good"}
              label="Next Audit"
              value={`${CERTIFICATIONS_OVERVIEW.nextAuditDays} days`}
              caption="Green Globe evidence pack short"
            />
          </Link>
        </div>
      </div>

      {/* ── Zone 2: Needs Attention (most important section) ── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">Needs Attention</span>
          <div className="h-px flex-1 bg-ink-100" />
        </div>
        <div className="grid grid-cols-12 gap-5">

          {/* Urgent items — sorted by severity */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader
              title="Urgent items"
              hint="sorted by severity — click to resolve"
              right={<Badge tone="warn">{ACTION_CENTRE.filter(a => a.severity === "bad").length} critical</Badge>}
            />
            <ul className="px-3 pb-4 mt-3 space-y-0.5">
              {topActions.map((a) => (
                <li key={a.label}>
                  <Link
                    to={a.href}
                    className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-ink-50 group border-l-2 transition-all"
                    style={{ borderLeftColor: SEVERITY_COLOR[a.severity] ?? "#0EA5E9" }}
                  >
                    <div className="flex items-center gap-2.5 text-[13px] font-medium text-ink-700 group-hover:text-ink-900 transition-colors">
                      <AlertTriangle
                        size={14}
                        className="shrink-0"
                        style={{ color: SEVERITY_COLOR[a.severity] ?? "#0EA5E9" }}
                      />
                      {a.label}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-bold text-[15px] text-ink-900 tabular-nums">{a.count}</span>
                      <ChevronRight size={14} className="text-ink-400 group-hover:text-brand-700 transition-colors" />
                    </div>
                  </Link>
                </li>
              ))}
              {ACTION_CENTRE.length > 3 && (
                <li>
                  <Link
                    to="/actions"
                    className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    View all {ACTION_CENTRE.length} items <ArrowRight size={12} />
                  </Link>
                </li>
              )}
            </ul>
          </Card>

          {/* Hotels Needing Attention */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader
              title="Hotels Needing Attention"
              hint="performance below threshold — click to open hotel"
              right={
                <Link to="/properties" className="text-[12px] font-semibold text-brand-700 hover:text-brand-800">
                  View all
                </Link>
              }
            />
            {NEEDS_ATTENTION.length === 0 ? (
              <div className="p-4">
                <InsufficientData title="No alerts" body="All hotels are performing above threshold." tone="info" />
              </div>
            ) : (
              <ul className="px-2 pb-4 mt-2">
                {NEEDS_ATTENTION.slice(0, 3).map((p) => (
                  <li
                    key={p.property}
                    className="flex items-start gap-3 px-3 py-3.5 hover:bg-ink-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="w-8 h-8 rounded-full bg-warn grid place-items-center text-white shrink-0 text-sm font-semibold mt-0.5">
                      <AlertTriangle size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink-900 truncate">{p.property}</div>
                      <div className="text-[11px] text-ink-500 truncate">{p.location}</div>
                      <div className="text-[11px] text-ink-500 mt-0.5 leading-relaxed line-clamp-1">{p.reason}</div>
                    </div>
                    <div className="shrink-0 mt-0.5 text-right">
                      <div className="w-12 h-1.5 bg-ink-100 rounded-full overflow-hidden mt-2">
                        <div className="h-full rounded-full bg-warn" style={{ width: `${p.score}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Reports Blocked */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader
              title="Reports Blocked"
              hint="issues that will delay framework submissions"
              right={
                <Link to="/reports" className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
                  Open Reports <ArrowRight size={12} />
                </Link>
              }
            />
            {reportingBlockers.length === 0 ? (
              <div className="p-4">
                <InsufficientData title="No blockers" body="All frameworks are on track for submission." tone="info" />
              </div>
            ) : (
              <ul className="px-3 pb-4 mt-3 space-y-2">
                {reportingBlockers.map((r) => (
                  <li key={r.name} className="rounded-lg border border-warn/25 bg-warn/10 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[12px] font-bold text-ink-900">{r.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-14 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-warn" style={{ width: `${r.coverage}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-warn tabular-nums">{r.coverage}%</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-warn">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{r.blockingIssue}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FOLD 2 — Supporting detail
      ══════════════════════════════════════════ */}

      <div className="mt-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-ink-200" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400 whitespace-nowrap px-1">
          Supporting detail
        </span>
        <div className="h-px flex-1 bg-ink-200" />
      </div>

      {/* ── Zone 3: Portfolio Operating Context ── */}
      <div className="mt-6">
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-ink-100">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-500">
              Portfolio Operating Context
            </span>
            <Badge tone="neutral">Aggregated across selected hotels · Approved data only</Badge>
            <div className="group relative ml-1">
              <Info size={12} className="text-ink-300 cursor-help" />
              <div className="absolute left-0 top-5 z-10 hidden group-hover:block w-72 rounded-lg bg-ink-900 text-white text-[11px] leading-relaxed p-2.5 shadow-xl">
                Intensity metrics (e.g. Energy / Room Night) are calculated as total ÷ occupied room nights, not averaged across properties. This gives an accurate portfolio-wide rate rather than an average of averages.
              </div>
            </div>
          </div>
          <div className="flex divide-x divide-ink-100 min-w-max">
            {OPERATING_METRICS.map((m) => {
              const delta = m.delta as number | null;
              const dir   = m.goodDirection as string | null;
              const isGood = delta !== null && dir !== null
                ? (dir === "down" ? delta < 0 : delta > 0)
                : null;
              return (
                <div key={m.key} className="px-5 py-3 flex flex-col gap-0 min-w-[130px]">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400 truncate">
                    {m.label}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-ink-900 tabular-nums">
                      {typeof m.value === "number" && m.value > 10000
                        ? m.value.toLocaleString()
                        : m.value}
                    </span>
                    {m.unit && <span className="text-[10px] text-ink-400">{m.unit}</span>}
                  </div>
                  {m.delta !== null && isGood !== null && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-semibold", isGood ? "text-good" : "text-bad")}>
                      {isGood ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                      {Math.abs(m.delta)}% YoY
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Zone 4: Performance by Area ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">Performance by Area</span>
          <div className="h-px flex-1 bg-ink-100" />
          <Link
            to="/performance/energy/overview"
            className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 shrink-0"
          >
            Open Performance hub <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            const barColor = p.score >= 75 ? "bg-good" : p.score >= 60 ? "bg-warn" : "bg-bad";
            return (
              <Link
                key={p.key}
                to={`/performance/${p.key}/overview`}
                className="group card rounded-xl p-4 hover:shadow-pop hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className={cn("w-9 h-9 rounded-lg grid place-items-center", p.iconBg)}>
                    <Icon size={16} />
                  </div>
                  {/* Show improvement delta instead of opaque score */}
                  {p.delta != null ? (
                    <Badge tone="good">+{p.delta}% ↑</Badge>
                  ) : (
                    <Badge tone="good">On track</Badge>
                  )}
                </div>
                <div className="mt-3 text-[12px] font-bold uppercase tracking-wide text-ink-700">
                  {p.label}
                </div>
                <div className="mt-0.5 text-[13px] font-semibold text-ink-900 tabular-nums leading-tight">
                  {p.kpi}
                  <span className="text-[10px] font-normal text-ink-400 ml-1">{p.kpiUnit}</span>
                </div>
                <div className="mt-1.5 text-[11px] text-ink-500">
                  {p.delta != null ? "vs. prior year" : "GRI-aligned"}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", barColor)}
                    style={{ width: `${p.score}%`, backgroundColor: PILLAR_HEX[p.key] }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Zone 5: Portfolio Trend ── */}
      <div className="mt-5">
        <Card>
          <CardHeader
            title="Portfolio trend"
            hint="12-month rolling · approved data only · operational intensity metrics"
            right={
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {TREND_METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setTrendMetric(m.key)}
                    className={cn(
                      "px-3 py-1 rounded-md text-[11px] font-semibold transition-colors",
                      trendMetric === m.key
                        ? "bg-brand-700 text-white"
                        : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            }
          />
          {PORTFOLIO_TRENDS.length === 0 ? (
            <div className="p-6">
              <InsufficientData
                title="Not enough data to show a trend"
                body="At least 3 months of approved records are needed. Go to Review & Approval to approve pending submissions."
                hint="0 / 3 months approved"
                tone="info"
              />
            </div>
          ) : (
            <div className="px-6 pb-6 pt-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={PORTFOLIO_TRENDS} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={activeTrend.domain}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(15,23,42,0.08)" }}
                    formatter={(val: number) => [`${val}${activeTrend.unit}`, activeTrend.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey={activeTrend.key}
                    stroke={activeTrend.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ── Zone 6: Data Completeness & Approval + Certifications ── */}
      <div className="mt-5 grid grid-cols-12 gap-5">

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader
            title="Data Completeness & Approval"
            hint="GHG · GRI · certification expectations"
            right={<Badge tone="good">{DATA_QUALITY.score}% approved</Badge>}
          />
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="card-level-3 text-center">
                <div className="text-xl font-bold text-good">{DATA_QUALITY.approved}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Approved records</div>
              </div>
              <div className="card-level-3 text-center">
                <div className="text-xl font-bold text-warn">{DATA_QUALITY.pending}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Waiting review</div>
              </div>
              <div className="card-level-3 text-center">
                <div className="text-xl font-bold text-info">{DATA_QUALITY.estimated}%</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Estimated data</div>
              </div>
            </div>
            <ul className="space-y-2.5">
              {DATA_QUALITY.breakdown.map((b) => (
                <li key={b.name} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 text-ink-700 text-[12px]">{b.name}</span>
                  <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", b.value >= 80 ? "bg-good" : b.value >= 60 ? "bg-warn" : "bg-bad")}
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-semibold text-ink-700 text-[12px] tabular-nums">{b.value}%</span>
                </li>
              ))}
            </ul>
            <Link to="/review-approval" className="btn-secondary w-full mt-5 justify-center">
              <FileCheck2 size={14} /> Open Review & Approval queue
            </Link>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader
            title="Certifications"
            hint="portfolio readiness across active programmes"
            right={<Badge tone={CERTIFICATIONS_OVERVIEW.nextAuditDays <= 60 ? "warn" : "good"}>{CERTIFICATIONS_OVERVIEW.nextAuditDays} days to audit</Badge>}
          />
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="card-level-3 text-center">
                <div className="text-xl font-bold text-ink-900">{CERTIFICATIONS_OVERVIEW.activeProgrammes}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Active</div>
              </div>
              <div className="card-level-3 text-center">
                <div className="text-xl font-bold text-warn">{CERTIFICATIONS_OVERVIEW.evidenceGaps}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">Evidence gaps</div>
              </div>
              <div className="card-level-3 text-center">
                <div className="text-xl font-bold text-info">{CERTIFICATIONS_OVERVIEW.inProgress}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">In progress</div>
              </div>
            </div>
            <div className="rounded-lg bg-warn/10 border border-warn/25 px-3 py-2.5 flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-warn shrink-0" />
              <span className="text-ink-700">
                Next: <strong>{CERTIFICATIONS_OVERVIEW.nextAuditName}</strong> audit in{" "}
                {CERTIFICATIONS_OVERVIEW.nextAuditDays} days — evidence pack 12% short
              </span>
              <Link to="/certifications" className="ml-auto text-brand-700 text-[12px] font-semibold hover:text-brand-800 shrink-0">
                View →
              </Link>
            </div>
            <Link to="/certifications" className="btn-secondary w-full justify-center">
              <Award size={14} /> Open Certifications
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Zone 7: Reporting Status ── */}
      <div className="mt-5">
        <Card>
          <CardHeader
            title="Reporting Status"
            hint="GRI · GHG · SBTi · HCMI · Green Globe · CSRD · GRESB"
            right={
              <Link
                to="/reports"
                className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
              >
                Open Reports <ArrowRight size={12} />
              </Link>
            }
          />
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Framework</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Data coverage</th>
                  <th className="table-th">Blocking issue</th>
                  <th className="table-th text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {REPORT_READINESS.map((r) => (
                  <tr key={r.name} className="hover:bg-ink-50/60">
                    <td className="table-td font-semibold text-ink-900">{r.name}</td>
                    <td className="table-td">
                      <Badge tone={r.status === "Ready" ? "good" : r.status === "Mapped" ? "info" : "warn"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", r.coverage >= 80 ? "bg-good" : r.coverage >= 60 ? "bg-warn" : "bg-bad")}
                            style={{ width: `${r.coverage}%` }}
                          />
                        </div>
                        <span className="font-semibold w-10 text-right tabular-nums text-[12px]">{r.coverage}%</span>
                      </div>
                    </td>
                    <td className="table-td max-w-[220px]">
                      {r.blockingIssue ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-bad">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span className="truncate">{r.blockingIssue}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[12px] text-good">
                          <CheckCircle2 size={12} /> No blockers
                        </span>
                      )}
                    </td>
                    <td className="table-td text-right pr-6">
                      <Link
                        to="/reports"
                        className="btn-secondary h-7 px-3 text-[12px] text-brand-700 border-brand-200 hover:bg-brand-50"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-8 text-[11px] text-ink-400 text-center pb-2">
        Portfolio-wide overview · All figures use approved, audit-tracked records only
      </div>
    </div>
  );
}
