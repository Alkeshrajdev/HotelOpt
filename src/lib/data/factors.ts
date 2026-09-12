/**
 * Choosing an emission factor.
 *
 * The library holds ~3,700 factors from four published datasets (see ef_datasets), so
 * nothing loads the whole thing. A page fetches the narrow slice it needs — the domains
 * and geographies for one property — and resolves within it.
 *
 * An activity is identified by four things, not one:
 *
 *   domain        electricity, fuel, heat, refrigerant, water, waste, travel, spend, …
 *   activity_key  the publisher's row, normalised (natural_gas, r410a, average_car)
 *   boundary      what the factor measures. This is the load-bearing one: a grid
 *                 factor (location_based), its T&D losses (t_and_d) and its upstream
 *                 fuel cycle (wtt) are three separate factors for the same activity,
 *                 and adding a Cat 3 boundary into Scope 2 is the classic error the
 *                 owner's Grid Master methodology warns about.
 *   unit          matched against the factor's own denominator, never converted blind.
 *
 * Resolution order, in full:
 *   1. a client's own factor beats shared reference data
 *   2. geography: utility/grid → subdivision → country → GLOBAL
 *   3. factor year: the newest year at or before the inventory year; a later-dated
 *      factor is only used when nothing older exists, and is flagged when it is
 *   4. dataset precedence, then is_default
 *
 * Nothing is invented. When no factor matches, the caller gets null and says so.
 */
import type { EfFactor } from "@/lib/api";

export type Boundary =
  | "combustion" | "location_based" | "market_based" | "t_and_d" | "wtt"
  | "disposal" | "gwp" | "lifecycle" | "out_of_scope";

export const normUnit = (u: string) => u.replace("³", "3").replace("₂", "2").trim().toLowerCase();

/** Units the capture forms can produce, mapped onto the denominators the library publishes. */
const UNIT_ALIAS: Record<string, string> = {
  "m³": "m3", m3: "m3", l: "L", litres: "L", litre: "L",
  kwh: "kWh", mwh: "MWh", t: "t", tonnes: "t", tonne: "t", kg: "kg",
  pkm: "pkm", km: "km", mi: "mi", miles: "mi", tkm: "tkm",
  night: "night", nights: "night", usd: "USD",
};

export const canonicalUnit = (u: string) => UNIT_ALIAS[normUnit(u)] ?? u.trim();

export type FactorQuery = {
  domain: string;
  activityKey: string;
  boundary: Boundary;
  unit: string;
  /** Reporting year the factor is being applied to. */
  year: number;
  /** Geography preference, most specific first. Built by `geoChain`. */
  geo?: (string | null | undefined)[];
  /** Exact column-group to match. Omit to let `VARIANT_PREFERENCE` choose. */
  variant?: string | null;
};

export type Resolved = {
  factor: EfFactor;
  /** kgCO₂e for one unit — the factor's value, restated for clarity at the call site. */
  value: number;
  /** Why this row rather than another, for the report's provenance line. */
  why: { geo: string; year: number | null; yearIsLater: boolean; candidates: number };
};

/**
 * Where a variant is not requested, prefer the plainest reading of the factor:
 * no column-group at all, then the Kyoto basket (the reporting basis) over the
 * total-including-non-Kyoto memo column, then radiative forcing included.
 */
const VARIANT_PREFERENCE = [null, "kyoto", "with_rf", "total"];

/** Geography chain for a property: its grid or utility, then its country, then GLOBAL. */
export function geoChain(gridCode?: string | null, country?: string | null): string[] {
  const chain: string[] = [];
  if (gridCode) chain.push(gridCode);
  if (country) {
    // A subdivision code like GB-LND also answers to its country.
    const parent = country.includes("-") ? country.split("-")[0] : null;
    chain.push(country);
    if (parent) chain.push(parent);
  }
  chain.push("GLOBAL");
  return [...new Set(chain)];
}

