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
  { id: "energy-intensity", label: "Energy Intensity",  value: "117.8", unit: "kWh/ORN", delta: -6.0,                         drilldown: "energy-intensity" },
  { id: "renewable",        label: "Renewable share",   value: "12", unit: "%",       delta: 3.0, goodDirection: "up",        drilldown: "renewable" },
];
export const ENERGY = { kpis: ENERGY_KPIS };

/* -------- WATER -------- */
const WATER_KPIS: PillarKpiSpec[] = [
  { id: "water-intensity", label: "Water Intensity",   value: "0.77", unit: "m³/ORN", delta: -4.1,                          drilldown: "water-intensity" },
  { id: "water-perm2",     label: "Water per m²",      value: "1.6",  unit: "m³/m²", delta: -2.4,                          drilldown: "water-intensity" },
  { id: "water-recycled",  label: "Recycled share",    value: "22",   unit: "%",     delta: 6.0, goodDirection: "up",      drilldown: "water-recycled" },
  { id: "water-leaks",     label: "Leak alerts (30d)", value: "2",                   delta: -50,                            drilldown: "water-leaks" },
];

export const WATER = {
  kpis: WATER_KPIS,
  trend: [
    { x: "May 25", v: 1.64 }, { x: "Jun", v: 1.68 }, { x: "Jul", v: 1.71 },
    { x: "Aug", v: 1.75 }, { x: "Sep", v: 1.64 }, { x: "Oct", v: 1.58 },
    { x: "Nov", v: 1.51 }, { x: "Dec", v: 1.48 }, { x: "Jan", v: 1.44 },
    { x: "Feb", v: 1.41 }, { x: "Mar", v: 1.41 }, { x: "Apr 26", v: 1.41 },
  ] as TrendPoint[],
  sources: [
    { name: "Municipal supply",     value: 62, color: "#807245" },
    { name: "Recycled / greywater", value: 22, color: "#AF8D84" },
    { name: "Borewell",             value: 12, color: "#959891" },
    { name: "Other",                value: 4,  color: "#E0E5DA" },
  ],
  byProperty: [
    { name: "Skyline Dubai",  value: 1.38 },
    { name: "Peaks Resort Zermatt",    value: 1.54 },
    { name: "Oceanfront Cape Town",     value: 1.75 },
    { name: "The Pavilion London", value: 1.31 },
    { name: "Marina Residences Barcelona", value: 1.48 },
    { name: "Airport Hotel Dubai",     value: 2.05 },
  ],
};

/* -------- WASTE -------- */
const WASTE_KPIS: PillarKpiSpec[] = [
  { id: "waste-intensity", label: "Waste / ORN",        value: "11.78", unit: "kg/ORN", delta: -2.4,                       drilldown: "waste-intensity" },
  { id: "diversion",       label: "Diversion (excl/incl WtE)", value: "42 / 54", unit: "%", delta: 5.1, goodDirection: "up",   drilldown: "diversion" },
  { id: "food-waste",      label: "Food waste / cover", value: "82",    unit: "g",     delta: 8.6,                          drilldown: "food-waste" },
  { id: "landfill",        label: "Landfill diverted",  value: "1,260", unit: "tCO₂e", delta: 14,   goodDirection: "up",   drilldown: "diversion" },
];

export const WASTE = {
  kpis: WASTE_KPIS,
  trend: [
    { x: "May 25", v: 13.7 }, { x: "Jun", v: 13.1 }, { x: "Jul", v: 13.1 },
    { x: "Aug", v: 12.4 }, { x: "Sep", v: 12.4 }, { x: "Oct", v: 12.4 },
    { x: "Nov", v: 11.8 }, { x: "Dec", v: 11.8 }, { x: "Jan", v: 11.8 },
    { x: "Feb", v: 11.8 }, { x: "Mar", v: 11.8 }, { x: "Apr 26", v: 11.8 },
  ] as TrendPoint[],
  streams: [
    { name: "Organic / food",   value: 38, color: "#807245" },
    { name: "Mixed recyclable", value: 26, color: "#AF8D84" },
    { name: "Landfill",         value: 22, color: "#C2C9CC" },
    { name: "Glass",            value: 8,  color: "#959891" },
    { name: "Hazardous",        value: 4,  color: "#B33650" },
    { name: "E-waste",          value: 2,  color: "#8B6D66" },
  ],
  diversionByProperty: [
    { name: "Skyline Dubai",  value: 78 },
    { name: "Peaks Resort Zermatt",    value: 71 },
    { name: "Oceanfront Cape Town",     value: 64 },
    { name: "The Pavilion London", value: 62 },
    { name: "Marina Residences Barcelona", value: 56 },
    { name: "Airport Hotel Dubai",     value: 41 },
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
  { id: "carbon-intensity", label: "Carbon Intensity",  value: "0.025",  unit: "tCO₂e/ORN", delta: -7.2,  drilldown: "carbon-intensity" },
  { id: "scope-1",          label: "Scope 1",           value: "3,428",  unit: "tCO₂e",     delta: -3.1,  drilldown: "scope-1" },
  { id: "scope-2",          label: "Scope 2 (location)",value: "14,569", unit: "tCO₂e",     delta: -12.1, drilldown: "scope-2" },
  { id: "scope-3",          label: "Scope 3",           value: "24,853", unit: "tCO₂e",     delta: -2.2,  drilldown: "scope-3" },
];

export const CARBON = {
  kpis: CARBON_KPIS,
  trend: [
    { x: "May 25", v: 0.032 }, { x: "Jun", v: 0.030 }, { x: "Jul", v: 0.030 },
    { x: "Aug", v: 0.029 }, { x: "Sep", v: 0.028 }, { x: "Oct", v: 0.027 },
    { x: "Nov", v: 0.026 }, { x: "Dec", v: 0.026 }, { x: "Jan", v: 0.025 },
    { x: "Feb", v: 0.025 }, { x: "Mar", v: 0.025 }, { x: "Apr 26", v: 0.025 },
  ] as TrendPoint[],
};

