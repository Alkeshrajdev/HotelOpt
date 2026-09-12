/**
 * Period aggregation and completeness — §24.8.
 *
 * The rules for an incomplete assembly are stated once and apply to every surface:
 * dashboard, report, export, API and comparison. Completeness is a property of the
 * assembled figure and travels with it.
 *
 * Year-on-year change is suppressed unless both periods are complete, or both contain
 * the identical set of months. Comparing eleven months with twelve is the most common
 * way an intensity appears to improve when it has not.
 */
import { Decimal, dec, percentage, sum } from '../rounding'

/** Monthly data statuses (Appendix G). Only Approved counts toward completeness. */
export type MonthStatus = 'approved' | 'submitted' | 'returned' | 'draft' | 'absent'

export interface MonthValue {
  /** YYYY-MM. */
  readonly month: string
  readonly status: MonthStatus
  /** Null where the month exists but carries no value for this metric. */
  readonly value: Decimal.Value | null
}

export type Completeness = 'complete' | 'partial'

export interface AggregateResult {
  readonly total: string | null
  readonly completeness: Completeness
  readonly monthsIncluded: readonly string[]
  readonly monthsMissing: readonly string[]
  /**
   * The label a surface must render beside the figure. Never omitted for a partial
   * period, which is never presented as a comparable annual or quarterly figure.
   */
  readonly label: string | null
}

/** A month counts only when it exists, is Approved, and carries a value (§24.8). */
export function contributes(m: MonthValue): boolean {
  return m.status === 'approved' && m.value !== null
}

/**
 * Total a multi-month period.
 *
 * An incomplete total is computed from the months present, labelled Partial, and names
 * the months included and missing. It is never extrapolated to a full period.
 */
export function aggregate(
  months: readonly MonthValue[],
  expected: readonly string[],
): AggregateResult {
  const included = months.filter(contributes)
  const includedNames = included.map((m) => m.month)
  const missing = expected.filter((m) => !includedNames.includes(m))

  const complete = missing.length === 0 && expected.length > 0
  const total = included.length > 0 ? sum(included.map((m) => m.value as Decimal.Value)) : null

  return {
    total: total?.toFixed() ?? null,
    completeness: complete ? 'complete' : 'partial',
    monthsIncluded: includedNames,
    monthsMissing: missing,
    label: complete
      ? null
      : `Partial — ${includedNames.length} of ${expected.length} months. Missing: ${
          missing.length > 0 ? missing.join(', ') : 'none approved'
        }`,
  }
}

/**
 * Intensity from a numerator and a denominator series.
 *
 * Computed only from months present on BOTH. A month present in the numerator but
 * missing its denominator is excluded from both, so the ratio is never inflated by a
 * numerator month whose denominator is absent.
 */
export function intensity(
  numerator: readonly MonthValue[],
  denominator: readonly MonthValue[],
  expected: readonly string[],
): AggregateResult & { readonly monthsExcludedForMissingPair: readonly string[] } {
  const numOk = new Set(numerator.filter(contributes).map((m) => m.month))
  const denOk = new Set(denominator.filter(contributes).map((m) => m.month))
  const usable = expected.filter((m) => numOk.has(m) && denOk.has(m))

  const excludedForPair = expected.filter(
    (m) => (numOk.has(m) || denOk.has(m)) && !(numOk.has(m) && denOk.has(m)),
  )

  const numTotal = sum(
    numerator.filter((m) => usable.includes(m.month)).map((m) => m.value as Decimal.Value),
  )
  const denTotal = sum(
    denominator.filter((m) => usable.includes(m.month)).map((m) => m.value as Decimal.Value),
  )

  const complete = usable.length === expected.length && expected.length > 0
  const missing = expected.filter((m) => !usable.includes(m))
  const value = denTotal.isZero() ? null : numTotal.div(denTotal)

  return {
    total: value?.toFixed() ?? null,
    completeness: complete ? 'complete' : 'partial',
    monthsIncluded: usable,
    monthsMissing: missing,
    monthsExcludedForMissingPair: excludedForPair,
    label: complete
      ? null
      : `Partial — ${usable.length} of ${expected.length} months on both numerator and denominator`,
  }
}

export type ComparisonOutcome =
  | { readonly available: true; readonly changePercent: string; readonly basis: string }
  | { readonly available: false; readonly reason: string }

/**
 * Year-on-year change.
 *
 * Suppressed unless both periods are complete, or both contain the identical set of
 * months. Comparing eleven months with twelve is the most common way an intensity
 * appears to improve when it has not (§24.8).
 */
export function yearOnYear(current: AggregateResult, prior: AggregateResult): ComparisonOutcome {
  const bothComplete = current.completeness === 'complete' && prior.completeness === 'complete'

  const currentMonths = current.monthsIncluded.map(monthOfYear).sort()
  const priorMonths = prior.monthsIncluded.map(monthOfYear).sort()
  const identicalSet =
    currentMonths.length > 0 &&
    currentMonths.length === priorMonths.length &&
    currentMonths.every((m, i) => m === priorMonths[i])

  if (!bothComplete && !identicalSet) {
    return {
      available: false,
      reason:
        'year-on-year change is suppressed: the periods are neither both complete nor built from the identical set of months',
    }
  }
  if (current.total === null || prior.total === null) {
    return { available: false, reason: 'year-on-year change is unavailable: a period has no value' }
  }

  const change = percentage(dec(current.total).minus(prior.total), dec(prior.total))
  if (change === null) {
    return {
      available: false,
      reason: 'year-on-year change is unavailable: the prior period is zero',
    }
  }

  return {
    available: true,
    changePercent: change.toFixed(),
    basis: bothComplete
      ? 'both periods complete'
      : `like-for-like on ${currentMonths.length} identical months`,
  }
}

function monthOfYear(yyyymm: string): string {
  return yyyymm.slice(5)
}

/**
 * A rolling twelve-month figure requires twelve consecutive complete months. Where any
 * is missing the figure is unavailable, not shortened to eleven (§24.8).
 */
export function rollingTwelve(
  months: readonly MonthValue[],
  expected: readonly string[],
):
  | AggregateResult
  | { readonly total: null; readonly completeness: 'partial'; readonly label: string } {
  if (expected.length !== 12) {
    return { total: null, completeness: 'partial', label: 'a rolling figure spans twelve months' }
  }
  const result = aggregate(months, expected)
  if (result.completeness !== 'complete') {
    return {
      total: null,
      completeness: 'partial',
      label: `Rolling twelve months unavailable — missing ${result.monthsMissing.join(', ')}`,
    }
  }
  return result
}

/**
 * An annual carbon inventory is produced only on a complete year. Where the year is
 * incomplete the output is a partial-period inventory with the gap named (§24.8).
 */
export function inventoryPeriodKind(result: AggregateResult): 'annual' | 'partial_period' {
  return result.completeness === 'complete' ? 'annual' : 'partial_period'
}
