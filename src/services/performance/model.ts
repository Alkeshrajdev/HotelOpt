/**
 * Genuine Performance, assembled from stored records — §7.3, App. B.
 *
 * The engine has had every piece of this since the platform was first written: the
 * training window and its exclusions, the least-squares fit, the acceptance checks, the
 * prediction interval and the verdict vocabulary. None of it has ever been called with a
 * hotel's months, so every card in the product says "the model is not eligible for this
 * period" — a sentence that has been true only because nothing tried.
 *
 * WHAT THIS MODULE IS FOR. Turning approved months into a training window, choosing which
 * drivers to offer the model, and carrying the engine's answer back — including when that
 * answer is "no verdict". It computes nothing: not the fit, not the interval, not the
 * verdict, not the reason a period was excluded.
 *
 * WHY A REFUSAL IS THE COMMON OUTCOME AND THAT IS CORRECT. §7.3 needs twelve eligible
 * periods; App. B.4 then throws out any that were estimated beyond the limit, apportioned
 * on one of the model's own drivers, marked by an operational event, or missing a driver
 * value. What survives is often fewer than twelve. And a model that survives all that
 * still has to pass B.4's plausibility checks — a negative base load is not a building.
 * Every one of those is a reason the card states rather than a verdict it invents, which
 * is the whole difference between this and a dashboard that always has an opinion.
 */
import {
  MINIMUM_TRAINING_PERIODS,
  assembleTrainingWindow,
  varianceInflationFactors,
  checkModelAcceptable,
  countParameters,
  evaluateVerdict,
  fitModel,
  insufficiencyReason,
} from '@/engine/gp'
import type { Driver, TrainingPeriod, Verdict, VerdictResult } from '@/engine/gp'

export interface MonthRecord {
  readonly month: string
  /** The consumption being modelled, in its canonical unit. */
  readonly value: number
  readonly tier: 'measured' | 'estimated' | 'proxy'
  readonly approved: boolean
  readonly occupiedRoomNights: number | null
  /**
   * Cooling degree days for the month, at the hotel's recorded base temperature. Null
   * where no series covers it — which excludes the month from a model that uses them,
   * rather than being read as a mild month.
   */
  readonly coolingDegreeDays: number | null
  /**
   * Where the degree-day series came from.
   *
   * Named on the card, not kept in the database for an auditor to find later. A verdict
   * is a statement about a building, and a reader deciding whether to act on it has to
   * know what the model was normalised against — a station reading and a modelled
   * reanalysis are not the same evidence, and a synthetic series is not evidence at all.
   */
  readonly coolingDegreeDaysSource: string | null
}

export type ModelOutcome =
  | {
      readonly eligible: true
      readonly verdict: Verdict
      readonly result: VerdictResult
      /** What the reader is told the verdict rests on (§5.2). */
      readonly basis: string
      readonly trainingMonths: number
      /** The fitted model, for the decomposition (§6): each driver with its coefficient and group. */
      readonly fitted: {
        readonly intercept: number
        readonly drivers: readonly {
          readonly driver: Driver
          readonly label: string
          readonly coefficient: number
          readonly group: 'weather' | 'occupancy' | 'activity'
        }[]
      }
    }
  | {
      readonly eligible: false
      /**
       * Why, in words a general manager can act on — the BECAUSE only.
       *
       * §5.2 names the state ("Genuine Performance not available") and the card renders
       * that; this supplies what follows the dash. Repeating the state here produced
       * "Genuine Performance not available — No verdict: this hotel's energy use…",
       * which says the same thing twice before reaching the point.
       */
      readonly reason: string
      /**
       * The engine's own wording — coefficients, intercepts, thresholds.
       *
       * Kept beside the sentence rather than instead of it. The first version of this
       * card published "driver 1 has coefficient -34.8176, expected positive" to a hotel
       * manager, which is exact, auditable and unusable. Whoever is debugging a model
       * needs it; whoever is running a hotel needs to be told that their electricity does
       * not track occupancy and why that means no verdict.
       */
      readonly detail?: string
    }

export interface ModelInput {
  /** Every month this hotel holds for the resource, including the reporting one. */
  readonly history: readonly MonthRecord[]
  readonly reportingMonth: string
  /** 'energy', 'water' — used only in the sentences the card shows. */
  readonly resourceLabel: string
}

