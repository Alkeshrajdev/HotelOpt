/**
 * Sub-meter reconciliation and the diagnostic escalation rule — §8.4, §8.7.
 *
 * Unallocated is NEVER NEGATIVE. A negative residual is a measurement fault — double-
 * counted meters, a mis-parented sub-meter, a CT ratio error — not a quantity, and
 * rendering it as one hides the fault (§8.4).
 *
 * Where sub-meters and the bill disagree, THE BILL GOVERNS every reported figure and
 * the discrepancy is raised as a data-quality item.
 */
import { Decimal, dec, percentage, sum } from '../rounding'
import { isEvidencedBasis, type AllocationBasis, type EndUse } from './taxonomy'

/** submeter.reconciliation_tolerance */
export const SUBMETER_TOLERANCE_PERCENT = '2'
/** mv.parent_coverage_min */
export const PARENT_COVERAGE_MIN_PERCENT = '70'
/** mv.enduse_separation_min */
export const ENDUSE_SEPARATION_MIN_PERCENT = '90'

export type ReconciliationState =
  'reconciled' | 'over_measurement_within_tolerance' | 'reconciliation_failure'

export interface ChildMeterReading {
  readonly meterId: string
  readonly consumption: Decimal.Value
}

export interface Reconciliation {
  readonly state: ReconciliationState
  /** The approved parent total, which governs (§8.4). */
  readonly parentTotal: string
  readonly childTotal: string
  /**
   * Published on its own line as a positive quantity and as a share of P. Never
   * distributed across end-uses, never suppressed, never described as "other".
   * Null where the state is a reconciliation failure: not determinable, not zero.
   */
  readonly unallocated: string | null
  readonly unallocatedSharePercent: string | null
  /** Disclosed with its quantity where measurement exceeds the parent (§8.4). */
  readonly overMeasurement: string | null
  readonly dataQualityItem: string | null
  /** End-use attribution for this parent is suspended on a reconciliation failure. */
  readonly attributionSuspended: boolean
}

export function reconcileSubMeters(
  parentTotal: Decimal.Value,
  children: readonly ChildMeterReading[],
  tolerancePercent: string = SUBMETER_TOLERANCE_PERCENT,
): Reconciliation {
  const P = dec(parentTotal)
  const C = sum(children.map((c) => c.consumption))
  const ceiling = P.times(dec(100).plus(tolerancePercent)).div(100)

  if (C.lessThanOrEqualTo(P)) {
    const unallocated = P.minus(C)
    return {
      state: 'reconciled',
      parentTotal: P.toFixed(),
      childTotal: C.toFixed(),
      unallocated: unallocated.toFixed(),
      unallocatedSharePercent: percentage(unallocated, P)?.toFixed() ?? null,
      overMeasurement: null,
      dataQualityItem: null,
      attributionSuspended: false,
    }
  }

  if (C.lessThanOrEqualTo(ceiling)) {
    // Unallocated is reported as ZERO, not as a negative number.
    return {
      state: 'over_measurement_within_tolerance',
      parentTotal: P.toFixed(),
      childTotal: C.toFixed(),
      unallocated: '0',
      unallocatedSharePercent: '0',
      overMeasurement: C.minus(P).toFixed(),
      dataQualityItem: null,
      attributionSuspended: false,
    }
  }

  return {
    state: 'reconciliation_failure',
    parentTotal: P.toFixed(),
    childTotal: C.toFixed(),
    // Not determinable — distinct from zero.
    unallocated: null,
    unallocatedSharePercent: null,
    overMeasurement: C.minus(P).toFixed(),
    dataQualityItem: `sub-meter total exceeds the approved parent total by more than ±${tolerancePercent}%; meters involved: ${children
      .map((c) => c.meterId)
      .join(', ')}`,
    attributionSuspended: true,
  }
}

// ─── Diagnostic escalation (§8.7) ─────────────────────────────────────────────

export type DiagnosticLevel = 'L1' | 'L2' | 'L3' | 'L4'

export interface AllocationEdge {
  readonly meterId: string
  readonly endUse: EndUse
  readonly consumption: Decimal.Value
  readonly basis: AllocationBasis
}

export interface CoverageInput {
  readonly parentTotal: Decimal.Value
  readonly children: readonly ChildMeterReading[]
  readonly edges: readonly AllocationEdge[]
  readonly namedEndUse: EndUse
  /** Both conditions must hold for at least three continuous months (§8.7). */
  readonly continuousMonthsMet: number
  readonly reconciliation: Reconciliation
  /** Asset-level metering plus operating parameters, for L3. */
  readonly assetLevelMetering?: boolean | undefined
  /** An approved M&V plan with a named signatory, for L4. */
  readonly mvSignedOff?: boolean | undefined
}

