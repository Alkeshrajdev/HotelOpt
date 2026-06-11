// Rich property dataset for the Properties configuration hub.
// Identities here MUST match PORTFOLIO_HOTELS in mock.ts so the same hotels
// appear consistently across the dashboard, performance, review and properties
// pages. Replace with live Supabase queries when the `properties` table is
// migrated to include these columns.

import type { PillarKey } from "@/pages/performance/Shell";

export type OperationType = "full-service" | "resort" | "limited-service" | "extended-stay";
export type OwnershipType = "owned" | "managed" | "franchised";
export type LaundryType   = "on-site" | "outsourced" | "hybrid";
export type PropertyStatus = "active" | "onboarding" | "inactive";

export type CertificationProgramme =
  | "GSTC"
  | "HSB"
  | "GREEN-KEY"
  | "GREEN-GLOBE"
  | "LEED-OM"
  | "TRAVELIFE"
  | "EU-ECO";

export type RichProperty = {
  // Identity
  id: string;
  name: string;
  brand: string;
  client: string;

  // Location
  region: string;
  country: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;

  // Physical
  starRating: number;
  rooms: number;
  gfa: number;
  buildingYear: number;
  fbOutlets: number;
  fbCoversAnnual: number;
  laundryType: LaundryType;
  poolCount: number;
  spaCount: number;

  // Operations
  operationType: OperationType;
  ownership: OwnershipType;

  // Reporting
  baselineYear: number;
  reportingYear: number;
  enabledPillars: PillarKey[];
  certifications: CertificationProgramme[];

  // External comparison
  poolEligible: boolean;
  poolReason?: string;

  // Status
  status: PropertyStatus;

  // Computed / readiness — for list view
  score: number;             // 0-100 sustainability score
  dataCompleteness: number;  // 0-100
  gpReady: boolean;
  certStatus: "ready" | "in-progress" | "pending";

  createdAt: string;
};

export type AssignedUser = {
  id: string;
  name: string;
  email: string;
  role: "maker" | "checker" | "property_sm" | "general_manager" | "auditor" | "super_admin";
  accessLevel: "property" | "region" | "portfolio";
  makerCheckerRights: "maker" | "checker" | "both" | "none";
  lastActive: string;
  mfaEnabled: boolean;
  status: "active" | "inactive";
};

export type CertReadiness = {
  readinessPct: number;
  readyCriteria: number;
  totalCriteria: number;
  gapCount: number;
  missingEvidence: number;
  owner: string;
  dueDate: string;
};

export type AttributeChange = {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  effectiveAt: string;
  reason: string;
};

export type QrPoint = {
  id: string;
  label: string;
  location: string;
  stream: string;
  active: boolean;
  scansLast30d: number;
  printedAt: string;
};

/* ============================================================== */
/* Canonical 10-hotel portfolio — names/regions mirror PORTFOLIO_HOTELS. */

