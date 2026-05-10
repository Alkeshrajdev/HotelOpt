import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Award,
  AlertTriangle,
  Calendar,
  History,
  Download,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Eye,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "status" | "generate" | "certification" | "evidence" | "calendar" | "history";

// ── Mock data ─────────────────────────────────────────────────────────────────

const FRAMEWORK_STATUS = [
  {
    framework: "GRI",
    deadline: "30 Jun 2025",
    daysLeft: 57,
    pillarsComplete: 5,
    pillarsTotal: 6,
    dataComplete: 87,
    status: "on-track",
    blocker: null,
  },
  {
    framework: "CDP",
    deadline: "31 Jul 2025",
    daysLeft: 88,
    pillarsComplete: 4,
    pillarsTotal: 6,
    dataComplete: 72,
    status: "at-risk",
    blocker: "Scope 3 supply-chain data missing for 3 hotels",
  },
  {
    framework: "EU Taxonomy",
    deadline: "31 Mar 2025",
    daysLeft: -34,
    pillarsComplete: 6,
    pillarsTotal: 6,
    dataComplete: 100,
    status: "complete",
    blocker: null,
  },
  {
    framework: "UNGC",
    deadline: "15 Sep 2025",
    daysLeft: 134,
    pillarsComplete: 3,
    pillarsTotal: 6,
    dataComplete: 61,
    status: "at-risk",
    blocker: "Human rights due-diligence section not started",
  },
];

const CERTIFICATIONS = [
  { id: "c1", hotel: "The Pavilion London", cert: "Green Key", level: "Gold", expires: "Aug 2025", daysLeft: 119, status: "renew-soon", score: 91 },
  { id: "c2", hotel: "Grand Harbour Lisbon", cert: "Travelife", level: "Partner", expires: "Dec 2025", daysLeft: 241, status: "current", score: 84 },
  { id: "c3", hotel: "Skyline Dubai", cert: "Green Key", level: "Silver", expires: "Mar 2026", daysLeft: 335, status: "current", score: 76 },
  { id: "c4", hotel: "Bay View Singapore", cert: "EarthCheck", level: "Benchmarked", expires: "Jan 2026", daysLeft: 273, status: "current", score: 79 },
  { id: "c5", hotel: "The Montrose Paris", cert: "EU Ecolabel", level: "Certified", expires: "Sep 2025", daysLeft: 148, status: "renew-soon", score: 88 },
  { id: "c6", hotel: "Marina Residences Barcelona", cert: "Travelife", level: "Gold", expires: "Jun 2025", daysLeft: 57, status: "renew-soon", score: 82 },
  { id: "c7", hotel: "Oceanfront Cape Town", cert: "Fair Trade Tourism", level: "Certified", expires: "Feb 2026", daysLeft: 305, status: "current", score: 85 },
  { id: "c8", hotel: "Peaks Resort Zermatt", cert: "Green Key", level: "Bronze", expires: "Oct 2024", daysLeft: -212, status: "expired", score: 63 },
];

const EVIDENCE_GAPS = [
  { hotel: "Skyline Dubai", pillar: "Carbon", gap: "Scope 3 supply-chain invoices", impact: "CDP submission blocked", severity: "bad" },
  { hotel: "Grand Harbour Lisbon", pillar: "Carbon", gap: "Scope 3 business travel records", impact: "CDP submission blocked", severity: "bad" },
  { hotel: "Marina Residences Barcelona", pillar: "Waste", gap: "Contractor waste-diversion certificates", impact: "GRI 306 incomplete", severity: "warn" },
  { hotel: "Bay View Singapore", pillar: "Social", gap: "Third-party labour audit report", impact: "UNGC labour standards section blocked", severity: "warn" },
  { hotel: "Peaks Resort Zermatt", pillar: "Energy", gap: "Renewable energy certificates (RECs)", impact: "RE100 claim unverifiable", severity: "warn" },
  { hotel: "All properties", pillar: "Governance", gap: "Board sustainability sign-off letter", impact: "GRI 2-9 requires board confirmation", severity: "info" },
];

