/**
 * The portfolio view — §16.1.
 *
 * The consolidation engine has existed, tested, since the platform was first assembled,
 * and has never been called with a real hotel. This is the screen that calls it.
 *
 * WHAT THIS MODULE DOES NOT DO. It does not sum anything. Every figure comes back from
 * engine/portfolio, including the coverage statement and the list of excluded hotels,
 * because the rules those encode — sum the numerators and sum the denominators, never
 * average intensities; a missing hotel-month is excluded from both and is never zero; a
 * hotel with zero occupancy keeps its consumption in the total — are exactly the rules
 * that get quietly broken by a convenient line of arithmetic at a call site. The
 * prohibited operation and the correct one look identical when written out.
 *
 * WHAT IT DECIDES. Which hotels are asked about, and what each one's numerator and
 * denominator ARE for the metric in hand: energy over occupied room nights, water over
 * occupied room nights, waste over guest nights (App. C.2). Getting that pairing wrong is
 * the one thing the engine cannot catch, because a numerator and a denominator are both
 * just numbers to it.
 */
import { consolidate } from '@/engine/portfolio'
import type { HotelContribution, PortfolioFigure } from '@/engine/portfolio'
import type { QuantityKind } from '@/engine/rounding'
import { forDisplay } from '@/engine/units'
import type { CanonicalUnit } from '@/engine/units'

export type PortfolioResource = 'energy' | 'water' | 'waste'

/** A month the portfolio has periods for, and how many of its hotels have approved one. */
export interface PortfolioMonth {
  readonly month: string
  readonly approvedHotels: number
}

/**
 * Which month the portfolio opens on: the newest one it has CLOSED.
 *
 * Three tiers, newest first within each:
 *
 *   1. every hotel in the portfolio has approved it — a consolidated figure that covers
 *      the whole portfolio, which is the thing this page exists to show
 *   2. failing that, any hotel has approved it — a partial figure, disclosed as one
 *   3. failing that, the newest month there is — so the page explains itself rather than
 *      rendering nothing
 *
 * WHY NOT SIMPLY THE NEWEST APPROVED. Because a portfolio is a consolidation, and on this
 * demo the newest approved month covers one hotel of four while the month before covers
 * all four. Landing on the first is a softer version of the defect this rule was written
 * to fix: it opens on the least representative view available. One hotel wearing a
 * portfolio label is not a portfolio figure, however honestly the coverage line says so.
 *
 * The picker still offers every month, and the partial ones are worth looking at
 * deliberately — the point is only that the DEFAULT should be the month the portfolio has
 * actually finished.
 */
export function defaultPortfolioMonth(
  months: readonly PortfolioMonth[],
  hotelsInPortfolio: number,
): string | undefined {
  const complete =
    hotelsInPortfolio > 0 ? months.find((m) => m.approvedHotels >= hotelsInPortfolio) : undefined
  return (complete ?? months.find((m) => m.approvedHotels > 0) ?? months[0])?.month
}

export interface PortfolioMetric {
  readonly resource: PortfolioResource
  readonly label: string
  /** The unit of the summed numerator, which is not the intensity's unit. */
  readonly totalUnit: string
  readonly totalKind: QuantityKind
  readonly intensityUnit: string
  readonly intensityKind: QuantityKind
  readonly denominatorLabel: string
  /**
   * The intensity in the unit App. C.2 names for it, or null where none is available.
   *
   * Separate from `figure.intensity` because the two are not always in the same unit:
   * water is stored and consolidated in cubic metres and REPORTED in litres per occupied
   * room night. Publishing the stored ratio under the litre label understates a
   * portfolio's water by a factor of a thousand — an error in the flattering direction,
   * which is the worst kind, and one this product has already made once on a single
   * hotel.
   */
  readonly intensityForDisplay: string | null
  readonly figure: PortfolioFigure
}

export interface PortfolioHotelRow {
  readonly hotelId: string
  readonly hotelName: string
  readonly city: string | null
  /** Null where this hotel has no approved month for the period. */
  readonly monthStatus: string | null
  readonly consolidationSharePercent: string
}

export interface PortfolioModel {
  readonly portfolioId: string | null
  readonly portfolioName: string
  readonly monthLabel: string
  /** Every portfolio the reader may see, for the switcher. */
  readonly portfolios: readonly {
    readonly id: string
    readonly name: string
    readonly href: string
  }[]
  readonly months: readonly {
    readonly month: string
    readonly label: string
    readonly href: string
  }[]
  readonly selectedMonth: string
  readonly hotels: readonly PortfolioHotelRow[]
  readonly metrics: readonly PortfolioMetric[]
}