export const PROPERTIES: RichProperty[] = [
  {
    id: "p-001",
    name: "Skyline Dubai",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "EMEA",
    country: "United Arab Emirates",
    city: "Dubai",
    address: "Sheikh Zayed Road, Downtown Dubai",
    latitude: 25.1972,
    longitude: 55.2744,
    timezone: "Asia/Dubai",
    currency: "AED",
    starRating: 5,
    rooms: 420,
    gfa: 30000,
    buildingYear: 2015,
    fbOutlets: 6,
    fbCoversAnnual: 520000,
    laundryType: "on-site",
    poolCount: 3,
    spaCount: 2,
    operationType: "resort",
    ownership: "managed",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["GSTC", "GREEN-GLOBE", "TRAVELIFE"],
    poolEligible: true,
    status: "active",
    score: 78,
    dataCompleteness: 94,
    gpReady: true,
    certStatus: "ready",
    createdAt: "2024-01-12",
  },
  {
    id: "p-002",
    name: "Peaks Resort Zermatt",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "EMEA",
    country: "Switzerland",
    city: "Zermatt",
    address: "Bahnhofstrasse 25, 3920 Zermatt",
    latitude: 46.0207,
    longitude: 7.7491,
    timezone: "Europe/Zurich",
    currency: "CHF",
    starRating: 4,
    rooms: 95,
    gfa: 7800,
    buildingYear: 1998,
    fbOutlets: 2,
    fbCoversAnnual: 90000,
    laundryType: "outsourced",
    poolCount: 1,
    spaCount: 1,
    operationType: "resort",
    ownership: "owned",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["GREEN-KEY", "LEED-OM"],
    poolEligible: true,
    status: "active",
    score: 47,
    dataCompleteness: 41,
    gpReady: false,
    certStatus: "pending",
    createdAt: "2024-02-05",
  },
  {
    id: "p-003",
    name: "Oceanfront Cape Town",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "Africa",
    country: "South Africa",
    city: "Cape Town",
    address: "Victoria & Alfred Waterfront, Cape Town",
    latitude: -33.9036,
    longitude: 18.4207,
    timezone: "Africa/Johannesburg",
    currency: "ZAR",
    starRating: 5,
    rooms: 210,
    gfa: 16000,
    buildingYear: 2016,
    fbOutlets: 4,
    fbCoversAnnual: 360000,
    laundryType: "on-site",
    poolCount: 2,
    spaCount: 1,
    operationType: "resort",
    ownership: "managed",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["GSTC", "EU-ECO"],
    poolEligible: true,
    status: "active",
    score: 85,
    dataCompleteness: 88,
    gpReady: true,
    certStatus: "ready",
    createdAt: "2024-03-18",
  },
  {
    id: "p-004",
    name: "The Pavilion London",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "EMEA",
    country: "United Kingdom",
    city: "London",
    address: "12 Pavilion Rd, Knightsbridge, London",
    latitude: 51.5014,
    longitude: -0.1607,
    timezone: "Europe/London",
    currency: "GBP",
    starRating: 5,
    rooms: 312,
    gfa: 24000,
    buildingYear: 2005,
    fbOutlets: 3,
    fbCoversAnnual: 420000,
    laundryType: "outsourced",
    poolCount: 1,
    spaCount: 1,
    operationType: "full-service",
    ownership: "franchised",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["GREEN-KEY", "TRAVELIFE"],
    poolEligible: true,
    status: "active",
    score: 84,
    dataCompleteness: 91,
    gpReady: true,
    certStatus: "ready",
    createdAt: "2024-01-25",
  },
  {
    id: "p-005",
    name: "Marina Residences Barcelona",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "EMEA",
    country: "Spain",
    city: "Barcelona",
    address: "Moll de Barcelona s/n, 08039 Barcelona",
    latitude: 41.3724,
    longitude: 2.1830,
    timezone: "Europe/Madrid",
    currency: "EUR",
    starRating: 5,
    rooms: 260,
    gfa: 19000,
    buildingYear: 2012,
    fbOutlets: 5,
    fbCoversAnnual: 380000,
    laundryType: "hybrid",
    poolCount: 4,
    spaCount: 2,
    operationType: "resort",
    ownership: "managed",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["GSTC", "GREEN-GLOBE"],
    poolEligible: true,
    status: "active",
    score: 66,
    dataCompleteness: 74,
    gpReady: true,
    certStatus: "in-progress",
    createdAt: "2024-04-02",
  },
  {
    id: "p-006",
    name: "Airport Hotel Dubai",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "EMEA",
    country: "United Arab Emirates",
    city: "Dubai",
    address: "Sheikh Zayed Rd, Dubai International Airport",
    latitude: 25.2532,
    longitude: 55.3657,
    timezone: "Asia/Dubai",
    currency: "AED",
    starRating: 4,
    rooms: 380,
    gfa: 24600,
    buildingYear: 1998,
    fbOutlets: 3,
    fbCoversAnnual: 290000,
    laundryType: "outsourced",
    poolCount: 1,
    spaCount: 0,
    operationType: "limited-service",
    ownership: "franchised",
    baselineYear: 2024,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon"],
    certifications: ["HSB"],
    poolEligible: false,
    poolReason: "Onboarding — under 12 months of approved data",
    status: "onboarding",
    score: 45,
    dataCompleteness: 41,
    gpReady: false,
    certStatus: "pending",
    createdAt: "2025-09-10",
  },
  {
    id: "p-007",
    name: "Grand Harbour Lisbon",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "EMEA",
    country: "Portugal",
    city: "Lisbon",
    address: "Av. da Ribeira das Naus, 1200 Lisboa",
    latitude: 38.7057,
    longitude: -9.1366,
    timezone: "Europe/Lisbon",
    currency: "EUR",
    starRating: 4,
    rooms: 280,
    gfa: 20800,
    buildingYear: 1990,
    fbOutlets: 3,
    fbCoversAnnual: 260000,
    laundryType: "on-site",
    poolCount: 1,
    spaCount: 1,
    operationType: "full-service",
    ownership: "managed",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["TRAVELIFE"],
    poolEligible: true,
    status: "active",
    score: 80,
    dataCompleteness: 87,
    gpReady: true,
    certStatus: "ready",
    createdAt: "2024-06-14",
  },
  {
    id: "p-008",
    name: "Riverside Bangkok",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "APAC",
    country: "Thailand",
    city: "Bangkok",
    address: "257 Charoennakorn Rd, Khlong San, Bangkok",
    latitude: 13.7220,
    longitude: 100.5100,
    timezone: "Asia/Bangkok",
    currency: "THB",
    starRating: 4,
    rooms: 180,
    gfa: 16400,
    buildingYear: 2006,
    fbOutlets: 2,
    fbCoversAnnual: 180000,
    laundryType: "outsourced",
    poolCount: 1,
    spaCount: 0,
    operationType: "limited-service",
    ownership: "owned",
    baselineYear: 2024,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon"],
    certifications: ["HSB"],
    poolEligible: false,
    poolReason: "Onboarding — under 12 months of approved data",
    status: "onboarding",
    score: 30,
    dataCompleteness: 30,
    gpReady: false,
    certStatus: "pending",
    createdAt: "2024-08-22",
  },
  {
    id: "p-009",
    name: "Bay View Singapore",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "APAC",
    country: "Singapore",
    city: "Singapore",
    address: "8 Marina Blvd, Singapore",
    latitude: 1.2799,
    longitude: 103.8540,
    timezone: "Asia/Singapore",
    currency: "SGD",
    starRating: 5,
    rooms: 350,
    gfa: 26000,
    buildingYear: 2017,
    fbOutlets: 5,
    fbCoversAnnual: 410000,
    laundryType: "on-site",
    poolCount: 2,
    spaCount: 1,
    operationType: "full-service",
    ownership: "managed",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["GSTC"],
    poolEligible: true,
    status: "active",
    score: 78,
    dataCompleteness: 82,
    gpReady: true,
    certStatus: "ready",
    createdAt: "2024-02-20",
  },
  {
    id: "p-010",
    name: "The Montrose Paris",
    brand: "Hotel Optimizer",
    client: "Acme Hotels",
    region: "EMEA",
    country: "France",
    city: "Paris",
    address: "15 Rue de Rivoli, 75004 Paris",
    latitude: 48.8556,
    longitude: 2.3600,
    timezone: "Europe/Paris",
    currency: "EUR",
    starRating: 5,
    rooms: 165,
    gfa: 12000,
    buildingYear: 1995,
    fbOutlets: 3,
    fbCoversAnnual: 150000,
    laundryType: "outsourced",
    poolCount: 0,
    spaCount: 1,
    operationType: "full-service",
    ownership: "owned",
    baselineYear: 2022,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
    certifications: ["GREEN-KEY"],
    poolEligible: true,
    status: "active",
    score: 88,
    dataCompleteness: 96,
    gpReady: true,
    certStatus: "ready",
    createdAt: "2024-05-10",
  },
];

