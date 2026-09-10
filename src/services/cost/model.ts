/**
 * Cost — SPEC-03F · F8, SPEC-04F §3. The contract for `/hotel/:h/cost`.
 *
 * Every figure here comes back from engine/cost: the split, the totals, the effective
 * rates and the rate observations. The service assembles rows from what the bills said and
 * the view formats them; neither computes anything (§1.2).
 *
 * The screen has two refusals of its own kind, both stated in words rather than as a zero:
 * a period with consumption and no cost on the bill has no cost figure and no rate (§3.6);
 * a period whose same-period-last-year has no cost has no split (§4). And it has a partial
 * state that is its normal one at month end: some utilities priced, others not — named,
 * never summed as though complete.
 */
import type { CostSummary, EffectiveRate, RateBasis } from '@/engine/cost'
import type { QualityTier } from '@/engine/quality'

export interface CostPeriodRef {
  readonly id: string
  /** YYYY-MM. */
  readonly month: string
  readonly status: string
}

/** One utility this period: the engine's line, and what the reader needs to label it. */
export interface CostUtility {
  readonly sourceId: string
  readonly resource: string
  readonly label: string
  readonly unit: string
  /** The currency the cost was incurred in, stated on the record (I-05). Null where no cost. */
  readonly currency: string | null
  readonly costTier: QualityTier | null
  readonly consumptionTier: QualityTier | null
  /** True where the bill separates fixed charges, so the rate is on a consumption-charge basis. */
  readonly fixedChargesSeparated: boolean
}

export interface RateSeriesPoint {
  readonly month: string
  readonly rate: EffectiveRate | null
}

export interface RateSeries {
  readonly sourceId: string
  readonly label: string
  readonly unit: string
  /** Oldest first, the twenty-four months to the selected one. */
  readonly points: readonly RateSeriesPoint[]
}

/** I-04: an observation, never an assertion. What moved, and what ordinarily explains it. */
export interface RateObservation {
  readonly sourceId: string
  readonly label: string
  readonly observation: string
  readonly changePercent: string
}

/** The four things that ordinarily explain a rate movement (F8). Listed, not chosen. */
export const ORDINARY_EXPLANATIONS: readonly string[] = [
  'A bill covering a different period from the reading',
  'A reconciliation or credit reaching back to an earlier period',
  'A utility-estimated reading, where the read basis says so',
  'Something else: both figures are shown and neither is preferred',
]

export interface CostModel {
  readonly hotelName: string
  /** The client's reporting currency (I-05). */
  readonly currency: string
  /** 1–12: the month the client's financial year starts in (I-05). */
  readonly financialYearStartMonth: number
  readonly period: CostPeriodRef
  /** Newest first. Months the screen can be opened on. */
  readonly periods: readonly CostPeriodRef[]
  /** The same period last year, where a month exists for it. */
  readonly priorPeriod: CostPeriodRef | null
  /** Engine: lines, totals, the split. */
  readonly summary: CostSummary
  readonly utilities: readonly CostUtility[]
  readonly rateSeries: readonly RateSeries[]
  readonly observations: readonly RateObservation[]
  /** Distinct transaction currencies on this period's costs. A view never mixes them unlabelled. */
  readonly currencies: readonly string[]
  /** True where no reading at this hotel has ever carried a cost: the empty state. */
  readonly noCostEver: boolean
}

/**
 * The financial year a month falls in, as a label — "FY2026" for a January year, and
 * "FY2026/27" where the year starts later than January and straddles two calendar years.
 * The year is named after the calendar year it starts in.
 */
export function financialYearLabel(month: string, startMonth: number): string {
  const year = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  if (startMonth === 1) return `FY${year}`
  const startYear = m >= startMonth ? year : year - 1
  return `FY${startYear}/${String(startYear + 1).slice(2)}`
}

/** The month twelve months before a YYYY-MM. */
export function sameMonthLastYear(month: string): string {
  return `${Number(month.slice(0, 4)) - 1}-${month.slice(5, 7)}`
}

/** Which of the seven states the model is in, for the route to render. */
export function costState(m: CostModel): 'empty' | 'refused-no-cost' | 'partial' | 'ready' {
  if (m.noCostEver) return 'empty'
  if (m.summary.totals.actual === null) return 'refused-no-cost'
  if (m.summary.totals.priced.of < m.summary.totals.priced.total) return 'partial'
  return 'ready'
}

export function basisLabel(basis: RateBasis): string {
  return basis === 'consumption_charge' ? 'consumption charge' : 'total cost'
}
