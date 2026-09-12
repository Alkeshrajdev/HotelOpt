/**
 * Hotel activity data and its validation — §6.2, §6.3.
 *
 * Occupancy convention — stated because it differs from the market norm. The platform
 * computes occupancy as ORN ÷ NET ARN, deducting rooms out of order from the
 * denominator. STR and most brand conventions use GROSS available rooms, so a hotel
 * comparing the two will see a higher figure here whenever rooms are out of order.
 *
 * This is deliberate: net ARN is the correct denominator for a resource-intensity
 * denominator and for the Genuine Performance occupancy driver, because an out-of-order
 * room still consumes base load but is not sellable. Both figures are therefore stored
 * and both are available, and every presentation names the basis on the same line as
 * the number.
 *
 * ORN, not occupancy, is the denominator of every intensity KPI. Occupancy is never
 * used as a divisor.
 */
import { Decimal, dec, percentage } from '../rounding'

/** Defaults consolidated in Appendix J. */
export const ACTIVITY_DEFAULTS = {
  /** activity.max_guests_per_room — catches guests entered as a monthly headcount. */
  maxGuestsPerRoom: 4,
  /** activity.orn_includes_complimentary */
  ornIncludesComplimentary: true,
} as const

export interface ActivityInput {
  /** Sellable rooms × nights in the period, before any out-of-order deduction. */
  readonly grossArn: Decimal.Value
  /** Recorded as room-nights, not a room count, so a partial-month outage is representable. */
  readonly roomsOutOfOrderNights: Decimal.Value
  readonly occupiedRoomNights: Decimal.Value
  readonly guestNights?: Decimal.Value | undefined
  readonly fbCovers?: Decimal.Value | undefined
  readonly banquetCovers?: Decimal.Value | undefined
  /** Applied where the source does not report guest nights. The value is then `derived`. */
  readonly guestsPerOccupiedRoom?:
    { readonly factor: Decimal.Value; readonly source: string } | undefined
  readonly maxGuestsPerRoom?: number | undefined
  /** Any non-zero energy or water in the period, used by the closure check. */
  readonly hasResourceConsumption?: boolean | undefined
}

export type CheckType = 'hard_block' | 'soft_warning'

export interface Finding {
  readonly code: string
  readonly type: CheckType
  readonly message: string
  /** Soft warnings require explicit acknowledgement, recorded with the acknowledging user. */
  readonly requiresAcknowledgement: boolean
}

export interface ActivityResult {
  readonly grossArn: string
  readonly netArn: string
  readonly occupiedRoomNights: string
  readonly guestNights: string | null
  readonly guestNightsDerived: boolean
  /** The platform default and the modelled driver. */
  readonly occupancyNet: string | null
  /** Displayed alongside wherever occupancy is a headline figure. */
  readonly occupancyGross: string | null
  readonly findings: readonly Finding[]
  /** False where any hard block fired: the record cannot be saved or submitted. */
  readonly saveable: boolean
}

const hard = (code: string, message: string): Finding => ({
  code,
  type: 'hard_block',
  message,
  requiresAcknowledgement: false,
})

const soft = (code: string, message: string): Finding => ({
  code,
  type: 'soft_warning',
  message,
  requiresAcknowledgement: true,
})

/**
 * Compute activity figures and run every §6.2 check.
 *
 * No check is silent: each is either a hard block or a soft warning requiring explicit
 * acknowledgement (§6.3).
 */
export function evaluateActivity(input: ActivityInput): ActivityResult {
  const findings: Finding[] = []

  const grossArn = dec(input.grossArn)
  const ooo = dec(input.roomsOutOfOrderNights)
  const orn = dec(input.occupiedRoomNights)
  const netArn = grossArn.minus(ooo)

  if (grossArn.isNegative() || ooo.isNegative() || orn.isNegative()) {
    findings.push(hard('ACT-NEG', 'activity quantities are never negative'))
  }

  if (netArn.greaterThan(grossArn)) {
    findings.push(hard('ACT-ARN', 'net available room nights cannot exceed gross'))
  }

  if (orn.greaterThan(netArn)) {
    findings.push(
      hard(
        'ACT-ORN-ARN',
        `occupied room nights (${orn.toFixed()}) exceed net available room nights (${netArn.toFixed()}), which is physically impossible`,
      ),
    )
  }

  // Guest nights: taken from the source, or derived from a documented factor.
  let guestNights: Decimal | null = null
  let guestNightsDerived = false
  if (input.guestNights !== undefined) {
    guestNights = dec(input.guestNights)
  } else if (input.guestsPerOccupiedRoom !== undefined) {
    guestNights = orn.times(dec(input.guestsPerOccupiedRoom.factor))
    guestNightsDerived = true
  }

  if (guestNights !== null) {
    if (guestNights.lessThan(orn)) {
      findings.push(
        hard(
          'ACT-GN-ORN',
          'guest nights cannot be fewer than occupied room nights: one occupied room implies at least one guest',
        ),
      )
    }
    const maxPerRoom = input.maxGuestsPerRoom ?? ACTIVITY_DEFAULTS.maxGuestsPerRoom
    if (guestNights.greaterThan(orn.times(maxPerRoom))) {
      findings.push(
        soft(
          'ACT-GN-MAX',
          `guest nights exceed ${maxPerRoom} per occupied room; check for a units error such as guests entered as a monthly headcount`,
        ),
      )
    }
  }

  for (const [label, value] of [
    ['F&B covers', input.fbCovers],
    ['banquet covers', input.banquetCovers],
  ] as const) {
    if (value !== undefined && dec(value).isNegative()) {
      findings.push(hard('ACT-COVERS', `${label} cannot be negative`))
    }
  }

  // Legitimate during closure. A Hotel Admin or Portfolio Admin confirms it, and the
  // period is flagged for closure handling (§17.4) and intensity suppression (§5.2).
  if (orn.isZero() && input.hasResourceConsumption === true) {
    findings.push(
      soft(
        'ACT-CLOSURE',
        'zero occupied room nights with non-zero energy or water: confirm closure, which suppresses intensity figures for the period',
      ),
    )
  }

  const saveable = !findings.some((f) => f.type === 'hard_block')

  return {
    grossArn: grossArn.toFixed(),
    netArn: netArn.toFixed(),
    occupiedRoomNights: orn.toFixed(),
    guestNights: guestNights?.toFixed() ?? null,
    guestNightsDerived,
    occupancyNet: percentage(orn, netArn)?.toFixed() ?? null,
    occupancyGross: percentage(orn, grossArn)?.toFixed() ?? null,
    findings,
    saveable,
  }
}

/**
 * The basis label that accompanies an occupancy figure. Every report presenting
 * occupancy names the basis in the same line as the number (§6.2).
 */
export const OCCUPANCY_BASIS_LABEL = {
  net: 'of net available rooms (excludes rooms out of order)',
  gross: 'of gross available rooms (STR basis)',
} as const
