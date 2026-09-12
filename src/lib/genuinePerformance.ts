// ─────────────────────────────────────────────────────────────────────────────
// Genuine Performance (GP) engine — the property's own-history efficiency lens.
//
// Concrete, defensible, NOT a black-box index. For each utility we report three
// numbers, exactly like the legacy "Measured → Calculated → Genuine" report:
//   • Measured  — what the meter actually recorded this year.
//   • Expected  — what consumption SHOULD have been given how the drivers moved
//                 (weather, occupancy, activity), holding efficiency constant.
//   • Genuine   — (Measured − Expected) / Expected. Negative = a real efficiency
//                 gain that the drivers don't explain (i.e. management action).
//
// Expected = baseline × ( base + weather·(CDD/CDD₀) + occ·(ORN/ORN₀) + act·(cov/cov₀) )
// where the per-utility sensitivity shares sum to 1, so when every driver ratio
// is 1.0 the Expected equals the baseline. By construction:
//   raw% (Measured vs baseline) = weatherΔ + occupancyΔ + activityΔ + genuineΔ
// so the decomposition always reconciles to the headline raw change.
//
// This is a degree-day / occupancy normalisation (IPMVP Option C in spirit).
// The sensitivity shares are documented assumptions, surfaced in the UI.
// ─────────────────────────────────────────────────────────────────────────────

import { PORTFOLIO_HOTELS } from "./mock";

export type GpUtility = "energy" | "water" | "waste" | "carbon";

export const GP_UTILITY_META: Record<
  GpUtility,
  { label: string; unit: string; perOrnUnit: string }
> = {
  energy: { label: "Energy", unit: "MWh",   perOrnUnit: "kWh/ORN" },
  water:  { label: "Water",  unit: "m³",    perOrnUnit: "L/GN" },
  waste:  { label: "Waste",  unit: "t",     perOrnUnit: "kg/ORN" },
  carbon: { label: "Carbon", unit: "tCO₂e", perOrnUnit: "kgCO₂e/ORN" },
};

// Driver sensitivity shares per utility (sum to 1.0). Documented assumptions:
// how much of each utility's consumption tracks weather vs occupancy vs activity
// vs a fixed base load.
const SENSITIVITY: Record<
  GpUtility,
  { weather: number; occupancy: number; activity: number; base: number }
> = {
  energy: { weather: 0.45, occupancy: 0.33, activity: 0.14, base: 0.08 },
  water:  { weather: 0.05, occupancy: 0.55, activity: 0.30, base: 0.10 },
  waste:  { weather: 0.00, occupancy: 0.50, activity: 0.45, base: 0.05 },
  carbon: { weather: 0.40, occupancy: 0.32, activity: 0.13, base: 0.15 },
};

// Per-hotel year-on-year driver ratios (current ÷ baseline) + raw YoY % for the
// utilities PORTFOLIO_HOTELS doesn't already carry. Energy/carbon raw % come
// from the hotel's yoyEnergy / yoyCarbon. weatherRatio = degree-day ratio,
// occRatio = ORN ratio, actRatio = F&B-cover / laundry ratio.
type Drivers = {
  weatherRatio: number;
  occRatio: number;
  actRatio: number;
  rawWaterPct: number;
  rawWastePct: number;
};

