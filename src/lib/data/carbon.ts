/**
 * The GHG inventory for one property and one reporting year (May → April), computed
 * from approved records rather than from constants.
 *
 * Where each line comes from:
 *   Scope 1   natural gas and diesel from `consumption_records`, plus refrigerant
 *             charge/recovery events from `emission_activities` × the gas's GWP.
 *   Scope 2   grid electricity and district cooling, location-based. Market-based is
 *             not modelled — no contractual instruments are recorded anywhere in the
 *             app, so the figure is reported as unavailable instead of invented.
 *   Scope 3   Cat 1 purchases (spend × EEIO) and water supply/treatment · Cat 2 capital
 *             goods · Cat 3 upstream fuel (WTT) and grid T&D losses, derived from the
 *             same energy records · Cat 4 upstream freight · Cat 5 waste by disposal
 *             route · Cat 6 business travel · Cat 7 commuting. Cat 8–15 are listed as
 *             not applicable with the reason, which is itself a disclosure requirement.
 *
 * Activity rows carry the factor that was applied at capture (`tco2e` stored on the
 * row), so a restatement can show what was used. Utility lines are recomputed from the
 * library each time, the same as the performance builder.
 */
import { useEffect, useMemo, useState } from "react";
import {
  listActivity, listEmissionActivities, listFactors, listRecords,
  type ActivityRecord, type EmissionActivity, type EmissionFactor, type RecordWithProperty,
} from "@/lib/api";
import {
  CATEGORY_LABEL, TD_GRID_KEY, WATER_RETURN_SHARE, WATER_SUPPLY_KEY, WATER_TREATMENT_KEY,
  findFactor, normUnit, wasteRouteKey, wttKey,
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
  factor: EmissionFactor | null;
  /** Set when the line is known to exist but could not be calculated. */
  gap?: string;
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
  factorsApplied: EmissionFactor[];
  /** Rows captured but not yet approved — excluded from every figure above. */
  pending: { count: number; tco2e: number };
  /** The approved months themselves (YYYY-MM), so a mid-year gap shows in the right cell. */
  coverage: { energy: string[]; water: string[]; waste: string[]; activityRows: number };
};

/* ---------------- unit normalisation ---------------- */

/** Energy records reach the factor library in the unit the factor is published in. */
function energyQty(consumption: number, unit: string): { qty: number; unit: string } {
  const u = normUnit(unit);
  if (u === "mwh") return { qty: consumption * 1000, unit: "kWh" };
  if (u === "mj") return { qty: consumption / 3.6, unit: "kWh" };
  if (u === "m3") return { qty: consumption, unit: "m3" };
  if (u === "l") return { qty: consumption, unit: "L" };
  return { qty: consumption, unit: "kWh" };
}
const waterM3 = (v: number, unit: string) => (normUnit(unit) === "l" ? v / 1000 : v);
const wasteKg = (v: number, unit: string) => (normUnit(unit) === "t" ? v * 1000 : v);

const ymOf = (d: string) => d.slice(0, 7);
const inYear = (periodStart: string, year: number) => periodStart >= `${year}-05-01` && periodStart < `${year + 1}-05-01`;

const ENERGY_LABEL: Record<string, string> = {
  electricity_grid: "Purchased electricity — grid",
  district_cooling: "Purchased district cooling",
  natural_gas: "Natural gas — boilers & kitchen",
  diesel: "Diesel — standby generators",
  solar_pv: "On-site solar PV",
};
const SCOPE2_SOURCES = ["electricity_grid", "district_cooling", "solar_pv"];

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

type YearParts = { scope1: InventoryLine[]; scope2: InventoryLine[]; scope3: CategoryBlock[]; factors: EmissionFactor[] };

