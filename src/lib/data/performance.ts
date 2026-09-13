/**
 * Property performance from approved records. A reporting year runs May → April
 * (the product's convention everywhere); "prior year" is the same twelve months
 * one year earlier. Carbon = consumption × the client's emission factor for that
 * source, unit and country (GLOBAL as the fallback). Intensities use approved
 * activity records only — no denominator, no intensity.
 */
import { useEffect, useMemo, useState } from "react";
import { listActivity, listEmissionActivities, listFactorSet, listRecords, listUnitConversions, type ActivityRecord, type EfUnitConversion, type EmissionActivity, type RecordWithProperty } from "@/lib/api";
import { ENERGY_SOURCE_FACTOR, SCOPE2_ENERGY_SOURCES, convertUnit, geoChain, resolveFactor, type EfFactorRow } from "./factors";
import { CHART } from "@/lib/chartPalette";

export const MONTH_ORDER = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function reportingYearRange(year: number) {
  return { from: `${year}-05-01`, to: `${year + 1}-04-01` };
}
const ymOf = (d: string) => d.slice(0, 7);
/** Which reporting year a period_start belongs to (May → April). */
export function reportingYearOf(periodStart: string) {
  const y = Number(periodStart.slice(0, 4)), m = Number(periodStart.slice(5, 7));
  return m >= 5 ? y : y - 1;
}

export type MonthRow = { month: string; ty: number; py: number; costTY: number; costPY: number; [k: string]: number | string };
export type SourceDef = { key: string; label: string; fullLabel: string; color: string };
export type Kpi = { label: string; value: string; unit?: string; delta: number; goodDir: "up" | "down"; iconBg: string };
export type PillarLive = {
  unit: string; costUnit: string; totalLabel: string; intensityLabel: string; intensityUnit: string;
  monthly: MonthRow[]; sources: SourceDef[]; kpis: Kpi[];
  totalTY: number; totalPY: number; intensityTY: number | null; intensityPY: number | null; monthsApproved: number;
};
export type PropertyPerformance = {
  energy: PillarLive; water: PillarLive; waste: PillarLive; carbon: PillarLive;
  activity: { ornTY: number; ornPY: number; gnTY: number; gnPY: number };
  /** Records whose unit no conversion could reach, so they are not in the totals above. */
  excludedRecords: number;
};

const ENERGY_SOURCES: SourceDef[] = [
  { key: "grid", label: "Grid", fullLabel: "Grid electricity", color: CHART.olive },
  { key: "gas", label: "Natural gas", fullLabel: "Natural gas", color: CHART.mauve },
  { key: "distCool", label: "Dist. cooling", fullLabel: "District cooling", color: CHART.moss },
  { key: "solar", label: "Solar PV", fullLabel: "Solar PV (on-site)", color: CHART.blush },
  { key: "diesel", label: "Diesel", fullLabel: "Diesel / generator", color: CHART.cocoa },
];
const ENERGY_KEY: Record<string, string> = { electricity_grid: "grid", natural_gas: "gas", district_cooling: "distCool", solar_pv: "solar", diesel: "diesel" };
const WATER_SOURCES: SourceDef[] = [
  { key: "municipal", label: "Municipal", fullLabel: "Municipal supply", color: CHART.mauve },
  { key: "recycled", label: "Recycled", fullLabel: "Recycled / greywater", color: CHART.olive },
  { key: "borewell", label: "Borewell", fullLabel: "Borewell", color: CHART.moss },
  { key: "rainwater", label: "Rainwater", fullLabel: "Rainwater harvested", color: CHART.blush },
];
const WASTE_SOURCES: SourceDef[] = [
  { key: "recycled", label: "Recycled", fullLabel: "Recycled", color: CHART.olive },
  { key: "composted", label: "Composted", fullLabel: "Composted", color: CHART.mauve },
  { key: "incineration", label: "Energy rec.", fullLabel: "Energy recovery", color: CHART.sand },
  { key: "landfill", label: "Landfill", fullLabel: "Landfill", color: CHART.remainder },
  { key: "donated", label: "Donated", fullLabel: "Donated (food)", color: CHART.blush },
];
const CARBON_SOURCES: SourceDef[] = [
  { key: "scope1", label: "Scope 1", fullLabel: "Scope 1 — direct", color: CHART.cocoa },
  { key: "scope2", label: "Scope 2", fullLabel: "Scope 2 — purchased energy", color: CHART.mauve },
];
const CARBON_SHADOW_PRICE = 50; // $/t, for the cost line only

