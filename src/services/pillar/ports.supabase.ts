/**
 * Reading the pillar views under the caller's session. Every figure is the engine's or the
 * overview service's; this file chooses which months to ask about and carries the answers.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { decompose, decompositionPoints, detectDrift } from '@/engine/gp'
import type { Verdict } from '@/engine/gp'
import { percentage, dec } from '@/engine/rounding'
import { formatQuantity, formatReportingMonth } from '@/i18n'
import type { Locale } from '@/i18n'
import type { QuantityKind } from '@/engine/rounding'
import { labelForResource } from '@/services/entry/model'
import { loadOverviewModel } from '@/services/overview/load'
import { supabaseOverviewPorts } from '@/services/overview/ports.supabase'
import { aYearBefore, twelveMonthsEnding } from '@/services/overview/trend'
import type { TrendSeries } from '@/services/overview/trend'
import { applyWindow, driverValue, evaluateModel, evaluateTier } from '@/services/performance'
import type { MonthRecord, TierOutcome, WindowState } from '@/services/performance'
import { loadWindowState } from '@/services/baseline/ports.supabase'
import { GROUP_LABEL } from './model'
import type {
  DetailModel,
  GenuineModel,
  Pillar,
  PillarOverview,
  PillarShell,
  SupplyLine,
  TierStatement,
} from './model'

const UNIT: Record<Pillar, string> = { energy: 'kWh', water: 'm3', waste: 'kg', carbon: 'kgCO2e' }

/** How each pillar's quantities are rounded for reading (§24.5). */
const KIND: Record<Pillar, QuantityKind> = {
  energy: 'energy.kwh',
  water: 'water.m3',
  waste: 'waste.kg',
  carbon: 'emissions.kgco2e',
}

const RESOURCE_PILLAR: Record<string, Pillar> = {
  grid_electricity: 'energy',
  district_cooling: 'energy',
  purchased_heat: 'energy',
  purchased_steam: 'energy',
  piped_gas: 'energy',
  delivered_diesel: 'energy',
  delivered_lpg: 'energy',
  delivered_other: 'energy',
  onsite_generation: 'energy',
  water_municipal: 'water',
  water_tse: 'water',
  water_groundwater: 'water',
  water_desalinated: 'water',
  water_tankered: 'water',
  water_cooling_makeup: 'water',
}

function tierOf(outcome: TierOutcome | null): TierStatement | null {
  if (outcome === null) return null
  if (outcome.tier === 'A') return { tier: 'A', reason: null }
  return { tier: outcome.tier, reason: outcome.reason }
}

/** History, window and tier for a modelled pillar; null tier for waste and carbon. */
async function modelled(
  supabase: SupabaseClient,
  hotelId: string,
  pillar: Pillar,
  reportingMonth: string,
): Promise<{
  history: readonly MonthRecord[]
  window: WindowState | null
  outcome: TierOutcome | null
}> {
  if (pillar !== 'energy' && pillar !== 'water') return { history: [], window: null, outcome: null }
  const ports = supabaseOverviewPorts(supabase, 'en')
  const [history, window] = await Promise.all([
    ports.modelHistory(hotelId, pillar),
    loadWindowState(supabase, hotelId, pillar),
  ])
  const outcome = evaluateTier({ history, reportingMonth, resourceLabel: pillar }, pillar, window)
  return { history, window, outcome }
}

