/**
 * Inventory assembly and consolidation — §11.1, §11.2, CON-04.
 *
 * CON-04 is the governing rule: the platform shall not blend physical emissions,
 * market-based Scope 2 accounting and carbon-credit compensation into one performance
 * figure. Scope 1, location-based Scope 2, market-based Scope 2 and Scope 3 are retained
 * SEPARATELY AT ALL TIMES (§11.3), so this module has no field holding their sum, and
 * `grossOperational` deliberately covers only Scope 1 + location-based Scope 2 — the
 * physical position, as §24.1 defines it.
 *
 * Compensation is displayed separately from the inventory and never summed into the
 * hotel's own figure (§24.1).
 */
import { Decimal, dec, percentage, sum } from '../rounding'

export type ConsolidationApproach = 'operational_control' | 'financial_control' | 'equity_share'
export type ControlType = 'owned' | 'leased' | 'managed' | 'franchised'

export interface HotelBoundary {
  readonly hotelId: string
  readonly controlType: ControlType
  readonly ownershipPercent: Decimal.Value
  /** True where the tenant operates or financially controls the hotel. */
  readonly operated: boolean
  readonly financiallyControlled: boolean
}

/**
 * The consolidation share, derived from the approach and the hotel's boundary record.
 * Effective-dated on the hotel record; resolved here for a given period.
 */
export function consolidationShare(approach: ConsolidationApproach, b: HotelBoundary): Decimal {
  switch (approach) {
    case 'operational_control':
      return b.operated ? dec(100) : dec(0)
    case 'financial_control':
      return b.financiallyControlled ? dec(100) : dec(0)
    case 'equity_share':
      return dec(b.ownershipPercent)
  }
}

/**
 * The four figures, held apart. There is deliberately no `total` field: a single number
 * spanning market-based accounting and physical emissions would violate CON-04.
 */
export interface Inventory {
  readonly scope1KgCO2e: string
  readonly scope2LocationBasedKgCO2e: string
  readonly scope2MarketBasedKgCO2e: string
  readonly scope3KgCO2e: string
  /**
   * Scope 1 + location-based Scope 2 — the physical position (§24.1). Market-based
   * Scope 2 is never substituted into it, and compensation never nets against it.
   */
  readonly grossOperationalKgCO2e: string
  readonly gwpVintage: string
  readonly methodVersion: string
}

export interface ScopeInputs {
  readonly scope1KgCO2e: Decimal.Value
  readonly scope2LocationBasedKgCO2e: Decimal.Value
  readonly scope2MarketBasedKgCO2e: Decimal.Value
  readonly scope3KgCO2e: Decimal.Value
  readonly gwpVintage: string
  readonly methodVersion: string
}

export function assembleInventory(i: ScopeInputs): Inventory {
  return {
    scope1KgCO2e: dec(i.scope1KgCO2e).toFixed(),
    scope2LocationBasedKgCO2e: dec(i.scope2LocationBasedKgCO2e).toFixed(),
    scope2MarketBasedKgCO2e: dec(i.scope2MarketBasedKgCO2e).toFixed(),
    scope3KgCO2e: dec(i.scope3KgCO2e).toFixed(),
    grossOperationalKgCO2e: dec(i.scope1KgCO2e).plus(i.scope2LocationBasedKgCO2e).toFixed(),
    gwpVintage: i.gwpVintage,
    methodVersion: i.methodVersion,
  }
}

/**
 * Compensation, reported separately by beneficiary type and never summed across types
 * into the hotel's own figure (§24.1, CON-04).
 */
export interface CompensationPosition {
  readonly byBeneficiaryType: Readonly<Record<string, string>>
  readonly note: string
}

export function compensationPosition(
  allocations: readonly {
    readonly beneficiaryType: string
    readonly quantityTCO2e: Decimal.Value
  }[],
): CompensationPosition {
  const byType: Record<string, string> = {}
  for (const a of allocations) {
    byType[a.beneficiaryType] = dec(byType[a.beneficiaryType] ?? 0)
      .plus(a.quantityTCO2e)
      .toFixed()
  }
  return {
    byBeneficiaryType: byType,
    note: 'compensation is reported separately and is never deducted from gross physical emissions (CON-04, K-04)',
  }
}

// ─── Portfolio consolidation ──────────────────────────────────────────────────

