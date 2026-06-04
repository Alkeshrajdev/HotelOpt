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
  Upload,
  Filter,
  Users,
  User,
  Mail,
  ArrowRight,
  List,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";

type Tab = "status" | "generate" | "certification" | "evidence" | "calendar" | "history";

// ── Mock data ─────────────────────────────────────────────────────────────────

const REPORTING_STATUS = [
  { name: "Portfolio Sustainability Summary", status: "Ready",   coverage: 94, hotels: 8, missing: 0,  gaps: 0,  owner: "Sarah Chen",     lastGen: "2 days ago", blocker: null },
  { name: "GHG Inventory",                   status: "Ready",   coverage: 92, hotels: 8, missing: 1,  gaps: 2,  owner: "Sarah Chen",     lastGen: "4 days ago", blocker: null },
  { name: "GRI Standards",                   status: "Mapped",  coverage: 86, hotels: 8, missing: 3,  gaps: 4,  owner: "Marco Rossi",    lastGen: "1 week ago", blocker: null },
  { name: "SBTi Net-Zero",                   status: "Draft",   coverage: 71, hotels: 6, missing: 8,  gaps: 6,  owner: "Sarah Chen",     lastGen: "—",          blocker: "Scope 3 travel & logistics data incomplete for 3 hotels" },
  { name: "HCMI Guest Footprint",            status: "Ready",   coverage: 88, hotels: 8, missing: 2,  gaps: 1,  owner: "Jin Park",       lastGen: "3 days ago", blocker: null },
  { name: "CSRD / ESRS Draft",               status: "Draft",   coverage: 61, hotels: 5, missing: 14, gaps: 9,  owner: "Sophie Müller",  lastGen: "—",          blocker: "Social indicators gap — 3 KPIs missing across 4 hotels" },
  { name: "GRESB",                           status: "Mapped",  coverage: 81, hotels: 8, missing: 4,  gaps: 3,  owner: "Sarah Chen",     lastGen: "2 weeks ago",blocker: null },
  { name: "Certification Evidence Pack",     status: "Blocked", coverage: 74, hotels: 8, missing: 6,  gaps: 18, owner: "Layla Al-Hassan",lastGen: "—",          blocker: "Green Globe evidence pack 12% short — 18 gaps across 3 hotels" },
];

const CERTIFICATIONS_DETAIL = [
  { hotel: "The Pavilion London",         programme: "Green Key",      readiness: 91, ready: 38, partial: 5, notReady: 2,  gaps: 2,  owner: "Sarah Chen",     nextAudit: "Aug 2025", status: "current"    },
  { hotel: "Grand Harbour Lisbon",        programme: "Travelife",      readiness: 84, ready: 29, partial: 8, notReady: 5,  gaps: 5,  owner: "Marco Rossi",    nextAudit: "Dec 2025", status: "current"    },
  { hotel: "Skyline Dubai",               programme: "Green Key",      readiness: 76, ready: 26, partial: 12,notReady: 7,  gaps: 7,  owner: "Layla Al-Hassan",nextAudit: "Mar 2026", status: "current"    },
  { hotel: "Bay View Singapore",          programme: "EarthCheck",     readiness: 79, ready: 22, partial: 9, notReady: 8,  gaps: 8,  owner: "Jin Park",       nextAudit: "Jan 2026", status: "current"    },
  { hotel: "The Montrose Paris",          programme: "EU Ecolabel",    readiness: 88, ready: 42, partial: 6, notReady: 3,  gaps: 3,  owner: "Sophie Müller",  nextAudit: "Sep 2025", status: "renew-soon" },
  { hotel: "Marina Residences Barcelona", programme: "Travelife",      readiness: 82, ready: 31, partial: 10,notReady: 7,  gaps: 7,  owner: "Marco Rossi",    nextAudit: "Jun 2025", status: "renew-soon" },
  { hotel: "Oceanfront Cape Town",        programme: "Fair Trade",     readiness: 85, ready: 28, partial: 7, notReady: 5,  gaps: 5,  owner: "Thabo Nkosi",    nextAudit: "Feb 2026", status: "current"    },
  { hotel: "Peaks Resort Zermatt",        programme: "Green Key",      readiness: 63, ready: 18, partial: 8, notReady: 19, gaps: 19, owner: "Sophie Müller",  nextAudit: "—",        status: "expired"    },
  { hotel: "Airport Hotel Dubai",         programme: "Green Globe",    readiness: 44, ready: 14, partial: 8, notReady: 22, gaps: 22, owner: "Layla Al-Hassan",nextAudit: "—",        status: "at-risk"    },
];

