/**
 * Survey response rates and what may be built on them — §15.1.2.
 *
 * A response rate is a fraction. Publishing one without a defensible denominator is worse
 * than publishing nothing, because it looks like coverage and is not.
 *
 * So this module has no function that returns a bare rate. It returns a result that either
 * carries a rate and names the population that produced it, or carries a count and says in
 * words that there is no population — and the two shapes are distinguishable by the type,
 * so a caller cannot render the second as though it were the first.
 */
import { dec, percentage } from '../rounding'

export type DistributionMode = 'recipient_link' | 'shared_qr' | 'public_url'

export type PopulationSource =
  'hr_headcount' | 'event_attendees' | 'issued_tokens' | 'invitations_issued' | 'none'

/** Where each denominator comes from, for publication beside the metric (§15.1.2). */
export const POPULATION_SOURCE_LABEL: Record<PopulationSource, string> = {
  hr_headcount: 'HR headcount on the hotel profile',
  event_attendees: 'registered attendees for the event',
  issued_tokens: "the distribution's issued-token count",
  invitations_issued: 'invitations issued',
  none: 'no defined population',
}

export interface DistributionFacts {
  readonly mode: DistributionMode
  readonly populationSource: PopulationSource
  /** Stated where the population is declared; null where it is counted or absent. */
  readonly statedPopulation?: number | null
  /** Counted where the population is the tokens issued. */
  readonly issuedTokens?: number | null
}

/**
 * The eligible population, or null where there is none.
 *
 * Open collection has no knowable audience. A shared QR on a noticeboard is scanned by
 * whoever walks past, and no number of invitations was ever issued, so there is nothing
 * to divide by. That is not a data gap to be filled later.
 */
export function eligiblePopulation(d: DistributionFacts): number | null {
  if (d.mode !== 'recipient_link') return null
  switch (d.populationSource) {
    case 'hr_headcount':
    case 'event_attendees':
      return d.statedPopulation ?? null
    case 'issued_tokens':
    case 'invitations_issued':
      return d.issuedTokens ?? null
    case 'none':
      return null
  }
}

interface MetricBase {
  readonly responseCount: number
  /**
   * The share of the result filled from a published assumption set (§12.3). A property of
   * the RESULT rather than of the population, so it is published in both cases.
   */
  readonly defaultDerivedSharePercent: string | null
}

export interface RatedSurveyMetric extends MetricBase {
  readonly kind: 'rated'
  readonly eligiblePopulation: number
  readonly populationSource: Exclude<PopulationSource, 'none'>
  readonly populationLabel: string
  readonly responseRatePercent: string
  readonly label: 'Response rate'
}

export interface CountOnlySurveyMetric extends MetricBase {
  readonly kind: 'count_only'
  /** The exact wording §15.1.2 requires. */
  readonly label: 'response count — open collection, no defined population'
  readonly responseRatePercent: null
}

export type SurveyMetricCoverage = RatedSurveyMetric | CountOnlySurveyMetric

export interface CoverageInput {
  readonly distribution: DistributionFacts
  readonly responseCount: number
  /** Responses whose gaps were filled from a published assumption set. */
  readonly defaultDerivedCount?: number
}

export function surveyCoverage(input: CoverageInput): SurveyMetricCoverage {
  const population = eligiblePopulation(input.distribution)
  const defaultShare =
    input.defaultDerivedCount === undefined || input.responseCount === 0
      ? null
      : (percentage(dec(input.defaultDerivedCount), dec(input.responseCount))?.toFixed() ?? null)

  if (population === null || population <= 0) {
    return {
      kind: 'count_only',
      responseCount: input.responseCount,
      label: 'response count — open collection, no defined population',
      responseRatePercent: null,
      defaultDerivedSharePercent: defaultShare,
    }
  }

  const source = input.distribution.populationSource as Exclude<PopulationSource, 'none'>
  return {
    kind: 'rated',
    responseCount: input.responseCount,
    eligiblePopulation: population,
    populationSource: source,
    populationLabel: POPULATION_SOURCE_LABEL[source],
    responseRatePercent: (
      percentage(dec(input.responseCount), dec(population)) ?? dec(0)
    ).toFixed(),
    label: 'Response rate',
    defaultDerivedSharePercent: defaultShare,
  }
}

export type MetricUse = 'scope3_quantity' | 'certification_performance_metric' | 'informational'

export interface MaterialityVerdict {
  readonly permitted: boolean
  readonly reason: string
}

/**
 * Whether a survey-derived figure may be the SOLE basis for a use.
 *
 * An open-collection metric with no denominator may inform, but may not be the sole basis
 * for a reported Scope 3 quantity or a certification performance metric. Where a framework
 * requires a rate, the survey has to be issued in a mode that has a population — which is
 * a decision about how to distribute it, not a number to be estimated afterwards.
 */
export function mayBeSoleBasis(coverage: SurveyMetricCoverage, use: MetricUse): MaterialityVerdict {
  if (use === 'informational') {
    return { permitted: true, reason: 'Informational use carries no coverage claim.' }
  }
  if (coverage.kind === 'rated') {
    return {
      permitted: true,
      reason: `Response rate ${dec(coverage.responseRatePercent).toDecimalPlaces(1).toFixed(1)}% against ${coverage.populationLabel}.`,
    }
  }
  return {
    permitted: false,
    reason:
      'Open collection has no defined population, so this figure may inform but may not be the sole basis for a reported Scope 3 quantity or a certification performance metric (§15.1.2). Issue the survey in a mode that has a population.',
  }
}

/** Every line a surface must show beside a survey-derived metric (§15.1.2). */
export function renderCoverage(coverage: SurveyMetricCoverage): readonly string[] {
  const lines: string[] =
    coverage.kind === 'rated'
      ? [
          `${coverage.label}: ${dec(coverage.responseRatePercent).toDecimalPlaces(1).toFixed(1)}% (${coverage.responseCount} of ${coverage.eligiblePopulation} — ${coverage.populationLabel})`,
        ]
      : [`${coverage.responseCount} responses — ${coverage.label}`]

  if (coverage.defaultDerivedSharePercent !== null) {
    lines.push(
      `Default-derived share: ${dec(coverage.defaultDerivedSharePercent).toDecimalPlaces(1).toFixed(1)}%`,
    )
  }
  return lines
}
