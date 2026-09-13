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
import type { EfFactor, EfUnitConversion } from "@/lib/api";

/** A factor with its dataset's precedence, which is what breaks a tie between sources. */
export type EfFactorRow = EfFactor & { dataset?: { precedence: number; publisher: string } | null };

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
 * Where a variant is not requested, prefer the plainest reading of the factor: no
 * column-group at all, then the Kyoto basket (the reporting basis) over the
 * total-including-non-Kyoto memo column, then radiative forcing included.
 *
 * This is the *last* tie-break, not the first. Choosing a variant before choosing a
 * source used to hand R-410A to EPA's unvarianted row instead of DEFRA's Kyoto column,
 * because `null` sorts first here.
 */
const VARIANT_PREFERENCE = [null, "kyoto", "with_rf", "total"];
const variantRank = (v: string | null) => {
  const i = VARIANT_PREFERENCE.indexOf(v);
  return i === -1 ? VARIANT_PREFERENCE.length : i;
};

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
export function resolveFactor(factors: EfFactorRow[], q: FactorQuery): Resolved | null {
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

  // An explicitly requested variant is a filter; an unrequested one is only a tie-break.
  if (q.variant !== undefined) {
    pool = pool.filter((f) => (f.variant ?? null) === (q.variant ?? null));
    if (!pool.length) return null;
  }

  // Geography: the first link in the chain that has anything.
  const chain = (q.geo?.filter(Boolean) as string[] | undefined) ?? ["GLOBAL"];
  const geo = chain.find((code) => pool.some((f) => f.geo_code === code));
  if (!geo) return null;
  pool = pool.filter((f) => f.geo_code === geo);

  // Year: the newest at or before the reporting year; only reach forward if nothing older exists.
  const atOrBefore = pool.filter((f) => f.factor_year !== null && f.factor_year <= q.year);
  const dated = pool.filter((f) => f.factor_year !== null);
  const yearIsLater = atOrBefore.length === 0 && dated.length > 0;
  const bestYear = atOrBefore.length
    ? Math.max(...atOrBefore.map((f) => f.factor_year as number))
    : dated.length
      ? Math.min(...dated.map((f) => f.factor_year as number))
      : null;
  const sameYear = pool.filter((f) => (f.factor_year ?? null) === bestYear);
  const candidates = sameYear.length ? sameYear : pool;

  // The documented order, all of it: a client's own factor, then the dataset that the
  // library prefers, then the default flag, then the variant.
  const ranked = [...candidates].sort((a, b) =>
    Number(Boolean(b.client_id)) - Number(Boolean(a.client_id))
    || (a.dataset?.precedence ?? 99) - (b.dataset?.precedence ?? 99)
    || Number(b.is_default) - Number(a.is_default)
    || variantRank(a.variant ?? null) - variantRank(b.variant ?? null)
    || a.activity.localeCompare(b.activity));

  const factor = ranked[0];
  return {
    factor,
    value: Number(factor.value),
    why: { geo, year: factor.factor_year, yearIsLater, candidates: pool.length },
  };
}

/* ---------------- unit conversion ---------------- */

/**
 * Convert a quantity between units using the library's own conversion table, which
 * carries DEFRA's per-fuel calorific values and densities. Tries a direct hop, then one
 * hop through kilograms (natural gas reaches kWh as m3 -> kg -> kWh, 0.802 x 14.077).
 *
 * Returns null when no path exists — the caller reports that rather than guessing, which
 * is what the old catch-all did when it relabelled kilograms as kWh.
 */
