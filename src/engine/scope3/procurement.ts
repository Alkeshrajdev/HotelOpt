/**
 * Scope 3 Categories 1 and 2 — §13.
 *
 * Two rules here are stated as fixed because doing them differently gives a different
 * answer, not merely a different presentation:
 *
 *   §13.4 ORDER OF OPERATIONS (acceptance test T-45)
 *     net of recoverable tax → convert currency at the transaction period's approved
 *     rate → deflate to the factor's reference year using the FACTOR GEOGRAPHY's index
 *     → apply factor.
 *   Selecting the index by the spend's geography, or applying it before conversion,
 *   produces a different number. The order below is the one implemented and tested.
 *
 *   §13.5 GEOGRAPHY. Ship-to country is never used as a proxy for production geography:
 *   goods manufactured in China and delivered to Dubai are not UAE production.
 */
import { Decimal, dec } from '../rounding'

export type MethodRank = 1 | 2 | 3 | 4

export const METHOD_NAMES: Record<MethodRank, string> = {
  1: 'supplier-specific',
  2: 'hybrid',
  3: 'average-data / quantity-based',
  4: 'spend-based',
}

export interface ProcurementLine {
  readonly lineId: string
  readonly supplier: string
  readonly description: string
  /** Gross spend as posted, in the transaction currency. */
  readonly spendGross: Decimal.Value
  readonly currency: string
  /** Recoverable tax, where the finance data states it. */
  readonly recoverableTax?: Decimal.Value | undefined
  readonly transactionPeriod: string
  /** A physical quantity, where one exists — the gate between rank 3 and rank 4. */
  readonly quantity?: Decimal.Value | undefined
  readonly quantityUnit?: string | undefined
  /** An accepted supplier product carbon footprint (§13.9). */
  readonly supplierFootprint?: Decimal.Value | undefined
  /** The supplier's stated country or region of PRODUCTION. */
  readonly productionGeography?: string | undefined
  /** Where the goods were delivered. Never a proxy for production geography. */
  readonly shipToCountry?: string | undefined
  /** From the finance system. Governs the category (§13.3). */
  readonly capex?: boolean | undefined
  readonly aiProposedCapex?: boolean | undefined
  readonly isNewSupplier?: boolean | undefined
}

export class Scope3Error extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Scope3Error'
  }
}

/**
 * The engine selects the highest applicable method for each line. Spend-based is the
 * lowest-quality method and the default ONLY where no quantity is available (§13.2).
 */
export function selectMethod(line: ProcurementLine, hasPhysicalFactor: boolean): MethodRank {
  if (line.supplierFootprint !== undefined) return 1
  if (line.quantity !== undefined && hasPhysicalFactor) return 3
  return 4
}

// ─── The order of operations (§13.4, T-45) ────────────────────────────────────

export interface FactorContext {
  /** The factor's own currency; spend is converted into it. */
  readonly currency: string
  /** The factor's reference year; spend is deflated to it. */
  readonly referenceYear: number
  /** The factor set's own geography — the index is selected by THIS, not by the spend. */
  readonly geography: string
  readonly sector: string
  readonly value: Decimal.Value
  readonly unit: string
  readonly setCode: string
  readonly version: string
}

export interface PriceIndex {
  readonly geography: string
  readonly sector: string
  readonly year: number
  readonly value: Decimal.Value
  readonly source: string
  readonly version: string
}

export interface FxRate {
  readonly from: string
  readonly to: string
  readonly period: string
  readonly rate: Decimal.Value
  readonly source: string
  readonly version: string
}

export interface SpendCalculation {
  readonly netOfRecoverableTax: string
  readonly converted: string
  readonly deflated: string
  readonly emissions: string
  readonly steps: readonly string[]
  readonly taxTreatmentAssumed: boolean
  readonly indexUsed: {
    readonly geography: string
    readonly sector: string
    readonly source: string
    readonly version: string
  }
  readonly fxUsed: { readonly rate: string; readonly source: string; readonly version: string }
}

/**
 * Spend-based emissions, in the fixed order.
 *
 * Deflation uses the index for the FACTOR SET's geography and sector, applied AFTER
 * conversion into the factor's currency (§13.4). Both halves of that matter.
 */