/** The one factor to apply, or null when the library has nothing for this activity. */
export function resolveFactor(factors: EfFactor[], q: FactorQuery): Resolved | null {
  const unit = canonicalUnit(q.unit);
  let pool = factors.filter(
    (f) =>
      f.domain === q.domain &&
      f.activity_key === q.activityKey &&
      f.boundary === q.boundary &&
      f.unit_denominator === unit &&
      f.status !== "superseded",
  );
  if (!pool.length) return null;

  if (q.variant !== undefined) {
    pool = pool.filter((f) => (f.variant ?? null) === (q.variant ?? null));
  } else {
    const ranked = VARIANT_PREFERENCE.map((v) => pool.filter((f) => (f.variant ?? null) === v)).find((g) => g.length);
    pool = ranked ?? pool;
  }
  if (!pool.length) return null;

  // Geography: the first link in the chain that has anything.
  const chain = (q.geo?.filter(Boolean) as string[] | undefined) ?? ["GLOBAL"];
  const geo = chain.find((code) => pool.some((f) => f.geo_code === code));
  if (!geo) return null;
  pool = pool.filter((f) => f.geo_code === geo);

  // Year: the newest at or before the reporting year; only reach forward if nothing older exists.
  const atOrBefore = pool.filter((f) => f.factor_year !== null && f.factor_year <= q.year);
  const yearIsLater = atOrBefore.length === 0 && pool.some((f) => f.factor_year !== null);
  const byYear = atOrBefore.length
    ? atOrBefore
    : pool.some((f) => f.factor_year !== null)
      ? [...pool].sort((a, b) => (a.factor_year ?? 0) - (b.factor_year ?? 0))
      : pool;
  const bestYear = atOrBefore.length
    ? Math.max(...atOrBefore.map((f) => f.factor_year as number))
    : byYear[0]?.factor_year ?? null;
  let chosen = byYear.filter((f) => (f.factor_year ?? null) === bestYear);
  if (!chosen.length) chosen = byYear;

  // A client's own factor wins; then dataset precedence, then the default flag.
  chosen.sort((a, b) =>
    Number(Boolean(b.client_id)) - Number(Boolean(a.client_id)) ||
    Number(b.is_default) - Number(a.is_default) ||
    a.activity.localeCompare(b.activity));

  const factor = chosen[0];
  return {
    factor,
    value: Number(factor.value),
    why: { geo, year: factor.factor_year, yearIsLater, candidates: pool.length },
  };
}

/** kgCO₂e for a quantity, or null when no factor applies. */
export function applyFactor(factors: EfFactor[], q: FactorQuery, quantity: number) {
  const r = resolveFactor(factors, q);
  return r ? { ...r, kg: quantity * r.value } : null;
}

/* ---------------- capture form values → the library's taxonomy ---------------- */

/** What the energy capture form calls a source, and what the library calls it. */
export const ENERGY_SOURCE_FACTOR: Record<string, { domain: string; activityKey: string }> = {
  electricity_grid: { domain: "electricity", activityKey: "electricity_grid" },
  solar_pv:         { domain: "electricity", activityKey: "solar_pv" },
  district_cooling: { domain: "heat",        activityKey: "district_cooling" },
  natural_gas:      { domain: "fuel",        activityKey: "natural_gas" },
  // DEFRA separates road diesel from gas oil; a standby generator burns the mineral grade.
  diesel:           { domain: "fuel",        activityKey: "diesel_100_pct_mineral_diesel" },
};

/** Water capture supply type → the library's water rows. Recycled and rainwater carry no supply factor. */
export const WATER_FACTOR: Record<string, string | null> = {
  municipal: "water_supply", borewell: "water_supply", recycled: null, rainwater: null,
};
export const WATER_TREATMENT_KEY = "water_treatment";
/** Share of metered supply assumed to return to sewer, so treatment is not over-counted. */
export const WATER_RETURN_SHARE = 0.95;

