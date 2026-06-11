import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  History,
  Leaf,
  Link2,
  ShieldCheck,
  Sun,
  Upload,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { CERTIFICATIONS } from "@/lib/mock";
import { PROPERTIES } from "@/lib/propertiesData";
import { cn } from "@/lib/utils";

type CertStatus = "active" | "expiring" | "lapsed" | "not-enrolled";
type DocStatus  = "uploaded" | "missing" | "pending";
type GapStatus  = "ready" | "partial" | "not-ready" | "n/a";

/* ---------- Certification cards data ---------- */

type CertCard = {
  id: string;
  name: string;
  shortName: string;
  level: string;
  expiry: string;
  renewalGapDays: number;
  evidencePct: number;
  status: CertStatus;
  body: string;
};

const CERT_CARDS: CertCard[] = [
  { id: "green-globe",   name: "Green Globe",        shortName: "GG",    level: "Certified",      expiry: "2026-09-30", renewalGapDays: 150, evidencePct: 88, status: "active",       body: "Green Globe International" },
  { id: "leed",          name: "LEED O+M",            shortName: "LEED",  level: "Silver",         expiry: "2026-12-01", renewalGapDays: 212, evidencePct: 72, status: "active",       body: "USGBC" },
  { id: "iso-14001",     name: "ISO 14001",           shortName: "ISO",   level: "Certified",      expiry: "2026-06-15", renewalGapDays:  43, evidencePct: 94, status: "expiring",     body: "BSI Group" },
  { id: "earthcheck",    name: "EarthCheck",          shortName: "EC",    level: "Benchmarked",    expiry: "2027-01-31", renewalGapDays: 273, evidencePct: 61, status: "active",       body: "EarthCheck Pty" },
  { id: "breeam",        name: "BREEAM In-Use",       shortName: "BREEAM",level: "Very Good",      expiry: "2025-12-31", renewalGapDays:   0, evidencePct: 40, status: "lapsed",       body: "BRE Global" },
  { id: "greenkey",      name: "Green Key",           shortName: "GK",    level: "Awarded",        expiry: "2026-08-01", renewalGapDays: 119, evidencePct: 81, status: "active",       body: "FEE" },
  { id: "custom",        name: "Custom / Internal",   shortName: "INT",   level: "—",              expiry: "—",          renewalGapDays:   0, evidencePct: 0,  status: "not-enrolled", body: "Internal" },
];

/* ---------- Evidence checklist data ---------- */

type ChecklistItem = { doc: string; status: DocStatus; required: boolean };

const EVIDENCE_CHECKLIST: Record<string, ChecklistItem[]> = {
  "green-globe": [
    { doc: "Sustainability policy",            status: "uploaded", required: true  },
    { doc: "Energy management plan",           status: "uploaded", required: true  },
    { doc: "Water management plan",            status: "uploaded", required: true  },
    { doc: "Waste diversion report",           status: "uploaded", required: true  },
    { doc: "Staff training records",           status: "pending",  required: true  },
    { doc: "Community engagement summary",     status: "missing",  required: true  },
    { doc: "Supplier attestations (≥3)",       status: "missing",  required: true  },
  ],
  "iso-14001": [
    { doc: "Environmental aspects register",   status: "uploaded", required: true  },
    { doc: "Legal compliance register",        status: "uploaded", required: true  },
    { doc: "Internal audit report",            status: "uploaded", required: true  },
    { doc: "Management review minutes",        status: "pending",  required: true  },
    { doc: "Corrective action log",            status: "uploaded", required: true  },
  ],
  "leed": [
    { doc: "Energy star portfolio manager",    status: "uploaded", required: true  },
    { doc: "Water efficiency data",            status: "uploaded", required: true  },
    { doc: "IAQ monitoring log",               status: "missing",  required: false },
    { doc: "Green cleaning policy",            status: "uploaded", required: true  },
    { doc: "Site assessment report",           status: "pending",  required: true  },
  ],
  "earthcheck": [
    { doc: "Benchmarking submission file",     status: "missing",  required: true  },
    { doc: "12-month consumption data",        status: "uploaded", required: true  },
    { doc: "Staff headcount data",             status: "uploaded", required: true  },
    { doc: "Occupancy data",                   status: "uploaded", required: true  },
  ],
  "greenkey": [
    { doc: "Application form",                 status: "uploaded", required: true  },
    { doc: "Photo evidence — green measures",  status: "uploaded", required: true  },
    { doc: "Guest communication materials",    status: "uploaded", required: true  },
    { doc: "Recycling evidence",               status: "pending",  required: true  },
    { doc: "Energy bill — 12 months",          status: "uploaded", required: true  },
  ],
  "breeam": [
    { doc: "Asset data sheet",                 status: "missing",  required: true  },
    { doc: "Licensed BREEAM assessor report",  status: "missing",  required: true  },
    { doc: "Energy performance certificate",   status: "missing",  required: true  },
  ],
};

