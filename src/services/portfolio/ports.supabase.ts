/**
 * Reading one month of a portfolio, under the caller's own session.
 *
 * RLS answers every query, so "the hotels in this portfolio" is the set the reader may
 * see. That matters more here than on a single-hotel page: a coverage statement reading
 * "9 of 10 hotels" would be wrong for a reader who holds nine, and right for one who holds
 * ten. The count is therefore of what the reader can see, and the statement says so by
 * being about hotels rather than about the portfolio's true size.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortfolioMonth } from './model'
import { dec } from '@/engine/rounding'
import { firstEmbedded } from '@/services/api/embed'
import type { HotelMonthInput } from './model'

const ENERGY = new Set([
  'grid_electricity',
  'district_cooling',
  'purchased_heat',
  'purchased_steam',
  'piped_gas',
  'delivered_diesel',
  'delivered_lpg',
  'delivered_other',
])
const WATER = new Set([
  'water_municipal',
  'water_tse',
  'water_groundwater',
  'water_desalinated',
  'water_tankered',
  'water_cooling_makeup',
])

export interface PortfolioSummary {
  readonly id: string
  readonly name: string
}

export async function loadPortfolios(
  supabase: SupabaseClient,
): Promise<readonly PortfolioSummary[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('portfolios')
    .select('id,name')
    .order('name')
  if (error) throw new Error(`portfolio.list: ${error.message}`)
  return (data ?? []).map((p) => ({ id: String(p.id), name: String(p.name) }))
}

/** Months any hotel in this portfolio has a period for, newest first. */
export async function loadPortfolioMonths(
  supabase: SupabaseClient,
  hotelIds: readonly string[],
): Promise<readonly PortfolioMonth[]> {
  if (hotelIds.length === 0) return []
  const { data, error } = await supabase
    .schema('data')
    .from('reporting_periods')
    // The status too, so the page can land on a month that has something in it. Without
    // it the control offered every month any hotel has a period for and the page opened on
    // the newest, which for an open month is four properties with nothing approved.
    .select('period_start,status')
    .in('hotel_id', [...hotelIds])
    .order('period_start', { ascending: false })
  if (error) throw new Error(`portfolio.months: ${error.message}`)

  // Counted, not merely flagged: the default lands on the newest month the WHOLE portfolio
  // has approved, and "any" cannot distinguish one hotel of four from four of four.
  const approvedByMonth = new Map<string, number>()
  for (const row of data ?? []) {
    const month = String((row as { period_start: string }).period_start).slice(0, 7)
    const approved = String((row as { status: string }).status) === 'approved'
    approvedByMonth.set(month, (approvedByMonth.get(month) ?? 0) + (approved ? 1 : 0))
  }
  return [...approvedByMonth.entries()].map(([month, approvedHotels]) => ({
    month,
    approvedHotels,
  }))
}

export async function loadPortfolioHotels(
  supabase: SupabaseClient,
  portfolioId: string,
): Promise<
  readonly {
    id: string
    name: string
    city: string | null
    consolidationShare: string
  }[]
> {
  const { data, error } = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name,city,consolidation_share')
    .eq('portfolio_id', portfolioId)
    .order('name')
  if (error) throw new Error(`portfolio.hotels: ${error.message}`)
  return (data ?? []).map((h) => ({
    id: String(h.id),
    name: String(h.name),
    city: h.city === null || h.city === undefined ? null : String(h.city),
    // A hotel with no stated share consolidates in full. Defaulting to zero would drop it
    // from the portfolio silently, which is the one outcome §16.1 spends its length
    // forbidding; defaulting to 100 keeps it visible and wrong-if-wrong, which somebody
    // will notice.
    consolidationShare:
      h.consolidation_share === null || h.consolidation_share === undefined
        ? '100'
        : String(h.consolidation_share),
  }))
}

/**
 * Each hotel's figures for one month.
 *
 * Four queries for the whole portfolio rather than four per hotel: a ten-hotel portfolio
 * would otherwise be forty round trips for one screen.
 */