const AUDIT_EVENTS = [
  { date: "2025-05-15", event: "GRI Data Freeze", type: "deadline", notes: "All property data must be approved by this date" },
  { date: "2025-06-01", event: "CDP Portal Opens", type: "action", notes: "Start upload of verified data to CDP platform" },
  { date: "2025-06-15", event: "Green Key Renewal — The Pavilion London", type: "cert", notes: "Submit renewal documentation" },
  { date: "2025-06-30", event: "GRI Report Deadline", type: "deadline", notes: "Final submission to Global Reporting Initiative" },
  { date: "2025-07-15", event: "EU Taxonomy Verification", type: "action", notes: "External verifier review scheduled" },
  { date: "2025-07-31", event: "CDP Submission Deadline", type: "deadline", notes: "All scores finalised" },
  { date: "2025-08-10", event: "EU Ecolabel Renewal — The Montrose Paris", type: "cert", notes: "On-site audit by national authority" },
  { date: "2025-09-01", event: "Travelife Renewal — Marina Barcelona", type: "cert", notes: "Submit self-assessment questionnaire" },
  { date: "2025-09-15", event: "UNGC Communication on Progress Deadline", type: "deadline", notes: "Annual COP submission" },
];

const REPORT_HISTORY = [
  { id: "rh1", name: "GRI Standards Report 2023", framework: "GRI", year: 2023, published: "30 Jun 2024", status: "published", hotels: 8, size: "3.2 MB" },
  { id: "rh2", name: "CDP Climate Disclosure 2023", framework: "CDP", year: 2023, published: "31 Jul 2024", status: "published", hotels: 6, size: "1.8 MB" },
  { id: "rh3", name: "EU Taxonomy Report 2024", framework: "EU Taxonomy", year: 2024, published: "31 Mar 2025", status: "published", hotels: 3, size: "2.1 MB" },
  { id: "rh4", name: "UNGC COP 2023", framework: "UNGC", year: 2023, published: "15 Sep 2024", status: "published", hotels: 4, size: "0.9 MB" },
  { id: "rh5", name: "GRI Standards Report 2022", framework: "GRI", year: 2022, published: "30 Jun 2023", status: "published", hotels: 7, size: "2.9 MB" },
  { id: "rh6", name: "GRI Standards Report 2024 (Draft)", framework: "GRI", year: 2024, published: "—", status: "draft", hotels: 8, size: "—" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  "on-track":   "bg-good/10 text-good",
  "at-risk":    "bg-warn/10 text-warn",
  "complete":   "bg-brand-100 text-brand-700",
  "off-track":  "bg-bad/10 text-bad",
};
const STATUS_LABEL: Record<string, string> = {
  "on-track":  "On Track",
  "at-risk":   "At Risk",
  "complete":  "Complete",
  "off-track": "Off Track",
};

const CERT_BADGE: Record<string, string> = {
  current:      "bg-good/10 text-good",
  "renew-soon": "bg-warn/10 text-warn",
  expired:      "bg-bad/10 text-bad",
};
const CERT_LABEL: Record<string, string> = {
  current:      "Current",
  "renew-soon": "Renew Soon",
  expired:      "Expired",
};

const SEV_BADGE: Record<string, string> = {
  bad:  "bg-bad/10 text-bad",
  warn: "bg-warn/10 text-warn",
  info: "bg-ink-100 text-ink-500",
};
const SEV_LABEL: Record<string, string> = {
  bad:  "Blocking",
  warn: "At Risk",
  info: "Advisory",
};

const EVENT_BADGE: Record<string, string> = {
  deadline: "bg-bad/10 text-bad",
  action:   "bg-brand-100 text-brand-700",
  cert:     "bg-warn/10 text-warn",
};
const EVENT_LABEL: Record<string, string> = {
  deadline: "Deadline",
  action:   "Action",
  cert:     "Cert Renewal",
};

const PILLAR_COLOUR: Record<string, string> = {
  Energy:     "text-pillar-energy",
  Carbon:     "text-pillar-carbon",
  Water:      "text-pillar-water",
  Waste:      "text-pillar-waste",
  Social:     "text-pillar-social",
  Governance: "text-pillar-gov",
};

// ── Sub-pages ─────────────────────────────────────────────────────────────────

function ReportingStatusTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">Current readiness for each reporting framework this cycle.</p>
      {FRAMEWORK_STATUS.map(f => (
        <div key={f.framework} className="rounded-xl border border-ink-100 p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink-900 text-[15px]">{f.framework}</span>
                <span className={cn("chip", STATUS_BADGE[f.status])}>{STATUS_LABEL[f.status]}</span>
              </div>
              <div className="text-[12px] text-ink-500 mt-0.5">
                Deadline: {f.deadline} {f.daysLeft > 0 ? `· ${f.daysLeft} days left` : f.daysLeft === 0 ? "· Due today" : `· Submitted`}
              </div>
            </div>
            <Link
              to="/reports"
              className="text-[12px] text-brand-600 hover:underline flex items-center gap-0.5"
            >
              Open report <ChevronRight size={12} />
            </Link>
          </div>

          {/* Progress */}
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-[12px] text-ink-600 mb-1">
                <span>Data completeness</span>
                <span className="font-semibold">{f.dataComplete}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className={cn("h-full rounded-full", f.dataComplete === 100 ? "bg-good" : f.dataComplete >= 80 ? "bg-brand-500" : "bg-warn")}
                  style={{ width: `${f.dataComplete}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[12px] text-ink-600 mb-1">
                <span>Areas ready</span>
                <span className="font-semibold">{f.pillarsComplete} / {f.pillarsTotal}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: f.pillarsTotal }).map((_, i) => (
                  <div key={i} className={cn("flex-1 h-1.5 rounded-full", i < f.pillarsComplete ? "bg-good" : "bg-ink-100")} />
                ))}
              </div>
            </div>
          </div>

          {f.blocker && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-warn bg-warn/5 border border-warn/20 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{f.blocker}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const GENERATE_FRAMEWORKS = ["GRI Standards 2021", "CDP Climate", "EU Taxonomy", "UNGC COP", "SASB Hospitality", "TCFD"];
const GENERATE_YEARS = ["2024", "2023", "2022"];
const GENERATE_FORMATS = ["PDF", "Excel", "Word", "JSON"];

function GenerateReportTab() {
  const [framework, setFramework] = useState("GRI Standards 2021");
  const [year, setYear] = useState("2024");
  const [format, setFormat] = useState("PDF");
  const [scope, setScope] = useState("all");

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-ink-500">Generate a formatted sustainability report from approved data.</p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-[12px] font-medium text-ink-600">Framework</span>
          <select
            className="input mt-1"
            value={framework}
            onChange={e => setFramework(e.target.value)}
          >
            {GENERATE_FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] font-medium text-ink-600">Reporting Year</span>
          <select className="input mt-1" value={year} onChange={e => setYear(e.target.value)}>
            {GENERATE_YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </label>

        <fieldset>
          <legend className="text-[12px] font-medium text-ink-600 mb-2">Scope</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "all", label: "All 8 Hotels" },
              { value: "group", label: "By Group" },
              { value: "single", label: "Single Hotel" },
              { value: "custom", label: "Custom Selection" },
            ].map(o => (
              <label key={o.value} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-[13px]", scope === o.value ? "border-brand-400 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600")}>
                <input type="radio" name="scope" value={o.value} checked={scope === o.value} onChange={() => setScope(o.value)} className="sr-only" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[12px] font-medium text-ink-600 mb-2">Output Format</legend>
          <div className="flex gap-2">
            {GENERATE_FORMATS.map(f => (
              <label key={f} className={cn("flex-1 text-center rounded-lg border px-2 py-1.5 cursor-pointer text-[12px] font-medium", format === f ? "border-brand-400 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500")}>
                <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                {f}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="pt-2 flex gap-2">
        <button className="btn-primary flex items-center gap-1.5">
          <Download size={14} /> Generate Report
        </button>
        <button className="btn-secondary flex items-center gap-1.5">
          <Eye size={14} /> Preview
        </button>
      </div>

      <div className="rounded-lg bg-ink-50 border border-ink-100 px-4 py-3 text-[12px] text-ink-500">
        Last generated: GRI Standards 2021 · 2023 · PDF · 4 days ago
      </div>
    </div>
  );
}

function CertificationTab() {
  const current = CERTIFICATIONS.filter(c => c.status === "current").length;
  const renewSoon = CERTIFICATIONS.filter(c => c.status === "renew-soon").length;
  const expired = CERTIFICATIONS.filter(c => c.status === "expired").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Current", count: current, colour: "text-good" },
          { label: "Renew Soon", count: renewSoon, colour: "text-warn" },
          { label: "Expired", count: expired, colour: "text-bad" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-ink-100 bg-white p-4 text-center">
            <div className={cn("text-3xl font-extrabold", s.colour)}>{s.count}</div>
            <div className="text-[12px] text-ink-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Hotel", "Certification", "Level", "Expires", "Days Left", "Audit Score", "Status", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-3 first:pl-0 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {CERTIFICATIONS.map(c => (
              <tr key={c.id} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-3 pl-0 font-medium text-ink-900">
                  <Link to={`/properties/${c.id}`} className="hover:text-brand-600 flex items-center gap-1">
                    {c.hotel} <ChevronRight size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </Link>
                </td>
                <td className="py-3 px-3 text-ink-700">{c.cert}</td>
                <td className="py-3 px-3 text-ink-500">{c.level}</td>
                <td className="py-3 px-3 text-ink-500">{c.expires}</td>
                <td className={cn("py-3 px-3 font-medium", c.daysLeft < 0 ? "text-bad" : c.daysLeft < 90 ? "text-warn" : "text-ink-600")}>
                  {c.daysLeft < 0 ? `${Math.abs(c.daysLeft)}d overdue` : `${c.daysLeft}d`}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="text-ink-600">{c.score}%</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={cn("chip", CERT_BADGE[c.status])}>{CERT_LABEL[c.status]}</span>
                </td>
                <td className="py-3 px-3 pr-0">
                  <Link to="/certifications" className="text-[12px] text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvidenceGapsTab() {
  const blocking = EVIDENCE_GAPS.filter(e => e.severity === "bad").length;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <p className="text-sm text-ink-500 flex-1">
          Evidence gaps that must be resolved before reports can be finalised.
        </p>
        {blocking > 0 && (
          <span className="chip bg-bad/10 text-bad shrink-0">{blocking} blocking</span>
        )}
      </div>
      <div className="grid gap-3">
        {EVIDENCE_GAPS.map((e, i) => (
          <div key={i} className={cn("rounded-xl border p-4", e.severity === "bad" ? "border-bad/30 bg-bad/5" : e.severity === "warn" ? "border-warn/30 bg-warn/5" : "border-ink-100 bg-white")}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("chip", SEV_BADGE[e.severity])}>{SEV_LABEL[e.severity]}</span>
                  {e.hotel !== "All properties" ? (
                    <Link to="/properties" className="font-medium text-ink-900 text-[13px] hover:text-brand-600 flex items-center gap-0.5">
                      {e.hotel} <ChevronRight size={11} />
                    </Link>
                  ) : (
                    <span className="font-medium text-ink-900 text-[13px]">{e.hotel}</span>
                  )}
                  <span className={cn("text-[12px] font-semibold", PILLAR_COLOUR[e.pillar])}>{e.pillar}</span>
                </div>
                <div className="mt-1.5 text-[13px] text-ink-700 font-medium">{e.gap}</div>
                <div className="mt-0.5 text-[12px] text-ink-500">Impact: {e.impact}</div>
              </div>
              <Link to="/data-capture" className="text-[12px] text-brand-600 hover:underline shrink-0 flex items-center gap-0.5">
                Upload evidence <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditCalendarTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">Key reporting deadlines, certification renewals, and submission dates for this cycle.</p>
      <div className="grid gap-2">
        {AUDIT_EVENTS.map((e, i) => {
          const date = new Date(e.date);
          const month = date.toLocaleString("default", { month: "short" });
          const day = date.getDate();
          return (
            <div key={i} className="flex items-start gap-4 rounded-xl border border-ink-100 bg-white p-4 hover:shadow-sm transition-shadow">
              <div className="w-12 shrink-0 text-center">
                <div className="text-[10px] font-semibold text-ink-400 uppercase">{month}</div>
                <div className="text-xl font-extrabold text-ink-900 leading-tight">{day}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink-900 text-[14px]">{e.event}</span>
                  <span className={cn("chip text-[10px]", EVENT_BADGE[e.type])}>{EVENT_LABEL[e.type]}</span>
                </div>
                <div className="text-[12px] text-ink-500 mt-0.5">{e.notes}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportHistoryTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">All published and draft reports across frameworks and years.</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> New Report
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Report Name", "Framework", "Year", "Hotels", "Published", "Status", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-3 first:pl-0 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {REPORT_HISTORY.map(r => (
              <tr key={r.id} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-3 pl-0 font-medium text-ink-900">{r.name}</td>
                <td className="py-3 px-3">
                  <span className="chip bg-ink-100 text-ink-600">{r.framework}</span>
                </td>
                <td className="py-3 px-3 text-ink-500">{r.year}</td>
                <td className="py-3 px-3 text-ink-600">{r.hotels}</td>
                <td className="py-3 px-3 text-ink-500">{r.published}</td>
                <td className="py-3 px-3">
                  <span className={cn("chip", r.status === "published" ? "bg-good/10 text-good" : "bg-warn/10 text-warn")}>
                    {r.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="py-3 px-3 pr-0">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700" title="Download">
                      <Download size={13} />
                    </button>
                    {r.status === "draft" && (
                      <button className="p-1 rounded hover:bg-brand-50 text-ink-400 hover:text-brand-600" title="Regenerate">
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "status",        label: "Reporting Status",       icon: FileText },
  { key: "generate",      label: "Generate Report",        icon: Download },
  { key: "certification", label: "Certification Readiness", icon: Award },
  { key: "evidence",      label: "Evidence Gaps",          icon: AlertTriangle },
  { key: "calendar",      label: "Audit Calendar",         icon: Calendar },
  { key: "history",       label: "Report History",         icon: History },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioReports() {
  const [tab, setTab] = useState<Tab>("status");

  const blocking = EVIDENCE_GAPS.filter(e => e.severity === "bad").length;
  const renewSoon = CERTIFICATIONS.filter(c => c.status === "renew-soon" || c.status === "expired").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Reports & Certifications</h1>
        <p className="text-sm text-ink-500 mt-1">
          Framework readiness, report generation, certification tracking, and audit calendar.
        </p>
      </div>

      {/* Alert strip */}
      {(blocking > 0 || renewSoon > 0) && (
        <div className="flex flex-wrap gap-3">
          {blocking > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/5 px-4 py-2.5 text-[13px] text-bad">
              <AlertTriangle size={14} className="shrink-0" />
              <span><strong>{blocking} evidence gaps</strong> are blocking report submissions. <button className="underline" onClick={() => {}}>View gaps</button></span>
            </div>
          )}
          {renewSoon > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-2.5 text-[13px] text-warn">
              <Clock size={14} className="shrink-0" />
              <span><strong>{renewSoon} certifications</strong> are due for renewal. <button className="underline" onClick={() => {}}>Review</button></span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-100 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                tab === t.key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
              )}
            >
              <Icon size={14} />
              {t.label}
              {t.key === "evidence" && blocking > 0 && (
                <span className="chip bg-bad/15 text-bad text-[10px] ml-1">{blocking}</span>
              )}
              {t.key === "certification" && renewSoon > 0 && (
                <span className="chip bg-warn/15 text-warn text-[10px] ml-1">{renewSoon}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-ink-100 p-5 shadow-sm">
        {tab === "status"        && <ReportingStatusTab />}
        {tab === "generate"      && <GenerateReportTab />}
        {tab === "certification" && <CertificationTab />}
        {tab === "evidence"      && <EvidenceGapsTab />}
        {tab === "calendar"      && <AuditCalendarTab />}
        {tab === "history"       && <ReportHistoryTab />}
      </div>
    </div>
  );
}