/**
 * Waste is material × route in every published set, so the capture form's stream and
 * disposal route resolve together. A combination the library does not cover returns
 * null and the inventory reports the gap rather than borrowing another material's factor.
 */
export const WASTE_STREAM_KEY: Record<string, string> = {
  mixed: "commercial_and_industrial_waste",
  landfill: "commercial_and_industrial_waste",
  organic: "organic_mixed_food_and_garden_waste",
  recyclable: "mixed_recyclables",
  glass: "glass",
  paper: "paper_and_board_mixed",
  plastic: "plastics_average_plastics",
  metal: "metal_mixed_cans",
  ewaste: "weee_mixed",
  construction: "average_construction",
};

export const WASTE_ROUTE_VARIANT: Record<string, string | null> = {
  landfill: "landfill",
  incineration: "energy_recovery",
  recycled: "open_loop",
  composted: "composting",
  donated: "donated",
};

export function wasteFactorFor(stream: string | null | undefined, route: string | null | undefined) {
  const r = route ?? "landfill";
  if (r === "donated") return { activityKey: "donated_food", variant: "donated" };
  const key = WASTE_STREAM_KEY[stream ?? "mixed"] ?? WASTE_STREAM_KEY.mixed;
  const variant = WASTE_ROUTE_VARIANT[r];
  return variant ? { activityKey: key, variant } : null;
}

/** Travel and commute mode → the library's row. */
export const TRAVEL_MODE_FACTOR: Record<string, { activityKey: string; variant?: string | null; unit: string }> = {
  "air-short":     { activityKey: "short_haul_to_from_uk_average_passenger", variant: "with_rf", unit: "pkm" },
  "air-long":      { activityKey: "long_haul_to_from_uk_average_passenger", variant: "with_rf", unit: "pkm" },
  "air-intl":      { activityKey: "international_to_from_non_uk_average_passenger", variant: "with_rf", unit: "pkm" },
  rail:            { activityKey: "national_rail", variant: null, unit: "pkm" },
  bus:             { activityKey: "average_local_bus", variant: null, unit: "pkm" },
  // Car factors are published per vehicle-km, not per passenger-km.
  "car-petrol":    { activityKey: "average_car", variant: "petrol", unit: "km" },
  "car-diesel":    { activityKey: "average_car", variant: "diesel", unit: "km" },
  "car-ev":        { activityKey: "average_car", variant: "battery_electric_vehicle", unit: "km" },
  "hotel-stay":    { activityKey: "hotel_stay", variant: null, unit: "night" },
};

/**
 * Refrigerant gas code → the library's slug.
 *
 * Two naming conventions collide. DEFRA files blends under their ASHRAE number with no
 * hyphen (R410A) but pure gases under their chemical designation (HFC-134a), while the
 * capture form and EPA use the hyphenated ASHRAE form throughout. Stripping punctuation
 * handles the blends; the aliases handle the pure gases and CO2.
 */
const REFRIGERANT_ALIAS: Record<string, string> = {
  r134a: "hfc134a", r134: "hfc134", r32: "hfc32", r23: "hfc23", r125: "hfc125",
  r143a: "hfc143a", r152a: "hfc152a", r227ea: "hfc227ea", r236fa: "hfc236fa",
  r245fa: "hfc245fa", r365mfc: "hfc365mfc", r41: "hfc41",
  r744: "carbon_dioxide", co2: "carbon_dioxide", r717: "ammonia", r290: "propane",
  r600a: "isobutane", r1270: "propene",
};

export const refrigerantKey = (gas: string) => {
  const bare = gas.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return REFRIGERANT_ALIAS[bare] ?? bare;
};

/** Spend-based purchases resolve by NAICS-6. */
export const naicsKey = (code: string) => `naics_${code.trim()}`;

/** Human labels for the fifteen Scope 3 categories. */
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

/** A factor the report should not present without its warning. */
export const isProvisional = (f: EfFactor | null | undefined) =>
  !!f && (f.status !== "production" || ["B-", "C", "Hold"].includes(f.reliability ?? ""));