export function calculateSpendBased(input: {
  readonly line: ProcurementLine
  readonly factor: FactorContext
  readonly fx: FxRate | null
  readonly indexAtFactorYear: PriceIndex
  readonly indexAtTransactionYear: PriceIndex
  readonly tenantDefaultTaxRate?: Decimal.Value | undefined
}): SpendCalculation {
  const { line, factor, indexAtFactorYear, indexAtTransactionYear } = input
  const steps: string[] = []

  // 1. Net of recoverable tax.
  let taxAssumed = false
  let net: Decimal
  if (line.recoverableTax !== undefined) {
    net = dec(line.spendGross).minus(line.recoverableTax)
    steps.push(
      `net of recoverable tax: ${dec(line.spendGross).toFixed()} − ${dec(line.recoverableTax).toFixed()} = ${net.toFixed()}`,
    )
  } else if (input.tenantDefaultTaxRate !== undefined) {
    // Where the tax component is absent the tenant default applies and the line is
    // flagged as tax-treatment-assumed (§13.4).
    const rate = dec(input.tenantDefaultTaxRate)
    net = dec(line.spendGross).div(dec(1).plus(rate))
    taxAssumed = true
    steps.push(`net of assumed recoverable tax at ${rate.times(100).toFixed()}%: ${net.toFixed()}`)
  } else {
    net = dec(line.spendGross)
    steps.push(`no recoverable tax component: ${net.toFixed()}`)
  }

  // 2. Convert currency at the approved rate for the TRANSACTION period.
  let converted = net
  let fxUsed = { rate: '1', source: 'no conversion required', version: 'n/a' }
  if (line.currency !== factor.currency) {
    if (input.fx === null) {
      throw new Scope3Error(
        `no approved FX rate for ${line.currency} to ${factor.currency} in ${line.transactionPeriod}`,
      )
    }
    if (input.fx.from !== line.currency || input.fx.to !== factor.currency) {
      throw new Scope3Error('the FX rate does not match the conversion required')
    }
    converted = net.times(input.fx.rate)
    fxUsed = {
      rate: dec(input.fx.rate).toFixed(),
      source: input.fx.source,
      version: input.fx.version,
    }
    steps.push(
      `converted ${line.currency}→${factor.currency} at ${fxUsed.rate}: ${converted.toFixed()}`,
    )
  } else {
    steps.push(`already in the factor currency ${factor.currency}`)
  }

  // 3. Deflate to the factor's reference year, using the FACTOR GEOGRAPHY's index.
  if (
    indexAtFactorYear.geography !== factor.geography ||
    indexAtTransactionYear.geography !== factor.geography
  ) {
    throw new Scope3Error(
      `the price index must be selected by the factor set's geography (${factor.geography}), not by the spend's`,
    )
  }
  const deflated = converted.times(indexAtFactorYear.value).div(indexAtTransactionYear.value)
  steps.push(
    `deflated to ${factor.referenceYear} using the ${factor.geography} ${factor.sector} index (${indexAtFactorYear.source} ${indexAtFactorYear.version}): ${deflated.toFixed()}`,
  )

  // 4. Apply factor.
  const emissions = deflated.times(factor.value)
  steps.push(
    `× ${dec(factor.value).toFixed()} ${factor.unit} (${factor.setCode} ${factor.version}) = ${emissions.toFixed()}`,
  )

  return {
    netOfRecoverableTax: net.toFixed(),
    converted: converted.toFixed(),
    deflated: deflated.toFixed(),
    emissions: emissions.toFixed(),
    steps,
    taxTreatmentAssumed: taxAssumed,
    indexUsed: {
      geography: indexAtFactorYear.geography,
      sector: indexAtFactorYear.sector,
      source: indexAtFactorYear.source,
      version: indexAtFactorYear.version,
    },
    fxUsed,
  }
}

// ─── Geography selection (§13.5) ──────────────────────────────────────────────

export type GeographyBasis = 'stated_production' | 'rest_of_world' | 'tenant_default_proxy'

export interface GeographySelection {
  readonly geography: string
  readonly basis: GeographyBasis
  /** Disclosed on the result where a proxy was used (§13.5). */
  readonly disclosure: string | null
}

/**
 * Select the factor geography.
 *
 * Ship-to country is NEVER used as a proxy for production geography. The parameter is
 * accepted so the rule can be asserted, and is deliberately never read.
 */
export function selectGeography(
  line: ProcurementLine,
  restOfWorldAvailable: boolean,
  tenantDefault: string,
): GeographySelection {
  if (line.productionGeography !== undefined && line.productionGeography.trim() !== '') {
    return { geography: line.productionGeography, basis: 'stated_production', disclosure: null }
  }
  if (restOfWorldAvailable) {
    return {
      geography: 'RoW',
      basis: 'rest_of_world',
      disclosure:
        'the supplier has not stated its production geography; the rest-of-world sector factor applies',
    }
  }
  return {
    geography: tenantDefault,
    basis: 'tenant_default_proxy',
    disclosure: `no rest-of-world factor exists; the tenant default ${tenantDefault} applies as an explicitly recorded proxy`,
  }
}

// ─── Category 1 versus Category 2 (§13.3) ─────────────────────────────────────

export type Scope3Category = 1 | 2

export interface CategoryDecision {
  readonly category: Scope3Category
  readonly basis: 'finance_capex_flag' | 'human_set' | 'unresolved'
  /** Reported in full in the year of acquisition, never depreciated (§13.3). */
  readonly reportInFullInYearOfAcquisition: boolean
  readonly requiresReview: boolean
  readonly reason: string
}

