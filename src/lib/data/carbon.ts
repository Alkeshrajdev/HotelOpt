/**
 * The GHG inventory for one property and one reporting year (May → April), computed
 * from approved records against the published factor library.
 *
 * Where each line comes from:
 *   Scope 1   natural gas and diesel from `consumption_records` at the combustion
 *             boundary, plus refrigerant events from `emission_activities` × GWP.
 *   Scope 2   grid electricity and district cooling at the location_based boundary,
 *             resolved against the property's grid or utility before its country.
 *             Market-based is not modelled — no contractual instruments are recorded
 *             anywhere in the app, so the figure is reported as unavailable.
 *   Scope 3   Cat 1 purchases and water supply/treatment · Cat 2 capital goods ·
 *             Cat 3 the wtt and t_and_d boundaries of the same energy records ·
 *             Cat 4 upstream freight · Cat 5 waste by material and route · Cat 6
 *             business travel · Cat 7 commuting. Cat 8–15 are listed as not
 *             applicable with the reason, which is itself a disclosure requirement.
 *
 * Two calculation behaviours, deliberately different:
 *   * Utility lines are recomputed from the library on every load, so correcting a
 *     factor restates them.
 *   * Activity lines use the tCO₂e stored on the row with the factor that produced it,
 *     so the number an approver saw is the number reported.
 */
import { useEffect, useMemo, useState } from "react";
import {
  listActivity, listEmissionActivities, listFactorSet, listFactorsByIds, listRecords,
  listUnitConversions,
  type ActivityRecord, type EfFactor, type EfUnitConversion, type EmissionActivity,
  type RecordWithProperty,
} from "@/lib/api";
import {
  CATEGORY_LABEL, ENERGY_SOURCE_FACTOR, SCOPE2_ENERGY_SOURCES, WASTE_STREAMS_WITHOUT_FACTORS,
  WATER_FACTOR, WATER_RETURN_SHARE, WATER_TREATMENT_KEY, convertUnit, geoChain, isProvisional,
  normUnit, resolveFactor, wasteFactorFor, type EfFactorRow,
} from "./factors";
import { reportingYearRange } from "./performance";

export type Scope = 1 | 2 | 3;

export type InventoryLine = {
  key: string;
  scope: Scope;
  category: string | null;
  label: string;
  /** What the factor was applied to, in words — the report's "Basis" column. */
  basis: string;
  quantity: number | null;
  quantityUnit: string | null;
  tco2e: number;
  factor: EfFactor | null;
  /** Set when the line is known to exist but could not be calculated. */
  gap?: string;
  /** A calculation detail worth stating that is not a problem — e.g. a unit conversion. */
  note?: string;
};

export type CategoryBlock = {
  category: string;
  label: string;
  tco2e: number;
  lines: InventoryLine[];
  status: "computed" | "no-data" | "not-applicable";
  reason?: string;
};

export type InventoryTotals = {
  scope1: number;
  scope2Location: number;
  /** null = not modelled; the app records no RECs, PPAs or supplier factors. */
  scope2Market: number | null;
  scope3: number;
  s1s2: number;
  gross: number;
};

export type Inventory = {
  year: number;
  scope1: InventoryLine[];
  scope2: InventoryLine[];
  scope3: CategoryBlock[];
  notApplicable: CategoryBlock[];
  totals: InventoryTotals;
  prior: InventoryTotals | null;
  /** kgCO₂e per occupied room night. */
  intensityS1S2: number | null;
  intensityGross: number | null;
  orn: number;
  factorsApplied: EfFactor[];
  /** Factors applied that the report must not present without their warning. */
  provisionalFactors: EfFactor[];
  /** Which geographies the Scope 2 lines actually resolved to. */
  geoUsed: string[];
  /** Rows captured but not yet approved — excluded from every figure above. */
  pending: { count: number; tco2e: number };
  /** The approved months themselves (YYYY-MM), so a mid-year gap shows in the right cell. */
  coverage: { energy: string[]; water: string[]; waste: string[]; activityRows: number };
};

/* ---------------- unit normalisation ---------------- */

