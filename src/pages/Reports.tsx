import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  Award,
  Bell,
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Leaf,
  Link2,
  Mail,
  Plus,
  Share2,
  Sparkles,
  Sun,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import GenerateReportModal from "@/components/reports/GenerateReportModal";
import { RECENT_REPORTS, REPORTS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type IntensityMode = "absolute" | "per-room" | "per-m2";
type DisclosureStatus = "draft" | "published" | "submitted";

const REPORT_TYPES = [
  {
    id: "ghg",
    label: "GHG Inventory",
    icon: <Leaf size={20} />,
    framework: "GHG Protocol",
    desc: "Scope 1, 2 & 3 emissions by source across the portfolio.",
    tone: "good" as const,
    badge: "Mapped",
  },
  {
    id: "esg",
    label: "ESG Report",
    icon: <Globe size={20} />,
    framework: "GRI Standards",
    desc: "Environmental, social and governance disclosure for investors.",
    tone: "good" as const,
    badge: "Mapped",
  },
  {
    id: "water",
    label: "Water Stewardship",
    icon: <BarChart2 size={20} />,
    framework: "GRI 303",
    desc: "Consumption, intensity, stress-area risk and reduction targets.",
    tone: "good" as const,
    badge: "Mapped",
  },
  {
    id: "gri",
    label: "GRI Index",
    icon: <Link2 size={20} />,
    framework: "GRI 2021",
    desc: "Full content index table mapping every indicator to a disclosure.",
    tone: "good" as const,
    badge: "Mapped",
  },
  {
    id: "carbon",
    label: "Carbon Reduction Plan",
    icon: <Zap size={20} />,
    framework: "SBTi / TCFD",
    desc: "Net-zero pathway, milestones, abatement actions and progress.",
    tone: "warn" as const,
    badge: "Draft",
  },
  {
    id: "custom",
    label: "Custom Report",
    icon: <FileText size={20} />,
    framework: "Internal / bespoke",
    desc: "Pick your own pillars, sections and formatting.",
    tone: "info" as const,
    badge: "Flexible",
  },
];

const DISCLOSURE_LOG: {
  id: string;
  type: string;
  period: string;
  generatedBy: string;
  generatedAt: string;
  status: DisclosureStatus;
  version: string;
}[] = [
  { id: "d-1", type: "GHG Inventory",         period: "FY 2025",           generatedBy: "A. Smits",   generatedAt: "2026-04-30", status: "submitted",  version: "v3.0" },
  { id: "d-2", type: "ESG Report",             period: "May 2025–Apr 2026", generatedBy: "J. Park",    generatedAt: "2026-04-28", status: "published",  version: "v2.1" },
  { id: "d-3", type: "Water Stewardship",      period: "Q1 2026",           generatedBy: "F. Setiawan",generatedAt: "2026-04-15", status: "draft",      version: "v1.0" },
  { id: "d-4", type: "GRI Index",              period: "FY 2024",           generatedBy: "A. Smits",   generatedAt: "2025-12-10", status: "published",  version: "v1.2" },
  { id: "d-5", type: "Carbon Reduction Plan",  period: "2026–2030",         generatedBy: "J. Park",    generatedAt: "2026-03-01", status: "draft",      version: "v0.9" },
];

const GRI_TCFD_INDICATORS = [
  { ref: "GRI 302-1", name: "Energy consumption",        pillar: "Energy",     completeness: 96, framework: "GRI" },
  { ref: "GRI 303-3", name: "Water withdrawal",          pillar: "Water",      completeness: 84, framework: "GRI" },
  { ref: "GRI 305-1", name: "Direct GHG (Scope 1)",      pillar: "Carbon",     completeness: 92, framework: "GHG" },
  { ref: "GRI 305-2", name: "Energy indirect GHG (Sc.2)",pillar: "Carbon",     completeness: 88, framework: "GHG" },
  { ref: "GRI 305-3", name: "Other indirect GHG (Sc.3)", pillar: "Carbon",     completeness: 61, framework: "GHG" },
  { ref: "GRI 306-3", name: "Waste generated",           pillar: "Waste",      completeness: 71, framework: "GRI" },
  { ref: "GRI 401-1", name: "New hires & turnover",      pillar: "Social",     completeness: 88, framework: "GRI" },
  { ref: "GRI 403-9", name: "Work-related injuries",     pillar: "Social",     completeness: 95, framework: "GRI" },
  { ref: "TCFD E1",   name: "Climate risk / transition", pillar: "Governance", completeness: 72, framework: "TCFD" },
  { ref: "TCFD E2",   name: "Physical climate risk",     pillar: "Governance", completeness: 65, framework: "TCFD" },
];

const INTENSITY_LABELS: Record<IntensityMode, string> = {
  absolute:  "Absolute totals",
  "per-room": "Per room night",
  "per-m2":  "Per m² GFA",
};

const SCHEDULES = [
  { id: "s-1", name: "GHG Inventory — quarterly",  framework: "GHG Protocol", cadence: "Quarterly", next: "01 Jul 2026", recipients: 4 },
  { id: "s-2", name: "GRESB submission package",   framework: "GRESB",        cadence: "Annual",    next: "31 Mar 2027", recipients: 6 },
  { id: "s-3", name: "Internal management report", framework: "Internal",     cadence: "Monthly",   next: "01 Jun 2026", recipients: 12 },
];

const STATUS_TONE: Record<DisclosureStatus, "good" | "warn" | "info"> = {
  submitted: "good",
  published: "info",
  draft:     "warn",
};

export default function Reports() {
  const [genOpen, setGenOpen]         = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [intensityMode, setIntensityMode] = useState<IntensityMode>("absolute");
  const [mappingOpen, setMappingOpen] = useState(true);

  const nextMode = (m: IntensityMode): IntensityMode =>
    m === "absolute" ? "per-room" : m === "per-room" ? "per-m2" : "absolute";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Disclosure & assurance"
        title="Reports & Disclosure"
        subtitle="5 of 7 frameworks are ready to export. 2 have blocking issues — resolve data gaps before your next disclosure deadline. AI drafts reports; sustainability managers review and finalise before any export."
        actions={
          <>
            <Link to="/certifications" className="btn-secondary"><Award size={14} /> Certifications</Link>
            <button className="btn-secondary"><Filter size={14} /> Filters</button>
            <button className="btn-primary" onClick={() => setGenOpen(true)}>
              <Plus size={14} /> Generate report
            </button>
          </>
        }
      />

      {/* Report type cards */}
      <Card>
        <CardHeader
          title="Report types"
          hint="Select a type to pre-configure the Generate modal, or click Generate report above for full control."
        />
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              onClick={() => { setSelectedType(rt.id === selectedType ? null : rt.id); setGenOpen(true); }}
              className={cn(
                "rounded-xl border p-4 text-left transition-all hover:shadow-card hover:-translate-y-0.5",
                selectedType === rt.id
                  ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50"
                  : "border-ink-200 bg-white"
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center text-brand-700 mb-2">
                {rt.icon}
              </div>
              <div className="text-sm font-bold text-ink-900 leading-tight">{rt.label}</div>
              <div className="text-[10px] text-ink-500 mt-0.5 mb-2">{rt.framework}</div>
              <p className="text-[11px] text-ink-600 leading-snug hidden xl:block">{rt.desc}</p>
              <div className="mt-2">
                <Badge tone={rt.tone}>{rt.badge}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* RE&O Certificate evidence panel */}
      <CertificateEvidencePanel />

      {/* Main 2-column: frameworks + GRI/TCFD sidebar */}
      <div className="grid grid-cols-12 gap-4">
        {/* Frameworks table with intensity toggle */}
        <Card className={cn("col-span-12", mappingOpen ? "lg:col-span-7" : "lg:col-span-12")}>
          <CardHeader
            title="Framework coverage"
            hint="GRI · GHG Protocol · SBTi · HCMI · Green Globe · CSRD/ESRS · GRESB · CDP"
            right={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-500">Intensity:</span>
                <button
                  onClick={() => setIntensityMode(nextMode(intensityMode))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
                >
                  {intensityMode === "absolute"
                    ? <ToggleLeft size={13} className="text-ink-400" />
                    : <ToggleRight size={13} className="text-brand-700" />}
                  {INTENSITY_LABELS[intensityMode]}
                </button>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Framework</th>
                  <th className="table-th">Version</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Coverage {intensityMode !== "absolute" && `(${INTENSITY_LABELS[intensityMode]})`}</th>
                  <th className="table-th text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {REPORTS.map((r) => (
                  <tr key={r.framework} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium text-ink-900">{r.framework}</td>
                    <td className="table-td">{r.version}</td>
                    <td className="table-td">
                      <Badge tone={r.status === "Mapped" ? "good" : "warn"}>{r.status}</Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-28"><ProgressBar value={r.coverage} /></div>
                        <span className="font-semibold w-10 text-right tabular-nums">{r.coverage}%</span>
                      </div>
                    </td>
                    <td className="table-td text-right pr-6">
                      <button
                        className="btn-ghost h-7 px-2 text-[12px] text-brand-700"
                        onClick={() => setGenOpen(true)}
                      >
                        Generate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* GRI/TCFD mapping sidebar */}
        {mappingOpen && (
          <Card className="col-span-12 lg:col-span-5">
            <CardHeader
              title="GRI / TCFD indicator mapping"
              hint="Traffic-light completeness per disclosure indicator."
              right={
                <button
                  onClick={() => setMappingOpen(false)}
                  className="text-[11px] text-ink-400 hover:text-ink-700 flex items-center gap-1"
                >
                  Hide <ChevronRight size={12} />
                </button>
              }
            />
            <div className="p-4 space-y-1.5">
              {GRI_TCFD_INDICATORS.map((ind) => {
                const tone = ind.completeness >= 90 ? "good" : ind.completeness >= 70 ? "warn" : "bad";
                const color = tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad";
                return (
                  <div key={ind.ref} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 hover:bg-ink-50">
                    <span className="w-16 text-[10px] font-mono font-semibold text-ink-500 shrink-0">{ind.ref}</span>
                    <span className="flex-1 text-[11px] text-ink-800 truncate">{ind.name}</span>
                    <div className="w-16 h-1.5 rounded-full bg-ink-100 overflow-hidden shrink-0">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${ind.completeness}%` }} />
                    </div>
                    <span className={cn(
                      "w-8 text-right text-[11px] font-semibold tabular-nums shrink-0",
                      tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-bad"
                    )}>
                      {ind.completeness}%
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="px-4 pb-3 text-[11px] text-ink-400 flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-good inline-block" />≥90%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn inline-block" />70–89%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bad inline-block" />&lt;70%</span>
            </div>
          </Card>
        )}

        {/* Show mapping toggle when hidden */}
        {!mappingOpen && (
          <div className="col-span-12 lg:col-span-12 flex justify-end">
            <button
              onClick={() => setMappingOpen(true)}
              className="btn-secondary text-[12px]"
            >
              <ChevronDown size={13} /> Show GRI/TCFD mapping
            </button>
          </div>
        )}
      </div>

      {/* Disclosure log */}
      <Card>
        <CardHeader
          title="Disclosure log"
          hint="All generated reports — versioned and provenance-signed."
          right={
            <div className="flex items-center gap-2">
              <button className="btn-secondary"><Filter size={13} /> Filter</button>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Report type</th>
                <th className="table-th">Period</th>
                <th className="table-th">Version</th>
                <th className="table-th">Generated by</th>
                <th className="table-th">Date</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {DISCLOSURE_LOG.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-brand-700 shrink-0" />
                      <span className="font-medium text-ink-900">{r.type}</span>
                    </div>
                  </td>
                  <td className="table-td text-ink-600">{r.period}</td>
                  <td className="table-td">
                    <Badge tone="info">{r.version}</Badge>
                  </td>
                  <td className="table-td text-ink-600">{r.generatedBy}</td>
                  <td className="table-td text-ink-600">{r.generatedAt}</td>
                  <td className="table-td">
                    <Badge tone={STATUS_TONE[r.status]} className="capitalize">{r.status}</Badge>
                  </td>
                  <td className="table-td text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost h-7 px-2 text-[12px]" title="Download">
                        <Download size={13} />
                      </button>
                      <button className="btn-ghost h-7 px-2 text-[12px]" title="Share">
                        <Share2 size={13} />
                      </button>
                      <button className="btn-ghost h-7 px-2 text-[12px] text-ink-400" title="Archive">
                        <Archive size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent reports + version history */}
      <Card>
        <CardHeader title="Recent reports" hint="Versioned · provenance-signed" />
        <ul className="p-5 space-y-3">
          {RECENT_REPORTS.map((r, i) => (
            <li key={r.name} className="flex items-start gap-3 rounded-xl border border-ink-200 p-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink-900">{r.name}</div>
                <div className="text-[11px] text-ink-500">
                  {r.type} · {r.owner} · {r.date} · v{i + 2}.0
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="good">Provenance signed</Badge>
                  <Badge tone="info">{i === 0 ? "Latest" : `v${i + 2}.0`}</Badge>
                </div>
              </div>
              <button className="btn-ghost h-8 px-2"><Download size={14} /></button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Scheduled delivery */}
      <Card>
        <CardHeader
          title="Scheduled delivery"
          hint="Auto-regenerate and email recurring reports."
          right={<button className="btn-secondary"><Plus size={14} /> New schedule</button>}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Name</th>
                <th className="table-th">Framework</th>
                <th className="table-th">Cadence</th>
                <th className="table-th">Next run</th>
                <th className="table-th">Recipients</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULES.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">
                    <div className="flex items-center gap-2">
                      <Bell size={13} className="text-brand-700" /> {s.name}
                    </div>
                  </td>
                  <td className="table-td">{s.framework}</td>
                  <td className="table-td">
                    <Badge tone="info">
                      <Calendar size={11} /> {s.cadence}
                    </Badge>
                  </td>
                  <td className="table-td">{s.next}</td>
                  <td className="table-td">
                    <span className="inline-flex items-center gap-1 text-[12px]">
                      <Mail size={12} className="text-ink-400" /> {s.recipients}
                    </span>
                  </td>
                  <td className="table-td text-right pr-6">
                    <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700">Edit</button>
                    <button className="btn-ghost h-7 px-2 text-[12px] text-bad">Pause</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Sparkles size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">
          <strong>Framework outputs:</strong> the platform maps verified data to the relevant disclosure points and produces a draft response. Sustainability managers review and finalise — AI never commits without approval.
        </div>
      </div>

      <GenerateReportModal open={genOpen} onClose={() => setGenOpen(false)} />
    </div>
  );
}

/* ---------- RE&O Certificate Evidence Panel ---------- */

type CertRow = {
  id: string;
  type: "I-REC" | "EAC" | "VCS" | "Gold Standard";
  period: string;
  mwhOrTco2e: number;
  unit: "MWh" | "tCO₂e";
  coverage: string;
  status: "Active" | "Retired" | "Pending";
  serialRange: string;
  claimText: string;
  evidenceRef: string;
};

const CERT_ROWS: CertRow[] = [
  {
    id: "c1", type: "I-REC", period: "Jan–Dec 2025",
    mwhOrTco2e: 1_240, unit: "MWh",
    coverage: "142 tCO₂e market-based Scope 2 offset",
    status: "Active",
    serialRange: "I-REC-AP-2025-001 — 012",
    claimText: "Skyline Dubai: 100% renewable electricity (market-based), Jan–Dec 2025",
    evidenceRef: "GHG Inventory FY 2025 · Scope 2 MB",
  },
  {
    id: "c2", type: "EAC", period: "Q1 2026",
    mwhOrTco2e: 320, unit: "MWh",
    coverage: "37 tCO₂e market-based Scope 2 offset",
    status: "Active",
    serialRange: "EAC-EU-2026-Q1-001 — 004",
    claimText: "The Pavilion London: renewable electricity (EAC), Q1 2026",
    evidenceRef: "GHG Inventory FY 2026 · Scope 2 MB (partial)",
  },
  {
    id: "c3", type: "VCS", period: "FY 2025",
    mwhOrTco2e: 38, unit: "tCO₂e",
    coverage: "Residual Scope 1 — refrigerant & generator offsets",
    status: "Retired",
    serialRange: "VCS-2025-VCU-00482 — 00519",
    claimText: "Portfolio residual Scope 1 offset · FY 2025",
    evidenceRef: "Carbon Reduction Plan 2025",
  },
];

const STATUS_TONE_CERT: Record<CertRow["status"], "good" | "info" | "warn"> = {
  Active: "good",
  Retired: "info",
  Pending: "warn",
};

function CertificateEvidencePanel() {
  const [expanded, setExpanded] = useState(false);

  const scope2MWh = CERT_ROWS.filter((c) => ["I-REC","EAC"].includes(c.type) && c.status !== "Pending")
    .reduce((s, c) => s + c.mwhOrTco2e, 0);
  const scope2Tco2e = CERT_ROWS.filter((c) => ["I-REC","EAC"].includes(c.type) && c.status !== "Pending")
    .reduce((s, c) => s + (c.unit === "MWh" ? Math.round(c.mwhOrTco2e * 0.1145) : c.mwhOrTco2e), 0);
  const creditsTco2e = CERT_ROWS.filter((c) => ["VCS","Gold Standard"].includes(c.type) && c.status !== "Pending")
    .reduce((s, c) => s + (c.unit === "tCO₂e" ? c.mwhOrTco2e : 0), 0);

  return (
    <Card>
      <CardHeader
        title="Renewable Energy & Carbon Credit certificates"
        hint="Summary of certificates feeding GHG Inventory exports (market-based Scope 2 + residual Scope 1 offsets). The full register is managed in Certifications."
        right={
          <div className="flex items-center gap-2">
            <Link to="/marketplace" className="btn-ghost h-7 px-2 text-[11px] text-brand-700 flex items-center gap-1">
              Manage in Solutions Hub <ExternalLink size={11} />
            </Link>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="btn-ghost h-7 px-2 text-[11px]"
            >
              {expanded ? "Collapse" : "Expand"} <ChevronDown size={12} className={cn("transition-transform", expanded && "rotate-180")} />
            </button>
          </div>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-px bg-ink-100 border-t border-ink-100">
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sun size={14} className="text-warn" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Market-based Scope 2</span>
          </div>
          <div className="text-2xl font-bold text-ink-900">{scope2MWh.toLocaleString()} MWh</div>
          <div className="text-[12px] text-ink-500">≈ {scope2Tco2e} tCO₂e offset via I-REC / EAC</div>
        </div>
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Leaf size={14} className="text-good" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Carbon credits retired</span>
          </div>
          <div className="text-2xl font-bold text-ink-900">{creditsTco2e} tCO₂e</div>
          <div className="text-[12px] text-ink-500">Residual Scope 1 · VCS retired FY 2025</div>
        </div>
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-brand-700" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Certificates on file</span>
          </div>
          <div className="text-2xl font-bold text-ink-900">{CERT_ROWS.length}</div>
          <div className="text-[12px] text-ink-500">{CERT_ROWS.filter((c) => c.status === "Active").length} active · {CERT_ROWS.filter((c) => c.status === "Retired").length} retired</div>
        </div>
      </div>

      {/* Detail table (expandable) */}
      {expanded && (
        <div className="overflow-x-auto border-t border-ink-100">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Type</th>
                <th className="table-th">Period</th>
                <th className="table-th">Volume</th>
                <th className="table-th">Disclosure coverage</th>
                <th className="table-th">Serial range</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right pr-6">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {CERT_ROWS.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/60">
                  <td className="table-td">
                    <Badge tone={c.type === "I-REC" || c.type === "EAC" ? "warn" : "good"}>{c.type}</Badge>
                  </td>
                  <td className="table-td text-ink-600">{c.period}</td>
                  <td className="table-td font-semibold text-ink-900 tabular-nums">
                    {c.mwhOrTco2e.toLocaleString()} {c.unit}
                  </td>
                  <td className="table-td text-[12px] text-ink-600">{c.coverage}</td>
                  <td className="table-td font-mono text-[10px] text-ink-500">{c.serialRange}</td>
                  <td className="table-td">
                    <Badge tone={STATUS_TONE_CERT[c.status]}>{c.status}</Badge>
                  </td>
                  <td className="table-td text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[11px] text-ink-500">{c.evidenceRef}</span>
                      <button className="btn-ghost h-6 px-1" title="Download certificate"><Download size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-ink-100 rounded-b-xl bg-ink-50 text-[11px] text-ink-500 flex items-start gap-2">
            <Zap size={12} className="text-brand-700 mt-0.5 shrink-0" />
            I-REC / EAC certificates automatically populate the <strong>market-based (MB) Scope 2</strong> row in all GHG Inventory and CSRD E1 exports. Retired carbon credits appear in the <strong>residual emissions offset</strong> section of the Carbon Reduction Plan.
          </div>
        </div>
      )}
    </Card>
  );
}
