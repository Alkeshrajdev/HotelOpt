// ─────────────────────────────────────────────────────────────────────────────
// Data Readiness — the single monthly-status model.
//
// One source of truth for *submission/bill-level* data coverage and abnormal-value
// detection, driven by the canonical PORTFOLIO_HOTELS dataset and the Genuine
// Performance driver model (lib/genuinePerformance.ts). It powers both the
// property Data Readiness tab and ReviewApproval's Capture Status tab, so the two
// can never drift apart.
//
// Two things live here:
//   1. A deterministic monthly series per (property, dataType): { month, value,
//      status, responsible } over a rolling 24 months (we keep 24 so YoY anomaly
//      detection has a prior year; the UI shows the last 12).
//   2. detectAnomalies() — flags abnormal monthly values against three bases:
//        • prior month (MoM)
//        • same month last year (YoY)
//        • a DRIVER-NORMALISED expected value (degree-days · occupancy · activity),
//          reusing the GP SENSITIVITY shares so a hot month or a fuller hotel is
//          NOT falsely flagged. The driver-normalised deviation is the headline;
//          MoM/YoY are shown as supporting context.
//
// Everything is generated deterministically (a seeded hash, no Math.random / Date),
// so values reconcile across reloads and between the two consuming pages.
// ─────────────────────────────────────────────────────────────────────────────

import { PORTFOLIO_HOTELS } from "./mock";
import { SENSITIVITY, type GpUtility } from "./genuinePerformance";

export type ReadinessStatus = "approved" | "submitted" | "draft" | "missing" | "na";

export type Pillar = "Energy" | "Water" | "Waste" | "Carbon" | "Activity" | "Social";

export type Contact = { name: string; email: string; role: string };

export type MonthCell = {
  month: string;            // "YYYY-MM"
  status: ReadinessStatus;
  value: number | null;     // native unit; null when missing / na
};

export type ReadinessRow = {
  key: string;
  dataType: string;
  pillar: Pillar;
  unit: string;
  gpUtility: GpUtility | null; // drives the driver-normalised anomaly basis
  responsible: Contact;
  cells: Record<string, MonthCell>; // keyed by month (24 months)
};

export type AnomalySeverity = "warn" | "critical";

export type Anomaly = {
  property: string;
  rowKey: string;
  dataType: string;
  pillar: Pillar;
  unit: string;
  month: string;
  monthLabel: string;
  actual: number;
  expected: number;          // driver-normalised expected
  driverDevPct: number;      // (actual − expected) / expected · 100  — headline
  momPct: number | null;     // vs prior month
  yoyPct: number | null;     // vs same month last year
  severity: AnomalySeverity;
  direction: "spike" | "drop";
  likelyCause: string;       // utility-specific investigation hint
  seasonNote: string | null; // context: was the raw swing partly seasonal?
  responsible: Contact;
};

// ── Calendar ─────────────────────────────────────────────────────────────────
// Rolling window ending the current month (the app's "today" is mid-2026). The
// latest month is in-progress, so it reads mostly draft/missing — realistic.
const END_YEAR = 2026;
const END_MONTH = 6; // June 2026
const TOTAL_MONTHS = 24;

function buildMonths(endYear: number, endMonth: number, count: number): string[] {
  const out: string[] = [];
  let y = endYear;
  let m = endMonth;
  for (let i = 0; i < count; i++) {
    out.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

export const ALL_MONTHS = buildMonths(END_YEAR, END_MONTH, TOTAL_MONTHS); // 24 ascending
export const DISPLAY_MONTHS = ALL_MONTHS.slice(TOTAL_MONTHS - 12); // last 12

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_ABBR[m - 1]} '${String(y).slice(2)}`;
}
function calMonth(month: string): number {
  return Number(month.split("-")[1]); // 1..12
}

// ── Seeded determinism ───────────────────────────────────────────────────────
function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32; // 0..1
}

