/**
 * Targets on the portfolio dashboard — SPEC-03B · B1 (Targets), SPEC-04F §1.
 *
 * A target is a person's decision, stored; its progress is the engine's, derived from the
 * latest reading retained for it. One formula, direction-aware, never clamped, and
 * suppressed with the mismatch named where baseline and current are not on the same basis.
 * No combined score (C-01).
 */
import type { Progress } from '@/engine/targets'

export interface TargetCard {
  readonly id: string
  /** 'portfolio' or the hotel's name. */
  readonly scopeLabel: string
  readonly metricCode: string
  readonly metricLabel: string
  readonly unit: string
  readonly baselineYear: number
  readonly baselineValue: string
  readonly targetYear: number
  readonly targetValue: string
  readonly trajectory: 'linear' | 'supplied_path'
  readonly ownerName: string | null
  readonly needsReview: boolean
  /** The reading the progress is measured from, or null where none has been retained. */
  readonly reading: { readonly asAt: string; readonly value: string } | null
  /** The engine's progress, or null where there is no reading. */
  readonly progress: Progress | null
}

export interface TargetsBlock {
  readonly cards: readonly TargetCard[]
}

export const METRIC_LABEL: Record<string, string> = {
  energy_intensity: 'Energy intensity',
  water_intensity: 'Water intensity',
  waste_generation: 'Waste generation',
  material_recovery: 'Material recovery rate',
  landfill_diversion: 'Landfill diversion rate',
  carbon_intensity: 'Carbon intensity',
  absolute_emissions: 'Absolute emissions',
  renewable_coverage: 'Renewable electricity coverage',
  cost: 'Cost',
}

export function metricLabel(code: string): string {
  return METRIC_LABEL[code] ?? code
}

/** A date as a fractional year for the trajectory: 2026-07-01 is 2026.5. */
export function fractionalYear(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  const day = Number(isoDate.slice(8, 10))
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  const at = Date.UTC(year, month - 1, day)
  return year + (at - start) / (end - start)
}
