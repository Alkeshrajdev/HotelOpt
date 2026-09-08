/**
 * Display precision registry — Appendix C.2.
 *
 * This table is the single source of display precision for the UI, PDF renderer,
 * Excel export, certificate renderer and API. A second precision table anywhere
 * else in the codebase is a defect (App. C.3).
 */

export type QuantityKind =
  | 'energy.kwh'
  | 'energy.mwh'
  | 'energy.thermal.kwh'
  | 'districtCooling.rth'
  | 'intensity.energy.orn'
  | 'intensity.energy.area'
  | 'water.m3'
  | 'intensity.water.orn'
  | 'fuel.litres'
  | 'fuel.kg'
  | 'waste.tonnes'
  | 'waste.kg'
  | 'intensity.waste.guestNight'
  | 'emissions.tco2e'
  | 'emissions.kgco2e'
  | 'compensation.allocated.tco2e'
  | 'intensity.carbon.orn'
  | 'refrigerant.kg'
  | 'area.m2'
  | 'efficiency.cop'
  | 'percentage'
  | 'currency.transaction'
  | 'currency.aggregated'
  | 'rate'
  | 'occupancy'
  | 'activity.nights'
  | 'activity.declared'

const FIXED_PRECISION: Record<QuantityKind, number> = {
  'energy.kwh': 0,
  'energy.mwh': 1,
  'energy.thermal.kwh': 0,
  'districtCooling.rth': 0,
  'intensity.energy.orn': 1,
  'intensity.energy.area': 1,
  'water.m3': 0,
  'intensity.water.orn': 0,
  'fuel.litres': 0,
  'fuel.kg': 0,
  'waste.tonnes': 2,
  'waste.kg': 0,
  'intensity.waste.guestNight': 2,
  'emissions.tco2e': 1,
  'emissions.kgco2e': 0,
  // Guest allocations are fractional and pool conservation must hold exactly (App. C.2).
  'compensation.allocated.tco2e': 4,
  'intensity.carbon.orn': 2,
  'refrigerant.kg': 2,
  // Floor and function-space areas. Whole square metres: the survey they come from is not
  // more precise than that, and a decimal implies a measurement nobody took.
  'area.m2': 0,
  'efficiency.cop': 2,
  percentage: 1,
  'currency.transaction': 2,
  'currency.aggregated': 2,
  rate: 4,
  occupancy: 1,
  // Room nights and guest nights. A COUNT, not a measurement: half a room night is not a
  // thing that happens, and a decimal place here would imply a precision the night audit
  // does not have. Present in the registry rather than rounded at a call site, so this
  // stays the only place a precision is decided (App. C.3).
  'activity.nights': 0,
  // Declared activity for Scope 3: passenger-kilometres, vehicle-kilometres, room nights.
  // Whole units, because the four numbers they are derived from are whole.
  'activity.declared': 0,
}

/** Aggregated currency at or above this magnitude displays in whole units (App. C.2). */
export const CURRENCY_AGGREGATION_THRESHOLD = 1_000_000

/**
 * Display precision for a quantity kind. `magnitude` is required only for kinds
 * whose precision depends on size; passing it otherwise is harmless.
 */
export function displayPrecision(kind: QuantityKind, magnitude?: number): number {
  if (kind === 'currency.aggregated') {
    return magnitude !== undefined && Math.abs(magnitude) >= CURRENCY_AGGREGATION_THRESHOLD ? 0 : 2
  }
  return FIXED_PRECISION[kind]
}

export const QUANTITY_KINDS = Object.keys(FIXED_PRECISION) as QuantityKind[]
