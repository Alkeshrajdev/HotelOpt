// Rich mock dataset for the Review & Approval queue.
// Designed to exercise every BRD requirement the live Supabase records do not
// yet carry (anomaly flags, AI confidence, OCR field-level confidence,
// supplier submissions, query rounds, due / SLA, audit trail).

export type Pillar = "energy" | "water" | "waste" | "carbon" | "social" | "governance";
export type Method = "manual" | "ocr" | "bulk" | "qr" | "api" | "supplier";
export type Status =
  | "draft"
  | "submitted"
  | "queried"
  | "resubmitted"
  | "approved"
  | "rejected"
  | "locked";

export type Role = "maker" | "checker" | "property_sm" | "auditor" | "supplier" | "super_admin";

export type AnomalyFlag = {
  key:
    | "spike"
    | "drop"
    | "range"
    | "unit"
    | "ocr-low"
    | "ai-low"
    | "duplicate"
    | "double-count"
    | "tier-regression"
    | "missing-evidence";
  label: string;
  hint?: string;
  severity: "warn" | "bad";
};

export type OcrField = {
  key: string;
  label: string;
  extracted: string;
  edited?: string;
  confidence: number;
};

export type AiSuggestion = {
  field: string;
  suggestion: string;
  confidence: number;
  accepted?: boolean;
};

export type EvidenceFile = {
  name: string;
  size: string;
  type: "PDF" | "PNG" | "JPG" | "XLSX" | "CSV";
};

export type QueryRound = {
  round: number;
  raisedBy: string;
  raisedAt: string;
  message: string;
  /** Maker's response to this round. Empty until they respond. */
  response?: { by: string; at: string; message: string };
  /** Checker marks the round resolved. */
  resolved?: boolean;
};

export type AuditEntry = {
  at: string;
  actor: string;
  actorRole: Role;
  action:
    | "draft-saved"
    | "submitted"
    | "queried"
    | "resubmitted"
    | "approved"
    | "rejected"
    | "locked"
    | "edit"
    | "comment-added"
    | "evidence-uploaded";
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
};

export type Comment = {
  id: string;
  author: string;
  role: Role;
  at: string;
  message: string;
};

export type ReviewRecord = {
  id: string;
  property: string;
  region: string;
  pillar: Pillar;
  dataType: string;        // e.g. "Energy bill", "Procurement Cat 1", "Refrigerant log"
  method: Method;
  source: string;          // e.g. "Electricity — grid"
  period: string;          // e.g. "Apr 2026"
  value: string;           // e.g. "412,580 kWh"
  cost?: string;
  meterId?: string;
  invoiceRef?: string;
  /** Submitter info — maker, supplier, or system. */
  submittedBy: string;
  submittedByRole: Role;
  submittedAt: string;
  status: Status;
  dueAt: string;           // ISO
  /** Days past dueAt — pre-computed for the demo. */
  overdueDays?: number;
  flags: AnomalyFlag[];
  ocrFields?: OcrField[];
  aiSuggestions?: AiSuggestion[];
  evidence: EvidenceFile[];
  queryRounds: QueryRound[];
  comments: Comment[];
  audit: AuditEntry[];
  /** True if this record was supplier-submitted (FR-2.9 / FR-15). */
  supplierSubmitted?: boolean;
  supplierName?: string;
  supplierLink?: string;
  /** Approved records are locked — corrections need a revision request. */
  locked?: boolean;
  /** Computed priority used by the queue sort. */
  priority?: number;
};

/* ============================================================== */
/* Sample records covering every workflow state                   */
/* ============================================================== */

