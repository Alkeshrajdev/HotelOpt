/**
 * Baseline screening — SPEC-04B §3.6 step 1, SPEC-03C · C6.
 *
 * The platform computes studentised residuals against a provisional fit and flags periods
 * beyond ±2.5, plus any period whose consumption, occupancy or degree days sit more than
 * three standard deviations from the property's own mean. It flags; a person decides.
 *
 * Two rules shape what comes out:
 *
 *   • A flag is a question, not a verdict (C6 rule 3). The reason says what is unusual
 *     about the month IN ITS OWN UNITS — "31% below this property's mean electricity"
 *     — never the residual figure (rule 5). The statistic decides the flag; the reader
 *     never sees it.
 *   • Every period is returned, flagged or not (step 2). An abnormal year can be smoothly
 *     abnormal and produce no outliers at all; the unflagged months are shown too, and
 *     confirming the window is confirming all of them.
 */
import { fitModel, countParameters, FitError } from './fit'

export const RESIDUAL_FLAG_THRESHOLD = 2.5
export const DEVIATION_FLAG_SIGMA = 3

export interface ScreeningPeriod {
  readonly month: string
  readonly value: number
  /** Driver values in a fixed order shared by every period; a missing driver is null. */
  readonly drivers: readonly (number | null)[]
}

export interface ScreeningFlag {
  readonly month: string
  /** In the month's own units, never a residual. */
  readonly reasonInUnits: string
}

export interface ScreeningResult {
  /** One per input period, in input order. `flag` is null where nothing was unusual. */
  readonly rows: readonly { readonly month: string; readonly flag: ScreeningFlag | null }[]
  readonly flagged: number
  /** True where the provisional fit could not be made; the deviation tests still ran. */
  readonly provisionalFitUnavailable: boolean
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

function standardDeviation(values: readonly number[], m: number): number {
  if (values.length < 2) return 0
  const ss = values.reduce((a, v) => a + (v - m) * (v - m), 0)
  return Math.sqrt(ss / (values.length - 1))
}

function percentAgainst(value: number, reference: number): string {
  if (reference === 0) return 'far from'
  const pct = ((value - reference) / Math.abs(reference)) * 100
  return `${Math.abs(pct).toFixed(0)}% ${pct < 0 ? 'below' : 'above'}`
}

/**
 * @param driverLabels one per driver column, in the reader's words ("occupied room nights").
 * @param unit the consumption unit, for the sentence.
 */
export function screenWindow(
  periods: readonly ScreeningPeriod[],
  driverLabels: readonly string[],
  unit: string,
): ScreeningResult {
  const reasons = new Map<string, string[]>()
  const add = (month: string, reason: string) => {
    const list = reasons.get(month) ?? []
    list.push(reason)
    reasons.set(month, list)
  }

  // Deviation tests on the property's own mean: consumption, then each driver.
  const values = periods.map((p) => p.value)
  const vMean = mean(values)
  const vSd = standardDeviation(values, vMean)
  if (vSd > 0) {
    for (const p of periods) {
      if (Math.abs(p.value - vMean) > DEVIATION_FLAG_SIGMA * vSd) {
        add(
          p.month,
          `consumption ${percentAgainst(p.value, vMean)} this property's mean of ${vMean.toFixed(0)} ${unit}`,
        )
      }
    }
  }
  driverLabels.forEach((label, i) => {
    const present = periods.filter((p) => p.drivers[i] !== null && p.drivers[i] !== undefined)
    const ds = present.map((p) => p.drivers[i] as number)
    const dMean = mean(ds)
    const dSd = standardDeviation(ds, dMean)
    if (dSd > 0) {
      for (const p of present) {
        const d = p.drivers[i] as number
        if (Math.abs(d - dMean) > DEVIATION_FLAG_SIGMA * dSd) {
          add(
            p.month,
            `${label} ${percentAgainst(d, dMean)} this property's mean of ${dMean.toFixed(0)}`,
          )
        }
      }
    }
  })

  // Studentised residuals against a provisional fit on the periods with every driver.
  let provisionalFitUnavailable = false
  const complete = periods.filter((p) => p.drivers.every((d) => d !== null && d !== undefined))
  if (complete.length >= driverLabels.length + 3 && driverLabels.length > 0) {
    try {
      const fit = fitModel({
        y: complete.map((p) => p.value),
        x: complete.map((p) => p.drivers.map((d) => d as number)),
        parameterCount: countParameters({
          driverCount: driverLabels.length,
          form: 'linear',
          eventIndicatorCount: 0,
          searchedBaseTemperatureDirections: 0,
        }),
      })
      if (fit.s > 0) {
        complete.forEach((p, i) => {
          const residual = fit.residuals[i] as number
          const fitted = fit.fitted[i] as number
          // Internally studentised on the residual standard error; leverage is left out
          // of the provisional screen, which is a screen and not the published model.
          const studentised = residual / fit.s
          if (Math.abs(studentised) > RESIDUAL_FLAG_THRESHOLD) {
            add(
              p.month,
              `consumption ${percentAgainst(p.value, fitted)} what this property's own drivers would put it at (${fitted.toFixed(0)} ${unit})`,
            )
          }
        })
      }
    } catch (error) {
      if (!(error instanceof FitError)) throw error
      provisionalFitUnavailable = true
    }
  } else {
    provisionalFitUnavailable = true
  }

  const rows = periods.map((p) => {
    const list = reasons.get(p.month)
    return {
      month: p.month,
      flag: list === undefined ? null : { month: p.month, reasonInUnits: list.join('; ') },
    }
  })
  return { rows, flagged: rows.filter((r) => r.flag !== null).length, provisionalFitUnavailable }
}
