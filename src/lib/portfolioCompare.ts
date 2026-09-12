/**
 * Portfolio comparison — the one place the product looks across hotels.
 * Intensity league per pillar (raw, per occupied room night) sits next to the
 * genuine change from the GP engine. External benchmarking never uses GP.
 */
import type { GpUtility } from "./genuinePerformance";

export type Rag = "green" | "amber" | "red";
export type LeagueRow = { name: string; rooms: number; total: number; intensity: number; perM2?: number; yoy: number; rag: Rag };
export type League = { unit: string; totalUnit: string; avg: number; rows: LeagueRow[] };

/* Rows are sorted best → worst by intensity. */
export const LEAGUE: Record<GpUtility, League> = {
  energy: {
    unit: "kWh/ORN", totalUnit: "MWh", avg: 117.8,
    rows: [
      { name: "The Pavilion London",         rooms: 312, total: 1854, intensity: 89.3,  perM2: 88,  yoy: -8.1, rag: "green" },
      { name: "Grand Harbour Lisbon",        rooms: 248, total: 1650, intensity: 95.2,  perM2: 94,  yoy: -5.2, rag: "green" },
      { name: "The Montrose Paris",          rooms: 180, total: 1259, intensity: 98.7,  perM2: 97,  yoy: -3.8, rag: "green" },
      { name: "Skyline Dubai",               rooms: 520, total: 5086, intensity: 108.5, perM2: 105, yoy: -3.4, rag: "amber" },
      { name: "Bay View Singapore",          rooms: 410, total: 3581, intensity: 116.8, perM2: 110, yoy: -1.2, rag: "amber" },
      { name: "Oceanfront Cape Town",        rooms: 168, total: 1548, intensity: 129.6, perM2: 118, yoy:  2.1, rag: "amber" },
      { name: "Marina Residences Barcelona", rooms: 205, total: 1939, intensity: 141.8, perM2: 126, yoy:  1.4, rag: "red"   },
      { name: "Peaks Resort Zermatt",        rooms:  94, total: 953,  intensity: 157.5, perM2: 138, yoy:  4.2, rag: "red"   },
      { name: "Riverside Bangkok",           rooms: 220, total: 2245, intensity: 180.6, perM2: 152, yoy:  8.4, rag: "red"   },
      { name: "Airport Hotel Dubai",         rooms: 360, total: 4652, intensity: 221.8, perM2: 196, yoy:  6.3, rag: "red"   },
    ],
  },
  water: {
    unit: "m³/ORN", totalUnit: "m³", avg: 0.77,
    rows: [
      { name: "The Pavilion London",         rooms: 312, total: 51825, intensity: 0.60, yoy: -6.2, rag: "green" },
      { name: "Grand Harbour Lisbon",        rooms: 248, total: 44837, intensity: 0.64, yoy: -4.8, rag: "green" },
      { name: "The Montrose Paris",          rooms: 180, total: 33773, intensity: 0.67, yoy: -3.5, rag: "green" },
      { name: "Skyline Dubai",               rooms: 520, total: 96662, intensity: 0.70, yoy: -2.8, rag: "amber" },
      { name: "Bay View Singapore",          rooms: 410, total: 82687, intensity: 0.74, yoy: -1.5, rag: "amber" },
      { name: "Oceanfront Cape Town",        rooms: 168, total: 39596, intensity: 0.84, yoy:  1.8, rag: "amber" },
      { name: "Marina Residences Barcelona", rooms: 205, total: 50660, intensity: 0.91, yoy:  2.1, rag: "red"   },
      { name: "Peaks Resort Zermatt",        rooms:  94, total: 26204, intensity: 1.01, yoy:  3.5, rag: "red"   },
      { name: "Riverside Bangkok",           rooms: 220, total: 57065, intensity: 1.14, yoy:  7.2, rag: "red"   },
      { name: "Airport Hotel Dubai",         rooms: 360, total: 89092, intensity: 1.41, yoy:  5.6, rag: "red"   },
    ],
  },
  waste: {
    unit: "kg/ORN", totalUnit: "kg", avg: 11.78,
    rows: [
      { name: "The Pavilion London",         rooms: 312, total: 645610,  intensity: 9.01,  yoy: -8.1, rag: "green" },
      { name: "Grand Harbour Lisbon",        rooms: 248, total: 679695,  intensity: 9.47,  yoy: -5.5, rag: "green" },
      { name: "The Montrose Paris",          rooms: 180, total: 495235,  intensity: 9.93,  yoy: -4.2, rag: "green" },
      { name: "Skyline Dubai",               rooms: 520, total: 1507760, intensity: 10.63, yoy: -3.1, rag: "amber" },
      { name: "Bay View Singapore",          rooms: 410, total: 1307260, intensity: 11.32, yoy: -1.8, rag: "amber" },
      { name: "Oceanfront Cape Town",        rooms: 168, total: 553380,  intensity: 12.47, yoy:  2.3, rag: "amber" },
      { name: "Marina Residences Barcelona", rooms: 205, total: 721800,  intensity: 13.17, yoy:  1.9, rag: "red"   },
      { name: "Peaks Resort Zermatt",        rooms:  94, total: 376940,  intensity: 14.09, yoy:  3.8, rag: "red"   },
      { name: "Riverside Bangkok",           rooms: 220, total: 1036585, intensity: 15.59, yoy:  6.5, rag: "red"   },
      { name: "Airport Hotel Dubai",         rooms: 360, total: 1587960, intensity: 19.40, yoy:  4.2, rag: "red"   },
    ],
  },
  carbon: {
    unit: "kgCO₂e/ORN", totalUnit: "tCO₂e", avg: 25.2,
    rows: [
      { name: "The Pavilion London",         rooms: 312, total: 1235, intensity: 17.3, yoy: -8.5, rag: "green" },
      { name: "Grand Harbour Lisbon",        rooms: 248, total: 1412, intensity: 19.8, yoy: -5.2, rag: "green" },
      { name: "The Montrose Paris",          rooms: 180, total: 1045, intensity: 21.0, yoy: -4.8, rag: "green" },
      { name: "Skyline Dubai",               rooms: 520, total: 3182, intensity: 22.3, yoy: -3.5, rag: "amber" },
      { name: "Bay View Singapore",          rooms: 410, total: 2813, intensity: 24.4, yoy: -2.1, rag: "amber" },
      { name: "Oceanfront Cape Town",        rooms: 168, total: 1329, intensity: 28.1, yoy:  1.5, rag: "amber" },
      { name: "Marina Residences Barcelona", rooms: 205, total: 1759, intensity: 31.5, yoy:  2.6, rag: "red"   },
      { name: "Peaks Resort Zermatt",        rooms:  94, total: 1021, intensity: 38.0, yoy:  4.1, rag: "red"   },
      { name: "Riverside Bangkok",           rooms: 220, total: 2968, intensity: 44.5, yoy:  7.8, rag: "red"   },
      { name: "Airport Hotel Dubai",         rooms: 360, total: 3904, intensity: 59.1, yoy:  5.4, rag: "red"   },
    ],
  },
};
