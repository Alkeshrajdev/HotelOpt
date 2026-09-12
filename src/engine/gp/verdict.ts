/**
 * Genuine Performance — expected range, verdict and decomposition — §B.6, §B.8, §B.9.
 *
 * Genuine Performance identifies whether resource use is above, within or below the
 * expected operating range after accounting for hotel activity, weather and documented
 * operational changes. It does not prove waste, diagnose equipment or verify savings.
 */
import { Decimal, dec, percentage } from '../rounding'

/** Two-sided 80% prediction interval, so t is taken at 0.90 (§B.6). */
export const PREDICTION_INTERVAL = 0.8
/** |Y₀ − Ŷ₀| / Ŷ₀ below this is Within expected range regardless of the interval. */
export const MATERIALITY_FLOOR = 0.03
/** A driver more than this far outside its training range publishes no verdict. */
export const EXTRAPOLATION_LIMIT = 0.1

export type Verdict =
  | 'better_than_expected'
  | 'within_expected_range'
  | 'above_expected_range'
  | 'outside_modelled_range'
  | 'not_available'

export interface DriverRange {
  readonly driver: string
  readonly trainingMin: number
  readonly trainingMax: number
  readonly reportingValue: number
}

export interface VerdictInput {
  readonly actual: number
  readonly expected: number
  /** Residual standard error from the fit. */
  readonly s: number
  readonly n: number
  readonly p: number
  /** x₀ᵀ(XᵀX)⁻¹x₀ — widens the band as conditions depart from the training centroid. */
  readonly leverage: number
  readonly driverRanges: readonly DriverRange[]
}

export interface VerdictResult {
  readonly verdict: Verdict
  readonly expected: string
  readonly lowerBound: string | null
  readonly upperBound: string | null
  readonly variance: string
  readonly variancePercent: string | null
  readonly reason: string
  /** Named where the verdict is outside_modelled_range (§B.6). */
  readonly extrapolatedDrivers: readonly string[]
}

/**
 * Student's t quantile at 0.90, by residual degrees of freedom.
 *
 * Tabulated rather than computed: the values are fixed by the 80% interval §B.6
 * specifies, and a table is auditable in a way an inverse-CDF approximation is not.
 */
const T_90: Record<number, number> = {
  1: 3.078,
  2: 1.886,
  3: 1.638,
  4: 1.533,
  5: 1.476,
  6: 1.44,
  7: 1.415,
  8: 1.397,
  9: 1.383,
  10: 1.372,
  11: 1.363,
  12: 1.356,
  13: 1.35,
  14: 1.345,
  15: 1.341,
  16: 1.337,
  17: 1.333,
  18: 1.33,
  19: 1.328,
  20: 1.325,
  22: 1.321,
  24: 1.318,
  26: 1.315,
  28: 1.313,
  30: 1.31,
  40: 1.303,
  60: 1.296,
  120: 1.289,
}

export function tQuantile90(df: number): number {
  if (df <= 0) throw new Error('degrees of freedom must be positive')
  const keys = Object.keys(T_90)
    .map(Number)
    .sort((a, b) => a - b)
  if (df >= 120) return 1.282 // the normal limit
  const exact = T_90[df]
  if (exact !== undefined) return exact
  // Conservative: use the next lower df, which gives a wider interval rather than a
  // narrower one. An interval that errs wide produces fewer false flags.
  const lower = keys.filter((k) => k < df).pop()
  return T_90[lower ?? 1] ?? 3.078
}