/**
 * Which drivers to offer, decided by what the hotel actually has.
 *
 * App. B lists degree days before occupancy, and in a cooling-dominated climate that
 * order is not a preference — it is the difference between a model and a rejection. A
 * Gulf hotel is quietest in the hottest months, so occupancy alone comes out saying that
 * electricity FALLS as guests arrive, and B.4's plausibility check throws it out.
 *
 * So degree days are offered whenever the history carries enough of them, and the fallback
 * to occupancy alone is explicit rather than silent. A model whose simplicity nobody
 * noticed is the thing this shape exists to prevent.
 *
 * The threshold is the same twelve §7.3 needs, because offering a driver that only two
 * thirds of the months have would exclude the rest for a missing value and leave fewer
 * periods than occupancy alone would have had.
 */
function candidateDriversFor(history: readonly MonthRecord[]): readonly Driver[] {
  const approvedWithDegreeDays = history.filter(
    (m) => m.approved && m.coolingDegreeDays !== null,
  ).length
  return approvedWithDegreeDays >= MINIMUM_TRAINING_PERIODS
    ? ['degree_days_cooling', 'occupancy']
    : ['occupancy']
}

/**
 * Consumption rises with cooling degree days and with occupancy. A model saying otherwise
 * has learned something other than the building (§B.4 step 5).
 */
const EXPECTED_SIGN: Record<Driver, 'positive' | 'negative' | 'any'> = {
  degree_days_cooling: 'positive',
  degree_days_heating: 'positive',
  occupancy: 'positive',
  covers: 'positive',
}

const DRIVER_LABEL: Record<Driver, string> = {
  degree_days_cooling: 'cooling degree days',
  degree_days_heating: 'heating degree days',
  occupancy: 'occupancy',
  covers: 'covers',
}

/** Every permitted driver belongs to exactly one display group (SPEC-04B §3.1a). */
const DRIVER_GROUP: Record<Driver, 'weather' | 'occupancy' | 'activity'> = {
  degree_days_cooling: 'weather',
  degree_days_heating: 'weather',
  occupancy: 'occupancy',
  covers: 'activity',
}

export function driverValue(m: MonthRecord, driver: Driver): number | null {
  if (driver === 'occupancy') return m.occupiedRoomNights
  if (driver === 'degree_days_cooling') return m.coolingDegreeDays
  return null
}

function toTrainingPeriod(m: MonthRecord, drivers: readonly Driver[]): TrainingPeriod {
  const values: Partial<Record<Driver, number>> = {}
  for (const driver of drivers) {
    const value = driverValue(m, driver)
    // Absent rather than zero. A month with no degree-day series is a month the model
    // excludes for a missing driver (§B.4 step 3b); zero would read as a mild month and
    // teach the model that the building uses energy for no reason.
    if (value !== null) values[driver] = value
  }
  return {
    month: m.month,
    value: m.value,
    tier: m.tier,
    approved: m.approved,
    // Nothing in the demo is apportioned yet. When it is, the value carries the basis it
    // was apportioned on, and §6.4's circularity block excludes it from a model that uses
    // that same driver.
    apportionedOnDriver: null,
    drivers: values,
    eventExcluded: false,
  }
}

