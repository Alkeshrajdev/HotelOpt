/**
 * Supabase-backed ports for the Overview.
 *
 * Runs under the caller's session so RLS applies (§26): a hotel outside the user's grants
 * is not found, which is the same answer the API gives and is what T-60 asks for — a
 * module outside a grant returns 404 and does not appear in navigation.
 */
import { loadWindowState } from '@/services/baseline/ports.supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FactorVersion } from '@/engine/factors'
import { dec } from '@/engine/rounding'
import { formatReportingMonth } from '@/i18n'
import type { Locale } from '@/i18n'
import { firstEmbedded } from '@/services/api/embed'
import { labelForResource } from '@/services/entry/model'
import type { AttentionItem } from './attention'
import type { OverviewPorts, PurchaseTotals, ResourceTotal } from './load'
import type { RefrigerantEventRow } from './refrigerants'

/**
 * The unit a quantity is really in, with the basis stripped off.
 *
 * 'kWh (Net CV)' and 'kWh' are both kilowatt-hours. The parenthetical says which calorific
 * value a fuel's energy content was measured on — a fact about the measurement, not a
 * different dimension — so the two add up and a total across them is a total in kWh.
 *
 * 'litres' and 'kWh' do not, and that is the distinction this exists to keep: without it,
 * a month holding electricity in kilowatt-hours and diesel in litres produced one number
 * labelled kWh.
 */
function unitDimension(unit: string): string {
  const open = unit.indexOf('(')
  return (open < 0 ? unit : unit.slice(0, open)).trim()
}

const RESOURCE_GROUP: Record<string, 'energy' | 'water'> = {
  grid_electricity: 'energy',
  district_cooling: 'energy',
  purchased_heat: 'energy',
  purchased_steam: 'energy',
  piped_gas: 'energy',
  delivered_diesel: 'energy',
  delivered_lpg: 'energy',
  delivered_other: 'energy',
  water_municipal: 'water',
  water_tse: 'water',
  water_groundwater: 'water',
  water_desalinated: 'water',
  water_tankered: 'water',
  water_cooling_makeup: 'water',
}

