// Per-pillar dummy data. Replace with real API calls per pillar later.

export type TrendPoint = { x: string; v: number };

export type PillarKpiSpec = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  goodDirection?: "up" | "down";
  caption?: string;
  drilldown: string;
};

/* -------- ENERGY -------- */
const ENERGY_KPIS: PillarKpiSpec[] = [
  { id: "energy-score",     label: "Energy Score",      value: "82", unit: "%",       caption: "data compliance",            drilldown: "energy-score" },
  { id: "energy-index",     label: "Performance Index", value: "91",                  delta: -4.2,                            drilldown: "energy-index" },
  { id: "energy-intensity", label: "Energy Intensity",  value: "24", unit: "kWh/ORN", delta: -6.0,                            drilldown: "energy-intensity" },
  { id: "renewable",        label: "Renewable share",   value: "78", unit: "%",       delta: 3.0, goodDirection: "up",        drilldown: "renewable" },
];
export const ENERGY = { kpis: ENERGY_KPIS };

/* -------- WATER -------- */
const WATER_KPIS: PillarKpiSpec[] = [
  { id: "water-intensity", label: "Water Intensity",   value: "0.42", unit: "m³/ORN", delta: -4.1,                          drilldown: "water-intensity" },
  { id: "water-perm2",     label: "Water per m²",      value: "1.6",  unit: "m³/m²", delta: -2.4,                          drilldown: "water-intensity" },
  { id: "water-recycled",  label: "Recycled share",    value: "22",   unit: "%",     delta: 6.0, goodDirection: "up",      drilldown: "water-recycled" },
  { id: "water-leaks",     label: "Leak alerts (30d)", value: "2",                   delta: -50,                            drilldown: "water-leaks" },
];

export const WATER = {
  kpis: WATER_KPIS,
  trend: [
    { x: "May 25", v: 0.49 }, { x: "Jun", v: 0.50 }, { x: "Jul", v: 0.51 },
    { x: "Aug", v: 0.52 }, { x: "Sep", v: 0.49 }, { x: "Oct", v: 0.47 },
    { x: "Nov", v: 0.45 }, { x: "Dec", v: 0.44 }, { x: "Jan", v: 0.43 },
    { x: "Feb", v: 0.42 }, { x: "Mar", v: 0.42 }, { x: "Apr 26", v: 0.42 },
  ] as TrendPoint[],
  sources: [
    { name: "Municipal supply",     value: 62, color: "#0EA5E9" },
    { name: "Recycled / greywater", value: 22, color: "#22D3EE" },
    { name: "Borewell",             value: 12, color: "#7DD3FC" },
    { name: "Other",                value: 4,  color: "#A5F3FC" },
  ],
  byProperty: [
    { name: "Greenview Resort",  value: 0.41 },
    { name: "Mountain Lodge",    value: 0.46 },
    { name: "Seaside Hotel",     value: 0.52 },
    { name: "City Centre Hotel", value: 0.39 },
    { name: "Palm Beach Resort", value: 0.44 },
    { name: "Airport Hotel",     value: 0.61 },
  ],
};

/* -------- WASTE -------- */
const WASTE_KPIS: PillarKpiSpec[] = [
  { id: "waste-intensity", label: "Waste / ORN",        value: "1.8",   unit: "kg/ORN", delta: -2.4,                       drilldown: "waste-intensity" },
  { id: "diversion",       label: "Diversion rate",     value: "64",    unit: "%",     delta: 5.1,  goodDirection: "up",   drilldown: "diversion" },
  { id: "food-waste",      label: "Food waste / cover", value: "82",    unit: "g",     delta: 8.6,                          drilldown: "food-waste" },
  { id: "landfill",        label: "Landfill diverted",  value: "1,260", unit: "tCO₂e", delta: 14,   goodDirection: "up",   drilldown: "diversion" },
];

