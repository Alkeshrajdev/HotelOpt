// EXECUTIVE DASHBOARD — portfolio-wide, all 6 pillars at once.
// For pillar-specific views navigate to /performance/:pillar/:view.

import { useState } from "react";
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
  BadgeCheck,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Download,
  Droplet,
  FileCheck2,
  FileText,
  Lightbulb,
  Recycle,
  ShieldCheck,
  Sliders,
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
  AI_INSIGHTS,
  CERTIFICATIONS_OVERVIEW,
  GP_COMPOSITE,
  NEEDS_ATTENTION,
  OPERATING_METRICS,
  PORTFOLIO_TRENDS,
  RECOMMENDED_MEASURES,
  TOP_PROPERTIES,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

const PILLARS = [
  { key: "energy",     label: "Energy",     score: 82, gp: 4.2,  icon: Zap,         iconBg: "bg-pillar-energy/10 text-pillar-energy" },
  { key: "water",      label: "Water",      score: 69, gp: 2.7,  icon: Droplet,     iconBg: "bg-pillar-water/10  text-pillar-water"  },
  { key: "waste",      label: "Waste",      score: 78, gp: 3.8,  icon: Recycle,     iconBg: "bg-pillar-waste/10  text-pillar-waste"  },
  { key: "carbon",     label: "Carbon",     score: 76, gp: 5.4,  icon: Cloud,       iconBg: "bg-pillar-carbon/10 text-pillar-carbon" },
  { key: "social",     label: "Social",     score: 74, gp: null, icon: Users,       iconBg: "bg-pillar-social/10 text-pillar-social" },
  { key: "governance", label: "Governance", score: 81, gp: null, icon: ShieldCheck, iconBg: "bg-pillar-gov/10    text-pillar-gov"    },
] as const;

const REPORT_READINESS = [
  { name: "GHG Inventory",           status: "Ready"  as const, coverage: 92, blockingIssue: null },
  { name: "GRI Standards",           status: "Mapped" as const, coverage: 86, blockingIssue: null },
  { name: "SBTi corporate net-zero", status: "Draft"  as const, coverage: 71, blockingIssue: "Scope 3 Cat 15 incomplete" },
  { name: "HCMI per-stay footprint", status: "Ready"  as const, coverage: 88, blockingIssue: null },
  { name: "CSRD / ESRS draft",       status: "Draft"  as const, coverage: 61, blockingIssue: "ESRS S1–S4 gap: 3 KPIs missing" },
  { name: "GRESB submission",        status: "Mapped" as const, coverage: 81, blockingIssue: null },
  { name: "Certification dossier",   status: "Draft"  as const, coverage: 74, blockingIssue: "Green Globe evidence pack 12% short" },
];

const DATA_QUALITY = {
  score: 86,
  breakdown: [
    { name: "Completeness",      value: 91 },
    { name: "Timeliness",        value: 84 },
    { name: "Evidence match",    value: 74 },
    { name: "AI/OCR confidence", value: 88 },
    { name: "Checker approval",  value: 82 },
  ],
};

const TREND_METRICS = [
  { key: "sustainabilityScore", label: "Sustainability Score", unit: "/100",       color: "#16A34A", domain: [65, 85]   as [number, number] },
  { key: "carbonIntensity",     label: "Carbon Intensity",    unit: " kgCO₂/ORN", color: "#0F766E", domain: [10, 16]   as [number, number] },
  { key: "energyIntensity",     label: "Energy Intensity",    unit: " kWh/ORN",   color: "#16A34A", domain: [18, 28]   as [number, number] },
  { key: "waterIntensity",      label: "Water Intensity",     unit: " L/ORN",     color: "#0EA5E9", domain: [360, 440] as [number, number] },
] as const;

// Hex values used directly to avoid PostCSS resolving CSS vars at compile time.
const PILLAR_HEX: Record<string, string> = {
  energy:     "#16A34A",
  water:      "#0EA5E9",
  waste:      "#14B8A6",
  carbon:     "#0F766E",
  social:     "#7C3AED",
  governance: "#EA580C",
};

const SEVERITY_COLOR: Record<string, string> = {
  bad:  "#DC2626",
  warn: "#F59E0B",
  info: "#0EA5E9",
};