export function supabaseOverviewPorts(supabase: SupabaseClient, locale: Locale): OverviewPorts {
  return {
    async hotel(hotelId) {
      const { data, error } = await supabase
        .schema('core')
        .from('hotels')
        .select('id,name,tenant_id,country,grid_code')
        .eq('id', hotelId)
        .maybeSingle()
      if (error) throw new Error(`overview.hotel: ${error.message}`)
      return data
        ? {
            id: String(data.id),
            name: String(data.name),
            tenantId: String(data.tenant_id),
            country: String(data.country),
            gridCode: data.grid_code === null ? null : String(data.grid_code),
          }
        : null
    },

    async periods(hotelId) {
      const { data, error } = await supabase
        .schema('data')
        .from('reporting_periods')
        .select('id,period_start,status')
        .eq('hotel_id', hotelId)
        .order('period_start', { ascending: false })
      if (error) throw new Error(`overview.periods: ${error.message}`)
      return (data ?? []).map((row) => ({
        id: String(row.id),
        month: String(row.period_start).slice(0, 7),
        status: String(row.status),
      }))
    },

    async occupiedRoomNights(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .from('activity_records')
        .select('occupied_room_nights')
        .eq('period_id', periodId)
        .maybeSingle()
      if (error) throw new Error(`overview.occupiedRoomNights: ${error.message}`)
      return data ? String(data.occupied_room_nights) : null
    },

    async guestNights(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .from('activity_records')
        .select('guest_nights')
        .eq('period_id', periodId)
        .maybeSingle()
      if (error) throw new Error(`overview.guestNights: ${error.message}`)
      return data?.guest_nights === null || data?.guest_nights === undefined
        ? null
        : String(data.guest_nights)
    },

    async wasteLines(periodId) {
      // treatment_class is null exactly where §15.4.1 established no destination. It is
      // passed through as null rather than defaulted: the engine has its own outcome for
      // that, and choosing one here would invent a fact about where the waste went.
      const { data, error } = await supabase
        .schema('waste')
        .from('month_lines')
        .select('stream,treatment_class,weight_kg')
        .eq('period_id', periodId)
      if (error) throw new Error(`overview.wasteLines: ${error.message}`)
      return (data ?? []).map((row) => ({
        stream: String((row as { stream: string }).stream),
        treatmentClass:
          (row as { treatment_class: string | null }).treatment_class === null
            ? null
            : String((row as { treatment_class: string }).treatment_class),
        kg: String((row as { weight_kg: number }).weight_kg),
      }))
    },

    /**
     * One resource's approved monthly totals across a window of months.
     *
     * Two joins in one query rather than a query per month: the trend needs twenty-four
     * months (twelve, and each one's prior year), and twenty-four round trips to draw one
     * chart is a page that loads in seconds rather than in one.
     *
     * `corrected = false` for the same reason resourceTotals has it — a corrected reading
     * is retained beside its replacement, and summing both counts the mistake as well as
     * the fix.
     */
    async monthlyTotals(hotelId, resource, months) {
      if (months.length === 0) return new Map()
      const wanted = [...new Set(months)]

      // Waste is not a resource_record and never was: data.resource enumerates metered
      // supplies, and a stream that leaves through a contractor has a destination rather
      // than a meter (migration 027). So it has its own table and its own query here,
      // rather than this reaching for a row that does not exist and returning an empty
      // chart that looks like a hotel producing no waste.
      if (resource === 'waste') {
        // TWO QUERIES, NOT AN EMBED. waste.records and data.reporting_periods live in
        // different schemas, and PostgREST resolves an embed from a foreign key it can see
        // within one — asked to join across, it answers "could not find a relationship
        // between 'records' and 'reporting_periods' in the schema cache". That is a
        // RUNTIME error: the query typechecks, builds, and 500s on the first request.
        const { data: periodRows, error: periodError } = await supabase
          .schema('data')
          .from('reporting_periods')
          .select('id,period_start')
          .eq('hotel_id', hotelId)
          // §24.8: only an approved month counts toward a trend.
          .eq('status', 'approved')
          .in(
            'period_start',
            wanted.map((m) => `${m}-01`),
          )
        if (periodError) {
          throw new Error(`overview.monthlyTotals.waste.periods: ${periodError.message}`)
        }

        const monthOfPeriod = new Map(
          (periodRows ?? []).map((p) => [String(p.id), String(p.period_start).slice(0, 7)]),
        )
        if (monthOfPeriod.size === 0) return new Map()

        const { data, error } = await supabase
          .schema('waste')
          .from('records')
          .select('period_id,weight_kg')
          .in('period_id', [...monthOfPeriod.keys()])
        if (error) throw new Error(`overview.monthlyTotals.waste: ${error.message}`)

        const wasteTotals = new Map<string, string>()
        for (const row of data ?? []) {
          const month = monthOfPeriod.get(String((row as { period_id: string }).period_id))
          if (month === undefined) continue
          wasteTotals.set(
            month,
            dec(wasteTotals.get(month) ?? '0')
              .plus(dec(String((row as { weight_kg: number | string }).weight_kg)))
              .toFixed(),
          )
        }
        return wasteTotals
      }

      const { data, error } = await supabase
        .schema('data')
        .from('resource_records')
        .select(
          'value,canonical_unit,reporting_periods!inner(period_start,status,hotel_id),resource_sources!inner(resource)',
        )
        .eq('corrected', false)
        .eq('reporting_periods.hotel_id', hotelId)
        // §24.8: only an approved month counts toward a trend.
        .eq('reporting_periods.status', 'approved')
        .in(
          'reporting_periods.period_start',
          wanted.map((m) => `${m}-01`),
        )
      if (error) throw new Error(`overview.monthlyTotals: ${error.message}`)

      const totals = new Map<string, string>()
      // Which units each month's records are in. A month holding two of them has no total,
      // and a trend line is the last place to invent one: a point on a chart carries no
      // caveat and gets read as a measurement.
      const unitsByMonth = new Map<string, Set<string>>()
      for (const row of data ?? []) {
        const source = firstEmbedded<{ resource: string }>(
          (row as { resource_sources?: unknown }).resource_sources,
        )
        if (!source || RESOURCE_GROUP[source.resource] !== resource) continue
        const period = firstEmbedded<{ period_start: string }>(
          (row as { reporting_periods?: unknown }).reporting_periods,
        )
        if (!period) continue
        const month = String(period.period_start).slice(0, 7)
        const seen = unitsByMonth.get(month) ?? new Set<string>()
        seen.add(unitDimension(String((row as { canonical_unit: string }).canonical_unit)))
        unitsByMonth.set(month, seen)
        totals.set(
          month,
          dec(totals.get(month) ?? '0')
            .plus(dec(String((row as { value: number | string }).value)))
            .toFixed(),
        )
      }
      for (const [month, seen] of unitsByMonth) {
        if (seen.size > 1) totals.delete(month)
      }
      return totals
    },

    /**
     * Every month this hotel holds for a resource — the training window's raw material.
     *
     * ALL of them, including the ones a model may not use. Which months were excluded and
     * why is what the card says when a verdict is not available, and a query that filtered
     * to approved months here would leave "insufficient history" as the only thing anyone
     * could ever be told — when the actionable answer is often "six months are sitting
     * unapproved".
     *
     * The quality tier is the worst tier among the month's readings, not the first one
     * found: a month with one estimated meter among four is an estimated month for App.
     * B.4's purposes, because the value the model would learn from carries that estimate.
     */
    async modelHistory(hotelId, resource) {
      const { data, error } = await supabase
        .schema('data')
        .from('resource_records')
        .select(
          'value,quality_tier,period_id,import_batch_id,reporting_periods!inner(period_start,status,hotel_id),resource_sources!inner(resource),import_batches:import_batch_id(attested_at)',
        )
        .eq('corrected', false)
        .eq('reporting_periods.hotel_id', hotelId)
      if (error) throw new Error(`overview.modelHistory: ${error.message}`)

      // A migrated month trains a model only once a named client user has attested the
      // batch it arrived in (SPEC-04B §2.1a, Guide §3.1). Until then it displays in the
      // trend and is not eligible: here that is "not approved for modelling".
      const unattested = (row: unknown): boolean => {
        const r = row as { import_batch_id?: unknown; import_batches?: unknown }
        if (r.import_batch_id === null || r.import_batch_id === undefined) return false
        const batch = firstEmbedded<{ attested_at: unknown }>(r.import_batches)
        return !batch || batch.attested_at === null || batch.attested_at === undefined
      }

      const TIER_ORDER: Record<string, number> = { measured: 0, estimated: 1, proxy: 2 }
      const months = new Map<
        string,
        { value: string; tier: string; approved: boolean; periodId: string }
      >()
      for (const row of data ?? []) {
        const source = firstEmbedded<{ resource: string }>(
          (row as { resource_sources?: unknown }).resource_sources,
        )
        if (!source || RESOURCE_GROUP[source.resource] !== resource) continue
        const period = firstEmbedded<{ period_start: string; status: string }>(
          (row as { reporting_periods?: unknown }).reporting_periods,
        )
        if (!period) continue

        const month = String(period.period_start).slice(0, 7)
        const tier = String((row as { quality_tier: string }).quality_tier)
        const current = months.get(month)
        months.set(month, {
          value: dec(current?.value ?? '0')
            .plus(dec(String((row as { value: number | string }).value)))
            .toFixed(),
          tier:
            current === undefined || (TIER_ORDER[tier] ?? 0) > (TIER_ORDER[current.tier] ?? 0)
              ? tier
              : current.tier,
          approved:
            String(period.status) === 'approved' && !unattested(row) && current?.approved !== false,
          periodId: String((row as { period_id: string }).period_id),
        })
      }
      if (months.size === 0) return []

      const { data: activity, error: activityError } = await supabase
        .schema('data')
        .from('activity_records')
        .select('period_id,occupied_room_nights')
        .in(
          'period_id',
          [...months.values()].map((m) => m.periodId),
        )
      if (activityError) throw new Error(`overview.modelHistory.activity: ${activityError.message}`)

      const ornByPeriod = new Map(
        (activity ?? []).map((a) => [
          String(a.period_id),
          a.occupied_room_nights === null ? null : Number(a.occupied_room_nights),
        ]),
      )

      // The degree-day series, if anyone has recorded one for this hotel.
      //
      // No base-temperature filter: a hotel has one series, at whatever base it was
      // computed for, and that base is stored beside the figure so a model built on it
      // stays reproducible (App. B.5, O-01). Two bases for one hotel-month would be two
      // series and is a configuration question, not something to resolve by guessing here.
      const { data: degreeDays, error: degreeDayError } = await supabase
        .schema('climate')
        .from('degree_day_series')
        .select('month,cooling_degree_days,source')
        .eq('hotel_id', hotelId)
      if (degreeDayError) {
        throw new Error(`overview.modelHistory.degreeDays: ${degreeDayError.message}`)
      }
      const cddByMonth = new Map(
        (degreeDays ?? []).map((d) => [
          String(d.month).slice(0, 7),
          {
            value: Number(d.cooling_degree_days),
            source: String((d as { source: string }).source),
          },
        ]),
      )

      return [...months].map(([month, m]) => ({
        month,
        value: Number(m.value),
        tier: m.tier as 'measured' | 'estimated' | 'proxy',
        approved: m.approved,
        occupiedRoomNights: ornByPeriod.get(m.periodId) ?? null,
        coolingDegreeDays: cddByMonth.get(month)?.value ?? null,
        coolingDegreeDaysSource: cddByMonth.get(month)?.source ?? null,
      }))
    },

    async trainingWindow(hotelId, resource) {
      return loadWindowState(supabase, hotelId, resource)
    },

    async energyByResource(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .from('resource_records')
        .select('value,canonical_unit,resource_sources!inner(resource)')
        .eq('period_id', periodId)
        .eq('corrected', false)
      if (error) throw new Error(`overview.energyByResource: ${error.message}`)

      const byResource = new Map<string, { kwh: string; unit: string }>()
      for (const row of data ?? []) {
        const source = firstEmbedded<{ resource: string }>(
          (row as { resource_sources?: unknown }).resource_sources,
        )
        if (!source || RESOURCE_GROUP[source.resource] !== 'energy') continue
        const current = byResource.get(source.resource) ?? {
          kwh: '0',
          unit: String((row as { canonical_unit: string }).canonical_unit),
        }
        byResource.set(source.resource, {
          kwh: dec(current.kwh)
            .plus(dec(String((row as { value: number | string }).value)))
            .toFixed(),
          unit: current.unit,
        })
      }
      return [...byResource].map(([resource, v]) => ({ resource, kwh: v.kwh, unit: v.unit }))
    },

    /**
     * Every ACTIVE factor version, joined to its set.
     *
     * Active AND superseded, because a superseded version is still the version that was
     * in force for its own months — that is what makes a published figure reproducible
     * (App. F, O-01). Fetching only the active one meant that publishing a 2026 factor
     * turned every 2025 emission into "not calculated".
     *
     * Draft is excluded because nobody approved it, and withdrawn because somebody
     * retracted it; the resolver applies the same rule and is where it is tested.
     */
    /**
     * The grid factor for this property in this month.
     *
     * A separate port from factorCatalogue because it is a different question. The
     * catalogue is "every factor version, filter it yourself"; this is "what applies HERE,
     * on this date", and the answer depends on the property's grid, on which vintages the
     * publisher has issued, and on rules the database holds — a national average is
     * refused where one would misstate, a held factor is blocked with its reason. Asking
     * the database means those rules cannot be half-implemented in TypeScript.
     */
    async gridFactor(country, gridCode, onDate) {
      const { data, error } = await supabase.schema('factors').rpc('resolve_grid', {
        p_country: country,
        p_grid_code: gridCode,
        p_on: onDate,
      })
      if (error) throw new Error(`overview.gridFactor: ${error.message}`)
      const row = (data ?? [])[0] as
        | {
            value: string | null
            gas_basis: string | null
            boundary: string | null
            reliability: string | null
            usable: boolean
            warn: string | null
            factor_year: number | null
            edition: string | null
            carried_forward: boolean | null
            source_reference: string | null
            refusal: string | null
          }
        | undefined
      if (!row) return null
      return {
        value: row.value === null ? null : String(row.value),
        gasBasis: row.gas_basis,
        boundary: row.boundary,
        reliability: row.reliability,
        usable: row.usable === true,
        warn: row.warn,
        factorYear: row.factor_year,
        edition: row.edition,
        carriedForward: row.carried_forward === true,
        sourceReference: row.source_reference,
        refusal: row.refusal,
      }
    },

    /**
     * The factor for a burned fuel, asked of the published library.
     *
     * Same shape of question as gridFactor and asked the same way: which series applies to
     * THIS resource, in THIS unit, on THIS date. The binding that answers "which series"
     * is a row in the database carrying its own justification, so the choice of DEFRA's
     * mineral diesel over its biofuel blend is something a reader can find and dispute,
     * rather than a constant somebody would have to read this file to discover.
     */
    async activityFactor(tenantId, code, unit, onDate) {
      const { data, error } = await supabase.schema('factors').rpc('select_for_line', {
        p_tenant_id: tenantId,
        p_on: onDate,
        p_description: code,
        p_domain: 'resource',
        p_code: code,
        p_quantity: 1,
        p_unit: unit,
      })
      if (error) throw new Error(`overview.activityFactor(${code}): ${error.message}`)
      const row = (data ?? [])[0] as
        | {
            route: string | null
            factor_value: string | null
            factor_unit: string | null
            publisher: string | null
            edition: string | null
            carried_forward: boolean | null
            activity_path: string[] | null
            refusal: string | null
          }
        | undefined
      // Only the activity route answers for a metered resource. A spend answer here would
      // be a different question, answered against money this card is not holding.
      if (!row || row.route !== 'activity') return null
      return {
        value: row.factor_value === null ? null : String(row.factor_value),
        unit: row.factor_unit ?? unit,
        publisher: row.publisher,
        edition: row.edition,
        carriedForward: row.carried_forward === true,
        activityPath: row.activity_path ?? [],
        refusal: row.refusal,
      }
    },

    /**
     * Refrigerant service events for one month.
     *
     * Through a function, not a table read: `assets` is deliberately not served over REST,
     * and the choice when one screen needs one thing out of it is to answer the question
     * rather than open the schema.
     */
    async refrigerantEvents(hotelId, month) {
      const { data, error } = await supabase
        .schema('data')
        .rpc('refrigerant_events_in_month', { p_hotel_id: hotelId, p_month: month })
      if (error) throw new Error(`overview.refrigerantEvents: ${error.message}`)
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        assetId: String(r.asset_id),
        assetName: String(r.asset_name),
        gas: String(r.gas),
        method: String(r.method) as RefrigerantEventRow['method'],
        nameplateChargeKg: String(r.nameplate_charge_kg ?? '0'),
        eventType: String(r.event_type) as RefrigerantEventRow['eventType'],
        quantityKg: String(r.quantity_kg ?? '0'),
        date: String(r.event_date),
        recoveredKg:
          r.recovered_kg === null || r.recovered_kg === undefined ? null : String(r.recovered_kg),
        evidenceReference:
          r.evidence_reference === null || r.evidence_reference === undefined
            ? null
            : String(r.evidence_reference),
        technician:
          r.technician === null || r.technician === undefined ? null : String(r.technician),
      }))
    },

    async refrigerantGwp(gas, onDate) {
      const { data, error } = await supabase
        .schema('factors')
        .rpc('refrigerant_gwp', { p_gas: gas, p_on: onDate })
      if (error) throw new Error(`overview.refrigerantGwp(${gas}): ${error.message}`)
      const row = (data ?? [])[0] as Record<string, unknown> | undefined
      if (!row) return null
      return {
        value: row.value === null || row.value === undefined ? null : String(row.value),
        allProducts:
          row.value_all_products === null || row.value_all_products === undefined
            ? null
            : String(row.value_all_products),
        edition: row.edition === null || row.edition === undefined ? null : String(row.edition),
        activityPath: (row.activity_path as string[] | null) ?? [],
        refusal: row.refusal === null || row.refusal === undefined ? null : String(row.refusal),
      }
    },

    async factorCatalogue() {
      const { data, error } = await supabase
        .schema('factors')
        .from('factor_versions')
        .select(
          'id,version,value,unit,status,effective_from,effective_to,factor_sets!inner(type,code,scope,source)',
        )
        .in('status', ['active', 'superseded'])
      if (error) throw new Error(`overview.factorCatalogue: ${error.message}`)

      const out = []
      for (const row of data ?? []) {
        const set = firstEmbedded<{
          type: string
          code: string
          scope: string
          source: string
        }>((row as { factor_sets?: unknown }).factor_sets)
        if (!set) continue
        out.push({
          id: String((row as { id: string }).id),
          type: set.type as FactorVersion['type'],
          code: String(set.code),
          scope: String(set.scope),
          source: String(set.source),
          version: String((row as { version: string }).version),
          value: String((row as { value: number | string }).value),
          unit: String((row as { unit: string }).unit),
          status: String((row as { status: string }).status) as FactorVersion['status'],
          effectiveFrom: String((row as { effective_from: string }).effective_from),
          effectiveTo:
            (row as { effective_to: string | null }).effective_to === null
              ? null
              : String((row as { effective_to: string }).effective_to),
        })
      }
      return out
    },

    async resourceTotals(periodId) {
      const { data, error } = await supabase
        .schema('data')
        .from('resource_records')
        .select('value,canonical_unit,quality_tier,estimation_method,resource_sources(resource)')
        .eq('period_id', periodId)
        // Current values only. A correction retains the value it replaced (§6.6, CON-05),
        // so from migration 022 onward a source can hold several rows for one month and
        // summing them all counts the mistake as well as the fix: a hotel that corrected
        // 168,400 kWh down to 141,900 had its August published as 310,300. Before 022 the
        // unique constraint made more than one row impossible, so this filter was not
        // merely missing — there was nothing for it to exclude.
        .eq('corrected', false)
      if (error) throw new Error(`overview.resourceTotals: ${error.message}`)

      // Decimal, not JavaScript addition. Summing 624575.4 out of twenty float values
      // produced 624575.3999999999, and App. C.3 is explicit that no floating-point type
      // reaches a reported figure — a total is a reported figure the moment it is on a
      // screen, whatever it was called on the way there.
      const groups = new Map<
        'energy' | 'water',
        {
          total: string
          unit: string
          units: Set<string>
          estimated: ResourceTotal['estimatedInputs']
        }
      >()
      for (const row of data ?? []) {
        const source = firstEmbedded<{ resource: string }>(
          (row as { resource_sources?: unknown }).resource_sources,
        )
        const group = source ? RESOURCE_GROUP[source.resource] : undefined
        if (!group) continue
        const current = groups.get(group) ?? {
          total: '0',
          unit: unitDimension(String((row as { canonical_unit: string }).canonical_unit)),
          // EVERY unit seen, not just the first. Taking the first row's unit and summing
          // the rest is how litres of diesel got added to kilowatt-hours of electricity
          // and the answer was labelled kWh.
          units: new Set<string>(),
          estimated: [],
        }
        current.units.add(unitDimension(String((row as { canonical_unit: string }).canonical_unit)))
        const tier = String((row as { quality_tier: string }).quality_tier)
        groups.set(group, {
          total: dec(current.total)
            .plus(dec(String((row as { value: number | string }).value)))
            .toFixed(),
          unit: current.unit,
          units: current.units,
          // One marker, naming the inputs. Never a tier percentage (§5.2, T-13).
          estimated:
            tier === 'measured'
              ? current.estimated
              : [
                  ...(current.estimated ?? []),
                  {
                    // The LABEL, never the code. This shipped as `water_municipal` on the
                    // overview — a database identifier on a hotel manager's screen
                    // (FE-01 §3.5). labelForResource is the one place resource wording
                    // lives, and it already had the answer.
                    label: source ? labelForResource(source.resource) : group,
                    tier: tier as 'estimated' | 'proxy',
                    method: String(
                      (row as { estimation_method?: string }).estimation_method ??
                        'method not stated',
                    ),
                  },
                ],
        })
      }

      const out: ResourceTotal[] = []

      // Waste is not a metered supply and has no row in resource_records; its total is the
      // sum of the month's lines. Without this the waste card reports "no approved waste
      // record" over a month that has one, which is what it did for every month of every
      // hotel until waste could be written at all.
      const { data: wasteRows, error: wasteError } = await supabase
        .schema('waste')
        .from('month_lines')
        .select('weight_kg,quality_tier,estimation_method,stream')
        .eq('period_id', periodId)
      if (wasteError) throw new Error(`overview.wasteTotal: ${wasteError.message}`)
      if ((wasteRows ?? []).length > 0) {
        let kg = dec('0')
        const estimated: { label: string; tier: 'estimated' | 'proxy'; method: string }[] = []
        for (const row of wasteRows ?? []) {
          kg = kg.plus(dec(String((row as { weight_kg: number }).weight_kg)))
          const tier = String((row as { quality_tier: string }).quality_tier)
          if (tier !== 'measured') {
            estimated.push({
              label: String((row as { stream: string }).stream),
              tier: tier as 'estimated' | 'proxy',
              method: String(
                (row as { estimation_method?: string }).estimation_method ?? 'method not stated',
              ),
            })
          }
        }
        out.push({
          resource: 'waste',
          total: kg.toFixed(),
          unit: 'kg',
          ...(estimated.length > 0 ? { estimatedInputs: estimated } : {}),
        })
      }

      for (const [resource, g] of groups) {
        const units = [...g.units].sort()
        out.push({
          resource,
          total: g.total,
          unit: g.unit,
          ...(units.length > 1 ? { mixedUnits: units } : {}),
          ...(g.estimated && g.estimated.length > 0 ? { estimatedInputs: g.estimated } : {}),
        })
      }
      return out
    },

    /**
     * The same RPC the purchases screen reads, summed.
     *
     * Not a separate aggregate in SQL: a total computed by a second query is a second
     * place the freezing rule could be got wrong, and the two screens would then be able
     * to disagree about the same month. This reads the lines and adds them, so the card
     * and the register are arithmetic on one list.
     */
    async purchaseTotals(periodId, hotelId): Promise<PurchaseTotals> {
      // Asked first, and separately. The lines RPC returns an empty set both to a month
      // with no invoices and to a reader without procurement, and the card has to say
      // different things about those two. Reading the reader's own grants is the only way
      // to tell them apart from here; access.my_actions reports what they hold and grants
      // nothing, which is why nav already reads it.
      const { data: actions, error: actionsError } = await supabase
        .schema('access')
        .rpc('my_actions', { p_hotel_id: hotelId })
      if (actionsError) throw new Error(`overview.purchaseTotals.actions: ${actionsError.message}`)

      const visible = ((actions ?? []) as Record<string, unknown>[]).some(
        (row) =>
          String(row['module']) === 'data' &&
          String(row['action']) === 'V' &&
          String(row['data_category']) === 'procurement',
      )
      if (!visible) return { visible: false, kg: null, lines: 0, uncomputed: 0 }

      const { data, error } = await supabase
        .schema('data')
        .rpc('spend_lines_for_period', { p_period_id: periodId })
      if (error) throw new Error(`overview.purchaseTotals: ${error.message}`)

      const rows = (data ?? []) as Record<string, unknown>[]
      if (rows.length === 0) return { visible: true, kg: null, lines: 0, uncomputed: 0 }

      let total = dec('0')
      let uncomputed = 0
      for (const row of rows) {
        const kg = row['emissions_kg']
        if (kg === null || kg === undefined) uncomputed += 1
        else total = total.plus(dec(String(kg)))
      }
      return {
        visible: true,
        kg: total.toDecimalPlaces(0).toFixed(0),
        lines: rows.length,
        uncomputed,
      }
    },

    async attentionItems(hotelId): Promise<readonly AttentionItem[]> {
      const { data, error } = await supabase
        .schema('data')
        .from('reporting_periods')
        .select('id,period_start,status')
        .eq('hotel_id', hotelId)
        .in('status', ['draft', 'returned'])
        .order('period_start', { ascending: true })
        .limit(10)
      if (error) throw new Error(`overview.attentionItems: ${error.message}`)

      return (data ?? []).map((row): AttentionItem => {
        const status = String((row as { status: string }).status)
        const month = formatReportingMonth(
          String((row as { period_start: string }).period_start).slice(0, 7),
          locale,
        )
        // No dueDate. The period's start date was being passed as one, which rendered as
        // "due 2026-06-01" against a month that STARTED then — a deadline the platform
        // invented and then displayed as fact. A submission deadline is a reporting
        // calendar concern (§4.3); until a calendar supplies one there is no due date, and
        // §5.6 already sorts items without one after items that have one.
        return {
          kind: status === 'returned' ? 'returned_submission' : 'missing_data',
          title:
            status === 'returned'
              ? `${month} was returned for correction`
              : `${month} has not been submitted`,
          severity: status === 'returned' ? 'critical' : 'material',
          href: `/hotel/${hotelId}/data/${String((row as { id: string }).id)}`,
        }
      })
    },
  }
}
