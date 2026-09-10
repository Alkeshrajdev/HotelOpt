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
import StatTile from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { CERTIFICATIONS } from "@/lib/mock";

const PROGRAMME_SHORT: Record<string, string> = { GHG: "GHG", "GREEN-KEY": "Green Key", "GREEN-GLOBE": "Green Globe", "LEED-OM": "LEED O+M" };
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
  { id: "green-globe", name: "Green Globe",   shortName: "GG",   level: "Certified",              expiry: "2026-09-30", renewalGapDays: 150, evidencePct: 88, status: "active",   body: "Energy, water, waste and GHG criteria on track. Wastewater and hazardous-substance evidence still outstanding for the renewal audit." },
  { id: "leed",        name: "LEED O+M",      shortName: "LEED", level: "Silver",                 expiry: "2026-12-01", renewalGapDays: 212, evidencePct: 72, status: "active",   body: "ENERGY STAR score needs three more months above 75 to hold Silver. Water and purchasing credits are complete." },
  { id: "greenkey",    name: "Green Key",     shortName: "GK",   level: "Awarded",                expiry: "2026-08-01", renewalGapDays: 119, evidencePct: 81, status: "active",   body: "Energy and waste criteria complete; water flow-rate measurements and recycling evidence due before renewal." },
  { id: "ghg",         name: "GHG Inventory", shortName: "GHG",  level: "Verified · ISO 14064-3", expiry: "2026-06-15", renewalGapDays: 43,  evidencePct: 94, status: "expiring", body: "Scope 1 and 2 verified for FY 2025. Scope 3 screening and 18 supplier emission factors are the open items for the FY 2026 verification." },
];


/* ---------- Evidence checklist data ---------- */

type ChecklistItem = { doc: string; status: DocStatus; required: boolean };

const EVIDENCE_CHECKLIST: Record<string, ChecklistItem[]> = {
  "green-globe": [
    { doc: "Energy management plan",                 status: "uploaded", required: true  },
    { doc: "Water management plan",                  status: "uploaded", required: true  },
    { doc: "Waste diversion report",                 status: "uploaded", required: true  },
    { doc: "GHG inventory — Scope 1 + 2",            status: "uploaded", required: true  },
    { doc: "Chemicals & hazardous substances register", status: "pending", required: true },
    { doc: "Wastewater treatment records",           status: "missing",  required: true  },
  ],
  "leed": [
    { doc: "ENERGY STAR Portfolio Manager score",    status: "uploaded", required: true  },
    { doc: "Water efficiency data",                  status: "uploaded", required: true  },
    { doc: "Waste stream audit",                     status: "pending",  required: true  },
    { doc: "Purchasing log — ongoing consumables",   status: "uploaded", required: true  },
    { doc: "Site assessment report",                 status: "pending",  required: true  },
    { doc: "IAQ monitoring log",                     status: "missing",  required: false },
  ],
  "greenkey": [
    { doc: "Application form",                       status: "uploaded", required: true  },
    { doc: "Energy bill — 12 months",                status: "uploaded", required: true  },
    { doc: "Water flow-rate measurements",           status: "pending",  required: true  },
    { doc: "Recycling evidence",                     status: "pending",  required: true  },
    { doc: "Photo evidence — green measures",        status: "uploaded", required: true  },
  ],
  "ghg": [
    { doc: "Organisational boundary statement",      status: "uploaded", required: true  },
    { doc: "Scope 1 fuel & refrigerant logs",        status: "uploaded", required: true  },
    { doc: "Scope 2 invoices + RECs",                status: "uploaded", required: true  },
    { doc: "Scope 3 screening workbook",             status: "pending",  required: true  },
    { doc: "Emission factor register export",        status: "uploaded", required: true  },
    { doc: "Verifier data request responses",        status: "missing",  required: true  },
  ],
};


/* ---------- Renewal timeline data ---------- */

