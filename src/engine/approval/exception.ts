/**
 * Approve by exception — §3.3.
 *
 * A hotel-month meeting EVERY exception condition auto-approves after a quiet period,
 * with a distinct provenance flag and a full audit event. Where any condition cannot be
 * evaluated, the hotel-month does NOT auto-approve and routes to normal review.
 *
 * The rule that carries the most weight: absence of a variance reference is never
 * treated as a pass. A month the platform cannot check is a month a human checks.
 */
import { Decimal, dec, percentage } from '../rounding'
import type { QualityTier } from '../quality'

export type ApprovalLevel = 'L1' | 'L2' | 'L3' | 'L4'

/**
 * Who sits in the chain at each level, in the five-role vocabulary of SPEC-02 §1 and
 * SPEC-03E: L1 property only · L2 property then portfolio · L3 property then Farnek ·
 * L4 all three. Role identifiers, held as strings so the engine does not import the
 * access service; `services/access/vocabulary.ts` is the authority on their spelling.
 */
export const APPROVAL_LEVELS: Record<ApprovalLevel, readonly string[]> = {
  L1: ['property_access'],
  L2: ['property_access', 'portfolio_access'],
  L3: ['property_access', 'farnek_admin'],
  L4: ['property_access', 'portfolio_access', 'farnek_admin'],
}

export type ApprovalGranularity = 'per_record' | 'per_resource' | 'per_hotel_month'

/** The tenant's ApprovalMatrix (§23.1), effective-dated so a past approval is explicable. */
export interface ApprovalMatrix {
  readonly level: ApprovalLevel
  readonly granularity: ApprovalGranularity
  readonly approveByException: boolean
  /** Working days after submission with no reviewer action. */
  readonly quietPeriodWorkingDays: number
  readonly bulkApproval: boolean
  readonly segregationOfDuties: boolean
  readonly escalationWorkingDays: number
  /** Per-resource variance tolerance for approve-by-exception. */
  readonly varianceTolerancePercent: string
}

export const DEFAULT_APPROVAL_MATRIX: ApprovalMatrix = {
  level: 'L3',
  granularity: 'per_hotel_month',
  approveByException: false,
  quietPeriodWorkingDays: 3,
  bulkApproval: true,
  segregationOfDuties: true,
  escalationWorkingDays: 5,
  varianceTolerancePercent: '10',
}

/** The variance reference, in order. The first available is used and is recorded. */
export type VarianceReferenceKind =
  'genuine_performance_expected' | 'same_month_prior_year' | 'mean_of_three_preceding' | 'none'

export interface ResourceCandidate {
  readonly sourceId: string
  readonly value: Decimal.Value
  /** The GP expected value for the period, where an eligible model exists (§7.3). */
  readonly gpExpected?: Decimal.Value | undefined
  /** The same calendar month of the prior year, where an approved value exists. */
  readonly priorYearSameMonth?: Decimal.Value | undefined
  /** The three preceding approved months for the same source. */
  readonly threePrecedingMonths?: readonly Decimal.Value[] | undefined
}

export interface ExceptionInput {
  readonly matrix: ApprovalMatrix
  /** Every quantitative record's tier in the hotel-month. */
  readonly tiers: readonly QualityTier[]
  /** Soft warnings raised, and whether each carries a recorded acknowledgement. */
  readonly softWarnings: readonly { readonly code: string; readonly acknowledged: boolean }[]
  readonly resources: readonly ResourceCandidate[]
  readonly workingDaysSinceSubmission: number
  /** Any reviewer action during the quiet period cancels auto-approval. */
  readonly reviewerActed: boolean
}

export interface ConditionResult {
  readonly condition: string
  readonly passed: boolean
  readonly detail: string
}

export interface ExceptionOutcome {
  readonly autoApprove: boolean
  readonly conditions: readonly ConditionResult[]
  /** Recorded on the auto-approval audit event (§3.3). */
  readonly varianceReferenceUsed: Readonly<Record<string, VarianceReferenceKind>>
  readonly routeToReview: boolean
  readonly reason: string
}

interface Reference {
  readonly kind: VarianceReferenceKind
  readonly value: Decimal | null
}

/**
 * Resolve the variance reference in the order §3.3 defines. Where none exists the kind
 * is `none` and the condition fails — absence is never a pass.
 */
export function resolveVarianceReference(r: ResourceCandidate): Reference {
  if (r.gpExpected !== undefined) {
    return { kind: 'genuine_performance_expected', value: dec(r.gpExpected) }
  }
  if (r.priorYearSameMonth !== undefined) {
    return { kind: 'same_month_prior_year', value: dec(r.priorYearSameMonth) }
  }
  if (r.threePrecedingMonths !== undefined && r.threePrecedingMonths.length === 3) {
    const total = r.threePrecedingMonths.reduce<Decimal>((a, v) => a.plus(dec(v)), dec(0))
    return { kind: 'mean_of_three_preceding', value: total.div(3) }
  }
  return { kind: 'none', value: null }
}

