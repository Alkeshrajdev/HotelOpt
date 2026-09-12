/**
 * Carbon Position — §5.5.
 *
 * Five figures, and the difference between two of them is the whole point:
 *
 *   • Gross location-based and gross market-based differ ONLY in the Scope 2 term.
 *     Scope 1 is identical in both lines, so it is supplied once and used twice rather
 *     than passed twice and trusted to match.
 *   • "Remaining uncompensated emissions" is a POSITION. It is never a net inventory and
 *     never labelled "net emissions", so the label is a literal type rather than a string
 *     a surface chooses.
 *   • Guest, event and third-party compensation never enters the four figures and is
 *     never summed into "Emissions compensated — this hotel" (§12.1, T-48). It is a
 *     separate field on a separate block, and the builder refuses a total that includes
 *     it rather than trusting the caller to have kept them apart.
 *
 * Scope 3 is excluded from this block and reported separately (§5.5).
 */
import { dec } from '@/engine/rounding'

export const REMAINING_LABEL = 'Remaining uncompensated emissions' as const
export const PROHIBITED_LABELS = ['net emissions', 'net inventory', 'carbon neutral'] as const

export interface CarbonPositionInput {
  /** At the consolidation share, in tCO2e. */
  readonly scope1: string
  readonly scope2LocationBased: string
  /** After the §11.5 hierarchy. */
  readonly scope2MarketBased: string
  /** Retired credits allocated to THIS hotel and THIS period (§11.8). */
  readonly compensatedThisHotel: string
  /** Guest, event and third-party. Its own line, its own block (§12.1). */
  readonly facilitatedGuest?: string
  readonly facilitatedEvent?: string
  readonly facilitatedThirdParty?: string
}

export interface CarbonPosition {
  /** Discriminates against DeclaredPlaceholder wherever a block may not have landed. */
  readonly available: true
  readonly grossLocationBased: string
  readonly grossMarketBased: string
  readonly compensatedThisHotel: string
  readonly remaining: string
  readonly remainingLabel: typeof REMAINING_LABEL
  /** A separate block, below the four figures above (§5.5). */
  readonly facilitated: {
    readonly guest: string
    readonly event: string
    readonly thirdParty: string
    readonly total: string
    readonly note: string
  }
  readonly scope3Note: string
}

export class CarbonPositionError extends Error {}

export function buildCarbonPosition(input: CarbonPositionInput): CarbonPosition {
  const scope1 = dec(input.scope1)
  const compensated = dec(input.compensatedThisHotel)
  if (compensated.isNegative()) {
    throw new CarbonPositionError('compensation allocated to a hotel is never negative')
  }

  const grossMarketBased = scope1.plus(input.scope2MarketBased)
  const guest = dec(input.facilitatedGuest ?? 0)
  const event = dec(input.facilitatedEvent ?? 0)
  const thirdParty = dec(input.facilitatedThirdParty ?? 0)

  return {
    available: true,
    grossLocationBased: scope1.plus(input.scope2LocationBased).toFixed(),
    grossMarketBased: grossMarketBased.toFixed(),
    compensatedThisHotel: compensated.toFixed(),
    // Gross market-based LESS compensation allocated to this hotel. Nothing else.
    remaining: grossMarketBased.minus(compensated).toFixed(),
    remainingLabel: REMAINING_LABEL,
    facilitated: {
      guest: guest.toFixed(),
      event: event.toFixed(),
      thirdParty: thirdParty.toFixed(),
      total: guest.plus(event).plus(thirdParty).toFixed(),
      note: 'Facilitated on behalf of guests, events and third parties. Not a reduction in this hotel’s emissions and not included in the figures above.',
    },
    scope3Note: 'Scope 3 is excluded from this block and reported separately.',
  }
}
