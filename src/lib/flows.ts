/**
 * Flow and matrix data for the portfolio charts — sankeys, heatmaps, per-hotel mixes.
 * Every matrix reconciles to the canonical totals in mock.ts: the marginals are the
 * published figures, the cells are fitted to them (IPF), never typed independently.
 */
import { CHART } from "./chartPalette";
import {
  ENERGY_END_USE, PORTFOLIO_ENERGY_SOURCES, PORTFOLIO_HOTELS, PORTFOLIO_MONTHLY_TREND, PORTFOLIO_SCOPE3_CATEGORIES,
  PORTFOLIO_WATER_SOURCES, SCOPE1_BREAKDOWN, SCOPE2_METHODS, WASTE_BY_SOURCE, WATER_END_USE,
} from "./mock";
import type { SankeyLink, SankeyNode } from "@/components/charts/Sankey";

/** Iterative proportional fitting: scale a seed of affinities until rows and columns hit their totals. */
export function ipf(seed: number[][], rowTotals: number[], colTotals: number[], iterations = 60): number[][] {
  let m = seed.map((r) => r.slice());
  for (let k = 0; k < iterations; k++) {
    m = m.map((row, i) => { const s = row.reduce((a, b) => a + b, 0) || 1; return row.map((v) => (v * rowTotals[i]) / s); });
    const colSums = m[0].map((_, j) => m.reduce((a, row) => a + row[j], 0) || 1);
    m = m.map((row) => row.map((v, j) => (v * colTotals[j]) / colSums[j]));
  }
  return m.map((row) => row.map((v) => Math.round(v)));
}

function matrixToSankey(rows: { id: string; label: string; color: string; total: number }[], cols: { id: string; label: string; color: string; total: number }[], cells: number[][]) {
  const nodes: SankeyNode[] = [
    ...rows.map((r) => ({ id: r.id, label: r.label, column: 0, color: r.color })),
    ...cols.map((c) => ({ id: c.id, label: c.label, column: 1, color: c.color })),
  ];
  const links: SankeyLink[] = [];
  rows.forEach((r, i) => cols.forEach((c, j) => { if (cells[i][j] > 0) links.push({ source: r.id, target: c.id, value: cells[i][j], color: r.color }); }));
  return { nodes, links };
}

/* ── Energy: fuel → system ─────────────────────────────────────────────────── */
const ENERGY_SEED = [
  [1.0, 0.35, 1.0, 0.40, 1.0, 1.0], // grid
  [0.25, 1.0, 0.05, 0.90, 0.0, 0.10], // natural gas: boilers, kitchen, laundry
  [0.40, 0.10, 0.20, 0.10, 0.10, 0.60], // diesel: generators, plant
  [1.0, 0.20, 0.60, 0.20, 0.60, 0.40], // renewables
];
export const ENERGY_FLOW_CELLS = ipf(ENERGY_SEED, PORTFOLIO_ENERGY_SOURCES.map((s) => s.mwh), ENERGY_END_USE.map((e) => e.mwh));
export const ENERGY_SANKEY = matrixToSankey(
  PORTFOLIO_ENERGY_SOURCES.map((s, i) => ({ id: `src-${i}`, label: s.source, color: s.color, total: s.mwh })),
  ENERGY_END_USE.map((e, j) => ({ id: `use-${j}`, label: e.system, color: e.color, total: e.mwh })),
  ENERGY_FLOW_CELLS,
);

/* ── Water: supply → end-use ───────────────────────────────────────────────── */
const WATER_SEED = [
  [1.0, 1.0, 1.0, 1.0, 1.0, 0.30], // municipal
  [0.20, 0.30, 0.0, 0.40, 0.60, 1.0], // borehole
  [0.0, 0.40, 0.0, 0.30, 0.80, 1.0], // recycled: laundry rinse, cooling makeup, irrigation
];
export const WATER_FLOW_CELLS = ipf(WATER_SEED, PORTFOLIO_WATER_SOURCES.map((s) => s.m3), WATER_END_USE.map((u) => u.m3));
export const WATER_SANKEY = matrixToSankey(
  PORTFOLIO_WATER_SOURCES.map((s, i) => ({ id: `src-${i}`, label: s.source, color: s.color, total: s.m3 })),
  WATER_END_USE.map((u, j) => ({ id: `use-${j}`, label: u.use, color: u.color, total: u.m3 })),
  WATER_FLOW_CELLS,
);

/* ── Waste: source → route (already a matrix in the canonical data) ────────── */
const ROUTES = [
  { id: "recycled", label: "Recycled", color: CHART.olive },
  { id: "composted", label: "Composted", color: CHART.mauve },
  { id: "energyRec", label: "Energy recovery", color: CHART.sand },
  { id: "landfill", label: "Landfill", color: CHART.remainder },
] as const;
export const WASTE_SANKEY = (() => {
  const nodes: SankeyNode[] = [
    ...WASTE_BY_SOURCE.map((s, i) => ({ id: `src-${i}`, label: s.source, column: 0, color: s.color })),
    ...ROUTES.map((r) => ({ id: r.id, label: r.label, column: 1, color: r.color })),
  ];
  const links: SankeyLink[] = [];
  WASTE_BY_SOURCE.forEach((s, i) => ROUTES.forEach((r) => { const v = s.streams[r.id]; if (v > 0) links.push({ source: `src-${i}`, target: r.id, value: v, color: r.id === "landfill" ? CHART.remainder : s.color }); }));
  return { nodes, links };
})();

