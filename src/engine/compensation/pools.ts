/**
 * Carbon compensation — retirement pools and allocation — §12.2, §11.8, §11.9, CON-04.
 *
 * GOVERNING SEQUENCE: retirement precedes allocation, ALWAYS. A purchase never triggers
 * a retirement. That ordering is what makes every issued certificate backed by a
 * completed registry retirement at the moment of issue, and makes refunds possible
 * without a stranded credit (§12.2).
 *
 * Retire-to-order is modelled as a pool with a single allocation, so one conservation
 * constraint and one integrity export cover both modes and there is no second code path.
 *
 * Conservation carries ZERO TOLERANCE and is evaluated at full stored precision, never
 * at display precision (§23.2, App. C).
 */
import { Decimal, dec, percentage, sum } from '../rounding'

export type RetirementMode = 'retire_to_order' | 'pooled'
export type PoolStatus = 'active' | 'low_balance' | 'exhausted' | 'closed'
export type AllocationStatus = 'allocated' | 'released' | 'superseded'

export interface RetirementPool {
  readonly poolId: string
  readonly mode: RetirementMode
  readonly registry: string
  readonly project: string
  readonly standard: string
  readonly vintage: string
  readonly quantityRetired: Decimal.Value
  /** The registry retirement serial or transaction reference. Not optional (§12.2). */
  readonly retirementReference: string
  readonly retirementDate: string
  readonly evidenceDocumentId: string
  readonly lowBalanceThreshold?: Decimal.Value | undefined
}

export interface Allocation {
  readonly allocationId: string
  readonly poolId: string
  readonly beneficiaryType: 'hotel' | 'portfolio' | 'guest' | 'event' | 'third_party'
  readonly beneficiaryId: string
  readonly period: string
  readonly quantity: Decimal.Value
  readonly status: AllocationStatus
}

export class ConservationError extends Error {
  constructor(
    public readonly poolId: string,
    public readonly requested: string,
    public readonly available: string,
  ) {
    super(
      `allocation of ${requested} against pool ${poolId} exceeds the available balance of ${available}; an allocation that would breach conservation is REJECTED, not queued (§12.2)`,
    )
    this.name = 'ConservationError'
  }
}

export class SequenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SequenceError'
  }
}

export interface PoolBalance {
  readonly poolId: string
  readonly quantityRetired: string
  readonly totalAllocated: string
  readonly totalReleased: string
  readonly balance: string
  readonly status: PoolStatus
  /** Fractional residual is tracked and reported; residuals are never rounded up. */
  readonly fractionalResidual: string
  readonly lowBalanceAlert: string | null
}

export function poolBalance(pool: RetirementPool, allocations: readonly Allocation[]): PoolBalance {
  const live = allocations.filter((a) => a.poolId === pool.poolId && a.status === 'allocated')
  const released = allocations.filter((a) => a.poolId === pool.poolId && a.status === 'released')

  const totalAllocated = sum(live.map((a) => a.quantity))
  const totalReleased = sum(released.map((a) => a.quantity))
  const retired = dec(pool.quantityRetired)
  const balance = retired.minus(totalAllocated)

  const exhausted = balance.lessThanOrEqualTo(0)
  const low =
    pool.lowBalanceThreshold !== undefined && balance.lessThanOrEqualTo(pool.lowBalanceThreshold)

  return {
    poolId: pool.poolId,
    quantityRetired: retired.toFixed(),
    totalAllocated: totalAllocated.toFixed(),
    totalReleased: totalReleased.toFixed(),
    balance: balance.toFixed(),
    status: exhausted ? 'exhausted' : low ? 'low_balance' : 'active',
    // The part of the balance below one whole unit: reported, never rounded up into an
    // allocation (§12.2).
    fractionalResidual: balance.minus(balance.floor()).toFixed(),
    lowBalanceAlert:
      low && !exhausted
        ? `pool ${pool.poolId} has ${balance.toFixed()} remaining and is below its low-balance threshold; replenish before exhaustion`
        : null,
  }
}

export interface AllocationRequest {
  readonly pool: RetirementPool
  readonly existingAllocations: readonly Allocation[]
  readonly quantity: Decimal.Value
  readonly beneficiaryType: Allocation['beneficiaryType']
  readonly beneficiaryId: string
  readonly period: string
  /** The instrument's permitted vintage window (§11.8). */
  readonly vintageWindow: { readonly from: string; readonly to: string }
  /** True where the target period is already approved (§11.8 reallocation rule). */
  readonly periodApproved: boolean
}

/**
 * Allocate against a pool.
 *
 * Conservation is checked at full precision with zero tolerance. An allocation that
 * would breach it is REJECTED, not queued — queueing would leave a purchase apparently
 * accepted with no retired unit behind it.
 */
export function allocate(request: AllocationRequest): Allocation {
  const balance = poolBalance(request.pool, request.existingAllocations)
  const requested = dec(request.quantity)

  if (requested.lessThanOrEqualTo(0)) {
    throw new SequenceError('an allocation quantity is positive')
  }

  // An allocation may not be applied to a period outside the instrument's permitted
  // vintage window (§11.8).
  if (request.period < request.vintageWindow.from || request.period > request.vintageWindow.to) {
    throw new SequenceError(
      `period ${request.period} lies outside the instrument's permitted vintage window ${request.vintageWindow.from}–${request.vintageWindow.to}`,
    )
  }

  // Reallocation is permitted only before the affected period is approved; after
  // approval it requires reopening with a reason (§11.8).
  if (request.periodApproved) {
    throw new SequenceError(
      `period ${request.period} is approved; reallocation requires reopening with a reason (§11.8)`,
    )
  }

  if (requested.greaterThan(dec(balance.balance))) {
    throw new ConservationError(request.pool.poolId, requested.toFixed(), balance.balance)
  }

  return {
    allocationId: `${request.pool.poolId}:${request.beneficiaryId}:${request.period}`,
    poolId: request.pool.poolId,
    beneficiaryType: request.beneficiaryType,
    beneficiaryId: request.beneficiaryId,
    period: request.period,
    quantity: requested.toFixed(),
    status: 'allocated',
  }
}

