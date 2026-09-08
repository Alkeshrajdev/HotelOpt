/**
 * Reading measures under the caller's session, so RLS answers.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { registerStrip } from '@/engine/mv'
import { labelForResource } from '@/services/entry/model'
import { namesOf } from '@/services/entry/ports.supabase'
import type {
  Determination,
  MeasureKind,
  MeasureModel,
  MeasurePermissions,
  MeasureRow,
  MeasureSaving,
  MeasureState,
  MeasuresModel,
  VerificationPlan,
} from './model'

interface MeasureRecord {
  id: string
  kind: string
  title: string
  description: string | null
  location: string | null
  resource: string
  status: string
  implemented_on: string | null
  cost: number | string | null
  cost_currency: string | null
  abandoned_reason: string | null
  recorded_by: string
  recorded_at: string
}

interface DeterminationRecord {
  id: string
  measure_id: string
  plan_id: string
  basis: string
  reporting_from: string
  reporting_to: string
  unit: string
  saving: number | string
  adjusted_baseline: number | string
  reporting_consumption: number | string
  reconciliation_difference: number | string
  reconciliation_percent: number | string | null
  reconciliation_outcome: string
  published_lines: unknown
  determined_at: string
  signed_by: string | null
  signed_at: string | null
}

interface PlanRecord {
  id: string
  measure_id: string
  version: number
  ipmvp_option: string
  baseline_from: string
  baseline_to: string
  baseline_snapshot: unknown
  routine_drivers: string[]
  non_routine_criteria: string
  reporting_months: number
  measurement_boundary: string
  signatory_name: string
  signatory_role: string
  failure_criteria: string
  agreed_by: string
  agreed_at: string
  superseded_at: string | null
  superseded_reason: string | null
}

interface ActionRow {
  module: string
  action: string
}

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

async function held(supabase: SupabaseClient, hotelId: string): Promise<Set<string>> {
  const { data } = await supabase.schema('access').rpc('my_actions', { p_hotel_id: hotelId })
  return new Set(((data ?? []) as ActionRow[]).map((r) => `${r.module}:${r.action}`))
}

function savingOf(
  d: DeterminationRecord | undefined,
  signatoryName: string | null,
): MeasureSaving | null {
  if (!d) return null
  return {
    basis: String(d.basis) as MeasureSaving['basis'],
    value: String(d.saving),
    unit: String(d.unit),
    signatoryName,
  }
}

function rowOf(
  m: MeasureRecord,
  latest: DeterminationRecord | undefined,
  names: Map<string, string>,
): MeasureRow {
  return {
    id: String(m.id),
    kind: String(m.kind) as MeasureKind,
    title: String(m.title),
    resource: String(m.resource),
    resourceLabel: labelForResource(String(m.resource)),
    status: String(m.status) as MeasureState,
    implementedOn: text(m.implemented_on),
    cost: text(m.cost),
    costCurrency: text(m.cost_currency),
    saving: savingOf(
      latest,
      latest?.signed_by ? (names.get(String(latest.signed_by)) ?? null) : null,
    ),
  }
}

/** The latest determination per measure. */
function latestByMeasure(rows: readonly DeterminationRecord[]): Map<string, DeterminationRecord> {
  const out = new Map<string, DeterminationRecord>()
  for (const d of rows) {
    const key = String(d.measure_id)
    const have = out.get(key)
    if (!have || String(d.determined_at) > String(have.determined_at)) out.set(key, d)
  }
  return out
}

/** Null where the hotel is outside the reader's grants — 404, never 403 (§2.5). */
export async function loadMeasuresModel(
  supabase: SupabaseClient,
  hotelId: string,
): Promise<MeasuresModel | null> {
  const { data: hotel } = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (!hotel) return null

  const [measuresResult, determinationsResult, actions] = await Promise.all([
    supabase
      .schema('mv')
      .from('measures')
      .select(
        'id,kind,title,description,location,resource,status,implemented_on,cost,cost_currency,abandoned_reason,recorded_by,recorded_at',
      )
      .eq('hotel_id', hotelId)
      .order('recorded_at', { ascending: false }),
    supabase
      .schema('mv')
      .from('determinations')
      .select(
        'id,measure_id,plan_id,basis,reporting_from,reporting_to,unit,saving,adjusted_baseline,reporting_consumption,reconciliation_difference,reconciliation_percent,reconciliation_outcome,published_lines,determined_at,signed_by,signed_at',
      )
      .eq('hotel_id', hotelId),
    held(supabase, hotelId),
  ])
  if (measuresResult.error) throw new Error(`measures: ${measuresResult.error.message}`)

  const measures = (measuresResult.data ?? []) as MeasureRecord[]
  const latest = latestByMeasure((determinationsResult.data ?? []) as DeterminationRecord[])
  const names = await namesOf(
    supabase,
    [...latest.values()].map((d) => d.signed_by),
  )
  const rows = measures.map((m) => rowOf(m, latest.get(String(m.id)), names))

  return {
    hotelId,
    hotelName: String(hotel.name),
    rows,
    strip: registerStrip(rows),
    mayEdit: actions.has('mv:E'),
  }
}