/* ---------- Renewal timeline data ---------- */

// Each cert occupies a horizontal band. renewalStart / renewalEnd are month offsets (0=Jan 2026, 11=Dec 2026).
const TIMELINE_CERTS = [
  { id: "green-globe", label: "Green Globe", renewalStart: 7, renewalEnd: 9,  status: "active"   as CertStatus },
  { id: "leed",        label: "LEED O+M",    renewalStart: 9, renewalEnd: 12, status: "active"   as CertStatus },
  { id: "iso-14001",   label: "ISO 14001",   renewalStart: 4, renewalEnd: 6,  status: "expiring" as CertStatus },
  { id: "earthcheck",  label: "EarthCheck",  renewalStart: 11,renewalEnd: 13, status: "active"   as CertStatus },
  { id: "greenkey",    label: "Green Key",   renewalStart: 6, renewalEnd: 8,  status: "active"   as CertStatus },
  { id: "breeam",      label: "BREEAM",      renewalStart: 0, renewalEnd: 2,  status: "lapsed"   as CertStatus },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan"];

/* ---------- Gap analysis data ---------- */

type GapItem = { indicator: string; pillar: string; status: GapStatus; blocker: string; link: string };

const GAP_ANALYSIS: Record<string, GapItem[]> = {
  "green-globe": [
    { indicator: "GRI 306-3 Waste generated",       pillar: "Waste",      status: "partial",    blocker: "3 properties missing Q4 data",        link: "/review-approval" },
    { indicator: "GRI 401-1 Staff turnover",         pillar: "Social",     status: "not-ready",  blocker: "Social records not submitted",         link: "/data-capture" },
    { indicator: "Supplier local sourcing %",        pillar: "Social",     status: "partial",    blocker: "2 supplier attestations outstanding",  link: "/supplier-portal" },
  ],
  "iso-14001": [
    { indicator: "Legal compliance review",          pillar: "Governance", status: "partial",    blocker: "Annual review overdue by 14 days",     link: "/review-approval" },
    { indicator: "Internal audit report",            pillar: "Governance", status: "partial",    blocker: "Audit scheduled for 2026-06-10",       link: "/review-approval" },
  ],
  "leed": [
    { indicator: "Energy Star score",                pillar: "Energy",     status: "partial",    blocker: "Score below 75 — need 3 more months",  link: "/review-approval" },
    { indicator: "IAQ monitoring",                   pillar: "Social",     status: "not-ready",  blocker: "Sensor data not connected",            link: "/data-capture" },
  ],
};

/* ---------- Status helpers ---------- */

const CERT_STATUS_TONE: Record<CertStatus, "good" | "warn" | "bad" | "neutral"> = {
  active:        "good",
  expiring:      "warn",
  lapsed:        "bad",
  "not-enrolled":"neutral",
};

const CERT_STATUS_LABEL: Record<CertStatus, string> = {
  active:         "Active",
  expiring:       "Expiring soon",
  lapsed:         "Lapsed",
  "not-enrolled": "Not enrolled",
};

const DOC_ICON: Record<DocStatus, React.ReactNode> = {
  uploaded: <CheckCircle2 size={13} className="text-good shrink-0" />,
  pending:  <AlertTriangle size={13} className="text-warn shrink-0" />,
  missing:  <XCircle size={13} className="text-bad shrink-0" />,
};

const GAP_TONE: Record<GapStatus, "good" | "warn" | "bad" | "neutral"> = {
  ready: "good", partial: "warn", "not-ready": "bad", "n/a": "neutral",
};

const TIMELINE_COLOR: Record<CertStatus, string> = {
  active:         "bg-good/70",
  expiring:       "bg-warn/70",
  lapsed:         "bg-bad/70",
  "not-enrolled": "bg-ink-200",
};

/* ---------- Existing data ---------- */

type OldStatus = "ready" | "partial" | "not-ready" | "n/a";
type Criterion = {
  code: string; title: string; requirement: string; status: OldStatus;
  evidenceRequired: number; evidenceUploaded: number; owner: string;
  dueDate?: string; link?: string; note?: string;
};

const CRITERIA_BY_PROGRAMME: Record<string, Criterion[]> = {
  GSTC: [
    { code: "A1", title: "Sustainability management system",    requirement: "Documented SMS with policies, objectives, KPIs", status: "ready",     evidenceRequired: 3, evidenceUploaded: 3, owner: "Property SM" },
    { code: "A2", title: "Legal compliance",                    requirement: "Annual legal compliance review",                  status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Compliance Officer" },
    { code: "B6", title: "Local sourcing — F&B and amenities",  requirement: "% local sourcing + supplier attestations",        status: "partial",   evidenceRequired: 5, evidenceUploaded: 3, owner: "F&B Manager", dueDate: "2026-06-15", link: "/supplier-portal", note: "Need 2 more supplier attestations." },
    { code: "B7", title: "Cultural & heritage protection",      requirement: "Cultural awareness training + community policies",status: "ready",     evidenceRequired: 2, evidenceUploaded: 2, owner: "HR Lead" },
    { code: "C1", title: "Community engagement programme",      requirement: "Programme description + impact data",             status: "not-ready", evidenceRequired: 4, evidenceUploaded: 1, owner: "Property SM", dueDate: "2026-07-01", note: "Programme description required." },
    { code: "D2", title: "Energy management plan",              requirement: "Energy plan + 12 months data",                   status: "ready",     evidenceRequired: 3, evidenceUploaded: 3, owner: "Engineering Lead" },
    { code: "D7", title: "Water management plan",               requirement: "Water plan + leak detection",                    status: "partial",   evidenceRequired: 3, evidenceUploaded: 2, owner: "Engineering Lead", dueDate: "2026-06-30" },
    { code: "D9", title: "Waste reduction & circular practices",requirement: "Waste plan + diversion rate",                    status: "ready",     evidenceRequired: 2, evidenceUploaded: 2, owner: "Operations Lead" },
    { code: "E1", title: "Greenhouse gas emissions",            requirement: "Scope 1+2 inventory + reduction plan",           status: "ready",     evidenceRequired: 4, evidenceUploaded: 4, owner: "Property SM" },
    { code: "E5", title: "Emissions evidence",                  requirement: "EF library + supplier-specific EFs",             status: "partial",   evidenceRequired: 5, evidenceUploaded: 3, owner: "Sustainability Manager", dueDate: "2026-07-15" },
  ],
  HSB: [
    { code: "1.1", title: "Energy benchmarking",   requirement: "kWh per room night, tracked monthly",  status: "ready",   evidenceRequired: 1, evidenceUploaded: 1, owner: "Property SM" },
    { code: "1.2", title: "Energy reduction plan", requirement: "Documented plan",           status: "ready",   evidenceRequired: 1, evidenceUploaded: 1, owner: "Property SM" },
    { code: "2.1", title: "Water benchmarking",    requirement: "m³ per room night, tracked monthly",   status: "ready",   evidenceRequired: 1, evidenceUploaded: 1, owner: "Property SM" },
    { code: "3.1", title: "Waste streams",         requirement: "All streams tracked",       status: "partial", evidenceRequired: 1, evidenceUploaded: 0, owner: "Operations", dueDate: "2026-06-01" },
    { code: "4.1", title: "Single-use plastics",   requirement: "Reduction policy",          status: "ready",   evidenceRequired: 1, evidenceUploaded: 1, owner: "F&B Manager" },
  ],
  "GREEN-KEY": [], "GREEN-GLOBE": [], "LEED-OM": [], TRAVELIFE: [], "EU-ECO": [],
};

const DOSSIER_VERSIONS = [
  { v: "v3.2", date: "2026-04-22", note: "Added supplier attestations for B6", by: "Demo Admin" },
  { v: "v3.1", date: "2026-03-08", note: "Annual SMS update",                  by: "Demo SM" },
  { v: "v3.0", date: "2025-11-12", note: "Re-certification submission",        by: "Demo SM" },
];

const OLD_STATUS_TONE: Record<OldStatus, "good" | "warn" | "bad" | "neutral"> = {
  ready: "good", partial: "warn", "not-ready": "bad", "n/a": "neutral",
};

/* ================================================================== */
export default function Certifications() {
  const [propertyId, setPropertyId]       = useState(PROPERTIES[0].id);
  const [programme, setProgramme]          = useState<string>("GSTC");
  const [selectedCard, setSelectedCard]    = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen]  = useState(false);

  const property = PROPERTIES.find((p) => p.id === propertyId)!;
  const enrolledProgrammes = property.certifications;
  const cert     = CERTIFICATIONS.find((c) => c.code === programme);
  const criteria = CRITERIA_BY_PROGRAMME[programme] ?? [];

  const summary = useMemo(() => {
    const ready   = criteria.filter((c) => c.status === "ready").length;
    const partial = criteria.filter((c) => c.status === "partial").length;
    const gap     = criteria.filter((c) => c.status === "not-ready").length;
    const total   = criteria.length || 1;
    return { ready, partial, gap, total, readyPct: Math.round((ready / total) * 100) };
  }, [criteria]);

  const checklist  = selectedCard ? (EVIDENCE_CHECKLIST[selectedCard] ?? []) : [];
  const gapItems   = selectedCard ? (GAP_ANALYSIS[selectedCard] ?? []) : [];
  const activeCert = selectedCard ? CERT_CARDS.find((c) => c.id === selectedCard) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Certification readiness"
        title="Certifications & Compliance"
        subtitle="Your next audit is in 45 days. Upload missing evidence and close criteria gaps across active programmes before the deadline. Green Globe evidence pack is 12% short."
        actions={
          <>
            <Link to="/reports" className="btn-secondary"><FileText size={14} /> Reports</Link>
            <button className="btn-secondary"><Upload size={14} /> Upload evidence</button>
            <button className="btn-primary"><FileText size={14} /> Generate dossier</button>
          </>
        }
      />

      {/* ── Certification cards ── */}
      <Card>
        <CardHeader
          title="Certification portfolio"
          hint="Click a card to open the evidence checklist and gap analysis."
        />
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
          {CERT_CARDS.map((c) => (
            <div
              key={c.id}
              onClick={() => { setSelectedCard(c.id === selectedCard ? null : c.id); setChecklistOpen(true); }}
              className={cn(
                "rounded-xl border p-3 cursor-pointer transition-all hover:shadow-card hover:-translate-y-0.5",
                selectedCard === c.id
                  ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50"
                  : c.status === "lapsed"
                    ? "border-bad/30 bg-bad/5"
                    : c.status === "expiring"
                      ? "border-warn/40 bg-warn/5"
                      : c.status === "not-enrolled"
                        ? "border-ink-200 bg-ink-50/50 opacity-60"
                        : "border-ink-200 bg-white"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center text-brand-700 text-[10px] font-bold shrink-0">
                  {c.shortName}
                </div>
                <Badge tone={CERT_STATUS_TONE[c.status]} className="text-[9px]">
                  {CERT_STATUS_LABEL[c.status]}
                </Badge>
              </div>
              <div className="text-[12px] font-bold text-ink-900 leading-tight">{c.name}</div>
              <div className="text-[10px] text-ink-500 mt-0.5">{c.level}</div>
              {c.status !== "not-enrolled" && (
                <>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-ink-500 mb-0.5">
                      <span>Evidence</span><span>{c.evidencePct}%</span>
                    </div>
                    <ProgressBar
                      value={c.evidencePct}
                      tone={c.evidencePct >= 90 ? "good" : c.evidencePct >= 60 ? "warn" : "bad"}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-ink-500">
                    Expires <span className={cn("font-semibold", c.status === "expiring" ? "text-warn" : c.status === "lapsed" ? "text-bad" : "text-ink-700")}>{c.expiry}</span>
                  </div>
                  {c.renewalGapDays > 0 && (
                    <div className="text-[10px] text-ink-400">{c.renewalGapDays}d to renewal</div>
                  )}
                  <button
                    className="mt-2 w-full btn-ghost h-6 text-[10px] text-brand-700 flex items-center justify-center gap-1"
                    onClick={(e) => { e.stopPropagation(); alert(`Exporting audit pack for ${c.name}…`); }}
                  >
                    <Download size={10} /> Export audit pack
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── RE&O certificate evidence for certification criteria ── */}
      <CertCertificatePanel />

      {/* ── Evidence checklist + Gap analysis (shown when a card is selected) ── */}
      {checklistOpen && selectedCard && activeCert && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title={`Evidence checklist — ${activeCert.name}`}
              hint="Required documents for renewal. Upload missing items."
              right={
                <button onClick={() => { setChecklistOpen(false); setSelectedCard(null); }} className="text-ink-400 hover:text-ink-700">
                  <X size={14} />
                </button>
              }
            />
            <ul className="px-4 pb-4 space-y-1.5">
              {checklist.map((item, i) => (
                <li key={i} className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  item.status === "uploaded" ? "border-good/20 bg-good/5"
                    : item.status === "missing" ? "border-bad/20 bg-bad/5"
                      : "border-warn/20 bg-warn/5"
                )}>
                  {DOC_ICON[item.status]}
                  <span className="flex-1 text-[12px] text-ink-800">{item.doc}</span>
                  {!item.required && <span className="text-[10px] text-ink-400">optional</span>}
                  {item.status !== "uploaded" && (
                    <button className="btn-ghost h-6 px-2 text-[10px] text-brand-700 flex items-center gap-1 shrink-0">
                      <Upload size={10} /> Upload
                    </button>
                  )}
                </li>
              ))}
              {checklist.length === 0 && (
                <li className="text-sm text-ink-500 py-4 text-center">No checklist defined for this certification yet.</li>
              )}
            </ul>
            <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-ink-500">
              <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-good" /> Uploaded</span>
              <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-warn" /> Pending</span>
              <span className="flex items-center gap-1"><XCircle size={11} className="text-bad" /> Missing</span>
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title={`Gap analysis — ${activeCert.name}`}
              hint="Outstanding data requirements blocking renewal."
            />
            {gapItems.length === 0 ? (
              <div className="p-6 flex items-center gap-2 text-good text-sm">
                <CheckCircle2 size={16} /> No outstanding gaps — renewal ready.
              </div>
            ) : (
              <ul className="px-4 pb-4 space-y-2">
                {gapItems.map((g, i) => (
                  <li key={i} className="rounded-lg border border-ink-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone={GAP_TONE[g.status]} className="text-[10px]">{g.status}</Badge>
                          <span className="text-[12px] font-semibold text-ink-800">{g.indicator}</span>
                        </div>
                        <div className="text-[11px] text-ink-500 mt-1">{g.blocker}</div>
                      </div>
                      <a
                        href={g.link}
                        onClick={(e) => e.preventDefault()}
                        className="btn-ghost h-6 px-2 text-[10px] text-brand-700 flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        <Link2 size={10} /> Fix
                      </a>
                    </div>
                    <div className="text-[10px] text-ink-400 mt-1">Pillar: {g.pillar}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* ── Renewal timeline ── */}
      <Card>
        <CardHeader
          title="Renewal timeline — 2026"
          hint="Colour-coded renewal windows across the year. Red = lapsed, amber = expiring within 60 days."
        />
        <div className="p-5 overflow-x-auto">
          {/* Month header */}
          <div className="flex text-[10px] text-ink-400 font-medium mb-2 ml-24">
            {MONTHS.slice(0, 12).map((m, i) => (
              <div key={i} className="flex-1 text-center">{m}</div>
            ))}
          </div>
          {/* Cert rows */}
          <div className="space-y-2">
            {TIMELINE_CERTS.map((tc) => (
              <div key={tc.id} className="flex items-center gap-2">
                <div className="w-24 shrink-0 text-[11px] font-medium text-ink-700 truncate">{tc.label}</div>
                <div className="flex-1 relative h-6 bg-ink-100 rounded-full overflow-hidden">
                  {/* Renewal window bar */}
                  <div
                    className={cn("absolute top-0 h-full rounded-full opacity-80", TIMELINE_COLOR[tc.status])}
                    style={{
                      left: `${(tc.renewalStart / 12) * 100}%`,
                      width: `${Math.min(((tc.renewalEnd - tc.renewalStart) / 12) * 100, 100 - (tc.renewalStart / 12) * 100)}%`,
                    }}
                  />
                  {/* Today marker */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-brand-700 opacity-70"
                    style={{ left: `${(4 / 12) * 100}%` }}
                    title="Today (May 2026)"
                  />
                </div>
                <Badge tone={CERT_STATUS_TONE[tc.status]} className="text-[9px] w-16 justify-center shrink-0">
                  {CERT_STATUS_LABEL[tc.status]}
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-good/70 inline-block" /> Active</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-warn/70 inline-block" /> Expiring</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-bad/70 inline-block" /> Lapsed</span>
            <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-brand-700 inline-block" /> Today</span>
          </div>
        </div>
      </Card>

      {/* ── Property + programme picker ── */}
      <Card className="card-pad">
        <div className="flex flex-wrap items-center gap-3">
          <label className="block">
            <span className="text-[11px] font-medium text-ink-500">Property</span>
            <select
              className="input mt-0.5 min-w-[260px]"
              value={propertyId}
              onChange={(e) => {
                const p = PROPERTIES.find((x) => x.id === e.target.value)!;
                setPropertyId(p.id);
                setProgramme(p.certifications[0] ?? "GSTC");
              }}
            >
              {PROPERTIES.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.country}</option>
              ))}
            </select>
          </label>
          <span className="h-9 w-px bg-ink-200 mx-1" />
          <div className="flex-1 flex flex-wrap gap-2">
            {CERTIFICATIONS.map((c) => {
              const enrolled = enrolledProgrammes.includes(c.code as any);
              const active   = programme === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setProgramme(c.code)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    active
                      ? "border-brand-700 bg-brand-700 text-white"
                      : enrolled
                        ? "border-ink-200 bg-white hover:bg-ink-50 text-ink-700"
                        : "border-ink-200 bg-ink-50/50 text-ink-400"
                  )}
                >
                  {c.code}
                  {enrolled && !active && <span className="ml-1.5 text-[10px] text-good">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Programme-level summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label={cert?.code ?? programme} value={`${summary.readyPct}% ready`} hint={cert?.name ?? ""} tone="brand" />
        <SummaryTile label="Ready"     value={String(summary.ready)}   hint={`of ${summary.total} criteria`} tone="good" />
        <SummaryTile label="Partial"   value={String(summary.partial)} hint="awaiting evidence"              tone="warn" />
        <SummaryTile label="Not ready" value={String(summary.gap)}     hint="needs action"                   tone="bad" />
      </div>

      {/* Criterion table */}
      <Card>
        <CardHeader
          title={`Criteria — ${property.name} · ${programme}`}
          hint={`${criteria.length} criteria · evidence-ready assessment`}
        />
        {criteria.length === 0 ? (
          <div className="p-6 text-sm text-ink-500">
            This programme is not yet enrolled for this property. Pick another programme above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Criterion</th>
                  <th className="table-th">Requirement</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Evidence</th>
                  <th className="table-th">Owner</th>
                  <th className="table-th">Due</th>
                  <th className="table-th text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => {
                  const evPct = Math.round((c.evidenceUploaded / c.evidenceRequired) * 100);
                  return (
                    <tr key={c.code} className="hover:bg-ink-50/60">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <span className="w-10 shrink-0 rounded-md bg-ink-50 grid place-items-center text-xs font-bold text-ink-700 py-1">{c.code}</span>
                          <div className="font-medium text-ink-900 truncate">{c.title}</div>
                        </div>
                      </td>
                      <td className="table-td max-w-md">
                        <div className="text-ink-700">{c.requirement}</div>
                        {c.note && <div className="text-[11px] text-warn mt-0.5">{c.note}</div>}
                      </td>
                      <td className="table-td">
                        <Badge tone={OLD_STATUS_TONE[c.status]}>
                          {c.status === "ready" && <ShieldCheck size={11} />}
                          {c.status === "ready" ? "Ready" : c.status === "partial" ? "Partial" : c.status === "not-ready" ? "Not ready" : "N/A"}
                        </Badge>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <div className="w-20"><ProgressBar value={evPct} tone={evPct === 100 ? "good" : evPct >= 50 ? "warn" : "bad"} /></div>
                          <span className="text-[12px] text-ink-700 tabular-nums">{c.evidenceUploaded} / {c.evidenceRequired}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className="inline-flex items-center gap-1 text-[12px] text-ink-700">
                          <UserCheck size={12} className="text-ink-400" /> {c.owner}
                        </span>
                      </td>
                      <td className="table-td">
                        {c.dueDate
                          ? <span className="text-[12px] text-ink-700">{c.dueDate}</span>
                          : <span className="text-[12px] text-ink-400">—</span>}
                      </td>
                      <td className="table-td text-right pr-6">
                        {c.status !== "ready" ? (
                          <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700"><Upload size={12} /> Upload</button>
                        ) : (
                          <button className="btn-ghost h-7 px-2 text-[12px] text-ink-700"><Eye size={12} /> View</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Evidence library + dossier history */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader
            title="Evidence library"
            hint="All uploaded files for this property + programme"
            right={<button className="btn-secondary"><Upload size={14} /> Upload evidence</button>}
          />
          <ul className="p-6 space-y-2 text-sm">
            <EvidenceRow name="GSTC-B6 supplier attestations.pdf"              type="Local sourcing" uploaded="2026-04-22" />
            <EvidenceRow name="Energy management plan v4.docx"                  type="Energy"         uploaded="2026-03-08" />
            <EvidenceRow name="Photo evidence — local market partnerships.zip"  type="Cultural"       uploaded="2026-02-12" />
            <EvidenceRow name="EF library export — 2026-Q2.xlsx"                type="Carbon"         uploaded="2026-04-15" />
          </ul>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader
            title="Dossier version history"
            hint="Generate dossier creates a versioned audit-ready package"
            right={<button className="btn-primary h-8 px-3 text-[12px]"><FileText size={12} /> Export pack</button>}
          />
          <ul className="p-6 space-y-2 text-sm">
            {DOSSIER_VERSIONS.map((d) => (
              <li key={d.v} className="flex items-start gap-3 rounded-xl border border-ink-200 p-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                  <History size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink-900">{d.v}</div>
                  <div className="text-[11px] text-ink-500">{d.date} · {d.by}</div>
                  <div className="text-[12px] text-ink-700 mt-0.5">{d.note}</div>
                </div>
                <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700"><Folder size={12} /> Open</button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Award size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">
          <strong>Auditor view:</strong> third-party verifiers see this workspace as read-only, including the criterion table, evidence library, dossier version history, and the maker–checker audit trail behind every uploaded file.
          <button className="ml-2 underline font-semibold inline-flex items-center gap-1">
            Open auditor view <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- RE&O certificate evidence for certification criteria ---------- */

type CertEvidenceRow = {
  certType: "I-REC" | "EAC" | "VCS" | "Gold Standard";
  period: string;
  volume: string;
  programmes: string[];
  criteria: string[];
  status: "Available" | "Used" | "Pending";
};

const CERT_EVIDENCE_ROWS: CertEvidenceRow[] = [
  {
    certType: "I-REC", period: "Jan–Dec 2025", volume: "1,240 MWh",
    programmes: ["GSTC", "LEED O+M", "Green Globe"],
    criteria: ["GSTC E1 — GHG inventory (Scope 2 MB)", "LEED EA — renewable energy credit"],
    status: "Available",
  },
  {
    certType: "EAC", period: "Q1 2026", volume: "320 MWh",
    programmes: ["GSTC", "Green Globe"],
    criteria: ["GSTC E1 — GHG inventory (Scope 2 MB partial)"],
    status: "Available",
  },
  {
    certType: "VCS", period: "FY 2025", volume: "38 tCO₂e",
    programmes: ["GSTC", "EarthCheck"],
    criteria: ["GSTC E5 — emissions evidence (residual Scope 1 offset)"],
    status: "Used",
  },
];

const STATUS_TONE_CE: Record<CertEvidenceRow["status"], "good" | "info" | "warn"> = {
  Available: "good",
  Used: "info",
  Pending: "warn",
};

function CertCertificatePanel() {
  return (
    <Card>
      <CardHeader
        title="Renewable Energy & Carbon Credit certificates available as evidence"
        hint="I-REC / EAC and carbon credit retirements can satisfy energy and emissions criteria across GSTC, LEED, Green Globe, and EarthCheck."
        right={
          <Link to="/marketplace" className="btn-ghost h-7 px-2 text-[11px] text-brand-700 flex items-center gap-1">
            Get more in Solutions Hub <ExternalLink size={11} />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-px bg-ink-100 border-t border-ink-100">
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sun size={14} className="text-warn" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">I-REC / EAC certificates</span>
          </div>
          <div className="text-2xl font-bold text-ink-900">2</div>
          <div className="text-[12px] text-ink-500">1,560 MWh · available as Scope 2 MB evidence</div>
        </div>
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Leaf size={14} className="text-good" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Carbon credit retirements</span>
          </div>
          <div className="text-2xl font-bold text-ink-900">1</div>
          <div className="text-[12px] text-ink-500">38 tCO₂e · used for GSTC E5 & EarthCheck</div>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-ink-100">
        <table className="min-w-full">
          <thead>
            <tr className="bg-ink-50">
              <th className="table-th">Type</th>
              <th className="table-th">Period</th>
              <th className="table-th">Volume</th>
              <th className="table-th">Applicable programmes</th>
              <th className="table-th">Criteria satisfied</th>
              <th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {CERT_EVIDENCE_ROWS.map((row, i) => (
              <tr key={i} className="hover:bg-ink-50/60">
                <td className="table-td">
                  <Badge tone={row.certType === "I-REC" || row.certType === "EAC" ? "warn" : "good"}>{row.certType}</Badge>
                </td>
                <td className="table-td text-ink-600">{row.period}</td>
                <td className="table-td font-semibold text-ink-900 tabular-nums">{row.volume}</td>
                <td className="table-td">
                  <div className="flex flex-wrap gap-1">
                    {row.programmes.map((p) => (
                      <Badge key={p} tone="neutral" className="text-[10px]">{p}</Badge>
                    ))}
                  </div>
                </td>
                <td className="table-td max-w-xs">
                  <ul className="space-y-0.5">
                    {row.criteria.map((c) => (
                      <li key={c} className="text-[11px] text-ink-600">{c}</li>
                    ))}
                  </ul>
                </td>
                <td className="table-td">
                  <Badge tone={STATUS_TONE_CE[row.status]}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-ink-100 bg-ink-50 rounded-b-xl text-[11px] text-ink-500 flex items-start gap-1.5">
          <ShieldCheck size={12} className="text-brand-700 mt-0.5 shrink-0" />
          Certificates are automatically attached to the relevant evidence library when uploading a certification dossier. Auditors can verify serial numbers and registry records directly.
        </div>
      </div>
    </Card>
  );
}

/* ---------- helpers ---------- */

function SummaryTile({ label, value, hint, tone }: {
  label: string; value: string; hint?: string; tone: "brand" | "good" | "warn" | "bad";
}) {
  const ring = { brand: "border-brand-200 bg-brand-50/40", good: "border-good/25 bg-good/10", warn: "border-warn/25 bg-warn/10", bad: "border-bad/25 bg-bad/10" }[tone];
  return (
    <div className={cn("rounded-xl border p-4", ring)}>
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</div>
      <div className="text-2xl font-bold text-ink-900 mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}

function EvidenceRow({ name, type, uploaded }: { name: string; type: string; uploaded: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-ink-200 p-3">
      <FileText size={14} className="text-brand-700 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-ink-900 truncate">{name}</div>
        <div className="text-[11px] text-ink-500">{type} · uploaded {uploaded}</div>
      </div>
      <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700"><Eye size={12} /> Preview</button>
    </li>
  );
}
