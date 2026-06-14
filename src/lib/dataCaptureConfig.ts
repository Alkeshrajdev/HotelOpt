// Data Capture configuration — data types × supported input methods × fields.
// Mirrors BRD §6.1 (input method matrix) and §6.2 (manual entry forms).

import type { LucideIcon } from "lucide-react";
import {
  Award,
  Building2,
  Cloud,
  Droplet,
  FlaskConical,
  Lightbulb,
  Plane,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Zap,
} from "lucide-react";

export type Method = "manual" | "ocr" | "bulk" | "qr" | "api" | "survey" | "ai-assist";
export type ConnectionStatus = "active" | "configured" | "not-configured" | "action-needed" | "optional";

export type DataTypeKey =
  | "energy"
  | "water"
  | "waste"
  | "occupancy"
  | "procurement"
  | "travel-commute"
  | "refrigerants"
  | "ops-events"
  | "social"
  | "governance"
  | "cert-evidence";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "month"
  | "select"
  | "multiselect"
  | "unit"
  | "currency"
  | "textarea"
  | "file"
  | "tier"
  | "boolean"
  | "pillar-multi";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Optional select options. */
  options?: { value: string; label: string }[];
  /** For type="unit": list of allowed unit codes. */
  unitOptions?: string[];
  /** Default unit. */
  defaultUnit?: string;
  hint?: string;
  /** When true, the field spans the full width. */
  full?: boolean;
  /** Inline help text shown below the input. */
  help?: string;
};

export type DataTypeConfig = {
  key: DataTypeKey;
  label: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  pillar: "energy" | "water" | "waste" | "carbon" | "social" | "governance" | "operations";
  /** Methods supported per BRD §6.1 — order = priority. */
  methods: Method[];
  /** Fields shown in the manual entry form. */
  fields: FieldDef[];
  /** BRD reference for traceability. */
  brdRef?: string;
};

const COMMON_NOTES: FieldDef = {
  key: "notes",
  label: "Notes",
  type: "textarea",
  full: true,
  hint: "Optional context for the checker (anomalies, refurbishment, events…)",
};

const COMMON_EVIDENCE: FieldDef = {
  key: "evidence",
  label: "Evidence",
  type: "file",
  full: true,
  hint: "Attach the source bill, invoice, meter photo, contractor report, or other supporting evidence.",
};

const COMMON_PERIOD: FieldDef = {
  key: "period",
  label: "Billing period",
  type: "month",
  required: true,
};

/* =================================================================== */