export function evaluateVerdict(input: VerdictInput): VerdictResult {
  const actual = dec(input.actual)
  const expected = dec(input.expected)
  const variance = actual.minus(expected)
  const variancePercent = percentage(variance, expected)

  // Extrapolation guard: no verdict where a driver lies more than 10% outside its
  // training range. The band would be an extrapolation dressed as a prediction.
  const extrapolated = input.driverRanges.filter((d) => {
    const span = d.trainingMax - d.trainingMin
    if (span <= 0) return d.reportingValue !== d.trainingMin
    const margin = span * EXTRAPOLATION_LIMIT
    return d.reportingValue < d.trainingMin - margin || d.reportingValue > d.trainingMax + margin
  })

  if (extrapolated.length > 0) {
    return {
      verdict: 'outside_modelled_range',
      expected: expected.toFixed(),
      lowerBound: null,
      upperBound: null,
      variance: variance.toFixed(),
      variancePercent: variancePercent?.toFixed() ?? null,
      reason: `no verdict is published: ${extrapolated
        .map((d) => d.driver)
        .join(', ')} lies more than ${EXTRAPOLATION_LIMIT * 100}% outside the training range`,
      extrapolatedDrivers: extrapolated.map((d) => d.driver),
    }
  }

  const df = input.n - input.p
  if (df <= 0 || expected.isZero()) {
    return {
      verdict: 'not_available',
      expected: expected.toFixed(),
      lowerBound: null,
      upperBound: null,
      variance: variance.toFixed(),
      variancePercent: variancePercent?.toFixed() ?? null,
      reason: 'the model has no residual degrees of freedom, or the expected value is zero',
      extrapolatedDrivers: [],
    }
  }

  const halfWidth = dec(tQuantile90(df))
    .times(input.s)
    .times(Math.sqrt(1 + input.leverage))
  const lower = expected.minus(halfWidth)
  const upper = expected.plus(halfWidth)

  // Materiality floor: a variance below 3% of expected is Within expected range
  // regardless of the interval. A tight model on a stable property would otherwise flag
  // a difference too small to act on.
  const relative = variance.abs().div(expected)
  if (relative.lessThan(MATERIALITY_FLOOR)) {
    return {
      verdict: 'within_expected_range',
      expected: expected.toFixed(),
      lowerBound: lower.toFixed(),
      upperBound: upper.toFixed(),
      variance: variance.toFixed(),
      variancePercent: variancePercent?.toFixed() ?? null,
      reason: `the variance is below the ${MATERIALITY_FLOOR * 100}% materiality floor`,
      extrapolatedDrivers: [],
    }
  }

  const verdict: Verdict = actual.greaterThan(upper)
    ? 'above_expected_range'
    : actual.lessThan(lower)
      ? 'better_than_expected'
      : 'within_expected_range'

  return {
    verdict,
    expected: expected.toFixed(),
    lowerBound: lower.toFixed(),
    upperBound: upper.toFixed(),
    variance: variance.toFixed(),
    variancePercent: variancePercent?.toFixed() ?? null,
    reason:
      verdict === 'within_expected_range'
        ? 'the actual value lies inside the 80% prediction interval'
        : `the actual value lies outside the 80% prediction interval`,
    extrapolatedDrivers: [],
  }
}

// ─── Decomposition (§B.8) ─────────────────────────────────────────────────────

export interface DriverMovement {
  readonly driver: string
  readonly coefficient: Decimal.Value
  readonly baseValue: Decimal.Value
  readonly currentValue: Decimal.Value
  readonly group: 'weather' | 'occupancy' | 'activity'
}

export interface Decomposition {
  readonly actualChange: string
  readonly driverEffects: readonly {
    readonly driver: string
    readonly group: string
    readonly effect: string
  }[]
  /** The balancing residual, so the decomposition reconciles by construction. */
  readonly genuine: string
  readonly reconciles: boolean
  readonly byGroup: Readonly<Record<string, string>>
}

/**
 * Decompose a change into driver effects and a Genuine term.
 *
 *   Δ Actual  = Yₜ − Yₜ₀
 *   Δ Driverᵢ = βᵢ · (Xᵢ,ₜ − Xᵢ,ₜ₀)
 *   Δ Genuine = Δ Actual − Σᵢ Δ Driverᵢ
 *
 * The Genuine term is the balancing residual, so the decomposition reconciles to the
 * raw change by construction — the same device that makes §10.2's cost variance
 * reconcile.
 */