const EVIDENCE_GAPS = [
  { hotel: "Airport Hotel Dubai",         programme: "Green Globe",   evidence: "Diesel consumption certificates (Scope 1)", area: "Carbon",     priority: "Critical", owner: "Layla Al-Hassan", due: "15 Jun 2025", status: "open"       },
  { hotel: "Marina Residences Barcelona", programme: "Travelife",     evidence: "Contractor waste-diversion certificates",   area: "Waste",      priority: "High",     owner: "Marco Rossi",    due: "30 Jun 2025", status: "in-progress"},
  { hotel: "Grand Harbour Lisbon",        programme: "GHG Inventory", evidence: "Scope 3 business travel records Q4",        area: "Carbon",     priority: "Critical", owner: "Marco Rossi",    due: "20 Jun 2025", status: "open"       },
  { hotel: "Bay View Singapore",          programme: "EarthCheck",    evidence: "Third-party labour audit report",           area: "Social",     priority: "High",     owner: "Jin Park",       due: "31 Jul 2025", status: "open"       },
  { hotel: "Peaks Resort Zermatt",        programme: "Green Key",     evidence: "Renewable energy certificates (RECs)",      area: "Energy",     priority: "Medium",   owner: "Sophie Müller",  due: "—",           status: "open"       },
  { hotel: "All properties",             programme: "GRI Standards", evidence: "Board sustainability sign-off letter",      area: "Governance", priority: "High",     owner: "Sarah Chen",     due: "30 Jun 2025", status: "open"       },
  { hotel: "Skyline Dubai",               programme: "Green Key",     evidence: "Water recycling system verification",       area: "Water",      priority: "Medium",   owner: "Layla Al-Hassan",due: "31 Jul 2025", status: "in-progress"},
  { hotel: "Airport Hotel Dubai",         programme: "CSRD / ESRS",   evidence: "Social KPI — staff training hours log",    area: "Social",     priority: "High",     owner: "Layla Al-Hassan",due: "15 Jun 2025", status: "open"       },
];

const AUDIT_EVENTS = [
  { date: "2025-05-15", hotel: "Portfolio",               event: "GRI Data Freeze",                  type: "deadline", owner: "Sarah Chen",     status: "upcoming", notes: "All property data must be approved by this date" },
  { date: "2025-06-01", hotel: "Portfolio",               event: "CDP Portal Opens",                 type: "action",   owner: "Sarah Chen",     status: "upcoming", notes: "Start upload of verified data to CDP platform" },
  { date: "2025-06-15", hotel: "The Pavilion London",     event: "Green Key Renewal",                type: "cert",     owner: "Sarah Chen",     status: "upcoming", notes: "Submit renewal documentation to Green Key foundation" },
  { date: "2025-06-30", hotel: "Portfolio",               event: "GRI Report Deadline",              type: "deadline", owner: "Marco Rossi",    status: "upcoming", notes: "Final GRI Standards submission" },
  { date: "2025-06-30", hotel: "Marina Residences",       event: "Travelife Renewal Deadline",       type: "cert",     owner: "Marco Rossi",    status: "upcoming", notes: "Submit self-assessment questionnaire" },
  { date: "2025-07-15", hotel: "Portfolio",               event: "EU Taxonomy Verification",         type: "action",   owner: "Sophie Müller",  status: "upcoming", notes: "External verifier review scheduled" },
  { date: "2025-07-31", hotel: "Portfolio",               event: "CDP Submission Deadline",          type: "deadline", owner: "Sarah Chen",     status: "upcoming", notes: "All scores finalised and submitted" },
  { date: "2025-08-10", hotel: "The Montrose Paris",      event: "EU Ecolabel Renewal Audit",        type: "cert",     owner: "Sophie Müller",  status: "upcoming", notes: "On-site audit by national authority" },
  { date: "2025-09-15", hotel: "Portfolio",               event: "UNGC COP Deadline",                type: "deadline", owner: "Sarah Chen",     status: "upcoming", notes: "Annual Communication on Progress" },
];

