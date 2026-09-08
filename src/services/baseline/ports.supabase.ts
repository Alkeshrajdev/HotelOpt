/**
 * Reading the baseline validation model under the caller's session.
 *
 * The months come from the same port the overview's model reads (every month, including
 * the ones a model may not use); the screening comes from engine/gp; the window and the
 * annotations come from the gp schema. Nothing is computed here.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { screenWindow } from '@/engine/gp'
import { namesOf } from '@/services/entry/ports.supabase'
import { supabaseOverviewPorts } from '@/services/overview/ports.supabase'
import { resolveLocale } from '@/i18n'
import { driverLimitFor, proposedWindow } from './model'
import type { Annotation, BaselineValidationModel, ModelledResource, WindowRow } from './model'

interface WindowRecord {
  window_from: string
  window_to: string
  confirmed_by: string | null
  confirmed_at: string | null
  cleared_at: string | null
  cleared_reason: string | null
}

interface AnnotationRecord {
  month: string
  kind: string
  reason: string | null
  source_person: string | null
  source_date: string | null
  source_where: string | null
  annotated_by: string
  annotated_at: string
}

const UNIT: Record<ModelledResource, string> = { energy: 'kWh', water: 'm3', waste: 'kg' }

export async function loadBaselineModel(
  supabase: SupabaseClient,
  hotelId: string,
  resource: ModelledResource,
): Promise<BaselineValidationModel | null> {
  const { data: hotel } = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (!hotel) return null

  const ports = supabaseOverviewPorts(supabase, resolveLocale(null))
  const [history, windowResult, annotationsResult, actions] = await Promise.all([
    // Waste modelling reads the waste register, which is not yet wired into the model's
    // history; the screen says so rather than presenting energy months as waste.
    resource === 'waste' ? Promise.resolve([]) : ports.modelHistory(hotelId, resource),
    supabase
      .schema('gp')
      .from('training_windows')
      .select('window_from,window_to,confirmed_by,confirmed_at,cleared_at,cleared_reason')
      .eq('hotel_id', hotelId)
      .eq('resource', resource)
      .maybeSingle(),
    supabase
      .schema('gp')
      .from('window_annotations')
      .select('month,kind,reason,source_person,source_date,source_where,annotated_by,annotated_at')
      .eq('hotel_id', hotelId)
      .eq('resource', resource),
    supabase.schema('access').rpc('my_actions', { p_hotel_id: hotelId }),
  ])

  const window = windowResult.data as WindowRecord | null
  const annotations = (annotationsResult.data ?? []) as AnnotationRecord[]
  const names = await namesOf(supabase, [
    window?.confirmed_by,
    ...annotations.map((a) => a.annotated_by),
  ])
  const held = new Set(
    ((actions.data ?? []) as { module: string; action: string }[]).map(
      (r) => `${r.module}:${r.action}`,
    ),
  )

  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month))
  const approvedMonths = sorted.filter((m) => m.approved).map((m) => m.month)
  const proposal = proposedWindow(approvedMonths)
  const range = window
    ? { from: String(window.window_from), to: String(window.window_to), proposed: false }
    : proposal
      ? { ...proposal, proposed: true }
      : { from: '', to: '', proposed: true }

  const inWindow = (month: string) =>
    range.from !== '' && month >= range.from.slice(0, 7) && month < range.to.slice(0, 7)

  // The screen: on the approved months inside the window, with the drivers the model
  // would use. Unflagged months come back too.
  const screened = sorted.filter((m) => m.approved && inWindow(m.month))
  const driverLabels = ['occupied room nights', 'cooling degree days']
  const screening = screenWindow(
    screened.map((m) => ({
      month: m.month,
      value: m.value,
      drivers: [m.occupiedRoomNights, m.coolingDegreeDays],
    })),
    driverLabels,
    UNIT[resource],
  )
  const flagByMonth = new Map(screening.rows.map((r) => [r.month, r.flag]))

  const annotationByMonth = new Map<string, Annotation>(
    annotations.map((a) => [
      String(a.month).slice(0, 7),
      {
        kind: String(a.kind) as Annotation['kind'],
        reason: a.reason,
        sourcePerson: a.source_person,
        sourceDate: a.source_date,
        sourceWhere: a.source_where,
        annotatedByName: names.get(String(a.annotated_by)) ?? null,
        annotatedAt: String(a.annotated_at),
      },
    ]),
  )

  const rows: WindowRow[] = sorted.map((m) => ({
    month: m.month,
    approved: m.approved,
    actual: String(m.value),
    tier: m.tier,
    drivers: [
      {
        label: 'occupied room nights',
        value: m.occupiedRoomNights === null ? null : String(m.occupiedRoomNights),
      },
      {
        label: 'cooling degree days',
        value: m.coolingDegreeDays === null ? null : String(m.coolingDegreeDays),
      },
    ],
    flag: flagByMonth.get(m.month) ?? null,
    annotation: annotationByMonth.get(m.month) ?? null,
    inWindow: inWindow(m.month),
  }))

  const excludedCount = rows.filter(
    (r) => r.inWindow && (r.annotation?.kind === 'exclude' || r.annotation?.kind === 'step_change'),
  ).length
  const indicatorCount = rows.filter((r) => r.inWindow && r.annotation?.kind === 'indicator').length
  const approvedInWindow = rows.filter((r) => r.inWindow && r.approved).length - excludedCount

  return {
    hotelId,
    hotelName: String(hotel.name),
    resource,
    unit: UNIT[resource],
    window: range,
    monthsAvailable: approvedMonths.length,
    monthsRequired: 12,
    driverLimitIfConfirmed: driverLimitFor(approvedInWindow),
    rows,
    excludedCount,
    indicatorCount,
    confirmation:
      window && window.confirmed_at
        ? {
            byName: names.get(String(window.confirmed_by)) ?? null,
            at: String(window.confirmed_at),
          }
        : null,
    cleared:
      window && window.cleared_at
        ? { at: String(window.cleared_at), reason: String(window.cleared_reason ?? '') }
        : null,
    mayConfirm: held.has('performance:C'),
  }
}

/** The window state the performance tiers need, for one hotel and resource. */
export async function loadWindowState(
  supabase: SupabaseClient,
  hotelId: string,
  resource: ModelledResource,
): Promise<{
  readonly from: string | null
  readonly to: string | null
  readonly confirmed: boolean
  readonly excludedMonths: readonly string[]
  readonly stepChangeFrom: string | null
}> {
  const [windowResult, annotationsResult] = await Promise.all([
    supabase
      .schema('gp')
      .from('training_windows')
      .select('window_from,window_to,confirmed_at')
      .eq('hotel_id', hotelId)
      .eq('resource', resource)
      .maybeSingle(),
    supabase
      .schema('gp')
      .from('window_annotations')
      .select('month,kind')
      .eq('hotel_id', hotelId)
      .eq('resource', resource),
  ])
  const w = windowResult.data as {
    window_from: string
    window_to: string
    confirmed_at: string | null
  } | null
  const annotations = (annotationsResult.data ?? []) as { month: string; kind: string }[]
  const steps = annotations
    .filter((a) => a.kind === 'step_change')
    .map((a) => String(a.month))
    .sort()
  return {
    from: w ? String(w.window_from) : null,
    to: w ? String(w.window_to) : null,
    confirmed: w !== null && w.confirmed_at !== null,
    excludedMonths: annotations
      .filter((a) => a.kind === 'exclude')
      .map((a) => String(a.month).slice(0, 7)),
    stepChangeFrom: steps.length > 0 ? (steps[steps.length - 1] as string) : null,
  }
}
