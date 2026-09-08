/**
 * Degree days from daily mean temperatures — OR C-01, C-02; SPEC-04 §F.
 *
 * A cooling degree day is the excess of a day's mean temperature over the base; a heating
 * degree day is the shortfall below it; a day on the base contributes to neither. The
 * base is part of the figure, not metadata, so it is carried on every result and a
 * reader can see which base any figure was computed against (C-02).
 *
 * A month is summed only from the days it has; whether it has all of them is stated,
 * never assumed, so a partial month is never recorded as a whole one.
 */
import { dec } from '@/engine/rounding'

export interface DailyMean {
  /** ISO date, YYYY-MM-DD. */
  readonly date: string
  /** Mean dry-bulb temperature for the day in °C; null when the source has no value. */
  readonly meanC: number | string | null
}

export interface MonthDegreeDays {
  /** YYYY-MM. */
  readonly month: string
  readonly baseC: string
  readonly coolingDegreeDays: string
  readonly heatingDegreeDays: string
  readonly daysWithData: number
  readonly daysInMonth: number
  readonly complete: boolean
}

function daysIn(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y ?? 2000, m ?? 1, 0)).getUTCDate()
}

export function degreeDaysByMonth(
  daily: readonly DailyMean[],
  baseC: number | string,
): MonthDegreeDays[] {
  const base = dec(baseC)
  const byMonth = new Map<
    string,
    { cdd: ReturnType<typeof dec>; hdd: ReturnType<typeof dec>; days: number }
  >()
  for (const d of daily) {
    if (d.meanC === null || d.meanC === undefined || d.meanC === '') continue
    const month = d.date.slice(0, 7)
    const t = dec(d.meanC)
    const acc = byMonth.get(month) ?? { cdd: dec(0), hdd: dec(0), days: 0 }
    const diff = t.minus(base)
    if (diff.gt(0)) acc.cdd = acc.cdd.plus(diff)
    else if (diff.lt(0)) acc.hdd = acc.hdd.plus(diff.abs())
    acc.days += 1
    byMonth.set(month, acc)
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, acc]) => ({
      month,
      baseC: base.toFixed(2),
      coolingDegreeDays: acc.cdd.toDecimalPlaces(2).toFixed(2),
      heatingDegreeDays: acc.hdd.toDecimalPlaces(2).toFixed(2),
      daysWithData: acc.days,
      daysInMonth: daysIn(month),
      complete: acc.days === daysIn(month),
    }))
}