export function convertUnit(
  conversions: EfUnitConversion[],
  value: number,
  from: string,
  to: string,
  fuel?: string | null,
): { value: number; path: string } | null {
  const f = canonicalUnit(from);
  const t = canonicalUnit(to);
  if (f === t) return { value, path: f };

  // Fuel-specific rows first; the generic ones (t->kg, MWh->kWh) carry no fuel.
  const usable = conversions.filter((c) => !c.fuel || (fuel && c.fuel.toLowerCase() === fuel.toLowerCase()));
  const direct = usable.find((c) => canonicalUnit(c.from_unit) === f && canonicalUnit(c.to_unit) === t);
  if (direct) return { value: value * Number(direct.factor), path: `${f} → ${t}` };

  const inverse = usable.find((c) => canonicalUnit(c.from_unit) === t && canonicalUnit(c.to_unit) === f);
  if (inverse && Number(inverse.factor) !== 0) {
    return { value: value / Number(inverse.factor), path: `${f} → ${t}` };
  }

  for (const via of ["kg", "t", "L"]) {
    if (via === f || via === t) continue;
    const a = usable.find((c) => canonicalUnit(c.from_unit) === f && canonicalUnit(c.to_unit) === via);
    const b = usable.find((c) => canonicalUnit(c.from_unit) === via && canonicalUnit(c.to_unit) === t);
    if (a && b) {
      return { value: value * Number(a.factor) * Number(b.factor), path: `${f} → ${via} → ${t}` };
    }
  }
  return null;
}

/** kgCO₂e for a quantity, or null when no factor applies. */
export function applyFactor(factors: EfFactor[], q: FactorQuery, quantity: number) {
  const r = resolveFactor(factors, q);
  return r ? { ...r, kg: quantity * r.value } : null;
}

/* ---------------- capture form values → the library's taxonomy ---------------- */

/** What the energy capture form calls a source, and what the library calls it. */
export const ENERGY_SOURCE_FACTOR: Record<string, { domain: string; activityKey: string; fuelName?: string }> = {
  electricity_grid: { domain: "electricity", activityKey: "electricity_grid" },
  solar_pv:         { domain: "electricity", activityKey: "solar_pv" },
  district_cooling: { domain: "heat",        activityKey: "district_cooling" },
  natural_gas:      { domain: "fuel",        activityKey: "natural_gas", fuelName: "Natural Gas" },
  // DEFRA separates road diesel from gas oil; a standby generator burns the mineral grade.
  diesel:           { domain: "fuel",        activityKey: "diesel_100_pct_mineral_diesel", fuelName: "Diesel (100% mineral diesel)" },
};

/** Sources whose emissions are Scope 2 (purchased or self-generated electricity and heat). */
export const SCOPE2_ENERGY_SOURCES = ["electricity_grid", "district_cooling", "solar_pv"];

/** Water capture supply type → the library's water rows. Recycled and rainwater carry no supply factor. */
export const WATER_FACTOR: Record<string, string | null> = {
  municipal: "water_supply", borewell: "water_supply", recycled: null, rainwater: null,
};
export const WATER_TREATMENT_KEY = "water_treatment";
/** Share of metered supply assumed to return to sewer, so treatment is not over-counted. */
export const WATER_RETURN_SHARE = 0.95;

/**
 * Waste is material × route in every published set, so the capture form's stream and
 * disposal route resolve together. A stream the library does not cover returns null and
 * the inventory reports the gap — it does not borrow another material's factor, which is
 * what "hazardous" used to do by silently becoming mixed commercial refuse.
 */
export const WASTE_STREAM_KEY: Record<string, string> = {
  mixed: "commercial_and_industrial_waste",
  landfill: "commercial_and_industrial_waste",
  household: "household_residual_waste",
  organic: "organic_mixed_food_and_garden_waste",
  "organic-food": "organic_food_and_drink_waste",
  "organic-garden": "organic_garden_waste",
  recyclable: "mixed_recyclables",
  paper: "paper_and_board_mixed",
  card: "paper_and_board_board",
  glass: "glass",
  plastic: "plastics_average_plastics",
  "plastic-film": "plastics_average_plastic_film",
  metal: "metal_mixed_cans",
  "metal-scrap": "metal_scrap_metal",
  ewaste: "weee_mixed",
  batteries: "batteries",
  textiles: "clothing",
  construction: "average_construction",
  oil: "mineral_oil",
};

