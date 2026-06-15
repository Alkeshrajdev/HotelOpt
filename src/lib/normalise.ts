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

import {
  PORTFOLIO_HOTELS,
  SCOPE1_BREAKDOWN,
  SCOPE2_METHODS,
  PORTFOLIO_SCOPE3_CATEGORIES,
} from "./mock";

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

// ─────────────────────────────────────────────────────────────────────────────
// Canonical portfolio spine — the single dataset every headline number derives
// from. Historically OverviewTab + the Performance hub rendered a separate
// ~⅛-scale "Scale A" dataset; everything now resolves through PORTFOLIO (totals)
// and CARBON (GHG-Protocol scope decomposition), which reconcile exactly:
//   Scope 1 + Scope 2 (location) + Scope 3  ==  Σ PORTFOLIO_HOTELS.carbon_t.
// ─────────────────────────────────────────────────────────────────────────────

const sumHotels = (pick: (h: (typeof PORTFOLIO_HOTELS)[number]) => number) =>
  PORTFOLIO_HOTELS.reduce((s, h) => s + pick(h), 0);

/** Canonical portfolio totals (annual, all 10 hotels). */
export const PORTFOLIO = {
  orn:            sumHotels((h) => h.orn),               // 715,000
  gn:             sumHotels((h) => h.gn),                // 992,300
  energyMwh:      sumHotels((h) => h.energy_mwh),        // 84,200
  waterM3:        sumHotels((h) => h.water_m3),          // 552,000
  wasteT:         sumHotels((h) => h.waste_t),           // 8,420
  utilityCostUsd: sumHotels((h) => h.utility_cost_usd),  // 12,892,000
} as const;

/** Carbon spine — GHG-Protocol scope decomposition (tCO₂e). Headline = S1+2. */
const _s1 = SCOPE1_BREAKDOWN.reduce((s, x) => s + x.tco2e, 0);          // 3,428
const _s2loc = SCOPE2_METHODS.locationBased.tco2e;                      // 14,569
const _s2mkt = SCOPE2_METHODS.marketBased.tco2e;                        // 12,400
const _s3 = PORTFOLIO_SCOPE3_CATEGORIES.reduce((s, x) => s + x.tco2e, 0); // 24,853

export const CARBON = {
  scope1:         _s1,
  scope2Location: _s2loc,
  scope2Market:   _s2mkt,
  scope3:         _s3,
  /** Headline operational footprint — Scope 1 + 2 (location-based). */
  s1s2:           _s1 + _s2loc,            // 17,997
  /** Total incl. value chain — for the "Scope 3 shown separately" context. */
  total:          _s1 + _s2loc + _s3,      // 42,850
} as const;

// Portfolio intensities off the canonical spine.
/** Headline carbon intensity — Scope 1+2 per ORN (kgCO₂e/ORN). */
export const carbonS12PerOrn = () => (CARBON.s1s2 * 1000) / PORTFOLIO.orn;        // 25.2
/** Total-footprint carbon intensity per ORN — incl. Scope 3. */
export const carbonTotalPerOrn = () => (CARBON.total * 1000) / PORTFOLIO.orn;     // 59.9
export const portfolioEnergyPerOrnTotal = () => (PORTFOLIO.energyMwh * 1000) / PORTFOLIO.orn; // 117.8

/**
 * Per-hotel scope split. The S1/S2/S3 breakdown only exists at portfolio level,
 * so Scope 1+2 is allocated to each hotel by its share of portfolio energy
 * (S1 combustion + S2 electricity both track energy), and Scope 3 is the
 * residual against the hotel's known total. By construction the hotel totals
 * and the per-scope sums both reconcile to the portfolio.
 */
export const hotelCarbon = (h: { energy_mwh: number; carbon_t: number; orn: number }) => {
  const s1s2 = CARBON.s1s2 * (h.energy_mwh / PORTFOLIO.energyMwh);
  const s3 = h.carbon_t - s1s2;
  return {
    s1s2,
    s3,
    total: h.carbon_t,
    s1s2PerOrn: (s1s2 * 1000) / h.orn,
    totalPerOrn: (h.carbon_t * 1000) / h.orn,
  };
};
