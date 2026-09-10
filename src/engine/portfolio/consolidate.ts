/**
 * Portfolio aggregation — §16.1.
 *
 * One rule governs everything here: sum the numerators, sum the denominators, then
 * divide. Never average intensities. There is deliberately no function in this module
 * that takes hotel intensities as input, because the prohibited operation and the correct
 * one look identical at a call site and differ by several percent in the answer.
 *
 * The other rules are about what a portfolio figure is allowed to hide:
 *
 *   • A missing hotel-month excludes the hotel from BOTH numerator and denominator. It is
 *     never treated as zero, and carrying a hotel at zero to preserve the denominator is
 *     named as prohibited.
 *   • A hotel with zero occupied room nights is the opposite case and the one exception:
 *     its numerator IS summed and its zero denominator IS summed. Its own intensity is
 *     suppressed (§5.2), but its consumption is real and must not vanish from the
 *     portfolio.
 *   • Where an included hotel has no approved plant COP, its district cooling is excluded
 *     from the portfolio energy total, the hotel is named, and the excluded thermal
 *     quantity is reported on its own line. A portfolio total is never formed by silently
 *     summing thermal and electrical kWh.
 *   • Every portfolio figure states its coverage. The result type has no shape without it.
 */
import { dec, Decimal, percentage, sum } from '../rounding'

export interface HotelContribution {
  readonly hotelId: string
  readonly hotelName: string
  /** Applied identically to numerator and denominator (§16.1). */
  readonly consolidationSharePercent: Decimal.Value
  /**
   * The metric's numerator for this hotel and period. Absent means the hotel-month is
   * missing — which is not the same as zero and is not treated as zero.
   */
  readonly numerator?: Decimal.Value
  /** Absent means missing; zero is a real zero and is summed (§16.1). */
  readonly denominator?: Decimal.Value
  readonly occupiedRoomNights?: Decimal.Value
  readonly grossFloorAreaM2?: Decimal.Value
  /**
   * District cooling delivered to this hotel, in thermal kWh. Enters the energy total
   * only through an approved plant COP (§8.8).
   */
  readonly districtCoolingThermalKwh?: Decimal.Value
  readonly approvedPlantCop?: Decimal.Value
  /** Cost metrics only: the figure's currency and the rate used to reach the tenant's. */
  readonly currency?: string
  readonly fxRateToReportingCurrency?: Decimal.Value
}

export interface Coverage {
  readonly hotelsIncluded: number
  readonly hotelsTotal: number
  readonly roomNightsSharePercent: string | null
  readonly floorAreaSharePercent: string | null
  /** The §16.1 disclosure, ready to render. */
  readonly statement: string
}

export interface Excluded {
  readonly hotelId: string
  readonly hotelName: string
  readonly reason: string
}

export interface DistrictCoolingExclusion {
  readonly hotels: readonly string[]
  /** On its own line, always (§16.1). */
  readonly thermalKwh: string
  readonly label: 'District cooling excluded — no approved plant COP'
}

export type Intensity =
  | { readonly available: true; readonly value: string; readonly unit: string }
  | { readonly available: false; readonly reason: string }

/**
 * The consolidated total, or the reason there isn't one.
 *
 * The same shape as Intensity, and for the same reason. The intensity was already
 * suppressed with a sentence when no hotel contributed — "never zero, never Infinity,
 * never a dash (§5.2)" — while `numerator` came back as the string "0" and the portfolio
 * page put it on screen as "0 kWh · Total energy". A sum over no hotels is not zero, and a
 * portfolio landing on a month nobody has approved read as four properties that consumed
 * nothing.
 *
 * `numerator` and `denominator` stay on the figure: they are the arithmetic and the API
 * serves them. This is the presentation fact, decided here rather than at each of the
 * places that might render it, because "0 is not a total" is a rule and not a formatting
 * preference.
 */
export type Total =
  | { readonly available: true; readonly value: string }
  | { readonly available: false; readonly reason: string }

export interface PortfolioFigure {
  readonly numerator: string
  readonly denominator: string
  readonly total: Total
  readonly intensity: Intensity
  readonly coverage: Coverage
  readonly excluded: readonly Excluded[]
  readonly districtCoolingExcluded: DistrictCoolingExclusion | null
}

export class ProhibitedAggregation extends Error {}

export interface ConsolidationInput {
  readonly hotels: readonly HotelContribution[]
  readonly intensityUnit: string
  /** Set for an energy metric, so district cooling is routed through the COP (§8.8). */
  readonly appliesDistrictCooling?: boolean
  /** Set for a cost metric: every contribution must already reach this currency. */
  readonly reportingCurrency?: string
}

function share(h: HotelContribution): Decimal {
  return dec(h.consolidationSharePercent).dividedBy(100)
}