export const WASTE_ROUTE_VARIANT: Record<string, string> = {
  landfill: "landfill",
  incineration: "energy_recovery",
  recycled: "open_loop",
  "recycled-closed": "closed_loop",
  composted: "composting",
  anaerobic: "anaerobic_digestion",
  donated: "donated",
};

/** Streams the forms offer that no published set prices. The mass is still recorded. */
export const WASTE_STREAMS_WITHOUT_FACTORS: Record<string, string> = {
  hazardous: "No published set prices a generic hazardous stream — only asbestos, which is its own line.",
};

export function wasteFactorFor(stream: string | null | undefined, route: string | null | undefined) {
  const r = route ?? "landfill";
  if (r === "donated") return { activityKey: "donated_food", variant: "donated" };
  const key = WASTE_STREAM_KEY[stream ?? "mixed"];
  const variant = WASTE_ROUTE_VARIANT[r];
  if (!key || !variant) return null;
  return { activityKey: key, variant };
}

/** Travel and commute mode → the library's row. */
export const TRAVEL_MODE_FACTOR: Record<string, { activityKey: string; variant?: string | null; unit: string }> = {
  "air-short":     { activityKey: "short_haul_to_from_uk", variant: "with_rf", unit: "pkm" },
  "air-long":      { activityKey: "long_haul_to_from_uk", variant: "with_rf", unit: "pkm" },
  "air-intl":      { activityKey: "international_to_from_non_uk", variant: "with_rf", unit: "pkm" },
  rail:            { activityKey: "national_rail", variant: null, unit: "pkm" },
  bus:             { activityKey: "average_local_bus", variant: null, unit: "pkm" },
  // Car factors are published per vehicle-km, not per passenger-km.
  "car-petrol":    { activityKey: "average_car", variant: "petrol", unit: "km" },
  "car-diesel":    { activityKey: "average_car", variant: "diesel", unit: "km" },
  "car-ev":        { activityKey: "average_car", variant: "battery_electric_vehicle", unit: "km" },
  // Hotel stays are filed per country, so the key comes from `hotelStayKey` and the
  // capture form has to ask where the stay was.
  "hotel-stay":    { activityKey: "", variant: null, unit: "night" },
};

/**
 * ISO2 of the country stayed in → the library's hotel-stay row. DEFRA files these by
 * country name, so the key is the slug of that name; London has its own row.
 */
export const HOTEL_STAY_KEY: Record<string, string> = {
  GB: "uk", "GB-LND": "uk_london", AU: "australia", BE: "belgium", BR: "brazil",
  CA: "canada", CL: "chile", CN: "china", CO: "colombia", EG: "egypt", FR: "france",
  DE: "germany", IN: "india", ID: "indonesia", IT: "italy", JP: "japan", JO: "jordan",
  MY: "malaysia", MV: "maldives", MX: "mexico", NL: "netherlands", OM: "oman",
  PH: "philippines", PT: "portugal", QA: "qatar", SA: "saudi_arabia", SG: "singapore",
  ZA: "south_africa", ES: "spain", CH: "switzerland", TH: "thailand", TR: "turkey",
  AE: "united_arab_emirates", VN: "vietnam",
};

export const hotelStayKey = (iso2: string | null | undefined) =>
  (iso2 ? HOTEL_STAY_KEY[iso2] : undefined) ?? null;

/**
 * Flights are published per haul *and* per cabin class; the difference between economy
 * and business on a long-haul is roughly 2.2x, so the class is not a detail.
 */
const CABIN_SUFFIX: Record<string, string> = {
  average: "average_passenger",
  economy: "economy_class",
  premium: "premium_economy_class",
  business: "business_class",
  first: "first_class",
};

export const flightKey = (mode: string, cabinClass?: string | null) => {
  const base = TRAVEL_MODE_FACTOR[mode]?.activityKey;
  if (!base) return null;
  return `${base}_${CABIN_SUFFIX[cabinClass ?? "average"] ?? CABIN_SUFFIX.average}`;
};

export const isFlight = (mode: string) => mode.startsWith("air-");

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
