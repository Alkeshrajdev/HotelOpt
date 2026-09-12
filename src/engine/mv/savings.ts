/**
 * Measurement & Verification — the two reconciliation obligations — §8.1.1, §8.9, §8.12.
 *
 * These two obligations are routinely conflated, and conflating them "produces the
 * single most damaging M&V error: telling a client their saving is invalid because the
 * bill went up".
 *
 *   Obligation 1 — MEASUREMENT reconciliation. The sum of M&V metering within a billing
 *   boundary must reconcile to that boundary's source of record. It validates that the
 *   meters measure what the invoice measures. Nothing else.
 *
 *   Obligation 2 — SAVINGS determination. Savings are determined against an ADJUSTED
 *   baseline, per IPMVP, and are NOT required to equal the raw change in the
 *   source-of-record quantity.
 *
 * A saving can be real while consumption rises. Occupancy recovers, the summer is
 * hotter, a new outlet opens — any of these can raise consumption by more than the
 * measure saved. The measure still saved what it saved. Requiring the saving to show up
 * as a fall in the bill would make every genuine project in a growing hotel
 * unreportable, and would be wrong.
 */
import { Decimal, dec, percentage, sum } from '../rounding'

/** mv.boundary_reconciliation_tolerance — configurable per methodology version. */
export const BOUNDARY_RECONCILIATION_TOLERANCE_PERCENT = '5'

export type ReconciliationOutcome = 'reconciled' | 'unreconciled'

export interface BoundaryReconciliation {
  readonly difference: string
  readonly differencePercent: string | null
  readonly outcome: ReconciliationOutcome
  /** Published as a quantity and a percentage whether or not it passes (§8.1.1). */
  readonly publication: string
  /** Beyond tolerance, attribution and asset statements are suspended. */
  readonly attributionSuspended: boolean
  /** No L4 saving may be signed off against an unreconciled boundary. */
  readonly l4SignOffPermitted: boolean
}

/**
 * Obligation 1. Validates that the meters measure what the invoice measures — and
 * nothing else. It says nothing about whether a saving occurred.
 */
export function reconcileBoundary(
  mvMeterTotal: Decimal.Value,
  sourceOfRecordQuantity: Decimal.Value,
  tolerancePercent: string = BOUNDARY_RECONCILIATION_TOLERANCE_PERCENT,
): BoundaryReconciliation {
  const difference = dec(mvMeterTotal).minus(sourceOfRecordQuantity)
  const differencePercent = percentage(difference, sourceOfRecordQuantity)
  const within =
    differencePercent === null
      ? difference.isZero()
      : differencePercent.abs().lessThanOrEqualTo(tolerancePercent)

  return {
    difference: difference.toFixed(),
    differencePercent: differencePercent?.toFixed() ?? null,
    outcome: within ? 'reconciled' : 'unreconciled',
    publication: `measurement reconciliation: ${difference.toFixed()} (${
      differencePercent?.toDecimalPlaces(1).toFixed(1) ?? 'n/a'
    }%) against the source of record`,
    attributionSuspended: !within,
    l4SignOffPermitted: within,
  }
}

export type IpmvpOption = 'A' | 'B' | 'C' | 'D'

export interface NonRoutineAdjustment {
  readonly description: string
  readonly quantity: Decimal.Value
  readonly evidenceReference: string
}

export interface SavingsInput {
  /** From the source of record, both periods. */
  readonly baselineYearConsumption: Decimal.Value
  readonly reportingPeriodConsumption: Decimal.Value
  /** The baseline model evaluated at the reporting period's independent variables. */
  readonly baselineModelAtReportingConditions: Decimal.Value
  readonly independentVariables: readonly {
    readonly name: string
    readonly baselineValue: Decimal.Value
    readonly reportingValue: Decimal.Value
  }[]
  readonly nonRoutineAdjustments: readonly NonRoutineAdjustment[]
  readonly option: IpmvpOption
  readonly signatory: string
  readonly reconciliation: BoundaryReconciliation
}