/**
 * One hotel's contribution to one metric.
 *
 * `numerator` and `denominator` are BOTH absent where the hotel has no approved month —
 * the engine reads that as a missing hotel-month and excludes the hotel from both sides.
 * A hotel that is present but had no occupancy is the opposite case: its denominator is a
 * real zero and is summed, so its consumption stays in the portfolio total even though its
 * own intensity is suppressed (§5.2, §16.1).
 */
export interface HotelMonthInput {
  readonly hotelId: string
  readonly hotelName: string
  readonly consolidationSharePercent: string
  readonly approved: boolean
  readonly occupiedRoomNights: string | null
  readonly guestNights: string | null
  readonly energyKwh: string | null
  readonly waterM3: string | null
  readonly wasteKg: string | null
}

const METRICS: readonly {
  readonly resource: PortfolioResource
  readonly label: string
  readonly totalUnit: string
  readonly totalKind: QuantityKind
  readonly intensityUnit: string
  readonly intensityKind: QuantityKind
  /** Set where the intensity is reported in a unit the numerator is not stored in. */
  readonly intensityFrom?: CanonicalUnit
  readonly intensityTo?: string
  readonly denominatorLabel: string
  readonly numerator: (h: HotelMonthInput) => string | null
  readonly denominator: (h: HotelMonthInput) => string | null
}[] = [
  {
    resource: 'energy',
    label: 'Energy',
    totalUnit: 'kWh',
    totalKind: 'energy.kwh',
    intensityUnit: 'kWh/ORN',
    intensityKind: 'intensity.energy.orn',
    denominatorLabel: 'occupied room nights',
    numerator: (h) => h.energyKwh,
    denominator: (h) => h.occupiedRoomNights,
  },
  {
    resource: 'water',
    label: 'Water',
    totalUnit: 'm3',
    totalKind: 'water.m3',
    // Stored in cubic metres, reported in litres per occupied room night (App. C.2). The
    // conversion happens to the RATIO, once, below — not to each hotel's numerator, which
    // would change what the total says it is.
    intensityUnit: 'L/ORN',
    intensityKind: 'intensity.water.orn',
    intensityFrom: 'm3',
    intensityTo: 'L',
    denominatorLabel: 'occupied room nights',
    numerator: (h) => h.waterM3,
    denominator: (h) => h.occupiedRoomNights,
  },
  {
    // Guest nights, not room nights. The pairing is App. C.2's and it is the one thing the
    // engine cannot check: to it a numerator and a denominator are both just numbers, so
    // waste over room nights would consolidate perfectly and mean nothing.
    resource: 'waste',
    label: 'Waste',
    totalUnit: 'kg',
    totalKind: 'waste.kg',
    intensityUnit: 'kg/GN',
    intensityKind: 'intensity.waste.guestNight',
    denominatorLabel: 'guest nights',
    numerator: (h) => h.wasteKg,
    denominator: (h) => h.guestNights,
  },
]

function contributionFor(h: HotelMonthInput, metric: (typeof METRICS)[number]): HotelContribution {
  const base = {
    hotelId: h.hotelId,
    hotelName: h.hotelName,
    consolidationSharePercent: h.consolidationSharePercent,
  }

  // Not approved is the same as not there. §24.8 counts only approved months, and an
  // unapproved figure carried into a portfolio total is a figure somebody is still typing,
  // consolidated as though it were settled.
  if (!h.approved) return base

  const numerator = metric.numerator(h)
  const denominator = metric.denominator(h)
  if (numerator === null || denominator === null) return base

  return { ...base, numerator, denominator }
}

export function buildMetrics(hotels: readonly HotelMonthInput[]): readonly PortfolioMetric[] {
  return METRICS.map((metric): PortfolioMetric => {
    const figure = consolidate({
      hotels: hotels.map((h) => contributionFor(h, metric)),
      intensityUnit: metric.intensityUnit,
    })

    // The conversion is the engine's, not a multiplication written here. `forDisplay`
    // knows the factor; a `* 1000` at this call site would be a second unit table.
    const intensityForDisplay = !figure.intensity.available
      ? null
      : metric.intensityFrom !== undefined && metric.intensityTo !== undefined
        ? forDisplay(figure.intensity.value, metric.intensityFrom, metric.intensityTo)
        : figure.intensity.value

    return {
      resource: metric.resource,
      label: metric.label,
      totalUnit: metric.totalUnit,
      totalKind: metric.totalKind,
      intensityUnit: metric.intensityUnit,
      intensityKind: metric.intensityKind,
      denominatorLabel: metric.denominatorLabel,
      intensityForDisplay,
      figure,
    }
  })
}
