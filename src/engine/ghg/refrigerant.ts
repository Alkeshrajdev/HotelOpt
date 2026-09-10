/**
 * Refrigerant emissions — §8.10.
 *
 * Refrigerant leakage is frequently a material share of hotel Scope 1 and is the most
 * audit-challenged line in the inventory.
 *
 * Two methods exist and are NEVER MIXED within a period for the same asset. The method
 * in force is stored per asset per period, and cannot vary silently between periods.
 *
 * The leak rate is a factual rate, never a score (§8.10, CON-01).
 */
import { Decimal, dec, percentage, sum } from '../rounding'

/** refrigerant.leak_rate_threshold — exceeding this raises an attention item. */
export const LEAK_RATE_THRESHOLD_PERCENT = '10'

export type RefrigerantMethod = 'mass_balance' | 'screening_service_record'

export type RefrigerantEventType = 'top_up' | 'recharge' | 'purchase' | 'disposal' | 'install'

export interface RefrigerantEvent {
  readonly assetId: string
  readonly gas: string
  readonly eventType: RefrigerantEventType
  readonly quantityKg: Decimal.Value
  readonly date: string
  /**
   * A recharge following a documented full evacuation, repair or component replacement
   * records its recovered quantity. An UNDOCUMENTED recharge counts wholly as leakage
   * (§8.10).
   */
  readonly recoveredKg?: Decimal.Value | undefined
  readonly evidenceReference?: string | undefined
  readonly technician?: string | undefined
}

export class RefrigerantMethodError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RefrigerantMethodError'
  }
}

export interface LeakRateResult {
  readonly assetId: string
  readonly gas: string
  /** Σ top-up over a rolling 12 months, net of documented recharge return. */
  readonly numeratorKg: string
  readonly nameplateChargeKg: string
  readonly leakRatePercent: string | null
  /** Shown beside the rate, with its evidence (§8.10). */
  readonly excludedRechargeKg: string
  readonly excludedRechargeEvidence: readonly string[]
  readonly attentionItem: string | null
}

/**
 * Leak rate per asset and per gas.
 *
 * Recharge quantities are excluded from the numerator TO THE EXTENT recovered gas was
 * returned. An undocumented recharge — one with no recovered quantity and no evidence —
 * counts wholly as leakage.
 */
export function leakRate(
  assetId: string,
  gas: string,
  nameplateChargeKg: Decimal.Value,
  events: readonly RefrigerantEvent[],
): LeakRateResult {
  const relevant = events.filter((e) => e.assetId === assetId && e.gas === gas)

  const topUps = sum(relevant.filter((e) => e.eventType === 'top_up').map((e) => e.quantityKg))

  let rechargeCounted = dec(0)
  let excluded = dec(0)
  const evidence: string[] = []

  for (const e of relevant.filter((x) => x.eventType === 'recharge')) {
    const documented = e.recoveredKg !== undefined && (e.evidenceReference ?? '').trim() !== ''
    if (!documented) {
      // An undocumented recharge counts wholly as leakage.
      rechargeCounted = rechargeCounted.plus(e.quantityKg)
      continue
    }
    // Excluded only to the extent recovered gas was returned.
    const recovered = Decimal.min(dec(e.recoveredKg as Decimal.Value), dec(e.quantityKg))
    excluded = excluded.plus(recovered)
    rechargeCounted = rechargeCounted.plus(dec(e.quantityKg).minus(recovered))
    evidence.push(e.evidenceReference as string)
  }

  const numerator = topUps.plus(rechargeCounted)
  const rate = percentage(numerator, nameplateChargeKg)

  return {
    assetId,
    gas,
    numeratorKg: numerator.toFixed(),
    nameplateChargeKg: dec(nameplateChargeKg).toFixed(),
    leakRatePercent: rate?.toFixed() ?? null,
    excludedRechargeKg: excluded.toFixed(),
    excludedRechargeEvidence: evidence,
    attentionItem:
      rate !== null && rate.greaterThan(LEAK_RATE_THRESHOLD_PERCENT)
        ? `leak rate exceeds ${LEAK_RATE_THRESHOLD_PERCENT}% for ${assetId} (${gas})`
        : null,
  }
}

export interface RefrigerantEmissionsInput {
  readonly assetId: string
  readonly gas: string
  readonly method: RefrigerantMethod
  readonly events: readonly RefrigerantEvent[]
  /** GWP from a versioned factor set, with the assessment-report vintage recorded. */
  readonly gwp: Decimal.Value
  readonly gwpVintage: string
  /** Mass balance only: the net increase in charge held in installed equipment. */
  readonly netChargeIncreaseKg?: Decimal.Value | undefined
}

export interface RefrigerantEmissions {
  readonly assetId: string
  readonly gas: string
  readonly method: RefrigerantMethod
  readonly quantityEmittedKg: string
  readonly gwp: string
  readonly gwpVintage: string
  /** kgCO2e, posted to Scope 1 with the full trace (§8.10). */
  readonly emissionsKgCO2e: string
}

/**
 * Emissions by the asset's stored method.
 *
 *   screening / service-record: Σ top-up (net of documented recharge return) × GWP
 *   mass balance:              (purchases − disposals − net charge increase) × GWP
 */
export function refrigerantEmissions(input: RefrigerantEmissionsInput): RefrigerantEmissions {
  const relevant = input.events.filter((e) => e.assetId === input.assetId && e.gas === input.gas)

  let quantity: Decimal

  if (input.method === 'screening_service_record') {
    // Mixing methods within a period for the same asset is prohibited: a purchase or
    // disposal event has no meaning under screening and signals a mis-set method.
    if (relevant.some((e) => e.eventType === 'purchase' || e.eventType === 'disposal')) {
      throw new RefrigerantMethodError(
        `asset ${input.assetId} holds purchase or disposal events but is on the screening method; the two are never mixed within a period (§8.10)`,
      )
    }
    const r = leakRate(input.assetId, input.gas, '1', relevant)
    quantity = dec(r.numeratorKg)
  } else {
    if (input.netChargeIncreaseKg === undefined) {
      throw new RefrigerantMethodError(
        'mass balance requires the net charge increase in installed equipment (§8.10)',
      )
    }
    const purchases = sum(
      relevant.filter((e) => e.eventType === 'purchase').map((e) => e.quantityKg),
    )
    const disposals = sum(
      relevant.filter((e) => e.eventType === 'disposal').map((e) => e.quantityKg),
    )
    quantity = purchases.minus(disposals).minus(dec(input.netChargeIncreaseKg))
  }

  return {
    assetId: input.assetId,
    gas: input.gas,
    method: input.method,
    quantityEmittedKg: quantity.toFixed(),
    gwp: dec(input.gwp).toFixed(),
    gwpVintage: input.gwpVintage,
    emissionsKgCO2e: quantity.times(input.gwp).toFixed(),
  }
}