const DRIVERS: Record<string, Drivers> = {
  "Skyline Dubai":               { weatherRatio: 1.07, occRatio: 1.03, actRatio: 1.02, rawWaterPct: -3.5, rawWastePct: -5.0 },
  // Worsening: occupancy/activity fell but consumption didn't follow — genuine > 0.
  "Airport Hotel Dubai":         { weatherRatio: 0.99, occRatio: 0.93, actRatio: 0.94, rawWaterPct: 2.0,  rawWastePct: 3.0  },
  "Bay View Singapore":          { weatherRatio: 1.02, occRatio: 1.04, actRatio: 1.03, rawWaterPct: -4.0, rawWastePct: -3.5 },
  "The Pavilion London":         { weatherRatio: 0.96, occRatio: 1.02, actRatio: 1.01, rawWaterPct: -5.0, rawWastePct: -6.0 },
  "Grand Harbour Lisbon":        { weatherRatio: 1.01, occRatio: 1.01, actRatio: 1.00, rawWaterPct: -4.0, rawWastePct: -4.5 },
  // Worsening.
  "Marina Residences Barcelona": { weatherRatio: 1.00, occRatio: 0.92, actRatio: 0.94, rawWaterPct: 2.0,  rawWastePct: 3.0  },
  "Oceanfront Cape Town":        { weatherRatio: 0.98, occRatio: 1.05, actRatio: 1.04, rawWaterPct: -7.0, rawWastePct: -7.5 },
  "The Montrose Paris":          { weatherRatio: 0.95, occRatio: 1.02, actRatio: 1.01, rawWaterPct: -6.0, rawWastePct: -8.0 },
  // Worsening.
  "Peaks Resort Zermatt":        { weatherRatio: 1.02, occRatio: 0.88, actRatio: 0.92, rawWaterPct: 3.0,  rawWastePct: 3.0  },
  "Riverside Bangkok":           { weatherRatio: 1.02, occRatio: 1.10, actRatio: 1.08, rawWaterPct: 3.0,  rawWastePct: 5.0  },
};

const DEFAULT_DRIVERS: Drivers = { weatherRatio: 1.0, occRatio: 1.0, actRatio: 1.0, rawWaterPct: -3.0, rawWastePct: -3.0 };

export type GpDriverContribution = {
  key: "weather" | "occupancy" | "activity" | "genuine";
  label: string;
  pct: number; // contribution to the raw change, in percentage points
  tone: "good" | "warn" | "info";
};

export type GpResult = {
  utility: GpUtility;
  measured: number;   // native units (MWh / m³ / t / tCO₂e)
  baseline: number;
  expected: number;
  rawPct: number;     // Measured vs baseline
  genuinePct: number; // Measured vs Expected — the real efficiency signal
  decomposition: GpDriverContribution[];
};

function hotel(name: string) {
  return PORTFOLIO_HOTELS.find((h) => h.name === name);
}

function measuredFor(h: NonNullable<ReturnType<typeof hotel>>, u: GpUtility): number {
  return u === "energy" ? h.energy_mwh
       : u === "water"  ? h.water_m3
       : u === "waste"  ? h.waste_t
       : h.carbon_t;
}

function rawPctFor(h: NonNullable<ReturnType<typeof hotel>>, u: GpUtility, d: Drivers): number {
  return u === "energy" ? h.yoyEnergy
       : u === "carbon" ? h.yoyCarbon
       : u === "water"  ? d.rawWaterPct
       : d.rawWastePct;
}

/** Compute the Measured / Expected / Genuine result for one property + utility. */
export function gpResult(propertyName: string, utility: GpUtility): GpResult | null {
  const h = hotel(propertyName);
  if (!h) return null;
  const d = DRIVERS[propertyName] ?? DEFAULT_DRIVERS;
  const s = SENSITIVITY[utility];

  const measured = measuredFor(h, utility);
  const rawPct = rawPctFor(h, utility, d);
  const baseline = measured / (1 + rawPct / 100);

  // Expected = baseline scaled by how the drivers moved (efficiency held fixed).
  const expectedFactor =
    s.base +
    s.weather * d.weatherRatio +
    s.occupancy * d.occRatio +
    s.activity * d.actRatio;
  const expected = baseline * expectedFactor;
  const genuinePct = ((measured - expected) / expected) * 100;

  // Each driver's contribution to the raw change, in pp of baseline.
  const weatherΔ = s.weather * (d.weatherRatio - 1) * 100;
  const occΔ = s.occupancy * (d.occRatio - 1) * 100;
  const actΔ = s.activity * (d.actRatio - 1) * 100;
  const genuineΔ = ((measured - expected) / baseline) * 100;

  const decomposition: GpDriverContribution[] = [
    { key: "weather",   label: "Weather (CDD/HDD)",  pct: weatherΔ, tone: "info" },
    { key: "occupancy", label: "Occupancy (ORN)",    pct: occΔ,     tone: "info" },
    { key: "activity",  label: "Activity (covers / laundry)", pct: actΔ, tone: "info" },
    { key: "genuine",   label: "Genuine (management action)", pct: genuineΔ, tone: genuineΔ <= 0 ? "good" : "warn" },
  ];

  return { utility, measured, baseline, expected, rawPct, genuinePct, decomposition };
}

