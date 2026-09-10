/**
 * Reading targets under the caller's session, so RLS answers.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { targetProgress } from '@/engine/targets'
import type { TargetDefinition, TrajectoryPoint } from '@/engine/targets'
import { namesOf } from '@/services/entry/ports.supabase'
import { fractionalYear, metricLabel } from './model'
import type { TargetCard, TargetsBlock } from './model'

interface TargetRecord {
  id: string
  scope: string
  portfolio_id: string | null
  hotel_id: string | null
  metric_code: string
  unit: string
  baseline_year: number
  baseline_value: number | string
  base_year_version: string
  target_year: number
  target_value: number | string
  trajectory: string
  boundary_note: string
  factor_basis: string | null
  owner_user_id: string | null
  needs_review: boolean
}

interface SnapshotRecord {
  target_id: string
  as_at: string
  current_value: number | string | null
  base_year_version: string
  suppressed: boolean
  suppression_reason: string | null
}

interface PointRecord {
  target_id: string
  year: number
  expected_value: number | string
}

export async function loadPortfolioTargets(
  supabase: SupabaseClient,
  portfolioId: string,
  hotels: readonly { readonly id: string; readonly name: string }[],
): Promise<TargetsBlock> {
  const hotelIds = hotels.map((h) => h.id)
  const { data, error } = await supabase
    .schema('targets')
    .from('targets')
    .select(
      'id,scope,portfolio_id,hotel_id,metric_code,unit,baseline_year,baseline_value,base_year_version,target_year,target_value,trajectory,boundary_note,factor_basis,owner_user_id,needs_review',
    )
    .eq('status', 'approved')
    .or(
      `portfolio_id.eq.${portfolioId}${hotelIds.length > 0 ? `,hotel_id.in.(${hotelIds.join(',')})` : ''}`,
    )
    .order('metric_code')
  if (error) throw new Error(`targets: ${error.message}`)
  const targets = (data ?? []) as TargetRecord[]
  if (targets.length === 0) return { cards: [] }

  const ids = targets.map((t) => String(t.id))
  const [snapshotsResult, pointsResult, names] = await Promise.all([
    supabase
      .schema('targets')
      .from('progress_snapshots')
      .select('target_id,as_at,current_value,base_year_version,suppressed,suppression_reason')
      .in('target_id', ids)
      .order('as_at', { ascending: false }),
    supabase
      .schema('targets')
      .from('trajectory_points')
      .select('target_id,year,expected_value')
      .in('target_id', ids)
      .order('year'),
    namesOf(
      supabase,
      targets.map((t) => t.owner_user_id),
    ),
  ])

  const latest = new Map<string, SnapshotRecord>()
  for (const s of (snapshotsResult.data ?? []) as SnapshotRecord[]) {
    const key = String(s.target_id)
    if (!latest.has(key)) latest.set(key, s)
  }
  const points = new Map<string, TrajectoryPoint[]>()
  for (const p of (pointsResult.data ?? []) as PointRecord[]) {
    const key = String(p.target_id)
    const list = points.get(key) ?? []
    list.push({ year: Number(p.year), expectedValue: String(p.expected_value) })
    points.set(key, list)
  }
  const hotelName = new Map(hotels.map((h) => [h.id, h.name]))

  const cards: TargetCard[] = targets.map((t) => {
    const id = String(t.id)
    const definition: TargetDefinition = {
      metricCode: String(t.metric_code),
      unit: String(t.unit),
      baselineYear: Number(t.baseline_year),
      baselineValue: String(t.baseline_value),
      targetYear: Number(t.target_year),
      targetValue: String(t.target_value),
      baseYearVersion: String(t.base_year_version),
      boundaryNote: String(t.boundary_note),
      ...(t.factor_basis === null ? {} : { factorBasis: String(t.factor_basis) }),
      ...(t.trajectory === 'supplied_path' ? { trajectory: points.get(id) ?? [] } : {}),
    }
    const snapshot = latest.get(id)
    const reading =
      snapshot && snapshot.current_value !== null
        ? { asAt: String(snapshot.as_at), value: String(snapshot.current_value) }
        : null
    const progress = reading
      ? targetProgress(definition, {
          value: reading.value,
          atYear: fractionalYear(reading.asAt),
          baseYearVersion: String(snapshot!.base_year_version),
          boundaryNote: String(t.boundary_note),
          ...(t.factor_basis === null ? {} : { factorBasis: String(t.factor_basis) }),
        })
      : snapshot && snapshot.suppressed
        ? {
            available: false as const,
            reason: String(snapshot.suppression_reason ?? 'progress suppressed'),
            baseYearVersion: String(snapshot.base_year_version),
          }
        : null
    return {
      id,
      scopeLabel:
        t.scope === 'portfolio' ? 'portfolio' : (hotelName.get(String(t.hotel_id)) ?? 'a property'),
      metricCode: String(t.metric_code),
      metricLabel: metricLabel(String(t.metric_code)),
      unit: String(t.unit),
      baselineYear: Number(t.baseline_year),
      baselineValue: String(t.baseline_value),
      targetYear: Number(t.target_year),
      targetValue: String(t.target_value),
      trajectory: t.trajectory === 'supplied_path' ? 'supplied_path' : 'linear',
      ownerName: t.owner_user_id ? (names.get(String(t.owner_user_id)) ?? null) : null,
      needsReview: Boolean(t.needs_review),
      reading,
      progress,
    }
  })

  return { cards }
}