// Each cert occupies a horizontal band. renewalStart / renewalEnd are month offsets (0=Jan 2026, 11=Dec 2026).
const TIMELINE_CERTS = [
  { id: "green-globe", label: "Green Globe",   renewalStart: 7, renewalEnd: 9,  status: "active"   as CertStatus },
  { id: "leed",        label: "LEED O+M",      renewalStart: 9, renewalEnd: 12, status: "active"   as CertStatus },
  { id: "greenkey",    label: "Green Key",     renewalStart: 6, renewalEnd: 8,  status: "active"   as CertStatus },
  { id: "ghg",         label: "GHG Inventory", renewalStart: 4, renewalEnd: 6,  status: "expiring" as CertStatus },
];


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan"];

/* ---------- Gap analysis data ---------- */

type GapItem = { indicator: string; pillar: string; status: GapStatus; blocker: string; link: string };

const GAP_ANALYSIS: Record<string, GapItem[]> = {
  "green-globe": [
    { indicator: "Waste generated — Q4 data",        pillar: "Waste",  status: "partial",   blocker: "3 properties missing Q4 data",          link: "/review-approval" },
    { indicator: "Wastewater discharge volumes",     pillar: "Water",  status: "not-ready", blocker: "Treatment plant meter not connected",    link: "/data-capture" },
    { indicator: "Hazardous substances register",    pillar: "Waste",  status: "partial",   blocker: "2 properties missing SDS files",         link: "/data-capture" },
  ],
  "leed": [
    { indicator: "ENERGY STAR score",                pillar: "Energy", status: "partial",   blocker: "Score below 75 — need 3 more months",    link: "/review-approval" },
    { indicator: "IAQ monitoring",                   pillar: "Energy", status: "not-ready", blocker: "Sensor data not connected",              link: "/data-capture" },
  ],
  "ghg": [
    { indicator: "Scope 3 Cat 1 supplier factors",   pillar: "Carbon", status: "partial",   blocker: "18 suppliers still on default factors",  link: "/supplier-portal" },
    { indicator: "Refrigerant leak log",             pillar: "Carbon", status: "partial",   blocker: "2 HVAC units without leak checks",       link: "/data-capture" },
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
  GHG: [
    { code: "E1", title: "Organisational boundary",          requirement: "Operational-control boundary statement + site list",        status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Sustainability Manager" },
    { code: "E2", title: "Scope 1 — fuels",                  requirement: "Fuel stock accounting per tank + generator logs",           status: "ready",     evidenceRequired: 3, evidenceUploaded: 3, owner: "Engineering Lead" },
    { code: "E3", title: "Scope 1 — refrigerants",           requirement: "Leak-check log + top-up records per HVAC unit",             status: "partial",   evidenceRequired: 2, evidenceUploaded: 1, owner: "Engineering Lead", dueDate: "2026-06-30", note: "2 HVAC units without leak checks." },
    { code: "E4", title: "Scope 2 — location-based",         requirement: "12 months of utility invoices + grid factor version",       status: "ready",     evidenceRequired: 2, evidenceUploaded: 2, owner: "Property SM" },
    { code: "E5", title: "Scope 2 — market-based",           requirement: "RECs / PPAs matched to the consumption period",             status: "ready",     evidenceRequired: 2, evidenceUploaded: 2, owner: "Property SM" },
    { code: "E6", title: "Scope 3 screening",                requirement: "Cat 1, 4 and 6 workbook with method per category",         status: "partial",   evidenceRequired: 3, evidenceUploaded: 1, owner: "Sustainability Manager", dueDate: "2026-07-15", note: "18 suppliers still on default factors." },
    { code: "E7", title: "Emission factor register",         requirement: "Versioned EF library export, factors locked for the period", status: "ready",    evidenceRequired: 1, evidenceUploaded: 1, owner: "Sustainability Manager" },
    { code: "E8", title: "Verification evidence",            requirement: "Verifier data requests answered, sampling trail exported",  status: "not-ready", evidenceRequired: 2, evidenceUploaded: 0, owner: "Sustainability Manager", dueDate: "2026-06-10", note: "Verifier kick-off scheduled 2026-06-01." },
  ],
  "GREEN-KEY": [
    { code: "3.1", title: "Water flow rates",                requirement: "Taps ≤ 8 L/min, showers ≤ 9 L/min — measured",             status: "partial",   evidenceRequired: 2, evidenceUploaded: 1, owner: "Engineering Lead", dueDate: "2026-06-30" },
    { code: "3.4", title: "Leak detection",                  requirement: "Monthly meter checks + leak log",                            status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Engineering Lead" },
    { code: "5.1", title: "Energy metering",                 requirement: "Monthly electricity & gas readings, 12 months",              status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Property SM" },
    { code: "5.6", title: "Lighting efficiency",             requirement: "≥ 75% LED / low-energy lamps, inventory",                    status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Engineering Lead" },
    { code: "6.1", title: "Waste separation",                requirement: "Separation at source for ≥ 4 streams, photo evidence",       status: "ready",     evidenceRequired: 2, evidenceUploaded: 2, owner: "Operations Lead" },
    { code: "6.4", title: "Single-use plastics",             requirement: "Reduction plan + inventory of eliminated items",             status: "partial",   evidenceRequired: 1, evidenceUploaded: 0, owner: "F&B Manager", dueDate: "2026-07-01" },
    { code: "8.2", title: "Eco-labelled products",           requirement: "Purchasing records for eco-labelled cleaning & paper products", status: "ready",  evidenceRequired: 1, evidenceUploaded: 1, owner: "Procurement" },
  ],
  "GREEN-GLOBE": [
    { code: "D1", title: "Energy consumption",               requirement: "Monthly consumption + reduction target + plan",             status: "ready",     evidenceRequired: 3, evidenceUploaded: 3, owner: "Property SM" },
    { code: "D2", title: "Water conservation",               requirement: "Consumption, sources, efficiency measures",                  status: "ready",     evidenceRequired: 3, evidenceUploaded: 3, owner: "Engineering Lead" },
    { code: "D3", title: "Waste management",                 requirement: "Diversion rate + contractor certificates",                   status: "partial",   evidenceRequired: 2, evidenceUploaded: 1, owner: "Operations Lead", dueDate: "2026-06-15", note: "Contractor waste-diversion certificates outstanding." },
    { code: "D4", title: "GHG emissions",                    requirement: "Scope 1 + 2 inventory + reduction plan",                     status: "ready",     evidenceRequired: 4, evidenceUploaded: 4, owner: "Sustainability Manager" },
    { code: "D5", title: "Wastewater",                       requirement: "Treatment method + discharge volumes",                        status: "not-ready", evidenceRequired: 2, evidenceUploaded: 0, owner: "Engineering Lead", dueDate: "2026-07-31", note: "Treatment plant meter not connected." },
    { code: "D6", title: "Harmful substances",               requirement: "Chemicals register, SDS on file, storage checks",            status: "partial",   evidenceRequired: 2, evidenceUploaded: 1, owner: "Operations Lead", dueDate: "2026-06-30" },
    { code: "D7", title: "Environmentally preferable purchasing", requirement: "Purchasing records for certified products",             status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Procurement" },
  ],
  "LEED-OM": [
    { code: "EA p2", title: "Minimum energy performance",    requirement: "ENERGY STAR score ≥ 75 on 12 months of data",                status: "partial",   evidenceRequired: 1, evidenceUploaded: 0, owner: "Engineering Lead", dueDate: "2026-09-01", note: "Score below 75 — need 3 more months." },
    { code: "EA c2", title: "Renewable energy",              requirement: "RECs / on-site generation matched to the period",             status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Property SM" },
    { code: "WE p1", title: "Indoor water use",              requirement: "Fixture flow rates + 12 months consumption",                  status: "ready",     evidenceRequired: 2, evidenceUploaded: 2, owner: "Engineering Lead" },
    { code: "WE c1", title: "Water metering",                requirement: "Sub-meters for cooling, irrigation, laundry",                 status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Engineering Lead" },
    { code: "MR p1", title: "Ongoing purchasing",            requirement: "Purchasing log — ongoing consumables",                        status: "ready",     evidenceRequired: 1, evidenceUploaded: 1, owner: "Procurement" },
    { code: "MR c1", title: "Solid waste management",        requirement: "Waste stream audit + diversion rate",                         status: "partial",   evidenceRequired: 2, evidenceUploaded: 1, owner: "Operations Lead", dueDate: "2026-08-15" },
    { code: "EQ p1", title: "Indoor air quality",            requirement: "IAQ monitoring log — CO₂, PM2.5",                             status: "not-ready", evidenceRequired: 1, evidenceUploaded: 0, owner: "Engineering Lead", dueDate: "2026-07-31", note: "Sensor data not connected." },
  ],
};


const DOSSIER_VERSIONS = [
  { v: "v3.2", date: "2026-04-22", note: "Added Scope 3 supplier EF evidence", by: "Demo Admin" },
  { v: "v3.1", date: "2026-03-08", note: "Annual energy & water data refresh", by: "Demo SM" },
  { v: "v3.0", date: "2025-11-12", note: "Re-certification submission",        by: "Demo SM" },
];

const OLD_STATUS_TONE: Record<OldStatus, "good" | "warn" | "bad" | "neutral"> = {
  ready: "good", partial: "warn", "not-ready": "bad", "n/a": "neutral",
};

/* ================================================================== */
export default function Certifications() {
  const [propertyId, setPropertyId]       = useState(PROPERTIES[0].id);
  const [programme, setProgramme]          = useState<string>("GHG");
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
        title="Certifications"
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
        <CardHeader title="Certification portfolio" />
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
                <div className="w-8 h-8 rounded-full bg-brand-50 grid place-items-center text-brand-700 text-[10px] font-bold shrink-0">
                  {c.shortName}
                </div>
                <Badge tone={CERT_STATUS_TONE[c.status]} className="text-[10px]">
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
                      <Link
                        to={g.link}
                        className="btn-ghost h-6 px-2 text-[10px] text-brand-700 flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        <Link2 size={10} /> Fix
                      </Link>
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
                <Badge tone={CERT_STATUS_TONE[tc.status]} className="text-[10px] w-16 justify-center shrink-0">
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
                setProgramme(p.certifications[0] ?? "GHG");
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
                  {PROGRAMME_SHORT[c.code] ?? c.code}
                  {enrolled && !active && <span className="ml-1.5 text-[10px] text-good">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Programme-level summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={cert?.code ?? programme} value={`${summary.readyPct}% ready`} hint={cert?.name ?? ""} tone="brand" />
        <StatTile label="Ready"     value={String(summary.ready)}   hint={`of ${summary.total} criteria`} tone="good" />
        <StatTile label="Partial"   value={String(summary.partial)} hint="awaiting evidence"              tone="warn" />
        <StatTile label="Not ready" value={String(summary.gap)}     hint="needs action"                   tone="bad" />
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
            <table className="w-full min-w-[720px]">
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
                          <span className="w-10 shrink-0 rounded-md bg-ink-50 grid place-items-center text-xs font-bold text-ink-700 py-1">{PROGRAMME_SHORT[c.code] ?? c.code}</span>
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
            <EvidenceRow name="Scope 3 supplier EF declarations — 2026-Q2.pdf" type="Carbon" uploaded="2026-04-22" />
            <EvidenceRow name="Energy management plan v4.docx"                  type="Energy"         uploaded="2026-03-08" />
            <EvidenceRow name="Water flow-rate measurements.xlsx"                  type="Water"       uploaded="2026-02-12" />
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
                <div className="w-9 h-9 rounded-full bg-brand-50 grid place-items-center text-brand-700 shrink-0">
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
    programmes: ["GHG Inventory", "LEED O+M", "Green Globe"],
    criteria: ["GHG E5 — Scope 2 market-based", "LEED EA c2 — renewable energy"],
    status: "Available",
  },
  {
    certType: "EAC", period: "Q1 2026", volume: "320 MWh",
    programmes: ["GHG Inventory", "Green Globe"],
    criteria: ["GHG E5 — Scope 2 market-based (partial)"],
    status: "Available",
  },
  {
    certType: "VCS", period: "FY 2025", volume: "38 tCO₂e",
    programmes: ["GHG Inventory", "Green Globe"],
    criteria: ["GHG E2 — residual Scope 1 offset", "Green Globe D4 — GHG emissions"],
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
        hint="I-REC / EAC and carbon credit retirements can satisfy energy and emissions criteria across the GHG inventory, LEED, Green Globe and Green Key."
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
          <div className="text-[12px] text-ink-500">38 tCO₂e · used for GHG E2 & Green Globe D4</div>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-ink-100">
        <table className="w-full min-w-[720px]">
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
