/**
 * Genuine Performance — fitting and fit statistics — §B.2, §B.5, §B.4 step 5.
 *
 * Model form:  Ŷ = β₀ + Σᵢ βᵢ·Xᵢ + Σⱼ γⱼ·Eⱼ
 *
 * `p` COUNTS EVERY PARAMETER THE FITTING PROCEDURE CHOSE, not only those visible in the
 * final equation: the intercept, each retained driver coefficient, each change-point in
 * a 3P/4P/5P form, each event indicator coefficient, and each base temperature selected
 * by SEARCH.
 *
 * The guide is explicit about why: "Counting only the visible coefficients understates
 * p, overstates the fit and narrows the prediction interval — which shows up as false
 * verdicts, not as a statistics complaint." A search over 25 candidate base temperatures
 * that is not charged against degrees of freedom is exactly that mistake.
 *
 * Fitting runs in double precision, which is standard for regression and well inside
 * §30's cross-implementation tolerance. Reported consumption figures remain Decimal:
 * this module produces coefficients and statistics, never a published quantity.
 */

export type ModelForm = 'linear' | '3P_heating' | '3P_cooling' | '4P' | '5P'

/** Change-points introduced by each ASHRAE Guideline 14 form (§B.2). */
export const FORM_CHANGE_POINTS: Record<ModelForm, number> = {
  linear: 0,
  '3P_heating': 1,
  '3P_cooling': 1,
  '4P': 1,
  '5P': 2,
}

export interface ParameterCount {
  readonly intercept: number
  readonly driverCoefficients: number
  readonly changePoints: number
  readonly eventIndicators: number
  /** One per direction searched. Both searched means p increases by two (§B.3). */
  readonly searchedBaseTemperatures: number
  readonly p: number
}

export function countParameters(input: {
  readonly driverCount: number
  readonly form: ModelForm
  readonly eventIndicatorCount: number
  readonly searchedBaseTemperatureDirections: number
}): ParameterCount {
  const intercept = 1
  const changePoints = FORM_CHANGE_POINTS[input.form]
  const p =
    intercept +
    input.driverCount +
    changePoints +
    input.eventIndicatorCount +
    input.searchedBaseTemperatureDirections
  return {
    intercept,
    driverCoefficients: input.driverCount,
    changePoints,
    eventIndicators: input.eventIndicatorCount,
    searchedBaseTemperatures: input.searchedBaseTemperatureDirections,
    p,
  }
}

/** The fixed scan range for a searched base temperature (§B.3). */
export const BASE_TEMPERATURE_SCAN = { minC: 14, maxC: 26, stepC: 0.5 } as const
export const DEFAULT_BASE_TEMPERATURE_C = 18

export function baseTemperatureCandidates(): readonly number[] {
  const out: number[] = []
  for (
    let t = BASE_TEMPERATURE_SCAN.minC;
    t <= BASE_TEMPERATURE_SCAN.maxC;
    t += BASE_TEMPERATURE_SCAN.stepC
  ) {
    out.push(Number(t.toFixed(1)))
  }
  return out
}

// ─── Ordinary least squares ───────────────────────────────────────────────────

export interface FitInput {
  /** Observed consumption, length n. */
  readonly y: readonly number[]
  /** Driver matrix, n rows × k columns. The intercept column is added here. */
  readonly x: readonly (readonly number[])[]
  readonly parameterCount: ParameterCount
}

export interface FitResult {
  /** [β₀, β₁ … βk]. */
  readonly coefficients: readonly number[]
  readonly fitted: readonly number[]
  readonly residuals: readonly number[]
  readonly n: number
  readonly p: number
  /** Residual standard error, s. */
  readonly s: number
  readonly cvRmsePercent: number
  readonly nmbePercent: number
  /** Retained as a diagnostic and NEVER a gate (§B.5). */
  readonly rSquared: number
  /** (XᵀX)⁻¹, needed for the leverage term in the prediction interval (§B.6). */
  readonly xtxInverse: readonly (readonly number[])[]
}

export class FitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FitError'
  }
}

function withIntercept(x: readonly (readonly number[])[]): number[][] {
  return x.map((row) => [1, ...row])
}

function multiplyTranspose(a: readonly (readonly number[])[]): number[][] {
  const cols = a[0]?.length ?? 0
  const out = Array.from({ length: cols }, () => Array<number>(cols).fill(0))
  for (const row of a) {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {
        out[i]![j]! += (row[i] as number) * (row[j] as number)
      }
    }
  }
  return out
}