/**
 * The record's quantity in a unit the library might publish. Only the energy-to-energy
 * conversions are done here; anything else (a mass or a volume of fuel) is left alone so
 * `energyLine` can try the library at that unit first and fall back to a real calorific
 * value. The old version relabelled every unrecognised unit as kWh, which turned 100 kg
 * of LPG into 100 kWh without a word.
 */
function energyQty(consumption: number, unit: string): { qty: number; unit: string } {
  const u = normUnit(unit);
  if (u === "mwh") return { qty: consumption * 1000, unit: "kWh" };
  if (u === "mj") return { qty: consumption / 3.6, unit: "kWh" };
  if (u === "m3") return { qty: consumption, unit: "m3" };
  if (u === "l") return { qty: consumption, unit: "L" };
  if (u === "kg") return { qty: consumption, unit: "kg" };
  if (u === "t") return { qty: consumption, unit: "t" };
  return { qty: consumption, unit: "kWh" };
}
const waterM3 = (v: number, unit: string) => (normUnit(unit) === "l" ? v / 1000 : v);
/** Waste factors are published per tonne. */
const wasteTonnes = (v: number, unit: string) => (normUnit(unit) === "t" ? v : v / 1000);

const ymOf = (d: string) => d.slice(0, 7);
const inYear = (periodStart: string, year: number) => periodStart >= `${year}-05-01` && periodStart < `${year + 1}-05-01`;

const ENERGY_LABEL: Record<string, string> = {
  electricity_grid: "Purchased electricity — grid",
  district_cooling: "Purchased district cooling",
  natural_gas: "Natural gas — boilers & kitchen",
  diesel: "Diesel — standby generators",
  solar_pv: "On-site solar PV",
};
const SCOPE2_SOURCES = SCOPE2_ENERGY_SOURCES;
const SCOPE1_SOURCES = ["natural_gas", "diesel"];

const BOUNDARY_WORDS: Record<string, string> = {
  combustion: "combustion", location_based: "location-based",
  t_and_d: "transmission & distribution", wtt: "well-to-tank",
};

/** Cat 8–15: not applicable for a hotel operator under operational control, with the reason. */
const NOT_APPLICABLE: { category: string; reason: string }[] = [
  { category: "cat8",  reason: "Leased hotels under operational control are already consolidated into Scope 1 and 2; no other upstream leases are held." },
  { category: "cat9",  reason: "The service is consumed on the premises — there is no onward distribution of a sold product." },
  { category: "cat10", reason: "No intermediate products are sold for further processing." },
  { category: "cat11", reason: "Accommodation is consumed during the stay; there is no sold product with a use phase." },
  { category: "cat12", reason: "No physical products are sold, so there is no end-of-life treatment to report." },
  { category: "cat13", reason: "Applies to space let to third parties (retail units, spa or restaurant concessions). No sub-let space is recorded for this property." },
  { category: "cat14", reason: "The portfolio is operated, not franchised. Relevant only to a brand with franchise agreements." },
  { category: "cat15", reason: "No equity or debt investments are held by the operating entity." },
];

/* ---------------- the builder ---------------- */

function totalsOf(scope1: InventoryLine[], scope2: InventoryLine[], scope3: CategoryBlock[]): InventoryTotals {
  const s1 = scope1.reduce((s, l) => s + l.tco2e, 0);
  const s2 = scope2.reduce((s, l) => s + l.tco2e, 0);
  const s3 = scope3.reduce((s, c) => s + c.tco2e, 0);
  return { scope1: s1, scope2Location: s2, scope2Market: null, scope3: s3, s1s2: s1 + s2, gross: s1 + s2 + s3 };
}

type YearParts = {
  scope1: InventoryLine[]; scope2: InventoryLine[]; scope3: CategoryBlock[];
  factors: EfFactor[]; geoUsed: string[];
};