export function decompose(
  baseConsumption: Decimal.Value,
  currentConsumption: Decimal.Value,
  drivers: readonly DriverMovement[],
): Decomposition {
  const actualChange = dec(currentConsumption).minus(baseConsumption)

  const effects = drivers.map((d) => ({
    driver: d.driver,
    group: d.group,
    effect: dec(d.coefficient).times(dec(d.currentValue).minus(d.baseValue)),
  }))

  const driverTotal = effects.reduce<Decimal>((a, e) => a.plus(e.effect), dec(0))
  const genuine = actualChange.minus(driverTotal)

  const byGroup: Record<string, string> = {}
  for (const e of effects) {
    byGroup[e.group] = dec(byGroup[e.group] ?? 0)
      .plus(e.effect)
      .toFixed()
  }

  return {
    actualChange: actualChange.toFixed(),
    driverEffects: effects.map((e) => ({
      driver: e.driver,
      group: e.group,
      effect: e.effect.toFixed(),
    })),
    genuine: genuine.toFixed(),
    reconciles: driverTotal.plus(genuine).equals(actualChange),
    byGroup,
  }
}

/**
 * The decomposition as percentage points of the base — the headline sentence's numbers
 * (SPEC-03F · F3 block 2): "consumption rose 7.2%; weather accounts for 4.1 points,
 * occupancy for 1.6; the remaining 1.5 points is performance."
 *
 * Null where the base is zero: there is no percentage of nothing.
 */
export function decompositionPoints(
  d: Decomposition,
  base: Decimal.Value,
): {
  readonly actualChangePercent: string
  readonly byGroupPoints: Readonly<Record<string, string>>
  readonly genuinePoints: string
} | null {
  const b = dec(base)
  if (b.isZero()) return null
  const pts = (v: Decimal.Value) => dec(v).div(b).times(100).toFixed()
  const byGroupPoints: Record<string, string> = {}
  for (const [group, effect] of Object.entries(d.byGroup)) byGroupPoints[group] = pts(effect)
  return {
    actualChangePercent: pts(d.actualChange),
    byGroupPoints,
    genuinePoints: pts(d.genuine),
  }
}

// ─── Drift and eligibility (§B.9) ─────────────────────────────────────────────

export interface DriftState {
  readonly modelReviewRequired: boolean
  /** The verdict, expected value, range and variance continue to display unchanged. */
  readonly suppressesOutput: false
  readonly reason: string | null
}

/**
 * Three consecutive periods on the same side of the interval add a "Model review
 * required" marker. THE SIGNAL IS NEVER SUPPRESSED (§B.9, §7.6): the marker is added
 * beside the output, and a drift marker alone never makes a model ineligible.
 */
export function detectDrift(recentVerdicts: readonly Verdict[]): DriftState {
  const last3 = recentVerdicts.slice(-3)
  const allAbove = last3.length === 3 && last3.every((v) => v === 'above_expected_range')
  const allBelow = last3.length === 3 && last3.every((v) => v === 'better_than_expected')

  return {
    modelReviewRequired: allAbove || allBelow,
    suppressesOutput: false,
    reason: allAbove
      ? 'three consecutive periods above the expected range'
      : allBelow
        ? 'three consecutive periods below the expected range'
        : null,
  }
}

/**
 * The only route from an eligible state to tier B is failing the fit gate on re-fit,
 * with the failed gate named. A drift marker alone never causes it (§B.9).
 */
export function eligibilityAfterRefit(input: {
  readonly gatePassed: boolean
  readonly failedGate?: string | undefined
  readonly driftMarker: boolean
}): { readonly tier: 'A' | 'B'; readonly reason: string } {
  if (!input.gatePassed) {
    return {
      tier: 'B',
      reason: `the model failed the fit gate on re-fit${input.failedGate ? `: ${input.failedGate}` : ''}; prior verdicts are retained with their model version, not withdrawn`,
    }
  }
  return {
    tier: 'A',
    reason: input.driftMarker
      ? 'a drift marker is present, which never by itself causes ineligibility'
      : 'the model remains eligible',
  }
}
