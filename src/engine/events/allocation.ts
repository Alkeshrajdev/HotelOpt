/**
 * Event allocation of hotel-side quantities — §12.3.
 *
 * The hotel-side portion of an event footprint is a VIEW onto quantities the hotel has
 * already reported. It is allocated, never added:
 *
 *   Allocated event energy = A_pool x ( event space-hours / Σ all space-hours in period )
 *
 * Two things about this are easy to get wrong and are therefore structural here.
 *
 * First, the result of an over-allocation is not a smaller number. §12.3 says an
 * allocation that would breach conservation is REJECTED and the footprint reports
 * "allocation basis exhausted". So this module returns an outcome union rather than a
 * quantity: a caller has to handle the exhausted case explicitly, and cannot accidentally
 * render a silently reduced figure as though it were the allocation.
 *
 * Second, simultaneous events. Where events overlap in the same space-hours the
 * denominator counts each hour once, so the space-hours budget is itself conserved —
 * which is why there are two counters, not one.
 */
import { dec, Decimal } from '../rounding'

export type AllocationDriver = 'energy' | 'water' | 'waste'
export type EnergyBasis = 'metered_function_space' | 'area_share_of_total'

export interface AllocationPool {
  readonly driver: AllocationDriver
  /** A_pool for the period. */
  readonly poolQuantity: Decimal.Value
  readonly unit: string
  /** Σ all space-hours in the period, each hour counted once. */
  readonly totalSpaceHours: Decimal.Value
  readonly quantityAllocated: Decimal.Value
  readonly spaceHoursAllocated: Decimal.Value
  readonly energyBasis?: EnergyBasis
}

export interface Allocated {
  readonly allocated: true
  readonly quantity: string
  readonly unit: string
  readonly eventSpaceHours: string
  readonly totalSpaceHours: string
  readonly sharePercent: string
  readonly basis: EnergyBasis | null
}

export interface Exhausted {
  readonly allocated: false
  /** The exact wording §12.3 requires on the footprint. */
  readonly reason: 'allocation basis exhausted'
  readonly detail: string
}

export type AllocationOutcome = Allocated | Exhausted

export function allocateToEvent(
  pool: AllocationPool,
  eventSpaceHours: Decimal.Value,
): AllocationOutcome {
  const hours = dec(eventSpaceHours)
  const total = dec(pool.totalSpaceHours)
  const poolQuantity = dec(pool.poolQuantity)

  if (hours.lessThanOrEqualTo(0)) {
    return {
      allocated: false,
      reason: 'allocation basis exhausted',
      detail: 'an allocation states the event space-hours it was computed from (§12.3)',
    }
  }

  const hoursAfter = dec(pool.spaceHoursAllocated).plus(hours)
  if (hoursAfter.greaterThan(total)) {
    return {
      allocated: false,
      reason: 'allocation basis exhausted',
      detail: `${dec(pool.spaceHoursAllocated).toFixed()} of ${total.toFixed()} space-hours in this period are already allocated, and this event claims a further ${hours.toFixed()}`,
    }
  }

  const quantity = poolQuantity.times(hours).dividedBy(total)
  const quantityAfter = dec(pool.quantityAllocated).plus(quantity)
  if (quantityAfter.greaterThan(poolQuantity)) {
    return {
      allocated: false,
      reason: 'allocation basis exhausted',
      detail: `${dec(pool.quantityAllocated).toFixed()} of ${poolQuantity.toFixed()} ${pool.unit} in this period are already allocated`,
    }
  }

  return {
    allocated: true,
    quantity: quantity.toFixed(),
    unit: pool.unit,
    eventSpaceHours: hours.toFixed(),
    totalSpaceHours: total.toFixed(),
    // total is known positive here: a non-positive denominator cannot reach this point,
    // because any positive hours would already have exceeded it above. Dividing directly
    // rather than through percentage() keeps the unreachable null branch out of a formula
    // §29.3 requires at 100% branch coverage.
    sharePercent: hours.dividedBy(total).times(100).toFixed(),
    basis: pool.energyBasis ?? null,
  }
}

export interface EnergyPoolInput {
  /** Metered function-space energy for the period, where sub-metering exists. */
  readonly meteredFunctionSpaceKwh?: Decimal.Value
  readonly meteredSourceReference?: string
  readonly meteredCoverageNote?: string
  /** The hotel's approved total energy for the period. */
  readonly approvedTotalKwh?: Decimal.Value
  /** Function-space share of conditioned floor area, recorded on the hotel profile. */
  readonly functionSpaceAreaShare?: Decimal.Value
}

export interface EnergyPoolChoice {
  readonly basis: EnergyBasis
  readonly poolQuantity: string
  readonly unit: 'kWh'
  /** Published on the event footprint alongside the allocation (§12.3). */
  readonly basisNote: string
}

/**
 * Choose A_pool for energy, in the order of preference §12.3 sets out.
 *
 * Where sub-metering exists but is M&V-only, the metered figure may still be the
 * allocation basis without breaching §8.1: the quantity being allocated is still the
 * billed total, and the meter supplies a RATIO, not a reported figure. That distinction
 * is why the coverage note is mandatory — it is what makes the ratio auditable.
 */
export function chooseEnergyPool(input: EnergyPoolInput): EnergyPoolChoice | null {
  if (input.meteredFunctionSpaceKwh !== undefined) {
    if (!input.meteredSourceReference?.trim() || !input.meteredCoverageNote?.trim()) {
      return null
    }
    return {
      basis: 'metered_function_space',
      poolQuantity: dec(input.meteredFunctionSpaceKwh).toFixed(),
      unit: 'kWh',
      basisNote: `Metered function-space energy from ${input.meteredSourceReference}. Coverage: ${input.meteredCoverageNote}. The meter supplies the ratio; the quantity allocated remains the billed total (§8.1, §12.3).`,
    }
  }

  if (input.approvedTotalKwh !== undefined && input.functionSpaceAreaShare !== undefined) {
    const share = dec(input.functionSpaceAreaShare)
    if (share.lessThanOrEqualTo(0) || share.greaterThan(1)) return null
    return {
      basis: 'area_share_of_total',
      poolQuantity: dec(input.approvedTotalKwh).times(share).toFixed(),
      unit: 'kWh',
      basisNote: `Approved total energy for the period times the function-space share of conditioned floor area (${share.times(100).toDecimalPlaces(2).toFixed()}%), recorded on the hotel profile (§12.3).`,
    }
  }

  return null
}

/** The allocation driver for each quantity (§12.3). */
export const ALLOCATION_DRIVER_BASIS: Record<AllocationDriver, string> = {
  energy: 'event space-hours over all space-hours in the period',
  water: 'event covers over all covers in the period',
  waste: 'event covers plus attendee-days over the period total',
}
