/**
 * The Hotel Overview performance cards — §5.2.
 *
 * §5.2 defines seven card states and says exactly one applies. That is the whole design
 * problem: the states overlap in the real world — a district-cooling property with no
 * approved COP and no occupancy in the same month satisfies three of them — so the type
 * is a discriminated union and the resolver picks by a stated precedence rather than each
 * surface deciding for itself.
 *
 * The precedence, and why:
 *
 *   1. data_unavailable        Nothing to show. Every other state presumes a figure.
 *   2. partial_energy_basis    T-54 is explicit that a DC property with no approved COP
 *                              shows this state and NEVER a summed total, so it outranks
 *                              the suppressed-intensity state — which would otherwise
 *                              hide the fact that no COP exists.
 *   3. intensity_not_applicable  Denominator zero or absent (§5.2, §5.2 zero-denominator).
 *   4. data_incomplete         Some inputs present; the KPI stands with a named gap.
 *   5. no_prior_year_baseline  A figure and no comparison.
 *   6. interpretation_unavailable  A figure, a comparison, no eligible model.
 *   7. full_result
 *
 * Two things are absent from this module on purpose. There is no verdict on the carbon
 * card — not a nullable one, not a 'not_applicable' member of the verdict type, but no
 * field at all, because §5.2 forbids one and a nullable field is an invitation. And there
 * is no tier percentage anywhere: the estimated-data marker names the inputs and their
 * methods, which is what §5.2 and T-13 require instead.
 */
import type { Verdict } from '@/engine/gp'
import type { QualityTier } from '@/engine/quality'

export type MetricDirection = 'lower_is_better' | 'higher_is_better'

/** Appendix G, in full. A card that carries a verdict carries one of exactly these. */
export const INTERPRETATION_VOCABULARY: readonly Verdict[] = [
  'better_than_expected',
  'within_expected_range',
  'above_expected_range',
  'outside_modelled_range',
  'not_available',
]

export interface EstimatedInput {
  readonly label: string
  readonly tier: Exclude<QualityTier, 'measured'>
  readonly method: string
}

/**
 * One marker when any input is not Measured, never a percentage (§5.2, T-13). The panel
 * behind it names the exact inputs.
 */
export interface EstimatedMarker {
  readonly present: true
  readonly label: 'Includes estimated data'
  readonly inputs: readonly EstimatedInput[]
}

export type Marker = EstimatedMarker | { readonly present: false }

export interface Kpi {
  readonly value: string
  readonly unit: string
  readonly label: string
}

export interface Change {
  readonly percent: string
  readonly label: string
}

interface CardBase {
  readonly resource: 'energy' | 'water' | 'waste' | 'carbon'
  readonly marker: Marker
}

export type CardState =
  | (CardBase & {
      readonly state: 'data_unavailable'
      /** The exact missing item, linked to the entry screen (§5.2). */
      readonly missing: readonly string[]
      readonly entryHref: string
    })
  | (CardBase & {
      readonly state: 'partial_energy_basis'
      /** Electricity and fuel only. The two figures are never summed (§8.8, T-54). */
      readonly comparableTotal: Kpi
      readonly districtCoolingThermalKwh: string
      readonly reason: string
    })
  | (CardBase & {
      readonly state: 'intensity_not_applicable'
      readonly total: Kpi
      readonly reason: string
      readonly closurePeriod: boolean
    })
  | (CardBase & {
      readonly state: 'data_incomplete'
      readonly kpi: Kpi
      readonly total: Kpi
      readonly missing: readonly string[]
    })
  | (CardBase & {
      readonly state: 'no_prior_year_baseline'
      readonly kpi: Kpi
      readonly total: Kpi
      readonly changeLabel: 'No prior-year period'
      readonly fallbackTier: string
    })
  | (CardBase & {
      readonly state: 'interpretation_unavailable'
      readonly kpi: Kpi
      readonly total: Kpi
      readonly change: Change
      readonly reason: string
    })
  | (CardBase & {
      readonly state: 'full_result'
      readonly kpi: Kpi
      readonly total: Kpi
      readonly change: Change
      readonly verdict: Verdict
      readonly direction: MetricDirection
      readonly basis: string
    })

/**
 * A present denominator carries nothing; an absent one carries the already-translated
 * sentence naming it. Not a boolean plus an optional string: that pair permits the state
 * this type forbids — absent, with no sentence — and would need a default, and the
 * default is exactly the bug (every card inheriting the energy card's denominator).
 */
