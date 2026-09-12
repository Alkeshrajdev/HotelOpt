/**
 * Target progress — §17.1.
 *
 * There is ONE formula, and it is direction-aware without modification:
 *
 *   Progress (%) = ( Baseline − Current ) ÷ ( Baseline − Target ) × 100
 *
 * For a reduction target Baseline > Target, so both numerator and denominator are positive
 * when improving. For an increase target — recovery rate, renewable coverage — both are
 * negative when improving, and the quotient is positive again. §17.1 says writing two
 * formulas is a defect; there is one, and this module has one.
 *
 * The three ways this figure gets quietly falsified, all refused here:
 *
 *   • Clamping a regression to zero. Progress is negative when current is worse than
 *     baseline and is returned negative. A hotel moving backwards must see that it is.
 *   • Clamping an overshoot to 100%. A passed target reads above 100 with the actual
 *     figure.
 *   • Computing across a basis change. Where baseline and current are not on the same
 *     boundary, base-year version or factor basis, progress is SUPPRESSED and the mismatch
 *     is named — not computed with a footnote.
 *
 * On-track status is judged against the trajectory, not the endpoint, and is reported as
 * Ahead, On track or Behind with the gap in the metric's own unit. Never as a score.
 */
import { dec, Decimal } from '../rounding'

export type TrajectoryKind = 'linear' | 'supplied_path'

export interface TrajectoryPoint {
  readonly year: number
  readonly expectedValue: Decimal.Value
}

export interface TargetDefinition {
  readonly metricCode: string
  readonly unit: string
  readonly baselineYear: number
  readonly baselineValue: Decimal.Value
  readonly targetYear: number
  readonly targetValue: Decimal.Value
  /** Progress always names the version it is measured against (§11.2). */
  readonly baseYearVersion: string
  readonly boundaryNote: string
  readonly factorBasis?: string
  readonly trajectory?: readonly TrajectoryPoint[]
}

export interface CurrentReading {
  readonly value: Decimal.Value
  /** Fractional years are allowed: 2026.5 is mid-2026. */
  readonly atYear: number
  readonly baseYearVersion: string
  readonly boundaryNote: string
  readonly factorBasis?: string
}

export type TargetDirection = 'reduction' | 'increase'
export type OnTrack = 'Ahead' | 'On track' | 'Behind'

export interface ProgressSuppressed {
  readonly available: false
  /** Named, not implied (§17.1). */
  readonly reason: string
  readonly baseYearVersion: string
}

export interface ProgressStated {
  readonly available: true
  readonly progressPercent: string
  readonly direction: TargetDirection
  readonly regression: boolean
  readonly achieved: boolean
  readonly expectedValue: string
  readonly onTrack: OnTrack
  /** In the metric's own unit; positive means better than the trajectory expects. */
  readonly gap: string
  readonly unit: string
  readonly baseYearVersion: string
}

export type Progress = ProgressStated | ProgressSuppressed

export class InvalidTarget extends Error {}

/**
 * The band within which a reading counts as On track rather than Ahead or Behind, as a
 * fraction of the baseline-to-target span.
 *
 * This is a display convention and nothing else: it changes which of three words is shown
 * and changes no number. The gap is always published in the metric's own unit, so a reader
 * who disagrees with the band can see exactly where the reading sits.
 */
export const ON_TRACK_BAND = 0.01

export function targetDirection(t: TargetDefinition): TargetDirection {
  return dec(t.targetValue).lessThan(dec(t.baselineValue)) ? 'reduction' : 'increase'
}

