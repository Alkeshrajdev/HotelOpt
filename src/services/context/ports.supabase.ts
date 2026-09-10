/**
 * Supabase-backed ports for the context selector.
 *
 * Every query runs under the caller's session. There is no tenant filter in any of them and
 * that is deliberate: adding one would imply the filter is what limits the result, and the
 * next person to read this would reasonably assume removing it widens the query rather than
 * exposing another client's estate. RLS is the boundary; these read what it returns.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContextPorts } from './model'

const OPEN_STATUSES = ['draft', 'returned']

export function supabaseContextPorts(supabase: SupabaseClient): ContextPorts {
  return {
    async portfolios() {
      const { data, error } = await supabase.schema('core').from('portfolios').select('id,name')
      if (error) throw new Error(`context.portfolios: ${error.message}`)
      return (data ?? []).map((r) => ({ id: String(r.id), name: String(r.name) }))
    },

    async hotels() {
      const { data, error } = await supabase
        .schema('core')
        .from('hotels')
        .select('id,name,city,portfolio_id')
      if (error) throw new Error(`context.hotels: ${error.message}`)
      return (data ?? []).map((r) => ({
        id: String(r.id),
        name: String(r.name),
        city: r.city === null || r.city === undefined ? null : String(r.city),
        portfolioId:
          r.portfolio_id === null || r.portfolio_id === undefined ? null : String(r.portfolio_id),
      }))
    },

    async periodSummary(hotelIds) {
      if (hotelIds.length === 0) return new Map()

      // One query for every hotel rather than one per hotel. A selector that issues a
      // request per row is fine at four hotels and unusable at four hundred, and §29.1 puts
      // a number on the page this feeds.
      const { data, error } = await supabase
        .schema('data')
        .from('reporting_periods')
        .select('hotel_id,period_start,status')
        .in('hotel_id', hotelIds as string[])
        .order('period_start', { ascending: false })
      if (error) throw new Error(`context.periodSummary: ${error.message}`)

      const out = new Map<
        string,
        { latestMonth: string | null; latestStatus: string | null; openMonths: number }
      >()
      for (const row of data ?? []) {
        const hotelId = String((row as { hotel_id: string }).hotel_id)
        const month = String((row as { period_start: string }).period_start).slice(0, 7)
        const status = String((row as { status: string }).status)
        const current = out.get(hotelId)
        if (!current) {
          // Rows arrive newest first, so the first one seen for a hotel is its latest.
          out.set(hotelId, {
            latestMonth: month,
            latestStatus: status,
            openMonths: OPEN_STATUSES.includes(status) ? 1 : 0,
          })
          continue
        }
        if (OPEN_STATUSES.includes(status)) {
          out.set(hotelId, { ...current, openMonths: current.openMonths + 1 })
        }
      }
      return out
    },
  }
}