/** All four utilities for a property. */
export function gpAll(propertyName: string): GpResult[] {
  return (["energy", "water", "waste", "carbon"] as GpUtility[])
    .map((u) => gpResult(propertyName, u))
    .filter((r): r is GpResult => r !== null);
}

// Monthly Raw vs Genuine improvement series (% better than prior year). Raw
// swings with the weather; Genuine is the steadier underlying signal. Generated
// deterministically from the annual genuine result + a seasonal weather profile
// so the chart reconciles with the headline (no Math.random).
const SEASON = [0.6, 1.4, 2.6, 3.1, 1.8, 0.4, -1.2, -1.0, -1.6, -2.0, -0.4, 1.3];
const MONTHS = ["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"];

export function gpMonthly(propertyName: string, utility: GpUtility) {
  const r = gpResult(propertyName, utility);
  if (!r) return [];
  const gp = +(-r.genuinePct).toFixed(1); // improvement = positive of a negative genuine%
  const weatherSwing = r.decomposition.find((x) => x.key === "weather")?.pct ?? 0;
  const amplitude = 1 + Math.abs(weatherSwing) / 3;
  return MONTHS.map((m, i) => ({
    period: m,
    gp,                                      // steady underlying signal
    raw: +(gp - SEASON[i] * amplitude).toFixed(1), // swings with the weather
  }));
}

/** Portfolio-style composite: simple average genuine improvement across utilities. */
export function gpComposite(propertyName: string): number {
  const all = gpAll(propertyName);
  if (!all.length) return 0;
  return all.reduce((s, r) => s + r.genuinePct, 0) / all.length;
}

export type GpLeaderboardRow = {
  name: string;
  composite: number;
  byUtility: Partial<Record<GpUtility, number>>;
  worsening: boolean; // genuine using MORE than expected (composite > 0)
};

/** Cross-property roll-up — genuine improvement per hotel, best (most negative) first. */
export function gpLeaderboard(): GpLeaderboardRow[] {
  return PORTFOLIO_HOTELS.map((h) => {
    const all = gpAll(h.name);
    const composite = all.length ? all.reduce((s, r) => s + r.genuinePct, 0) / all.length : 0;
    const byUtility: Partial<Record<GpUtility, number>> = {};
    all.forEach((r) => { byUtility[r.utility] = r.genuinePct; });
    return { name: h.name, composite, byUtility, worsening: composite > 0 };
  }).sort((a, b) => a.composite - b.composite);
}

/** Count of properties whose genuine performance is worsening (composite > 0). */
export function gpWorseningCount(): number {
  return gpLeaderboard().filter((r) => r.worsening).length;
}

// ── Cost leakage — monetised genuine over/under-spend ────────────────────────
// Leakage $ = genuine overspend volume × unit cost. A hotel using MORE than its
// drivers predict is leaking money; the gap is the addressable savings
// opportunity. Rates match the canonical PORTFOLIO_HOTELS.utility_cost_usd
// (Task 1): electricity $120/MWh, water $2/m³, waste $200/t. Carbon is excluded
// (it's an emission, not a separate bill — counting it would double the energy $).
const COST_RATE: Partial<Record<GpUtility, number>> = { energy: 120, water: 2, waste: 200 };

export type GpCostItem = { utility: GpUtility; overspendVol: number; impactUsd: number };
export type GpCostImpact = {
  byUtility: GpCostItem[];
  netUsd: number;     // leakage − savings (positive = net overspend)
  leakageUsd: number; // sum of overspend (the recoverable opportunity)
  savingUsd: number;  // sum of underspend already achieved
};

/** Per-property cost impact of genuine over/under-spend, across energy/water/waste. */
export function gpCostImpact(propertyName: string): GpCostImpact {
  const byUtility: GpCostItem[] = [];
  let net = 0, leakage = 0, saving = 0;
  for (const u of ["energy", "water", "waste"] as GpUtility[]) {
    const rate = COST_RATE[u];
    const r = gpResult(propertyName, u);
    if (!r || rate === undefined) continue;
    const overspendVol = r.measured - r.expected; // + = used more than expected
    const impactUsd = overspendVol * rate;
    byUtility.push({ utility: u, overspendVol, impactUsd });
    net += impactUsd;
    if (impactUsd > 0) leakage += impactUsd; else saving += -impactUsd;
  }
  return { byUtility, netUsd: net, leakageUsd: leakage, savingUsd: saving };
}