export interface CoverageResult {
  /** Σ child consumption ÷ approved parent total. */
  readonly parentCoveragePercent: string | null
  /** Consumption mapped to the named end-use ÷ Σ all child consumption. */
  readonly endUseSeparationPercent: string | null
  readonly level: DiagnosticLevel
  /** Both figures are published beside every L2 statement (§8.7). */
  readonly publishedBeside: readonly string[]
  readonly reason: string
}

/**
 * Determine the diagnostic level for a named end-use in a period.
 *
 * "Sub-metering covering 70% of the end-use" is circular: the end-use total is precisely
 * what is unknown until it is metered. §8.7 replaces it with two non-circular
 * conditions, both of which must hold.
 *
 * A level is recomputed per period and is NEVER inherited from the prior period, so the
 * interface degrades rather than continuing to assert a claim from stale coverage.
 */
export function diagnosticLevel(input: CoverageInput): CoverageResult {
  const childTotal = sum(input.children.map((c) => c.consumption))
  const parentCoverage = percentage(childTotal, input.parentTotal)

  // Only edges whose basis is an evidenced measurement or schedule count toward
  // separation. An assumption counts toward the combined group, not toward a named
  // end-use (§8.7).
  const namedEvidenced = sum(
    input.edges
      .filter((e) => e.endUse === input.namedEndUse && isEvidencedBasis(e.basis))
      .map((e) => e.consumption),
  )
  const separation = percentage(namedEvidenced, childTotal)

  const published = [
    `parent coverage ${parentCoverage?.toDecimalPlaces(1).toFixed(1) ?? 'n/a'}%`,
    `end-use separation ${separation?.toDecimalPlaces(1).toFixed(1) ?? 'n/a'}%`,
  ]

  const base: Omit<CoverageResult, 'level' | 'reason'> = {
    parentCoveragePercent: parentCoverage?.toFixed() ?? null,
    endUseSeparationPercent: separation?.toFixed() ?? null,
    publishedBeside: published,
  }

  // A reconciliation failure drops the affected end-uses to L1 until resolved (§8.4).
  if (input.reconciliation.state === 'reconciliation_failure') {
    return {
      ...base,
      level: 'L1',
      reason: 'sub-meter reconciliation failed; end-use attribution is suspended for this parent',
    }
  }

  const coverageOk =
    parentCoverage !== null && parentCoverage.greaterThanOrEqualTo(PARENT_COVERAGE_MIN_PERCENT)
  const separationOk =
    separation !== null && separation.greaterThanOrEqualTo(ENDUSE_SEPARATION_MIN_PERCENT)
  const continuous = input.continuousMonthsMet >= 3

  if (!coverageOk || !separationOk || !continuous) {
    const why: string[] = []
    if (!coverageOk) why.push(`parent coverage below ${PARENT_COVERAGE_MIN_PERCENT}%`)
    if (!separationOk) why.push(`end-use separation below ${ENDUSE_SEPARATION_MIN_PERCENT}%`)
    if (!continuous) why.push('the conditions have not held for three continuous months')
    return { ...base, level: 'L1', reason: why.join('; ') }
  }

  if (input.mvSignedOff === true) {
    return {
      ...base,
      level: 'L4',
      reason: 'an approved M&V plan is signed off with a named signatory',
    }
  }
  if (input.assetLevelMetering === true) {
    return {
      ...base,
      level: 'L3',
      reason: 'asset-level metering and operating parameters are available',
    }
  }
  return {
    ...base,
    level: 'L2',
    reason: 'both coverage conditions hold for three continuous months',
  }
}

/** What each level may and may not state (§8.7). Carried with every statement. */
export const LEVEL_PERMITS: Record<
  DiagnosticLevel,
  { readonly permitted: string; readonly prohibited: string }
> = {
  L1: {
    permitted: 'a property-level variance against the expected range, with driver decomposition',
    prohibited: 'any attribution to a system, area or asset',
  },
  L2: {
    permitted:
      'that the variance is concentrated in a named end-use, against that end-use’s own expected range',
    prohibited: 'naming a cause, naming an asset, or quantifying a saving',
  },
  L3: {
    permitted:
      "an asset's performance ratio against its own established baseline at comparable load",
    prohibited:
      'declaring the asset inefficient, prescribing a retrofit, or stating a projected saving',
  },
  L4: {
    permitted:
      'a quantified avoided consumption or cost for the named measure, with the IPMVP option and signatory',
    prohibited: 'automatic generation of any kind',
  },
}