/**
 * Release a refunded or cancelled allocation.
 *
 * The quantity returns to the pool. THE UNDERLYING REGISTRY RETIREMENT IS UNAFFECTED —
 * it has already occurred and remains valid (§12.2). That is the point of retiring
 * before allocating.
 */
export function release(allocation: Allocation): {
  readonly allocation: Allocation
  readonly registryRetirementAffected: false
  readonly note: string
} {
  return {
    allocation: { ...allocation, status: 'released' },
    registryRetirementAffected: false,
    note: 'the quantity returns to the pool; the underlying registry retirement has already occurred and remains valid',
  }
}

/**
 * The purchase surface stops accepting purchases for a project when its pool is
 * exhausted, rather than over-allocating (§12.2).
 */
export function purchaseSurfaceOpen(
  balance: PoolBalance,
  requested: Decimal.Value,
): {
  readonly open: boolean
  readonly reason: string
} {
  if (balance.status === 'exhausted') {
    return {
      open: false,
      reason:
        'the pool for this project is exhausted; purchases are closed rather than over-allocated',
    }
  }
  if (dec(requested).greaterThan(dec(balance.balance))) {
    return {
      open: false,
      reason: `only ${balance.balance} remains in this pool; the purchase is refused rather than over-allocated`,
    }
  }
  return { open: true, reason: 'sufficient retired quantity remains' }
}

/** Pool integrity report, exportable for assurance (§12.2). */
export interface PoolIntegrityReport {
  readonly balance: PoolBalance
  readonly ledger: readonly Allocation[]
  /** Recomputed Σ allocations against the counter. Any divergence is a P1 (§23.2). */
  readonly reconciles: boolean
  readonly retirementReference: string
}

export function poolIntegrityReport(
  pool: RetirementPool,
  allocations: readonly Allocation[],
  denormalisedCounter: Decimal.Value,
): PoolIntegrityReport {
  const balance = poolBalance(pool, allocations)
  return {
    balance,
    ledger: allocations.filter((a) => a.poolId === pool.poolId),
    // Evaluated at full stored precision, never at display precision. Zero tolerance.
    reconciles: dec(balance.totalAllocated).equals(dec(denormalisedCounter)),
    retirementReference: pool.retirementReference,
  }
}

// ─── Renewable electricity coverage (§11.9) ───────────────────────────────────

export interface CoverageInput {
  /** G — grid import. */
  readonly gridImport: Decimal.Value
  /** S — all self-consumed generation, attributes retained or not. */
  readonly selfConsumed: Decimal.Value
  /** The part of S whose attributes were retained. */
  readonly selfConsumedRetained: Decimal.Value
  /** Eligible retired electricity certificates allocated to this hotel and period. */
  readonly certificatesAllocated: Decimal.Value
}

export interface CoverageResult {
  readonly coveragePercent: string
  /** The two numerator components are ALWAYS displayed separately as well as combined. */
  readonly fromRetainedGeneration: string
  readonly fromCertificates: string
  readonly denominator: string
  readonly attributesSoldExcluded: string
  readonly disclosure: string | null
}

export class CoverageCeilingError extends Error {
  constructor(computed: string) {
    super(
      `renewable coverage computed to ${computed}%, which exceeds 100% and is therefore a double count; the calculation blocks (§11.9)`,
    )
    this.name = 'CoverageCeilingError'
  }
}

/**
 * Renewable electricity coverage.
 *
 * The denominator is T, NOT G. Using purchased electricity as the denominator while
 * counting self-consumed generation in the numerator can return more than 100%, which is
 * arithmetically impossible and immediately destroys the figure's credibility (§11.9).
 *
 * Generation whose attributes were sold is excluded from the numerator but REMAINS in
 * the denominator, which correctly reduces coverage — the accurate consequence of
 * having sold the attributes.
 */
export function renewableCoverage(input: CoverageInput): CoverageResult {
  const G = dec(input.gridImport)
  const S = dec(input.selfConsumed)
  const T = G.plus(S)
  const retained = dec(input.selfConsumedRetained)
  const sold = S.minus(retained)

  // C_allocated ≤ G: certificates cannot cover electricity that was not purchased.
  const certificates = Decimal.min(dec(input.certificatesAllocated), G)

  const numerator = retained.plus(certificates)
  const coverage = percentage(numerator, T)

  if (coverage !== null && coverage.greaterThan(100)) {
    throw new CoverageCeilingError(coverage.toFixed())
  }

  return {
    coveragePercent: coverage?.toFixed() ?? '0',
    fromRetainedGeneration: retained.toFixed(),
    fromCertificates: certificates.toFixed(),
    denominator: T.toFixed(),
    attributesSoldExcluded: sold.toFixed(),
    disclosure: sold.greaterThan(0)
      ? `${sold.toFixed()} of self-consumed generation had its attributes sold; it is excluded from the numerator and remains in the denominator, which reduces coverage`
      : null,
  }
}