export function consolidate(input: ConsolidationInput): PortfolioFigure {
  const excluded: Excluded[] = []
  const included: HotelContribution[] = []

  for (const h of input.hotels) {
    if (h.numerator === undefined || h.denominator === undefined) {
      excluded.push({
        hotelId: h.hotelId,
        hotelName: h.hotelName,
        // Named rather than counted, because "9 of 10" without the name is not actionable.
        reason:
          'hotel-month missing — excluded from both numerator and denominator, never treated as zero',
      })
      continue
    }
    if (input.reportingCurrency !== undefined && h.currency !== undefined) {
      if (h.currency !== input.reportingCurrency && h.fxRateToReportingCurrency === undefined) {
        throw new ProhibitedAggregation(
          `${h.hotelName} reports in ${h.currency} and the portfolio in ${input.reportingCurrency}; conversion at the approved monthly average rate happens before summation, never after (§16.1)`,
        )
      }
    }
    included.push(h)
  }

  const coolingExcludedHotels: string[] = []
  let coolingExcludedThermal = dec(0)

  const numerator = sum(
    included.map((h) => {
      let n = dec(h.numerator!)
      if (h.currency !== undefined && h.fxRateToReportingCurrency !== undefined) {
        n = n.times(dec(h.fxRateToReportingCurrency))
      }
      if (input.appliesDistrictCooling && h.districtCoolingThermalKwh !== undefined) {
        const thermal = dec(h.districtCoolingThermalKwh)
        if (h.approvedPlantCop === undefined) {
          // The hotel stays in the portfolio; its district cooling does not enter the
          // total, and the quantity that did not enter is reported rather than dropped.
          coolingExcludedHotels.push(h.hotelName)
          coolingExcludedThermal = coolingExcludedThermal.plus(thermal.times(share(h)))
        } else {
          n = n.plus(thermal.dividedBy(dec(h.approvedPlantCop)))
        }
      }
      return n.times(share(h))
    }),
  )

  // A zero denominator here is summed, not skipped: see the §16.1 note above.
  const denominator = sum(included.map((h) => dec(h.denominator!).times(share(h))))

  const totalRoomNights = sum(input.hotels.map((h) => h.occupiedRoomNights ?? 0))
  const includedRoomNights = sum(included.map((h) => h.occupiedRoomNights ?? 0))
  const totalArea = sum(input.hotels.map((h) => h.grossFloorAreaM2 ?? 0))
  const includedArea = sum(included.map((h) => h.grossFloorAreaM2 ?? 0))

  const roomNightsShare = percentage(includedRoomNights, totalRoomNights)
  const areaShare = percentage(includedArea, totalArea)

  const coverage: Coverage = {
    hotelsIncluded: included.length,
    hotelsTotal: input.hotels.length,
    roomNightsSharePercent: roomNightsShare?.toFixed() ?? null,
    floorAreaSharePercent: areaShare?.toFixed() ?? null,
    statement: [
      `${included.length} of ${input.hotels.length} hotels`,
      roomNightsShare
        ? `${roomNightsShare.toDecimalPlaces(0).toFixed(0)}% of portfolio room nights`
        : null,
      areaShare ? `${areaShare.toDecimalPlaces(0).toFixed(0)}% of floor area` : null,
    ]
      .filter((s): s is string => s !== null)
      .join(' · '),
  }

  const intensity: Intensity = denominator.greaterThan(0)
    ? {
        available: true,
        value: numerator.dividedBy(denominator).toFixed(),
        unit: input.intensityUnit,
      }
    : {
        available: false,
        // Suppressed, never rendered as zero, infinity or an unexplained dash (§5.2).
        reason:
          included.length === 0
            ? 'No hotel in this portfolio has an approved record for the period'
            : 'Intensity not applicable — the portfolio denominator is zero for this period',
      }

  // A total needs at least one hotel behind it. Not `numerator > 0`: a portfolio whose
  // hotels genuinely consumed nothing has a real total of zero, and refusing that would
  // hide a measured fact. What is absent is the CONTRIBUTORS, not the quantity.
  const total: Total =
    included.length === 0
      ? {
          available: false,
          reason:
            'No hotel in this portfolio has an approved record for the period, so there is no total to report. A sum over no hotels is not zero.',
        }
      : { available: true, value: numerator.toFixed() }

  return {
    numerator: numerator.toFixed(),
    denominator: denominator.toFixed(),
    total,
    intensity,
    coverage,
    excluded,
    districtCoolingExcluded:
      coolingExcludedHotels.length === 0
        ? null
        : {
            hotels: coolingExcludedHotels,
            thermalKwh: coolingExcludedThermal.toFixed(),
            label: 'District cooling excluded — no approved plant COP',
          },
  }
}

/** Every line a portfolio figure must carry with it (§16.1). */
export function renderPortfolioFigure(f: PortfolioFigure): readonly string[] {
  const lines = [
    f.intensity.available
      ? `${dec(f.intensity.value).toDecimalPlaces(2).toFixed(2)} ${f.intensity.unit}`
      : f.intensity.reason,
    `Coverage: ${f.coverage.statement}`,
  ]
  for (const e of f.excluded) lines.push(`Excluded: ${e.hotelName} — ${e.reason}`)
  if (f.districtCoolingExcluded) {
    lines.push(
      `${f.districtCoolingExcluded.label}: ${dec(f.districtCoolingExcluded.thermalKwh).toDecimalPlaces(0).toFixed(0)} thermal kWh (${f.districtCoolingExcluded.hotels.join(', ')})`,
    )
  }
  return lines
}
