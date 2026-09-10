/**
 * Data checks that require history — §6.3.
 *
 * Every check is either a HARD BLOCK — the record cannot be saved or submitted — or a
 * SOFT WARNING requiring explicit acknowledgement that is recorded with the
 * acknowledging user. No check is silent.
 *
 * The row-local checks (activity validation, unit validity, method required, billing
 * overlap) live with the activity engine and in the database. The checks here need the
 * source's own history, so they sit between the two.
 *
 * Configured thresholds and their defaults are consolidated in Appendix J.
 */
import { Decimal, dec, percentage, sum } from '../rounding'
import type { Finding } from '../activity'

export const CHECK_DEFAULTS = {
  /** data.mom_warning_threshold */
  monthOnMonth: '30',
  /** data.yoy_warning_threshold */
  yearOnYear: '30',
  /** waste.reconciliation_tolerance */
  wasteReconciliation: '2',
} as const

export interface HistoricalValue {
  /** YYYY-MM. */
  readonly month: string
  readonly value: Decimal.Value
}

export interface CandidateRecord {
  readonly month: string
  readonly sourceId: string
  readonly value: Decimal.Value
  readonly cost?: Decimal.Value | null | undefined
  /** For a cumulative register: the read this record is derived from. */
  readonly registerRead?: Decimal.Value | undefined
  readonly contentHash?: string | undefined
}

export interface CheckContext {
  /** Approved history for this source, any order. */
  readonly history: readonly HistoricalValue[]
  /** Previous cumulative register read, where the source has one. */
  readonly previousRegisterRead?: Decimal.Value | undefined
  /** Content hashes already ingested for this source, for duplicate detection. */
  readonly ingestedHashes?: readonly string[] | undefined
  readonly momThresholdPercent?: string | undefined
  readonly yoyThresholdPercent?: string | undefined
}

const soft = (code: string, message: string): Finding => ({
  code,
  type: 'soft_warning',
  message,
  requiresAcknowledgement: true,
})

const hard = (code: string, message: string): Finding => ({
  code,
  type: 'hard_block',
  message,
  requiresAcknowledgement: false,
})

function priorMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number) as [number, number]
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function sameMonthPriorYear(yyyymm: string): string {
  const [y, m] = yyyymm.split('-') as [string, string]
  return `${Number(y) - 1}-${m}`
}

function find(history: readonly HistoricalValue[], month: string): Decimal | null {
  const hit = history.find((h) => h.month === month)
  return hit ? dec(hit.value) : null
}

function driftExceeds(current: Decimal, reference: Decimal, thresholdPercent: string): boolean {
  if (reference.isZero()) return false
  const change = percentage(current.minus(reference), reference)
  return change !== null && change.abs().greaterThan(thresholdPercent)
}

/**
 * Run every history-dependent check against a candidate record.
 *
 * Returns findings, never a mutation. The caller blocks on any hard finding and
 * requires an acknowledgement for each soft one.
 */