function buildYear(
  year: number,
  records: RecordWithProperty[],
  activities: EmissionActivity[],
  factors: EfFactorRow[],
  conversions: EfUnitConversion[],
  activityFactors: Map<string, EfFactor>,
  geo: string[],
): YearParts {
  const approved = records.filter((r) => r.status === "approved" && inYear(r.period_start, year));
  const acts = activities.filter((a) => a.status === "approved" && inYear(a.period_start, year));
  const used = new Map<string, EfFactor>();
  const geoUsed = new Set<string>();
  const remember = (f: EfFactor | null | undefined) => { if (f) used.set(f.id, f); return f ?? null; };

  const energy = approved.filter((r) => r.pillar === "energy" && r.energy_source);
  const water = approved.filter((r) => r.pillar === "water");
  const waste = approved.filter((r) => r.pillar === "waste");

  /** Sum one energy source at one boundary, converting each record into the factor's unit. */
  function energyLine(
    source: string,
    boundary: "location_based" | "combustion" | "wtt" | "t_and_d",
    opts: { scope: Scope; category: string | null; label: string; basis: string },
  ): InventoryLine | null {
    const rows = energy.filter((r) => r.energy_source === source);
    if (!rows.length) return null;
    const map = ENERGY_SOURCE_FACTOR[source];
    if (!map) return null;
    let kg = 0, qty = 0, unit = "kWh";
    let factor: EfFactor | null = null;
    let missing = 0;
    let converted = 0;
    rows.forEach((r) => {
      const e = energyQty(r.consumption, r.unit);
      // The library publishes natural gas per m3 and diesel per litre, so try the
      // record's own unit first and only convert when there is nothing to match.
      let hit = resolveFactor(factors, {
        domain: map.domain, activityKey: map.activityKey, boundary, unit: e.unit, year, geo,
      });
      let useQty = e.qty;
      let useUnit = e.unit;
      if (!hit) {
        const conv = convertUnit(conversions, e.qty, e.unit, "kWh", map.fuelName);
        if (conv) {
          const viaKwh = resolveFactor(factors, {
            domain: map.domain, activityKey: map.activityKey, boundary, unit: "kWh", year, geo,
          });
          if (viaKwh) { hit = viaKwh; useQty = conv.value; useUnit = "kWh"; converted += 1; }
        }
      }
      if (!hit) { missing += 1; return; }
      factor = hit.factor; unit = useUnit;
      if (boundary === "location_based") geoUsed.add(hit.why.geo);
      qty += useQty;
      kg += useQty * hit.value;
    });
    const key = `${boundary}-${source}`;
    if (!factor) {
      return {
        key, scope: opts.scope, category: opts.category, label: opts.label, basis: opts.basis,
        quantity: null, quantityUnit: null, tco2e: 0, factor: null,
        gap: `The library has no ${BOUNDARY_WORDS[boundary] ?? boundary} factor for ${ENERGY_LABEL[source] ?? source} at this location.`,
      };
    }
    remember(factor);
    return {
      key, scope: opts.scope, category: opts.category, label: opts.label, basis: opts.basis,
      quantity: Math.round(qty), quantityUnit: unit, tco2e: kg / 1000, factor,
      gap: missing
        ? `${missing} record(s) are in a unit neither the library nor its conversion table can reach, and are excluded.`
        : converted
          ? undefined
          : undefined,
      note: converted ? `${converted} record(s) converted to kWh using the fuel's published calorific value.` : undefined,
    };
  }

  /** Group activity rows by the factor they stored and sum the tCO₂e computed at capture. */
  function activityLines(scope: Scope, category: string | null, keyPrefix: string): InventoryLine[] {
    const rows = acts.filter((a) => a.scope === scope && (a.category ?? null) === category);
    const groups = new Map<string, EmissionActivity[]>();
    rows.forEach((a) => {
      const k = a.ef_id ?? a.factor_key ?? a.activity_type;
      groups.set(k, [...(groups.get(k) ?? []), a]);
    });
    return [...groups.entries()].map(([gk, rs]) => {
      const factor = remember(rs[0].ef_id ? activityFactors.get(rs[0].ef_id) : null);
      const tier = rs[0].tier;
      return {
        key: `${keyPrefix}-${gk}`,
        scope, category,
        label: rs[0].description ?? factor?.activity ?? "Activity",
        basis: tier === 3 ? "Spend × EEIO factor (tier 3)"
          : tier === 2 ? "Activity × product-class average (tier 2)"
          : "Supplier-specific / measured (tier 1)",
        quantity: +rs.reduce((s, a) => s + Number(a.quantity), 0).toFixed(1),
        quantityUnit: rs[0].unit,
        tco2e: rs.reduce((s, a) => s + Number(a.tco2e ?? 0), 0),
        factor,
      } satisfies InventoryLine;
    }).sort((a, b) => b.tco2e - a.tco2e);
  }

  /* Scope 1 — combustion on site plus fugitive refrigerant */
  const scope1: InventoryLine[] = SCOPE1_SOURCES
    .map((s) => energyLine(s, "combustion", {
      scope: 1, category: null, label: ENERGY_LABEL[s] ?? s,
      basis: "Metered consumption × published combustion factor",
    }))
    .filter((l): l is InventoryLine => l !== null);
  activityLines(1, null, "fugitive").forEach((l) => {
    scope1.push({
      ...l,
      label: `Refrigerant released — ${l.factor?.subtype ?? l.factor?.activity ?? "gas"}`,
      basis: "Charged less recovered × GWP (IPCC AR5)",
    });
  });

  /* Scope 2 — purchased energy, location-based */
  const scope2: InventoryLine[] = SCOPE2_SOURCES
    .map((s) => energyLine(s, "location_based", {
      scope: 2, category: null, label: ENERGY_LABEL[s] ?? s,
      basis: s === "electricity_grid"
        ? "Metered consumption × the grid factor for this site"
        : "Metered consumption × published factor",
    }))
    .filter((l): l is InventoryLine => l !== null);

  /* Scope 3 · Cat 1 — purchases, plus water as a purchased upstream service */
  const cat1Lines = activityLines(3, "cat1", "purchase");
  const metered = water.filter((r) => {
    const src = String((r.source_payload as Record<string, unknown> | null)?.source ?? "municipal");
    return !!WATER_FACTOR[src];
  });
  if (metered.length) {
    const m3 = metered.reduce((s, r) => s + waterM3(r.consumption, r.unit), 0);
    const supply = resolveFactor(factors, { domain: "water", activityKey: "water_supply", boundary: "lifecycle", unit: "m3", year, geo });
    const treat = resolveFactor(factors, { domain: "water", activityKey: WATER_TREATMENT_KEY, boundary: "lifecycle", unit: "m3", year, geo });
    if (supply) {
      remember(supply.factor);
      cat1Lines.push({
        key: "water-supply", scope: 3, category: "cat1", label: "Water supply",
        basis: "Metered supply × supply factor",
        quantity: Math.round(m3), quantityUnit: "m³",
        tco2e: (m3 * supply.value) / 1000, factor: supply.factor,
      });
    }
    if (treat) {
      remember(treat.factor);
      cat1Lines.push({
        key: "water-treatment", scope: 3, category: "cat1", label: "Wastewater treatment",
        basis: `${Math.round(WATER_RETURN_SHARE * 100)}% of metered supply × treatment factor`,
        quantity: Math.round(m3 * WATER_RETURN_SHARE), quantityUnit: "m³",
        tco2e: (m3 * WATER_RETURN_SHARE * treat.value) / 1000, factor: treat.factor,
      });
    }
  }

  /* Scope 3 · Cat 3 — the wtt and t_and_d boundaries of the energy already counted */
  const cat3Lines: InventoryLine[] = [];
  [...SCOPE1_SOURCES, "electricity_grid", "district_cooling"].forEach((source) => {
    const line = energyLine(source, "wtt", {
      scope: 3, category: "cat3",
      label: `${(ENERGY_LABEL[source] ?? source).replace(/ — .*$/, "")} — well-to-tank`,
      basis: "Same consumption × upstream factor",
    });
    if (line && (line.tco2e > 0 || line.gap)) cat3Lines.push(line);
  });
  const td = energyLine("electricity_grid", "t_and_d", {
    scope: 3, category: "cat3", label: "Grid transmission & distribution losses",
    basis: "Purchased electricity × T&D loss factor",
  });
  if (td && (td.tco2e > 0 || td.gap)) cat3Lines.push(td);

  /* Scope 3 · Cat 5 — waste by material and route */
  const buckets = new Map<string, RecordWithProperty[]>();
  waste.forEach((r) => {
    const p = (r.source_payload as Record<string, unknown> | null) ?? {};
    const bucket = `${String(p.stream ?? "mixed")}|${String(p.route ?? "landfill")}`;
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), r]);
  });
  const cat5Lines: InventoryLine[] = [...buckets.entries()].map(([bucket, rows]) => {
    const [stream, route] = bucket.split("|");
    const t = rows.reduce((s, r) => s + wasteTonnes(r.consumption, r.unit), 0);
    const target = wasteFactorFor(stream, route);
    const hit = target
      ? resolveFactor(factors, {
        domain: "waste", activityKey: target.activityKey, boundary: "disposal",
        unit: "t", year, geo, variant: target.variant,
      })
      : null;
    if (hit) remember(hit.factor);
    const routeLabel = route === "incineration" ? "energy recovery" : route.replace(/-/g, " ");
    const known = WASTE_STREAMS_WITHOUT_FACTORS[stream];
    return {
      key: `waste-${stream}-${route}`, scope: 3 as Scope, category: "cat5",
      label: `${hit?.factor.subtype ?? stream} — ${routeLabel}`,
      basis: "Collected mass × the factor for that material and route",
      quantity: +t.toFixed(1), quantityUnit: "t",
      tco2e: hit ? (t * hit.value) / 1000 : 0,
      factor: hit?.factor ?? null,
      gap: hit
        ? undefined
        : known ?? `No published factor for ${stream} waste sent to ${routeLabel}. The mass is recorded; the emissions cannot be calculated from it.`,
    };
  }).sort((a, b) => b.tco2e - a.tco2e);

  const blocks: CategoryBlock[] = [
    { category: "cat1", lines: cat1Lines },
    { category: "cat2", lines: activityLines(3, "cat2", "capital") },
    { category: "cat3", lines: cat3Lines },
    { category: "cat4", lines: activityLines(3, "cat4", "freight") },
    { category: "cat5", lines: cat5Lines },
    { category: "cat6", lines: activityLines(3, "cat6", "travel") },
    { category: "cat7", lines: activityLines(3, "cat7", "commute") },
  ].map(({ category, lines }) => ({
    category,
    label: CATEGORY_LABEL[category],
    lines,
    tco2e: lines.reduce((s, l) => s + l.tco2e, 0),
    status: lines.length ? ("computed" as const) : ("no-data" as const),
    reason: lines.length ? undefined : "No approved activity data for this category in the reporting year.",
  }));

  return { scope1, scope2, scope3: blocks, factors: [...used.values()], geoUsed: [...geoUsed] };
}

