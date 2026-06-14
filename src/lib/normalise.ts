// ─────────────────────────────────────────────────────────────────────────────
// Canonical normalisation — single source of truth for intensity denominators.
//
// Task 1 (ORN normalisation): Occupied Room Nights (ORN) is THE canonical
// denominator for energy, carbon and cost. Water is the one deliberate
// exception — it stays on guest-nights (L/GN), the basis hotel water benchmarks
// (CHSB, HWMI) actually publish, because water tracks guests (showers, towels,
// laundry) more than room count. We still compute water/ORN internally so it
// folds correctly into cross-utility per-ORN headlines.
//
// Every on-screen intensity should resolve through this module so denominators
// can never drift again. Portfolio aggregates weight by the denominator
// (Σnumerator / Σdenominator) — never an average of per-hotel ratios.
// ─────────────────────────────────────────────────────────────────────────────

import { PORTFOLIO_HOTELS } from "./mock";

/** The shape any intensity helper needs. PORTFOLIO_HOTELS rows satisfy this. */
export type HotelMetrics = {
  orn: number;             // occupied room nights (period total)
  gn: number;              // guest nights (period total)
  arn?: number;            // available room nights (capacity) — for occupancy
  carbon_t: number;        // tCO₂e
  energy_mwh: number;      // MWh
  water_m3: number;        // m³
  utility_cost_usd: number;// total utility cost, USD
};

/** Canonical denominators. `label` is what the UI prints; never hard-code these. */
export const DENOM = {
  orn: {
    key: "orn",
    label: "ORN",
    long: "occupied room night",
    note: "Occupied Room Nights — the canonical occupancy denominator (energy, carbon, cost).",
  },
  gn: {
    key: "gn",
    label: "guest night",
    long: "guest night",
    note: "Guest Nights — retained for water only (CHSB/HWMI benchmark basis).",
  },
} as const;

/** Display units, derived from the canonical denominators. */
export const UNIT = {
  carbonOrn: `kgCO₂e/${DENOM.orn.label}`,
  energyOrn: `kWh/${DENOM.orn.label}`,
  costOrn:   `$/${DENOM.orn.label}`,
  waterGn:   `L/${DENOM.gn.label}`,
  waterOrn:  `L/${DENOM.orn.label}`,
} as const;

const safe = (num: number, den: number) => (den > 0 ? num / den : 0);

// ── Per-hotel intensities ────────────────────────────────────────────────────

/** kgCO₂e per occupied room night. */
export const carbonPerOrn = (h: HotelMetrics) => safe(h.carbon_t * 1000, h.orn);
/** kWh per occupied room night. */
export const energyPerOrn = (h: HotelMetrics) => safe(h.energy_mwh * 1000, h.orn);
/** USD per occupied room night. */
export const costPerOrn = (h: HotelMetrics) => safe(h.utility_cost_usd, h.orn);
/** Litres per guest night — the documented water exception (benchmark basis). */
export const waterPerGn = (h: HotelMetrics) => safe(h.water_m3 * 1000, h.gn);
/** Litres per occupied room night — internal, so water folds into per-ORN views. */
export const waterPerOrn = (h: HotelMetrics) => safe(h.water_m3 * 1000, h.orn);
/** Occupancy %, derived from ORN / available room nights. NaN if ARN unknown. */
export const occupancyPct = (h: HotelMetrics) =>
  h.arn && h.arn > 0 ? (h.orn / h.arn) * 100 : NaN;

// ── Portfolio aggregates (denominator-weighted) ──────────────────────────────

const sum = (hs: HotelMetrics[], pick: (h: HotelMetrics) => number) =>
  hs.reduce((s, h) => s + pick(h), 0);

export const portfolioCarbonPerOrn = (hs: HotelMetrics[] = PORTFOLIO_HOTELS) =>
  safe(sum(hs, (h) => h.carbon_t) * 1000, sum(hs, (h) => h.orn));
export const portfolioEnergyPerOrn = (hs: HotelMetrics[] = PORTFOLIO_HOTELS) =>
  safe(sum(hs, (h) => h.energy_mwh) * 1000, sum(hs, (h) => h.orn));
export const portfolioCostPerOrn = (hs: HotelMetrics[] = PORTFOLIO_HOTELS) =>
  safe(sum(hs, (h) => h.utility_cost_usd), sum(hs, (h) => h.orn));
export const portfolioWaterPerGn = (hs: HotelMetrics[] = PORTFOLIO_HOTELS) =>
  safe(sum(hs, (h) => h.water_m3) * 1000, sum(hs, (h) => h.gn));

// ── Lookup bridge ─────────────────────────────────────────────────────────────

/**
 * PORTFOLIO_HOTELS is the metrics source; propertiesData/RichProperty is the
 * registry. They share hotel names, so bridge by name to read ORN intensities
 * for a registry property.
 */
export const findHotelMetricsByName = (name: string) =>
  PORTFOLIO_HOTELS.find((h) => h.name === name);

/** Format an intensity for display, e.g. `fmtIntensity(86.7, UNIT.carbonOrn)`. */
export const fmtIntensity = (value: number, unit: string, digits = 1) =>
  `${value.toFixed(digits)} ${unit}`;