/* ============================================================== */

export function findProperty(id: string): RichProperty | undefined {
  return PROPERTIES.find((p) => p.id === id);
}

export function getAssignedUsers(propertyId: string): AssignedUser[] {
  const baseline: AssignedUser[] = [
    {
      id: "u-1", name: "Demo Admin",   email: "admin@demo.test",   role: "super_admin",
      accessLevel: "portfolio", makerCheckerRights: "both",    lastActive: "Today 09:14", mfaEnabled: true,  status: "active",
    },
    {
      id: "u-2", name: "Demo Checker", email: "checker@demo.test", role: "checker",
      accessLevel: "property",  makerCheckerRights: "checker", lastActive: "Today 08:42", mfaEnabled: true,  status: "active",
    },
    {
      id: "u-3", name: "Demo Maker",   email: "maker@demo.test",   role: "maker",
      accessLevel: "property",  makerCheckerRights: "maker",   lastActive: "Today 07:30", mfaEnabled: false, status: "active",
    },
    {
      id: "u-4", name: "Fiona Setiawan", email: "f.setiawan@demo.test", role: "property_sm",
      accessLevel: "property",  makerCheckerRights: "both",    lastActive: "Yesterday",   mfaEnabled: true,  status: "active",
    },
    {
      id: "u-5", name: "James Thornton",  email: "j.thornton@demo.test", role: "general_manager",
      accessLevel: "property",  makerCheckerRights: "none",    lastActive: "3 days ago",  mfaEnabled: false, status: "active",
    },
  ];
  if (propertyId === "p-006") return baseline.slice(0, 2);
  return baseline;
}