function buildYear(
  year: number,
  records: RecordWithProperty[],
  activities: EmissionActivity[],
  factors: EmissionFactor[],
  country: string | null,
): YearParts {
  const approved = records.filter((r) => r.status === "approved" && inYear(r.period_start, year));
  const acts = activities.filter((a) => a.status === "approved" && inYear(a.period_start, year));
  const used = new Map<string, EmissionFactor>();
  const remember = (f: EmissionFactor | null) => { if (f) used.set(f.id, f); return f; };

  const energy = approved.filter((r) => r.pillar === "energy" && r.energy_source);
  const water = approved.filter((r) => r.pillar === "water");
  const waste = approved.filter((r) => r.pillar === "waste");

  /** Sum one energy source, converting every record into the factor's own unit. */
  function energyLine(source: string, scope: Scope): InventoryLine | null {
    const rows = energy.filter((r) => r.energy_source === source);
    if (!rows.length) return null;
    let kg = 0, qty = 0, unit = "kWh";
    let factor: EmissionFactor | null = null;
    let missing = false;
    rows.forEach((r) => {
      const e = energyQty(r.consumption, r.unit);
      const f = findFactor(factors, { source, unit: e.unit, region: country });
      if (!f) { missing = true; return; }
      factor = f; unit = e.unit;
      qty += e.qty;
      kg += e.qty * Number(f.ef_value);
    });
    remember(factor);
    return {
      key: `energy-${source}`, scope, category: null,
      label: ENERGY_LABEL[source] ?? source,
      basis: `Metered consumption × ${source === "electricity_grid" ? "grid" : "published"} factor`,
      quantity: Math.round(qty), quantityUnit: unit, tco2e: kg / 1000, factor,
      gap: missing ? "Some records are in a unit the library has no factor for and are excluded." : undefined,
    };
  }

  /** Group activity rows by factor key and sum the tCO₂e stored at capture. */
  function activityLines(scope: Scope, category: string | null, keyPrefix: string): InventoryLine[] {
    const rows = acts.filter((a) => a.scope === scope && (a.category ?? null) === category);
    const groups = new Map<string, EmissionActivity[]>();
    rows.forEach((a) => {
      const k = a.factor_key ?? a.activity_type;
      groups.set(k, [...(groups.get(k) ?? []), a]);
    });
    return [...groups.entries()].map(([k, rs]) => {
      const factor = remember(factors.find((f) => f.id === rs[0].ef_id) ?? null);
      const tier = rs[0].tier;
      return {
        key: `${keyPrefix}-${k}`, scope, category,
        label: rs[0].description ?? k,
        basis: tier === 3 ? "Spend × EEIO factor (tier 3)" : tier === 2 ? "Activity × product-class average (tier 2)" : "Supplier-specific / measured (tier 1)",
        quantity: +rs.reduce((s, a) => s + Number(a.quantity), 0).toFixed(1),
        quantityUnit: rs[0].unit,
        tco2e: rs.reduce((s, a) => s + Number(a.tco2e ?? 0), 0),
        factor,
      } satisfies InventoryLine;
    }).sort((a, b) => b.tco2e - a.tco2e);
  }

  /* Scope 1 — combustion on site plus fugitive refrigerant */
  const scope1: InventoryLine[] = [
    energyLine("natural_gas", 1),
    energyLine("diesel", 1),
  ].filter((l): l is InventoryLine => l !== null);
  activityLines(1, null, "fugitive").forEach((l) => {
    scope1.push({ ...l, label: "Refrigerant released — charged less recovered", basis: "Material balance × GWP (IPCC AR6)" });
  });

  /* Scope 2 — purchased energy, location-based */
  const scope2: InventoryLine[] = SCOPE2_SOURCES
    .map((s) => energyLine(s, 2))
    .filter((l): l is InventoryLine => l !== null);

  /* Scope 3 */
  const cat1Lines = activityLines(3, "cat1", "purchase");
  // Water supply and treatment are a purchased upstream service, so they sit in Cat 1.
  const metered = water.filter((r) => {
    const src = String((r.source_payload as Record<string, unknown> | null)?.source ?? "municipal");
    return src === "municipal" || src === "borewell";
  });
  if (metered.length) {
    const m3 = metered.reduce((s, r) => s + waterM3(r.consumption, r.unit), 0);
    const supply = remember(findFactor(factors, { key: WATER_SUPPLY_KEY, unit: "m3" }));
    const treat = remember(findFactor(factors, { key: WATER_TREATMENT_KEY, unit: "m3" }));
    if (supply) {
      cat1Lines.push({
        key: "water-supply", scope: 3, category: "cat1", label: "Water supply",
        basis: "Metered supply × supply factor",
        quantity: Math.round(m3), quantityUnit: "m³",
        tco2e: (m3 * Number(supply.ef_value)) / 1000, factor: supply,
      });
    }
    if (treat) {
      cat1Lines.push({
        key: "water-treatment", scope: 3, category: "cat1", label: "Wastewater treatment",
        basis: `${Math.round(WATER_RETURN_SHARE * 100)}% of metered supply × treatment factor`,
        quantity: Math.round(m3 * WATER_RETURN_SHARE), quantityUnit: "m³",
        tco2e: (m3 * WATER_RETURN_SHARE * Number(treat.ef_value)) / 1000, factor: treat,
      });
    }
  }

  // Cat 3 — upstream of the fuels and electricity already in Scope 1 and 2.
  const cat3Lines: InventoryLine[] = [];
  ["electricity_grid", "natural_gas", "diesel", "district_cooling"].forEach((source) => {
    const rows = energy.filter((r) => r.energy_source === source);
    if (!rows.length) return;
    let qty = 0, kg = 0, unit = "kWh";
    let factor: EmissionFactor | null = null;
    rows.forEach((r) => {
      const e = energyQty(r.consumption, r.unit);
      const f = findFactor(factors, { key: wttKey(source), unit: e.unit });
      if (!f) return;
      factor = f; unit = e.unit; qty += e.qty; kg += e.qty * Number(f.ef_value);
    });
    if (!factor) return;
    remember(factor);
    cat3Lines.push({
      key: `wtt-${source}`, scope: 3, category: "cat3",
      // Drop the source's own qualifier so the line does not read "gas — boilers & kitchen — well-to-tank".
      label: `${(ENERGY_LABEL[source] ?? source).replace(/ — .*$/, "")} — well-to-tank`,
      basis: "Same consumption × upstream factor",
      quantity: Math.round(qty), quantityUnit: unit, tco2e: kg / 1000, factor,
    });
  });
  const gridRows = energy.filter((r) => r.energy_source === "electricity_grid");
  if (gridRows.length) {
    const kWh = gridRows.reduce((s, r) => s + energyQty(r.consumption, r.unit).qty, 0);
    const td = remember(findFactor(factors, { key: TD_GRID_KEY, unit: "kWh" }));
    if (td) {
      cat3Lines.push({
        key: "td-grid", scope: 3, category: "cat3",
        label: "Grid transmission & distribution losses",
        basis: "Purchased electricity × T&D loss factor",
        quantity: Math.round(kWh), quantityUnit: "kWh", tco2e: (kWh * Number(td.ef_value)) / 1000, factor: td,
      });
    }
  }

  // Cat 5 — waste by disposal route.
  const routes = new Map<string, RecordWithProperty[]>();
  waste.forEach((r) => {
    const route = String((r.source_payload as Record<string, unknown> | null)?.route ?? "landfill");
    routes.set(route, [...(routes.get(route) ?? []), r]);
  });
  const cat5Lines: InventoryLine[] = [...routes.entries()].map(([route, rows]) => {
    const kg = rows.reduce((s, r) => s + wasteKg(r.consumption, r.unit), 0);
    const factor = remember(findFactor(factors, { key: wasteRouteKey(route), unit: "kg" }));
    return {
      key: `waste-${route}`, scope: 3 as Scope, category: "cat5",
      label: `Waste — ${route === "incineration" ? "energy recovery" : route}`,
      basis: "Collected mass × route factor",
      quantity: +(kg / 1000).toFixed(1), quantityUnit: "t",
      tco2e: factor ? (kg * Number(factor.ef_value)) / 1000 : 0,
      factor,
      gap: factor ? undefined : `No factor in the library for the ${route} route.`,
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

  return { scope1, scope2, scope3: blocks, factors: [...used.values()] };
}

export function buildInventory(
  year: number,
  records: RecordWithProperty[],
  activities: EmissionActivity[],
  activityRecords: ActivityRecord[],
  factors: EmissionFactor[],
  country: string | null,
): Inventory {
  const current = buildYear(year, records, activities, factors, country);
  const previous = buildYear(year - 1, records, activities, factors, country);

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
    factorsApplied: current.factors.sort((a, b) => a.scope - b.scope || (a.category ?? "").localeCompare(b.category ?? "")),
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

/** Loads the reporting year and the one before it for one property. */
export function usePropertyInventory(propertyId: string | null, year: number, country: string | null, enabled: boolean) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Inventory | null }>({
    loading: enabled, error: null, data: null,
  });
  useEffect(() => {
    if (!enabled || !propertyId) { setState({ loading: false, error: null, data: null }); return; }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const { from } = reportingYearRange(year - 1);
    const { to } = reportingYearRange(year);
    Promise.all([
      listRecords({ propertyId, from, to, status: "approved", limit: 3000, orderBy: "period_start" }),
      listEmissionActivities({ propertyId, from, to, status: ["approved", "submitted"] }),
      listActivity({ propertyId, from, to }),
      listFactors(),
    ])
      .then(([records, activities, activityRecords, factors]) => {
        if (cancelled) return;
        setState({ loading: false, error: null, data: buildInventory(year, records, activities, activityRecords, factors, country) });
      })
      .catch((e: Error) => { if (!cancelled) setState({ loading: false, error: e.message, data: null }); });
    return () => { cancelled = true; };
  }, [propertyId, year, country, enabled]);
  return useMemo(() => state, [state]);
}

/* ---------------- formatting helpers shared by the two views ---------------- */

export const fmtT = (n: number) => (n >= 100 ? Math.round(n).toLocaleString("en-US") : n.toFixed(1));
export const factorLabel = (f: EmissionFactor | null) =>
  f ? `${Number(f.ef_value).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${f.ef_unit.replace("CO2e", "CO₂e")}` : "—";
export const deltaPct = (now: number, before: number | null | undefined) =>
  before && before > 0 ? +(((now - before) / before) * 100).toFixed(1) : 0;
