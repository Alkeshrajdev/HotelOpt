/**
 * Matching captured activity to a row in the emission-factor library.
 *
 * The library holds two kinds of row. Energy rows are keyed by the `energy_source`
 * enum (grid electricity, gas, district cooling, diesel, solar) and are matched by
 * source + unit + property country. Everything else — refrigerant GWPs, waste-route
 * factors, fuel-and-energy upstream (WTT / T&D), water supply and treatment, travel
 * modes and spend-based EEIO factors — is keyed by `factor_key`, which is the same
 * code the capture form sends, so a form value maps to a factor without a lookup table.
 *
 * Region falls back to GLOBAL, then to a row with no region at all. A factor that does
 * not exist returns null: the caller says so rather than quietly emitting a zero.
 */
import type { EmissionFactor } from "@/lib/api";

export const normUnit = (u: string) => u.replace("³", "3").replace("₂", "2").trim().toLowerCase();

/** The denominator of `kgCO2e/kWh` — what the factor is multiplied by. */
export const efDenominator = (f: EmissionFactor) => normUnit(f.ef_unit.split("/")[1] ?? "");

/** Currencies the spend-based factors are denominated in. */
const SPEND_UNITS = new Set(["usd"]);
const MASS_UNITS = new Set(["kg", "t", "tonnes", "tonne"]);

export type FactorQuery = {
  /** Non-energy factor code, e.g. `R-410A`, `waste_landfill`, `travel_rail`, `eeio_cat1_food`. */
  key?: string | null;
  /** Energy enum value, e.g. `electricity_grid`. */
  source?: string | null;
  /** Unit of the quantity being converted — matched against the factor's denominator. */
  unit: string;
  /** Property country (ISO2 or ISO2-subdivision); GLOBAL is the fallback. */
  region?: string | null;
};

/** The one factor to apply, or null when the library has nothing for this activity. */
export function findFactor(factors: EmissionFactor[], q: FactorQuery): EmissionFactor | null {
  const unit = normUnit(q.unit);
  const candidates = factors.filter(
    (f) =>
      f.is_active &&
      efDenominator(f) === unit &&
      (q.key ? f.factor_key === q.key : f.source_type === q.source && f.factor_key === null),
  );
  if (!candidates.length) return null;
  const byRegion = (region: string | null) =>
    candidates.find((f) => (f.region ?? "GLOBAL") === (region ?? "GLOBAL")) ?? null;
  return byRegion(q.region ?? null) ?? byRegion("GLOBAL") ?? candidates[0];
}

/** kgCO₂e for a quantity, or null when no factor applies. */
export function applyFactor(factors: EmissionFactor[], q: FactorQuery, quantity: number) {
  const f = findFactor(factors, q);
  if (!f) return null;
  return { factor: f, kg: quantity * Number(f.ef_value) };
}

/* ---------------- form value → factor key ---------------- */

/** Refrigerant gas codes are the factor key itself (`R-410A`). */
export const refrigerantKey = (gas: string) => gas.trim();

/** Waste disposal route (`landfill`, `recycled`, …) → `waste_landfill`. */
export const wasteRouteKey = (route: string) => `waste_${route}`;

/** Travel or commute mode (`air-short`, `rail`, …) → `travel_air-short`. */
export const travelModeKey = (mode: string) => `travel_${mode}`;

/** Upstream (well-to-tank) key for an energy source. */
export const wttKey = (source: string) => `wtt_${source}`;

/** Grid transmission-and-distribution losses. */
export const TD_GRID_KEY = "td_electricity_grid";

export const WATER_SUPPLY_KEY = "water_supply";
export const WATER_TREATMENT_KEY = "water_treatment";
/** Share of metered supply assumed to return to sewer, so treatment is not over-counted. */
export const WATER_RETURN_SHARE = 0.95;

/**
 * Which purchase factor to apply. Spend rows use the category's EEIO factor (the
 * description picks food vs. goods vs. services for Cat 1); mass rows fall back to the
 * product-class average. Anything else — `units`, or a currency the library has no
 * factor for — returns null so the form can say what is missing.
 */
export function purchaseFactorKey(opts: {
  category: string;
  unit: string;
  description?: string | null;
}): { key: string; note?: string } | null {
  const unit = normUnit(opts.unit);
  if (SPEND_UNITS.has(unit)) {
    if (opts.category === "cat2") return { key: "eeio_cat2_capital" };
    if (opts.category === "cat4") return { key: "eeio_cat4_transport" };
    const text = (opts.description ?? "").toLowerCase();
    if (/food|beverage|f&b|kitchen|produce|meat|dairy|wine|catering/.test(text)) return { key: "eeio_cat1_food" };
    if (/service|cleaning|maintenance|consult|laundry|security|landscap|audit|licen/.test(text)) return { key: "eeio_cat1_services" };
    return { key: "eeio_cat1_goods" };
  }
  if (MASS_UNITS.has(unit) && opts.category === "cat1") {
    return { key: "goods_mass_average", note: "Tier 2 product-class average applied — no supplier-specific factor on file." };
  }
  return null;
}

/** Tonnes to kilograms, litres to m³ — the conversions the capture forms can produce. */
export function toFactorUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  const u = normUnit(unit);
  if (u === "t" || u === "tonnes" || u === "tonne") return { quantity: quantity * 1000, unit: "kg" };
  if (u === "km") return { quantity, unit: "pkm" };
  if (u === "nights") return { quantity, unit: "night" };
  if (u === "l" && quantity !== 0) return { quantity, unit: "L" };
  return { quantity, unit };
}

/** Human labels for the GHG scopes and the fifteen Scope 3 categories. */
export const CATEGORY_LABEL: Record<string, string> = {
  cat1: "Cat 1 — Purchased goods & services",
  cat2: "Cat 2 — Capital goods",
  cat3: "Cat 3 — Fuel & energy-related activities",
  cat4: "Cat 4 — Upstream transport & distribution",
  cat5: "Cat 5 — Waste generated in operations",
  cat6: "Cat 6 — Business travel",
  cat7: "Cat 7 — Employee commuting",
  cat8: "Cat 8 — Upstream leased assets",
  cat9: "Cat 9 — Downstream transport & distribution",
  cat10: "Cat 10 — Processing of sold products",
  cat11: "Cat 11 — Use of sold products",
  cat12: "Cat 12 — End-of-life of sold products",
  cat13: "Cat 13 — Downstream leased assets",
  cat14: "Cat 14 — Franchises",
  cat15: "Cat 15 — Investments",
};

export const CATEGORY_SHORT: Record<string, string> = {
  cat1: "Cat 1 — Purchased goods",
  cat2: "Cat 2 — Capital goods",
  cat3: "Cat 3 — Fuel & energy",
  cat4: "Cat 4 — Upstream transport",
  cat5: "Cat 5 — Waste",
  cat6: "Cat 6 — Business travel",
  cat7: "Cat 7 — Commuting",
};