export function buildInventory(
  year: number,
  records: RecordWithProperty[],
  activities: EmissionActivity[],
  activityRecords: ActivityRecord[],
  factors: EfFactorRow[],
  conversions: EfUnitConversion[],
  activityFactors: EfFactor[],
  geo: string[],
): Inventory {
  const byId = new Map(activityFactors.map((f) => [f.id, f]));
  const current = buildYear(year, records, activities, factors, conversions, byId, geo);
  const previous = buildYear(year - 1, records, activities, factors, conversions, byId, geo);

  const totals = totalsOf(current.scope1, current.scope2, current.scope3);
  const priorTotals = totalsOf(previous.scope1, previous.scope2, previous.scope3);
  const hasPrior = priorTotals.gross > 0;

  const orn = activityRecords
    .filter((a) => a.status === "approved" && inYear(a.period_start, year))
    .reduce((s, a) => s + a.occupied_room_nights, 0);

  const pendingRows = activities.filter((a) => a.status === "submitted" && inYear(a.period_start, year));

  const monthsWith = (pillar: string) =>
    [...new Set(
      records
        .filter((r) => r.status === "approved" && r.pillar === pillar && inYear(r.period_start, year))
        .map((r) => ymOf(r.period_start)),
    )].sort();

  const applied = current.factors.sort(
    (a, b) => a.scope - b.scope
      || (a.category ?? "").localeCompare(b.category ?? "")
      || a.activity.localeCompare(b.activity));

  return {
    year,
    scope1: current.scope1,
    scope2: current.scope2,
    scope3: current.scope3,
    notApplicable: NOT_APPLICABLE.map(({ category, reason }) => ({
      category, label: CATEGORY_LABEL[category], tco2e: 0, lines: [],
      status: "not-applicable" as const, reason,
    })),
    totals,
    prior: hasPrior ? priorTotals : null,
    intensityS1S2: orn > 0 ? (totals.s1s2 * 1000) / orn : null,
    intensityGross: orn > 0 ? (totals.gross * 1000) / orn : null,
    orn,
    factorsApplied: applied,
    provisionalFactors: applied.filter(isProvisional),
    geoUsed: current.geoUsed,
    pending: { count: pendingRows.length, tco2e: pendingRows.reduce((s, a) => s + Number(a.tco2e ?? 0), 0) },
    coverage: {
      energy: monthsWith("energy"),
      water: monthsWith("water"),
      waste: monthsWith("waste"),
      activityRows: activities.filter((a) => a.status === "approved" && inYear(a.period_start, year)).length,
    },
  };
}