export async function loadHotelMonths(
  supabase: SupabaseClient,
  hotels: readonly { id: string; name: string; consolidationShare: string }[],
  month: string,
): Promise<readonly HotelMonthInput[]> {
  if (hotels.length === 0) return []
  const ids = hotels.map((h) => h.id)
  const periodStart = `${month}-01`

  const { data: periods, error: periodError } = await supabase
    .schema('data')
    .from('reporting_periods')
    .select('id,hotel_id,status')
    .in('hotel_id', ids)
    .eq('period_start', periodStart)
  if (periodError) throw new Error(`portfolio.periods: ${periodError.message}`)

  const periodByHotel = new Map(
    (periods ?? []).map((p) => [
      String(p.hotel_id),
      { id: String(p.id), status: String(p.status) },
    ]),
  )
  const periodIds = [...periodByHotel.values()].map((p) => p.id)
  if (periodIds.length === 0) {
    return hotels.map((h) => empty(h))
  }

  const [activityResult, recordsResult, wasteResult] = await Promise.all([
    supabase
      .schema('data')
      .from('activity_records')
      .select('period_id,occupied_room_nights,guest_nights')
      .in('period_id', periodIds),
    supabase
      .schema('data')
      .from('resource_records')
      .select('period_id,value,resource_sources!inner(resource)')
      // Current values only: a correction retains the row it replaced, and summing both
      // counts the mistake as well as the fix (§6.6).
      .eq('corrected', false)
      .in('period_id', periodIds),
    supabase
      .schema('waste')
      .from('records')
      .select('period_id,weight_kg')
      .in('period_id', periodIds),
  ])
  if (activityResult.error) throw new Error(`portfolio.activity: ${activityResult.error.message}`)
  if (recordsResult.error) throw new Error(`portfolio.records: ${recordsResult.error.message}`)
  if (wasteResult.error) throw new Error(`portfolio.waste: ${wasteResult.error.message}`)

  const activity = new Map(
    (activityResult.data ?? []).map((a) => [
      String(a.period_id),
      {
        orn: a.occupied_room_nights === null ? null : String(a.occupied_room_nights),
        guestNights: a.guest_nights === null ? null : String(a.guest_nights),
      },
    ]),
  )

  const energy = new Map<string, string>()
  const water = new Map<string, string>()
  for (const row of recordsResult.data ?? []) {
    const source = firstEmbedded<{ resource: string }>(
      (row as { resource_sources?: unknown }).resource_sources,
    )
    if (!source) continue
    const bucket = ENERGY.has(source.resource) ? energy : WATER.has(source.resource) ? water : null
    if (!bucket) continue
    const key = String((row as { period_id: string }).period_id)
    bucket.set(
      key,
      dec(bucket.get(key) ?? '0')
        .plus(dec(String((row as { value: number | string }).value)))
        .toFixed(),
    )
  }

  const waste = new Map<string, string>()
  for (const row of wasteResult.data ?? []) {
    const key = String((row as { period_id: string }).period_id)
    waste.set(
      key,
      dec(waste.get(key) ?? '0')
        .plus(dec(String((row as { weight_kg: number | string }).weight_kg)))
        .toFixed(),
    )
  }

  return hotels.map((h) => {
    const period = periodByHotel.get(h.id)
    if (!period) return empty(h)
    const act = activity.get(period.id)
    return {
      hotelId: h.id,
      hotelName: h.name,
      consolidationSharePercent: h.consolidationShare,
      approved: period.status === 'approved',
      occupiedRoomNights: act?.orn ?? null,
      guestNights: act?.guestNights ?? null,
      energyKwh: energy.get(period.id) ?? null,
      waterM3: water.get(period.id) ?? null,
      wasteKg: waste.get(period.id) ?? null,
    }
  })
}

/** A hotel with no period for this month at all. Absent, not zero. */
function empty(h: { id: string; name: string; consolidationShare: string }): HotelMonthInput {
  return {
    hotelId: h.id,
    hotelName: h.name,
    consolidationSharePercent: h.consolidationShare,
    approved: false,
    occupiedRoomNights: null,
    guestNights: null,
    energyKwh: null,
    waterM3: null,
    wasteKg: null,
  }
}

/** The status of each hotel's month, for the table that lists them. */
export async function loadMonthStatuses(
  supabase: SupabaseClient,
  hotelIds: readonly string[],
  month: string,
): Promise<ReadonlyMap<string, string>> {
  if (hotelIds.length === 0) return new Map()
  const { data, error } = await supabase
    .schema('data')
    .from('reporting_periods')
    .select('hotel_id,status')
    .in('hotel_id', [...hotelIds])
    .eq('period_start', `${month}-01`)
  if (error) throw new Error(`portfolio.statuses: ${error.message}`)
  return new Map((data ?? []).map((r) => [String(r.hotel_id), String(r.status)]))
}