const normUnit = (u: string) => u.replace("³", "3").toLowerCase();

/**
 * kgCO₂e per unit for one energy source at this property. Scope 2 sources resolve at
 * the location-based boundary and Scope 1 sources at combustion — never the Cat 3
 * boundaries, which belong to the inventory's own lines.
 */
function efFor(factors: EfFactorRow[], source: string, unit: string, year: number, geo: string[]): number {
  const map = ENERGY_SOURCE_FACTOR[source];
  if (!map) return 0;
  const boundary = SCOPE2_ENERGY_SOURCES.includes(source) ? ("location_based" as const) : ("combustion" as const);
  const hit = resolveFactor(factors, {
    domain: map.domain, activityKey: map.activityKey, boundary, unit, year, geo,
  });
  return hit ? hit.value : 0;
}

/**
 * Energy in kWh, for the physical-energy totals. Anything that is not already an energy
 * unit needs the fuel's own calorific value — a cubic metre of natural gas is about 11
 * kWh, and the old version counted it as 1. Returns null when no conversion exists, so
 * the record is excluded and counted rather than silently mis-stated.
 */
function toKwh(conversions: EfUnitConversion[], v: number, unit: string, source: string): number | null {
  const u = normUnit(unit);
  if (u === "kwh") return v;
  if (u === "mwh") return v * 1000;
  if (u === "mj") return v / 3.6;
  const hit = convertUnit(conversions, v, unit, "kWh", ENERGY_SOURCE_FACTOR[source]?.fuelName);
  return hit ? hit.value : null;
}
const toM3 = (v: number, unit: string) => (normUnit(unit) === "l" ? v / 1000 : v);
const toKg = (v: number, unit: string) => (normUnit(unit) === "t" ? v * 1000 : v);

function delta(ty: number, py: number) {
  return py ? +(((ty - py) / py) * 100).toFixed(1) : 0;
}

/** Build the four pillar views for one property and reporting year from raw rows. */
/**
 * `emissionActivities` carries the Scope 1 fugitive rows. Without them the Carbon pillar
 * and the Carbon inventory tab reported different Scope 1+2 totals for the same property.
 */