export interface PortfolioLine {
  readonly hotelId: string
  readonly emissionsKgCO2e: Decimal.Value
  /** The intensity denominator for this hotel — occupied room nights. */
  readonly denominator: Decimal.Value
  readonly share: Decimal.Value
  /** False for periods outside the hotel's boundary (§11.2 mid-year joiners/leavers). */
  readonly withinBoundary: boolean
}

export interface PortfolioIntensity {
  readonly numerator: string
  readonly denominator: string
  readonly intensity: string | null
  readonly hotelsIncluded: readonly string[]
  readonly hotelsExcluded: readonly string[]
  /** Coverage disclosure for mid-year joiners and leavers (§11.2). */
  readonly coverageNote: string | null
}

/**
 * A portfolio intensity, with the consolidation share applied IDENTICALLY to numerator
 * and denominator.
 *
 * Applying it to one only is a defect class explicitly tested for (§11.2): a 50%-share
 * hotel would otherwise contribute half its emissions against all of its room nights,
 * making the portfolio look better simply for holding a minority stake.
 *
 * A hotel outside the boundary for the period is excluded from BOTH sides, never from
 * one.
 */
export function portfolioIntensity(lines: readonly PortfolioLine[]): PortfolioIntensity {
  const included = lines.filter((l) => l.withinBoundary && !dec(l.share).isZero())
  const excluded = lines.filter((l) => !l.withinBoundary || dec(l.share).isZero())

  const numerator = sum(included.map((l) => dec(l.emissionsKgCO2e).times(l.share).div(100)))
  const denominator = sum(included.map((l) => dec(l.denominator).times(l.share).div(100)))

  return {
    numerator: numerator.toFixed(),
    denominator: denominator.toFixed(),
    intensity: denominator.isZero() ? null : numerator.div(denominator).toFixed(),
    hotelsIncluded: included.map((l) => l.hotelId),
    hotelsExcluded: excluded.map((l) => l.hotelId),
    coverageNote:
      excluded.length > 0
        ? `${excluded.length} hotel(s) excluded from both numerator and denominator for periods outside the boundary or with a zero consolidation share`
        : null,
  }
}

// ─── Base year (§11.2) ────────────────────────────────────────────────────────

export type BaseYearTrigger =
  | 'acquisition'
  | 'disposal'
  | 'transfer'
  | 'consolidation_approach_change'
  | 'boundary_change'
  | 'methodology_change'
  | 'discovered_error'
  | 'organic_growth'
  | 'organic_decline'

export interface BaseYearAssessment {
  readonly recalculationRequired: boolean
  readonly reason: string
}

/**
 * Whether a change triggers base-year recalculation.
 *
 * Organic growth and decline NEVER trigger recalculation (§11.2) — a hotel simply
 * selling more rooms does not change what the base year meant.
 *
 * A discovered error triggers only above the significance threshold, default 5% of
 * base-year emissions.
 */
export function baseYearRecalculation(
  trigger: BaseYearTrigger,
  opts?: {
    readonly changeKgCO2e?: Decimal.Value | undefined
    readonly baseYearKgCO2e?: Decimal.Value | undefined
    readonly significanceThresholdPercent?: string | undefined
  },
): BaseYearAssessment {
  if (trigger === 'organic_growth' || trigger === 'organic_decline') {
    return {
      recalculationRequired: false,
      reason: 'organic growth and decline never trigger base-year recalculation',
    }
  }

  if (trigger === 'discovered_error') {
    const change = opts?.changeKgCO2e
    const base = opts?.baseYearKgCO2e
    if (change === undefined || base === undefined) {
      return {
        recalculationRequired: false,
        reason: 'the significance of the error cannot be assessed without the base-year figure',
      }
    }
    const threshold = opts?.significanceThresholdPercent ?? '5'
    const pct = percentage(dec(change).abs(), base)
    const significant = pct !== null && pct.greaterThan(threshold)
    return {
      recalculationRequired: significant,
      reason: significant
        ? `the error is ${pct?.toDecimalPlaces(1).toFixed(1)}% of base-year emissions, above the ${threshold}% significance threshold`
        : `the error is below the ${threshold}% significance threshold`,
    }
  }

  return { recalculationRequired: true, reason: `${trigger} triggers base-year recalculation` }
}
