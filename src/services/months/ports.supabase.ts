/**
 * Reading the month list under the caller's session, so RLS answers.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadPermissions } from '@/services/entry/ports.supabase'
import type { PeriodStatus } from '@/services/entry/model'
import { inServiceDuring, nextUnopenedMonth, stripFor } from './model'
import type { MonthRow, MonthsModel } from './model'

interface PeriodRecord {
  id: string
  period_start: string
  period_end: string
  status: string
  returned_reason: string | null
  reopened_reason: string | null
  submitted_at: string | null
  approved_at: string | null
}

interface SupplyRecord {
  effective_from: string
  effective_to: string | null
  included: boolean
}

/** Null where the hotel is outside the reader's grants — which is 404, never 403 (§2.5). */
export async function loadMonthsModel(
  supabase: SupabaseClient,
  hotelId: string,
): Promise<MonthsModel | null> {
  const { data: hotel } = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (!hotel) return null

  const [periodsResult, suppliesResult, permitted] = await Promise.all([
    supabase
      .schema('data')
      .from('reporting_periods')
      .select(
        'id,period_start,period_end,status,returned_reason,reopened_reason,submitted_at,approved_at',
      )
      .eq('hotel_id', hotelId)
      .order('period_start', { ascending: false }),
    supabase
      .schema('data')
      .from('resource_sources')
      .select('effective_from,effective_to,included')
      .eq('hotel_id', hotelId),
    loadPermissions(supabase, hotelId),
  ])
  if (periodsResult.error) throw new Error(`months: ${periodsResult.error.message}`)

  const periods = (periodsResult.data ?? []) as PeriodRecord[]
  const supplies = ((suppliesResult.data ?? []) as SupplyRecord[]).filter((s) => s.included)

  // One call per month for the supplies still owed. The function answers empty for a
  // reader who holds neither energy nor water, which the row reports as "not visible"
  // rather than as complete.
  const missing = await Promise.all(
    periods.map((p) =>
      supabase.schema('data').rpc('supplies_without_readings', { p_period_id: p.id }),
    ),
  )

  const rows: MonthRow[] = periods.map((p, i) => {
    const inService = supplies.filter((s) =>
      inServiceDuring(
        { effectiveFrom: s.effective_from, effectiveTo: s.effective_to },
        p.period_start,
        p.period_end,
      ),
    ).length
    const owed = missing[i]?.data
    const completeness =
      owed === null || owed === undefined
        ? null
        : { reported: inService - (owed as unknown[]).length, inService }
    return {
      id: String(p.id),
      month: String(p.period_start).slice(0, 7),
      status: String(p.status) as PeriodStatus,
      reopened: p.reopened_reason !== null && p.reopened_reason !== undefined,
      returnedReason: p.returned_reason ?? null,
      completeness,
      lastMovedAt: p.approved_at ?? p.submitted_at ?? null,
    }
  })

  const mayEnter = permitted.editableCategories.length > 0
  return {
    hotelName: String(hotel.name),
    rows,
    strip: stripFor(rows),
    mayEnter,
    nextMonthToOpen: mayEnter
      ? nextUnopenedMonth(periods.map((p) => String(p.period_start)))
      : null,
  }
}