/**
 * The determinant is ACCOUNTING TREATMENT, not spend size. High spend on consumables
 * remains Category 1. AI may propose the flag but never decides it (§13.3).
 */
export function decideCategory(line: ProcurementLine): CategoryDecision {
  if (line.capex !== undefined) {
    const conflicts = line.aiProposedCapex !== undefined && line.aiProposedCapex !== line.capex
    return {
      category: line.capex ? 2 : 1,
      basis: 'finance_capex_flag',
      reportInFullInYearOfAcquisition: line.capex,
      // A line where AI classification conflicts with the finance flag always requires
      // review regardless of value (§13.7).
      requiresReview: line.capex || conflicts,
      reason: conflicts
        ? 'the AI proposal conflicts with the finance CAPEX/OPEX flag, so the line requires review'
        : 'the CAPEX/OPEX flag from the finance system governs',
    }
  }
  return {
    category: 1,
    basis: 'unresolved',
    reportInFullInYearOfAcquisition: false,
    requiresReview: true,
    reason:
      'the finance system states no CAPEX/OPEX flag; a Reviewer, Portfolio Admin or Hotel Admin sets it. AI may propose it but never decides it',
  }
}

// ─── Double counting (§13.6) ──────────────────────────────────────────────────

export type SuppressionTarget =
  'scope_1' | 'scope_2' | 'category_2' | 'category_4' | 'category_5' | 'category_6' | 'category_8'

export interface Suppression {
  readonly suppressed: boolean
  readonly countedIn: SuppressionTarget | null
  /** The line remains in the register marked so a verifier can see nothing was dropped. */
  readonly registerLabel: string | null
}

const SUPPRESSION_RULES: Record<string, SuppressionTarget> = {
  purchased_electricity: 'scope_2',
  purchased_cooling: 'scope_2',
  purchased_heat: 'scope_2',
  purchased_steam: 'scope_2',
  combusted_fuel: 'scope_1',
  waste_treatment_service: 'category_5',
  freight_standalone: 'category_4',
  business_travel: 'category_6',
  leased_asset: 'category_8',
  capital_good: 'category_2',
}

/**
 * Every suppression is VISIBLE: the line remains in the register marked
 * "excluded — counted in X", so a verifier can see nothing was dropped (§13.6).
 */
export function checkSuppression(classification: string): Suppression {
  const target = SUPPRESSION_RULES[classification]
  if (target === undefined) return { suppressed: false, countedIn: null, registerLabel: null }
  return {
    suppressed: true,
    countedIn: target,
    registerLabel: `excluded — counted in ${target.replace('_', ' ')}`,
  }
}

/**
 * A refrigerant purchase is the one case that does NOT conflict: the gas emissions are
 * Scope 1 from the register, while the purchase's upstream production emissions may sit
 * in Category 1. The distinction is recorded rather than suppressed (§13.6).
 */
export function refrigerantPurchaseTreatment(): Suppression & { readonly note: string } {
  return {
    suppressed: false,
    countedIn: null,
    registerLabel: null,
    note: 'gas emissions are Scope 1 from the refrigerant register; the purchase’s upstream production emissions sit in Category 1 without conflict',
  }
}

// ─── Materiality and review (§13.7) ───────────────────────────────────────────

export interface ReviewInput {
  readonly line: ProcurementLine
  readonly category: Scope3Category
  readonly estimatedEmissions: Decimal.Value
  readonly spendThreshold: Decimal.Value
  readonly emissionsThreshold: Decimal.Value
  readonly aiConflictsWithFinance: boolean
}

export interface ReviewDecision {
  readonly mandatory: boolean
  readonly reason: string
}

/**
 * Category 2 lines, new suppliers, and lines where AI classification conflicts with the
 * finance flag ALWAYS require review regardless of value (§13.7).
 */
export function reviewRequirement(input: ReviewInput): ReviewDecision {
  if (input.category === 2) {
    return {
      mandatory: true,
      reason: 'a Category 2 line is never auto-approved, regardless of value',
    }
  }
  if (input.line.isNewSupplier === true) {
    return { mandatory: true, reason: 'a new supplier is never auto-approved, regardless of value' }
  }
  if (input.aiConflictsWithFinance) {
    return {
      mandatory: true,
      reason: 'the AI classification conflicts with the finance CAPEX/OPEX flag',
    }
  }
  if (dec(input.line.spendGross).greaterThan(input.spendThreshold)) {
    return { mandatory: true, reason: 'the line is above the configured spend threshold' }
  }
  if (dec(input.estimatedEmissions).greaterThan(input.emissionsThreshold)) {
    return {
      mandatory: true,
      reason: 'the line is above the configured estimated-emissions threshold',
    }
  }
  return { mandatory: false, reason: 'below both thresholds; a reproducible sample is reviewed' }
}
