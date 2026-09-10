/**
 * The measures register's strip — SPEC-03G · G1 block 3.
 *
 * implemented · in verification · verified saving to date · estimated saving in flight.
 * Two counts and two sums, and the sums are the reason this lives in the engine: the
 * "verified saving to date" is the most quoted number this product will produce (G1 traps),
 * and it must include verified savings only. An estimate summed into it is H-06 broken by
 * a reduce() at a call site.
 *
 * Savings are summed per unit and never across units: 24,500 kWh and 1,200 m³ do not add.
 */
import { Decimal, dec } from '../rounding'

export type MeasureState =
  | 'proposed'
  | 'approved'
  | 'implemented'
  | 'in_verification'
  | 'verified'
  | 'not_verified'
  | 'abandoned'

export type SavingBasis = 'estimated' | 'verified' | 'not_verified'

export interface RegisterMeasure {
  readonly status: MeasureState
  /** The latest determination on the measure, or null. */
  readonly saving: {
    readonly basis: SavingBasis
    readonly value: string
    readonly unit: string
  } | null
}

export interface SavingByUnit {
  readonly unit: string
  readonly value: string
  readonly measures: number
}

export interface RegisterStrip {
  readonly implemented: number
  readonly inVerification: number
  /** Signed, verified savings only (H-06). Empty where none is verified. */
  readonly verifiedToDate: readonly SavingByUnit[]
  /** Estimates on measures still in verification, labelled as estimates. */
  readonly estimatedInFlight: readonly SavingByUnit[]
}

function sumByUnit(
  items: readonly { readonly value: string; readonly unit: string }[],
): SavingByUnit[] {
  const totals = new Map<string, { total: Decimal; measures: number }>()
  for (const item of items) {
    const entry = totals.get(item.unit) ?? { total: new Decimal(0), measures: 0 }
    entry.total = entry.total.plus(dec(item.value))
    entry.measures += 1
    totals.set(item.unit, entry)
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([unit, t]) => ({ unit, value: t.total.toFixed(), measures: t.measures }))
}

export function registerStrip(measures: readonly RegisterMeasure[]): RegisterStrip {
  const verified = measures
    .filter((m) => m.status === 'verified' && m.saving?.basis === 'verified')
    .map((m) => m.saving as { value: string; unit: string })
  const estimated = measures
    .filter((m) => m.status === 'in_verification' && m.saving?.basis === 'estimated')
    .map((m) => m.saving as { value: string; unit: string })
  return {
    implemented: measures.filter(
      (m) => m.status === 'implemented' || m.status === 'in_verification',
    ).length,
    inVerification: measures.filter((m) => m.status === 'in_verification').length,
    verifiedToDate: sumByUnit(verified),
    estimatedInFlight: sumByUnit(estimated),
  }
}
