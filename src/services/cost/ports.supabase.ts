/**
 * Reading the cost model under the caller's session, so RLS answers.
 *
 * What is read: the hotel and its client (currency, financial year), the months that
 * have left draft, the supplies, and every current resource record with whatever cost
 * the bill carried. What is computed: nothing here — the rows go to engine/cost.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { costSummary, effectiveRate, rateAlert } from '@/engine/cost'
import type { CostLineInput, EffectiveRate, RatePoint } from '@/engine/cost'
import type { QualityTier } from '@/engine/quality'
import { labelForResource } from '@/services/entry/model'
import { sameMonthLastYear } from './model'
import type {
  CostModel,
  CostPeriodRef,
  CostUtility,
  RateObservation,
  RateSeries,
  RateSeriesPoint,
} from './model'

interface PeriodRecord {
  id: string
  period_start: string
  status: string
}

interface SourceRecord {
  id: string
  resource: string
  canonical_unit: string
  included: boolean
}

interface ResourceRecord {
  period_id: string
  source_id: string
  value: number | string
  quality_tier: string
  cost: number | string | null
  cost_currency: string | null
  fixed_charges: number | string | null
  cost_quality_tier: string | null
}

const SERIES_MONTHS = 24

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

function pointOf(month: string, sourceId: string, r: ResourceRecord): RatePoint | null {
  const cost = text(r.cost)
  if (cost === null) return null
  const fixed = text(r.fixed_charges)
  return {
    period: month,
    sourceId,
    cost,
    ...(fixed === null ? {} : { fixedCharges: fixed }),
    consumption: String(r.value),
    costTier: (text(r.cost_quality_tier) ?? 'measured') as QualityTier,
    consumptionTier: String(r.quality_tier) as QualityTier,
  }
}

/** Null where the hotel is outside the reader's grants — 404, never 403 (§2.5). */
export async function loadCostModel(
  supabase: SupabaseClient,
  hotelId: string,
  selectedPeriodId: string | undefined,
): Promise<CostModel | null> {
  const { data: hotel } = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name,tenant_id')
    .eq('id', hotelId)
    .maybeSingle()
  if (!hotel) return null

  const [tenantResult, periodsResult, sourcesResult, recordsResult] = await Promise.all([
    supabase
      .schema('core')
      .from('tenants')
      .select('reporting_currency,financial_year_start_month')
      .eq('id', String(hotel.tenant_id))
      .maybeSingle(),
    supabase
      .schema('data')
      .from('reporting_periods')
      .select('id,period_start,status')
      .eq('hotel_id', hotelId)
      // A cost is what a bill said about a month somebody has finished entering. Drafts
      // are not on the screen, the same rule the review's comparators follow.
      .in('status', ['submitted', 'approved', 'locked'])
      .order('period_start', { ascending: false }),
    supabase
      .schema('data')
      .from('resource_sources')
      .select('id,resource,canonical_unit,included')
      .eq('hotel_id', hotelId),
    supabase
      .schema('data')
      .from('resource_records')
      .select(
        'period_id,source_id,value,quality_tier,cost,cost_currency,fixed_charges,cost_quality_tier',
      )
      .eq('hotel_id', hotelId)
      .eq('corrected', false),
  ])
  if (periodsResult.error) throw new Error(`cost: ${periodsResult.error.message}`)
  if (recordsResult.error) throw new Error(`cost: ${recordsResult.error.message}`)

  const tenant = tenantResult.data as {
    reporting_currency: string
    financial_year_start_month: number
  } | null
  const currency = tenant ? String(tenant.reporting_currency) : 'AED'
  const financialYearStartMonth = tenant ? Number(tenant.financial_year_start_month) : 1

  const periods: CostPeriodRef[] = ((periodsResult.data ?? []) as PeriodRecord[]).map((p) => ({
    id: String(p.id),
    month: String(p.period_start).slice(0, 7),
    status: String(p.status),
  }))
  const sources = ((sourcesResult.data ?? []) as SourceRecord[]).filter((s) => s.included)
  const records = (recordsResult.data ?? []) as ResourceRecord[]

  // period → source → record
  const byPeriod = new Map<string, Map<string, ResourceRecord>>()
  for (const r of records) {
    const pid = String(r.period_id)
    const inner = byPeriod.get(pid) ?? new Map<string, ResourceRecord>()
    inner.set(String(r.source_id), r)
    byPeriod.set(pid, inner)
  }
  const periodByMonth = new Map(periods.map((p) => [p.month, p]))
  const noCostEver = !records.some((r) => text(r.cost) !== null)

  if (periods.length === 0) return null

  // The period: the one asked for, else the newest that carries a cost, else the newest.
  const asked = periods.find((p) => p.id === selectedPeriodId)
  const newestPriced = periods.find((p) =>
    [...(byPeriod.get(p.id)?.values() ?? [])].some((r) => text(r.cost) !== null),
  )
  const period = asked ?? newestPriced ?? periods[0]!
  const priorPeriod = periodByMonth.get(sameMonthLastYear(period.month)) ?? null

  const current = byPeriod.get(period.id) ?? new Map<string, ResourceRecord>()
  const prior = priorPeriod ? (byPeriod.get(priorPeriod.id) ?? new Map()) : new Map()

  // A utility appears where it carries a reading this period, whether or not the bill
  // carried a cost: the unpriced ones are what "partial" names.
  const utilities: CostUtility[] = []
  const inputs: CostLineInput[] = []
  for (const s of sources) {
    const id = String(s.id)
    const rec = current.get(id)
    if (!rec) continue
    const cur = pointOf(period.month, id, rec)
    const pri = priorPeriod ? pointOf(priorPeriod.month, id, prior.get(id) ?? undefined!) : null
    inputs.push({ sourceId: id, current: cur, prior: prior.get(id) ? pri : null })
    utilities.push({
      sourceId: id,
      resource: String(s.resource),
      label: labelForResource(String(s.resource)),
      unit: String(s.canonical_unit),
      currency: text(rec.cost_currency),
      costTier: cur ? cur.costTier : null,
      consumptionTier: String(rec.quality_tier) as QualityTier,
      fixedChargesSeparated: text(rec.fixed_charges) !== null,
    })
  }
  utilities.sort((a, b) => a.label.localeCompare(b.label))
  const summary = costSummary(inputs)

  // The rate over time, per utility, the twenty-four months to this one.
  const months = monthsEndingAt(period.month, SERIES_MONTHS)
  const rateSeries: RateSeries[] = utilities.map((u) => ({
    sourceId: u.sourceId,
    label: u.label,
    unit: u.unit,
    points: months.map((month): RateSeriesPoint => {
      const p = periodByMonth.get(month)
      const rec = p ? byPeriod.get(p.id)?.get(u.sourceId) : undefined
      const point = rec ? pointOf(month, u.sourceId, rec) : null
      return { month, rate: point ? effectiveRate(point) : null }
    }),
  }))

  // I-04: the movement against last month, stated, never asserted.
  const observations: RateObservation[] = []
  const lastMonth = months[months.length - 2]
  for (const u of utilities) {
    const rec = current.get(u.sourceId)
    const cur = rec ? pointOf(period.month, u.sourceId, rec) : null
    if (!cur || lastMonth === undefined) continue
    const lp = periodByMonth.get(lastMonth)
    const lrec = lp ? byPeriod.get(lp.id)?.get(u.sourceId) : undefined
    const priorPoint = lrec ? pointOf(lastMonth, u.sourceId, lrec) : null
    const alert = rateAlert(cur, priorPoint)
    if (alert.raised) {
      observations.push({
        sourceId: u.sourceId,
        label: u.label,
        // The engine names the source by id; the reader gets its label.
        observation: alert.observation.replace(u.sourceId, u.label),
        changePercent: alert.changePercent,
      })
    }
  }

  const currencies = [
    ...new Set(utilities.map((u) => u.currency).filter((c): c is string => c !== null)),
  ].sort()

  return {
    hotelName: String(hotel.name),
    currency,
    financialYearStartMonth,
    period,
    periods,
    priorPeriod,
    summary,
    utilities,
    rateSeries,
    observations,
    currencies,
    noCostEver,
  }
}

/** The `count` months ending at a YYYY-MM, oldest first. */
export function monthsEndingAt(month: string, count: number): string[] {
  const out: string[] = []
  const cursor = new Date(`${month}-01T00:00:00Z`)
  cursor.setUTCMonth(cursor.getUTCMonth() - (count - 1))
  for (let i = 0; i < count; i += 1) {
    out.push(cursor.toISOString().slice(0, 7))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return out
}

export type { EffectiveRate }
