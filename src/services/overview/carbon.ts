/**
 * The carbon card — §5.2.
 *
 * The carbon card carries NO VERDICT, and this module is shaped so that it cannot acquire
 * one by accident: there is no verdict field, not even a nullable one, and the
 * interpretation field is a literal type with exactly one permitted value.
 *
 * §7.2 forbids modelling carbon directly, and composing a synthetic verdict from
 * constituent resources would need arbitrary thresholds nobody can explain to a general
 * manager. Carbon is already activity × factor, so the honest thing to show is WHAT MOVED
 * IT. The card therefore links to the Energy, Water and Fuel verdicts, which are modelled
 * and do carry verdicts — "your energy is above its expected range" is actionable in a way
 * that a composite carbon verdict is not.
 *
 * The decomposition itself is the engine's (decomposeCarbonChange). This module renders
 * it into the sentence §5.2 specifies and refuses to publish a split that does not
 * reconcile, because the identity holding exactly is a hard acceptance test (T-56).
 */
import { dec } from '@/engine/rounding'
import { decomposeCarbonChange } from '@/engine/kpi'
import type { DecompositionInput } from '@/engine/kpi'
import type { EstimatedInput, Kpi, Marker } from './cards'

export const CARBON_INTERPRETATION =
  'Not applicable — carbon is not modelled directly. See Energy and Fuel performance.' as const

/** Stated in every footnote presenting the split, exactly as §10.2 requires for cost. */
export const DECOMPOSITION_CONVENTION =
  'Quantity change at base-period factors; factor change at current-period quantities.' as const

export interface CarbonCard {
  /** Discriminates against DeclaredPlaceholder wherever a block may not have landed. */
  readonly available: true
  readonly resource: 'carbon'
  readonly kpi: Kpi
  readonly grossOperational: Kpi
  readonly changePercent: string
  readonly consumptionEffect: string
  readonly factorEffect: string
  readonly totalChange: string
  /** The one permitted value. There is no verdict field on this type at all (§5.2). */
  readonly interpretation: typeof CARBON_INTERPRETATION
  readonly convention: typeof DECOMPOSITION_CONVENTION
  /** Plain words, no threshold, no weighting, no composite judgement (§5.2). */
  readonly sentence: string
  readonly links: readonly { readonly label: string; readonly href: string }[]
  /**
   * What a reader must know before relying on the figure: that part of it rests on a
   * CO2-only factor, that a factor was carried forward from an earlier vintage, that a
   * grade obliges a caveat. Empty for a card computed entirely from official factors of
   * the applicable vintage — a note that appears every time is a note nobody reads.
   */
  readonly notes: readonly string[]
  /**
   * Which scopes the headline covers and which it does not. Always present: a figure whose
   * boundary is unstated is a figure a reader will assume covers everything.
   */
  readonly coverage: string
  /**
   * The headline split into the two scopes it is made of, in kilograms.
   *
   * Stated, not implied. A gross operational total is Scope 1 plus Scope 2, and every
   * framework a hotel discloses under asks for the two apart — so a card carrying only
   * the sum makes somebody re-derive the halves by hand from the lines.
   */
  readonly scope1Kg: string
  readonly scope2Kg: string
  /**
   * The part of Scope 1 that is refrigerant leakage, where any was computed. Null means
   * none could be — never that none happened.
   */
  readonly refrigerantKg: string | null
  /** Scope 3 category 1 for the month, stated beside the headline and never inside it. */
  readonly scope3Kg: string | null
  readonly marker: Marker
}

export class DecompositionError extends Error {}

export interface CarbonCardInput {
  readonly kpi: Kpi
  readonly grossOperational: Kpi
  readonly lines: readonly DecompositionInput[]
  readonly baseTotal: string
  readonly hotelHref: string
  readonly estimatedInputs?: readonly EstimatedInput[]
  readonly notes?: readonly string[]
  readonly coverage: string
  readonly scope1Kg: string
  readonly scope2Kg: string
  readonly refrigerantKg?: string | null
  readonly scope3Kg?: string | null
}

function percentWord(value: string): { direction: 'up' | 'down'; magnitude: string } {
  const d = dec(value)
  return {
    direction: d.isNegative() ? 'down' : 'up',
    magnitude: d.abs().toDecimalPlaces(1).toFixed(1),
  }
}

export function buildCarbonCard(input: CarbonCardInput): CarbonCard {
  const split = decomposeCarbonChange(input.lines)
  if (!split.reconciles) {
    // T-56 is a hard acceptance test: the two effects sum exactly to the total change at
    // full precision. A split that does not reconcile is not shown with a caveat.
    throw new DecompositionError(
      `the consumption and factor effects do not sum to the total change: ${split.consumptionEffect} + ${split.factorEffect} ≠ ${split.totalChange}`,
    )
  }

  const base = dec(input.baseTotal)
  if (base.isZero()) {
    throw new DecompositionError(
      'a percentage change needs a non-zero base-period total; report the absolute change instead',
    )
  }

  const pct = (v: string) => dec(v).dividedBy(base).times(100)
  const total = percentWord(pct(split.totalChange).toFixed())
  const consumption = percentWord(pct(split.consumptionEffect).toFixed())
  const factor = percentWord(pct(split.factorEffect).toFixed())

  return {
    available: true,
    resource: 'carbon',
    kpi: input.kpi,
    grossOperational: input.grossOperational,
    changePercent: pct(split.totalChange).toFixed(),
    consumptionEffect: split.consumptionEffect,
    factorEffect: split.factorEffect,
    totalChange: split.totalChange,
    interpretation: CARBON_INTERPRETATION,
    convention: DECOMPOSITION_CONVENTION,
    notes: input.notes ?? [],
    coverage: input.coverage,
    scope1Kg: input.scope1Kg,
    scope2Kg: input.scope2Kg,
    refrigerantKg: input.refrigerantKg ?? null,
    scope3Kg: input.scope3Kg ?? null,
    sentence:
      `Emissions ${total.direction === 'up' ? 'rose' : 'fell'} ${total.magnitude}% — ` +
      `${consumption.direction} ${consumption.magnitude}% from ${consumption.direction === 'up' ? 'higher' : 'lower'} consumption, ` +
      // "grid" was true while every factor in the split came from the grid database. It
      // stopped being true when fuels and refrigerants joined the decomposition: a change
      // in a diesel factor or a global warming potential is a factor effect and has
      // nothing to do with a grid.
      `${factor.direction} ${factor.magnitude}% from ${factor.direction === 'up' ? 'dirtier' : 'cleaner'} factors.`,
    links: [
      { label: 'Energy performance', href: `${input.hotelHref}/performance/energy` },
      { label: 'Water performance', href: `${input.hotelHref}/performance/water` },
      { label: 'Fuel performance', href: `${input.hotelHref}/performance/fuel` },
    ],
    marker:
      input.estimatedInputs && input.estimatedInputs.length > 0
        ? { present: true, label: 'Includes estimated data', inputs: input.estimatedInputs }
        : { present: false },
  }
}