export interface SavingsResult {
  readonly rawChange: string
  readonly routineAdjustment: string
  readonly nonRoutineAdjustment: string
  readonly adjustedBaseline: string
  readonly saving: string
  readonly option: IpmvpOption
  readonly signatory: string
  /**
   * Both truths on one result: a saving alongside a rising bill is correct and expected,
   * and the report renders the arithmetic that makes it so (§8.1.1).
   */
  readonly publishedLines: readonly string[]
  /** A saving that cannot state its adjustments, or whose boundary is unreconciled,
   *  carries no claim (§8.1.1). */
  readonly claimable: boolean
  readonly claimBlockedBecause: string | null
}

export class MvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MvError'
  }
}

/**
 * Obligation 2.
 *
 *   Adjusted baseline = baseline model at the reporting period's independent variables
 *                       ± documented non-routine adjustments
 *   Saving            = adjusted baseline − reporting period consumption
 */
export function determineSaving(input: SavingsInput): SavingsResult {
  if (input.signatory.trim() === '') {
    throw new MvError('an L4 saving records a named individual signatory (§2.8, §8.7)')
  }
  for (const a of input.nonRoutineAdjustments) {
    if (a.evidenceReference.trim() === '') {
      throw new MvError(
        `non-routine adjustment "${a.description}" carries no evidence; each documented static-factor change states its quantity and its evidence (§8.1.1)`,
      )
    }
  }

  const rawChange = dec(input.reportingPeriodConsumption).minus(input.baselineYearConsumption)
  const modelled = dec(input.baselineModelAtReportingConditions)
  // The routine adjustment is the quantity attributable to changes in the independent
  // variables — the difference the model accounts for.
  const routineAdjustment = modelled.minus(input.baselineYearConsumption)
  const nonRoutine = sum(input.nonRoutineAdjustments.map((a) => a.quantity))
  const adjustedBaseline = modelled.plus(nonRoutine)
  const saving = adjustedBaseline.minus(input.reportingPeriodConsumption)

  const claimable = input.reconciliation.l4SignOffPermitted
  const variables = input.independentVariables
    .map((v) => `${v.name} ${dec(v.baselineValue).toFixed()} → ${dec(v.reportingValue).toFixed()}`)
    .join(', ')

  return {
    rawChange: rawChange.toFixed(),
    routineAdjustment: routineAdjustment.toFixed(),
    nonRoutineAdjustment: nonRoutine.toFixed(),
    adjustedBaseline: adjustedBaseline.toFixed(),
    saving: saving.toFixed(),
    option: input.option,
    signatory: input.signatory,
    // The six lines §8.1.1 requires together, so a reader sees both truths at once.
    publishedLines: [
      `Raw change: ${rawChange.toFixed()} against the same period in the baseline year, from the source of record`,
      `Routine adjustment: ${routineAdjustment.toFixed()} attributable to ${variables || 'the independent variables'}`,
      `Non-routine adjustment: ${nonRoutine.toFixed()} from ${input.nonRoutineAdjustments.length} documented static-factor change(s)`,
      `Adjusted baseline: ${adjustedBaseline.toFixed()}`,
      `Saving: ${saving.toFixed()} (IPMVP Option ${input.option}, signed off by ${input.signatory})`,
      input.reconciliation.publication,
    ],
    claimable,
    claimBlockedBecause: claimable
      ? null
      : 'the boundary is unreconciled, so no L4 saving may be signed off against it',
  }
}

// ─── Interval baselines (§8.9) ────────────────────────────────────────────────

export type ModellingInterval = 'monthly' | 'weekly' | 'daily' | 'hourly'

/**
 * Fit thresholds depend on the modelling interval, because scatter does. A single
 * threshold across monthly, weekly, daily and hourly baselines is not defensible:
 * shorter intervals carry more variance for the same building (§8.9).
 */
export const INTERVAL_FIT_THRESHOLDS: Record<
  ModellingInterval,
  { readonly cvRmseMax: number; readonly nmbeAbsMax: number }
> = {
  monthly: { cvRmseMax: 15, nmbeAbsMax: 5 },
  weekly: { cvRmseMax: 20, nmbeAbsMax: 7 },
  daily: { cvRmseMax: 25, nmbeAbsMax: 10 },
  hourly: { cvRmseMax: 30, nmbeAbsMax: 10 },
}