export function runHistoryChecks(record: CandidateRecord, ctx: CheckContext): readonly Finding[] {
  const findings: Finding[] = []
  const value = dec(record.value)

  // Duplicate OCR, API or Excel record: hard block, presented for resolution.
  // Never silently overwritten (§6.3).
  if (record.contentHash !== undefined && ctx.ingestedHashes?.includes(record.contentHash)) {
    findings.push(
      hard(
        'CHK-DUP',
        'this record has already been ingested for this source; resolve the duplicate rather than overwriting',
      ),
    )
  }

  // Month-on-month change, evaluated per source.
  const prior = find(ctx.history, priorMonth(record.month))
  const momThreshold = ctx.momThresholdPercent ?? CHECK_DEFAULTS.monthOnMonth
  if (prior !== null && driftExceeds(value, prior, momThreshold)) {
    const change = percentage(value.minus(prior), prior)
    findings.push(
      soft(
        'CHK-MOM',
        `month-on-month change of ${change?.toDecimalPlaces(1).toFixed(1)}% exceeds ±${momThreshold}%`,
      ),
    )
  }

  // Same-month prior-year change, where a prior-year value exists.
  const lastYear = find(ctx.history, sameMonthPriorYear(record.month))
  const yoyThreshold = ctx.yoyThresholdPercent ?? CHECK_DEFAULTS.yearOnYear
  if (lastYear !== null && driftExceeds(value, lastYear, yoyThreshold)) {
    const change = percentage(value.minus(lastYear), lastYear)
    findings.push(
      soft(
        'CHK-YOY',
        `change of ${change?.toDecimalPlaces(1).toFixed(1)}% against the same month last year exceeds ±${yoyThreshold}%`,
      ),
    )
  }

  // A zero on a source that has never previously read zero. Catches a missing bill
  // entered as zero — the single most common data-entry defect in monthly utility
  // reporting. A zero is never accepted silently (§6.3).
  if (value.isZero() && ctx.history.length > 0 && !ctx.history.some((h) => dec(h.value).isZero())) {
    findings.push(
      soft(
        'CHK-ZERO',
        'this source has never previously read zero; confirm the reading rather than a missing bill entered as zero',
      ),
    )
  }

  // Consumption without cost, or cost without consumption. Both are legitimate; the
  // warning prevents a silently unusable effective rate (§10.3).
  const hasCost = record.cost !== undefined && record.cost !== null
  if (!value.isZero() && !hasCost) {
    findings.push(
      soft(
        'CHK-NOCOST',
        'consumption is present with no cost: the effective rate cannot be computed',
      ),
    )
  }
  if (hasCost && !dec(record.cost as Decimal.Value).isZero() && value.isZero()) {
    findings.push(
      soft(
        'CHK-NOCONS',
        'cost is present with no consumption: the effective rate cannot be computed',
      ),
    )
  }

  // A cumulative-register read below its predecessor, routed to rollover handling.
  if (record.registerRead !== undefined && ctx.previousRegisterRead !== undefined) {
    if (dec(record.registerRead).lessThan(dec(ctx.previousRegisterRead))) {
      findings.push(
        soft(
          'CHK-ROLLOVER',
          'the register read is below its predecessor: confirm a meter rollover or a meter replacement',
        ),
      )
    }
  }

  return findings
}

/**
 * Waste stream reconciliation — Σ streams against a stated total, tolerance ±2%.
 *
 * The residual is displayed as its own line and is never absorbed into a stream (§6.3).
 */
export interface WasteReconciliation {
  readonly streamTotal: string
  readonly statedTotal: string
  readonly residual: string
  readonly residualPercent: string | null
  readonly withinTolerance: boolean
  readonly finding: Finding | null
}

export function reconcileWaste(
  streams: readonly Decimal.Value[],
  statedTotal: Decimal.Value,
  tolerancePercent: string = CHECK_DEFAULTS.wasteReconciliation,
): WasteReconciliation {
  const streamTotal = sum(streams)
  const stated = dec(statedTotal)
  const residual = stated.minus(streamTotal)
  const residualPercent = percentage(residual, stated)
  const within =
    residualPercent === null
      ? residual.isZero()
      : residualPercent.abs().lessThanOrEqualTo(tolerancePercent)

  return {
    streamTotal: streamTotal.toFixed(),
    statedTotal: stated.toFixed(),
    // Shown as its own line, never absorbed into a stream.
    residual: residual.toFixed(),
    residualPercent: residualPercent?.toFixed() ?? null,
    withinTolerance: within,
    finding: within
      ? null
      : soft(
          'CHK-WASTE-RECON',
          `waste streams total ${streamTotal.toFixed()} against a stated ${stated.toFixed()}: a residual of ${residual.toFixed()} exceeds ±${tolerancePercent}% and is shown as its own line`,
        ),
  }
}

/** True where any finding blocks the save or the submission. */
export function blocks(findings: readonly Finding[]): boolean {
  return findings.some((f) => f.type === 'hard_block')
}

/** Soft findings that must each carry a recorded acknowledgement before submission. */
export function requiresAcknowledgement(findings: readonly Finding[]): readonly Finding[] {
  return findings.filter((f) => f.requiresAcknowledgement)
}
