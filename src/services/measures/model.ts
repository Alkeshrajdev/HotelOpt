/**
 * Measures — SPEC-03G · G1 and G2. The contracts for `/hotel/:h/measures` and
 * `/hotel/:h/measures/:id`.
 *
 * Two words never meet here: estimated and verified. A saving carries its basis, the
 * register groups by state, and the only figures are the engine's (the strip) and the
 * determinations the database holds as the engine wrote them.
 */
import type { MeasureState, RegisterStrip, SavingBasis } from '@/engine/mv'

export type { MeasureState, SavingBasis }

export type MeasureKind = 'measure' | 'recommendation' | 'ticket'

export const STATUS_LABEL: Record<MeasureState, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  implemented: 'Implemented',
  in_verification: 'In verification',
  verified: 'Verified',
  not_verified: 'Not verified',
  abandoned: 'Abandoned',
}

/** The register's order (G1): what is being measured first, what is done last. */
export const STATUS_ORDER: readonly MeasureState[] = [
  'in_verification',
  'implemented',
  'approved',
  'proposed',
  'verified',
  'not_verified',
  'abandoned',
]

export const KIND_LABEL: Record<MeasureKind, string> = {
  measure: 'Measure',
  recommendation: 'Recommendation',
  ticket: 'Ticket',
}

export const BASIS_LABEL: Record<SavingBasis, string> = {
  estimated: 'Estimated saving',
  verified: 'Verified saving',
  not_verified: 'Not verified',
}

export interface MeasureSaving {
  readonly basis: SavingBasis
  readonly value: string
  readonly unit: string
  readonly signatoryName: string | null
}

export interface MeasureRow {
  readonly id: string
  readonly kind: MeasureKind
  readonly title: string
  readonly resource: string
  readonly resourceLabel: string
  readonly status: MeasureState
  /** YYYY-MM-DD. */
  readonly implementedOn: string | null
  readonly cost: string | null
  readonly costCurrency: string | null
  /** The latest determination, with its basis on it, or null. */
  readonly saving: MeasureSaving | null
}

export interface MeasuresModel {
  readonly hotelId: string
  readonly hotelName: string
  readonly rows: readonly MeasureRow[]
  readonly strip: RegisterStrip
  /** mv:E — the reader may record a measure here. */
  readonly mayEdit: boolean
}

export interface VerificationPlan {
  readonly id: string
  readonly version: number
  readonly ipmvpOption: 'A' | 'B' | 'C' | 'D'
  readonly baselineFrom: string
  readonly baselineTo: string
  /** How many approved months the frozen baseline holds. */
  readonly baselineMonths: number
  readonly routineDrivers: readonly string[]
  readonly nonRoutineCriteria: string
  readonly reportingMonths: number
  readonly measurementBoundary: string
  readonly signatoryName: string
  readonly signatoryRole: string
  readonly failureCriteria: string
  readonly agreedAt: string
  readonly agreedByName: string | null
  readonly supersededAt: string | null
  readonly supersededReason: string | null
}

/** The six published lines and the basis (SPEC-04F §2.2a). */
export interface Determination {
  readonly id: string
  readonly basis: SavingBasis
  readonly reportingFrom: string
  readonly reportingTo: string
  readonly unit: string
  readonly saving: string
  readonly adjustedBaseline: string
  readonly reportingConsumption: string
  readonly reconciliationDifference: string
  readonly reconciliationPercent: string | null
  readonly reconciliationOutcome: 'reconciled' | 'unreconciled'
  readonly publishedLines: readonly string[]
  readonly determinedAt: string
  readonly signedAt: string | null
  readonly signedByName: string | null
}

export interface MeasurePermissions {
  readonly mayEdit: boolean
  /** mv:G, and not the person who recorded the measure. */
  readonly maySign: boolean
}

export interface MeasureModel {
  readonly hotelId: string
  readonly hotelName: string
  readonly measure: MeasureRow & {
    readonly description: string | null
    readonly location: string | null
    readonly recordedAt: string
    readonly recordedByName: string | null
    readonly abandonedReason: string | null
  }
  /** The plan in force, or null. */
  readonly plan: VerificationPlan | null
  /** Earlier plans, newest first, each superseded with its reason. */
  readonly supersededPlans: readonly VerificationPlan[]
  /** Newest first. */
  readonly determinations: readonly Determination[]
  readonly permitted: MeasurePermissions
}

/** G2's "Plan not agreed" state: which parts a plan still lacks, for a form to say so. */
export const PLAN_PARTS: readonly { readonly key: string; readonly label: string }[] = [
  { key: 'option', label: 'IPMVP option' },
  { key: 'baseline', label: 'Baseline period' },
  { key: 'drivers', label: 'Routine adjustments' },
  { key: 'nonRoutine', label: 'Non-routine adjustments' },
  { key: 'reporting', label: 'Reporting period' },
  { key: 'boundary', label: 'Measurement boundary' },
  { key: 'signatory', label: 'Named signatory' },
  { key: 'failure', label: 'What would count as failure' },
]

/** Rows grouped in the register's order, empty groups omitted. */
export function groupByState(
  rows: readonly MeasureRow[],
): readonly { readonly status: MeasureState; readonly rows: readonly MeasureRow[] }[] {
  return STATUS_ORDER.map((status) => ({
    status,
    rows: rows.filter((r) => r.status === status),
  })).filter((g) => g.rows.length > 0)
}

/** The word on the row (G1): estimated or verified, never one for the other. */
export function savingLabel(s: MeasureSaving | null): string {
  if (s === null) return 'no saving stated'
  return BASIS_LABEL[s.basis]
}
