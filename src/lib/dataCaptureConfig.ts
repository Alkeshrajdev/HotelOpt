// Data Capture configuration — data types × supported input methods × fields.
// Mirrors BRD §6.1 (input method matrix) and §6.2 (manual entry forms).

import type { LucideIcon } from "lucide-react";
import { Puzzle } from "lucide-react";
import {
  Award,
  Building2,
  Cloud,
  Droplet,
  FlaskConical,
  Lightbulb,
  Plane,
  Car,
  Recycle,
    Sparkles,
  Truck,
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
  | "fleet"
  | "refrigerants"
  | "ops-events"
  | "cert-evidence"
  | "custom";

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
  | "pillar-multi"
  /** Search the factor library itself — used for spend, where the list is 1,016 NAICS codes. */
  | "factor-search";

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
  /** Show this field only when another field holds one of these values. */
  showWhen?: { field: string; equals: string[] };
};

export type DataTypeConfig = {
  key: DataTypeKey;
  label: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  pillar: "energy" | "water" | "waste" | "carbon" | "operations";
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
        help: "The factor depends on the material, not just the route — landfill emissions differ by an order of magnitude between paper and aggregate.",
        options: [
          { value: "mixed",          label: "Mixed / general refuse" },
          { value: "organic-food",   label: "Organic — food & drink" },
          { value: "organic-garden", label: "Organic — garden" },
          { value: "organic",        label: "Organic — mixed food & garden" },
          { value: "recyclable",     label: "Mixed recyclables" },
          { value: "paper",          label: "Paper" },
          { value: "card",           label: "Card & board" },
          { value: "glass",          label: "Glass" },
          { value: "plastic",        label: "Plastics — mixed" },
          { value: "plastic-film",   label: "Plastics — film" },
          { value: "metal",          label: "Metal — cans" },
          { value: "metal-scrap",    label: "Metal — scrap" },
          { value: "textiles",       label: "Textiles & linen" },
          { value: "batteries",      label: "Batteries" },
          { value: "ewaste",         label: "WEEE / e-waste" },
          { value: "oil",            label: "Mineral oil" },
          { value: "construction",   label: "Construction & demolition" },
          { value: "hazardous",      label: "Hazardous (no published factor)" },
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
        required: true,
        options: [
          { value: "landfill",        label: "Landfill" },
          { value: "incineration",    label: "Incineration with energy recovery" },
          { value: "recycled",        label: "Recycled — open loop" },
          { value: "recycled-closed", label: "Recycled — closed loop" },
          { value: "composted",       label: "Composted" },
          { value: "anaerobic",       label: "Anaerobic digestion" },
          { value: "donated",         label: "Donated (surplus food)" },
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
    iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
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
      // Without a period every invoice lands in the current month, which puts it in the
      // wrong reporting year — the inventory is built per reporting year (May → April).
      { ...COMMON_PERIOD, label: "Period the purchase belongs to" },
      { key: "description", label: "Description / line item", type: "text", full: true },
      {
        key: "commodity",
        label: "What was bought",
        type: "factor-search",
        required: true,
        help: "Picks the spend-based factor (US EPA / USEEIO, by NAICS). Start from a common purchase or search all 1,016 codes — the report prints which one was applied.",
        options: [
          { value: "311999", label: "Food & beverage — mixed / general" },
          { value: "311611", label: "Food — meat & poultry" },
          { value: "311511", label: "Food — dairy" },
          { value: "111219", label: "Food — fresh produce" },
          { value: "312111", label: "Beverage — soft drinks & water" },
          { value: "312130", label: "Beverage — wine, beer & spirits" },
          { value: "322291", label: "Guest amenities & paper products" },
          { value: "325611", label: "Cleaning chemicals & detergents" },
          { value: "313210", label: "Linen, textiles & uniforms" },
          { value: "327212", label: "Glassware & tableware" },
          { value: "337127", label: "Furniture & FF&E" },
          { value: "335210", label: "Appliances & small electricals" },
          { value: "561720", label: "Services — cleaning & housekeeping" },
          { value: "561790", label: "Services — building maintenance & grounds" },
          { value: "541990", label: "Services — professional & technical" },
          { value: "484121", label: "Inbound freight & logistics" },
        ],
      },
      { key: "tier",       label: "Calculation tier",   type: "tier", required: true,
        hint: "Tier 1 = supplier-specific, Tier 2 = product-class average, Tier 3 = spend × EEIO." },
      { key: "amount", label: "Amount as invoiced", type: "number", required: true },
      {
        key: "currency",
        label: "Invoice currency",
        type: "select",
        required: true,
        help: "Enter the invoice as issued. The spend factors are denominated in 2022 USD, so the rate and the price year are recorded with the row.",
        options: [
          { value: "USD", label: "USD — US dollar" }, { value: "AED", label: "AED — UAE dirham" },
          { value: "EUR", label: "EUR — Euro" }, { value: "GBP", label: "GBP — Pound sterling" },
          { value: "SGD", label: "SGD — Singapore dollar" }, { value: "CHF", label: "CHF — Swiss franc" },
          { value: "THB", label: "THB — Thai baht" }, { value: "ZAR", label: "ZAR — South African rand" },
          { value: "AUD", label: "AUD — Australian dollar" }, { value: "CAD", label: "CAD — Canadian dollar" },
          { value: "INR", label: "INR — Indian rupee" }, { value: "JPY", label: "JPY — Japanese yen" },
          { value: "MYR", label: "MYR — Malaysian ringgit" }, { value: "IDR", label: "IDR — Indonesian rupiah" },
        ],
      },
      {
        key: "fxRate",
        label: "Exchange rate (USD per 1 unit)",
        type: "number",
        showWhen: { field: "currency", equals: ["AED", "EUR", "GBP", "SGD", "CHF", "THB", "ZAR", "AUD", "CAD", "INR", "JPY", "MYR", "IDR"] },
        help: "Only needed when no rate is on file for that currency and year — a platform admin loads those under Admin → Currency & price basis.",
      },
      {
        key: "fxSource",
        label: "Rate source",
        type: "text",
        showWhen: { field: "currency", equals: ["AED", "EUR", "GBP", "SGD", "CHF", "THB", "ZAR", "AUD", "CAD", "INR", "JPY", "MYR", "IDR"] },
        help: "e.g. \"ECB annual average 2026\" or \"group treasury rate\". An auditor will ask.",
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
          { value: "air-short",   label: "Air — short-haul (to/from UK)" },
          { value: "air-long",    label: "Air — long-haul (to/from UK)" },
          { value: "air-intl",    label: "Air — international (neither end UK)" },
          { value: "rail",        label: "Rail" },
          { value: "car-petrol",  label: "Car — petrol" },
          { value: "car-diesel",  label: "Car — diesel" },
          { value: "car-ev",      label: "Car — EV" },
          { value: "bus",         label: "Bus" },
          { value: "hotel-stay",  label: "Hotel stay" },
        ],
      },
      {
        key: "cabinClass",
        label: "Cabin class",
        type: "select",
        showWhen: { field: "mode", equals: ["air-short", "air-long", "air-intl"] },
        help: "Long-haul business class is about 2.2× the average-passenger factor, so this materially changes Cat 6.",
        options: [
          { value: "average", label: "Average passenger" },
          { value: "economy", label: "Economy" },
          { value: "premium", label: "Premium economy" },
          { value: "business", label: "Business" },
          { value: "first", label: "First" },
        ],
      },
      {
        key: "stayCountry",
        label: "Country stayed in",
        type: "select",
        showWhen: { field: "mode", equals: ["hotel-stay"] },
        help: "Hotel-stay factors are published per country.",
        options: [
          { value: "GB-LND", label: "United Kingdom — London" }, { value: "GB", label: "United Kingdom" },
          { value: "AE", label: "United Arab Emirates" }, { value: "AU", label: "Australia" },
          { value: "BE", label: "Belgium" }, { value: "BR", label: "Brazil" }, { value: "CA", label: "Canada" },
          { value: "CL", label: "Chile" }, { value: "CN", label: "China" }, { value: "CO", label: "Colombia" },
          { value: "EG", label: "Egypt" }, { value: "FR", label: "France" }, { value: "DE", label: "Germany" },
          { value: "IN", label: "India" }, { value: "ID", label: "Indonesia" }, { value: "IT", label: "Italy" },
          { value: "JP", label: "Japan" }, { value: "JO", label: "Jordan" }, { value: "MY", label: "Malaysia" },
          { value: "MV", label: "Maldives" }, { value: "MX", label: "Mexico" }, { value: "NL", label: "Netherlands" },
          { value: "OM", label: "Oman" }, { value: "PH", label: "Philippines" }, { value: "PT", label: "Portugal" },
          { value: "QA", label: "Qatar" }, { value: "SA", label: "Saudi Arabia" }, { value: "SG", label: "Singapore" },
          { value: "ZA", label: "South Africa" }, { value: "ES", label: "Spain" }, { value: "CH", label: "Switzerland" },
          { value: "TH", label: "Thailand" }, { value: "TR", label: "Turkey" }, { value: "VN", label: "Vietnam" },
        ],
      },
      { key: "period", label: "Period", type: "month", required: true },
      { key: "distance", label: "Distance, or nights for a hotel stay", type: "number", required: true },
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
    key: "fleet",
    label: "Owned vehicles & fleet",
    description: "Shuttles, vans and pool cars the hotel owns or controls — Scope 1 mobile combustion.",
    icon: Car,
    iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
    pillar: "carbon",
    methods: ["manual", "bulk", "api"],
    brdRef: "FR-1.2.6",
    fields: [
      {
        key: "basis",
        label: "Method",
        type: "select",
        required: true,
        help: "Fuel purchased is the preferred method — it measures what was actually burned. Distance is an estimate, for when fuel records are not kept.",
        options: [
          { value: "fuel", label: "Fuel purchased (preferred)" },
          { value: "distance", label: "Distance driven" },
        ],
      },
      { key: "period", label: "Period", type: "month", required: true },
      {
        key: "fuelType",
        label: "Fuel",
        type: "select",
        required: true,
        showWhen: { field: "basis", equals: ["fuel"] },
        options: [
          { value: "diesel", label: "Diesel (average biofuel blend)" },
          { value: "diesel-pure", label: "Diesel (100% mineral)" },
          { value: "petrol", label: "Petrol (average biofuel blend)" },
          { value: "petrol-pure", label: "Petrol (100% mineral)" },
          { value: "lpg", label: "LPG" },
          { value: "cng", label: "CNG" },
        ],
      },
      {
        key: "vehicleType",
        label: "Vehicle",
        type: "select",
        required: true,
        showWhen: { field: "basis", equals: ["distance"] },
        options: [
          { value: "car-average", label: "Car — average" },
          { value: "car-small", label: "Car — small" },
          { value: "car-medium", label: "Car — medium" },
          { value: "car-large", label: "Car — large" },
          { value: "car-mpv", label: "Car — MPV / people carrier" },
          { value: "car-4x4", label: "Car — 4x4 / dual purpose" },
          { value: "car-executive", label: "Car — executive" },
          { value: "car-luxury", label: "Car — luxury" },
          { value: "van-average", label: "Van — average (up to 3.5 t)" },
          { value: "van-small", label: "Van — Class I (up to 1.305 t)" },
          { value: "van-medium", label: "Van — Class II (1.305–1.74 t)" },
          { value: "van-large", label: "Van — Class III (1.74–3.5 t)" },
          { value: "motorbike", label: "Motorbike" },
          { value: "hgv", label: "HGV (average laden)" },
        ],
      },
      {
        key: "vehicleFuel",
        label: "Vehicle fuel",
        type: "select",
        showWhen: { field: "basis", equals: ["distance"] },
        help: "Motorbikes and HGVs are published without a fuel split, so this is ignored for them.",
        options: [
          { value: "diesel", label: "Diesel" },
          { value: "petrol", label: "Petrol" },
          { value: "hybrid", label: "Hybrid" },
          { value: "plug_in_hybrid_electric_vehicle", label: "Plug-in hybrid" },
          { value: "battery_electric_vehicle", label: "Battery electric" },
          { value: "lpg", label: "LPG" },
          { value: "cng", label: "CNG" },
          { value: "unknown", label: "Unknown" },
        ],
      },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      {
        key: "unit",
        label: "Unit",
        type: "unit",
        required: true,
        unitOptions: ["L", "km", "mi", "kg"],
        defaultUnit: "L",
        help: "Litres or kilograms for fuel; kilometres or miles for distance.",
      },
      { key: "vehicleRef", label: "Vehicle or fleet reference", type: "text", help: "e.g. \"Shuttle 1\" or \"pool cars\" — kept with the record for the audit trail." },
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
          { value: "R-410A", label: "R-410A (GWP 1,924)" },
          { value: "R-134a", label: "R-134a (GWP 1,300)" },
          { value: "R-32",   label: "R-32 (GWP 677)" },
          { value: "R-407C", label: "R-407C (GWP 1,624)" },
          { value: "R-404A", label: "R-404A (GWP 3,943)" },
          { value: "R-22",   label: "R-22 (GWP 1,960)" },
          { value: "R-744",  label: "R-744 / CO₂ (GWP 1)" },
        ],
        hint: "GWP from the factor library (IPCC AR5, 100-year). Emissions = charged − recovered × GWP.",
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
    key: "cert-evidence",
    label: "Certification evidence",
    description: "Per-criterion evidence files for the GHG inventory, LEED O+M, Green Key and Green Globe.",
    icon: Award,
    iconBg: "bg-warn/10 text-warn",
    pillar: "carbon",
    methods: ["manual"],
    brdRef: "FR-12",
    fields: [
      {
        key: "programme",
        label: "Programme",
        type: "select",
        required: true,
        options: [
          { value: "GHG",         label: "GHG Inventory" },
          { value: "GREEN-KEY",   label: "Green Key" },
          { value: "GREEN-GLOBE", label: "Green Globe" },
          { value: "LEED-OM",     label: "LEED O+M" },
        ],
      },
      { key: "criterion", label: "Criterion / clause", type: "text", required: true, help: "e.g. LEED EA c2, Green Key 5.1" },
      { key: "title",     label: "Document title",     type: "text", required: true, full: true },
      COMMON_EVIDENCE,
      COMMON_NOTES,
    ],
  },

  {
    key: "custom",
    label: "Custom / Other",
    description: "Bespoke metrics not covered above — biodiversity, noise or client-specific KPIs.",
    icon: Puzzle,
    iconBg: "bg-ink-100 text-ink-600",
    pillar: "operations",
    methods: ["manual"],
    fields: [
      { key: "metric", label: "Metric name", type: "text",   required: true, full: true, help: "e.g. Biodiversity survey score, Noise level (dB)" },
      { key: "value",  label: "Value",       type: "number", required: true },
      { key: "unit",   label: "Unit",        type: "text",   help: "e.g. score, dB, %, kg" },
      COMMON_PERIOD,
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