/** Portfolio roll-up of cost leakage / savings opportunity. */
export function gpPortfolioCost() {
  let leakageUsd = 0, savingUsd = 0, netUsd = 0;
  const byHotel = PORTFOLIO_HOTELS.map((h) => {
    const c = gpCostImpact(h.name);
    leakageUsd += c.leakageUsd;
    savingUsd += c.savingUsd;
    netUsd += c.netUsd;
    return { name: h.name, ...c };
  });
  return { byHotel, leakageUsd, savingUsd, netUsd };
}

export { SENSITIVITY };

// ── Property-level context: events and initiatives that sit on the GP timeline ──
// Operational events are non-routine changes; GP recalculates before and after
// each so its impact is isolated from the drivers. They belong to a property.
export type GpEvent = {
  date: string; event: string; pillars: GpUtility[]; property: string; desc: string; status: "Approved" | "Pending";
};

export const GP_EVENTS: GpEvent[] = [
  { date: "2026-04-14", event: "F&B refurbishment (re-opened)", pillars: ["energy", "water", "waste"], property: "Skyline Dubai", desc: "3 new outlets — chillers ran 24/7 for commissioning", status: "Approved" },
  { date: "2025-11-22", event: "Solar PV phase 1 commissioned", pillars: ["energy", "carbon"], property: "Skyline Dubai", desc: "240 kWp rooftop array", status: "Approved" },
  { date: "2026-02-02", event: "LED retrofit — back-of-house", pillars: ["energy"], property: "Peaks Resort Zermatt", desc: "3,200 fittings replaced", status: "Approved" },
  { date: "2025-11-22", event: "Solar PV phase 1 commissioned", pillars: ["energy", "carbon"], property: "Marina Residences Barcelona", desc: "240 kWp rooftop array", status: "Approved" },
  { date: "2026-03-09", event: "Tower B floors 9–12 closed", pillars: ["energy", "water", "carbon"], property: "Airport Hotel Dubai", desc: "Refurbishment, Feb–Mar 2026 (WO-2026-041)", status: "Pending" },
];

export type GpInitiative = {
  name: string; category: string; startYear: number; startMonth: number; endYear: number | null; endMonth: number | null;
  status: "completed" | "in-progress"; savingPotential: string;
};