/* ── Carbon: source → scope → total ────────────────────────────────────────── */
export const CARBON_SANKEY = (() => {
  const nodes: SankeyNode[] = [
    ...SCOPE1_BREAKDOWN.map((s, i) => ({ id: `s1-${i}`, label: s.source.replace(/ \(.*\)$/, ""), column: 0, color: s.color })),
    { id: "grid", label: "Grid electricity", column: 0, color: CHART.mauve },
    ...PORTFOLIO_SCOPE3_CATEGORIES.map((c, i) => ({ id: `s3-${i}`, label: c.category, column: 0, color: CHART.blush })),
    { id: "scope1", label: "Scope 1", column: 1, color: CHART.moss, sub: "direct" },
    { id: "scope2", label: "Scope 2", column: 1, color: CHART.mauve, sub: "location-based" },
    { id: "scope3", label: "Scope 3", column: 1, color: CHART.blush, sub: "value chain" },
    { id: "total", label: "Total emissions", column: 2, color: CHART.olive },
  ];
  const links: SankeyLink[] = [
    ...SCOPE1_BREAKDOWN.map((s, i) => ({ source: `s1-${i}`, target: "scope1", value: s.tco2e, color: s.color })),
    { source: "grid", target: "scope2", value: SCOPE2_METHODS.locationBased.tco2e, color: CHART.mauve },
    ...PORTFOLIO_SCOPE3_CATEGORIES.map((c, i) => ({ source: `s3-${i}`, target: "scope3", value: c.tco2e, color: CHART.blush })),
    { source: "scope1", target: "total", value: SCOPE1_BREAKDOWN.reduce((s, x) => s + x.tco2e, 0), color: CHART.moss },
    { source: "scope2", target: "total", value: SCOPE2_METHODS.locationBased.tco2e, color: CHART.mauve },
    { source: "scope3", target: "total", value: PORTFOLIO_SCOPE3_CATEGORIES.reduce((s, x) => s + x.tco2e, 0), color: CHART.blush },
  ];
  return { nodes, links };
})();

/* ── Hotel × month intensity (heatmap) — the portfolio month shape applied to each hotel ── */
const jitter = (a: number, b: number) => ((((a + 1) * 7919 + (b + 1) * 104729) % 1000) / 1000 - 0.5) * 0.08;
export const MONTHS = PORTFOLIO_MONTHLY_TREND.map((m) => m.month);
function monthShape(key: "carbon" | "energy" | "waterM3") {
  const vals = PORTFOLIO_MONTHLY_TREND.map((m) => m[key]);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  return vals.map((v) => v / mean);
}
export function hotelMonthly(metric: "carbon" | "energy" | "water") {
  const shape = monthShape(metric === "carbon" ? "carbon" : metric === "energy" ? "energy" : "waterM3");
  return PORTFOLIO_HOTELS.map((h, i) => {
    const base = metric === "carbon" ? h.carbonIntensity : metric === "energy" ? h.energyIntensity : h.waterIntensity;
    return { hotel: h.shortName, values: shape.map((s, m) => +(base * s * (1 + jitter(i, m))).toFixed(metric === "water" ? 0 : 1)), total: base };
  });
}

/* ── Per-hotel fuel mix (% of energy) — consistent with each hotel's renewable share ── */
export const HOTEL_FUEL_MIX: Record<string, { grid: number; gas: number; diesel: number; renewables: number }> = {
  "Skyline Dubai":               { grid: 72, gas: 17, diesel: 3,  renewables: 8 },
  "Airport Hotel Dubai":         { grid: 70, gas: 18, diesel: 12, renewables: 0 },
  "Bay View Singapore":          { grid: 72, gas: 11, diesel: 3,  renewables: 14 },
  "The Pavilion London":         { grid: 48, gas: 22, diesel: 2,  renewables: 28 },
  "Grand Harbour Lisbon":        { grid: 60, gas: 20, diesel: 2,  renewables: 18 },
  "Marina Residences Barcelona": { grid: 70, gas: 23, diesel: 3,  renewables: 4 },
  "Oceanfront Cape Town":        { grid: 33, gas: 15, diesel: 10, renewables: 42 },
  "The Montrose Paris":          { grid: 44, gas: 18, diesel: 2,  renewables: 36 },
  "Peaks Resort Zermatt":        { grid: 54, gas: 20, diesel: 2,  renewables: 24 },
  "Riverside Bangkok":           { grid: 78, gas: 13, diesel: 9,  renewables: 0 },
};
