/**
 * The twelve-month trend — §5.3.
 *
 * Twelve months ending at the period being looked at, each against the same month a year
 * earlier. Three rules decide what this can say, and all three are about ABSENCE.
 *
 * 1. A MONTH WITH NO APPROVED FIGURE IS NULL, NOT ZERO. Zero is a claim: it says the hotel
 *    used nothing that month. Null says nobody has approved a figure yet. On a bar chart
 *    the difference is a missing bar against a bar of height nothing, and a reader cannot
 *    tell those apart — so the missing month is also counted and named, and the block
 *    says how many of the twelve it holds.
 *
 * 2. THE MONTHS ARE THE CALENDAR'S, NOT THE DATA'S. The series runs over twelve
 *    consecutive months whether or not each exists, because a chart built only from the
 *    months that have data compresses a gap into a shorter axis and shows a smooth line
 *    across a hole.
 *
 * 3. ONLY APPROVED MONTHS COUNT (§24.8). A draft month on a trend is a figure somebody is
 *    still typing, drawn as though it were settled.
 */

export interface TrendPoint {
  /** 'YYYY-MM' of the month in the current window. */
  readonly month: string
  /** The month's name, for the axis, in the reader's locale. */
  readonly label: string
  /** Null where no approved figure exists — never zero. */
  readonly thisYear: string | null
  readonly priorYear: string | null
  /**
   * The model's 80% expected range for the month, where a tier A model gives one
   * (SPEC-03F · F1 block 3, D-04). Absent on tier B and C, which never draw a band.
   */
  readonly expected?: { readonly lower: string; readonly upper: string } | undefined
}

export type TrendResource = 'energy' | 'water' | 'waste'

/** The resources a trend can be drawn for, and how each is labelled and measured. */
export const TREND_RESOURCES: readonly {
  readonly resource: TrendResource
  readonly label: string
  readonly unit: string
}[] = [
  { resource: 'energy', label: 'Energy', unit: 'kWh' },
  { resource: 'water', label: 'Water', unit: 'm3' },
  { resource: 'waste', label: 'Waste', unit: 'kg' },
]

export function isTrendResource(value: string): value is TrendResource {
  return TREND_RESOURCES.some((r) => r.resource === value)
}

export interface TrendTab {
  readonly resource: TrendResource
  readonly label: string
  readonly href: string
  readonly current: boolean
}

export interface TrendSeries {
  readonly available: true
  readonly resourceLabel: string
  readonly unit: string
  readonly points: readonly TrendPoint[]
  /** How many of the twelve carry an approved figure this year. */
  readonly monthsWithData: number
  /** The largest value across BOTH series, which is what the bars are scaled against. */
  readonly peak: string
}

/**
 * The twelve months ending at `month`, oldest first.
 *
 * Written with plain arithmetic on the year and month rather than with Date: a Date built
 * from 'YYYY-MM' is parsed as UTC midnight and formatted in the reader's zone, which moves
 * a month backwards for anyone west of Greenwich. The bug is invisible in London.
 */
export function twelveMonthsEnding(month: string): readonly string[] {
  const year = Number(month.slice(0, 4))
  const index = Number(month.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(index) || index < 1 || index > 12) return []

  const out: string[] = []
  for (let back = 11; back >= 0; back -= 1) {
    const absolute = year * 12 + (index - 1) - back
    const y = Math.floor(absolute / 12)
    const m = (absolute % 12) + 1
    out.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return out
}

/** The same month a year earlier. */
export function aYearBefore(month: string): string {
  return `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`
}

export interface TrendInput {
  readonly resourceLabel: string
  readonly unit: string
  readonly endMonth: string
  /** Month → approved total, for every month either series needs. Absent means no figure. */
  readonly totals: ReadonlyMap<string, string>
  readonly monthLabel: (month: string) => string
}

export function buildTrend(input: TrendInput): TrendSeries | null {
  const months = twelveMonthsEnding(input.endMonth)
  if (months.length === 0) return null

  const points: TrendPoint[] = months.map((month) => ({
    month,
    label: input.monthLabel(month),
    thisYear: input.totals.get(month) ?? null,
    priorYear: input.totals.get(aYearBefore(month)) ?? null,
  }))

  const monthsWithData = points.filter((p) => p.thisYear !== null).length
  // One approved month is a fact, not a trend. §5.3's whole subject is movement over time,
  // and a single bar has no movement to show.
  if (monthsWithData < 2) return null

  const values = points.flatMap((p) => [p.thisYear, p.priorYear]).filter((v) => v !== null)
  const peak = values.reduce((best, v) => (Number(v) > Number(best) ? v : best), values[0] ?? '0')

  return {
    available: true,
    resourceLabel: input.resourceLabel,
    unit: input.unit,
    points,
    monthsWithData,
    peak,
  }
}