export function evaluateModel(input: ModelInput): ModelOutcome {
  const reporting = input.history.find((m) => m.month === input.reportingMonth)
  if (!reporting) {
    return { eligible: false, reason: 'this period has no approved figure to assess' }
  }
  if (reporting.occupiedRoomNights === null || reporting.occupiedRoomNights <= 0) {
    return {
      eligible: false,
      reason:
        'this period had no occupied room nights, so there is nothing to normalise its consumption against',
    }
  }

  const drivers = candidateDriversFor(input.history)

  // A reporting month missing one of the model's drivers cannot be judged by it, and
  // saying which is more use than "not eligible".
  const missing = drivers.filter((d) => driverValue(reporting, d) === null)
  if (missing.length > 0) {
    return {
      eligible: false,
      reason: `this period has no ${missing.map((d) => DRIVER_LABEL[d]).join(' and no ')}, and the model for this hotel is built on ${drivers.map((d) => DRIVER_LABEL[d]).join(' and ')}`,
    }
  }

  // The reporting month is never in its own training window: a model fitted on the month
  // it is judging has already agreed with it.
  const training = assembleTrainingWindow(
    input.history
      .filter((m) => m.month < input.reportingMonth)
      .map((m) => toTrainingPeriod(m, drivers)),
    { candidateDrivers: drivers },
  )

  const insufficient = insufficiencyReason(training)
  if (insufficient !== null) {
    // The engine's phrase is §7.3's own wording and is not reworded here — the guide
    // distinguishes "insufficient history" from "insufficient periods after apportionment
    // exclusion" precisely because the first suggests waiting will fix it and the second
    // does not. What the engine cannot know is how far short, and a reader deciding
    // whether to expect a verdict next month or next year needs that. So the count and
    // the exclusions are added around the phrase rather than in place of it.
    return {
      eligible: false,
      reason: `${insufficient} — ${training.n} of the ${MINIMUM_TRAINING_PERIODS} approved months a model needs${excludedSummary(training.excluded)}`,
    }
  }

  const y = training.included.map((p) => p.value)
  const x = training.included.map((p) => drivers.map((d) => p.drivers[d] as number))

  let fit
  try {
    fit = fitModel({
      y,
      x,
      parameterCount: countParameters({
        form: 'linear',
        driverCount: drivers.length,
        // No operational-event indicators and no base-temperature search: both cost
        // degrees of freedom, and App. B.5 counts a searched base temperature as a
        // parameter precisely so a model cannot buy fit with them for free. Neither is
        // used here, so neither is claimed.
        eventIndicatorCount: 0,
        searchedBaseTemperatureDirections: 0,
      }),
    })
  } catch (error) {
    // A singular driver matrix is a real answer about the data, not a crash — and it means
    // two different things depending on how many drivers there are. With one, the driver
    // never moved. With two, they moved together so exactly that neither can be told from
    // the other: the extreme of the collinearity §B.4 rejects at a VIF of 5, arriving
    // before the VIF can be computed at all.
    return {
      eligible: false,
      reason:
        drivers.length > 1
          ? `this hotel's ${drivers.map((d) => DRIVER_LABEL[d]).join(' and ')} move together exactly, so neither can be told apart from the other`
          : `${DRIVER_LABEL[drivers[0]!]} never varied across this hotel's history, so a model has nothing to learn from it`,
      detail: error instanceof Error ? error.message : 'the fit failed',
    }
  }

  const acceptance = checkModelAcceptable({
    coefficients: fit.coefficients,
    expectedSigns: drivers.map((d) => EXPECTED_SIGN[d]),
    // Occupancy and cooling degree days are strongly related in a resort — which is why
    // both are needed, and also how a VIF climbs. §B.4 rejects at 5, and with drivers
    // that collinear a coefficient is not a fact about the building.
    vifs: varianceInflationFactors(x),
    minimumObservedConsumption: Math.min(...y),
  })
  if (acceptance.rejected) {
    // ONE sentence, and the one naming the CAUSE rather than the first in the array.
    //
    // These cascade: a model whose slope has the wrong sign will usually also produce an
    // implausible intercept, because a line sloping the wrong way has to start too high
    // to pass through the data. Al Barsha Express failed both, and the intercept is the
    // symptom — reporting it would send somebody looking at base load when what is
    // actually true is that the hotel is quietest in the hottest months.
    const leading =
      REJECTION_PRECEDENCE.map((r) => acceptance.reasons.find((x) => x.reason === r)).find(
        (r) => r !== undefined,
      ) ?? acceptance.reasons[0]!
    return {
      eligible: false,
      reason: rejectionSentence(
        leading.reason,
        input.resourceLabel,
        drivers.includes('degree_days_cooling'),
      ),
      detail: acceptance.reasons.map((r) => r.detail).join('; '),
    }
  }

  const reportingDrivers = drivers.map((d) => driverValue(reporting, d) as number)
  const expected = reportingDrivers.reduce(
    (total, value, i) => total + (fit.coefficients[i + 1] as number) * value,
    fit.coefficients[0] as number,
  )

  const result = evaluateVerdict({
    actual: reporting.value,
    expected,
    s: fit.s,
    n: fit.n,
    p: fit.p,
    leverage: leverageOf(fit.xtxInverse, [1, ...reportingDrivers]),
    driverRanges: drivers.map((driver, i) => {
      const column = x.map((row) => row[i] as number)
      return {
        driver: DRIVER_LABEL[driver],
        trainingMin: Math.min(...column),
        trainingMax: Math.max(...column),
        reportingValue: reportingDrivers[i] as number,
      }
    }),
  })

  return {
    eligible: true,
    verdict: result.verdict,
    result,
    // What it rests on, said plainly. A reader deciding whether to act on "above expected
    // range" needs to know the model saw occupancy and nothing else.
    basis: `Modelled on ${drivers.map((d) => DRIVER_LABEL[d]).join(' and ')} across ${training.n} approved months${
      drivers.includes('degree_days_cooling') && reporting.coolingDegreeDaysSource !== null
        ? ` · degree days: ${reporting.coolingDegreeDaysSource}`
        : ''
    }`,
    trainingMonths: training.n,
    fitted: {
      intercept: fit.coefficients[0] as number,
      drivers: drivers.map((driver, i) => ({
        driver,
        label: DRIVER_LABEL[driver],
        coefficient: fit.coefficients[i + 1] as number,
        group: DRIVER_GROUP[driver],
      })),
    },
  }
}