/** The trajectory's expected value at a point in time. */
export function expectedAt(t: TargetDefinition, atYear: number): Decimal {
  const baseline = dec(t.baselineValue)
  const target = dec(t.targetValue)

  if (!t.trajectory || t.trajectory.length === 0) {
    if (atYear <= t.baselineYear) return baseline
    if (atYear >= t.targetYear) return target
    const elapsed = dec(atYear - t.baselineYear)
    const span = dec(t.targetYear - t.baselineYear)
    return baseline.plus(target.minus(baseline).times(elapsed).dividedBy(span))
  }

  const path = [...t.trajectory].sort((a, b) => a.year - b.year)
  const first = path[0]!
  const last = path[path.length - 1]!
  if (atYear <= first.year) return dec(first.expectedValue)
  if (atYear >= last.year) return dec(last.expectedValue)

  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i]!
    const b = path[i + 1]!
    if (atYear >= a.year && atYear <= b.year) {
      const elapsed = dec(atYear - a.year)
      const span = dec(b.year - a.year)
      return dec(a.expectedValue).plus(
        dec(b.expectedValue).minus(dec(a.expectedValue)).times(elapsed).dividedBy(span),
      )
    }
  }
  return dec(last.expectedValue)
}

function comparabilityMismatch(t: TargetDefinition, c: CurrentReading): string | null {
  if (t.baseYearVersion !== c.baseYearVersion) {
    return `the baseline is stated against base-year version ${t.baseYearVersion} and the current figure against ${c.baseYearVersion}`
  }
  if (t.boundaryNote !== c.boundaryNote) {
    return `the baseline boundary is "${t.boundaryNote}" and the current figure's is "${c.boundaryNote}"`
  }
  if ((t.factorBasis ?? null) !== (c.factorBasis ?? null)) {
    return `the baseline factor basis is ${t.factorBasis ?? 'unstated'} and the current figure's is ${c.factorBasis ?? 'unstated'}`
  }
  return null
}

export function targetProgress(t: TargetDefinition, c: CurrentReading): Progress {
  const baseline = dec(t.baselineValue)
  const target = dec(t.targetValue)
  const span = baseline.minus(target)

  if (span.isZero()) {
    // Rejected at entry (§17.1); reaching here means it got past the form.
    throw new InvalidTarget(
      `${t.metricCode}: baseline and target are both ${baseline.toFixed()}, so there is no path to measure progress along`,
    )
  }
  if (t.targetYear <= t.baselineYear) {
    throw new InvalidTarget(
      `${t.metricCode}: the target year ${t.targetYear} does not follow the baseline year ${t.baselineYear}`,
    )
  }

  const mismatch = comparabilityMismatch(t, c)
  if (mismatch !== null) {
    return {
      available: false,
      reason: `Progress suppressed: ${mismatch}. Baseline and current must be on the same basis (§17.1).`,
      baseYearVersion: t.baseYearVersion,
    }
  }

  const current = dec(c.value)
  // The one formula. No branch on direction.
  const progress = baseline.minus(current).dividedBy(span).times(100)

  const expected = expectedAt(t, c.atYear)
  // Positive gap = better than the trajectory expects, in either direction.
  const gap = targetDirection(t) === 'reduction' ? expected.minus(current) : current.minus(expected)
  const band = span.abs().times(ON_TRACK_BAND)

  const onTrack: OnTrack = gap.abs().lessThanOrEqualTo(band)
    ? 'On track'
    : gap.greaterThan(0)
      ? 'Ahead'
      : 'Behind'

  return {
    available: true,
    // Never clamped at either end (§17.1).
    progressPercent: progress.toFixed(),
    direction: targetDirection(t),
    regression: progress.lessThan(0),
    achieved: progress.greaterThanOrEqualTo(100),
    expectedValue: expected.toFixed(),
    onTrack,
    gap: gap.toFixed(),
    unit: t.unit,
    baseYearVersion: t.baseYearVersion,
  }
}

/** The lines §17.1 requires beside a progress figure. Never a combined score. */
export function renderProgress(p: Progress): readonly string[] {
  if (!p.available) return [p.reason, `Base-year version: ${p.baseYearVersion}`]
  return [
    `Progress: ${dec(p.progressPercent).toDecimalPlaces(1).toFixed(1)}%${p.achieved ? ' — target passed' : p.regression ? ' — behind the baseline' : ''}`,
    `${p.onTrack} against the trajectory: ${dec(p.gap).toDecimalPlaces(2).toFixed(2)} ${p.unit} versus an expected ${dec(p.expectedValue).toDecimalPlaces(2).toFixed(2)} ${p.unit}`,
    `Measured against base-year version ${p.baseYearVersion}`,
  ]
}
