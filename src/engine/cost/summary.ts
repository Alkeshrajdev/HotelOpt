/**
 * The cost screen's figures — SPEC-03F · F8, SPEC-04F §3.
 *
 * Every number the screen shows is made here: the totals in the strip, the change against
 * the same period last year, and the utility whose effective rate the strip carries. The
 * service assembles rows and the view formats them; neither adds anything up (§1.2).
 *
 * Two refusals live here because they are rules about figures, not about screens:
 *
 *   • A total over utilities that are not all priced is not a total (F8 "Partial": named,
 *     never summed as though complete). The sum is over the priced lines and says how
 *     many that is.
 *   • A change against a prior period with no cost recorded is not computed against zero
 *     (§4). It is withheld, and the missing period is named.
 */
import { Decimal, dec, percentage } from '../rounding'
import { decomposeVariance, effectiveRate } from './variance'
import type { ActualLine, EffectiveRate, PriorLine, RatePoint, VarianceResult } from './variance'

/** One utility this period, with the same period last year where it exists. */
export interface CostLineInput {
  readonly sourceId: string
  readonly current: RatePoint | null
  readonly prior: RatePoint | null
}

export interface CostLine {
  readonly sourceId: string
  /** Cost this period, or null where the bill carried none — which is not zero (§3.6). */
  readonly cost: string | null
  readonly quantity: string | null
  readonly priorCost: string | null
  readonly priorQuantity: string | null
  readonly rate: EffectiveRate | null
  readonly priorRate: EffectiveRate | null
  /** The split, or why it is withheld. Null where this period itself has no cost. */
  readonly variance: VarianceResult | { readonly withheld: true; readonly because: string } | null
}

export interface CostTotals {
  /** Sum of the priced utilities this period. Null where none is priced. */
  readonly actual: string | null
  /** How many utilities are priced, of how many carry a reading. */
  readonly priced: { readonly of: number; readonly total: number }
  /** Sum of the same utilities last year, or null and a reason. */
  readonly prior: string | null
  readonly priorWithheldBecause: string | null
  /** actual − prior, and the percentage, where both exist. */
  readonly variance: string | null
  readonly variancePercent: string | null
  /** The utility that costs the most this period; its rate is the one the strip shows. */
  readonly largestSourceId: string | null
}

export interface CostSummary {
  readonly lines: readonly CostLine[]
  readonly totals: CostTotals
}

const NO_PRIOR = 'the same period last year has no cost recorded'

function lineOf(input: CostLineInput, comparedTo: string): CostLine {
  const { current, prior } = input
  const rate = current && current.cost !== null ? effectiveRate(current) : null
  const priorRate = prior && prior.cost !== null ? effectiveRate(prior) : null

  let variance: CostLine['variance'] = null
  if (current !== null) {
    if (prior === null) {
      variance = { withheld: true, because: NO_PRIOR }
    } else {
      const priorLine: PriorLine = {
        sourceId: input.sourceId,
        cost: prior.cost,
        quantity: prior.consumption,
        currency: '',
        comparedTo,
      }
      const actual: ActualLine = {
        sourceId: input.sourceId,
        cost: current.cost,
        quantity: current.consumption,
        currency: '',
      }
      variance = decomposeVariance(priorLine, actual)
    }
  }

  return {
    sourceId: input.sourceId,
    cost: current ? dec(current.cost).toFixed() : null,
    quantity: current ? dec(current.consumption).toFixed() : null,
    priorCost: prior ? dec(prior.cost).toFixed() : null,
    priorQuantity: prior ? dec(prior.consumption).toFixed() : null,
    rate,
    priorRate,
    variance,
  }
}

/**
 * @param inputs one per utility that carries a reading this period; `current` is null
 *   where the reading has no cost.
 * @param comparedTo how the prior period is named in the split's result.
 */
export function costSummary(
  inputs: readonly CostLineInput[],
  comparedTo = 'the same month last year',
): CostSummary {
  const lines = inputs.map((i) => lineOf(i, comparedTo))

  const priced = lines.filter((l) => l.cost !== null)
  const total = lines.length
  if (priced.length === 0) {
    return {
      lines,
      totals: {
        actual: null,
        priced: { of: 0, total },
        prior: null,
        priorWithheldBecause: null,
        variance: null,
        variancePercent: null,
        largestSourceId: null,
      },
    }
  }

  const actual = priced.reduce((sum, l) => sum.plus(l.cost as string), new Decimal(0))
  const largest = priced.reduce((best, l) =>
    dec(l.cost as string).greaterThan(best.cost as string) ? l : best,
  )

  // The prior total covers the SAME utilities as the actual, or it is not comparable. A
  // utility priced this year and not last withholds the whole comparison and says so.
  const unpriced = priced.filter((l) => l.priorCost === null)
  if (unpriced.length > 0) {
    return {
      lines,
      totals: {
        actual: actual.toFixed(),
        priced: { of: priced.length, total },
        prior: null,
        priorWithheldBecause:
          unpriced.length === priced.length
            ? NO_PRIOR
            : `${unpriced.length} of the ${priced.length} priced utilities had no cost recorded the same period last year`,
        variance: null,
        variancePercent: null,
        largestSourceId: largest.sourceId,
      },
    }
  }

  const prior = priced.reduce((sum, l) => sum.plus(l.priorCost as string), new Decimal(0))
  const variance = actual.minus(prior)
  const pct = percentage(variance, prior)

  return {
    lines,
    totals: {
      actual: actual.toFixed(),
      priced: { of: priced.length, total },
      prior: prior.toFixed(),
      priorWithheldBecause: null,
      variance: variance.toFixed(),
      variancePercent: pct === null ? null : pct.toFixed(),
      largestSourceId: largest.sourceId,
    },
  }
}
