/**
 * The pillar views — SPEC-03F. One shell, the view types, four pillars.
 *
 * The tier comes from the engine with the result and every view states it; no view infers
 * it for itself. Tier B never uses the words "Genuine Performance" and never draws a band.
 */
import type { Decomposition, DriftState, NormalisedSeries, VerdictResult } from '@/engine/gp'
import type { CarbonCard } from '@/services/overview/carbon'
import type { CardState } from '@/services/overview/cards'
import type { DeclaredPlaceholder } from '@/services/overview/model'
import type { TrendSeries } from '@/services/overview/trend'

export type Pillar = 'energy' | 'water' | 'waste' | 'carbon'
export const PILLARS: readonly Pillar[] = ['energy', 'water', 'waste', 'carbon']
export const PILLAR_LABEL: Record<Pillar, string> = {
  energy: 'Energy',
  water: 'Water',
  waste: 'Waste',
  carbon: 'Carbon',
}
export function isPillar(value: string): value is Pillar {
  return (PILLARS as readonly string[]).includes(value)
}

export type PillarView = 'overview' | 'detail' | 'genuine' | 'comparison' | 'external'
export const VIEW_LABEL: Record<PillarView, string> = {
  overview: 'Overview',
  detail: 'Performance',
  genuine: 'Genuine Performance',
  comparison: 'Benchmarks',
  external: 'External',
}

/** Where a property sits (SPEC-04B §3.4), and why, in words. Null for carbon (§4.2). */
export interface TierStatement {
  readonly tier: 'A' | 'B' | 'C'
  readonly reason: string | null
}

export interface PeriodRef {
  readonly id: string
  readonly month: string
}

export interface PillarShell {
  readonly hotelId: string
  readonly hotelName: string
  readonly pillar: Pillar
  readonly period: PeriodRef
  /** Newest first. */
  readonly periods: readonly PeriodRef[]
  readonly tier: TierStatement | null
}

export interface SupplyLine {
  readonly resource: string
  readonly label: string
  readonly unit: string
  readonly value: string | null
  readonly priorYear: string | null
  /** The engine's change, or null where either side is missing. */
  readonly changePercent: string | null
}

/** F1. */
export interface PillarOverview extends PillarShell {
  readonly card: CardState | CarbonCard | DeclaredPlaceholder
  readonly cost: { readonly value: string; readonly currency: string } | null
  readonly trend: TrendSeries | DeclaredPlaceholder
  /** Breakdown by supply: what property-level measurement can show (D-06 dropped). */
  readonly supplies: readonly SupplyLine[]
  /** Tier B: the normalised series beside actual, month count stated. */
  readonly normalised: NormalisedSeries | null
}

/** F3. */
export interface GenuineModel extends PillarShell {
  readonly comparisonMonth: string | null
  readonly unit: string
  readonly actual: string | null
  readonly priorActual: string | null
  /** Tier A only. */
  readonly verdict: VerdictResult | null
  readonly basis: string | null
  readonly trainingMonths: number | null
  readonly decomposition:
    | {
        readonly available: true
        readonly value: Decomposition
        readonly points: DecompositionPoints | null
      }
    | { readonly available: false; readonly because: string }
  readonly drift: DriftState | null
  /** The engine's sentence, or the reason there is none. */
  readonly headline: string
  readonly unavailableBecause: string | null
  readonly normalised: NormalisedSeries | null
  readonly progress: readonly string[]
}

export interface DecompositionPoints {
  readonly actualChangePercent: string
  readonly byGroupPoints: Readonly<Record<string, string>>
  readonly genuinePoints: string
}

/** F2. */
export interface DetailModel extends PillarShell {
  readonly unit: string
  readonly trend: TrendSeries | DeclaredPlaceholder
  readonly supplies: readonly SupplyLine[]
  /** The record behind it: each month's approved figure, linking to the month (D-10). */
  readonly months: readonly {
    readonly periodId: string
    readonly month: string
    readonly status: string
    readonly value: string | null
    readonly tier: 'measured' | 'estimated' | 'proxy' | null
  }[]
}

export const GROUP_LABEL: Record<string, string> = {
  weather: 'Weather',
  occupancy: 'Occupancy',
  activity: 'Activity',
  events: 'Events',
}

export function tierSentence(t: TierStatement | null, pillar: Pillar): string {
  if (t === null)
    return pillar === 'carbon'
      ? 'Carbon carries no Genuine Performance verdict: it moves when the hotel uses less and when the grid gets cleaner, and the two are not comparable.'
      : ''
  if (t.tier === 'A')
    return 'Tier A: Genuine Performance — expected value, range, verdict and decomposition.'
  if (t.tier === 'B')
    return `Tier B: normalised trend, as a direction of travel. No verdict and no expected range${t.reason ? ` — ${t.reason}` : ''}.`
  return `Tier C: actuals only${t.reason ? ` — ${t.reason}` : ''}.`
}