export function evaluateApproveByException(input: ExceptionInput): ExceptionOutcome {
  const conditions: ConditionResult[] = []
  const referenceUsed: Record<string, VarianceReferenceKind> = {}

  if (!input.matrix.approveByException) {
    return {
      autoApprove: false,
      conditions: [],
      varianceReferenceUsed: {},
      routeToReview: true,
      reason: 'approve by exception is off for this tenant',
    }
  }

  // No open validation warnings: every soft warning acknowledged or absent.
  const open = input.softWarnings.filter((w) => !w.acknowledged)
  conditions.push({
    condition: 'no open validation warnings',
    passed: open.length === 0,
    detail:
      open.length === 0
        ? 'every soft warning is acknowledged or absent'
        : `${open.length} unacknowledged: ${open.map((w) => w.code).join(', ')}`,
  })

  // No non-measured values. A single Estimated or Proxy value disqualifies the month.
  const nonMeasured = input.tiers.filter((t) => t !== 'measured')
  conditions.push({
    condition: 'no non-measured values',
    passed: nonMeasured.length === 0,
    detail:
      nonMeasured.length === 0
        ? 'every quantitative record is Measured'
        : `${nonMeasured.length} record(s) are ${[...new Set(nonMeasured)].join(' or ')}`,
  })

  // Variance within tolerance, per resource, against the resolved reference.
  let allWithin = true
  let anyReferenceMissing = false
  const varianceDetails: string[] = []

  for (const r of input.resources) {
    const ref = resolveVarianceReference(r)
    referenceUsed[r.sourceId] = ref.kind

    if (ref.value === null) {
      anyReferenceMissing = true
      allWithin = false
      varianceDetails.push(`${r.sourceId}: no reference available`)
      continue
    }
    if (ref.value.isZero()) {
      anyReferenceMissing = true
      allWithin = false
      varianceDetails.push(`${r.sourceId}: reference is zero, variance not evaluable`)
      continue
    }
    const change = percentage(dec(r.value).minus(ref.value), ref.value)
    const within =
      change !== null && change.abs().lessThanOrEqualTo(input.matrix.varianceTolerancePercent)
    if (!within) allWithin = false
    varianceDetails.push(
      `${r.sourceId}: ${change?.toDecimalPlaces(1).toFixed(1)}% against ${ref.kind}`,
    )
  }

  conditions.push({
    condition: 'variance within tolerance',
    passed: allWithin && input.resources.length > 0,
    detail: varianceDetails.join('; ') || 'no resources to evaluate',
  })

  // Reference available. Where it does not exist the condition FAILS and the month
  // routes to review. Absence of a reference is never treated as a pass (§3.3).
  conditions.push({
    condition: 'reference available',
    passed: !anyReferenceMissing && input.resources.length > 0,
    detail: anyReferenceMissing
      ? 'a variance reference is missing; absence of a reference is never treated as a pass'
      : 'a variance reference exists for every resource',
  })

  const quietPeriodElapsed = input.workingDaysSinceSubmission >= input.matrix.quietPeriodWorkingDays
  const allConditionsHold = conditions.every((c) => c.passed)
  const autoApprove = allConditionsHold && quietPeriodElapsed && !input.reviewerActed

  let reason: string
  if (!allConditionsHold) {
    reason = `routed to review: ${conditions
      .filter((c) => !c.passed)
      .map((c) => c.condition)
      .join(', ')}`
  } else if (input.reviewerActed) {
    reason = 'a reviewer acted during the quiet period'
  } else if (!quietPeriodElapsed) {
    reason = `quiet period not elapsed: ${input.workingDaysSinceSubmission} of ${input.matrix.quietPeriodWorkingDays} working days`
  } else {
    reason = 'every exception condition holds and the quiet period elapsed with no reviewer action'
  }

  return {
    autoApprove,
    conditions,
    varianceReferenceUsed: referenceUsed,
    routeToReview: !autoApprove,
    reason,
  }
}

/**
 * Auto-approved records are visibly distinguished and over-sampled in the assurance
 * sampling plan, on the same basis as non-measured records (§3.3, §19.3).
 */
export const AUTO_APPROVAL_PROVENANCE = 'approved_by_exception' as const

export function assuranceOverSampled(provenance: string, tier: QualityTier): boolean {
  return provenance === AUTO_APPROVAL_PROVENANCE || tier !== 'measured'
}
