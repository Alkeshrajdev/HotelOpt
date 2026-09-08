/**
 * Reading the month editor's state.
 *
 * All reads run under the caller's session, so RLS answers them. The permissions come from
 * access.my_actions, which reports what the reader holds at this hotel; it grants nothing,
 * and every write still asks access.may() again inside the function that performs it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  categoryOfResource,
  isOpenForEntry,
  labelForResource,
  labelForTreatmentClass,
  nextMonthAfter,
  submitBlockedBecause,
} from './model'
import type {
  ActivityValues,
  DestinationMethod,
  EntryPermissions,
  EvidenceDocument,
  MonthEditorModel,
  PeriodStatus,
  SourceRow,
  WasteBlock,
  WasteDestination,
  WasteLine,
  WasteSourceKind,
  WeightBasis,
} from './model'
import { labelForStream } from '@/services/overview'

interface ActionRow {
  module: string
  action: string
  data_category: string | null
}

export async function loadPermissions(
  supabase: SupabaseClient,
  hotelId: string,
): Promise<EntryPermissions> {
  const { data, error } = await supabase.schema('access').rpc('my_actions', { p_hotel_id: hotelId })
  if (error) throw new Error(`entry.permissions: ${error.message}`)

  const rows = (data ?? []) as ActionRow[]
  const has = (module: string, action: string) =>
    rows.some((r) => r.module === module && r.action === action)

  return {
    editableCategories: [
      ...new Set(
        rows
          .filter((r) => r.module === 'data' && r.action === 'E' && r.data_category !== null)
          .map((r) => String(r.data_category)),
      ),
    ],
    canReview: has('approval', 'V'),
    canSubmit: has('data', 'S'),
    canApprove: has('approval', 'A'),
    canReturn: has('approval', 'R'),
    canReopen: has('approval', 'O'),
  }
}

export async function loadMonthEditor(
  supabase: SupabaseClient,
  periodId: string,
): Promise<MonthEditorModel | null> {
  const { data: period, error } = await supabase
    .schema('data')
    .from('reporting_periods')
    .select('id,hotel_id,period_start,status,returned_reason,submitted_by,approved_by')
    .eq('id', periodId)
    .maybeSingle()
  if (error) throw new Error(`entry.period: ${error.message}`)
  if (!period) return null

  const hotelId = String(period.hotel_id)

  // The month this editor is for, as the two dates a supply's effective range is compared
  // against. A meter registered from September must not appear on July's editor: offering
  // it invites a reading for a month the meter did not exist in, and nothing downstream
  // would ever question a figure that arrived through the normal form.
  //
  // Found the first time a supply was registered with a real start date — before that,
  // every source in the product was seeded open-ended and the filter's absence could not
  // show.
  const periodStart = String(period.period_start)
  const periodEnd = nextMonthAfter(periodStart)

  const [
    hotelResult,
    activityResult,
    sourcesResult,
    recordsResult,
    evidenceResult,
    wasteResult,
    destinationsResult,
    restatementResult,
    permitted,
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('hotels')
      .select('id,name,tenant_id')
      .eq('id', hotelId)
      .maybeSingle(),
    supabase
      .schema('data')
      .from('activity_records')
      .select(
        'gross_arn,rooms_out_of_order_nights,occupied_room_nights,guest_nights,guest_nights_derived,guests_per_room_factor,guests_per_room_source,fb_covers,operational_note',
      )
      .eq('period_id', periodId)
      .maybeSingle(),
    supabase
      .schema('data')
      .from('resource_sources')
      .select('id,resource,provider,account_reference,canonical_unit,included')
      .eq('hotel_id', hotelId)
      .eq('included', true)
      // Live at some point during this month: it started on or before the month ended,
      // and had not closed before the month began.
      .lt('effective_from', periodEnd)
      .or(`effective_to.is.null,effective_to.gt.${periodStart}`),
    supabase
      .schema('data')
      .from('resource_records')
      .select(
        'source_id,value,quality_tier,estimation_method,corrected,cost,cost_currency,fixed_charges',
      )
      .eq('period_id', periodId),
    supabase
      .schema('data')
      .from('evidence_for_reading')
      .select(
        'source_id,document_id,storage_path,document_type,checksum,attached_to_superseded_reading,created_at',
      )
      .eq('period_id', periodId)
      .order('created_at', { ascending: false }),
    supabase
      .schema('waste')
      .from('month_lines')
      .select(
        'id,stream,destination_id,destination_name,destination_method,treatment_class,weight_kg,weight_basis,source_of_record_used,quality_tier,estimation_method',
      )
      .eq('period_id', periodId),
    // RLS returns this client's facilities plus the shared ones (tenant_id null), so no
    // tenant filter is written here — writing one would be a second implementation of a
    // boundary the database already holds, and the two would drift.
    supabase
      .schema('waste')
      .from('treatment_destinations')
      .select('id,name,treatment_class,on_site')
      .order('name'),
    // Why this month was reopened, where it was. Read from the audit spine, because
    // reopen_period nulls approved_by and approved_at and the superseded approval survives
    // only in the event's before-image (migration 049).
    supabase.schema('data').rpc('restatement_of', { p_period_id: periodId }),
    loadPermissions(supabase, hotelId),
  ])

  if (hotelResult.error) throw new Error(`entry.hotel: ${hotelResult.error.message}`)
  if (activityResult.error) throw new Error(`entry.activity: ${activityResult.error.message}`)
  if (sourcesResult.error) throw new Error(`entry.sources: ${sourcesResult.error.message}`)
  if (recordsResult.error) throw new Error(`entry.records: ${recordsResult.error.message}`)
  if (evidenceResult.error) throw new Error(`entry.evidence: ${evidenceResult.error.message}`)
  if (wasteResult.error) throw new Error(`entry.waste: ${wasteResult.error.message}`)
  if (destinationsResult.error) {
    throw new Error(`entry.destinations: ${destinationsResult.error.message}`)
  }
  if (restatementResult.error) {
    throw new Error(`entry.restatement: ${restatementResult.error.message}`)
  }
  if (!hotelResult.data) return null

  const records = recordsResult.data ?? []
  const current = new Map<string, (typeof records)[number]>()
  const supersededCount = new Map<string, number>()
  for (const r of records) {
    const sourceId = String((r as { source_id: string }).source_id)
    if ((r as { corrected: boolean }).corrected) {
      supersededCount.set(sourceId, (supersededCount.get(sourceId) ?? 0) + 1)
    } else {
      current.set(sourceId, r)
    }
  }

  const evidenceBySource = new Map<string, EvidenceDocument[]>()
  for (const row of evidenceResult.data ?? []) {
    const sourceId = String((row as { source_id: string }).source_id)
    const list = evidenceBySource.get(sourceId) ?? []
    list.push({
      documentId: String((row as { document_id: string }).document_id),
      storagePath: String((row as { storage_path: string }).storage_path),
      documentType: String((row as { document_type: string }).document_type),
      checksum: String((row as { checksum: string }).checksum),
      supersededReading: Boolean(
        (row as { attached_to_superseded_reading: boolean }).attached_to_superseded_reading,
      ),
    })
    evidenceBySource.set(sourceId, list)
  }

  const status = String(period.status) as PeriodStatus

  // The client's reporting currency, read for the cost field's label and stated on the
  // record when a cost is entered without one (I-05). Null where the tenant row is not
  // readable, and the field then says "cost" without a code rather than guessing one.
  const { data: tenant } = await supabase
    .schema('core')
    .from('tenants')
    .select('reporting_currency')
    .eq('id', String((hotelResult.data as { tenant_id: unknown }).tenant_id))
    .maybeSingle()
  const currency = optionalText(
    (tenant as { reporting_currency?: unknown } | null)?.reporting_currency,
  )

  const sources: SourceRow[] = (sourcesResult.data ?? [])
    .map((s): SourceRow => {
      const id = String(s.id)
      const resource = String(s.resource)
      const category = categoryOfResource(resource)
      const record = current.get(id)
      return {
        sourceId: id,
        resource,
        label: labelForResource(resource),
        provider: s.provider === null || s.provider === undefined ? null : String(s.provider),
        accountReference:
          s.account_reference === null || s.account_reference === undefined
            ? null
            : String(s.account_reference),
        unit: String(s.canonical_unit),
        category,
        value: record ? String((record as { value: number }).value) : null,
        qualityTier: record
          ? (String((record as { quality_tier: string }).quality_tier) as SourceRow['qualityTier'])
          : null,
        estimationMethod: record
          ? ((record as { estimation_method: string | null }).estimation_method ?? null)
          : null,
        cost: record ? optionalText((record as { cost: unknown }).cost) : null,
        costCurrency: record
          ? optionalText((record as { cost_currency: unknown }).cost_currency)
          : null,
        fixedCharges: record
          ? optionalText((record as { fixed_charges: unknown }).fixed_charges)
          : null,
        correctionCount: supersededCount.get(id) ?? 0,
        editable: permitted.editableCategories.includes(category),
        evidence: evidenceBySource.get(id) ?? [],
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  const a = activityResult.data
  const activity: ActivityValues = {
    grossArn: a?.gross_arn === undefined || a?.gross_arn === null ? null : String(a.gross_arn),
    roomsOutOfOrder:
      a?.rooms_out_of_order_nights === undefined || a?.rooms_out_of_order_nights === null
        ? null
        : String(a.rooms_out_of_order_nights),
    occupiedRoomNights:
      a?.occupied_room_nights === undefined || a?.occupied_room_nights === null
        ? null
        : String(a.occupied_room_nights),
    guestNights:
      a?.guest_nights === undefined || a?.guest_nights === null ? null : String(a.guest_nights),
    guestNightsDerived: a?.guest_nights_derived === true,
    guestsPerRoomFactor:
      a?.guests_per_room_factor === undefined || a?.guests_per_room_factor === null
        ? null
        : String(a.guests_per_room_factor),
    guestsPerRoomSource:
      a?.guests_per_room_source === undefined || a?.guests_per_room_source === null
        ? null
        : String(a.guests_per_room_source),
    fbCovers: a?.fb_covers === undefined || a?.fb_covers === null ? null : String(a.fb_covers),
    note:
      a?.operational_note === undefined || a?.operational_note === null
        ? null
        : String(a.operational_note),
  }

  const waste: WasteBlock = {
    editable: permitted.editableCategories.includes('waste'),
    lines: (wasteResult.data ?? [])
      .map((r): WasteLine => {
        const stream = String(r.stream)
        return {
          id: String(r.id),
          stream,
          streamLabel: labelForStream(stream),
          destinationId: r.destination_id === null ? null : String(r.destination_id),
          destinationName: r.destination_name === null ? null : String(r.destination_name),
          destinationMethod: String(r.destination_method) as DestinationMethod,
          treatmentClass: r.treatment_class === null ? null : String(r.treatment_class),
          weightKg: String(r.weight_kg),
          weightBasis: String(r.weight_basis) as WeightBasis,
          sourceOfRecord: String(r.source_of_record_used) as WasteSourceKind,
          qualityTier: String(r.quality_tier) as WasteLine['qualityTier'],
          estimationMethod: r.estimation_method === null ? null : String(r.estimation_method),
        }
      })
      .sort((a, b) => a.streamLabel.localeCompare(b.streamLabel)),
    destinations: (destinationsResult.data ?? []).map((d): WasteDestination => {
      const cls = String(d.treatment_class)
      return {
        id: String(d.id),
        name: String(d.name),
        treatmentClass: cls,
        treatmentClassLabel: labelForTreatmentClass(cls),
        onSite: d.on_site === true,
      }
    }),
  }

  const names = await namesOf(supabase, [period.submitted_by, period.approved_by])

  return {
    hotelId,
    hotelName: String(hotelResult.data.name),
    currency,
    periodId,
    month: String(period.period_start).slice(0, 7),
    status,
    restatement: (() => {
      const row = (restatementResult.data ?? [])[0] as Record<string, unknown> | undefined
      if (row === undefined || row['reopened_reason'] === null) return null
      return {
        reason: String(row['reopened_reason']),
        reopenedAt: row['reopened_at'] === null ? null : String(row['reopened_at']),
        reopenedByName: row['reopened_by_name'] === null ? null : String(row['reopened_by_name']),
        previouslyApprovedAt:
          row['previously_approved_at'] === null ? null : String(row['previously_approved_at']),
        previouslyApprovedByName:
          row['previously_approved_by_name'] === null
            ? null
            : String(row['previously_approved_by_name']),
      }
    })(),
    returnedReason:
      period.returned_reason === null || period.returned_reason === undefined
        ? null
        : String(period.returned_reason),
    submittedByName: names.get(String(period.submitted_by ?? '')) ?? null,
    approvedByName: names.get(String(period.approved_by ?? '')) ?? null,
    activity,
    sources,
    waste,
    openForEntry: isOpenForEntry(status),
    permitted,
    submitBlockedBecause: submitBlockedBecause(status, activity, permitted.canSubmit, sources),
  }
}

/**
 * The names behind the submitter and approver ids.
 *
 * user_profiles is readable only for the reader's own row unless they are a platform
 * admin, so this usually returns nothing and the page shows the transition without a name.
 * That is the §2.5 boundary working, not a bug — but it is worth stating, because the
 * obvious reading of an empty name is that nobody did it.
 */
export async function namesOf(
  supabase: SupabaseClient,
  ids: readonly unknown[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((i): i is string => typeof i === 'string' && i !== ''))]
  if (wanted.length === 0) return new Map()
  const { data } = await supabase
    .schema('access')
    .from('user_profiles')
    .select('id,full_name')
    .in('id', wanted)
  return new Map((data ?? []).map((r) => [String(r.id), String(r.full_name)]))
}

/** A nullable database scalar as text, or null. Numbers arrive as numbers or as strings. */
function optionalText(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value)
}