export const RECORDS: ReviewRecord[] = [
  // 1) Overdue + anomaly spike + low-confidence OCR — top of queue.
  {
    id: "R-1042",
    property: "Greenview Resort",
    region: "APAC",
    pillar: "energy",
    dataType: "Energy bill",
    method: "ocr",
    source: "Electricity — grid",
    period: "Apr 2026",
    value: "412,580 kWh",
    cost: "USD 64,920",
    meterId: "ELEC-MAIN-01",
    invoiceRef: "INV-2026-04-918",
    submittedBy: "F. Setiawan",
    submittedByRole: "maker",
    submittedAt: "2026-04-29 09:14",
    status: "submitted",
    dueAt: "2026-05-02 17:00",
    overdueDays: 3,
    flags: [
      { key: "spike",   severity: "warn", label: "Spike — 28% above same period last year", hint: "Apr 2025 was 322,300 kWh." },
      { key: "ocr-low", severity: "warn", label: "OCR low confidence", hint: "Meter ID 62%, Cost 71%" },
    ],
    ocrFields: [
      { key: "vendor",       label: "Vendor",         extracted: "EmiratesGreen Power Co.", confidence: 97 },
      { key: "account",      label: "Account number", extracted: "84-220-915-A",            confidence: 94 },
      { key: "billingPeriod", label: "Billing period", extracted: "01–31 Apr 2026",          confidence: 92 },
      { key: "consumption",  label: "Consumption",    extracted: "412,580 kWh",             confidence: 88 },
      { key: "cost",         label: "Cost",           extracted: "USD 64,920", edited: "USD 64,920", confidence: 71 },
      { key: "meterId",      label: "Meter ID",       extracted: "ELEC-MAIN-O1", edited: "ELEC-MAIN-01", confidence: 62 },
    ],
    aiSuggestions: [
      { field: "Scope category", suggestion: "Scope 2 (location-based)", confidence: 94, accepted: true },
    ],
    evidence: [
      { name: "utility-bill-apr2026.pdf", size: "412 KB", type: "PDF" },
    ],
    queryRounds: [],
    comments: [
      { id: "c1", author: "F. Setiawan", role: "maker", at: "2026-04-29 09:14",
        message: "F&B refurbishment opened mid-month — chillers ran 24/7 for commissioning." },
    ],
    audit: [
      { at: "2026-04-29 09:12", actor: "F. Setiawan",  actorRole: "maker", action: "draft-saved",      note: "Manual edit of two low-confidence OCR fields" },
      { at: "2026-04-29 09:13", actor: "F. Setiawan",  actorRole: "maker", action: "edit",             field: "meterId", oldValue: "ELEC-MAIN-O1", newValue: "ELEC-MAIN-01" },
      { at: "2026-04-29 09:14", actor: "F. Setiawan",  actorRole: "maker", action: "submitted",        note: "Submitted for review" },
    ],
  },

  // 2) Anomaly drop, queried in round 1 awaiting maker response.
  {
    id: "R-1041",
    property: "City Centre Hotel",
    region: "EMEA",
    pillar: "water",
    dataType: "Water bill",
    method: "manual",
    source: "Municipal",
    period: "Apr 2026",
    value: "1,840 m³",
    cost: "DKK 18,360",
    meterId: "WATER-01",
    submittedBy: "P. Lund",
    submittedByRole: "maker",
    submittedAt: "2026-04-28 14:02",
    status: "queried",
    dueAt: "2026-05-04 17:00",
    flags: [
      { key: "drop", severity: "warn", label: "Drop — 35% below same period last year", hint: "Apr 2025 was 2,810 m³." },
    ],
    evidence: [{ name: "water-utility-apr2026.pdf", size: "256 KB", type: "PDF" }],
    queryRounds: [
      {
        round: 1,
        raisedBy: "Demo Checker",
        raisedAt: "2026-04-29 11:30",
        message: "Drop is unusually large — was the laundry outsourced this period? Please confirm with attached evidence.",
      },
    ],
    comments: [],
    audit: [
      { at: "2026-04-28 14:02", actor: "P. Lund",        actorRole: "maker",   action: "submitted" },
      { at: "2026-04-29 11:30", actor: "Demo Checker",   actorRole: "checker", action: "queried", note: "Round 1 raised" },
    ],
  },

  // 3) Procurement (Scope 3 Cat 1) — supplier-submitted with double-count risk + AI low confidence.
  {
    id: "R-1040",
    property: "Mountain Lodge",
    region: "Americas",
    pillar: "carbon",
    dataType: "Procurement — Cat 1",
    method: "supplier",
    source: "Linen laundry — supplier-specific EF",
    period: "Apr 2026",
    value: "USD 14,200",
    submittedBy: "Aurora Linens Co.",
    submittedByRole: "supplier",
    submittedAt: "2026-04-28 16:48",
    status: "submitted",
    dueAt: "2026-05-05 17:00",
    flags: [
      { key: "ai-low",       severity: "warn", label: "AI classification low confidence", hint: "Cat 1 vs Cat 4 — model 68%" },
      { key: "double-count", severity: "warn", label: "Possible double-count", hint: "Same vendor invoice may already be in QuickBooks Cat 4 line items." },
    ],
    aiSuggestions: [
      { field: "Scope 3 category", suggestion: "Cat 1 — Purchased goods",     confidence: 68 },
      { field: "Scope 3 category", suggestion: "Cat 4 — Upstream transport",  confidence: 32 },
    ],
    evidence: [{ name: "aurora-linens-mar26.pdf", size: "184 KB", type: "PDF" }],
    queryRounds: [],
    comments: [],
    audit: [
      { at: "2026-04-28 16:48", actor: "Aurora Linens Co.", actorRole: "supplier", action: "submitted", note: "Submitted via Supplier Portal" },
    ],
    supplierSubmitted: true,
    supplierName: "Aurora Linens Co.",
    supplierLink: "/supplier-portal",
  },

  // 4) Resubmitted after 2 query rounds — both resolved, ready for approval.
  {
    id: "R-1039",
    property: "Seaside Hotel",
    region: "APAC",
    pillar: "energy",
    dataType: "District cooling",
    method: "manual",
    source: "District cooling",
    period: "Mar 2026",
    value: "84,200 kWh",
    cost: "AUD 18,300",
    meterId: "DC-PLANT-01",
    invoiceRef: "INV-2026-03-441",
    submittedBy: "L. Park",
    submittedByRole: "maker",
    submittedAt: "2026-04-02 10:20",
    status: "resubmitted",
    dueAt: "2026-05-02 17:00",
    flags: [],
    evidence: [{ name: "dc-bill-mar26.pdf", size: "342 KB", type: "PDF" }],
    queryRounds: [
      {
        round: 1, raisedBy: "Demo Checker", raisedAt: "2026-04-04 09:10",
        message: "Cost figure looks unusually high — please double-check the AUD/USD conversion.",
        response: { by: "L. Park", at: "2026-04-05 11:24", message: "Confirmed — supplier billed in AUD; converted at 0.66 spot." },
        resolved: true,
      },
      {
        round: 2, raisedBy: "Demo Checker", raisedAt: "2026-04-06 14:00",
        message: "Please attach the conversion-rate evidence.",
        response: { by: "L. Park", at: "2026-04-08 10:00", message: "Done. RBA spot rate FX evidence attached." },
        resolved: true,
      },
    ],
    comments: [],
    audit: [
      { at: "2026-04-02 10:20", actor: "L. Park",      actorRole: "maker",   action: "submitted" },
      { at: "2026-04-04 09:10", actor: "Demo Checker", actorRole: "checker", action: "queried", note: "Round 1" },
      { at: "2026-04-05 11:24", actor: "L. Park",      actorRole: "maker",   action: "resubmitted" },
      { at: "2026-04-06 14:00", actor: "Demo Checker", actorRole: "checker", action: "queried", note: "Round 2" },
      { at: "2026-04-08 10:00", actor: "L. Park",      actorRole: "maker",   action: "resubmitted" },
    ],
  },

  // 5) Approved + locked — example of post-approval state.
  {
    id: "R-1038",
    property: "Palm Beach Resort",
    region: "APAC",
    pillar: "waste",
    dataType: "Waste — landfill",
    method: "qr",
    source: "Loading bay — kitchen",
    period: "Apr 2026",
    value: "1,260 kg",
    submittedBy: "K. Phuwadon",
    submittedByRole: "maker",
    submittedAt: "2026-04-26 17:14",
    status: "approved",
    dueAt: "2026-05-02 17:00",
    flags: [],
    evidence: [{ name: "qr-scan-export-apr26.csv", size: "12 KB", type: "CSV" }],
    queryRounds: [],
    comments: [
      { id: "c1", author: "Demo Checker", role: "checker", at: "2026-04-27 09:02",
        message: "All clear. Stream and contractor verified against hauler API." },
    ],
    audit: [
      { at: "2026-04-26 17:14", actor: "K. Phuwadon",   actorRole: "maker",   action: "submitted" },
      { at: "2026-04-27 09:02", actor: "Demo Checker",  actorRole: "checker", action: "approved" },
      { at: "2026-04-27 09:02", actor: "Demo Checker",  actorRole: "checker", action: "locked", note: "Auto-locked on approval" },
    ],
    locked: true,
  },

  // 6) Refrigerant log — tier regression flag.
  {
    id: "R-1037",
    property: "Grand Hotel",
    region: "EMEA",
    pillar: "carbon",
    dataType: "Refrigerant log",
    method: "manual",
    source: "R-410A · Chiller 2",
    period: "Apr 2026",
    value: "4.5 kg charged",
    submittedBy: "E. Aksoy",
    submittedByRole: "maker",
    submittedAt: "2026-04-27 13:25",
    status: "submitted",
    dueAt: "2026-05-02 17:00",
    flags: [
      { key: "tier-regression", severity: "warn", label: "Tier regression — Tier 3 used where Tier 1 was used in prior period",
        hint: "March was Tier 1 (manufacturer GWP); April reverted to Tier 3 IPCC AR6." },
      { key: "missing-evidence", severity: "warn", label: "No evidence file attached" },
    ],
    evidence: [],
    queryRounds: [],
    comments: [],
    audit: [
      { at: "2026-04-27 13:25", actor: "E. Aksoy", actorRole: "maker", action: "submitted" },
    ],
  },

  // 7) Bulk CSV upload with range error — already rejected, kept for visibility.
  {
    id: "R-1036",
    property: "Airport Hotel",
    region: "EMEA",
    pillar: "energy",
    dataType: "Energy — bulk CSV",
    method: "bulk",
    source: "Diesel back-up",
    period: "Apr 2026",
    value: "-12,000 kWh",
    submittedBy: "Bulk import",
    submittedByRole: "maker",
    submittedAt: "2026-04-28 11:11",
    status: "rejected",
    dueAt: "2026-05-02 17:00",
    flags: [
      { key: "range", severity: "bad", label: "Range error — negative consumption", hint: "Negative consumption only allowed for solar PV exports." },
    ],
    evidence: [{ name: "bulk-energy-apr26.csv", size: "8 KB", type: "CSV" }],
    queryRounds: [],
    comments: [
      { id: "c1", author: "Demo Checker", role: "checker", at: "2026-04-28 13:00",
        message: "Rejected — value -12,000 kWh on diesel source is invalid. Please re-upload after correcting row 4." },
    ],
    audit: [
      { at: "2026-04-28 11:11", actor: "Bulk import",  actorRole: "maker",   action: "submitted" },
      { at: "2026-04-28 13:00", actor: "Demo Checker", actorRole: "checker", action: "rejected", note: "Mandatory comment: range error" },
    ],
  },

  // 8) Duplicate invoice — same supplier billed twice via two methods.
  {
    id: "R-1035",
    property: "Greenview Resort",
    region: "APAC",
    pillar: "carbon",
    dataType: "Procurement — Cat 4",
    method: "api",
    source: "QuickBooks vendor invoice",
    period: "Apr 2026",
    value: "USD 8,450",
    submittedBy: "QuickBooks Online",
    submittedByRole: "maker",
    submittedAt: "2026-04-28 04:30",
    status: "submitted",
    dueAt: "2026-05-03 17:00",
    flags: [
      { key: "duplicate", severity: "bad",  label: "Duplicate invoice — INV-94221 already imported on 27 Apr" },
      { key: "ai-low",    severity: "warn", label: "AI classification low confidence — Cat 4 vs Cat 1 (62%)" },
    ],
    aiSuggestions: [
      { field: "Scope 3 category", suggestion: "Cat 4 — Upstream transport", confidence: 62 },
      { field: "Scope 3 category", suggestion: "Cat 1 — Purchased goods",    confidence: 38 },
    ],
    evidence: [{ name: "qbo-invoice-94221.pdf", size: "98 KB", type: "PDF" }],
    queryRounds: [],
    comments: [],
    audit: [
      { at: "2026-04-28 04:30", actor: "QuickBooks Online", actorRole: "maker", action: "submitted", note: "Auto-imported via QuickBooks API" },
    ],
  },
];

