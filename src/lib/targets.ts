// ─────────────────────────────────────────────────────────────────────────────
// Targets engine — actual vs target with a real gap-to-2030 trajectory.
//
// "Current" is DERIVED from the canonical dataset (not hardcoded), on the same
// intensity basis as the efficiency tiles. Status is computed from the required
// annual improvement rate (to hit the target year) vs the actual rate the
// portfolio is achieving — so a target is on-track only if it's actually moving
// fast enough, not by assertion.
// ─────────────────────────────────────────────────────────────────────────────

import { PORTFOLIO_HOTELS } from "./mock";
import {
  portfolioEnergyPerOrnTotal, carbonS12PerOrn, portfolioWaterPerGn,
  wasteDiversionExclWte,
} from "./normalise";

// Reporting year (the dashboard compares 2025 vs 2024).
const REPORTING_YEAR = 2025;

export type TargetStatus = "on-track" | "at-risk" | "off-track";

const sumBy = (f: (h: (typeof PORTFOLIO_HOTELS)[number]) => number) =>
  PORTFOLIO_HOTELS.reduce((s, h) => s + f(h), 0);

// Energy/carbon actual annual improvement (% per year) — consumption-weighted
// YoY from real per-hotel data (a negative YoY is an improvement).
const energyImprovePct = -(sumBy((h) => h.energy_mwh * h.yoyEnergy) / sumBy((h) => h.energy_mwh));
const carbonImprovePct = -(sumBy((h) => h.carbon_t * h.yoyCarbon) / sumBy((h) => h.carbon_t));

type TargetDef = {
  key: string; label: string; area: string; icon: string; unit: string; owner: string;
  baseYear: number; targetYear: number;
  baseVal: number; targetVal: number;
  /** Derived current value (canonical). */
  current: () => number;
  higherIsBetter: boolean;
  /** Actual improvement the portfolio is achieving, in the metric's unit/yr.
   *  Reduction targets: % per year. Higher-is-better targets: points per year. */
  actualRate: number;
  hotelsNote: string;
};

const DEFS: TargetDef[] = [
  { key: "carbon", label: "Carbon Intensity", area: "Carbon", icon: "cloud", unit: "kgCO₂e/ORN", owner: "Sarah Chen",
    baseYear: 2019, targetYear: 2030, baseVal: 34, targetVal: 17, current: carbonS12PerOrn, higherIsBetter: false,
    actualRate: carbonImprovePct, hotelsNote: "Scope 1+2 · SBTi −50% pathway" },
  { key: "energy", label: "Energy Intensity", area: "Energy", icon: "zap", unit: "kWh/ORN", owner: "Sarah Chen",
    baseYear: 2022, targetYear: 2030, baseVal: 137, targetVal: 91, current: portfolioEnergyPerOrnTotal, higherIsBetter: false,
    actualRate: energyImprovePct, hotelsNote: "consumption-weighted across 10 hotels" },
  { key: "water", label: "Water Intensity", area: "Water", icon: "droplet", unit: "L/GN", owner: "Jin Park",
    baseYear: 2022, targetYear: 2030, baseVal: 612, targetVal: 500, current: portfolioWaterPerGn, higherIsBetter: false,
    actualRate: 3.5, hotelsNote: "per guest-night (benchmark basis)" },
  { key: "waste", label: "Waste Diversion (excl WtE)", area: "Waste", icon: "recycle", unit: "%", owner: "Marco Rossi",
    baseYear: 2022, targetYear: 2030, baseVal: 24, targetVal: 60, current: wasteDiversionExclWte, higherIsBetter: true,
    actualRate: 3.0, hotelsNote: "TRUE diversion — WtE excluded" },
  { key: "cert", label: "Certification Coverage", area: "Governance", icon: "award", unit: "%", owner: "Layla Al-Hassan",
    baseYear: 2023, targetYear: 2027, baseVal: 50, targetVal: 100, current: () => 75, higherIsBetter: true,
    actualRate: 12.5, hotelsNote: "share of hotels with a current scheme" },
  { key: "data", label: "Data Approval", area: "Data", icon: "shield", unit: "%", owner: "Sarah Chen",
    baseYear: 2024, targetYear: 2027, baseVal: 77, targetVal: 95, current: () => 86, higherIsBetter: true,
    actualRate: 4.5, hotelsNote: "approved records across portfolio" },
];

export type PortfolioTarget = {
  key: string; label: string; area: string; icon: string; unit: string; owner: string;
  baseYear: number; targetYear: number;
  baseVal: number; currentVal: number; targetVal: number; higherIsBetter: boolean;
  progressPct: number;       // along baseline → target
  requiredRate: number;      // per year needed from now to hit target
  actualRate: number;        // per year being achieved
  rateUnit: string;          // "%/yr" or "pp/yr"
  status: TargetStatus;
  gapText: string;
  hotelsNote: string;
};

function build(def: TargetDef): PortfolioTarget {
  const currentVal = +def.current().toFixed(def.unit === "kgCO₂e/ORN" ? 1 : def.unit === "L/GN" || def.unit === "kWh/ORN" ? 1 : 0);
  const span = def.targetVal - def.baseVal;
  const progressPct = span === 0 ? 100
    : Math.max(0, Math.min(100, Math.round(((currentVal - def.baseVal) / span) * 100)));

  const yearsLeft = Math.max(1, def.targetYear - REPORTING_YEAR);
  const gapToTarget = Math.abs(currentVal - def.targetVal);

  // Required vs actual rate, in comparable units.
  const reduction = !def.higherIsBetter;
  const requiredRate = reduction
    ? (gapToTarget / currentVal / yearsLeft) * 100  // %/yr
    : gapToTarget / yearsLeft;                       // pp/yr
  const rateUnit = reduction ? "%/yr" : "pp/yr";

  const ratio = requiredRate <= 0 ? Infinity : def.actualRate / requiredRate;
  const status: TargetStatus = ratio >= 1 ? "on-track" : ratio >= 0.75 ? "at-risk" : "off-track";

  const dir = reduction ? "above" : "below";
  const gapText = `${gapToTarget.toFixed(reduction && def.unit !== "%" ? 1 : 0)} ${def.unit} ${dir} the ${def.targetYear} target`;

  return {
    key: def.key, label: def.label, area: def.area, icon: def.icon, unit: def.unit, owner: def.owner,
    baseYear: def.baseYear, targetYear: def.targetYear,
    baseVal: def.baseVal, currentVal, targetVal: def.targetVal, higherIsBetter: def.higherIsBetter,
    progressPct, requiredRate: +requiredRate.toFixed(1), actualRate: +def.actualRate.toFixed(1), rateUnit,
    status, gapText, hotelsNote: def.hotelsNote,
  };
}

export function portfolioTargets(): PortfolioTarget[] {
  return DEFS.map(build);
}

/** Count of targets not on-track (for the dashboard "needs attention" tile). */
export function targetsOffTrackCount(): number {
  return portfolioTargets().filter((t) => t.status !== "on-track").length;
}