export const WASTE = {
  kpis: WASTE_KPIS,
  trend: [
    { x: "May 25", v: 2.1 }, { x: "Jun", v: 2.0 }, { x: "Jul", v: 2.0 },
    { x: "Aug", v: 1.9 }, { x: "Sep", v: 1.9 }, { x: "Oct", v: 1.9 },
    { x: "Nov", v: 1.8 }, { x: "Dec", v: 1.8 }, { x: "Jan", v: 1.8 },
    { x: "Feb", v: 1.8 }, { x: "Mar", v: 1.8 }, { x: "Apr 26", v: 1.8 },
  ] as TrendPoint[],
  streams: [
    { name: "Organic / food",   value: 38, color: "#0D9488" },
    { name: "Mixed recyclable", value: 26, color: "#14B8A6" },
    { name: "Landfill",         value: 22, color: "#94A3B8" },
    { name: "Glass",            value: 8,  color: "#0EA5E9" },
    { name: "Hazardous",        value: 4,  color: "#DC2626" },
    { name: "E-waste",          value: 2,  color: "#7C3AED" },
  ],
  diversionByProperty: [
    { name: "Greenview Resort",  value: 78 },
    { name: "Mountain Lodge",    value: 71 },
    { name: "Seaside Hotel",     value: 64 },
    { name: "City Centre Hotel", value: 62 },
    { name: "Palm Beach Resort", value: 56 },
    { name: "Airport Hotel",     value: 41 },
  ],
  foodByMeal: [
    { name: "Breakfast", value: 62 },
    { name: "Lunch",     value: 88 },
    { name: "Dinner",    value: 110 },
    { name: "All-day",   value: 68 },
  ],
};

/* -------- CARBON -------- */
const CARBON_KPIS: PillarKpiSpec[] = [
  { id: "carbon-intensity", label: "Carbon Intensity",  value: "0.041",  unit: "tCO₂e/ORN", delta: -7.2,  drilldown: "carbon-intensity" },
  { id: "scope-1",          label: "Scope 1",           value: "1,820",  unit: "tCO₂e",     delta: -3.1,  drilldown: "scope-1" },
  { id: "scope-2",          label: "Scope 2 (market)",  value: "4,910",  unit: "tCO₂e",     delta: -12.1, drilldown: "scope-2" },
  { id: "scope-3",          label: "Scope 3",           value: "22,640", unit: "tCO₂e",     delta: -2.2,  drilldown: "scope-3" },
];

export const CARBON = {
  kpis: CARBON_KPIS,
  trend: [
    { x: "May 25", v: 0.052 }, { x: "Jun", v: 0.050 }, { x: "Jul", v: 0.049 },
    { x: "Aug", v: 0.048 }, { x: "Sep", v: 0.046 }, { x: "Oct", v: 0.044 },
    { x: "Nov", v: 0.043 }, { x: "Dec", v: 0.042 }, { x: "Jan", v: 0.041 },
    { x: "Feb", v: 0.041 }, { x: "Mar", v: 0.041 }, { x: "Apr 26", v: 0.041 },
  ] as TrendPoint[],
};

/* -------- SOCIAL -------- */
const SOCIAL_KPIS: PillarKpiSpec[] = [
  { id: "headcount",   label: "Headcount",          value: "3,240",            delta: 4.1, goodDirection: "up", drilldown: "headcount" },
  { id: "female-lead", label: "Female leadership",  value: "42",   unit: "%",  delta: 3.5, goodDirection: "up", drilldown: "diversity" },
  { id: "training",    label: "Training hrs / FTE", value: "18",                delta: 2.0, goodDirection: "up", drilldown: "training" },
  { id: "ltifr",       label: "LTIFR",              value: "0.42",             delta: -12,                       drilldown: "safety" },
];

