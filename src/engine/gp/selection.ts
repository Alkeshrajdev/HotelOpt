/**
 * Model selection — SPEC-04B §3.1a, §3.1b, §3.3; build plan WP7.
 *
 * Candidates are drawn from the permitted driver set only: automated all-subsets selection
 * over an unconstrained pool is prohibited, and the permitted set is fixed per resource.
 * Among the candidates that pass every gate, the one with the lowest CV(RMSE) after a
 * degrees-of-freedom penalty wins — so an extra driver has to buy its keep, and a model
 * with twelve observations and three drivers cannot be chosen at all (§3.1b: at least five
 * observations per driver).
 */
import { fitModel, countParameters, checkModelAcceptable, varianceInflationFactors } from './fit'
import type { FitResult, RejectionCheck } from './fit'

export const OBSERVATIONS_PER_DRIVER = 5
export const MAX_DRIVERS = 3

export interface Candidate<D extends string> {
  readonly drivers: readonly D[]
  readonly expectedSigns: readonly ('positive' | 'negative' | 'any')[]
}

export interface CandidateOutcome<D extends string> {
  readonly drivers: readonly D[]
  readonly fit: FitResult | null
  readonly rejection: RejectionCheck | null
  /** CV(RMSE) adjusted for parameters: the penalised figure the choice is made on. */
  readonly penalisedCvRmse: number | null
  readonly refusedBecause: string | null
}

export interface SelectionResult<D extends string> {
  readonly chosen: CandidateOutcome<D> | null
  readonly considered: readonly CandidateOutcome<D>[]
}

/**
 * The penalty is the small-sample correction to the residual variance, n / (n − p), so a
 * driver that reduces the residual by less than the freedom it consumes does not win.
 */
export function penalisedCvRmse(fit: FitResult): number {
  if (fit.n <= fit.p) return Number.POSITIVE_INFINITY
  return fit.cvRmsePercent * Math.sqrt(fit.n / (fit.n - fit.p))
}

/**
 * @param y consumption per training period
 * @param columns driver values per period, keyed by driver, aligned with y
 */
export function selectModel<D extends string>(
  y: readonly number[],
  columns: Readonly<Record<D, readonly number[]>>,
  candidates: readonly Candidate<D>[],
): SelectionResult<D> {
  const considered: CandidateOutcome<D>[] = candidates.map((c) => {
    if (c.drivers.length === 0 || c.drivers.length > MAX_DRIVERS) {
      return {
        drivers: c.drivers,
        fit: null,
        rejection: null,
        penalisedCvRmse: null,
        refusedBecause: 'a model has between one and three drivers',
      }
    }
    if (y.length < c.drivers.length * OBSERVATIONS_PER_DRIVER) {
      return {
        drivers: c.drivers,
        fit: null,
        rejection: null,
        penalisedCvRmse: null,
        refusedBecause: `${y.length} observations support at most ${Math.floor(y.length / OBSERVATIONS_PER_DRIVER)} driver(s); this candidate has ${c.drivers.length}`,
      }
    }
    const x = y.map((_, i) => c.drivers.map((d) => columns[d][i] as number))
    let fit: FitResult
    try {
      fit = fitModel({
        y,
        x,
        parameterCount: countParameters({
          driverCount: c.drivers.length,
          form: 'linear',
          eventIndicatorCount: 0,
          searchedBaseTemperatureDirections: 0,
        }),
      })
    } catch (error) {
      return {
        drivers: c.drivers,
        fit: null,
        rejection: null,
        penalisedCvRmse: null,
        refusedBecause: error instanceof Error ? error.message : 'the fit failed',
      }
    }
    const rejection = checkModelAcceptable({
      coefficients: fit.coefficients,
      expectedSigns: c.expectedSigns,
      vifs: varianceInflationFactors(x),
      minimumObservedConsumption: Math.min(...y),
      cvRmsePercent: fit.cvRmsePercent,
      nmbePercent: fit.nmbePercent,
    })
    return {
      drivers: c.drivers,
      fit,
      rejection,
      penalisedCvRmse: rejection.rejected ? null : penalisedCvRmse(fit),
      refusedBecause: rejection.rejected ? rejection.reasons.map((r) => r.detail).join('; ') : null,
    }
  })

  const eligible = considered.filter((c) => c.penalisedCvRmse !== null)
  eligible.sort((a, b) => (a.penalisedCvRmse as number) - (b.penalisedCvRmse as number))
  return { chosen: eligible[0] ?? null, considered }
}