/** Gauss-Jordan inversion with partial pivoting. */
function invert(m: readonly (readonly number[])[]): number[][] {
  const k = m.length
  const a = m.map((row, i) => [...row, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))])

  for (let col = 0; col < k; col++) {
    let pivot = col
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r
    }
    if (Math.abs(a[pivot]![col]!) < 1e-12) {
      throw new FitError('the driver matrix is singular: two drivers are collinear')
    }
    ;[a[col], a[pivot]] = [a[pivot] as number[], a[col] as number[]]

    const d = a[col]![col]!
    for (let j = 0; j < 2 * k; j++) a[col]![j]! /= d
    for (let r = 0; r < k; r++) {
      if (r === col) continue
      const f = a[r]![col]!
      if (f === 0) continue
      for (let j = 0; j < 2 * k; j++) a[r]![j]! -= f * a[col]![j]!
    }
  }
  return a.map((row) => row.slice(k))
}

export function fitModel(input: FitInput): FitResult {
  const n = input.y.length
  const p = input.parameterCount.p
  if (n === 0) throw new FitError('a model needs at least one observation')
  if (n <= p) {
    throw new FitError(
      `n (${n}) must exceed p (${p}); with no residual degrees of freedom the fit statistics are undefined`,
    )
  }

  const X = withIntercept(input.x)
  const xtx = multiplyTranspose(X)
  const xtxInv = invert(xtx)

  const k = X[0]?.length ?? 0
  const xty = Array<number>(k).fill(0)
  for (let r = 0; r < n; r++) {
    for (let i = 0; i < k; i++) xty[i]! += (X[r]![i] as number) * (input.y[r] as number)
  }

  const coefficients = xtxInv.map((row) =>
    row.reduce((acc, v, i) => acc + v * (xty[i] as number), 0),
  )
  const fitted = X.map((row) => row.reduce((acc, v, i) => acc + v * (coefficients[i] as number), 0))
  const residuals = input.y.map((v, i) => v - (fitted[i] as number))

  const meanY = input.y.reduce((a, b) => a + b, 0) / n
  const sse = residuals.reduce((a, r) => a + r * r, 0)
  const sst = input.y.reduce((a, v) => a + (v - meanY) ** 2, 0)

  // Both CV(RMSE) and NMBE divide by (n − p), so an understated p flatters both (§B.5).
  const s = Math.sqrt(sse / (n - p))
  const cvRmsePercent = (s / meanY) * 100
  const nmbePercent = (residuals.reduce((a, b) => a + b, 0) / ((n - p) * meanY)) * 100

  return {
    coefficients,
    fitted,
    residuals,
    n,
    p,
    s,
    cvRmsePercent,
    nmbePercent,
    rSquared: sst === 0 ? 0 : 1 - sse / sst,
    xtxInverse: xtxInv,
  }
}

// ─── Model rejection (§B.4 step 5) ────────────────────────────────────────────

export type RejectionReason =
  | 'implausible_coefficient_sign'
  | 'collinear_driver'
  | 'negative_intercept'
  | 'intercept_exceeds_minimum_observed'
  | 'cv_rmse_exceeds_limit'
  | 'nmbe_exceeds_limit'

/**
 * The fit gates — §3.3, ASHRAE Guideline 14 and IPMVP Option C practice for whole-facility
 * monthly models. Configurable per methodology version; these are the defaults. R² is
 * never a gate: strong seasonality inflates it.
 */
export const CV_RMSE_MAX_PERCENT = 15
export const NMBE_ABS_MAX_PERCENT = 5

export interface RejectionCheck {
  readonly rejected: boolean
  readonly reasons: readonly { readonly reason: RejectionReason; readonly detail: string }[]
}

/** VIF at or above this rejects the retained driver (§B.4 step 5). */
export const VIF_LIMIT = 5

/**
 * Variance inflation factors — App. B.4 step 5.
 *
 * VIFⱼ = 1 / (1 − R²ⱼ), where R²ⱼ is from regressing driver j on the others. It answers a
 * question the fit itself cannot: whether two drivers move together closely enough that
 * neither coefficient means anything on its own. A model can fit beautifully and still be
 * unable to tell you which of two drivers did the work.
 *
 * This matters the moment a second driver arrives. Occupancy and cooling degree days are
 * the pair this platform will hold, and in a resort they are strongly ANTI-correlated —
 * which is a real relationship and exactly why both are needed, but it is also how a VIF
 * climbs. §B.4 rejects at 5, and the rejection is the honest outcome: with drivers that
 * collinear, a coefficient is not a fact about the building.
 *
 * Returned in driver order, excluding the intercept. A single driver cannot be collinear
 * with anything, so it is always 1.
 */
