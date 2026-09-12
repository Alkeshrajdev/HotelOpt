/**
 * Cost, the price/volume split and the effective unit rate — §10.1 to §10.4, SPEC-04F §3.
 *
 * THERE IS NO BUDGET (I-01 dropped, 5 September). The comparison point is the same period
 * last year: identical arithmetic, no data entry, and always available. The price/volume
 * split is NOT mathematically unique, so the convention is fixed once and never varies by
 * page (§10.2, SPEC-04F §3.1):
 *
 *   Volume effect = (Q_now − Q_prior) × P_prior      volume at the PRIOR period's price
 *   Price effect  = (P_now − P_prior) × Q_now        price at the CURRENT volume
 *   Total         = Volume + Price = Cost_now − Cost_prior
 *
 * The two sum exactly to the total by construction, and that reconciliation is an
 * acceptance test. The convention appears in every report footnote presenting the split.
 */
import { Decimal, dec, percentage } from '../rounding'
import type { QualityTier } from '../quality'

export const VARIANCE_CONVENTION_FOOTNOTE =
  "Volume effect is measured at the prior period's price; price effect at the current volume."

/** The comparison point: the same period last year, with its cost and quantity as billed. */
export interface PriorLine {
  readonly sourceId: string
  readonly cost: Decimal.Value
  /** Absent where the prior period holds cost only — the price/volume split is then unavailable. */
  readonly quantity?: Decimal.Value | undefined
  readonly currency: string
  /** What the variance is measured against, named — "the same month last year". */
  readonly comparedTo: string
}

export interface ActualLine {
  readonly sourceId: string
  readonly cost: Decimal.Value
  readonly quantity: Decimal.Value
  readonly currency: string
}

export type VarianceResult =
  | {
      readonly separable: true
      readonly volumeEffect: string
      readonly priceEffect: string
      readonly totalVariance: string
      readonly reconciles: boolean
      readonly comparedTo: string
      readonly footnote: string
    }
  | {
      readonly separable: false
      readonly totalVariance: string
      readonly comparedTo: string
      /** A cost-only prior line reports a single unsplit figure (§10.2). */
      readonly label: 'price and volume not separable'
    }

export function decomposeVariance(prior: PriorLine, actual: ActualLine): VarianceResult {
  const totalVariance = dec(actual.cost).minus(prior.cost)

  // A cost-only prior line: the interface says so rather than inferring a rate (§10.1).
  if (prior.quantity === undefined || dec(prior.quantity).isZero()) {
    return {
      separable: false,
      totalVariance: totalVariance.toFixed(),
      comparedTo: prior.comparedTo,
      label: 'price and volume not separable',
    }
  }

  const qPrior = dec(prior.quantity)
  const qActual = dec(actual.quantity)
  const pPrior = dec(prior.cost).div(qPrior)

  // The two effects are evaluated through the common term P_prior × Q_now:
  //
  //   Volume = P_p·Q_n − Cost_p   ≡ (Q_n − Q_p) × P_p
  //   Price  = Cost_n − P_p·Q_n   ≡ (P_n − P_p) × Q_n
  //
  // Both are algebraically identical to the §10.2 convention, but their sum telescopes
  // to Cost_n − Cost_p EXACTLY, because the shared term cancels. Evaluating the printed
  // formulas literally does not reconcile: P_now = Cost_n ÷ Q_n is non-terminating for
  // ordinary figures such as 48000 ÷ 110000, and that residue survives into the price
  // effect. §10.2 requires the two to sum exactly by construction, so the arrangement
  // that makes it true by construction is the one implemented.
  const priorPriceAtCurrentVolume = pPrior.times(qActual)
  const volumeEffect = priorPriceAtCurrentVolume.minus(prior.cost)
  const priceEffect = dec(actual.cost).minus(priorPriceAtCurrentVolume)

  return {
    separable: true,
    volumeEffect: volumeEffect.toFixed(),
    priceEffect: priceEffect.toFixed(),
    totalVariance: totalVariance.toFixed(),
    reconciles: volumeEffect.plus(priceEffect).equals(totalVariance),
    comparedTo: prior.comparedTo,
    footnote: VARIANCE_CONVENTION_FOOTNOTE,
  }
}

// ─── Effective unit rate (§10.3) ──────────────────────────────────────────────

/** cost.effective_rate_threshold — a movement beyond this raises an attention item. */
export const EFFECTIVE_RATE_THRESHOLD_PERCENT = '5'

/**
 * Where the bill separates fixed charges the rate excludes them; where it does not, the
 * rate is computed on total cost and labelled so the reader knows why it moves with
 * volume (§10.3). The basis is stored on every point in the series.
 */
export type RateBasis = 'consumption_charge' | 'total_cost'

export interface RatePoint {
  readonly period: string
  readonly sourceId: string
  readonly cost: Decimal.Value
  /** Fixed standing, capacity and demand charges, where the bill separates them. */
  readonly fixedCharges?: Decimal.Value | undefined
  readonly consumption: Decimal.Value
  readonly costTier: QualityTier
  readonly consumptionTier: QualityTier
}

export interface EffectiveRate {
  readonly period: string
  readonly rate: string | null
  readonly basis: RateBasis
  readonly label: string
}