export const PROPERTY_CERT_READINESS: Record<string, Partial<Record<CertificationProgramme, CertReadiness>>> = {
  "p-001": {
    "GSTC":        { readinessPct: 82, readyCriteria: 31, totalCriteria: 38, gapCount: 7,  missingEvidence: 4, owner: "F. Setiawan", dueDate: "2026-06-30" },
    "GREEN-GLOBE": { readinessPct: 78, readyCriteria: 34, totalCriteria: 44, gapCount: 10, missingEvidence: 6, owner: "F. Setiawan", dueDate: "2026-08-15" },
    "TRAVELIFE":   { readinessPct: 91, readyCriteria: 148, totalCriteria: 163, gapCount: 15, missingEvidence: 8, owner: "F. Setiawan", dueDate: "2026-09-01" },
  },
  "p-002": {
    "GREEN-KEY": { readinessPct: 74, readyCriteria: 33, totalCriteria: 45, gapCount: 12, missingEvidence: 5, owner: "Demo Maker", dueDate: "2026-07-20" },
    "LEED-OM":   { readinessPct: 68, readyCriteria: 34, totalCriteria: 50, gapCount: 16, missingEvidence: 9, owner: "Demo Maker", dueDate: "2026-10-01" },
  },
  "p-003": {
    "GSTC":   { readinessPct: 89, readyCriteria: 34, totalCriteria: 38, gapCount: 4, missingEvidence: 2, owner: "Demo Checker", dueDate: "2026-05-30" },
    "EU-ECO": { readinessPct: 72, readyCriteria: 48, totalCriteria: 67, gapCount: 19, missingEvidence: 11, owner: "Demo Checker", dueDate: "2026-09-15" },
  },
  "p-004": {
    "GREEN-KEY": { readinessPct: 80, readyCriteria: 36, totalCriteria: 45, gapCount: 9, missingEvidence: 3, owner: "Demo Maker", dueDate: "2026-06-15" },
    "TRAVELIFE": { readinessPct: 77, readyCriteria: 125, totalCriteria: 163, gapCount: 38, missingEvidence: 14, owner: "Demo Maker", dueDate: "2026-11-01" },
  },
  "p-005": {
    "GSTC":        { readinessPct: 71, readyCriteria: 27, totalCriteria: 38, gapCount: 11, missingEvidence: 7, owner: "Demo Maker", dueDate: "2026-07-01" },
    "GREEN-GLOBE": { readinessPct: 65, readyCriteria: 29, totalCriteria: 44, gapCount: 15, missingEvidence: 9, owner: "Demo Maker", dueDate: "2026-08-30" },
  },
};