export function varianceInflationFactors(x: readonly (readonly number[])[]): readonly number[] {
  const k = x[0]?.length ?? 0
  if (k <= 1) return Array.from({ length: k }, () => 1)

  return Array.from({ length: k }, (_, j) => {
    const y = x.map((row) => row[j] as number)
    const others = x.map((row) => row.filter((_, i) => i !== j))
    let rSquared: number
    try {
      rSquared = fitModel({
        y,
        x: others,
        parameterCount: countParameters({
          driverCount: k - 1,
          form: 'linear',
          eventIndicatorCount: 0,
          searchedBaseTemperatureDirections: 0,
        }),
      }).rSquared
    } catch {
      // A singular matrix here means the other drivers already reproduce this one
      // exactly, which is perfect collinearity — an infinite VIF, reported as a number
      // above the limit so the caller's comparison behaves.
      return Number.POSITIVE_INFINITY
    }
    if (rSquared >= 1) return Number.POSITIVE_INFINITY
    return 1 / (1 - rSquared)
  })
}

export function checkModelAcceptable(input: {
  readonly coefficients: readonly number[]
  /** Expected sign per driver, in the same order as the driver columns. */
  readonly expectedSigns: readonly ('positive' | 'negative' | 'any')[]
  readonly vifs: readonly number[]
  readonly minimumObservedConsumption: number
  /** The fit statistics, gated at §3.3's thresholds. Absent, the gate is not applied. */
  readonly cvRmsePercent?: number | undefined
  readonly nmbePercent?: number | undefined
  readonly cvRmseMaxPercent?: number | undefined
  readonly nmbeAbsMaxPercent?: number | undefined
}): RejectionCheck {
  const reasons: { reason: RejectionReason; detail: string }[] = []
  const intercept = input.coefficients[0] ?? 0

  // The fit gates come first: a model that does not describe its own training data is
  // not a model, whatever its coefficients look like.
  const cvMax = input.cvRmseMaxPercent ?? CV_RMSE_MAX_PERCENT
  const nmbeMax = input.nmbeAbsMaxPercent ?? NMBE_ABS_MAX_PERCENT
  if (input.cvRmsePercent !== undefined && input.cvRmsePercent > cvMax) {
    reasons.push({
      reason: 'cv_rmse_exceeds_limit',
      detail: `CV(RMSE) is ${input.cvRmsePercent.toFixed(1)}%, above the limit of ${cvMax}%`,
    })
  }
  if (input.nmbePercent !== undefined && Math.abs(input.nmbePercent) > nmbeMax) {
    reasons.push({
      reason: 'nmbe_exceeds_limit',
      detail: `NMBE is ${input.nmbePercent.toFixed(1)}%, outside ±${nmbeMax}%`,
    })
  }

  // The intercept is interpreted as base load (§B.2). A negative base load is not a
  // building, and one above the property's quietest month is not base load either.
  if (intercept < 0) {
    reasons.push({
      reason: 'negative_intercept',
      detail: `the intercept is ${intercept.toFixed(2)}; base load cannot be negative`,
    })
  }
  if (intercept > input.minimumObservedConsumption) {
    reasons.push({
      reason: 'intercept_exceeds_minimum_observed',
      detail: `the intercept ${intercept.toFixed(2)} exceeds the minimum observed consumption ${input.minimumObservedConsumption}`,
    })
  }

  input.expectedSigns.forEach((expected, i) => {
    const beta = input.coefficients[i + 1]
    if (beta === undefined || expected === 'any') return
    const wrong = (expected === 'positive' && beta < 0) || (expected === 'negative' && beta > 0)
    if (wrong) {
      reasons.push({
        reason: 'implausible_coefficient_sign',
        detail: `driver ${i + 1} has coefficient ${beta.toFixed(4)}, expected ${expected}`,
      })
    }
  })

  input.vifs.forEach((vif, i) => {
    if (vif >= VIF_LIMIT) {
      reasons.push({
        reason: 'collinear_driver',
        detail: `driver ${i + 1} has VIF ${vif.toFixed(2)}, at or above the limit of ${VIF_LIMIT}`,
      })
    }
  })

  return { rejected: reasons.length > 0, reasons }
}
