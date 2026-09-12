/**
 * Reproduce a figure — P-01, J-05, P-02, C-05; the heart of H2.
 *
 * Given a hotel, a month and a metric, rebuild the published figure from the records
 * behind it: every reading including the corrected ones, the supplies they came from, the
 * factor version in force for that month, the method version, who approved it and when,
 * and whether it was restated. The calculation itself is an executable snapshot from
 * `engine/trace`: the same artifact the platform keeps for reproducibility, rendered as
 * the §19.4 trace with intermediates at full precision. A figure that will not reproduce
 * is a defect and is reported as one, naming the figure.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Decimal, dec } from '@/engine/rounding'
import type { QuantityKind } from '@/engine/rounding'
import { createSnapshot, renderTrace, SnapshotError } from '@/engine/trace'
import type { Operation } from '@/engine/trace'
import { supabaseOverviewPorts } from '@/services/overview/ports.supabase'
import type { Locale } from '@/i18n'
import { formatQuantity } from '@/i18n'
import type { ReproduceMetric, ReproduceResult } from './model'

const RESOURCE_GROUP: Record<string, 'energy' | 'water' | 'waste'> = {
  grid_electricity: 'energy',
  district_cooling: 'energy',
  purchased_heat: 'energy',
  purchased_steam: 'energy',
  piped_gas: 'energy',
  onsite_generation: 'energy',
  water_municipal: 'water',
  water_tse: 'water',
  water_groundwater: 'water',
  water_desalinated: 'water',
  water_tankered: 'water',
  water_cooling_makeup: 'water',
}

const KIND: Record<ReproduceMetric, QuantityKind> = {
  energy: 'energy.kwh',
  water: 'water.m3',
  waste: 'waste.kg',
  carbon_scope2_location: 'emissions.tco2e',
}

const UNIT: Record<ReproduceMetric, string> = {
  energy: 'kWh',
  water: 'm3',
  waste: 'kg',
  carbon_scope2_location: 'kgCO2e',
}

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

/** The engine build behind this figure: the deployment's commit, or "dev" locally. */
export function engineVersionHash(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? process.env.GIT_COMMIT?.slice(0, 12) ?? 'dev'
  )
}

