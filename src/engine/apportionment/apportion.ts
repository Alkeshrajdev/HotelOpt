/**
 * Billing-period apportionment — §6.4, §24.3.
 *
 * The platform distinguishes the billing record as issued by the supplier from the
 * monthly reporting value derived from it. A billing record spanning two or more
 * calendar months is split on a configured basis.
 *
 * A single-component degree-day weighting sends zero consumption to a month with zero
 * degree-days, which is physically wrong: a hotel has base load whether or not it needs
 * cooling. The split is therefore two-component, and the floor is explicit rather than
 * a clamp:
 *
 *     B   = Q × f                     base component
 *     V   = Q × (1 − f)               variable component
 *     Q_m = B × (d_m / D) + V × (w_m / Σ w_m)
 *
 * Conservation is exact at full precision: Σ Q_m = Q. The final month absorbs the
 * residual from decimal division and the residual is recorded (acceptance test T-09).
 *
 * Delivered fuels are never apportioned (§6.5) — a delivery is a purchase, not
 * consumption — so this module refuses them rather than trusting the caller.
 */
import { Decimal, dec, sum } from '../rounding'

export type ApportionmentBasis = 'calendar_days' | 'degree_day_weighted' | 'occupancy_weighted'

/**
 * The driver a weighting basis writes into the derived value. Genuine Performance
 * training must exclude a period whose value was apportioned on a driver present in
 * the candidate model, or the regression partly measures the apportionment rather than
 * the building (§6.4 CIRCULARITY BLOCK, acceptance test T-55).
 */
export type WeightingDriver = 'degree_days' | 'occupancy'

export const WEIGHTING_DRIVER: Record<ApportionmentBasis, WeightingDriver | null> = {
  calendar_days: null,
  degree_day_weighted: 'degree_days',
  occupancy_weighted: 'occupancy',
}

/** Default base-load fraction `f` by source, per §6.4. Configured per resource source. */
export const DEFAULT_BASE_LOAD_FRACTION = {
  electricity: '0.55',
  district_cooling: '0.35',
  occupancy_weighted: '0.50',
} as const

export interface MonthSlice {
  /** Reporting month as YYYY-MM. */
  readonly month: string
  /** Days of the billing period falling in this month (`d_m`). */
  readonly days: number
  /**
   * Weighting input for this month within the billing period (`w_m`) — degree-days or
   * occupied room nights. Required for a weighted basis, ignored for calendar days.
   */
  readonly weight?: Decimal.Value | undefined
}

export interface ApportionmentInput {
  /** Total billed quantity `Q`, in the canonical unit. */
  readonly quantity: Decimal.Value
  readonly basis: ApportionmentBasis
  /** Base-load fraction `f`, 0–1. Required for a weighted basis. */
  readonly baseLoadFraction?: Decimal.Value | undefined
  readonly months: readonly MonthSlice[]
  /** True where the source is a delivered fuel, which may never be apportioned. */
  readonly isDeliveredFuel?: boolean | undefined
}

export interface ApportionedMonth {
  readonly month: string
  readonly quantity: string
  /** The residual from decimal division absorbed by this month. Zero except the last. */
  readonly residualAbsorbed: string
}

export interface ApportionmentResult {
  readonly months: readonly ApportionedMonth[]
  /**
   * The basis actually applied. Where a weighted basis had a zero weighting input this
   * reads `calendar_days (weighting input zero)`, as §6.4 requires.
   */
  readonly basisApplied: string
  /** Null when the applied basis is calendar days — the reason it carries no exclusion. */
  readonly weightingDriver: WeightingDriver | null
  readonly baseLoadFraction: string | null
  readonly weightsUsed: readonly string[] | null
  readonly totalResidual: string
}

export class ApportionmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApportionmentError'
  }
}

export function apportion(input: ApportionmentInput): ApportionmentResult {
  if (input.isDeliveredFuel === true) {
    throw new ApportionmentError(
      'a delivered fuel is a purchase, not consumption, and is never apportioned (§6.5)',
    )
  }
  if (input.months.length === 0) {
    throw new ApportionmentError('a billing period covers at least one month')
  }
  if (input.months.some((m) => m.days <= 0)) {
    throw new ApportionmentError('every month slice covers at least one day')
  }

  const Q = dec(input.quantity)
  const D = input.months.reduce((acc, m) => acc + m.days, 0)

  const weightedBasis = input.basis !== 'calendar_days'
  const weights = input.months.map((m) => dec(m.weight ?? 0))
  const weightTotal = sum(weights)

  // Where Σ w_m = 0 the whole quantity apportions on calendar days, and the basis
  // recorded on the derived value says so (§6.4).
  const fallBackToCalendar = weightedBasis && weightTotal.isZero()
  const useWeighting = weightedBasis && !fallBackToCalendar

  let f: Decimal | null = null
  if (useWeighting) {
    if (input.baseLoadFraction === undefined) {
      throw new ApportionmentError('a weighted basis requires a base-load fraction')
    }
    f = dec(input.baseLoadFraction)
    if (f.lessThan(0) || f.greaterThan(1)) {
      throw new ApportionmentError('the base-load fraction lies between 0 and 1')
    }
    if (weights.some((w) => w.isNegative())) {
      throw new ApportionmentError('a weighting input is never negative')
    }
  }

  const B = useWeighting && f ? Q.times(f) : Q
  const V = useWeighting && f ? Q.times(dec(1).minus(f)) : dec(0)

  // Compute every month at full precision, then give the final month the residual so
  // that Σ Q_m = Q exactly. Components are never adjusted to force agreement (App. C.3).
  //
  // The weight travels WITH its month rather than being looked up by index. An indexed
  // lookup needs a `?? 0` fallback under noUncheckedIndexedAccess, and that fallback is
  // an unreachable branch in a formula §29.3 requires at 100% branch coverage — an
  // untestable branch in an allocation formula is exactly the thing that rule is for.
  const rows = input.months.map((m) => {
    const dayShare = B.times(m.days).div(D)
    const value = useWeighting
      ? dayShare.plus(V.times(dec(m.weight ?? 0)).div(weightTotal))
      : dayShare
    return { month: m.month, value }
  })

  const residual = Q.minus(sum(rows.map((r) => r.value)))

  const months: ApportionedMonth[] = rows.map((r, i) => {
    const isLast = i === rows.length - 1
    return {
      month: r.month,
      quantity: r.value.plus(isLast ? residual : 0).toFixed(),
      residualAbsorbed: isLast ? residual.toFixed() : '0',
    }
  })

  const basisApplied = fallBackToCalendar ? 'calendar_days (weighting input zero)' : input.basis

  return {
    months,
    basisApplied,
    weightingDriver: useWeighting ? WEIGHTING_DRIVER[input.basis] : null,
    baseLoadFraction: f ? f.toFixed() : null,
    weightsUsed: useWeighting ? weights.map((w) => w.toFixed()) : null,
    totalResidual: residual.toFixed(),
  }
}

/**
 * Whether a period apportioned this way may train a Genuine Performance model
 * containing `driver` (§6.4 CIRCULARITY BLOCK).
 *
 * Calendar-day apportionment carries no restriction, which is the reason it remains
 * the default. A reporting period that is itself weighted-apportioned may still
 * receive a verdict, because the model was not trained on it — that is a separate
 * question from this one.
 */
export function isEligibleForTraining(
  weightingDriver: WeightingDriver | null,
  modelDrivers: readonly WeightingDriver[],
): boolean {
  if (weightingDriver === null) return true
  return !modelDrivers.includes(weightingDriver)
}
