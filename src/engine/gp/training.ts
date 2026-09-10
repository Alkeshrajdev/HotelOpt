/**
 * Genuine Performance — training window assembly — §B.4, §7.3.
 *
 * The exclusions here are the whole reason a GP verdict can be trusted. Each one
 * removes a period whose value would teach the model something other than how the
 * building behaves.
 */
import type { QualityTier } from '../quality'
import type { WeightingDriver } from '../apportionment'

export type Driver = 'degree_days_cooling' | 'degree_days_heating' | 'occupancy' | 'covers'

/** The driver a weighting basis wrote into an apportioned value (§6.4). */
export const DRIVER_WEIGHTING: Record<Driver, WeightingDriver | null> = {
  degree_days_cooling: 'degree_days',
  degree_days_heating: 'degree_days',
  occupancy: 'occupancy',
  covers: null,
}

export interface TrainingPeriod {
  readonly month: string
  readonly value: number
  readonly tier: QualityTier
  /** Approved and complete, per §24.8. */
  readonly approved: boolean
  /** The weighting driver written into this value by apportionment, if any (§6.4). */
  readonly apportionedOnDriver: WeightingDriver | null
  /** Driver values. A missing driver excludes the period (§B.4 step 3b). */
  readonly drivers: Partial<Record<Driver, number>>
  /** Set where an operational event marks the period for exclusion (§B.7). */
  readonly eventExcluded: boolean
  /** Migrated periods must pass the §3.1 training-eligibility conditions. */
  readonly migratedAndIneligible?: boolean | undefined
}

export type ExclusionReason =
  | 'not_approved'
  | 'proxy_value'
  | 'estimated_over_limit'
  | 'event_excluded'
  | 'apportioned_on_model_driver'
  | 'missing_driver'
  | 'migrated_ineligible'
  | 'outside_history_start'

export interface ExcludedPeriod {
  readonly month: string
  readonly reason: ExclusionReason
  readonly detail: string
}

export interface TrainingWindow {
  readonly included: readonly TrainingPeriod[]
  readonly excluded: readonly ExcludedPeriod[]
  readonly n: number
}

/** At most two Estimated periods are permitted in a training window (§B.4 step 3). */
export const MAX_ESTIMATED_PERIODS = 2
/** §7.3 requires twelve periods for an eligible model. */
export const MINIMUM_TRAINING_PERIODS = 12
/** Rolling window: the most recent 24 complete approved months (§B.9). */
export const TRAINING_WINDOW_MONTHS = 24

export interface WindowOptions {
  readonly candidateDrivers: readonly Driver[]
  /** The property's model_history_start (§7.6.1). Periods earlier are excluded. */
  readonly modelHistoryStart?: string | undefined
}

/**
 * Assemble the training window.
 *
 * Estimated periods are admitted up to the limit, oldest first, so a recent estimate is
 * kept in preference to an old one — the recent months carry more information about how
 * the building behaves now.
 */
export function assembleTrainingWindow(
  periods: readonly TrainingPeriod[],
  options: WindowOptions,
): TrainingWindow {
  const excluded: ExcludedPeriod[] = []
  const survivors: TrainingPeriod[] = []

  // The candidate model's drivers determine which apportionment bases disqualify a
  // period (§6.4 circularity block).
  const modelWeightingDrivers = new Set(
    options.candidateDrivers
      .map((d) => DRIVER_WEIGHTING[d])
      .filter((w): w is WeightingDriver => w !== null),
  )

  const recent = [...periods]
    .sort((a, b) => (a.month < b.month ? 1 : -1))
    .slice(0, TRAINING_WINDOW_MONTHS)

  for (const p of recent) {
    if (options.modelHistoryStart !== undefined && p.month < options.modelHistoryStart) {
      excluded.push({
        month: p.month,
        reason: 'outside_history_start',
        detail: `earlier than the property's model history start of ${options.modelHistoryStart}`,
      })
      continue
    }
    if (!p.approved) {
      excluded.push({
        month: p.month,
        reason: 'not_approved',
        detail: 'the period is not approved',
      })
      continue
    }
    if (p.migratedAndIneligible === true) {
      excluded.push({
        month: p.month,
        reason: 'migrated_ineligible',
        detail: 'a migrated period failing the §3.1 training-eligibility conditions',
      })
      continue
    }
    if (p.eventExcluded) {
      excluded.push({
        month: p.month,
        reason: 'event_excluded',
        detail: 'an operational event marks this period for exclusion',
      })
      continue
    }
    if (p.tier === 'proxy') {
      excluded.push({
        month: p.month,
        reason: 'proxy_value',
        detail: 'the modelled resource carries a Proxy value',
      })
      continue
    }
    // A degree-day month with any missing daily reading has no value and is excluded
    // rather than interpolated (§B.3).
    const missing = options.candidateDrivers.filter((d) => p.drivers[d] === undefined)
    if (missing.length > 0) {
      excluded.push({
        month: p.month,
        reason: 'missing_driver',
        detail: `missing driver value: ${missing.join(', ')}`,
      })
      continue
    }
    // A period apportioned on a driver present in the candidate model would have that
    // driver written into it; regressing it against the same driver measures the
    // apportionment (§6.4).
    if (p.apportionedOnDriver !== null && modelWeightingDrivers.has(p.apportionedOnDriver)) {
      excluded.push({
        month: p.month,
        reason: 'apportioned_on_model_driver',
        detail: `apportioned on ${p.apportionedOnDriver}, which appears in the candidate model`,
      })
      continue
    }
    survivors.push(p)
  }

  // Permit at most two Estimated periods; drop the oldest beyond the limit.
  const estimated = survivors
    .filter((p) => p.tier === 'estimated')
    .sort((a, b) => (a.month < b.month ? -1 : 1))
  const overLimit = new Set(
    estimated.slice(0, Math.max(0, estimated.length - MAX_ESTIMATED_PERIODS)).map((p) => p.month),
  )

  const included = survivors.filter((p) => {
    if (!overLimit.has(p.month)) return true
    excluded.push({
      month: p.month,
      reason: 'estimated_over_limit',
      detail: `more than ${MAX_ESTIMATED_PERIODS} Estimated periods; the oldest are dropped`,
    })
    return false
  })

  return { included, excluded, n: included.length }
}

/**
 * The §7.3 reason a property falls short, phrased as the guide requires.
 *
 * Where exclusions leave fewer than twelve periods the reason displayed is
 * "insufficient periods after apportionment exclusion", not "insufficient history" —
 * the distinction matters because the second suggests waiting will fix it (§6.4).
 */
export function insufficiencyReason(window: TrainingWindow): string | null {
  if (window.n >= MINIMUM_TRAINING_PERIODS) return null
  const apportionmentExclusions = window.excluded.filter(
    (e) => e.reason === 'apportioned_on_model_driver',
  ).length
  if (
    apportionmentExclusions > 0 &&
    window.n + apportionmentExclusions >= MINIMUM_TRAINING_PERIODS
  ) {
    return 'insufficient periods after apportionment exclusion'
  }
  return 'insufficient history'
}
