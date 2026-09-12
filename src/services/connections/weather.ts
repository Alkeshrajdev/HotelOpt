/**
 * The weather adapter — C-01, C-02, C-14.
 *
 * Open-Meteo's ERA5 reanalysis archive, at the property's own coordinates, daily mean
 * 2 m temperature and relative humidity, no key. Degree days are computed in the engine
 * at each base the connection names and recorded through `climate.record_degree_days`
 * with the request as the reference, so the same series can be obtained again by anyone
 * holding the record. Every run, successful or not, is a delivery.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { degreeDaysByMonth } from '@/engine/climate/degreeDays'
import type { DailyMean } from '@/engine/climate/degreeDays'
import { baseTemperatures, weatherWindow } from './model'

export const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'

export function openMeteoRequest(
  lat: string,
  lon: string,
  timezone: string,
  from: string,
  to: string,
): string {
  const q = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    start_date: from,
    end_date: to,
    daily: 'temperature_2m_mean,relative_humidity_2m_mean',
    timezone,
  })
  return `${OPEN_METEO_ARCHIVE}?${q.toString()}`
}

interface OpenMeteoDaily {
  readonly daily?: { time?: string[]; temperature_2m_mean?: (number | null)[] }
  readonly reason?: string
}

export async function fetchDailyMeans(url: string): Promise<DailyMean[]> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} from Open-Meteo`)
  const body = (await res.json()) as OpenMeteoDaily
  if (!body.daily?.time) throw new Error(body.reason ?? 'no daily series in the response')
  const temps = body.daily.temperature_2m_mean ?? []
  return body.daily.time.map((date, i) => ({ date, meanC: temps[i] ?? null }))
}

export interface WeatherRunResult {
  readonly ok: boolean
  readonly message: string
  readonly monthsWritten: number
}

export async function runWeatherConnection(
  supabase: SupabaseClient,
  connectionId: string,
  today = new Date(),
): Promise<WeatherRunResult> {
  const conn = await supabase
    .schema('integrations')
    .from('connections')
    .select('id,hotel_id,kind,provider,config,withdrawn_at')
    .eq('id', connectionId)
    .maybeSingle()
  if (conn.error || !conn.data)
    return { ok: false, message: 'That connection is not on record.', monthsWritten: 0 }
  if (conn.data.withdrawn_at)
    return { ok: false, message: 'That connection is withdrawn.', monthsWritten: 0 }
  if (
    String(conn.data.kind) !== 'weather' ||
    String(conn.data.provider).toLowerCase() !== 'open-meteo'
  )
    return {
      ok: false,
      message: 'No adapter is built for this provider; its data continues by hand (C-12).',
      monthsWritten: 0,
    }
  const hotel = await supabase
    .schema('core')
    .from('hotels')
    .select('latitude,longitude,timezone')
    .eq('id', conn.data.hotel_id)
    .maybeSingle()
  if (!hotel.data?.latitude || !hotel.data.longitude)
    return {
      ok: false,
      message:
        'The property has no coordinates on its profile; weather is fetched for a place, not a name.',
      monthsWritten: 0,
    }
  const config = (conn.data.config ?? {}) as Record<string, unknown>
  const window = weatherWindow(config, today)
  if (!window)
    return {
      ok: false,
      message: 'The connection names no first month, or the first month is not yet complete.',
      monthsWritten: 0,
    }
  const url = openMeteoRequest(
    String(hotel.data.latitude),
    String(hotel.data.longitude),
    String(hotel.data.timezone ?? 'UTC'),
    window.from,
    window.to,
  )
  const deliver = (
    records: number,
    outcome: 'delivered' | 'failed' | 'nothing_new',
    error: string | null,
    summary: Record<string, unknown>,
  ) =>
    supabase.schema('integrations').rpc('record_delivery', {
      p_connection_id: connectionId,
      p_origin: 'Open-Meteo ERA5 reanalysis archive',
      p_reference: url,
      p_from: window.from,
      p_to: window.to,
      p_records_written: records,
      p_outcome: outcome,
      p_error: error,
      p_summary: summary,
    })
  let daily: DailyMean[]
  try {
    daily = await fetchDailyMeans(url)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await deliver(0, 'failed', message, {})
    return {
      ok: false,
      message: `The archive did not answer: ${message}. Entry by hand continues (C-12).`,
      monthsWritten: 0,
    }
  }
  const bases = baseTemperatures(config)
  let written = 0
  const incomplete: string[] = []
  for (const base of bases) {
    for (const m of degreeDaysByMonth(daily, base)) {
      if (!m.complete) {
        incomplete.push(`${m.month} (${m.daysWithData} of ${m.daysInMonth} days)`)
        continue
      }
      const r = await supabase.schema('climate').rpc('record_degree_days', {
        p_hotel_id: conn.data.hotel_id,
        p_month: `${m.month}-01`,
        p_base_temperature_c: base,
        p_cooling_degree_days: m.coolingDegreeDays,
        p_heating_degree_days: m.heatingDegreeDays,
        p_source:
          'Open-Meteo ERA5 reanalysis archive, daily mean 2 m air temperature, summed against the stated base (C-01, C-02)',
        p_source_reference: url,
      })
      if (r.error) {
        await deliver(written, 'failed', r.error.message, { bases, incomplete })
        return {
          ok: false,
          message: `The series could not be recorded: ${r.error.message}`,
          monthsWritten: written,
        }
      }
      written += 1
    }
  }
  await deliver(written, written > 0 ? 'delivered' : 'nothing_new', null, {
    bases,
    days: daily.length,
    incomplete,
  })
  return {
    ok: true,
    message: `${written} month-series recorded at ${bases.map((b) => `${b} °C`).join(', ')} from ${daily.length} days.${incomplete.length ? ` Incomplete and not recorded: ${incomplete.join(', ')}.` : ''}`,
    monthsWritten: written,
  }
}