/**
 * Which rejection to report when several fire together — causes before symptoms.
 *
 * A wrong-signed slope explains an implausible intercept; the reverse is not true.
 */
const REJECTION_PRECEDENCE: readonly string[] = [
  'implausible_coefficient_sign',
  'collinear_driver',
  'intercept_exceeds_minimum_observed',
  'negative_intercept',
]

/**
 * What a rejected model means, for the person the card is written for.
 *
 * Each of these is a fact about the BUILDING or about what the platform can see, not
 * about the regression. §B.4's checks exist because a model that fails one of them has
 * learned something other than how the property behaves, and saying which is the only way
 * the reader can tell whether to wait, to fix the data, or to expect nothing.
 */
function rejectionSentence(reason: string, resource: string, degreeDays: boolean): string {
  switch (reason) {
    case 'implausible_coefficient_sign':
      // The common one in a cooling-dominated climate, and it is not a data error: a
      // Gulf hotel is quietest in the hottest months, so occupancy and cooling load pull
      // in opposite directions and occupancy alone reads as though guests SAVE energy.
      return degreeDays
        ? `this hotel's ${resource} moves against one of the model's drivers, which means the model has learned something other than how the building behaves`
        : `this hotel's ${resource} use falls as occupancy rises, so occupancy alone does not explain it. Separating the weather from the guests needs a degree-day series for this hotel, which nobody has recorded`
    case 'negative_intercept':
      return `the model puts this hotel's base load below zero, which is not a building: ${resource} here is not explained by occupancy alone`
    case 'intercept_exceeds_minimum_observed':
      return `the model puts this hotel's base load above its quietest month, so what it found is not base load: ${resource} here is not explained by occupancy alone`
    case 'collinear_driver':
      return 'two of the model’s drivers move together, so neither can be told apart from the other'
    default:
      return `the model for this hotel's ${resource} did not pass the checks a model must pass before it may judge a month (§B.4)`
  }
}

const EXCLUSION_WORDS: Record<string, string> = {
  not_approved: 'not approved',
  proxy_value: 'a proxy value',
  estimated_over_limit: 'estimated beyond the limit of two',
  event_excluded: 'marked by an operational event',
  apportioned_on_model_driver: 'apportioned on a driver this model uses',
  missing_driver: 'missing a driver value',
  migrated_ineligible: 'migrated and not eligible for training',
  outside_history_start: 'earlier than this hotel’s model history start',
}

/**
 * Why months were left out, counted by reason.
 *
 * Named rather than totalled: "three months short" tells a reader to wait, and "three
 * months excluded as estimated beyond the limit" tells them to go and get the meter
 * readings. Those are different actions.
 */
function excludedSummary(excluded: readonly { readonly reason: string }[]): string {
  if (excluded.length === 0) return ''
  const counts = new Map<string, number>()
  for (const e of excluded) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1)
  const parts = [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, n]) => `${n} ${EXCLUSION_WORDS[reason] ?? reason}`)
  return `, with ${parts.join(', ')}`
}

/**
 * x₀ᵀ(XᵀX)⁻¹x₀ — how far this month's conditions sit from the training centroid.
 *
 * The prediction interval widens with it, which is what stops a month at the edge of the
 * hotel's history being judged as confidently as one in the middle of it (§B.6).
 */
export function leverageOf(
  xtxInverse: readonly (readonly number[])[],
  x0: readonly number[],
): number {
  let total = 0
  for (let i = 0; i < x0.length; i++) {
    for (let j = 0; j < x0.length; j++) {
      total += (x0[i] as number) * (xtxInverse[i]?.[j] ?? 0) * (x0[j] as number)
    }
  }
  return total
}

export { MINIMUM_TRAINING_PERIODS }