export const GP_INITIATIVES: Record<GpUtility, GpInitiative[]> = {
  energy: [
    { name: "LED lighting retrofit",  category: "Lighting",   startYear: 2024, startMonth: 9,  endYear: 2025, endMonth: 3,  status: "completed",   savingPotential: "35–55 MWh/yr" },
    { name: "BMS optimisation",       category: "Controls",   startYear: 2025, startMonth: 1,  endYear: null, endMonth: null, status: "in-progress", savingPotential: "60–90 MWh/yr" },
    { name: "Heat pump upgrade",      category: "HVAC",       startYear: 2025, startMonth: 6,  endYear: 2025, endMonth: 11, status: "completed",   savingPotential: "45–70 MWh/yr" },
    { name: "Solar PV expansion",     category: "Renewables", startYear: 2024, startMonth: 3,  endYear: 2024, endMonth: 8,  status: "completed",   savingPotential: "80–110 MWh/yr" },
    { name: "Variable speed drives",  category: "HVAC",       startYear: 2023, startMonth: 11, endYear: 2024, endMonth: 2,  status: "completed",   savingPotential: "20–35 MWh/yr" },
    { name: "Chiller plant upgrade",  category: "HVAC",       startYear: 2026, startMonth: 2,  endYear: null, endMonth: null, status: "in-progress", savingPotential: "90–120 MWh/yr" },
  ],
  water: [
    { name: "Low-flow fixture rollout",    category: "Fixtures",   startYear: 2024, startMonth: 6,  endYear: 2025, endMonth: 4,  status: "completed",   savingPotential: "4,000–6,000 m³/yr" },
    { name: "Greywater recycling system",  category: "Recycling",  startYear: 2025, startMonth: 2,  endYear: null, endMonth: null, status: "in-progress", savingPotential: "6,000–9,000 m³/yr" },
    { name: "Leak detection upgrade",      category: "Monitoring", startYear: 2025, startMonth: 8,  endYear: 2025, endMonth: 11, status: "completed",   savingPotential: "2,000–4,000 m³/yr" },
    { name: "Smart irrigation controller", category: "Irrigation", startYear: 2023, startMonth: 10, endYear: 2024, endMonth: 3,  status: "completed",   savingPotential: "1,000–2,000 m³/yr" },
    { name: "Cooling tower optimisation",  category: "HVAC",       startYear: 2026, startMonth: 1,  endYear: null, endMonth: null, status: "in-progress", savingPotential: "3,000–5,000 m³/yr" },
  ],
  waste: [
    { name: "Food waste monitoring",        category: "Food & Bev",  startYear: 2024, startMonth: 5, endYear: null, endMonth: null, status: "in-progress", savingPotential: "15–25 t/yr" },
    { name: "Segregation improvement",      category: "Operations",  startYear: 2025, startMonth: 1, endYear: 2025, endMonth: 9,  status: "completed",   savingPotential: "20–30 t/yr" },
    { name: "On-site composting",           category: "Composting",  startYear: 2025, startMonth: 4, endYear: null, endMonth: null, status: "in-progress", savingPotential: "10–18 t/yr" },
    { name: "Supplier packaging reduction", category: "Procurement", startYear: 2024, startMonth: 9, endYear: 2025, endMonth: 12, status: "completed",   savingPotential: "8–14 t/yr" },
    { name: "Hazardous waste audit",        category: "Compliance",  startYear: 2026, startMonth: 3, endYear: 2026, endMonth: 6,  status: "in-progress", savingPotential: "2–4 t/yr" },
  ],
  carbon: [
    { name: "Renewable PPA",               category: "Energy",       startYear: 2024, startMonth: 7, endYear: null, endMonth: null, status: "in-progress", savingPotential: "400–600 tCO₂e/yr" },
    { name: "Scope 3 supplier engagement", category: "Supply chain", startYear: 2025, startMonth: 1, endYear: null, endMonth: null, status: "in-progress", savingPotential: "500–800 tCO₂e/yr" },
    { name: "HVAC efficiency upgrade",     category: "HVAC",         startYear: 2025, startMonth: 5, endYear: 2025, endMonth: 11, status: "completed",   savingPotential: "150–220 tCO₂e/yr" },
    { name: "EV fleet transition",         category: "Transport",    startYear: 2024, startMonth: 3, endYear: 2025, endMonth: 8,  status: "completed",   savingPotential: "40–70 tCO₂e/yr" },
    { name: "I-REC certification",         category: "Renewables",   startYear: 2026, startMonth: 1, endYear: null, endMonth: null, status: "in-progress", savingPotential: "200–350 tCO₂e/yr" },
  ],
};

/** The year-on-year bridge in native units: last year → each driver → genuine → this year. Reconciles by construction. */
export type GpBridgeStep = { name: string; base: number; value: number; kind: "total" | "external" | "genuine-good" | "genuine-bad"; delta: number };

export function gpBridge(r: GpResult): GpBridgeStep[] {
  const B = r.baseline;
  const steps: GpBridgeStep[] = [{ name: "Last year", base: 0, value: B, kind: "total", delta: B }];
  let run = B;
  for (const d of r.decomposition) {
    const v = (B * d.pct) / 100;
    steps.push({
      name: d.key === "weather" ? "Weather" : d.key === "occupancy" ? "Occupancy" : d.key === "activity" ? "Activity" : "Genuine",
      base: Math.min(run, run + v), value: Math.abs(v),
      kind: d.key === "genuine" ? (v <= 0 ? "genuine-good" : "genuine-bad") : "external",
      delta: v,
    });
    run += v;
  }
  steps.push({ name: "This year", base: 0, value: r.measured, kind: "total", delta: r.measured });
  return steps;
}