/** Approved totals by supply for a period and the same period last year. */
async function supplies(
  supabase: SupabaseClient,
  hotelId: string,
  pillar: Pillar,
  periodId: string,
  priorPeriodId: string | null,
): Promise<SupplyLine[]> {
  if (pillar === 'carbon') return []
  const ids = priorPeriodId ? [periodId, priorPeriodId] : [periodId]
  const { data } = await supabase
    .schema('data')
    .from('resource_records')
    .select('period_id,value,canonical_unit,resource_sources!inner(resource)')
    .in('period_id', ids)
    .eq('corrected', false)
  const byResource = new Map<
    string,
    { unit: string; current: string | null; prior: string | null }
  >()
  for (const row of data ?? []) {
    const embedded = (row as { resource_sources?: unknown }).resource_sources
    const source = Array.isArray(embedded) ? embedded[0] : embedded
    const resource = String((source as { resource?: unknown } | undefined)?.resource ?? '')
    if (RESOURCE_PILLAR[resource] !== pillar) continue
    const entry = byResource.get(resource) ?? {
      unit: String((row as { canonical_unit: string }).canonical_unit),
      current: null,
      prior: null,
    }
    const value = String((row as { value: number | string }).value)
    if (String((row as { period_id: string }).period_id) === periodId) entry.current = value
    else entry.prior = value
    byResource.set(resource, entry)
  }
  return [...byResource]
    .map(([resource, e]) => {
      const change =
        e.current !== null && e.prior !== null
          ? percentage(dec(e.current).minus(e.prior), dec(e.prior))
          : null
      return {
        resource,
        label: labelForResource(resource),
        unit: e.unit,
        value: e.current,
        priorYear: e.prior,
        changePercent: change === null ? null : change.toFixed(),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** The 80% band per trend month, where a tier A model gives one (D-04). */
function bandsFor(
  history: readonly MonthRecord[],
  window: WindowState,
  months: readonly string[],
): Map<string, { lower: string; upper: string }> {
  const out = new Map<string, { lower: string; upper: string }>()
  for (const month of months) {
    const outcome = evaluateModel(
      applyWindow({ history, reportingMonth: month, resourceLabel: 'energy' }, window),
    )
    if (
      outcome.eligible &&
      outcome.result.lowerBound !== null &&
      outcome.result.upperBound !== null
    ) {
      out.set(month, { lower: outcome.result.lowerBound, upper: outcome.result.upperBound })
    }
  }
  return out
}

export async function loadPillarOverview(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  pillar: Pillar,
  selectedPeriodId: string | undefined,
): Promise<PillarOverview> {
  const ports = supabaseOverviewPorts(supabase, locale)
  const overview = await loadOverviewModel(
    hotelId,
    locale,
    ports,
    selectedPeriodId,
    pillar === 'carbon' ? 'energy' : pillar,
  )
  const periods = await ports.periods(hotelId)
  const period = periods.find((p) => p.id === overview.selectedPeriodId) ?? periods[0]
  const shell = shellFor(hotelId, pillar, overview.header.hotelName, periods, period ?? null)
  if (!period) {
    return {
      ...shell,
      card: overview.cards.find((c) => c.resource === pillar) ?? overview.carbonCard,
      cost: null,
      trend: overview.mainTrend.available ? overview.mainTrend.series : overview.mainTrend,
      supplies: [],
      normalised: null,
    }
  }
  const priorMonth = aYearBefore(period.month)
  const prior = periods.find((p) => p.month === priorMonth) ?? null
  const [lines, { history, window, outcome }] = await Promise.all([
    supplies(supabase, hotelId, pillar, period.id, prior?.id ?? null),
    modelled(supabase, hotelId, pillar, period.month),
  ])

  let trend: TrendSeries | PillarOverview['trend'] = overview.mainTrend.available
    ? overview.mainTrend.series
    : overview.mainTrend
  if (outcome?.tier === 'A' && window && 'available' in trend && trend.available) {
    const bands = bandsFor(history, window, twelveMonthsEnding(period.month))
    trend = {
      ...trend,
      points: trend.points.map((p) => {
        const band = bands.get(p.month)
        return band ? { ...p, expected: band } : p
      }),
    }
  }

  return {
    ...shell,
    tier: tierOf(outcome),
    card:
      pillar === 'carbon'
        ? overview.carbonCard
        : (overview.cards.find((c) => c.resource === pillar) ?? overview.carbonCard),
    cost: null,
    trend,
    supplies: lines,
    normalised: outcome?.tier === 'B' ? outcome.series : null,
  }
}

function shellFor(
  hotelId: string,
  pillar: Pillar,
  hotelName: string,
  periods: readonly { readonly id: string; readonly month: string }[],
  period: { readonly id: string; readonly month: string } | null,
): PillarShell {
  return {
    hotelId,
    hotelName,
    pillar,
    period: period ? { id: period.id, month: period.month } : { id: '', month: '' },
    periods: periods.map((p) => ({ id: p.id, month: p.month })),
    tier: null,
  }
}

export async function loadGenuine(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  pillar: Pillar,
  selectedPeriodId: string | undefined,
): Promise<GenuineModel> {
  const ports = supabaseOverviewPorts(supabase, locale)
  const overview = await loadOverviewModel(
    hotelId,
    locale,
    ports,
    selectedPeriodId,
    pillar === 'carbon' ? 'energy' : pillar,
  )
  const periods = await ports.periods(hotelId)
  const period = periods.find((p) => p.id === overview.selectedPeriodId) ?? periods[0] ?? null
  const shell = shellFor(hotelId, pillar, overview.header.hotelName, periods, period)
  const unit = UNIT[pillar]
  const base: GenuineModel = {
    ...shell,
    comparisonMonth: null,
    unit,
    actual: null,
    priorActual: null,
    verdict: null,
    basis: null,
    trainingMonths: null,
    decomposition: { available: false, because: 'no comparison period' },
    drift: null,
    headline: '',
    unavailableBecause: null,
    normalised: null,
    progress: [],
  }
  if (!period)
    return {
      ...base,
      unavailableBecause: 'no reporting period has been opened for this property',
      headline: 'No period to assess.',
    }
  if (pillar === 'carbon' || pillar === 'waste') {
    return {
      ...base,
      unavailableBecause:
        pillar === 'carbon'
          ? 'carbon carries no Genuine Performance verdict (§5.2); read the energy and fuel verdicts'
          : 'waste modelling waits for the waste register to be wired into the model',
      headline: pillar === 'carbon' ? 'Not offered for carbon.' : 'Not yet available for waste.',
    }
  }

  const { history, window, outcome } = await modelled(supabase, hotelId, pillar, period.month)
  const reporting = history.find((m) => m.month === period.month) ?? null
  const priorMonth = aYearBefore(period.month)
  const priorRecord = history.find((m) => m.month === priorMonth) ?? null
  const comparisonMonth = priorRecord ? priorMonth : null
  const actual = reporting ? String(reporting.value) : null
  const priorActual = priorRecord ? String(priorRecord.value) : null

  if (!outcome || outcome.tier !== 'A') {
    return {
      ...base,
      tier: tierOf(outcome),
      comparisonMonth,
      actual,
      priorActual,
      unavailableBecause: outcome ? outcome.reason : 'no model',
      headline:
        actual !== null && priorActual !== null
          ? `Consumption changed from ${formatQuantity(priorActual, KIND[pillar], locale)} to ${formatQuantity(actual, KIND[pillar], locale)} ${unit} against ${formatReportingMonth(priorMonth, locale)}; shown uninterpreted.`
          : 'No comparison period, so no change to state.',
      normalised: outcome?.tier === 'B' ? outcome.series : null,
    }
  }

  const model = outcome.model
  // The decomposition against the same month last year: the same model version covers
  // both, both approved with complete drivers, neither extrapolating (§6.1).
  let decomposition: GenuineModel['decomposition'] = {
    available: false,
    because: 'the same month last year is not on record',
  }
  if (priorRecord && reporting && window) {
    const priorOutcome = evaluateModel(
      applyWindow({ history, reportingMonth: priorMonth, resourceLabel: pillar }, window),
    )
    const missing = model.fitted.drivers.filter(
      (d) =>
        driverValue(priorRecord, d.driver) === null || driverValue(reporting, d.driver) === null,
    )
    if (!priorRecord.approved)
      decomposition = {
        available: false,
        because: `${formatReportingMonth(priorMonth, locale)} is not approved`,
      }
    else if (missing.length > 0)
      decomposition = {
        available: false,
        because: `${missing.map((d) => d.label).join(' and ')} missing for one of the two months`,
      }
    else if (
      model.result.verdict === 'outside_modelled_range' ||
      (priorOutcome.eligible && priorOutcome.result.verdict === 'outside_modelled_range')
    )
      decomposition = {
        available: false,
        because: 'one of the two months is outside the modelled range',
      }
    else {
      const value = decompose(
        priorRecord.value,
        reporting.value,
        model.fitted.drivers.map((d) => ({
          driver: d.label,
          coefficient: d.coefficient,
          baseValue: driverValue(priorRecord, d.driver) as number,
          currentValue: driverValue(reporting, d.driver) as number,
          group: d.group,
        })),
      )
      decomposition = value.reconciles
        ? { available: true, value, points: decompositionPoints(value, priorRecord.value) }
        : { available: false, because: 'the decomposition did not reconcile to the change' }
    }
  }

  // Drift: the last three verdicts, this month included.
  const recent: Verdict[] = []
  for (const m of [period.month, ...twelveMonthsEnding(period.month).slice(-3, -1).reverse()]) {
    const o =
      m === period.month
        ? outcome.model
        : evaluateModel(
            applyWindow(
              { history, reportingMonth: m, resourceLabel: pillar },
              window as WindowState,
            ),
          )
    if (o.eligible) recent.push(o.verdict)
  }
  const drift = detectDrift(recent.reverse())

  const headline =
    decomposition.available && decomposition.points
      ? headlineSentence(decomposition.points, decomposition.value.byGroup)
      : `${model.result.reason}`

  return {
    ...base,
    tier: tierOf(outcome),
    comparisonMonth,
    actual,
    priorActual,
    verdict: model.result,
    basis: model.basis,
    trainingMonths: model.trainingMonths,
    decomposition,
    drift,
    headline,
  }
}

function headlineSentence(
  points: NonNullable<ReturnType<typeof decompositionPoints>>,
  byGroup: Readonly<Record<string, string>>,
): string {
  const change = dec(points.actualChangePercent)
  const rose = change.isPositive()
  const groups = Object.keys(byGroup)
    .map(
      (g) =>
        `${(GROUP_LABEL[g] ?? g).toLowerCase()} for ${dec(points.byGroupPoints[g] ?? '0')
          .abs()
          .toDecimalPlaces(1)
          .toFixed(1)}`,
    )
    .join(' and ')
  return `Consumption ${rose ? 'rose' : 'fell'} ${change.abs().toDecimalPlaces(1).toFixed(1)}%. ${groups ? `${groups.charAt(0).toUpperCase()}${groups.slice(1)} points; ` : ''}the remaining ${dec(points.genuinePoints).toDecimalPlaces(1).toFixed(1)} points is performance.`
}

export async function loadDetail(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  pillar: Pillar,
  selectedPeriodId: string | undefined,
): Promise<DetailModel> {
  const overview = await loadPillarOverview(supabase, locale, hotelId, pillar, selectedPeriodId)
  const ports = supabaseOverviewPorts(supabase, locale)
  const history =
    pillar === 'energy' || pillar === 'water' ? await ports.modelHistory(hotelId, pillar) : []
  const byMonth = new Map(history.map((m) => [m.month, m]))
  return {
    ...overview,
    unit: UNIT[pillar],
    months: overview.periods.map((p) => {
      const m = byMonth.get(p.month)
      return {
        periodId: p.id,
        month: p.month,
        status: m ? (m.approved ? 'approved' : 'not approved') : 'no figure',
        value: m ? String(m.value) : null,
        tier: m ? m.tier : null,
      }
    }),
  }
}
