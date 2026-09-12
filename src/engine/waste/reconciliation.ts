/**
 * Waste source of record and reconciliation — §15.4.2.
 *
 * v2.1 gave the contractor statement precedence over on-site capture. That is wrong as a
 * general rule and in several ordinary situations it is the LESS accurate figure: on-site
 * captures may be weighed while the contractor estimates container volume; a statement may
 * aggregate several hotels on one round; contractor periods rarely align with the calendar
 * month; and on-site treated food waste never appears in contractor data at all, so a hotel
 * with a digester would report its best diversion stream as zero.
 *
 * There is therefore no universally correct winner, and this module does not assert one.
 * Source of record is configured per hotel per stream; what this module guarantees is that
 * every source is retained and the difference is published — as a quantity AND a
 * percentage, with each source named. The difference is never absorbed and never hidden.
 */
import { dec, Decimal, percentage } from '../rounding'
import type { WasteStream } from './streams'
import { isOrganicStream, isGeneralOrMixedStream } from './streams'

export type WasteSourceKind =
  'weighbridge_ticket' | 'contractor_statement' | 'weighed_capture' | 'estimated_capture'

/** `waste.source_reconciliation_tolerance` (§15.4.2). */
export const SOURCE_RECONCILIATION_TOLERANCE = 0.1

export interface SourceFigure {
  readonly kind: WasteSourceKind
  readonly weightKg: Decimal.Value
  /**
   * Contractor statements only. A statement that bills several hotels together and does
   * not separate them cannot be a source of record for any of them, and the platform says
   * so rather than dividing it (§15.4.2).
   */
  readonly coversMultipleHotels?: boolean
  readonly separatesHotels?: boolean
  /**
   * True where the contractor's period does not match the calendar month and the figure
   * has been apportioned on calendar days (§6.4).
   */
  readonly apportioned?: boolean
}

export interface DefaultSourceInput {
  readonly stream: WasteStream
  readonly available: readonly WasteSourceKind[]
  /** On-site treated streams have no contractor at all. */
  readonly onSiteTreated: boolean
}

/**
 * The §15.4.2 default ladder. A default, not a rule: the configuration overrides it, and
 * the configuration is what the reconciliation below uses.
 */
export function defaultSourceOfRecord(input: DefaultSourceInput): WasteSourceKind | null {
  const has = (k: WasteSourceKind) => input.available.includes(k)

  // Always on-site for on-site-treated streams, which have no contractor.
  if (input.onSiteTreated) {
    if (has('weighed_capture')) return 'weighed_capture'
    if (has('estimated_capture')) return 'estimated_capture'
    return null
  }

  if (has('weighbridge_ticket')) return 'weighbridge_ticket'
  if (isGeneralOrMixedStream(input.stream) && has('contractor_statement')) {
    return 'contractor_statement'
  }
  if (isOrganicStream(input.stream) && has('weighed_capture')) return 'weighed_capture'
  if (has('contractor_statement')) return 'contractor_statement'
  if (has('weighed_capture')) return 'weighed_capture'
  if (has('estimated_capture')) return 'estimated_capture'
  return null
}

export interface AlternativeSource {
  readonly kind: WasteSourceKind
  readonly weightKg: string
  readonly differenceKg: string
  readonly differencePercent: string
}

export interface Reconciliation {
  readonly governingSource: WasteSourceKind
  readonly governingWeightKg: string
  /** Every other source that exists for this stream and period, and what it said. */
  readonly alternatives: readonly AlternativeSource[]
  /** The largest absolute difference, which is what the tolerance is judged against. */
  readonly largestDifferencePercent: string | null
  readonly beyondTolerance: boolean
  /** Named, both figures quoted, when the difference exceeds tolerance (§15.4.2). */
  readonly attention: string | null
  readonly apportioned: boolean
}

export class UnusableSourceOfRecord extends Error {}

/**
 * Reconcile every source that exists for one stream and period.
 *
 * The configured source governs. The others are not discarded — they are returned with
 * their difference, because a verifier will ask which number governed and what the
 * alternative said, and that question has to be answerable from the record.
 */
export function reconcileSources(
  configured: WasteSourceKind,
  sources: readonly SourceFigure[],
  toleranceFraction: number = SOURCE_RECONCILIATION_TOLERANCE,
): Reconciliation {
  const governing = sources.find((s) => s.kind === configured)
  if (!governing) {
    throw new UnusableSourceOfRecord(
      `no ${configured} figure exists for this stream and period, and the configured source of record is not substituted silently (§15.4.2)`,
    )
  }
  if (
    governing.kind === 'contractor_statement' &&
    governing.coversMultipleHotels === true &&
    governing.separatesHotels !== true
  ) {
    throw new UnusableSourceOfRecord(
      'this contractor statement bills several hotels together and does not separate them, so it cannot be the source of record for any of them (§15.4.2)',
    )
  }

  const governingWeight = dec(governing.weightKg)
  const alternatives = sources
    .filter((s) => s !== governing)
    .map((s) => {
      const weight = dec(s.weightKg)
      const difference = governingWeight.minus(weight)
      const pct = percentage(difference.abs(), governingWeight)
      return {
        kind: s.kind,
        weightKg: weight.toFixed(),
        differenceKg: difference.toFixed(),
        differencePercent: (pct ?? dec(0)).toFixed(),
      }
    })

  const largest = alternatives.reduce<Decimal | null>((worst, a) => {
    const d = dec(a.differencePercent)
    return worst === null || d.greaterThan(worst) ? d : worst
  }, null)

  const beyondTolerance = largest !== null && largest.greaterThan(dec(toleranceFraction).times(100))

  const worstAlternative =
    largest === null
      ? null
      : (alternatives.find((a) => dec(a.differencePercent).equals(largest)) ?? null)

  return {
    governingSource: configured,
    governingWeightKg: governingWeight.toFixed(),
    alternatives,
    largestDifferencePercent: largest?.toFixed() ?? null,
    beyondTolerance,
    attention:
      beyondTolerance && worstAlternative
        ? `${configured} reads ${governingWeight.toFixed()} kg and ${worstAlternative.kind} reads ${worstAlternative.weightKg} kg, a difference of ${dec(worstAlternative.differencePercent).toDecimalPlaces(1).toFixed(1)}%. The configured source of record is ${configured}.`
        : null,
    apportioned: governing.apportioned === true,
  }
}