export function buildPerformance(
  year: number,
  records: RecordWithProperty[],
  activity: ActivityRecord[],
  factors: EfFactorRow[],
  conversions: EfUnitConversion[],
  emissionActivities: EmissionActivity[],
  geo: string[],
): PropertyPerformance {
  let unconvertible = 0;
  const months = MONTH_ORDER.map((m) => ({ ty: `${m >= 5 ? year : year + 1}-${String(m).padStart(2, "0")}`, py: `${m >= 5 ? year - 1 : year}-${String(m).padStart(2, "0")}`, label: MONTH_SHORT[m - 1] }));
  const approved = records.filter((r) => r.status === "approved");
  const act = activity.filter((a) => a.status === "approved");
  const orn = (ym: string) => act.filter((a) => ymOf(a.period_start) === ym).reduce((s, a) => s + a.occupied_room_nights, 0);
  const gn = (ym: string) => act.filter((a) => ymOf(a.period_start) === ym).reduce((s, a) => s + (a.guest_nights ?? 0), 0);
  const covers = (ym: string) => act.filter((a) => ymOf(a.period_start) === ym).reduce((s, a) => s + (a.fb_covers ?? 0), 0);

  const pick = (pillar: string, ym: string) => approved.filter((r) => r.pillar === pillar && ymOf(r.period_start) === ym);
  const cost = (rows: RecordWithProperty[]) => rows.reduce((s, r) => s + (r.cost_amount ?? 0), 0) / 1000;

  // Energy (MWh, by source)
  const energyRows: MonthRow[] = months.map(({ ty, py, label }) => {
    const row: MonthRow = { month: label, ty: 0, py: 0, costTY: 0, costPY: 0 };
    ENERGY_SOURCES.forEach((s) => { row[s.key] = 0; });
    pick("energy", ty).forEach((r) => {
      const kwh = toKwh(conversions, r.consumption, r.unit, r.energy_source ?? "");
      if (kwh === null) { unconvertible += 1; return; }
      const k = ENERGY_KEY[r.energy_source ?? ""] ?? "grid";
      const mwh = kwh / 1000;
      row[k] = (row[k] as number) + mwh; row.ty += mwh;
    });
    pick("energy", py).forEach((r) => {
      const kwh = toKwh(conversions, r.consumption, r.unit, r.energy_source ?? "");
      if (kwh !== null) row.py += kwh / 1000;
    });
    row.costTY = +cost(pick("energy", ty)).toFixed(1); row.costPY = +cost(pick("energy", py)).toFixed(1);
    ENERGY_SOURCES.forEach((s) => { row[s.key] = Math.round(row[s.key] as number); });
    row.ty = Math.round(row.ty); row.py = Math.round(row.py);
    return row;
  });
  // Water (m³, by supply)
  const waterRows: MonthRow[] = months.map(({ ty, py, label }) => {
    const row: MonthRow = { month: label, ty: 0, py: 0, costTY: 0, costPY: 0 };
    WATER_SOURCES.forEach((s) => { row[s.key] = 0; });
    pick("water", ty).forEach((r) => { const src = String((r.source_payload as Record<string, unknown> | null)?.source ?? "municipal"); const k = WATER_SOURCES.some((s) => s.key === src) ? src : "municipal"; const m3 = toM3(r.consumption, r.unit); row[k] = (row[k] as number) + m3; row.ty += m3; });
    pick("water", py).forEach((r) => { row.py += toM3(r.consumption, r.unit); });
    row.costTY = +cost(pick("water", ty)).toFixed(1); row.costPY = +cost(pick("water", py)).toFixed(1);
    WATER_SOURCES.forEach((s) => { row[s.key] = Math.round(row[s.key] as number); });
    row.ty = Math.round(row.ty); row.py = Math.round(row.py);
    return row;
  });
  // Waste (t, by route)
  const wasteRows: MonthRow[] = months.map(({ ty, py, label }) => {
    const row: MonthRow = { month: label, ty: 0, py: 0, costTY: 0, costPY: 0 };
    WASTE_SOURCES.forEach((s) => { row[s.key] = 0; });
    pick("waste", ty).forEach((r) => { const route = String((r.source_payload as Record<string, unknown> | null)?.route ?? "landfill"); const k = WASTE_SOURCES.some((s) => s.key === route) ? route : "landfill"; const t = toKg(r.consumption, r.unit) / 1000; row[k] = (row[k] as number) + t; row.ty += t; });
    pick("waste", py).forEach((r) => { row.py += toKg(r.consumption, r.unit) / 1000; });
    row.costTY = +cost(pick("waste", ty)).toFixed(2); row.costPY = +cost(pick("waste", py)).toFixed(2);
    WASTE_SOURCES.forEach((s) => { row[s.key] = +(row[s.key] as number).toFixed(1); });
    row.ty = +row.ty.toFixed(1); row.py = +row.py.toFixed(1);
    return row;
  });
  // Carbon (tCO₂e Scope 1+2) from energy × EF
  const carbonOf = (rows: RecordWithProperty[]) => rows.reduce((acc, r) => {
    if (r.pillar !== "energy" || !r.energy_source) return acc;
    const t = (r.consumption * efFor(factors, r.energy_source, r.unit, year, geo)) / 1000;
    if (SCOPE2_ENERGY_SOURCES.includes(r.energy_source)) acc.scope2 += t; else acc.scope1 += t;
    return acc;
  }, { scope1: 0, scope2: 0 });
  const fugitive = (ym: string) => emissionActivities
    .filter((a) => a.status === "approved" && a.scope === 1 && ymOf(a.period_start) === ym)
    .reduce((s, a) => s + Number(a.tco2e ?? 0), 0);
  // The chart wants whole tonnes per month, but the year total must not be a sum of
  // twelve roundings — that is what left this tab two tonnes away from the Carbon
  // inventory for the same property.
  const carbonExact = { ty: 0, py: 0, scope1: 0, scope2: 0 };
  const carbonRows: MonthRow[] = months.map(({ ty, py, label }) => {
    const c = carbonOf(pick("energy", ty)), cp = carbonOf(pick("energy", py));
    c.scope1 += fugitive(ty); cp.scope1 += fugitive(py);
    const tyT = c.scope1 + c.scope2, pyT = cp.scope1 + cp.scope2;
    carbonExact.ty += tyT; carbonExact.py += pyT;
    carbonExact.scope1 += c.scope1; carbonExact.scope2 += c.scope2;
    return { month: label, ty: Math.round(tyT), py: Math.round(pyT), costTY: +((tyT * CARBON_SHADOW_PRICE) / 1000).toFixed(1), costPY: +((pyT * CARBON_SHADOW_PRICE) / 1000).toFixed(1), scope1: Math.round(c.scope1), scope2: Math.round(c.scope2) };
  });

  const sum = (rows: MonthRow[], k: "ty" | "py") => rows.reduce((s, r) => s + (r[k] as number), 0);
  const ornTY = months.reduce((s, m) => s + orn(m.ty), 0), ornPY = months.reduce((s, m) => s + orn(m.py), 0);
  const gnTY = months.reduce((s, m) => s + gn(m.ty), 0), gnPY = months.reduce((s, m) => s + gn(m.py), 0);
  const coversTY = months.reduce((s, m) => s + covers(m.ty), 0);
  const monthsApproved = (pillar: string) => months.filter((m) => pick(pillar, m.ty).length > 0).length;
  const intensity = (total: number, denom: number, factor = 1) => (denom > 0 ? (total * factor) / denom : null);

  const eTY = sum(energyRows, "ty"), ePY = sum(energyRows, "py");
  const eInt = intensity(eTY, ornTY, 1000), eIntPY = intensity(ePY, ornPY, 1000);
  const renewTY = energyRows.reduce((s, r) => s + (r.solar as number), 0);
  const energy: PillarLive = {
    unit: "MWh", costUnit: "$k", totalLabel: "Total consumption", intensityLabel: "Energy intensity", intensityUnit: "kWh / ORN",
    monthly: energyRows, sources: ENERGY_SOURCES.filter((s) => energyRows.some((r) => (r[s.key] as number) > 0)),
    totalTY: eTY, totalPY: ePY, intensityTY: eInt, intensityPY: eIntPY, monthsApproved: monthsApproved("energy"),
    kpis: [
      { label: "Total consumption", value: Math.round(eTY).toLocaleString("en-US"), unit: "MWh", delta: delta(eTY, ePY), goodDir: "down", iconBg: "bg-pillar-energy/10 text-pillar-energy" },
      { label: "Energy intensity", value: eInt !== null ? eInt.toFixed(1) : "—", unit: "kWh / ORN", delta: eInt !== null && eIntPY !== null ? delta(eInt, eIntPY) : 0, goodDir: "down", iconBg: "bg-warn/10 text-warn" },
      { label: "Energy cost", value: `$${(energyRows.reduce((s, r) => s + r.costTY, 0) / 1000).toFixed(2)}M`, delta: delta(energyRows.reduce((s, r) => s + r.costTY, 0), energyRows.reduce((s, r) => s + r.costPY, 0)), goodDir: "down", iconBg: "bg-pillar-energy/10 text-pillar-energy" },
      { label: "Renewable share", value: eTY ? ((renewTY / eTY) * 100).toFixed(1) : "—", unit: "%", delta: 0, goodDir: "up", iconBg: "bg-brand-50 text-brand-700" },
    ],
  };
  const wTY = sum(waterRows, "ty"), wPY = sum(waterRows, "py");
  const wInt = intensity(wTY, gnTY, 1000), wIntPY = intensity(wPY, gnPY, 1000);
  const recycledTY = waterRows.reduce((s, r) => s + (r.recycled as number), 0);
  const water: PillarLive = {
    unit: "m³", costUnit: "$k", totalLabel: "Total consumption", intensityLabel: "Water intensity", intensityUnit: "L / GN",
    monthly: waterRows, sources: WATER_SOURCES.filter((s) => waterRows.some((r) => (r[s.key] as number) > 0)),
    totalTY: wTY, totalPY: wPY, intensityTY: wInt, intensityPY: wIntPY, monthsApproved: monthsApproved("water"),
    kpis: [
      { label: "Total consumption", value: Math.round(wTY).toLocaleString("en-US"), unit: "m³", delta: delta(wTY, wPY), goodDir: "down", iconBg: "bg-pillar-water/10 text-pillar-water" },
      { label: "Water intensity", value: wInt !== null ? Math.round(wInt).toLocaleString("en-US") : "—", unit: "L / GN", delta: wInt !== null && wIntPY !== null ? delta(wInt, wIntPY) : 0, goodDir: "down", iconBg: "bg-warn/10 text-warn" },
      { label: "Water cost", value: `$${Math.round(waterRows.reduce((s, r) => s + r.costTY, 0)).toLocaleString("en-US")}k`, delta: delta(waterRows.reduce((s, r) => s + r.costTY, 0), waterRows.reduce((s, r) => s + r.costPY, 0)), goodDir: "down", iconBg: "bg-pillar-water/10 text-pillar-water" },
      { label: "Recycled share", value: wTY ? ((recycledTY / wTY) * 100).toFixed(1) : "—", unit: "%", delta: 0, goodDir: "up", iconBg: "bg-brand-50 text-brand-700" },
    ],
  };
  const wsTY = sum(wasteRows, "ty"), wsPY = sum(wasteRows, "py");
  const divertedTY = wasteRows.reduce((s, r) => s + (r.recycled as number) + (r.composted as number) + (r.donated as number), 0);
  const wsInt = intensity(wsTY, ornTY, 1000), wsIntPY = intensity(wsPY, ornPY, 1000);
  const waste: PillarLive = {
    unit: "t", costUnit: "$k", totalLabel: "Total generated", intensityLabel: "Waste intensity", intensityUnit: "kg / ORN",
    monthly: wasteRows, sources: WASTE_SOURCES.filter((s) => wasteRows.some((r) => (r[s.key] as number) > 0)),
    totalTY: wsTY, totalPY: wsPY, intensityTY: wsInt, intensityPY: wsIntPY, monthsApproved: monthsApproved("waste"),
    kpis: [
      { label: "Total generated", value: Math.round(wsTY).toLocaleString("en-US"), unit: "t", delta: delta(wsTY, wsPY), goodDir: "down", iconBg: "bg-pillar-waste/10 text-pillar-waste" },
      { label: "Waste intensity", value: wsInt !== null ? wsInt.toFixed(2) : "—", unit: "kg / ORN", delta: wsInt !== null && wsIntPY !== null ? delta(wsInt, wsIntPY) : 0, goodDir: "down", iconBg: "bg-warn/10 text-warn" },
      { label: "Diversion (excl. WtE)", value: wsTY ? ((divertedTY / wsTY) * 100).toFixed(0) : "—", unit: "%", delta: 0, goodDir: "up", iconBg: "bg-brand-50 text-brand-700" },
      { label: "Food waste", value: coversTY ? Math.round((wasteRows.reduce((s, r) => s + (r.composted as number), 0) * 1e6) / coversTY).toLocaleString("en-US") : "—", unit: "g / cover", delta: 0, goodDir: "down", iconBg: "bg-pillar-waste/10 text-pillar-waste" },
    ],
  };
  const cTY = carbonExact.ty, cPY = carbonExact.py;
  const cInt = intensity(cTY, ornTY, 1000), cIntPY = intensity(cPY, ornPY, 1000);
  const carbon: PillarLive = {
    unit: "tCO₂e", costUnit: `carbon cost $${CARBON_SHADOW_PRICE}/t`, totalLabel: "Scope 1+2 emissions", intensityLabel: "Carbon intensity", intensityUnit: "kgCO₂e / ORN",
    monthly: carbonRows, sources: CARBON_SOURCES,
    totalTY: cTY, totalPY: cPY, intensityTY: cInt, intensityPY: cIntPY, monthsApproved: monthsApproved("energy"),
    kpis: [
      { label: "Scope 1+2 total", value: Math.round(cTY).toLocaleString("en-US"), unit: "tCO₂e", delta: delta(cTY, cPY), goodDir: "down", iconBg: "bg-pillar-carbon/10 text-pillar-carbon" },
      { label: "Carbon intensity", value: cInt !== null ? cInt.toFixed(1) : "—", unit: "kgCO₂e / ORN", delta: cInt !== null && cIntPY !== null ? delta(cInt, cIntPY) : 0, goodDir: "down", iconBg: "bg-warn/10 text-warn" },
      { label: "Scope 1 (direct)", value: Math.round(carbonExact.scope1).toLocaleString("en-US"), unit: "tCO₂e", delta: 0, goodDir: "down", iconBg: "bg-pillar-carbon/10 text-pillar-carbon" },
      { label: "Renewable share", value: eTY ? ((renewTY / eTY) * 100).toFixed(1) : "—", unit: "%", delta: 0, goodDir: "up", iconBg: "bg-brand-50 text-brand-700" },
    ],
  };
  return { energy, water, waste, carbon, activity: { ornTY, ornPY, gnTY, gnPY }, excludedRecords: unconvertible };
}

