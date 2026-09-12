/**
 * Delivered fuels — stock accounting (§6.5, §24.3).
 *
 * A fuel delivery is a PURCHASE, not consumption. Diesel delivered in March may be
 * burnt across April to June. Apportioning a delivery across a period is wrong and is
 * prohibited.
 *
 *     Consumption = Opening stock + Deliveries − Closing stock   (per tank, per period)
 *
 * Where no stock readings exist the platform states so and uses deliveries as a Proxy
 * with the reason recorded. It never silently substitutes deliveries for consumption,
 * and never spreads a delivery across days.
 */
import { Decimal, dec, sum } from '../rounding'
import type { QualityTier } from '../quality'

/** Unexplained difference beyond this raises an attention item (§6.5). */
export const FUEL_RECONCILIATION_TOLERANCE = '0.03'

export interface StockReading {
  readonly quantity: Decimal.Value
  readonly method: 'dip_stick' | 'gauge' | 'telemetry' | 'cylinder_count' | 'weighed'
  readonly evidenceId?: string | undefined
}

export interface Delivery {
  readonly quantity: Decimal.Value
  readonly date: string
  readonly deliveryNote?: string | undefined
}

export interface TankPeriodInput {
  readonly tankId: string
  readonly fuelType: string
  readonly unit: string
  readonly opening?: StockReading | undefined
  readonly closing?: StockReading | undefined
  readonly deliveries: readonly Delivery[]
}

export interface ConsumptionResult {
  readonly tankId: string
  readonly quantity: string
  readonly unit: string
  readonly tier: QualityTier
  readonly method: string | null
  /** True where deliveries stood in for consumption because stock readings were absent. */
  readonly deliveriesUsedAsProxy: boolean
  readonly attentionItem: string | null
}

export class FuelStockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FuelStockError'
  }
}

export function consumptionFromStock(input: TankPeriodInput): ConsumptionResult {
  const deliveries = sum(input.deliveries.map((d) => d.quantity))

  // No stock readings available: state it explicitly and use deliveries as a Proxy,
  // with the reason recorded. Never a silent substitution.
  if (input.opening === undefined || input.closing === undefined) {
    return {
      tankId: input.tankId,
      quantity: deliveries.toFixed(),
      unit: input.unit,
      tier: 'proxy',
      method: 'deliveries used in place of consumption: stock readings unavailable',
      deliveriesUsedAsProxy: true,
      attentionItem: `record opening and closing stock for tank ${input.tankId}`,
    }
  }

  const opening = dec(input.opening.quantity)
  const closing = dec(input.closing.quantity)
  if (opening.isNegative() || closing.isNegative()) {
    throw new FuelStockError('a stock reading is never negative')
  }

  const consumption = opening.plus(deliveries).minus(closing)
  if (consumption.isNegative()) {
    // Physically impossible: closing stock exceeds what was available.
    throw new FuelStockError(
      `tank ${input.tankId}: closing stock exceeds opening plus deliveries, which is physically impossible`,
    )
  }

  return {
    tankId: input.tankId,
    quantity: consumption.toFixed(),
    unit: input.unit,
    tier: 'measured',
    method: null,
    deliveriesUsedAsProxy: false,
    attentionItem: null,
  }
}

// ─── Splitting a tank that serves several combustion types ────────────────────

export type SplitBasis = 'single_type' | 'recorded_quantities' | 'runtime_hours' | 'no_evidence'

export interface ServedAsset {
  readonly assetId: string
  readonly combustionType: 'stationary' | 'mobile'
  /** Recorded draw, where individually metered or logged. */
  readonly recordedQuantity?: Decimal.Value | undefined
  readonly runtimeHours?: Decimal.Value | undefined
  /** Rated fuel consumption per hour, from the asset register (§8.5). */
  readonly ratedConsumptionPerHour?: Decimal.Value | undefined
  /** Used to choose the residual recipient: the largest registered stationary asset. */
  readonly registeredSize?: Decimal.Value | undefined
  readonly emissionFactor?: Decimal.Value | undefined
}

export interface SplitAllocation {
  readonly assetId: string
  readonly quantity: string
  readonly derived: boolean
  readonly residualAbsorbed: string
}

export interface SplitResult {
  readonly basis: SplitBasis
  readonly allocations: readonly SplitAllocation[]
  /** Set only where no split was performed and one combined source is posted instead. */
  readonly combinedSource: {
    readonly constituentTypes: readonly string[]
    readonly emissionFactorApplied: string
    readonly disclosure: string
  } | null
  readonly basisNote: string
}

/**
 * Split a tank's calculated consumption across the assets it serves.
 *
 * Splitting by assumption is prohibited, on the same principle as §8.2's combined
 * end-use groups. Where no evidence of a split exists, no split is performed: the
 * consumption posts to a single combined fuel source, the constituent asset types are
 * named, and the highest applicable emission factor among them applies, disclosed.
 */
