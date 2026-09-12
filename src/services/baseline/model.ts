/**
 * Baseline validation — SPEC-03C · C6. The contract for `/operator/hotel/:h/baseline`.
 *
 * Which of these months should the model treat as normal? The engine flags; Farnek
 * annotates each flagged month with a reason and its source, sets the window, and confirms
 * it. Every row is here, flagged or not, because an abnormal year can be smoothly abnormal.
 */
import type { ModelledResource } from '@/services/performance/tiers'

export type { ModelledResource }

export type Treatment = 'exclude' | 'step_change' | 'indicator'

export interface Annotation {
  readonly kind: 'normal' | Treatment
  readonly reason: string | null
  readonly sourcePerson: string | null
  readonly sourceDate: string | null
  readonly sourceWhere: string | null
  readonly annotatedByName: string | null
  readonly annotatedAt: string
}

export interface WindowRow {
  /** YYYY-MM. */
  readonly month: string
  readonly approved: boolean
  readonly actual: string | null
  readonly tier: 'measured' | 'estimated' | 'proxy' | null
  readonly drivers: readonly { readonly label: string; readonly value: string | null }[]
  /** The engine's question about this month, in its own units — never a residual figure. */
  readonly flag: { readonly reasonInUnits: string } | null
  readonly annotation: Annotation | null
  /** True where the month is inside the window as set or proposed. */
  readonly inWindow: boolean
}

export interface BaselineValidationModel {
  readonly hotelId: string
  readonly hotelName: string
  readonly resource: ModelledResource
  readonly unit: string
  /** The window as set, or the engine's rolling proposal where none is set. */
  readonly window: { readonly from: string; readonly to: string; readonly proposed: boolean }
  readonly monthsAvailable: number
  readonly monthsRequired: 12
  readonly driverLimitIfConfirmed: 2 | 3
  readonly rows: readonly WindowRow[]
  readonly excludedCount: number
  readonly indicatorCount: number
  readonly confirmation: { readonly byName: string | null; readonly at: string } | null
  readonly cleared: { readonly at: string; readonly reason: string } | null
  readonly mayConfirm: boolean
}

export const RESOURCE_LABEL: Record<ModelledResource, string> = {
  energy: 'Energy',
  water: 'Water',
  waste: 'Waste',
}

export const TREATMENT_LABEL: Record<Annotation['kind'], string> = {
  normal: 'Normal',
  exclude: 'Excluded',
  step_change: 'Step change from here',
  indicator: 'Indicator term',
}

/** The driver limit the window supports: two at twelve months, three at twenty-four (§3.1b). */
export function driverLimitFor(approvedMonthsInWindow: number): 2 | 3 {
  return approvedMonthsInWindow >= 24 ? 3 : 2
}

/** The month after a YYYY-MM, as YYYY-MM-01. */
export function monthAfter(month: string): string {
  const d = new Date(`${month}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

/** The rolling proposal: the 24 months ending at the newest approved one. */
export function proposedWindow(
  approvedMonths: readonly string[],
): { readonly from: string; readonly to: string } | null {
  if (approvedMonths.length === 0) return null
  const sorted = [...approvedMonths].sort()
  const newest = sorted[sorted.length - 1]!
  const to = monthAfter(newest)
  const start = new Date(`${to}T00:00:00Z`)
  start.setUTCMonth(start.getUTCMonth() - 24)
  return { from: start.toISOString().slice(0, 10), to }
}