export const SOCIAL = {
  kpis: SOCIAL_KPIS,
  headcountTrend: [
    { x: "May 25", v: 3110 }, { x: "Jun", v: 3140 }, { x: "Jul", v: 3160 },
    { x: "Aug", v: 3170 }, { x: "Sep", v: 3175 }, { x: "Oct", v: 3180 },
    { x: "Nov", v: 3190 }, { x: "Dec", v: 3200 }, { x: "Jan", v: 3215 },
    { x: "Feb", v: 3225 }, { x: "Mar", v: 3230 }, { x: "Apr 26", v: 3240 },
  ] as TrendPoint[],
  byGender: [
    { name: "Female", value: 49, color: "#7C3AED" },
    { name: "Male", value: 50, color: "#A78BFA" },
    { name: "Non-binary / undisclosed", value: 1, color: "#C4B5FD" },
  ],
  byAge: [
    { name: "Under 30", value: 28 },
    { name: "30 – 50", value: 58 },
    { name: "Over 50", value: 14 },
  ],
  byRole: [
    { name: "Operations", value: 62 },
    { name: "F&B", value: 18 },
    { name: "Engineering", value: 9 },
    { name: "Admin / HR", value: 7 },
    { name: "Leadership", value: 4 },
  ],
  trainingByRole: [
    { name: "Ground staff", value: 14 },
    { name: "Supervisors",  value: 22 },
    { name: "Managers",     value: 28 },
    { name: "Leadership",   value: 36 },
  ],
  ltifrTrend: [
    { x: "May 25", v: 0.62 }, { x: "Jun", v: 0.58 }, { x: "Jul", v: 0.55 },
    { x: "Aug", v: 0.52 }, { x: "Sep", v: 0.50 }, { x: "Oct", v: 0.48 },
    { x: "Nov", v: 0.47 }, { x: "Dec", v: 0.46 }, { x: "Jan", v: 0.45 },
    { x: "Feb", v: 0.44 }, { x: "Mar", v: 0.43 }, { x: "Apr 26", v: 0.42 },
  ] as TrendPoint[],
};

/* -------- GOVERNANCE -------- */
const GOV_KPIS: PillarKpiSpec[] = [
  { id: "attestations",  label: "Attestations complete",    value: "11/12",             delta: 1, goodDirection: "up",                                  drilldown: "attestations" },
  { id: "ac-training",   label: "Anti-corruption training", value: "96",   unit: "%",   delta: 4, goodDirection: "up",                                  drilldown: "ac-training" },
  { id: "whistleblow",   label: "Whistleblowing resolved",  value: "3/3",                                                  caption: "last 12 months", drilldown: "whistleblow" },
  { id: "supplier-code", label: "Supplier code adoption",   value: "74",   unit: "%",   delta: 6, goodDirection: "up",                                  drilldown: "supplier-code" },
];

export const GOVERNANCE = {
  kpis: GOV_KPIS,
  attestationItems: [
    { name: "Anti-corruption policy",         lastAttested: "2026-03-12", status: "ready" as const },
    { name: "Code of conduct",                lastAttested: "2026-03-12", status: "ready" as const },
    { name: "Whistleblowing channel",         lastAttested: "2026-04-02", status: "ready" as const },
    { name: "Supplier code of conduct",       lastAttested: "2026-04-02", status: "ready" as const },
    { name: "Board sustainability oversight", lastAttested: "2026-02-18", status: "ready" as const },
    { name: "Conflict of interest register",  lastAttested: "2026-04-15", status: "ready" as const },
    { name: "Data privacy policy",            lastAttested: "2026-01-22", status: "ready" as const },
    { name: "Modern slavery statement",       lastAttested: "2026-03-30", status: "ready" as const },
    { name: "Tax transparency statement",     lastAttested: "2025-11-10", status: "ready" as const },
    { name: "Lobbying disclosure",            lastAttested: "2026-02-05", status: "ready" as const },
    { name: "Donations & sponsorships",       lastAttested: "2026-04-10", status: "ready" as const },
    { name: "Risk register review",           lastAttested: "—",          status: "gap"   as const },
  ],
  acByProperty: [
    { name: "Greenview Resort",  value: 100 },
    { name: "Mountain Lodge",    value: 98 },
    { name: "Seaside Hotel",     value: 96 },
    { name: "City Centre Hotel", value: 95 },
    { name: "Palm Beach Resort", value: 94 },
    { name: "Airport Hotel",     value: 88 },
  ],
};