export function splitTankConsumption(
  consumption: Decimal.Value,
  assets: readonly ServedAsset[],
): SplitResult {
  const total = dec(consumption)
  if (assets.length === 0) throw new FuelStockError('a tank serves at least one asset')

  if (assets.length === 1) {
    const only = assets[0] as ServedAsset
    return {
      basis: 'single_type',
      allocations: [
        { assetId: only.assetId, quantity: total.toFixed(), derived: false, residualAbsorbed: '0' },
      ],
      combinedSource: null,
      basisNote: 'tank serves one combustion type; the whole consumption posts to that source',
    }
  }

  // Each asset's recorded draw travels WITH the asset rather than being looked up by
  // index later. An indexed lookup needs a `?? 0` fallback under noUncheckedIndexedAccess,
  // and that fallback is unreachable — an untestable branch inside a formula §29.3
  // requires at 100% branch coverage.
  const recordedRows: { asset: ServedAsset; recorded: Decimal }[] = []
  for (const a of assets) {
    if (a.recordedQuantity === undefined) break
    recordedRows.push({ asset: a, recorded: dec(a.recordedQuantity) })
  }

  if (recordedRows.length === assets.length) {
    const residual = total.minus(sum(recordedRows.map((r) => r.recorded)))

    // The residual posts to the largest registered stationary asset, flagged derived.
    const stationary = recordedRows.filter((r) => r.asset.combustionType === 'stationary')
    const candidates = stationary.length > 0 ? stationary : recordedRows
    const recipient = candidates.reduce((best, r) =>
      dec(r.asset.registeredSize ?? 0).greaterThan(dec(best.asset.registeredSize ?? 0)) ? r : best,
    ).asset

    return {
      basis: 'recorded_quantities',
      allocations: recordedRows.map((r) => {
        const isRecipient = r.asset.assetId === recipient.assetId
        return {
          assetId: r.asset.assetId,
          quantity: r.recorded.plus(isRecipient ? residual : 0).toFixed(),
          derived: isRecipient && !residual.isZero(),
          residualAbsorbed: isRecipient ? residual.toFixed() : '0',
        }
      }),
      combinedSource: null,
      basisNote: `split on recorded quantities; residual of ${residual.toFixed()} posted to ${recipient.assetId} and flagged derived`,
    }
  }

  // Same shape as the recorded path: the weight travels with its asset.
  const runtimeRows: { asset: ServedAsset; weight: Decimal }[] = []
  for (const a of assets) {
    if (a.runtimeHours === undefined || a.ratedConsumptionPerHour === undefined) break
    runtimeRows.push({
      asset: a,
      weight: dec(a.runtimeHours).times(dec(a.ratedConsumptionPerHour)),
    })
  }

  if (runtimeRows.length === assets.length) {
    const weightTotal = sum(runtimeRows.map((r) => r.weight))
    if (weightTotal.isZero()) {
      return combined(total, assets, 'runtime hours recorded but all weights are zero')
    }
    const shares = runtimeRows.map((r) => ({
      asset: r.asset,
      value: total.times(r.weight).div(weightTotal),
    }))
    const residual = total.minus(sum(shares.map((s) => s.value)))
    return {
      basis: 'runtime_hours',
      allocations: shares.map((sh, i) => {
        const isLast = i === shares.length - 1
        return {
          assetId: sh.asset.assetId,
          quantity: sh.value.plus(isLast ? residual : 0).toFixed(),
          derived: true,
          residualAbsorbed: isLast ? residual.toFixed() : '0',
        }
      }),
      combinedSource: null,
      basisNote:
        'split proportional to runtime hours × rated fuel consumption; the basis, the rated figures and their source are stored on the derived value',
    }
  }

  return combined(total, assets, 'no evidence of a split exists')
}

function combined(total: Decimal, assets: readonly ServedAsset[], why: string): SplitResult {
  const types = [...new Set(assets.map((a) => a.combustionType))]
  const highest = assets.reduce((best, a) =>
    dec(a.emissionFactor ?? 0).greaterThan(dec(best.emissionFactor ?? 0)) ? a : best,
  )
  return {
    basis: 'no_evidence',
    allocations: [
      {
        assetId: 'combined_fuel_source',
        quantity: total.toFixed(),
        derived: false,
        residualAbsorbed: '0',
      },
    ],
    combinedSource: {
      constituentTypes: types,
      emissionFactorApplied: dec(highest.emissionFactor ?? 0).toFixed(),
      disclosure: `${why}; no split performed. Consumption posts to one combined fuel source naming its constituents (${assets
        .map((a) => a.assetId)
        .join(', ')}), and the highest applicable emission factor among them applies.`,
    },
    basisNote: 'splitting by assumption is prohibited (§6.5, §8.2)',
  }
}

/**
 * Annual reconciliation of Σ deliveries against Σ consumption plus stock movement.
 * An unexplained difference beyond ±3% raises an attention item (§6.5).
 */
export function reconcile(
  deliveries: Decimal.Value,
  consumption: Decimal.Value,
  openingStock: Decimal.Value,
  closingStock: Decimal.Value,
): {
  readonly difference: string
  readonly withinTolerance: boolean
  readonly attentionItem: string | null
} {
  const expected = dec(consumption).plus(dec(closingStock)).minus(dec(openingStock))
  const difference = dec(deliveries).minus(expected)
  const base = dec(deliveries)
  const withinTolerance = base.isZero()
    ? difference.isZero()
    : difference.abs().div(base).lessThanOrEqualTo(FUEL_RECONCILIATION_TOLERANCE)
  return {
    difference: difference.toFixed(),
    withinTolerance,
    attentionItem: withinTolerance
      ? null
      : `fuel reconciliation difference of ${difference.toFixed()} exceeds ±3%`,
  }
}