/** The twelve month keys of a reporting year, May → April — the order the strips draw in. */
export function reportingYearMonths(year: number): { ym: string; month: number }[] {
  return [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4].map((m) => ({
    ym: `${m >= 5 ? year : year + 1}-${String(m).padStart(2, "0")}`,
    month: m,
  }));
}

/** The library slice the inventory needs: this site's utility factors, every boundary. */
const INVENTORY_DOMAINS = ["electricity", "fuel", "heat", "water", "waste"];
const INVENTORY_BOUNDARIES = ["location_based", "combustion", "wtt", "t_and_d", "lifecycle", "disposal"];

/** Loads the reporting year and the one before it for one property. */
export function usePropertyInventory(
  propertyId: string | null,
  year: number,
  geo: { gridCode?: string | null; country?: string | null },
  enabled: boolean,
) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Inventory | null }>({
    loading: enabled, error: null, data: null,
  });
  const chainKey = `${geo.gridCode ?? ""}|${geo.country ?? ""}`;
  useEffect(() => {
    if (!enabled || !propertyId) { setState({ loading: false, error: null, data: null }); return; }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const { from } = reportingYearRange(year - 1);
    const { to } = reportingYearRange(year);
    const chain = geoChain(geo.gridCode, geo.country);

    Promise.all([
      listRecords({ propertyId, from, to, status: "approved", limit: 3000, orderBy: "period_start" }),
      listEmissionActivities({ propertyId, from, to, status: ["approved", "submitted"] }),
      listActivity({ propertyId, from, to }),
      listFactorSet({ domains: INVENTORY_DOMAINS, geoCodes: chain, boundaries: INVENTORY_BOUNDARIES }),
      listUnitConversions(),
    ])
      .then(async ([records, activities, activityRecords, factors, conversions]) => {
        if (cancelled) return;
        // Activity rows keep the factor they were calculated with; fetch exactly those.
        const activityFactors = await listFactorsByIds(
          activities.map((a) => a.ef_id).filter((id): id is string => !!id),
        );
        if (cancelled) return;
        setState({
          loading: false, error: null,
          data: buildInventory(year, records, activities, activityRecords, factors, conversions, activityFactors, chain),
        });
      })
      .catch((e: Error) => { if (!cancelled) setState({ loading: false, error: e.message, data: null }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, year, chainKey, enabled]);
  return useMemo(() => state, [state]);
}

/* ---------------- formatting helpers shared by the two views ---------------- */

export const fmtT = (n: number) => (n >= 100 ? Math.round(n).toLocaleString("en-US") : n.toFixed(1));

export const factorLabel = (f: EfFactor | null | undefined) =>
  f
    ? `${Number(f.value).toLocaleString("en-US", { maximumFractionDigits: 5 })} ${f.unit_numerator.replace("CO2e", "CO₂e")}/${f.unit_denominator}`
    : "—";

/** The factor's own name, for the provenance table. */
export const factorName = (f: EfFactor | null | undefined) =>
  f
    ? (f.subtype && f.subtype !== f.activity ? `${f.activity} — ${f.subtype}` : f.activity)
      + (f.variant ? ` (${f.variant.replace(/_/g, " ")})` : "")
    : "—";

export const deltaPct = (now: number, before: number | null | undefined) =>
  before && before > 0 ? +(((now - before) / before) * 100).toFixed(1) : 0;
