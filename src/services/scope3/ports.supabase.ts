/**
 * Scope 3 read through PostgREST. Every function here is a security-definer function in
 * the database that answers empty to a reader who holds nothing (§2.5), so the model
 * never has to decide who may see a waste line.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScreeningRow } from '@/engine/scope3'
import type { Scope3Ports } from './load'

function text(v: unknown): string {
  return v === null || v === undefined ? '' : String(v)
}
function maybe(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

const ENERGY: ReadonlySet<string> = new Set([
  'grid_electricity',
  'district_cooling',
  'purchased_heat',
  'purchased_steam',
  'piped_gas',
  'delivered_diesel',
  'delivered_lpg',
  'delivered_other',
])

export function supabaseScope3Ports(supabase: SupabaseClient): Scope3Ports {
  return {
    async hotel(hotelId) {
      const { data, error } = await supabase
        .schema('core')
        .from('hotels')
        .select('tenant_id,country,grid_code')
        .eq('id', hotelId)
        .maybeSingle()
      if (error) throw new Error(`scope3.hotel: ${error.message}`)
      return data
        ? {
            tenantId: text(data.tenant_id),
            country: text(data.country),
            gridCode: maybe(data.grid_code),
          }
        : null
    },

    async period(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .from('reporting_periods')
        .select('hotel_id,period_start')
        .eq('id', periodId)
        .maybeSingle()
      if (error) throw new Error(`scope3.period: ${error.message}`)
      return data
        ? { hotelId: text(data.hotel_id), month: text(data.period_start).slice(0, 7) }
        : null
    },

    async screening(tenantId) {
      const { data, error } = await supabase
        .schema('core')
        .rpc('scope3_screening_for', { p_tenant_id: tenantId })
      if (error) throw new Error(`scope3.screening: ${error.message}`)
      return ((data ?? []) as Record<string, unknown>[]).map((r): ScreeningRow => ({
        category: Number(r.category),
        name: text(r.name),
        status: text(r.status) as ScreeningRow['status'],
        reason: text(r.reason),
        accepted: r.accepted === true,
        reviewOverdue: r.review_overdue === true,
      }))
    },

    async purchaseLines(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .rpc('spend_lines_for_period', { p_period_id: periodId })
      if (error) throw new Error(`scope3.purchases: ${error.message}`)
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        description: text(r.description),
        capex: r.capex === true,
        amountNet: text(r.amount_net ?? r.amount),
        currency: text(r.currency),
        emissionsKg: maybe(r.emissions_kg),
        refusal: maybe(r.refusal),
      }))
    },

    async wasteLines(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .rpc('waste_scope3_for_period', { p_period_id: periodId })
      if (error) throw new Error(`scope3.waste: ${error.message}`)
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        stream: text(r.stream),
        treatmentClass: maybe(r.treatment_class),
        weightKg: text(r.weight_kg),
        emissionsKg: maybe(r.emissions_kg),
        refusal: maybe(r.refusal),
        carriedForward: r.carried_forward === true,
      }))
    },

    async activityLines(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .rpc('scope3_activity_for_period', { p_period_id: periodId })
      if (error) throw new Error(`scope3.activity: ${error.message}`)
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: text(r.id),
        category: Number(r.category),
        code: text(r.activity_code),
        region: maybe(r.region),
        quantity: text(r.quantity),
        unit: text(r.unit),
        description: text(r.description),
        emissionsKg: maybe(r.emissions_kg),
        refusal: maybe(r.refusal),
        carriedForward: r.carried_forward === true,
      }))
    },

    async energyLines(periodId) {
      // The same read the carbon card makes: current rows only, energy resources only,
      // summed per resource in the unit the source records.
      const { data, error } = await supabase
        .schema('data')
        .from('resource_records')
        .select('value,canonical_unit,resource_sources!inner(resource)')
        .eq('period_id', periodId)
        .eq('corrected', false)
      if (error) throw new Error(`scope3.energy: ${error.message}`)
      const totals = new Map<string, { quantity: number; unit: string }>()
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const source = row.resource_sources as
          { resource?: string } | { resource?: string }[] | null
        const resource = Array.isArray(source) ? source[0]?.resource : source?.resource
        if (!resource || !ENERGY.has(resource)) continue
        const current = totals.get(resource) ?? { quantity: 0, unit: text(row.canonical_unit) }
        // Summed here as the database's numeric, then handed to the engine as a string;
        // the only arithmetic is the sum of a column, which the query could equally do.
        totals.set(resource, { quantity: current.quantity + Number(row.value), unit: current.unit })
      }
      return [...totals].map(([resource, t]) => ({
        resource,
        quantity: String(t.quantity),
        unit: t.unit,
      }))
    },

    async gridScope3(country, gridCode, onDate) {
      const { data, error } = await supabase.schema('factors').rpc('resolve_grid_scope3', {
        p_country: country,
        p_grid_code: gridCode,
        p_on: onDate,
      })
      if (error) throw new Error(`scope3.grid: ${error.message}`)
      const r = ((data ?? []) as Record<string, unknown>[])[0] ?? {}
      return {
        tdValue: maybe(r.td_value),
        tdEdition: maybe(r.td_edition),
        tdCarriedForward: r.td_carried_forward === true,
        tdRefusal: maybe(r.td_refusal),
        upstreamValue: maybe(r.upstream_value),
        upstreamEdition: maybe(r.upstream_edition),
        upstreamCarriedForward: r.upstream_carried_forward === true,
        upstreamRefusal: maybe(r.upstream_refusal),
      }
    },

    async wtt(tenantId, code, unit, quantity, onDate) {
      const { data, error } = await supabase.schema('factors').rpc('select_for_line', {
        p_tenant_id: tenantId,
        p_on: onDate,
        p_description: `${code} well-to-tank`,
        p_domain: 'wtt',
        p_code: code,
        p_quantity: Number(quantity),
        p_unit: unit,
      })
      if (error) throw new Error(`scope3.wtt(${code}): ${error.message}`)
      const r = ((data ?? []) as Record<string, unknown>[])[0] ?? {}
      return {
        emissionsKg: maybe(r.emissions_kg),
        carriedForward: r.carried_forward === true,
        refusal: maybe(r.refusal),
      }
    },
  }
}