/** Loads two reporting years for one property. `enabled` false (demo) does nothing. */
export function usePropertyPerformance(
  propertyId: string | null,
  year: number,
  geo: { gridCode?: string | null; country?: string | null },
  enabled: boolean,
) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: PropertyPerformance | null }>({ loading: enabled, error: null, data: null });
  const chainKey = `${geo.gridCode ?? ""}|${geo.country ?? ""}`;
  useEffect(() => {
    if (!enabled || !propertyId) { setState({ loading: false, error: null, data: null }); return; }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const { from } = reportingYearRange(year - 1);
    const { to } = reportingYearRange(year);
    const chain = geoChain(geo.gridCode, geo.country);
    Promise.all([
      listRecords({ propertyId, from, to, status: "approved", limit: 2000, orderBy: "period_start" }),
      listActivity({ propertyId, from, to }),
      listFactorSet({
        domains: ["electricity", "fuel", "heat"],
        geoCodes: chain,
        boundaries: ["location_based", "combustion"],
        activityKeys: Object.values(ENERGY_SOURCE_FACTOR).map((m) => m.activityKey),
      }),
      listUnitConversions(),
      listEmissionActivities({ propertyId, from, to, status: "approved", scope: 1 }),
    ]).then(([records, activity, factors, conversions, emissionActivities]) => {
      if (cancelled) return;
      setState({
        loading: false, error: null,
        data: buildPerformance(year, records, activity, factors, conversions, emissionActivities, chain),
      });
    }).catch((e: Error) => { if (!cancelled) setState({ loading: false, error: e.message, data: null }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, year, chainKey, enabled]);
  return useMemo(() => state, [state]);
}