// ── Seasonal driver profiles ─────────────────────────────────────────────────
// 12 monthly weights (Jan..Dec) averaging 1.0. The same profile shapes both the
// generated actuals and the driver-normalised "expected", so ordinary seasonality
// never trips an anomaly — only the planted perturbations do.
type SeasonKey = "cooling" | "heating" | "occupancy" | "flat";
const SEASONS: Record<SeasonKey, number[]> = {
  // Northern-hemisphere cooling load — summer peak.
  cooling:   [0.78, 0.80, 0.88, 0.98, 1.12, 1.28, 1.34, 1.30, 1.12, 0.95, 0.80, 0.65],
  // Heating fuel — winter peak.
  heating:   [1.42, 1.34, 1.12, 0.92, 0.72, 0.55, 0.50, 0.52, 0.70, 0.95, 1.22, 1.44],
  // Occupancy — summer high + a December holiday bump.
  occupancy: [0.86, 0.84, 0.92, 1.00, 1.08, 1.18, 1.24, 1.22, 1.06, 0.96, 0.88, 1.16],
  flat:      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

// ── Data types (rows of the matrix) ──────────────────────────────────────────
type DataTypeDef = {
  key: string;
  label: string;
  pillar: Pillar;
  unit: string;
  gpUtility: GpUtility | null;
  season: SeasonKey;
  role: string;
  // annual total for this hotel in `unit` (null share => not applicable)
  annual: (h: Hotel) => number | null;
};

type Hotel = (typeof PORTFOLIO_HOTELS)[number];

// Climate sets driving which fuels are applicable.
const WARM = new Set([
  "Skyline Dubai", "Airport Hotel Dubai", "Bay View Singapore",
  "Riverside Bangkok", "Oceanfront Cape Town",
]);
const COLD = new Set([
  "The Pavilion London", "Grand Harbour Lisbon", "The Montrose Paris",
  "Peaks Resort Zermatt", "Marina Residences Barcelona",
]);

const DATA_TYPES: DataTypeDef[] = [
  // Energy
  { key: "electricity",    label: "Electricity",        pillar: "Energy", unit: "MWh",   gpUtility: "energy", season: "cooling", role: "Property Manager",
    annual: (h) => h.energy_mwh * (COLD.has(h.name) ? 0.82 : 0.72) },
  { key: "district-cool",  label: "District cooling",   pillar: "Energy", unit: "MWh",   gpUtility: "energy", season: "cooling", role: "Facilities Lead",
    annual: (h) => (WARM.has(h.name) ? h.energy_mwh * 0.18 : null) },
  { key: "natural-gas",    label: "Natural gas",        pillar: "Energy", unit: "MWh",   gpUtility: "energy", season: "heating", role: "Facilities Lead",
    annual: (h) => (COLD.has(h.name) ? h.energy_mwh * 0.14 : null) },
  { key: "diesel",         label: "Diesel (standby)",   pillar: "Energy", unit: "L",     gpUtility: "energy", season: "flat",    role: "Facilities Lead",
    annual: (h) => h.energy_mwh * 6 }, // ~litres equiv, illustrative
  // Water
  { key: "water",          label: "Water (municipal)",  pillar: "Water",  unit: "m³",    gpUtility: "water",  season: "cooling", role: "Facilities Lead",
    annual: (h) => h.water_m3 },
  // Waste streams
  { key: "waste-landfill", label: "General waste",      pillar: "Waste",  unit: "t",     gpUtility: "waste",  season: "occupancy", role: "Facilities Lead",
    annual: (h) => h.waste_t * (1 - h.diversion_pct / 100) },
  { key: "waste-recycle",  label: "Recycled",           pillar: "Waste",  unit: "t",     gpUtility: "waste",  season: "occupancy", role: "Facilities Lead",
    annual: (h) => h.waste_t * (h.diversion_pct / 100) * 0.55 },
  { key: "waste-compost",  label: "Composted",          pillar: "Waste",  unit: "t",     gpUtility: "waste",  season: "occupancy", role: "Facilities Lead",
    annual: (h) => h.waste_t * (h.diversion_pct / 100) * 0.30 },
  { key: "waste-wte",      label: "Waste-to-energy",    pillar: "Waste",  unit: "t",     gpUtility: "waste",  season: "occupancy", role: "Facilities Lead",
    annual: (h) => (h.diversion_pct >= 40 ? h.waste_t * (h.diversion_pct / 100) * 0.15 : null) },
  // Carbon (fugitive)
  { key: "refrigerant",    label: "Refrigerant top-up", pillar: "Carbon", unit: "kgCO₂e", gpUtility: "carbon", season: "cooling", role: "Engineering" ,
    annual: (h) => h.carbon_t * 1000 * 0.03 },
  // Activity drivers (no driver-normalisation — they ARE the drivers)
  { key: "occupancy",      label: "Occupancy / ORN",    pillar: "Activity", unit: "ORN", gpUtility: null,     season: "occupancy", role: "Property Manager",
    annual: (h) => h.orn },
  { key: "covers",         label: "F&B covers",         pillar: "Activity", unit: "covers", gpUtility: null,  season: "occupancy", role: "F&B Manager",
    annual: (h) => h.gn * 0.8 },
  // Social
  { key: "headcount",      label: "Headcount (FTE)",    pillar: "Social", unit: "FTE",   gpUtility: null,     season: "flat",    role: "HR Manager",
    annual: (h) => Math.round(h.rooms * 0.9) * 12 },
  { key: "training",       label: "Training hours",     pillar: "Social", unit: "hrs",   gpUtility: null,     season: "occupancy", role: "HR Manager",
    annual: (h) => Math.round(h.rooms * 0.9) * 14 },
];

export const PILLAR_ORDER: Pillar[] = ["Energy", "Water", "Waste", "Carbon", "Activity", "Social"];

// ── Responsible contacts (deterministic per hotel + role) ────────────────────
const FIRST = ["Priya", "James", "Sophie", "Carlos", "Anita", "Yuki", "Fatima", "Nina", "Diego", "Mei", "Omar", "Lena"];
const LAST  = ["Nair", "Okafor", "Laurent", "Mendoza", "Roy", "Tanaka", "Al-Rashid", "Patel", "Costa", "Lim", "Haddad", "Berg"];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function contactFor(h: Hotel, role: string): Contact {
  const s = seed(h.id + role);
  const fi = Math.floor(s * FIRST.length);
  const li = Math.floor(seed(h.id + role + "l") * LAST.length);
  const first = FIRST[fi];
  const last = LAST[li];
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${slug(last)}@${slug(h.shortName)}.com`,
    role,
  };
}

// ── Value + status generation ────────────────────────────────────────────────
// actual[m] = perMonthBaseline × seasonalWeight[m] × (1 + perturbation[m]).
// expected[m] (driver-normalised) recomputes the same seasonal-shaped baseline,
// so deviation === perturbation. Most perturbations are small (±4%); a seeded
// minority are planted spikes/drops that the detector then surfaces.
function perturbation(h: Hotel, dt: DataTypeDef, month: string): number {
  const r = seed(`${h.id}|${dt.key}|${month}`);
  // Low-confidence hotels are noisier (their meters are less trustworthy).
  const noiseAmp = 0.025 + (1 - h.dataConfidence / 100) * 0.05;
  const base = (seed(`${h.id}|${dt.key}|${month}|n`) - 0.5) * 2 * noiseAmp;
  // Planted anomalies — rarer, larger. Bias frequency up for low-confidence sites.
  const spikeGate = 0.955 - (1 - h.dataConfidence / 100) * 0.05;
  const dropGate  = 0.03 + (1 - h.dataConfidence / 100) * 0.04;
  if (r > spikeGate) return base + (0.20 + seed(`${h.id}|${dt.key}|${month}|s`) * 0.22); // +20..42%
  if (r < dropGate)  return base - (0.18 + seed(`${h.id}|${dt.key}|${month}|d`) * 0.18); // −18..36%
  return base;
}

function expectedValue(h: Hotel, dt: DataTypeDef, month: string, annual: number): number {
  const w = SEASONS[dt.season][calMonth(month) - 1];
  return (annual / 12) * w;
}

function actualValue(h: Hotel, dt: DataTypeDef, month: string, annual: number): number {
  return expectedValue(h, dt, month, annual) * (1 + perturbation(h, dt, month));
}

function statusFor(h: Hotel, dt: DataTypeDef, month: string, monthIdx: number): ReadinessStatus {
  const recency = ALL_MONTHS.length - 1 - monthIdx; // 0 = current (in-progress)
  const conf = h.dataConfidence / 100;
  const r = seed(`${h.id}|${dt.key}|${month}|st`);
  if (recency === 0) return r < 0.5 ? "missing" : r < 0.85 ? "draft" : "submitted";
  if (recency === 1) return r < 0.25 ? "missing" : r < 0.45 ? "submitted" : r < 0.6 ? "draft" : "approved";
  if (r < conf * 0.9) return "approved";
  if (r < conf) return "submitted";
  if (r < conf + 0.06) return "draft";
  return "missing";
}

// ── Public API ───────────────────────────────────────────────────────────────
function hotelByName(name: string): Hotel | undefined {
  return PORTFOLIO_HOTELS.find((h) => h.name === name);
}

/** Full readiness rows for a property (24-month series; UI windows to last 12). */
export function getReadiness(propertyName: string): ReadinessRow[] {
  const h = hotelByName(propertyName);
  if (!h) return [];
  return DATA_TYPES.map((dt) => {
    const annual = dt.annual(h);
    const responsible = contactFor(h, dt.role);
    const cells: Record<string, MonthCell> = {};
    ALL_MONTHS.forEach((month, idx) => {
      if (annual === null) {
        cells[month] = { month, status: "na", value: null };
        return;
      }
      const status = statusFor(h, dt, month, idx);
      const value = status === "missing" ? null : actualValue(h, dt, month, annual);
      cells[month] = { month, status, value };
    });
    return {
      key: dt.key,
      dataType: dt.label,
      pillar: dt.pillar,
      unit: dt.unit,
      gpUtility: dt.gpUtility,
      responsible,
      cells,
    };
  });
}

const WARN_DEV = 15;     // |driver-normalised deviation| % to warn
const CRITICAL_DEV = 30; // to flag critical

// A flagged anomaly is the RESIDUAL after weather / occupancy / activity have
// already been normalised out, so it is genuine by construction — the hint says
// what to physically check, not which driver "explains" it.
const INVESTIGATE: Record<GpUtility, string> = {
  energy: "Genuine — check HVAC schedule & sub-metering",
  water: "Genuine — check for a leak or meter mis-read",
  waste: "Genuine — check hauler weigh-tickets",
  carbon: "Genuine — check the refrigerant top-up log",
};

function causeFor(dt: DataTypeDef): string {
  if (!dt.gpUtility) return "Check submission / data entry";
  return INVESTIGATE[dt.gpUtility];
}

/** Context only: was the same month's raw level seasonally high/low? (Helps the
 *  reviewer see the swing isn't seasonal — the normalisation already removed it.) */
function seasonNoteFor(dt: DataTypeDef, month: string): string | null {
  if (!dt.gpUtility) return null;
  const w = SEASONS[dt.season][calMonth(month) - 1];
  if (w > 1.12) return "Seasonal demand already removed from the expectation";
  if (w < 0.88) return "Seasonal low already removed from the expectation";
  return null;
}

/** Detect abnormal monthly values across the display window for a property. */
export function detectAnomalies(propertyName: string): Anomaly[] {
  const h = hotelByName(propertyName);
  if (!h) return [];
  const out: Anomaly[] = [];

  for (const dt of DATA_TYPES) {
    const annual = dt.annual(h);
    if (annual === null) continue;
    const responsible = contactFor(h, dt.role);

    for (const month of DISPLAY_MONTHS) {
      const idx = ALL_MONTHS.indexOf(month);
      const status = statusFor(h, dt, month, idx);
      if (status === "missing" || status === "na") continue; // no value to test

      const actual = actualValue(h, dt, month, annual);
      const expected = expectedValue(h, dt, month, annual);
      const driverDevPct = ((actual - expected) / expected) * 100;
      if (Math.abs(driverDevPct) < WARN_DEV) continue;

      // Supporting context: MoM and YoY (raw, not normalised).
      const prevMonth = ALL_MONTHS[idx - 1];
      const yoyMonth = ALL_MONTHS[idx - 12];
      const prevVal = prevMonth ? actualValue(h, dt, prevMonth, annual) : null;
      const yoyVal = yoyMonth ? actualValue(h, dt, yoyMonth, annual) : null;
      const momPct = prevVal ? ((actual - prevVal) / prevVal) * 100 : null;
      const yoyPct = yoyVal ? ((actual - yoyVal) / yoyVal) * 100 : null;

      const severity: AnomalySeverity = Math.abs(driverDevPct) >= CRITICAL_DEV ? "critical" : "warn";

      out.push({
        property: propertyName,
        rowKey: dt.key,
        dataType: dt.label,
        pillar: dt.pillar,
        unit: dt.unit,
        month,
        monthLabel: monthLabel(month),
        actual,
        expected,
        driverDevPct,
        momPct,
        yoyPct,
        severity,
        direction: driverDevPct >= 0 ? "spike" : "drop",
        likelyCause: causeFor(dt),
        seasonNote: seasonNoteFor(dt, month),
        responsible,
      });
    }
  }

  // Worst (largest absolute deviation) first.
  return out.sort((a, b) => Math.abs(b.driverDevPct) - Math.abs(a.driverDevPct));
}

// ── Summary helpers ──────────────────────────────────────────────────────────
export type ReadinessSummary = {
  monthsTracked: number;
  coveragePct: number;   // approved ÷ applicable cells over the display window
  approved: number;
  missing: number;
  pending: number;       // submitted + draft
  applicable: number;
  openAnomalies: number;
  criticalAnomalies: number;
};

export function readinessSummary(propertyName: string): ReadinessSummary {
  const rows = getReadiness(propertyName);
  let approved = 0, missing = 0, pending = 0, applicable = 0;
  for (const row of rows) {
    for (const month of DISPLAY_MONTHS) {
      const c = row.cells[month];
      if (!c || c.status === "na") continue;
      applicable++;
      if (c.status === "approved") approved++;
      else if (c.status === "missing") missing++;
      else pending++;
    }
  }
  const anomalies = detectAnomalies(propertyName);
  return {
    monthsTracked: DISPLAY_MONTHS.length,
    coveragePct: applicable ? Math.round((approved / applicable) * 100) : 0,
    approved,
    missing,
    pending,
    applicable,
    openAnomalies: anomalies.length,
    criticalAnomalies: anomalies.filter((a) => a.severity === "critical").length,
  };
}

/** Per-month coverage % (approved ÷ applicable) for the footer row. */
export function monthCoverage(rows: ReadinessRow[], month: string): number {
  let approved = 0, applicable = 0;
  for (const row of rows) {
    const c = row.cells[month];
    if (!c || c.status === "na") continue;
    applicable++;
    if (c.status === "approved") approved++;
  }
  return applicable ? Math.round((approved / applicable) * 100) : 0;
}

/** Per-row coverage % over the display window. */
export function rowCoverage(row: ReadinessRow): number {
  let approved = 0, applicable = 0;
  for (const month of DISPLAY_MONTHS) {
    const c = row.cells[month];
    if (!c || c.status === "na") continue;
    applicable++;
    if (c.status === "approved") approved++;
  }
  return applicable ? Math.round((approved / applicable) * 100) : 0;
}

// ── Portfolio roll-up (optional surfaces — dashboard "Needs attention") ───────
export type PortfolioReadinessRow = {
  name: string;
  coveragePct: number;
  missing: number;
  openAnomalies: number;
  criticalAnomalies: number;
};

export function portfolioReadiness(): PortfolioReadinessRow[] {
  return PORTFOLIO_HOTELS.map((h) => {
    const s = readinessSummary(h.name);
    return {
      name: h.name,
      coveragePct: s.coveragePct,
      missing: s.missing,
      openAnomalies: s.openAnomalies,
      criticalAnomalies: s.criticalAnomalies,
    };
  });
}

export function portfolioAnomalyCount(): number {
  return PORTFOLIO_HOTELS.reduce((n, h) => n + detectAnomalies(h.name).length, 0);
}