export type DenominatorState =
  { readonly present: true } | { readonly present: false; readonly reason: string }

export interface CardInput {
  readonly resource: 'energy' | 'water' | 'waste' | 'carbon'
  readonly missingInputs?: readonly string[]
  readonly entryHref?: string
  readonly districtCoolingWithoutCop?: { readonly plant: string; readonly thermalKwh: string }
  readonly comparableTotal?: Kpi
  /**
   * Whether the denominator this resource's intensity divides by exists for the period —
   * and, when it does not, the sentence that says so. The sentence comes from the caller
   * because the caller is the only thing that knows WHICH denominator applies: App. C.2
   * puts waste on guest nights and energy and water on occupied room nights. This module
   * used to hard-code "no occupied room nights", which the waste card then displayed
   * beside a figure that is not divided by room nights at all.
   */
  readonly denominator: DenominatorState
  readonly closurePeriod?: boolean
  readonly total?: Kpi
  readonly kpi?: Kpi
  readonly incompleteInputs?: readonly string[]
  readonly priorYearPresent: boolean
  readonly fallbackTier?: string
  readonly change?: Change
  readonly modelEligible: boolean
  readonly ineligibilityReason?: string
  readonly verdict?: Verdict
  readonly direction?: MetricDirection
  readonly basis?: string
  readonly estimatedInputs?: readonly EstimatedInput[]
}

export class CardStateError extends Error {}

function markerFor(inputs: readonly EstimatedInput[] | undefined): Marker {
  if (!inputs || inputs.length === 0) return { present: false }
  return { present: true, label: 'Includes estimated data', inputs }
}

export function resolveCardState(input: CardInput): CardState {
  const marker = markerFor(input.estimatedInputs)
  const base = { resource: input.resource, marker } as const

  if (input.missingInputs && input.missingInputs.length > 0) {
    return {
      ...base,
      state: 'data_unavailable',
      missing: input.missingInputs,
      entryHref: input.entryHref ?? '/data',
    }
  }

  if (input.districtCoolingWithoutCop) {
    if (!input.comparableTotal) {
      throw new CardStateError(
        'a partial energy basis states the electricity and fuel total it can compare; the two figures are never summed (§8.8)',
      )
    }
    return {
      ...base,
      state: 'partial_energy_basis',
      comparableTotal: input.comparableTotal,
      districtCoolingThermalKwh: input.districtCoolingWithoutCop.thermalKwh,
      reason: `Total energy not comparable — no approved COP for ${input.districtCoolingWithoutCop.plant}`,
    }
  }

  if (!input.total) {
    throw new CardStateError('a card with no missing inputs states its total')
  }

  if (!input.denominator.present) {
    return {
      ...base,
      state: 'intensity_not_applicable',
      total: input.total,
      reason: input.denominator.reason,
      closurePeriod: input.closurePeriod === true,
    }
  }

  if (!input.kpi) {
    throw new CardStateError('a card with a denominator states its KPI')
  }

  if (input.incompleteInputs && input.incompleteInputs.length > 0) {
    return {
      ...base,
      state: 'data_incomplete',
      kpi: input.kpi,
      total: input.total,
      missing: input.incompleteInputs,
    }
  }

  if (!input.priorYearPresent) {
    return {
      ...base,
      state: 'no_prior_year_baseline',
      kpi: input.kpi,
      total: input.total,
      changeLabel: 'No prior-year period',
      fallbackTier: input.fallbackTier ?? 'Tier B — normalised on activity',
    }
  }

  if (!input.change) {
    throw new CardStateError('a card with a prior-year period states its change')
  }

  if (!input.modelEligible || input.verdict === undefined) {
    return {
      ...base,
      state: 'interpretation_unavailable',
      kpi: input.kpi,
      total: input.total,
      change: input.change,
      reason: `Genuine Performance not available — ${input.ineligibilityReason ?? 'the model is not eligible for this period'}`,
    }
  }

  if (input.direction === undefined) {
    // "A metric with no direction is never given a verdict" (§5.2).
    throw new CardStateError(
      `${input.resource} carries a verdict but no direction; a metric with no direction is never given a verdict (§5.2)`,
    )
  }

  return {
    ...base,
    state: 'full_result',
    kpi: input.kpi,
    total: input.total,
    change: input.change,
    verdict: input.verdict,
    direction: input.direction,
    basis: input.basis ?? 'Genuine Performance model',
  }
}