export function getAttributeHistory(propertyId: string): AttributeChange[] {
  if (propertyId === "p-001") {
    return [
      {
        id: "ah-1",
        field: "rooms",
        oldValue: "416",
        newValue: "420",
        changedBy: "Demo Admin",
        changedAt: "2026-04-02 11:14",
        effectiveAt: "2026-04-01",
        reason: "Renovated south wing — 4 additional rooms put back into service",
      },
      {
        id: "ah-2",
        field: "fbOutlets",
        oldValue: "5",
        newValue: "6",
        changedBy: "Demo Admin",
        changedAt: "2026-03-28 09:30",
        effectiveAt: "2026-04-15",
        reason: "Coffee shop opened in lobby — counts as new F&B outlet",
      },
      {
        id: "ah-3",
        field: "baselineYear",
        oldValue: "2021",
        newValue: "2022",
        changedBy: "Demo Admin",
        changedAt: "2025-12-10 16:02",
        effectiveAt: "2026-01-01",
        reason: "First full year of approved data complete — adopting 2022 as GP baseline",
      },
      {
        id: "ah-4",
        field: "poolCount",
        oldValue: "2",
        newValue: "3",
        changedBy: "Demo Checker",
        changedAt: "2025-08-12 14:20",
        effectiveAt: "2025-08-01",
        reason: "Lazy river commissioned",
      },
    ];
  }
  return [
    {
      id: "ah-1",
      field: "operationType",
      oldValue: "limited-service",
      newValue: "full-service",
      changedBy: "Demo Admin",
      changedAt: "2026-02-08 13:25",
      effectiveAt: "2026-02-01",
      reason: "F&B expansion — repositioned as full-service",
    },
  ];
}

export function getQrPoints(propertyId: string): QrPoint[] {
  if (propertyId === "p-001") {
    return [
      { id: "qr-1", label: "Kitchen — Loading Bay",        location: "Back of house", stream: "Organic / food",   active: true,  scansLast30d: 142, printedAt: "2026-01-12" },
      { id: "qr-2", label: "F&B — Recycling Station 1",    location: "Lobby",         stream: "Mixed recyclable", active: true,  scansLast30d: 98,  printedAt: "2026-01-12" },
      { id: "qr-3", label: "Housekeeping — Linen Room",    location: "B1",            stream: "Mixed recyclable", active: true,  scansLast30d: 76,  printedAt: "2025-11-04" },
      { id: "qr-4", label: "Pool Bar — Glass",             location: "Pool deck",     stream: "Glass",            active: true,  scansLast30d: 42,  printedAt: "2026-01-12" },
      { id: "qr-5", label: "Gardens — Hazardous (paint)",  location: "South gate",    stream: "Hazardous",        active: false, scansLast30d: 0,   printedAt: "2024-08-20" },
    ];
  }
  return [
    { id: "qr-1", label: "Kitchen — Loading Bay", location: "Back of house", stream: "Organic / food", active: true, scansLast30d: 64, printedAt: "2025-12-04" },
    { id: "qr-2", label: "Lobby — Recyclable",    location: "Lobby",         stream: "Mixed recyclable", active: true, scansLast30d: 38, printedAt: "2025-12-04" },
  ];
}

/* ============================================================== */
/* Form option lists */

export const REGIONS = ["APAC", "EMEA", "Americas", "Africa", "MENA"] as const;
export const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Copenhagen",
  "Europe/Istanbul",
  "Europe/Zurich",
  "Europe/Madrid",
  "Europe/Lisbon",
  "Europe/Paris",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Vancouver",
  "Australia/Melbourne",
];
export const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SGD", "JPY", "CAD", "AUD", "CHF", "ZAR", "IDR", "THB", "PHP", "TRY", "DKK"] as const;
export const OPERATION_TYPES: { key: OperationType; label: string }[] = [
  { key: "full-service",     label: "Full-service hotel" },
  { key: "resort",           label: "Resort" },
  { key: "limited-service",  label: "Limited-service" },
  { key: "extended-stay",    label: "Extended-stay" },
];
export const OWNERSHIP_TYPES: { key: OwnershipType; label: string }[] = [
  { key: "owned",      label: "Owned" },
  { key: "managed",    label: "Managed" },
  { key: "franchised", label: "Franchised" },
];
export const LAUNDRY_TYPES: { key: LaundryType; label: string }[] = [
  { key: "on-site",     label: "On-site" },
  { key: "outsourced",  label: "Outsourced" },
  { key: "hybrid",      label: "Hybrid" },
];
export const CERTIFICATIONS: { key: CertificationProgramme; label: string }[] = [
  { key: "GSTC",        label: "GSTC" },
  { key: "HSB",         label: "Hotel Sustainability Basics" },
  { key: "GREEN-KEY",   label: "Green Key" },
  { key: "GREEN-GLOBE", label: "Green Globe" },
  { key: "LEED-OM",     label: "LEED O+M" },
  { key: "TRAVELIFE",   label: "Travelife" },
  { key: "EU-ECO",      label: "EU Ecolabel" },
];