export const MIN_INTERVAL_HISTORY_MONTHS = 6
export const PREFERRED_INTERVAL_HISTORY_MONTHS = 12
export const MAX_INTERVAL_DRIVERS = 5

export interface BaselineGateInput {
  readonly interval: ModellingInterval
  readonly historyMonths: number
  readonly driverCount: number
  readonly cvRmsePercent: number
  readonly nmbePercent: number
  readonly reconciliation: BoundaryReconciliation
  /** Mixing intervals within one baseline is prohibited (§8.9). */
  readonly intervalsPresent: readonly ModellingInterval[]
}

export interface BaselineGateResult {
  readonly passed: boolean
  readonly failures: readonly string[]
  readonly thresholds: { readonly cvRmseMax: number; readonly nmbeAbsMax: number }
}

export function evaluateBaselineGate(input: BaselineGateInput): BaselineGateResult {
  const thresholds = INTERVAL_FIT_THRESHOLDS[input.interval]
  const failures: string[] = []

  if (input.intervalsPresent.length > 1) {
    failures.push(
      `mixing intervals within one baseline is prohibited; found ${input.intervalsPresent.join(', ')}`,
    )
  }
  if (input.historyMonths < MIN_INTERVAL_HISTORY_MONTHS) {
    failures.push(
      `${input.historyMonths} months of continuous interval data is below the minimum of ${MIN_INTERVAL_HISTORY_MONTHS}`,
    )
  }
  if (input.driverCount > MAX_INTERVAL_DRIVERS) {
    failures.push(`${input.driverCount} drivers exceeds the maximum of ${MAX_INTERVAL_DRIVERS}`)
  }
  if (input.cvRmsePercent > thresholds.cvRmseMax) {
    failures.push(
      `CV(RMSE) ${input.cvRmsePercent.toFixed(1)}% exceeds the ${input.interval} threshold of ${thresholds.cvRmseMax}%`,
    )
  }
  if (Math.abs(input.nmbePercent) > thresholds.nmbeAbsMax) {
    failures.push(
      `NMBE ${input.nmbePercent.toFixed(1)}% exceeds the ${input.interval} threshold of ±${thresholds.nmbeAbsMax}%`,
    )
  }
  if (input.reconciliation.outcome === 'unreconciled') {
    failures.push('the baseline period does not reconcile to billed consumption within ±5%')
  }

  return { passed: failures.length === 0, failures, thresholds }
}

// ─── Prohibitions (§8.12) ─────────────────────────────────────────────────────

export const MV_PROHIBITIONS = {
  ai_in_mv: 'AI anywhere in savings determination, baseline fitting, attribution or diagnostics',
  generated_measure_lists:
    'automatically generated conservation measure lists, retrofit proposals or opportunity registers',
  projected_savings:
    'projected, estimated, modelled or indicative savings — savings exist only as L4 outputs under an approved plan',
  payback: 'payback, ROI or business-case figures',
  asset_condemnation: 'any statement that an asset is faulty, inefficient or requires replacement',
  mv_as_kpi: 'presenting an M&V output as a KPI, an inventory figure or a comparison value',
  unreconciled_claim: 'a savings claim that does not reconcile to the billed record',
} as const
export type MvProhibition = keyof typeof MV_PROHIBITIONS

export class MvProhibitionError extends Error {
  constructor(public readonly prohibition: MvProhibition) {
    super(
      `prohibited by §8.12: ${MV_PROHIBITIONS[prohibition]}. The platform reports measured deviation from an asset's own baseline; the conclusion belongs to an engineer.`,
    )
    this.name = 'MvProhibitionError'
  }
}

export function assertMvPermitted(prohibition: MvProhibition): never {
  throw new MvProhibitionError(prohibition)
}

/**
 * M&V outputs never populate a KPI, an inventory figure, a comparison or a Genuine
 * Performance verdict (§8.9, §8.12). Callers tag a value with its origin and this
 * refuses the crossing.
 */
export function assertNotMvOutput(value: { readonly origin: string }, destination: string): void {
  if (value.origin === 'mv') {
    throw new MvProhibitionError('mv_as_kpi')
  }
  void destination
}