const REPORT_HISTORY = [
  { id: "rh1", name: "GRI Standards Report 2023",        framework: "GRI",        version: "v2.1", year: 2023, hotels: 8, dataBasis: "Approved only",        genBy: "Sarah Chen",     genDate: "30 Jun 2024", status: "published", evidencePack: true  },
  { id: "rh2", name: "CDP Climate Disclosure 2023",      framework: "CDP",        version: "v1.0", year: 2023, hotels: 6, dataBasis: "Approved only",        genBy: "Sarah Chen",     genDate: "31 Jul 2024", status: "published", evidencePack: false },
  { id: "rh3", name: "EU Taxonomy Report 2024",          framework: "EU Taxonomy",version: "v1.0", year: 2024, hotels: 3, dataBasis: "Approved only",        genBy: "Sophie Müller",  genDate: "31 Mar 2025", status: "published", evidencePack: true  },
  { id: "rh4", name: "UNGC COP 2023",                    framework: "UNGC",       version: "v1.0", year: 2023, hotels: 4, dataBasis: "Approved only",        genBy: "Sarah Chen",     genDate: "15 Sep 2024", status: "published", evidencePack: false },
  { id: "rh5", name: "GRI Standards Report 2022",        framework: "GRI",        version: "v1.0", year: 2022, hotels: 7, dataBasis: "Approved only",        genBy: "Sarah Chen",     genDate: "30 Jun 2023", status: "published", evidencePack: true  },
  { id: "rh6", name: "HCMI Guest Footprint 2023",        framework: "HCMI",       version: "v1.2", year: 2023, hotels: 8, dataBasis: "Approved only",        genBy: "Jin Park",       genDate: "15 Aug 2024", status: "published", evidencePack: false },
  { id: "rh7", name: "GRI Standards Report 2024 (Draft)",framework: "GRI",        version: "v0.3", year: 2024, hotels: 8, dataBasis: "Approved + provisional",genBy: "Sarah Chen",     genDate: "—",           status: "draft",     evidencePack: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  Ready:     "bg-good/10 text-good",
  Mapped:    "bg-brand-100 text-brand-700",
  Draft:     "bg-warn/10 text-warn",
  Blocked:   "bg-bad/10 text-bad",
  "Needs Review": "bg-warn/10 text-warn",
};

const CERT_BADGE: Record<string, string> = {
  current:      "bg-good/10 text-good",
  "renew-soon": "bg-warn/10 text-warn",
  expired:      "bg-bad/10 text-bad",
  "at-risk":    "bg-bad/10 text-bad",
};
const CERT_LABEL: Record<string, string> = {
  current: "Current", "renew-soon": "Renew Soon", expired: "Expired", "at-risk": "At Risk",
};

const PRIORITY_BADGE: Record<string, string> = {
  Critical: "bg-bad/10 text-bad",
  High:     "bg-warn/10 text-warn",
  Medium:   "bg-ink-100 text-ink-500",
};

const EV_STATUS_BADGE: Record<string, string> = {
  open:          "bg-bad/10 text-bad",
  "in-progress": "bg-brand-100 text-brand-700",
  resolved:      "bg-good/10 text-good",
};
const EV_STATUS_LABEL: Record<string, string> = {
  open: "Open", "in-progress": "In Progress", resolved: "Resolved",
};

const EVENT_BADGE: Record<string, string> = {
  deadline: "bg-bad/10 text-bad",
  action:   "bg-brand-100 text-brand-700",
  cert:     "bg-warn/10 text-warn",
};
const EVENT_LABEL: Record<string, string> = {
  deadline: "Deadline", action: "Action Required", cert: "Cert Renewal",
};

const PILLAR_COLOUR: Record<string, string> = {
  Energy: "text-pillar-energy", Carbon: "text-pillar-carbon", Water: "text-pillar-water",
  Waste: "text-pillar-waste", Social: "text-pillar-social", Governance: "text-pillar-gov",
};

// ── Sub-pages ─────────────────────────────────────────────────────────────────

function ReportingStatusTab() {
  const blocking = REPORTING_STATUS.filter(r => r.status === "Blocked").length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">Consolidated readiness for each reporting framework this cycle. Approved data only.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Report / Framework", "Status", "Coverage", "Hotels", "Missing Data", "Evidence Gaps", "Blocking Issue", "Owner", "Last Generated", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {REPORTING_STATUS.map(r => (
              <tr key={r.name} className="hover:bg-ink-50/50 group cursor-pointer">
                <td className="py-3 px-2 pl-0 font-semibold text-ink-900 whitespace-nowrap">{r.name}</td>
                <td className="py-3 px-2"><span className={cn("chip text-[10px]", STATUS_BADGE[r.status])}>{r.status}</span></td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className={cn("h-full rounded-full", r.coverage >= 80 ? "bg-good" : r.coverage >= 60 ? "bg-warn" : "bg-bad")} style={{ width: `${r.coverage}%` }} />
                    </div>
                    <span className="tabular-nums font-semibold">{r.coverage}%</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-ink-600 tabular-nums">{r.hotels}</td>
                <td className="py-3 px-2">{r.missing > 0 ? <span className="text-warn font-medium">{r.missing} records</span> : <span className="text-ink-300">—</span>}</td>
                <td className="py-3 px-2">{r.gaps > 0 ? <span className="text-bad font-medium">{r.gaps} gaps</span> : <span className="text-ink-300">—</span>}</td>
                <td className="py-3 px-2 max-w-[220px]">
                  {r.blocker ? (
                    <span className="flex items-start gap-1 text-bad text-[11px]">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{r.blocker}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-good text-[11px]">
                      <CheckCircle2 size={11} /> No blockers
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap">{r.owner}</td>
                <td className="py-3 px-2 text-ink-400 whitespace-nowrap">{r.lastGen}</td>
                <td className="py-3 px-2 pr-0">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to="/portfolio/reports-certifications" className="chip bg-brand-100 text-brand-700 hover:bg-brand-200 text-[10px] font-semibold cursor-pointer">
                      {r.status === "Ready" ? "Generate" : r.status === "Mapped" ? "Review" : r.status === "Draft" ? "Continue" : "Resolve"}
                    </Link>
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

// ── Generate Report — multi-step ──────────────────────────────────────────────

const FRAMEWORKS = ["GHG Inventory", "GRI Standards", "HCMI Guest Footprint", "SBTi Net-Zero", "CSRD / ESRS Draft", "GRESB", "Certification Evidence Pack", "Internal Management Report"];
const OUTPUT_FORMATS = ["PDF", "Excel", "PowerPoint", "Evidence ZIP"];
const REPORT_SECTIONS = [
  "Executive Summary", "Portfolio Operating Context", "Performance by Area",
  "Hotel Comparison", "GHG Inventory", "Certifications", "Actions",
  "Data Quality Notes", "Evidence Appendix",
];

const READINESS_CHECK = [
  { label: "Approved data",        value: "86%",      status: "warn" },
  { label: "Missing records",      value: "31 records",status: "warn" },
  { label: "Pending approvals",    value: "24",        status: "warn" },
  { label: "Evidence gaps",        value: "18 gaps",   status: "bad"  },
  { label: "Supplier data gaps",   value: "6 suppliers",status:"warn" },
  { label: "Methodology notes",    value: "4 noted",   status: "info" },
];

function GenerateReportTab() {
  const [step, setStep]         = useState(1);
  const [scope, setScope]       = useState("all");
  const [period, setPeriod]     = useState("2024 Full Year");
  const [format, setFormat]     = useState("PDF");
  const [framework, setFramework] = useState("GRI Standards");
  const [dataBasis, setDataBasis] = useState("approved");

  const steps = ["Scope", "Period", "Format", "Framework", "Readiness", "Preview"];

  return (
    <div className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <button onClick={() => setStep(i + 1)}
              className={cn("w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 transition-colors",
                i + 1 === step ? "bg-brand-700 text-white" : i + 1 < step ? "bg-good text-white" : "bg-ink-100 text-ink-400")}>
              {i + 1 < step ? <CheckCircle2 size={14} /> : i + 1}
            </button>
            <span className={cn("text-[11px] font-medium hidden sm:block", i + 1 === step ? "text-brand-700" : "text-ink-400")}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-ink-100 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Scope */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-ink-900">Select reporting scope</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "all",    label: "Entire portfolio", sub: "All 8 active hotels" },
              { val: "group",  label: "By group",         sub: "Select one or more groups" },
              { val: "single", label: "Single hotel",     sub: "One property" },
              { val: "custom", label: "Custom selection", sub: "Choose specific hotels" },
            ].map(o => (
              <label key={o.val} className={cn("rounded-xl border p-4 cursor-pointer transition-colors", scope === o.val ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:border-ink-300")}>
                <input type="radio" name="scope" value={o.val} checked={scope === o.val} onChange={() => setScope(o.val)} className="sr-only" />
                <div className="font-medium text-ink-900 text-[13px]">{o.label}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">{o.sub}</div>
              </label>
            ))}
          </div>
          <label className="block mt-2">
            <span className="text-[11px] font-medium text-ink-600">Data basis</span>
            <div className="flex gap-3 mt-2">
              {[
                { val: "approved",  label: "Approved data only", sub: "Recommended for external reporting" },
                { val: "provisional",label: "Approved + provisional", sub: "Clearly labelled" },
              ].map(o => (
                <label key={o.val} className={cn("flex-1 rounded-xl border p-3 cursor-pointer transition-colors", dataBasis === o.val ? "border-brand-400 bg-brand-50" : "border-ink-200")}>
                  <input type="radio" name="dataBasis" value={o.val} checked={dataBasis === o.val} onChange={() => setDataBasis(o.val)} className="sr-only" />
                  <div className="font-medium text-ink-900 text-[12px]">{o.label}</div>
                  <div className="text-[11px] text-ink-400 mt-0.5">{o.sub}</div>
                </label>
              ))}
            </div>
          </label>
          <button onClick={() => setStep(2)} className="btn-primary mt-2">Next: Period</button>
        </div>
      )}

      {/* Step 2: Period */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-ink-900">Select reporting period</h3>
          <div className="grid grid-cols-2 gap-3">
            {["2024 Full Year", "2023 Full Year", "Q1 2025", "Q4 2024", "Jan–Mar 2025", "Custom range"].map(p => (
              <label key={p} className={cn("rounded-xl border p-3 cursor-pointer transition-colors text-[13px] font-medium text-ink-800", period === p ? "border-brand-400 bg-brand-50 text-brand-800" : "border-ink-200 hover:border-ink-300")}>
                <input type="radio" name="period" value={p} checked={period === p} onChange={() => setPeriod(p)} className="sr-only" />
                {p}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(3)} className="btn-primary">Next: Output Format</button>
          </div>
        </div>
      )}

      {/* Step 3: Format */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-ink-900">Select output format</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "PDF",          label: "PDF Report",       sub: "Formatted for external sharing" },
              { val: "Excel",        label: "Excel Workbook",   sub: "Data tables and charts" },
              { val: "PowerPoint",   label: "PowerPoint",       sub: "Presentation-ready slides" },
              { val: "Evidence ZIP", label: "Evidence ZIP",     sub: "All evidence files bundled" },
            ].map(o => (
              <label key={o.val} className={cn("rounded-xl border p-4 cursor-pointer transition-colors", format === o.val ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:border-ink-300")}>
                <input type="radio" name="format" value={o.val} checked={format === o.val} onChange={() => setFormat(o.val)} className="sr-only" />
                <div className="font-medium text-ink-900 text-[13px]">{o.label}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">{o.sub}</div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(4)} className="btn-primary">Next: Framework</button>
          </div>
        </div>
      )}

      {/* Step 4: Framework */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-ink-900">Select framework or report type</h3>
          <div className="grid gap-2">
            {FRAMEWORKS.map(f => (
              <label key={f} className={cn("rounded-xl border px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors", framework === f ? "border-brand-400 bg-brand-50" : "border-ink-200 hover:border-ink-300")}>
                <input type="radio" name="framework" value={f} checked={framework === f} onChange={() => setFramework(f)} className="sr-only" />
                <div className={cn("w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center", framework === f ? "border-brand-600" : "border-ink-300")}>
                  {framework === f && <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
                </div>
                <span className="text-[13px] font-medium text-ink-900">{f}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(5)} className="btn-primary">Next: Readiness Check</button>
          </div>
        </div>
      )}

      {/* Step 5: Readiness check */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-ink-900">Readiness check</h3>
          <p className="text-[12px] text-ink-500">Review these items before generating. Reports marked "Approved data only" cannot include unresolved gaps.</p>
          <div className="rounded-xl border border-ink-100 divide-y divide-ink-50">
            {READINESS_CHECK.map(r => (
              <div key={r.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-ink-700">{r.label}</span>
                <span className={cn("chip text-[11px]",
                  r.status === "bad" ? "bg-bad/10 text-bad" : r.status === "warn" ? "bg-warn/10 text-warn" : "bg-ink-100 text-ink-500")}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-warn/5 border border-warn/20 px-4 py-3 text-[12px] text-warn flex items-start gap-2">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>18 evidence gaps remain open. The generated report will note these as outstanding items. Resolve gaps for a clean report.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(4)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(6)} className="btn-primary">Next: Preview Sections</button>
          </div>
        </div>
      )}

      {/* Step 6: Preview & generate */}
      {step === 6 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-ink-900">Report sections</h3>
          <p className="text-[12px] text-ink-500">The following sections will be included. Deselect any you don't need.</p>
          <div className="rounded-xl border border-ink-100 divide-y divide-ink-50">
            {REPORT_SECTIONS.map((s, i) => (
              <label key={s} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-ink-50/50">
                <input type="checkbox" defaultChecked className="accent-brand-600" />
                <span className="text-[13px] text-ink-800">{s}</span>
                {i < 3 && <span className="ml-auto chip bg-brand-100 text-brand-700 text-[10px]">Required</span>}
              </label>
            ))}
          </div>
          <div className="rounded-xl bg-ink-50 border border-ink-100 px-4 py-3 text-[12px] text-ink-600 space-y-1">
            <div className="flex gap-4">
              <span><strong>Scope:</strong> {scope === "all" ? "Entire portfolio (8 hotels)" : scope}</span>
              <span><strong>Period:</strong> {period}</span>
            </div>
            <div className="flex gap-4">
              <span><strong>Format:</strong> {format}</span>
              <span><strong>Framework:</strong> {framework}</span>
              <span><strong>Data:</strong> {dataBasis === "approved" ? "Approved only" : "Approved + provisional"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(5)} className="btn-secondary">Back</button>
            <button className="btn-primary flex items-center gap-1.5"><Download size={14} /> Generate Report</button>
            <button className="btn-secondary flex items-center gap-1.5"><Eye size={14} /> Preview</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Certification Readiness ───────────────────────────────────────────────────

const CERT_PROGRAMMES = ["All", "Green Key", "Travelife", "EarthCheck", "EU Ecolabel", "Fair Trade", "Green Globe", "GSTC"];
const CERT_STATUSES   = ["All", "Current", "Renew Soon", "At Risk", "Expired"];

function CertificationTab() {
  const [progFilter, setProgFilter]     = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const visible = CERTIFICATIONS_DETAIL.filter(c =>
    (progFilter === "All" || c.programme === progFilter) &&
    (statusFilter === "All" || CERT_LABEL[c.status] === statusFilter || c.status === statusFilter.toLowerCase().replace(" ", "-"))
  );

  const current   = CERTIFICATIONS_DETAIL.filter(c => c.status === "current").length;
  const renewSoon = CERTIFICATIONS_DETAIL.filter(c => c.status === "renew-soon").length;
  const atRisk    = CERTIFICATIONS_DETAIL.filter(c => c.status === "at-risk" || c.status === "expired").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Current",    count: current,   colour: "text-good" },
          { label: "Renew Soon", count: renewSoon,  colour: "text-warn" },
          { label: "At Risk / Expired", count: atRisk, colour: "text-bad" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-ink-100 bg-white p-3 text-center">
            <div className={cn("text-2xl font-extrabold", s.colour)}>{s.count}</div>
            <div className="text-[11px] text-ink-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {CERT_PROGRAMMES.map(p => (
            <button key={p} onClick={() => setProgFilter(p)}
              className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                progFilter === p ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200")}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {CERT_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                statusFilter === s ? "bg-ink-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Hotel", "Programme", "Readiness", "Ready", "Partial", "Not Ready", "Gaps", "Owner", "Next Audit", "Status", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {visible.map((c, i) => (
              <tr key={i} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-2 pl-0 font-medium text-ink-900 whitespace-nowrap">{c.hotel}</td>
                <td className="py-3 px-2 text-ink-700">{c.programme}</td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className={cn("h-full rounded-full", c.readiness >= 80 ? "bg-good" : c.readiness >= 60 ? "bg-warn" : "bg-bad")} style={{ width: `${c.readiness}%` }} />
                    </div>
                    <span className="font-semibold tabular-nums">{c.readiness}%</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-good font-semibold tabular-nums">{c.ready}</td>
                <td className="py-3 px-2 text-warn font-semibold tabular-nums">{c.partial}</td>
                <td className="py-3 px-2 text-bad font-semibold tabular-nums">{c.notReady}</td>
                <td className="py-3 px-2">{c.gaps > 0 ? <span className="text-bad font-medium">{c.gaps}</span> : <span className="text-ink-300">—</span>}</td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap">{c.owner}</td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap">{c.nextAudit}</td>
                <td className="py-3 px-2"><span className={cn("chip text-[10px]", CERT_BADGE[c.status])}>{CERT_LABEL[c.status]}</span></td>
                <td className="py-3 px-2 pr-0">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="chip bg-brand-100 text-brand-700 text-[10px] cursor-pointer hover:bg-brand-200">View gaps</span>
                    <span className="chip bg-ink-100 text-ink-600 text-[10px] cursor-pointer hover:bg-ink-200">Evidence</span>
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

// ── Evidence Gaps ─────────────────────────────────────────────────────────────

const EVIDENCE_GROUP_OPTIONS = ["Hotel", "Programme / Report", "Evidence Type", "Owner", "Due Date"];

function EvidenceGapsTab() {
  const [groupBy, setGroupBy] = useState("Hotel");

  const blocking = EVIDENCE_GAPS.filter(e => e.priority === "Critical").length;
  const high     = EVIDENCE_GAPS.filter(e => e.priority === "High").length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1">
          <p className="text-sm text-ink-500">Evidence items that must be resolved before reports can be finalised.</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {blocking > 0 && <span className="chip bg-bad/10 text-bad">{blocking} Critical</span>}
            {high > 0     && <span className="chip bg-warn/10 text-warn">{high} High priority</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-ink-500">Group by:</span>
          <div className="flex gap-1">
            {EVIDENCE_GROUP_OPTIONS.map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className={cn("px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  groupBy === g ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200")}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Hotel", "Programme / Report", "Evidence Needed", "Area", "Priority", "Owner", "Due Date", "Status", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {EVIDENCE_GAPS.map((e, i) => (
              <tr key={i} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-2 pl-0">
                  {e.hotel !== "All properties" ? (
                    <Link to="/properties" className="font-medium text-ink-900 hover:text-brand-600 flex items-center gap-1 whitespace-nowrap">
                      {e.hotel} <ChevronRight size={11} className="opacity-0 group-hover:opacity-60" />
                    </Link>
                  ) : (
                    <span className="font-medium text-ink-900 whitespace-nowrap">{e.hotel}</span>
                  )}
                </td>
                <td className="py-3 px-2 text-ink-600 whitespace-nowrap">{e.programme}</td>
                <td className="py-3 px-2 text-ink-700 max-w-[200px]">{e.evidence}</td>
                <td className="py-3 px-2">
                  <span className={cn("text-[11px] font-semibold", PILLAR_COLOUR[e.area] ?? "text-ink-500")}>{e.area}</span>
                </td>
                <td className="py-3 px-2"><span className={cn("chip text-[10px]", PRIORITY_BADGE[e.priority])}>{e.priority}</span></td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap">{e.owner}</td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap">{e.due}</td>
                <td className="py-3 px-2"><span className={cn("chip text-[10px]", EV_STATUS_BADGE[e.status])}>{EV_STATUS_LABEL[e.status]}</span></td>
                <td className="py-3 px-2 pr-0">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="chip bg-brand-100 text-brand-700 text-[10px] cursor-pointer hover:bg-brand-200 flex items-center gap-0.5"><Upload size={9} /> Upload</span>
                    <span className="chip bg-ink-100 text-ink-600 text-[10px] cursor-pointer hover:bg-ink-200 flex items-center gap-0.5"><Mail size={9} /> Remind</span>
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

// ── Audit Calendar ────────────────────────────────────────────────────────────

type CalView = "list" | "quarter";

function AuditCalendarTab() {
  const [view, setView] = useState<CalView>("list");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Key deadlines, certification renewals, and review milestones.</p>
        <div className="flex gap-1 rounded-lg border border-ink-100 p-0.5 bg-ink-50">
          <button onClick={() => setView("list")} className={cn("px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors", view === "list" ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-800")}>
            <span className="flex items-center gap-1"><List size={12} /> List</span>
          </button>
          <button onClick={() => setView("quarter")} className={cn("px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors", view === "quarter" ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-800")}>
            <span className="flex items-center gap-1"><LayoutGrid size={12} /> Quarter</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {[["deadline","bg-bad/20","Deadline"],["action","bg-brand-100","Action Required"],["cert","bg-warn/20","Cert Renewal"]].map(([type,col,label]) => (
          <div key={type} className="flex items-center gap-1.5 text-[11px] text-ink-500">
            <div className={cn("w-2 h-2 rounded-full", col)} />
            {label}
          </div>
        ))}
      </div>

      {view === "list" && (
        <div className="grid gap-2">
          {AUDIT_EVENTS.map((e, i) => {
            const d = new Date(e.date);
            return (
              <div key={i} className="flex items-start gap-4 rounded-xl border border-ink-100 bg-white p-4 hover:shadow-sm transition-shadow">
                <div className="w-12 shrink-0 text-center">
                  <div className="text-[10px] font-semibold text-ink-400 uppercase">{d.toLocaleString("default", { month: "short" })}</div>
                  <div className="text-xl font-extrabold text-ink-900 leading-tight">{d.getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-ink-900 text-[13px]">{e.event}</span>
                    <span className={cn("chip text-[10px]", EVENT_BADGE[e.type])}>{EVENT_LABEL[e.type]}</span>
                  </div>
                  <div className="flex gap-3 mt-0.5 text-[11px] text-ink-500">
                    <span>{e.hotel}</span>
                    <span>Owner: {e.owner}</span>
                  </div>
                  <div className="text-[11px] text-ink-400 mt-0.5">{e.notes}</div>
                </div>
                <span className={cn("chip text-[10px] shrink-0", "bg-brand-100 text-brand-700")}>Upcoming</span>
              </div>
            );
          })}
        </div>
      )}

      {view === "quarter" && (
        <div className="rounded-xl border border-ink-100 p-4">
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            {["May 2025", "Jun 2025", "Jul 2025"].map(m => (
              <div key={m} className="text-[12px] font-semibold text-ink-700 border-b border-ink-100 pb-2">{m}</div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {["2025-05", "2025-06", "2025-07"].map(month => (
              <div key={month} className="space-y-1.5">
                {AUDIT_EVENTS
                  .filter(e => e.date.startsWith(month))
                  .map((e, i) => (
                    <div key={i} className={cn("rounded-lg px-2 py-1.5 text-[11px]", EVENT_BADGE[e.type])}>
                      <div className="font-semibold">{new Date(e.date).getDate()} — {e.event}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{e.hotel}</div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Report History ────────────────────────────────────────────────────────────

function ReportHistoryTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">All published and draft portfolio reports.</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]"><Plus size={14} /> New Report</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Report Name", "Framework", "Version", "Year", "Hotels", "Data Basis", "Generated By", "Date", "Evidence Pack", "Status", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {REPORT_HISTORY.map(r => (
              <tr key={r.id} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-2 pl-0 font-medium text-ink-900 max-w-[200px]">{r.name}</td>
                <td className="py-3 px-2"><span className="chip bg-ink-100 text-ink-600 text-[10px]">{r.framework}</span></td>
                <td className="py-3 px-2 text-ink-400 tabular-nums">{r.version}</td>
                <td className="py-3 px-2 text-ink-500 tabular-nums">{r.year}</td>
                <td className="py-3 px-2 text-ink-600 tabular-nums">{r.hotels}</td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap text-[11px]">{r.dataBasis}</td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap">{r.genBy}</td>
                <td className="py-3 px-2 text-ink-400 whitespace-nowrap">{r.genDate}</td>
                <td className="py-3 px-2">
                  {r.evidencePack
                    ? <span className="chip bg-good/10 text-good text-[10px]">Included</span>
                    : <span className="text-ink-300 text-[11px]">—</span>}
                </td>
                <td className="py-3 px-2">
                  <span className={cn("chip text-[10px]", r.status === "published" ? "bg-good/10 text-good" : "bg-warn/10 text-warn")}>
                    {r.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="py-3 px-2 pr-0">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700" title="Download"><Download size={12} /></button>
                    <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700" title="Preview"><Eye size={12} /></button>
                    {r.status === "draft" && (
                      <button className="p-1 rounded hover:bg-brand-50 text-ink-400 hover:text-brand-600" title="Regenerate"><RefreshCw size={12} /></button>
                    )}
                    {r.status === "published" && (
                      <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700" title="Compare versions"><ArrowRight size={12} /></button>
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
  { key: "status",        label: "Reporting Status",        icon: FileText    },
  { key: "generate",      label: "Generate Report",          icon: Download    },
  { key: "certification", label: "Certification Readiness",  icon: Award       },
  { key: "evidence",      label: "Evidence Gaps",            icon: AlertTriangle},
  { key: "calendar",      label: "Audit Calendar",           icon: Calendar    },
  { key: "history",       label: "Report History",           icon: History     },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioReports() {
  const [tab, setTab] = useState<Tab>("status");

  const blocking   = EVIDENCE_GAPS.filter(e => e.priority === "Critical").length;
  const renewSoon  = CERTIFICATIONS_DETAIL.filter(c => c.status === "renew-soon" || c.status === "at-risk").length;
  const reportBlocked = REPORTING_STATUS.filter(r => r.status === "Blocked").length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <PageHeader title="Reports & Certifications" />

      {/* Alert strip */}
      <div className="flex flex-wrap gap-3">
        {reportBlocked > 0 && (
          <button onClick={() => setTab("status")} className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/5 px-4 py-2.5 text-[12px] text-bad text-left hover:bg-bad/10 transition-colors">
            <AlertTriangle size={13} className="shrink-0" />
            <span><strong>{reportBlocked} report{reportBlocked > 1 ? "s" : ""} blocked</strong> — resolve evidence gaps to unblock.</span>
            <span className="underline font-medium ml-1">View</span>
          </button>
        )}
        {blocking > 0 && (
          <button onClick={() => setTab("evidence")} className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/5 px-4 py-2.5 text-[12px] text-bad text-left hover:bg-bad/10 transition-colors">
            <AlertTriangle size={13} className="shrink-0" />
            <span><strong>{blocking} critical evidence gaps</strong> are blocking submissions.</span>
            <span className="underline font-medium ml-1">View</span>
          </button>
        )}
        {renewSoon > 0 && (
          <button onClick={() => setTab("certification")} className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-2.5 text-[12px] text-warn text-left hover:bg-warn/10 transition-colors">
            <Clock size={13} className="shrink-0" />
            <span><strong>{renewSoon} certifications</strong> need renewal action.</span>
            <span className="underline font-medium ml-1">View</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-100 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const badge = t.key === "evidence" ? blocking : t.key === "certification" ? renewSoon : t.key === "status" ? reportBlocked : 0;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
              )}>
              <Icon size={14} />
              {t.label}
              {badge > 0 && (
                <span className={cn("chip text-[10px] ml-1", t.key === "status" ? "bg-bad/15 text-bad" : t.key === "evidence" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn")}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

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