export async function reproduceFigure(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  periodId: string,
  metric: ReproduceMetric,
): Promise<ReproduceResult> {
  const provenanceBase = {
    methodVersion: 'none published',
    factorSetVersions: {} as Record<string, string>,
    engineVersionHash: engineVersionHash(),
  }
  const refuse = (why: string): ReproduceResult => ({
    ok: false,
    headline: 'Not reproduced',
    sentences: [],
    trace: [],
    provenance: provenanceBase,
    refusal: why,
  })

  const [period, hotelRow, method] = await Promise.all([
    supabase
      .schema('data')
      .from('reporting_periods')
      .select(
        'id,period_start,status,approved_at,approved_by,submitted_by,submitted_at,reopened_reason',
      )
      .eq('id', periodId)
      .eq('hotel_id', hotelId)
      .maybeSingle(),
    supabase
      .schema('core')
      .from('hotels')
      .select('id,name,country,grid_code')
      .eq('id', hotelId)
      .maybeSingle(),
    supabase
      .schema('calc')
      .from('methodology_versions')
      .select('code,name,gwp_vintage,effective_from')
      .eq('status', 'active')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (period.error || !period.data) return refuse('That month is not on record for this property.')
  if (hotelRow.error || !hotelRow.data) return refuse('That property is not on record.')
  const month = String(period.data.period_start).slice(0, 7)
  // The approver's name comes from access, a separate read: PostgREST embeds within a
  // schema only.
  const approverName = period.data.approved_by
    ? text(
        (
          await supabase
            .schema('access')
            .from('user_profiles')
            .select('full_name')
            .eq('id', period.data.approved_by)
            .maybeSingle()
        ).data?.full_name,
      )
    : null
  const methodVersion = method.data
    ? `${String(method.data.name)} (${String(method.data.code)})`
    : 'none published'

  if (metric === 'waste') {
    const waste = await supabase
      .schema('waste')
      .from('records')
      .select('stream,weight_kg,quality_tier,destination_method')
      .eq('period_id', periodId)
    if (waste.error) return refuse(`The waste register could not be read: ${waste.error.message}`)
    const rows = waste.data ?? []
    if (rows.length === 0)
      return refuse(`No waste record exists for ${month}, so there is no figure to reproduce.`)
    const ops: Operation[] = rows.map((r, i) =>
      i === 0
        ? {
            op: 'literal',
            value: String(r.weight_kg),
            label: `${String(r.stream)} (${String(r.quality_tier)})`,
            unit: 'kg',
          }
        : {
            op: 'add',
            value: String(r.weight_kg),
            label: `${String(r.stream)} (${String(r.quality_tier)})`,
          },
    )
    return finish(
      ops,
      'waste',
      rows.length,
      0,
      new Set(rows.map((r) => String(r.stream))).size,
      'streams',
    )
  }

  const records = await supabase
    .schema('data')
    .from('resource_records')
    .select(
      'id,value,canonical_unit,quality_tier,corrected,corrects,created_at,resource_sources!inner(id,resource,provider,account_reference)',
    )
    .eq('period_id', periodId)
    .order('created_at')
  if (records.error) return refuse(`The readings could not be read: ${records.error.message}`)
  const group = metric === 'water' ? 'water' : 'energy'
  const all = (records.data ?? []).filter((r) => {
    const s = Array.isArray(r.resource_sources) ? r.resource_sources[0] : r.resource_sources
    return RESOURCE_GROUP[String((s as { resource?: unknown } | null)?.resource)] === group
  })
  const current = all.filter((r) => !r.corrected)
  if (current.length === 0)
    return refuse(`No ${group} reading exists for ${month}, so there is no figure to reproduce.`)
  const supplies = new Set(
    current.map((r) =>
      String(
        (
          (Array.isArray(r.resource_sources) ? r.resource_sources[0] : r.resource_sources) as {
            id: unknown
          }
        ).id,
      ),
    ),
  )
  const corrections = all.length - current.length

  const ops: Operation[] = current.map((r, i) => {
    const s = (Array.isArray(r.resource_sources) ? r.resource_sources[0] : r.resource_sources) as {
      resource: unknown
      provider: unknown
    }
    const label = `${String(s.resource).replaceAll('_', ' ')}${s.provider ? ` · ${String(s.provider)}` : ''} (${String(r.quality_tier)})`
    return i === 0
      ? { op: 'literal', value: String(r.value), label, unit: String(r.canonical_unit) }
      : { op: 'add', value: String(r.value), label }
  })

  if (metric === 'carbon_scope2_location') {
    // Only grid electricity carries the grid factor; other energy sources are their own
    // lines in the inventory and are not blended here.
    const grid = current.filter((r) => {
      const s = Array.isArray(r.resource_sources) ? r.resource_sources[0] : r.resource_sources
      return String((s as { resource?: unknown } | null)?.resource) === 'grid_electricity'
    })
    if (grid.length === 0)
      return refuse(
        `No grid electricity reading exists for ${month}; Scope 2 location-based cannot be reproduced.`,
      )
    const ports = supabaseOverviewPorts(supabase, locale)
    const factor = await ports.gridFactor(
      String(hotelRow.data.country),
      text(hotelRow.data.grid_code),
      `${month}-01`,
    )
    if (!factor || !factor.usable || factor.value === null)
      return refuse(
        `No usable grid factor resolves for ${String(hotelRow.data.country)}${hotelRow.data.grid_code ? ` (${String(hotelRow.data.grid_code)})` : ''} in ${month}${factor?.refusal ? `: ${factor.refusal}` : ''}. The figure cannot be reproduced, which is a defect to raise, not a state to design around.`,
      )
    const gridOps: Operation[] = grid.map((r, i) =>
      i === 0
        ? {
            op: 'literal',
            value: String(r.value),
            label: `grid electricity (${String(r.quality_tier)})`,
            unit: 'kWh',
          }
        : {
            op: 'add',
            value: String(r.value),
            label: `grid electricity (${String(r.quality_tier)})`,
          },
    )
    gridOps.push({
      op: 'multiply',
      by: factor.value,
      label: `grid factor, ${factor.gasBasis ?? 'CO2e'} per kWh`,
      resultUnit: 'kgCO2e',
      factorRef: {
        factorSetCode: `grid ${String(hotelRow.data.country)}${hotelRow.data.grid_code ? ` ${String(hotelRow.data.grid_code)}` : ''}`,
        scope: 'scope 2, location-based',
        version: `${factor.edition ?? 'unknown edition'}${factor.factorYear ? ` · factor year ${factor.factorYear}` : ''}${factor.carriedForward ? ' · carried forward' : ''}`,
        source: factor.sourceReference ?? 'source not stated',
      },
    })
    return finish(gridOps, metric, grid.length, corrections, 1, 'supply', {
      [`grid ${String(hotelRow.data.country)}`]: `${factor.edition ?? 'unknown'}${factor.factorYear ? `/${factor.factorYear}` : ''}`,
    })
  }

  return finish(ops, metric, current.length, corrections, supplies.size, 'supplies')

  function finish(
    operations: Operation[],
    m: ReproduceMetric,
    readings: number,
    corrected: number,
    supplyCount: number,
    supplyWord: string,
    factorSetVersions: Record<string, string> = {},
  ): ReproduceResult {
    const provenance = { methodVersion, factorSetVersions, engineVersionHash: engineVersionHash() }
    let snapshot
    try {
      snapshot = createSnapshot({
        metric: m,
        hotelId,
        period: month,
        operations,
        quantityKind: KIND[m],
        provenance,
        evidenceReferences: [],
      })
    } catch (error) {
      if (error instanceof SnapshotError)
        return {
          ...refuse(`The snapshot does not reproduce its own value: ${error.message}`),
          provenance,
        }
      throw error
    }
    const value = dec(snapshot.value)
    const headline = `${formatQuantity(value.toFixed(), KIND[m] === 'emissions.tco2e' ? 'energy.kwh' : (KIND[m] as 'energy.kwh' | 'water.m3' | 'waste.kg'), locale)} ${UNIT[m]}`
    const sentences = [
      `Built from ${readings} ${readings === 1 ? 'reading' : 'readings'}${corrected > 0 ? `, ${corrected} ${corrected === 1 ? 'correction' : 'corrections'} retained on the chain` : ''}, across ${supplyCount} ${supplyWord}.`,
      Object.keys(factorSetVersions).length > 0
        ? `Factor set ${Object.entries(factorSetVersions)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')}, version in force for ${month}.`
        : 'No emission factor applies to this figure.',
      `Method ${methodVersion}. Engine ${provenance.engineVersionHash}.`,
      period.data && period.data.approved_at
        ? `Approved by ${approverName ?? 'a named approver'} on ${String(period.data.approved_at).slice(0, 10)}.`
        : `Not approved: the month is ${String(period.data?.status ?? 'unknown')}, so this is a draft figure.`,
    ]
    if (period.data?.reopened_reason)
      sentences.push(`Restated: reopened with the reason "${String(period.data.reopened_reason)}".`)
    return {
      ok: true,
      headline,
      sentences,
      trace: renderTrace(snapshot),
      provenance,
      refusal: null,
    }
  }
}

export { Decimal }
