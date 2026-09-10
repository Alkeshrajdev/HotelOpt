/**
 * Attendee travel for an event footprint — §12.3, §15.3.
 *
 * Travel is usually the dominant term in an event footprint, which is why §12.3 treats it
 * explicitly rather than leaving it to the general Scope 3 machinery. Three rules, all
 * held in the shape of the result rather than in the discipline of the caller:
 *
 *   • The footprint ALWAYS states the response rate and the share of travel emissions
 *     derived from defaults, as a factual coverage figure in a common unit. So there is
 *     no function here returning a bare tonnage: the result carries the coverage with it.
 *
 *   • Non-respondents are estimated from a PUBLISHED, VERSIONED default assumption set,
 *     and a segment that cannot name its version is not a default — it is a guess. The
 *     versions used are returned so they can be published.
 *
 *   • Travel emissions are the attendee's or the organiser's, and are never added to the
 *     hotel's Scope 3 unless the hotel is contractually the purchaser of that travel.
 *     `inHotelScope3` is computed from that fact alone and is false by default.
 */
import { dec, Decimal, percentage, sum } from '../rounding'
import { surveyCoverage } from '../surveys'
import type { DistributionFacts, SurveyMetricCoverage } from '../surveys'

export type TravelMode =
  | 'air_short_haul'
  | 'air_long_haul'
  | 'rail'
  | 'coach'
  | 'car'
  | 'taxi'
  | 'ferry'
  | 'walk_cycle'
  | 'other'

export type TravelSource = 'survey_response' | 'default_assumption_set'
export type TravelOwner = 'attendee' | 'organiser'

export interface TravelSegment {
  readonly segmentLabel?: string
  readonly attendeeCount: number
  readonly mode: TravelMode
  readonly originRegion?: string
  readonly distanceKm: Decimal.Value
  readonly returnTrip: boolean
  readonly source: TravelSource
  /** Required where the source is a default assumption set. */
  readonly assumptionSetVersion?: string
}

/** kg CO2e per passenger-kilometre, from a governed factor set (App. F). */
export type TravelFactors = Readonly<Record<TravelMode, Decimal.Value>>

export interface EventTravel {
  readonly totalTco2e: string
  readonly surveyDerivedTco2e: string
  readonly defaultDerivedTco2e: string
  readonly defaultDerivedSharePercent: string
  /** Response rate, or the count-only form where the population is unknown (§15.1.2). */
  readonly coverage: SurveyMetricCoverage
  readonly owner: TravelOwner
  /** False unless the hotel is contractually the purchaser of the travel (§12.3). */
  readonly inHotelScope3: boolean
  readonly assumptionSetVersions: readonly string[]
  readonly attendeesCovered: number
}

export class UnpublishedAssumptionSet extends Error {}

export interface EventTravelInput {
  readonly segments: readonly TravelSegment[]
  readonly factors: TravelFactors
  readonly distribution: DistributionFacts
  readonly responseCount: number
  readonly owner?: TravelOwner
  readonly hotelIsContractualPurchaser?: boolean
}

function segmentTonnes(segment: TravelSegment, factors: TravelFactors): Decimal {
  const legs = segment.returnTrip ? 2 : 1
  const passengerKm = dec(segment.distanceKm).times(segment.attendeeCount).times(legs)
  // Factors are kg per passenger-km; the footprint is stated in tonnes.
  return passengerKm.times(dec(factors[segment.mode])).dividedBy(1000)
}

export function eventTravel(input: EventTravelInput): EventTravel {
  for (const s of input.segments) {
    if (s.source === 'default_assumption_set' && !s.assumptionSetVersion?.trim()) {
      throw new UnpublishedAssumptionSet(
        `a non-respondent estimate is taken from a published, versioned default assumption set; the ${s.segmentLabel ?? s.mode} segment names none (§12.3)`,
      )
    }
  }

  const surveyed = input.segments.filter((s) => s.source === 'survey_response')
  const defaulted = input.segments.filter((s) => s.source === 'default_assumption_set')

  const surveyTonnes = sum(surveyed.map((s) => segmentTonnes(s, input.factors)))
  const defaultTonnes = sum(defaulted.map((s) => segmentTonnes(s, input.factors)))
  const total = surveyTonnes.plus(defaultTonnes)

  const purchaser = input.hotelIsContractualPurchaser === true

  return {
    totalTco2e: total.toFixed(),
    surveyDerivedTco2e: surveyTonnes.toFixed(),
    defaultDerivedTco2e: defaultTonnes.toFixed(),
    defaultDerivedSharePercent: (percentage(defaultTonnes, total) ?? dec(0)).toFixed(),
    coverage: surveyCoverage({
      distribution: input.distribution,
      responseCount: input.responseCount,
    }),
    owner: input.owner ?? 'attendee',
    inHotelScope3: purchaser,
    assumptionSetVersions: [
      ...new Set(defaulted.map((s) => s.assumptionSetVersion!.trim())),
    ].sort(),
    attendeesCovered: input.segments.reduce((n, s) => n + s.attendeeCount, 0),
  }
}

/**
 * The lines a surface must publish beside an event's travel figure (§12.3).
 *
 * The coverage figure is given in tCO2e as well as a percentage because §12.3 asks for it
 * "as a factual coverage figure in a common unit": a 40% default share of a small term and
 * of a dominant one are not the same disclosure.
 */
export function renderTravel(t: EventTravel): readonly string[] {
  const lines = [
    `Attendee travel: ${dec(t.totalTco2e).toDecimalPlaces(2).toFixed(2)} tCO2e (${t.owner === 'attendee' ? "the attendee's" : "the organiser's"}${t.inHotelScope3 ? ', purchased by the hotel and included in its Scope 3' : ', not in the hotel inventory'})`,
    t.coverage.kind === 'rated'
      ? `Response rate: ${dec(t.coverage.responseRatePercent).toDecimalPlaces(1).toFixed(1)}% (${t.coverage.responseCount} of ${t.coverage.eligiblePopulation} — ${t.coverage.populationLabel})`
      : `${t.coverage.responseCount} responses — ${t.coverage.label}`,
    `Derived from published defaults: ${dec(t.defaultDerivedTco2e).toDecimalPlaces(2).toFixed(2)} tCO2e (${dec(t.defaultDerivedSharePercent).toDecimalPlaces(1).toFixed(1)}%)`,
  ]
  if (t.assumptionSetVersions.length > 0) {
    lines.push(`Assumption set: ${t.assumptionSetVersions.join(', ')}`)
  }
  return lines
}