export default function Dashboard() {
  const [trendMetric, setTrendMetric] = useState<typeof TREND_METRICS[number]["key"]>("sustainabilityScore");
  const activeTrend = TREND_METRICS.find((m) => m.key === trendMetric)!;

  return (
    <div>

      {/* ══ Zone 1 — Header + operational workflow ══ */}
      <PageHeader
        eyebrow="Portfolio overview"
        title="Executive Dashboard"
        subtitle="Cross-pillar performance, data quality, and actions across the entire portfolio. Click a pillar card to open its dedicated dashboard."
        actions={
          <>
            <button className="btn-secondary">
              <Sliders size={14} /> Customize
            </button>
            <button className="btn-primary">
              <Download size={14} /> Export
            </button>
          </>
        }
      />

      <div className="mt-5">
        <WorkflowStrip
          stations={[
            { key: "capture", label: "Data Capture",   value: "82% complete",                     tone: "ok",       href: "/data-capture" },
            { key: "review",  label: "Pending Review", value: "24 records",                       tone: "warn",     href: "/review-approval?status=submitted" },
            { key: "quality", label: "Data Quality",   value: `${DATA_QUALITY.score}/100 · High`, tone: "ok" },
            { key: "gp",      label: "GP Ready",       value: "Yes · base 2022",                  tone: "complete" },
            { key: "reports", label: "Reports Ready",  value: "5 of 7 frameworks",                tone: "info",     href: "/reports" },
          ]}
        />
      </div>

      {/* ══ Zone 2 — Executive KPI row (highest hierarchy) ══ */}
      <div className="mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          <KpiTile
            prominent
            icon={<Award size={18} />}
            iconBg="bg-brand-50 text-brand-700"
            label="Sustainability Score"
            value="78"
            unit="/ 100"
            delta={3.2}
            goodDirection="up"
          />

          {/* GP Composite — custom layout to show idx unit clearly */}
          <div className="card-level-1 flex flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-pillar-energy/10 text-pillar-energy grid place-items-center shrink-0">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-500">
              GP Composite
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-kpi text-ink-900 tabular-nums">{GP_COMPOSITE.score}</span>
              <span className="text-[12px] font-medium text-ink-500">GP Index</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 min-h-[18px]">
              <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold rounded-md px-1.5 py-0.5 text-good bg-good/10">
                <TrendingUp size={12} />+{GP_COMPOSITE.yoyAdjPct}%
              </span>
              <span className="text-[11px] text-ink-500">
                {GP_COMPOSITE.pillarsImproving}/{GP_COMPOSITE.totalPillars} pillars improving
              </span>
            </div>
          </div>

          <KpiTile
            prominent
            icon={<ShieldCheck size={18} />}
            iconBg="bg-info/10 text-info"
            label="Data Quality"
            value={String(DATA_QUALITY.score)}
            unit="/100"
            delta={2.1}
            goodDirection="up"
          />
          <KpiTile
            prominent
            icon={<AlertTriangle size={18} />}
            iconBg="bg-warn/10 text-warn"
            label="Pending Approvals"
            value="24"
            caption="6 overdue · 9 low-confidence"
          />
          <KpiTile
            prominent
            icon={<FileText size={18} />}
            iconBg="bg-pillar-social/10 text-pillar-social"
            label="Reports Ready"
            value="5"
            unit="/ 7 frameworks"
            caption="CSRD draft 61% complete"
          />
          <KpiTile
            prominent
            icon={<BadgeCheck size={18} />}
            iconBg="bg-pillar-gov/10 text-pillar-gov"
            label="Certifications"
            value="4"
            unit="active"
            caption="next audit in 45 days"
          />
        </div>
      </div>

      {/* ══ Zone 2b — Hotel operating context strip ══ */}
      <div className="mt-5">
        <Card>
          <div className="px-5 py-3 border-b border-ink-100 flex items-center gap-2">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-ink-500">
              Hotel Operating Metrics
            </span>
            <Badge tone="neutral">period normalised</Badge>
          </div>
          <div className="overflow-x-auto">
            <div className="flex divide-x divide-ink-100 min-w-max">
              {OPERATING_METRICS.map((m) => {
                const isGood = (() => {
                  if (m.delta === null) return null;
                  const d = m.delta as number;
                  return m.goodDirection === "down" ? d < 0 : d > 0;
                })();
                return (
                  <div key={m.key} className="px-6 py-4 flex flex-col gap-0.5 min-w-[140px]">
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400 truncate">
                      {m.label}
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold text-ink-900 tabular-nums">
                        {typeof m.value === "number" && m.value > 10000
                          ? m.value.toLocaleString()
                          : m.value}
                      </span>
                      {m.unit && (
                        <span className="text-[11px] text-ink-400">{m.unit}</span>
                      )}
                    </div>
                    {m.delta !== null && (
                      <div
                        className={cn(
                          "flex items-center gap-0.5 text-[11px] font-semibold",
                          isGood ? "text-good" : "text-bad"
                        )}
                      >
                        {isGood ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                        {Math.abs(m.delta)}% YoY
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ══ Zone 3 — Performance across six pillars ══ */}
      <div className="mt-8">
        <Card>
          <CardHeader
            title="Performance across pillars"
            hint="Click a pillar to open its dedicated dashboard"
            right={
              <Link
                to="/performance/energy/overview"
                className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
              >
                Open Performance hub <ArrowRight size={12} />
              </Link>
            }
          />
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              const tone = p.score >= 75 ? "good" : p.score >= 60 ? "warn" : "bad";
              return (
                <Link
                  key={p.key}
                  to={`/performance/${p.key}/overview`}
                  className="group rounded-xl border border-ink-200 bg-white p-4 hover:shadow-pop hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("w-9 h-9 rounded-lg grid place-items-center", p.iconBg)}>
                      <Icon size={16} />
                    </div>
                    <Badge tone={tone}>{p.score}</Badge>
                  </div>
                  <div className="mt-3 text-[12px] font-bold uppercase tracking-wide text-ink-700">
                    {p.label}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-600">
                    {p.gp != null ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-good font-semibold">+{p.gp.toFixed(1)}%</span>
                        <span className="text-ink-500">GP YoY</span>
                      </span>
                    ) : (
                      <span className="text-ink-500">No GP · GRI-aligned</span>
                    )}
                  </div>
                  <div className="mt-2.5 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${p.score}%`, backgroundColor: PILLAR_HEX[p.key] }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ══ Zone 3b — Portfolio trend chart ══ */}
      <div className="mt-5">
        <Card>
          <CardHeader
            title="Portfolio trend"
            hint="12-month rolling · approved data only"
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
                title="Not enough trend data"
                body="At least 3 months of approved data are needed to plot a trend."
                hint="0 / 3 months approved"
                tone="info"
              />
            </div>
          ) : (
            <div className="px-6 pb-6 pt-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={PORTFOLIO_TRENDS}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={activeTrend.domain}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                    }}
                    formatter={(val: number) => [
                      `${val}${activeTrend.unit}`,
                      activeTrend.label,
                    ]}
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

      {/* ══ Zone 4 — Action Centre | Recommended Measures | AI Insights ══ */}
      <div className="mt-8">
        <div className="grid grid-cols-12 gap-5">

          {/* Action Centre */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader title="Action Centre" right={<Badge tone="warn">7 active</Badge>} />
            {ACTION_CENTRE.length === 0 ? (
              <div className="p-4">
                <InsufficientData
                  title="No active actions"
                  body="All items are resolved."
                  tone="info"
                />
              </div>
            ) : (
              <ul className="px-3 pb-4 mt-3 space-y-0.5">
                {ACTION_CENTRE.map((a) => (
                  <li key={a.label}>
                    <Link
                      to={a.href}
                      className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-ink-50 hover:shadow-sm group border-l-2 transition-all"
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
                        <span className="font-bold text-[15px] text-ink-900 tabular-nums">
                          {a.count}
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-ink-400 group-hover:text-brand-700 transition-colors"
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Recommended Measures */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader
              title="Recommended measures"
              right={<Badge tone="brand">cross-pillar</Badge>}
            />
            {RECOMMENDED_MEASURES.length === 0 ? (
              <div className="p-4">
                <InsufficientData
                  title="No measures available"
                  body="No recommended measures for the current period."
                  tone="info"
                />
              </div>
            ) : (
              <ul className="px-3 pb-4 mt-3 space-y-1">
                {RECOMMENDED_MEASURES.slice(0, 4).map((m) => (
                  <li
                    key={m.measure}
                    className="rounded-lg p-3.5 hover:bg-ink-50 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0 mt-0.5">
                        <Lightbulb size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[13px] font-semibold text-ink-900 leading-snug">
                            {m.measure}
                          </div>
                          <div className="shrink-0">
                            <Badge tone={m.priority === "High" ? "good" : "warn"}>
                              {m.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          {m.cost} · {m.impact} impact
                        </div>
                        <p className="text-[11px] text-ink-500 leading-relaxed mt-1 line-clamp-1">
                          {m.rationale}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* AI Assistant Insights */}
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader
              title="AI Assistant insights"
              right={<Badge tone="brand">BETA</Badge>}
            />
            {AI_INSIGHTS.length === 0 ? (
              <div className="p-4">
                <InsufficientData
                  title="No AI insights yet"
                  body="Insights are generated once sufficient approved data exists."
                  tone="info"
                />
              </div>
            ) : (
              <ul className="px-3 pb-4 mt-3 space-y-1">
                {AI_INSIGHTS.slice(0, 4).map((i) => (
                  <li
                    key={i.title}
                    className="rounded-lg p-3.5 hover:bg-ink-50 border border-transparent hover:border-ink-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0 mt-0.5">
                        <Bot size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-ink-800 leading-snug line-clamp-2">
                          {i.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-warn bg-warn/10 rounded px-1.5 py-0.5 shrink-0">
                            Human approval required
                          </span>
                          <span className="text-[11px] font-semibold text-ink-500">
                            {i.confidence}% conf.
                          </span>
                        </div>
                        <button className="mt-2 inline-flex items-center gap-0.5 text-[12px] font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                          {i.cta} <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* ══ Zone 4b — Data Quality | Certifications ══ */}
      <div className="mt-5">
        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Data quality"
              hint="GHG / GRI / certification expectations"
              right={<Badge tone="good">{DATA_QUALITY.score}/100</Badge>}
            />
            <div className="p-6">
              <ul className="space-y-3.5">
                {DATA_QUALITY.breakdown.map((b) => (
                  <li key={b.name} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 text-ink-700">{b.name}</span>
                    <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          b.value >= 80 ? "bg-good" : b.value >= 60 ? "bg-warn" : "bg-bad"
                        )}
                        style={{ width: `${b.value}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-semibold text-ink-700">
                      {b.value}%
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/review-approval"
                className="btn-secondary w-full mt-5 justify-center"
              >
                <FileCheck2 size={14} /> Open Review &amp; Approval queue
              </Link>
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Certifications"
              hint="Portfolio readiness across active programmes"
              right={
                <Badge tone="good">{CERTIFICATIONS_OVERVIEW.readinessScore}/100</Badge>
              }
            />
            <div className="p-6 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-ink-700 font-medium">Portfolio readiness</span>
                  <span className="font-bold text-ink-900">
                    {CERTIFICATIONS_OVERVIEW.readinessScore}/100
                  </span>
                </div>
                <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      CERTIFICATIONS_OVERVIEW.readinessScore >= 80 ? "bg-good" : "bg-warn"
                    )}
                    style={{ width: `${CERTIFICATIONS_OVERVIEW.readinessScore}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="card-level-3 text-center">
                  <div className="text-xl font-bold text-ink-900">
                    {CERTIFICATIONS_OVERVIEW.activeProgrammes}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5">Active</div>
                </div>
                <div className="card-level-3 text-center">
                  <div className="text-xl font-bold text-warn">
                    {CERTIFICATIONS_OVERVIEW.evidenceGaps}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5">Evidence gaps</div>
                </div>
                <div className="card-level-3 text-center">
                  <div className="text-xl font-bold text-info">
                    {CERTIFICATIONS_OVERVIEW.nextAuditDays}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5">Days to audit</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-ink-700 bg-ink-50 rounded-lg px-3 py-2.5">
                <Calendar size={14} className="text-brand-700 shrink-0" />
                <span>
                  Next: <strong>{CERTIFICATIONS_OVERVIEW.nextAuditName}</strong> audit in{" "}
                  {CERTIFICATIONS_OVERVIEW.nextAuditDays} days
                </span>
                <Link
                  to="/certifications"
                  className="ml-auto text-brand-700 text-[12px] font-semibold hover:text-brand-800 shrink-0"
                >
                  View →
                </Link>
              </div>
              <Link to="/certifications" className="btn-secondary w-full justify-center">
                <Award size={14} /> Open Certifications
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ══ Zone 5 — Reporting & Disclosure Readiness (visually separated) ══ */}
      <div className="mt-10">
        <div className="flex items-center gap-4 mb-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400 whitespace-nowrap">
            Reporting &amp; Disclosure Readiness
          </span>
          <div className="h-px flex-1 bg-ink-200" />
        </div>
        <Card>
          <CardHeader
            title="Report readiness"
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
                  <th className="table-th">Coverage</th>
                  <th className="table-th">Blocking Issue</th>
                  <th className="table-th text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {REPORT_READINESS.map((r) => (
                  <tr key={r.name} className="hover:bg-ink-50/60">
                    <td className="table-td font-semibold text-ink-900">{r.name}</td>
                    <td className="table-td">
                      <Badge
                        tone={
                          r.status === "Ready"
                            ? "good"
                            : r.status === "Mapped"
                            ? "info"
                            : "warn"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              r.coverage >= 80
                                ? "bg-good"
                                : r.coverage >= 60
                                ? "bg-warn"
                                : "bg-bad"
                            )}
                            style={{ width: `${r.coverage}%` }}
                          />
                        </div>
                        <span className="font-semibold w-10 text-right tabular-nums">
                          {r.coverage}%
                        </span>
                      </div>
                    </td>
                    <td className="table-td max-w-[220px]">
                      {r.blockingIssue ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-bad">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span className="truncate">{r.blockingIssue}</span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-ink-400">—</span>
                      )}
                    </td>
                    <td className="table-td text-right pr-6">
                      <button className="btn-secondary h-7 px-3 text-[12px] text-brand-700 border-brand-200 hover:bg-brand-50">
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ══ Zone 6 — Property ranking (supporting drilldown) ══ */}
      <div className="mt-5">
        <div className="grid grid-cols-12 gap-5">
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Top performing properties"
              hint="overall sustainability score"
              right={
                <Link
                  to="/properties"
                  className="text-[12px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  View all
                </Link>
              }
            />
            {TOP_PROPERTIES.length === 0 ? (
              <div className="p-4">
                <InsufficientData
                  title="No property data"
                  body="No properties with sufficient data in the current period."
                  tone="info"
                />
              </div>
            ) : (
              <PropertyList rows={TOP_PROPERTIES} tone="good" />
            )}
          </Card>

          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Needs attention"
              hint="properties scoring under 60"
              right={
                <Link
                  to="/properties"
                  className="text-[12px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  View all
                </Link>
              }
            />
            {NEEDS_ATTENTION.length === 0 ? (
              <div className="p-4">
                <InsufficientData
                  title="No alerts"
                  body="All properties are performing above the threshold."
                  tone="info"
                />
              </div>
            ) : (
              <PropertyList rows={NEEDS_ATTENTION} tone="warn" />
            )}
          </Card>
        </div>
      </div>

      <div className="mt-8 text-[11px] text-ink-400 text-center pb-2">
        Portfolio-wide overview · Click a pillar card or the sidebar &ldquo;Performance&rdquo; entry for the four-layer pillar dashboards.
      </div>
    </div>
  );
}

/* ── Property list helper ── */

function PropertyList({
  rows,
  tone,
}: {
  rows: { property: string; location: string; score: number; reason: string }[];
  tone: "good" | "warn";
}) {
  return (
    <ul className="px-2 pb-4 mt-2">
      {rows.map((p) => (
        <li
          key={p.property}
          className="flex items-start gap-3 px-3 py-3.5 hover:bg-ink-50 rounded-lg cursor-pointer transition-colors"
        >
          <span
            className={cn(
              "w-8 h-8 rounded-full grid place-items-center text-white shrink-0 text-sm font-semibold mt-0.5",
              tone === "good" ? "bg-good" : "bg-warn"
            )}
          >
            {tone === "good" ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertTriangle size={15} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink-900 truncate">
              {p.property}
            </div>
            <div className="text-[11px] text-ink-500 truncate">{p.location}</div>
            <div className="text-[11px] text-ink-500 mt-0.5 leading-relaxed line-clamp-1">
              {p.reason}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-[18px] font-bold tabular-nums leading-none",
                  tone === "good" ? "text-good" : "text-warn"
                )}
              >
                {p.score}
              </span>
              {tone === "good" ? (
                <TrendingUp size={14} className="text-good" />
              ) : (
                <TrendingDown size={14} className="text-warn" />
              )}
            </div>
            <div className="w-16 h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  tone === "good" ? "bg-good" : "bg-warn"
                )}
                style={{ width: `${p.score}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