export function effectiveRate(p: RatePoint): EffectiveRate {
  const consumption = dec(p.consumption)
  const separated = p.fixedCharges !== undefined
  const numerator = separated
    ? dec(p.cost).minus(dec(p.fixedCharges as Decimal.Value))
    : dec(p.cost)
  const basis: RateBasis = separated ? 'consumption_charge' : 'total_cost'

  return {
    period: p.period,
    rate: consumption.isZero() ? null : numerator.div(consumption).toFixed(),
    basis,
    label:
      basis === 'total_cost'
        ? 'rate basis: total cost — the bill does not separate fixed charges, so this rate moves with volume'
        : 'rate basis: consumption charge',
  }
}

export type RateAlert =
  | { readonly raised: true; readonly changePercent: string; readonly observation: string }
  | { readonly raised: false; readonly suppressedBecause: string }

/**
 * The effective-rate attention item.
 *
 * The platform STATES THE OBSERVATION. It does not assert an error (§10.3, CON-01).
 *
 * Four suppressions, each because the movement says nothing about the bill:
 *   • the period's consumption is zero
 *   • either the cost or the consumption is Estimated
 *   • the rate basis changed between the two periods being compared
 *   • (implicitly) no prior point exists to compare with
 */
export function rateAlert(
  current: RatePoint,
  prior: RatePoint | null,
  thresholdPercent: string = EFFECTIVE_RATE_THRESHOLD_PERCENT,
): RateAlert {
  if (prior === null) {
    return { raised: false, suppressedBecause: 'no prior period to compare with' }
  }

  const a = effectiveRate(current)
  const b = effectiveRate(prior)
  // effectiveRate returns a null rate exactly when consumption is zero, so this IS the
  // zero-consumption suppression. It used to be tested twice — once here on the raw
  // consumption and once below on the resulting rate — which made the second check
  // unreachable, and an unreachable branch in a formula §29.3 requires at 100% branch
  // coverage is a branch nobody can prove is right.
  if (a.rate === null || b.rate === null) {
    return { raised: false, suppressedBecause: "the period's consumption is zero" }
  }

  const estimated = [
    current.costTier,
    current.consumptionTier,
    prior.costTier,
    prior.consumptionTier,
  ].some((t) => t !== 'measured')
  if (estimated) {
    return {
      raised: false,
      suppressedBecause:
        'the cost or the consumption is not Measured, so the movement may be an artefact of estimation',
    }
  }

  if (a.basis !== b.basis) {
    return {
      raised: false,
      suppressedBecause: `the rate basis changed between the periods compared (${b.basis} to ${a.basis})`,
    }
  }
  const change = percentage(dec(a.rate).minus(b.rate), dec(b.rate))
  if (change === null || change.abs().lessThanOrEqualTo(thresholdPercent)) {
    return { raised: false, suppressedBecause: `the movement is within ±${thresholdPercent}%` }
  }

  const direction = change.isPositive() ? 'rose' : 'fell'
  return {
    raised: true,
    changePercent: change.toFixed(),
    // States the observation; asserts nothing.
    observation: `Effective rate for ${current.sourceId} ${direction} ${change.abs().toDecimalPlaces(0).toFixed(0)}% this month — verify the bill.`,
  }
}

// ─── Currency (§10.4) ─────────────────────────────────────────────────────────

export interface FxRate {
  readonly from: string
  readonly to: string
  readonly period: string
  readonly rate: Decimal.Value
  readonly source: string
  readonly version: string
}

export interface ConvertedCost {
  readonly transactionAmount: string
  readonly transactionCurrency: string
  readonly reportingAmount: string
  readonly reportingCurrency: string
  /** Rate, source and version stored on the converted result and shown in the trace. */
  readonly fxRate: string
  readonly fxSource: string
  readonly fxVersion: string
}

export class CurrencyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CurrencyError'
  }
}

/**
 * Convert at the approved monthly average rate. Both figures are retained: a view never
 * mixes currencies without labelling (§10.4).
 */
export function convertCost(
  amount: Decimal.Value,
  transactionCurrency: string,
  reportingCurrency: string,
  rate: FxRate | null,
): ConvertedCost {
  if (transactionCurrency === reportingCurrency) {
    return {
      transactionAmount: dec(amount).toFixed(),
      transactionCurrency,
      reportingAmount: dec(amount).toFixed(),
      reportingCurrency,
      fxRate: '1',
      fxSource: 'no conversion required',
      fxVersion: 'n/a',
    }
  }
  if (rate === null) {
    throw new CurrencyError(
      `no approved FX rate for ${transactionCurrency} to ${reportingCurrency}; the cost is not converted and is reported in its transaction currency`,
    )
  }
  if (rate.from !== transactionCurrency || rate.to !== reportingCurrency) {
    throw new CurrencyError(
      `FX rate ${rate.from}/${rate.to} does not match the conversion ${transactionCurrency}/${reportingCurrency}`,
    )
  }
  return {
    transactionAmount: dec(amount).toFixed(),
    transactionCurrency,
    reportingAmount: dec(amount).times(rate.rate).toFixed(),
    reportingCurrency,
    fxRate: dec(rate.rate).toFixed(),
    fxSource: rate.source,
    fxVersion: rate.version,
  }
}