export const DATA_TYPES: DataTypeConfig[] = [
  {
    key: "energy",
    label: "Energy",
    description: "Electricity, gas, district cooling, diesel, on-site solar PV.",
    icon: Zap,
    iconBg: "bg-pillar-energy/10 text-pillar-energy",
    pillar: "energy",
    methods: ["manual", "ocr", "bulk", "api", "ai-assist"],
    brdRef: "FR-1.2.1",
    fields: [
      {
        key: "sourceType",
        label: "Source type",
        type: "select",
        required: true,
        options: [
          { value: "electricity_grid",  label: "Electricity — grid" },
          { value: "natural_gas",       label: "Natural gas" },
          { value: "district_cooling",  label: "District cooling" },
          { value: "diesel",            label: "Diesel" },
          { value: "solar_pv",          label: "Solar PV (on-site)" },
        ],
      },
      COMMON_PERIOD,
      {
        key: "consumption",
        label: "Consumption",
        type: "number",
        required: true,
      },
      {
        key: "unit",
        label: "Unit",
        type: "unit",
        required: true,
        unitOptions: ["kWh", "MJ", "m³", "L", "kg"],
        defaultUnit: "kWh",
        hint: "Auto-suggested from source type.",
      },
      { key: "cost",       label: "Cost",       type: "currency" },
      { key: "meterId",    label: "Meter ID",   type: "text", help: "e.g. ELEC-MAIN-01" },
      { key: "invoiceRef", label: "Invoice reference", type: "text" },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "water",
    label: "Water",
    description: "Municipal supply, recycled / greywater, borewell, condensate.",
    icon: Droplet,
    iconBg: "bg-info/10 text-info",
    pillar: "water",
    methods: ["manual", "ocr", "bulk", "api", "ai-assist"],
    brdRef: "FR-1.2.2",
    fields: [
      {
        key: "sourceType",
        label: "Source type",
        type: "select",
        required: true,
        options: [
          { value: "municipal", label: "Municipal supply" },
          { value: "recycled",  label: "Recycled / greywater" },
          { value: "borewell",  label: "Borewell" },
          { value: "rainwater", label: "Rainwater harvested" },
        ],
      },
      COMMON_PERIOD,
      { key: "consumption", label: "Consumption", type: "number", required: true },
      {
        key: "unit",
        label: "Unit",
        type: "unit",
        required: true,
        unitOptions: ["m³", "L"],
        defaultUnit: "m³",
      },
      { key: "cost",      label: "Cost",       type: "currency" },
      { key: "meterId",   label: "Meter ID",   type: "text" },
      { key: "invoiceRef", label: "Invoice reference", type: "text" },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "waste",
    label: "Waste",
    description: "Streams (organic, recyclable, landfill, glass, hazardous, e-waste).",
    icon: Recycle,
    iconBg: "bg-pillar-waste/10 text-pillar-waste",
    pillar: "waste",
    methods: ["manual", "bulk", "qr", "api", "ai-assist"],
    brdRef: "FR-1.2.3",
    fields: [
      {
        key: "stream",
        label: "Waste stream",
        type: "select",
        required: true,
        options: [
          { value: "organic",     label: "Organic / food" },
          { value: "recyclable",  label: "Mixed recyclable" },
          { value: "landfill",    label: "Landfill" },
          { value: "glass",       label: "Glass" },
          { value: "hazardous",   label: "Hazardous" },
          { value: "ewaste",      label: "E-waste" },
        ],
      },
      { key: "date", label: "Collection date", type: "date", required: true },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      {
        key: "unit",
        label: "Unit",
        type: "unit",
        required: true,
        unitOptions: ["kg", "t", "L"],
        defaultUnit: "kg",
      },
      {
        key: "disposalRoute",
        label: "Disposal route",
        type: "select",
        options: [
          { value: "landfill",   label: "Landfill" },
          { value: "incineration", label: "Incineration" },
          { value: "recycled",   label: "Recycled" },
          { value: "composted",  label: "Composted" },
          { value: "donated",    label: "Donated (food)" },
        ],
      },
      { key: "contractor", label: "Contractor / hauler", type: "text" },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "occupancy",
    label: "Occupancy",
    description: "Occupied Room Nights (ORN), guests, conference/banqueting, F&B covers.",
    icon: Building2,
    iconBg: "bg-warn/10 text-warn",
    pillar: "operations",
    methods: ["manual", "bulk", "api"],
    brdRef: "FR-1.2.4",
    fields: [
      COMMON_PERIOD,
      { key: "availableRooms",  label: "Available rooms",        type: "number", required: true, help: "Sellable rooms. Available room-nights = rooms × days in the period." },
      { key: "occupiedRoomNights", label: "Occupied Room Nights (ORN)", type: "number", required: true, help: "Canonical denominator — energy, carbon and cost intensities are all reported per ORN. Must not exceed rooms × days." },
      { key: "occupancyPct",   label: "Occupancy %",             type: "number", help: "Auto-calculated from ORN ÷ (rooms × days) if blank." },
      { key: "totalGuests",    label: "Total guests",            type: "number" },
      { key: "guestNights",    label: "Guest nights",            type: "number", help: "Used for water intensity (L/guest-night) — the hotel benchmark basis." },
      { key: "conferenceGuests", label: "Conference / banqueting (day)", type: "number" },
      { key: "fbCovers",       label: "F&B covers",              type: "number" },
      COMMON_NOTES,
    ],
  },

  {
    key: "procurement",
    label: "Purchases & Supplier Invoices",
    description: "Purchased goods, capital goods, upstream transport — spend or supplier-specific.",
    icon: Truck,
    iconBg: "bg-pillar-social/10 text-pillar-social",
    pillar: "carbon",
    methods: ["manual", "ocr", "bulk", "api", "survey", "ai-assist"],
    brdRef: "FR-1.2.5",
    fields: [
      {
        key: "category",
        label: "Scope 3 category",
        type: "select",
        required: true,
        options: [
          { value: "cat1",   label: "Cat 1 — Purchased goods & services" },
          { value: "cat2",   label: "Cat 2 — Capital goods" },
          { value: "cat4",   label: "Cat 4 — Upstream transport" },
        ],
      },
      { key: "vendor",     label: "Vendor / supplier",  type: "text", required: true },
      { key: "description", label: "Description / line item", type: "text", full: true },
      { key: "tier",       label: "Calculation tier",   type: "tier", required: true,
        hint: "Tier 1 = supplier-specific, Tier 2 = product-class average, Tier 3 = spend × EEIO." },
      { key: "amount",     label: "Amount",             type: "number", required: true },
      {
        key: "unit",
        label: "Unit",
        type: "unit",
        unitOptions: ["USD", "EUR", "kg", "tonnes", "units"],
        defaultUnit: "USD",
        help: "Spend (USD/EUR…) for Tier 3, mass/units for Tier 1/2.",
      },
      { key: "invoiceRef", label: "Invoice reference",  type: "text" },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "travel-commute",
    label: "Business travel & commute",
    description: "Air, rail, road, hotel stays, employee commute mode share.",
    icon: Plane,
    iconBg: "bg-indigo-50 text-indigo-700",
    pillar: "carbon",
    methods: ["manual", "ocr", "bulk", "api", "survey", "ai-assist"],
    brdRef: "FR-1.2.5",
    fields: [
      {
        key: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [
          { value: "cat6", label: "Cat 6 — Business travel" },
          { value: "cat7", label: "Cat 7 — Employee commute" },
        ],
      },
      {
        key: "mode",
        label: "Mode",
        type: "select",
        required: true,
        options: [
          { value: "air-short",   label: "Air — short-haul" },
          { value: "air-long",    label: "Air — long-haul" },
          { value: "rail",        label: "Rail" },
          { value: "car-petrol",  label: "Car — petrol" },
          { value: "car-diesel",  label: "Car — diesel" },
          { value: "car-ev",      label: "Car — EV" },
          { value: "bus",         label: "Bus" },
          { value: "hotel-stay",  label: "Hotel stay" },
        ],
      },
      { key: "period", label: "Period", type: "month", required: true },
      { key: "distance", label: "Distance / passenger-km", type: "number" },
      {
        key: "unit",
        label: "Unit",
        type: "unit",
        unitOptions: ["pkm", "km", "trips", "nights"],
        defaultUnit: "pkm",
      },
      { key: "headcount", label: "Headcount surveyed", type: "number", help: "For commute, based on survey response." },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "refrigerants",
    label: "Refrigerants & Fugitive Emissions",
    description: "HVAC and chiller leak rates — manual only per BRD.",
    icon: FlaskConical,
    iconBg: "bg-info/10 text-info",
    pillar: "carbon",
    methods: ["manual"],
    brdRef: "FR-1.2.6",
    fields: [
      {
        key: "refrigerant",
        label: "Refrigerant",
        type: "select",
        required: true,
        options: [
          { value: "R-410A", label: "R-410A (GWP 2,088)" },
          { value: "R-134a", label: "R-134a (GWP 1,430)" },
          { value: "R-32",   label: "R-32 (GWP 675)" },
          { value: "R-407C", label: "R-407C (GWP 1,774)" },
          { value: "R-744",  label: "R-744 / CO₂ (GWP 1)" },
        ],
        hint: "GWP auto-populated from IPCC AR6.",
      },
      { key: "date", label: "Date of charge / recovery", type: "date", required: true },
      { key: "charged", label: "Quantity charged (kg)", type: "number" },
      { key: "recovered", label: "Quantity recovered (kg)", type: "number" },
      {
        key: "equipmentType",
        label: "Equipment type",
        type: "select",
        options: [
          { value: "vrf",      label: "VRF / split system" },
          { value: "chiller",  label: "Chiller" },
          { value: "kitchen",  label: "Kitchen refrigeration" },
          { value: "rooftop",  label: "Rooftop / packaged unit" },
        ],
      },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "ops-events",
    label: "Operational events",
    description: "Major changes that affect GP — F&B refurb, LED retrofit, solar commissioning. SM input only.",
    icon: Sparkles,
    iconBg: "bg-brand-50 text-brand-700",
    pillar: "operations",
    methods: ["manual"],
    brdRef: "FR-1.2.7",
    fields: [
      {
        key: "eventType",
        label: "Event type",
        type: "select",
        required: true,
        options: [
          { value: "new-pool",     label: "New pool / spa commissioned" },
          { value: "led",          label: "LED retrofit" },
          { value: "fb-open",      label: "Restaurant / F&B opened" },
          { value: "fb-close",     label: "Restaurant / F&B closed" },
          { value: "hvac",         label: "HVAC / chiller replacement" },
          { value: "solar",        label: "Solar PV commissioned" },
          { value: "renovation",   label: "Renovation / refurbishment" },
          { value: "other",        label: "Other" },
        ],
      },
      { key: "date", label: "Effective date", type: "date", required: true },
      { key: "description", label: "Description", type: "textarea", full: true, required: true },
      {
        key: "pillarsAffected",
        label: "Pillars affected",
        type: "pillar-multi",
        required: true,
        full: true,
        hint: "Used by the GP engine to segment the timeline before / after this event.",
      },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "social",
    label: "Social — HR, training & community",
    description: "Headcount, diversity, training hours, H&S incidents, community engagement, local sourcing.",
    icon: Users,
    iconBg: "bg-pillar-social/10 text-pillar-social",
    pillar: "social",
    methods: ["manual", "bulk", "api", "survey", "ai-assist"],
    brdRef: "FR-1.2.8 / 9 / 10 / 11 / 12",
    fields: [
      {
        key: "subType",
        label: "Sub-type",
        type: "select",
        required: true,
        options: [
          { value: "headcount",      label: "Headcount snapshot (GRI 401 / 405)" },
          { value: "training",       label: "Training & development (GRI 404)" },
          { value: "hs-incident",    label: "H&S incident (GRI 403)" },
          { value: "community",      label: "Community engagement (GRI 413)" },
          { value: "local-sourcing", label: "Local sourcing (GRI 204)" },
        ],
      },
      { key: "period", label: "Period", type: "month", required: true },
      { key: "value",  label: "Value",  type: "number", required: true },
      {
        key: "unit",
        label: "Unit",
        type: "unit",
        unitOptions: ["count", "hours", "%", "USD", "events"],
        defaultUnit: "count",
      },
      { key: "breakdown", label: "Breakdown / detail", type: "textarea", full: true },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "governance",
    label: "Governance attestation",
    description: "Annual policy and oversight attestations (anti-corruption, code of conduct, supplier code, board oversight).",
    icon: ShieldCheck,
    iconBg: "bg-pillar-gov/10 text-pillar-gov",
    pillar: "governance",
    methods: ["manual"],
    brdRef: "FR-1.2.13",
    fields: [
      {
        key: "policyName",
        label: "Policy / attestation",
        type: "select",
        required: true,
        options: [
          { value: "ac-policy",       label: "Anti-corruption policy in place" },
          { value: "code-conduct",    label: "Code of conduct in place" },
          { value: "whistleblowing",  label: "Whistleblowing channel in place" },
          { value: "supplier-code",   label: "Supplier code of conduct in place" },
          { value: "board-oversight", label: "Board sustainability oversight in place" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no",  label: "No" },
          { value: "na",  label: "N/A" },
        ],
      },
      { key: "attestedBy", label: "Attested by",  type: "text", required: true },
      { key: "date",       label: "Attested date", type: "date", required: true },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "cert-evidence",
    label: "Certification evidence",
    description: "Per-criterion evidence files for GSTC, HSB, Green Key, Green Globe, LEED O+M, Travelife, EU Ecolabel.",
    icon: Award,
    iconBg: "bg-warn/10 text-warn",
    pillar: "governance",
    methods: ["manual"],
    brdRef: "FR-12",
    fields: [
      {
        key: "programme",
        label: "Programme",
        type: "select",
        required: true,
        options: [
          { value: "GSTC",        label: "GSTC" },
          { value: "HSB",         label: "Hotel Sustainability Basics" },
          { value: "GREEN-KEY",   label: "Green Key" },
          { value: "GREEN-GLOBE", label: "Green Globe" },
          { value: "LEED-OM",     label: "LEED O+M" },
          { value: "TRAVELIFE",   label: "Travelife" },
          { value: "EU-ECO",      label: "EU Ecolabel" },
        ],
      },
      { key: "criterion", label: "Criterion / clause", type: "text", required: true, help: "e.g. GSTC B6, Travelife 7.4" },
      { key: "title",     label: "Document title",     type: "text", required: true, full: true },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },
];

export const DATA_TYPES_BY_KEY: Record<DataTypeKey, DataTypeConfig> = Object.fromEntries(
  DATA_TYPES.map((dt) => [dt.key, dt])
) as Record<DataTypeKey, DataTypeConfig>;

/* =================================================================== */
/* Method metadata                                                      */
/* =================================================================== */

export const METHOD_META: Record<
  Method,
  { label: string; description: string; brdRef: string }
> = {
  manual:     { label: "Manual entry",          description: "Always available — DP-02. Form-based input.",                          brdRef: "FR-1.2" },
  ocr:        { label: "OCR — bills & invoices", description: "Upload JPG / PNG / PDF. Confidence scores per field. Edit and submit.", brdRef: "FR-1.3" },
  bulk:       { label: "Bulk CSV / Excel",       description: "Download template, validate row-by-row, all-or-none commit.",          brdRef: "FR-1.4" },
  qr:         { label: "QR scan",                description: "Mobile-first. Sub-30s flow with offline queue.",                       brdRef: "FR-1.5" },
  api:        { label: "API integrations",       description: "PMS, BMS, accounting, HR, weather, hauler.",                           brdRef: "FR-1.7" },
  survey:     { label: "Surveys",                description: "Supplier, employee, guest. Pre-populates the entry form.",             brdRef: "FR-1.6" },
  "ai-assist": { label: "AI Assist",             description: "Drop any raw file — bill, invoice, report, receipt. AI extracts the data, asks clarifying questions, and prepares a preview.", brdRef: "FR-1.8" },
};

/* =================================================================== */
/* Mock API integration registry                                        */
/* =================================================================== */

export type Integration = {
  key: string;
  name: string;
  scope: string;
  status: ConnectionStatus;
  lastSync?: string;
  category: "pms" | "weather" | "bms" | "accounting" | "hr" | "hauler" | "food";
};

export const INTEGRATIONS: Integration[] = [
  { key: "opera",     name: "Opera Cloud",         scope: "PMS — ORN, occupancy, conference & banqueting",  status: "active",         lastSync: "Today 06:12", category: "pms" },
  { key: "open-meteo",name: "Open-Meteo",          scope: "Weather — daily CDD/HDD by GPS",                 status: "active",         lastSync: "Today 03:00", category: "weather" },
  { key: "bms",       name: "BMS / SCADA receiver", scope: "Real-time energy & water from building systems", status: "configured",     lastSync: "Today 08:14", category: "bms" },
  { key: "qbo",       name: "QuickBooks Online",   scope: "Vendor invoices — Cat 1/2/4 line items",         status: "action-needed",  lastSync: "—",            category: "accounting" },
  { key: "xero",      name: "Xero",                scope: "Vendor invoices — Cat 1/2/4 line items",         status: "not-configured", category: "accounting" },
  { key: "workday",   name: "Workday HCM",         scope: "HR — headcount, demographics, training, H&S",    status: "active",         lastSync: "Today 04:30", category: "hr" },
  { key: "bamboo",    name: "BambooHR",            scope: "HR — headcount, demographics, training, H&S",    status: "not-configured", category: "hr" },
  { key: "hauler",    name: "Hauler API",          scope: "Waste hauler weight tickets",                    status: "active",         lastSync: "Today 02:55", category: "hauler" },
  { key: "leanpath",  name: "LeanPath",            scope: "Food waste by meal period",                      status: "optional",       category: "food" },
  { key: "traytracker", name: "Traytracker",       scope: "Food waste by meal period",                      status: "optional",       category: "food" },
];

export const STATUS_TEXT: Record<ConnectionStatus, string> = {
  "active":          "Active",
  "configured":      "Configured",
  "not-configured":  "Not configured",
  "action-needed":   "Action needed",
  "optional":        "Optional",
};

export const STATUS_TONE: Record<ConnectionStatus, "good" | "info" | "warn" | "neutral"> = {
  "active":          "good",
  "configured":      "info",
  "not-configured":  "neutral",
  "action-needed":   "warn",
  "optional":        "neutral",
};

/* =================================================================== */
/* Light pseudo-anomaly check used by the manual form's pre-submit pane */
/* =================================================================== */

export function pseudoAnomaly(consumption: number | null, _unit: string, _sourceType?: string): string[] {
  const out: string[] = [];
  if (consumption == null || Number.isNaN(consumption)) return out;
  if (consumption > 1_000_000)
    out.push("Value is very large for a monthly figure — possible unit issue (e.g. kWh entered as Wh).");
  if (consumption < 0)
    out.push("Negative consumption — only allowed for solar PV exports.");
  // Demo: simulate a YoY spike if the number ends in a 9
  if (Math.round(consumption) % 10 === 9) {
    out.push("Spike detected: value is approximately 38% higher than the same month last year.");
  }
  return out;
}