function planOf(p: PlanRecord, names: Map<string, string>): VerificationPlan {
  const snapshot = Array.isArray(p.baseline_snapshot) ? p.baseline_snapshot : []
  return {
    id: String(p.id),
    version: Number(p.version),
    ipmvpOption: String(p.ipmvp_option) as VerificationPlan['ipmvpOption'],
    baselineFrom: String(p.baseline_from),
    baselineTo: String(p.baseline_to),
    baselineMonths: new Set(
      snapshot.map((s) => String((s as { period_start?: unknown }).period_start ?? '')),
    ).size,
    routineDrivers: (p.routine_drivers ?? []).map(String),
    nonRoutineCriteria: String(p.non_routine_criteria),
    reportingMonths: Number(p.reporting_months),
    measurementBoundary: String(p.measurement_boundary),
    signatoryName: String(p.signatory_name),
    signatoryRole: String(p.signatory_role),
    failureCriteria: String(p.failure_criteria),
    agreedAt: String(p.agreed_at),
    agreedByName: names.get(String(p.agreed_by)) ?? null,
    supersededAt: text(p.superseded_at),
    supersededReason: text(p.superseded_reason),
  }
}

function determinationOf(d: DeterminationRecord, names: Map<string, string>): Determination {
  const lines = Array.isArray(d.published_lines) ? d.published_lines.map(String) : []
  return {
    id: String(d.id),
    basis: String(d.basis) as Determination['basis'],
    reportingFrom: String(d.reporting_from),
    reportingTo: String(d.reporting_to),
    unit: String(d.unit),
    saving: String(d.saving),
    adjustedBaseline: String(d.adjusted_baseline),
    reportingConsumption: String(d.reporting_consumption),
    reconciliationDifference: String(d.reconciliation_difference),
    reconciliationPercent: text(d.reconciliation_percent),
    reconciliationOutcome: String(
      d.reconciliation_outcome,
    ) as Determination['reconciliationOutcome'],
    publishedLines: lines,
    determinedAt: String(d.determined_at),
    signedAt: text(d.signed_at),
    signedByName: d.signed_by ? (names.get(String(d.signed_by)) ?? null) : null,
  }
}

/** Null where the measure is not at this hotel or not visible (§2.5). */
export async function loadMeasureModel(
  supabase: SupabaseClient,
  hotelId: string,
  measureId: string,
  userId: string,
): Promise<MeasureModel | null> {
  const { data: hotel } = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (!hotel) return null

  const [measureResult, plansResult, determinationsResult, actions] = await Promise.all([
    supabase
      .schema('mv')
      .from('measures')
      .select(
        'id,kind,title,description,location,resource,status,implemented_on,cost,cost_currency,abandoned_reason,recorded_by,recorded_at',
      )
      .eq('id', measureId)
      .eq('hotel_id', hotelId)
      .maybeSingle(),
    supabase
      .schema('mv')
      .from('verification_plans')
      .select(
        'id,measure_id,version,ipmvp_option,baseline_from,baseline_to,baseline_snapshot,routine_drivers,non_routine_criteria,reporting_months,measurement_boundary,signatory_name,signatory_role,failure_criteria,agreed_by,agreed_at,superseded_at,superseded_reason',
      )
      .eq('measure_id', measureId)
      .order('version', { ascending: false }),
    supabase
      .schema('mv')
      .from('determinations')
      .select(
        'id,measure_id,plan_id,basis,reporting_from,reporting_to,unit,saving,adjusted_baseline,reporting_consumption,reconciliation_difference,reconciliation_percent,reconciliation_outcome,published_lines,determined_at,signed_by,signed_at',
      )
      .eq('measure_id', measureId)
      .order('determined_at', { ascending: false }),
    held(supabase, hotelId),
  ])
  const m = measureResult.data as MeasureRecord | null
  if (!m) return null

  const plans = (plansResult.data ?? []) as PlanRecord[]
  const determinations = (determinationsResult.data ?? []) as DeterminationRecord[]
  const names = await namesOf(supabase, [
    m.recorded_by,
    ...plans.map((p) => p.agreed_by),
    ...determinations.map((d) => d.signed_by),
  ])
  const latest = determinations[0]
  const row = rowOf(m, latest, names)
  const inForce = plans.find((p) => p.superseded_at === null) ?? null

  const permitted: MeasurePermissions = {
    mayEdit: actions.has('mv:E'),
    // Signing is mv:G and never the recorder's (SPEC-04F §2.4); the database refuses both,
    // and the screen offers the control only where it would not be refused.
    maySign: actions.has('mv:G') && String(m.recorded_by) !== userId,
  }

  return {
    hotelId,
    hotelName: String(hotel.name),
    measure: {
      ...row,
      description: text(m.description),
      location: text(m.location),
      recordedAt: String(m.recorded_at),
      recordedByName: names.get(String(m.recorded_by)) ?? null,
      abandonedReason: text(m.abandoned_reason),
    },
    plan: inForce ? planOf(inForce, names) : null,
    supersededPlans: plans.filter((p) => p.superseded_at !== null).map((p) => planOf(p, names)),
    determinations: determinations.map((d) => determinationOf(d, names)),
    permitted,
  }
}