/* ============================================================== */
/* Helpers                                                        */
/* ============================================================== */

const PRIORITY_RANK: Status[] = [
  "submitted", "resubmitted", "queried", "approved", "rejected", "draft", "locked",
];

/** Higher = more urgent. Used by the queue sort. */
export function priorityScore(r: ReviewRecord): number {
  let score = 0;
  if ((r.overdueDays ?? 0) > 0) score += 100;
  if (r.flags.some((f) => f.severity === "bad")) score += 80;
  if (r.flags.some((f) => f.key === "spike" || f.key === "drop")) score += 60;
  if (r.flags.some((f) => f.key === "ocr-low" || f.key === "ai-low")) score += 40;
  if (r.status === "resubmitted") score += 30;
  if (r.status === "queried") score += 20;
  if (r.flags.some((f) => f.key === "missing-evidence")) score += 15;
  if (r.supplierSubmitted) score += 5;
  // Status as tiebreaker
  score -= PRIORITY_RANK.indexOf(r.status);
  return score;
}

export const ROLE_LABEL: Record<Role, string> = {
  maker: "Maker",
  checker: "Checker",
  property_sm: "Property SM",
  auditor: "Auditor (read-only)",
  supplier: "Supplier",
  super_admin: "Super Admin",
};

/** Whether the role can act on records in the queue. */
export function canTakeAction(role: Role): boolean {
  return role === "checker" || role === "property_sm" || role === "super_admin";
}

/** Whether the role can see the page at all. */
export function canViewQueue(_role: Role): boolean {
  return true;
}
