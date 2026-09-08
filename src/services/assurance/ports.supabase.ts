import type { SupabaseClient } from '@supabase/supabase-js'
import { may as mayDo } from '@/services/access/may'
import type { Locale } from '@/i18n'
import type {
  AssuranceModel,
  EngagementView,
  FindingView,
  ReproduceMetric,
  RestatementView,
  SampleView,
} from './model'
import { reproduceFigure } from './reproduce'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

export async function loadAssuranceModel(
  supabase: SupabaseClient,
  locale: Locale,
  userId: string,
  hotelId: string,
  reproduce: { periodId: string; metric: ReproduceMetric } | null,
): Promise<AssuranceModel | null> {
  const hotel = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name,tenant_id,tenants:tenant_id(name)')
    .eq('id', hotelId)
    .maybeSingle()
  if (hotel.error) throw new Error(`assurance.hotel: ${hotel.error.message}`)
  if (!hotel.data) return null
  const tenantId = String(hotel.data.tenant_id)
  const tenant = Array.isArray(hotel.data.tenants) ? hotel.data.tenants[0] : hotel.data.tenants

  const may = (action: string) => mayDo(supabase, 'assurance', action, hotelId)

  const [mayEdit, mayExport, engagementHotels, periods, hotels, profiles] = await Promise.all([
    may('E'),
    may('X'),
    supabase
      .schema('assurance')
      .from('engagement_hotels')
      .select('engagement_id')
      .eq('hotel_id', hotelId),
    supabase
      .schema('data')
      .from('reporting_periods')
      .select('id,period_start,status,reopened_reason')
      .eq('hotel_id', hotelId)
      .order('period_start', { ascending: false }),
    supabase
      .schema('core')
      .from('hotels')
      .select('id,name')
      .eq('tenant_id', tenantId)
      .order('name'),
    supabase.schema('access').from('user_profiles').select('id,full_name'),
  ])
  for (const [n, r] of [
    ['engagementHotels', engagementHotels],
    ['periods', periods],
    ['hotels', hotels],
    ['profiles', profiles],
  ] as const) {
    if (r.error) throw new Error(`assurance.${n}: ${r.error.message}`)
  }
  const nameOf = new Map((profiles.data ?? []).map((p) => [String(p.id), String(p.full_name)]))
  const hotelName = new Map((hotels.data ?? []).map((h) => [String(h.id), String(h.name)]))
  const engagementIds = [
    ...new Set((engagementHotels.data ?? []).map((e) => String(e.engagement_id))),
  ]

  let engagements: EngagementView[] = []
  if (engagementIds.length > 0) {
    const [rows, allHotels, seats, findings, samples, sampleRecords] = await Promise.all([
      supabase
        .schema('assurance')
        .from('engagements')
        .select('*')
        .in('id', engagementIds)
        .order('starts_on', { ascending: false }),
      supabase
        .schema('assurance')
        .from('engagement_hotels')
        .select('engagement_id,hotel_id')
        .in('engagement_id', engagementIds),
      supabase
        .schema('assurance')
        .from('verifier_seats')
        .select('engagement_id,user_id')
        .in('engagement_id', engagementIds),
      supabase
        .schema('assurance')
        .from('findings')
        .select('*')
        .in('engagement_id', engagementIds)
        .order('raised_at'),
      supabase
        .schema('assurance')
        .from('samples')
        .select('*')
        .in('engagement_id', engagementIds)
        .order('drawn_at', { ascending: false }),
      supabase.schema('assurance').from('sample_records').select('sample_id,quality_tier'),
    ])
    for (const [n, r] of [
      ['engagements', rows],
      ['allHotels', allHotels],
      ['seats', seats],
      ['findings', findings],
      ['samples', samples],
      ['sampleRecords', sampleRecords],
    ] as const) {
      if (r.error) throw new Error(`assurance.${n}: ${r.error.message}`)
    }
    const hotelsByEngagement = new Map<string, string[]>()
    for (const h of allHotels.data ?? []) {
      const list = hotelsByEngagement.get(String(h.engagement_id)) ?? []
      list.push(hotelName.get(String(h.hotel_id)) ?? 'a property outside your view')
      hotelsByEngagement.set(String(h.engagement_id), list)
    }
    const seatsByEngagement = new Map<string, string[]>()
    const seatedByMe = new Set<string>()
    for (const s of seats.data ?? []) {
      const list = seatsByEngagement.get(String(s.engagement_id)) ?? []
      list.push(String(s.user_id))
      seatsByEngagement.set(String(s.engagement_id), list)
      if (String(s.user_id) === userId) seatedByMe.add(String(s.engagement_id))
    }
    const tierCounts = new Map<string, Record<string, number>>()
    for (const r of sampleRecords.data ?? []) {
      const c = tierCounts.get(String(r.sample_id)) ?? {}
      c[String(r.quality_tier)] = (c[String(r.quality_tier)] ?? 0) + 1
      tierCounts.set(String(r.sample_id), c)
    }
    // Cross-schema lookups are separate reads: PostgREST embeds only within a schema.
    const statementIds = (rows.data ?? [])
      .map((e) => e.statement_document_id)
      .filter((x): x is string => typeof x === 'string')
    const correctionIds = (findings.data ?? [])
      .map((f) => f.correction_period_id)
      .filter((x): x is string => typeof x === 'string')
    const [statementDocs, correctionPeriods] = await Promise.all([
      statementIds.length
        ? supabase.schema('data').from('documents').select('id,storage_path').in('id', statementIds)
        : Promise.resolve({ data: [] as { id: string; storage_path: string }[], error: null }),
      correctionIds.length
        ? supabase
            .schema('data')
            .from('reporting_periods')
            .select('id,period_start')
            .in('id', correctionIds)
        : Promise.resolve({ data: [] as { id: string; period_start: string }[], error: null }),
    ])
    const statementPath = new Map(
      (statementDocs.data ?? []).map((d) => [String(d.id), String(d.storage_path)]),
    )
    const correctionMonth = new Map(
      (correctionPeriods.data ?? []).map((p) => [String(p.id), String(p.period_start).slice(0, 7)]),
    )
    const findingsByEngagement = new Map<string, FindingView[]>()
    for (const f of findings.data ?? []) {
      const list = findingsByEngagement.get(String(f.engagement_id)) ?? []
      list.push({
        id: String(f.id),
        reference: String(f.reference),
        severity: String(f.severity) as FindingView['severity'],
        description: String(f.description),
        subjectType: String(f.subject_type),
        subjectId: text(f.subject_id),
        subjectMetric: text(f.subject_metric),
        status: String(f.status) as FindingView['status'],
        raisedBy: nameOf.get(String(f.raised_by)) ?? null,
        raisedAt: String(f.raised_at),
        response: text(f.response),
        respondedBy: f.responded_by ? (nameOf.get(String(f.responded_by)) ?? null) : null,
        respondedAt: text(f.responded_at),
        correctionMonth: f.correction_period_id
          ? (correctionMonth.get(String(f.correction_period_id)) ?? null)
          : null,
        owner: f.owner_user_id ? (nameOf.get(String(f.owner_user_id)) ?? null) : null,
        dueDate: text(f.due_date),
        closedBy: f.closed_by ? (nameOf.get(String(f.closed_by)) ?? null) : null,
        closedAt: text(f.closed_at),
      })
      findingsByEngagement.set(String(f.engagement_id), list)
    }
    const samplesByEngagement = new Map<string, SampleView[]>()
    for (const s of samples.data ?? []) {
      const list = samplesByEngagement.get(String(s.engagement_id)) ?? []
      const byTier = tierCounts.get(String(s.id)) ?? {}
      list.push({
        id: String(s.id),
        requestedSize: Number(s.requested_size),
        drawn: Object.values(byTier).reduce((a, b) => a + b, 0),
        seed: String(s.random_seed),
        oversampling: String(s.non_measured_oversampling),
        targeted: text(s.targeted_criteria),
        drawnAt: String(s.drawn_at),
        drawnBy: s.drawn_by ? (nameOf.get(String(s.drawn_by)) ?? null) : null,
        byTier,
      })
      samplesByEngagement.set(String(s.engagement_id), list)
    }
    engagements = (rows.data ?? []).map((e) => {
      return {
        id: String(e.id),
        reference: String(e.reference),
        periodStart: String(e.period_start),
        periodEnd: String(e.period_end),
        metrics: ((e.metrics_covered as string[] | null) ?? []).map(String),
        scopes: ((e.ghg_scopes_covered as number[] | null) ?? []).map(Number),
        standard:
          e.standard === 'other_named'
            ? String(e.standard_name ?? 'another named standard')
            : String(e.standard),
        level: String(e.level),
        verifierOrganisation: String(e.verifier_organisation),
        verifierContact: text(e.verifier_contact),
        verifiers: (seatsByEngagement.get(String(e.id)) ?? []).map(
          (u) => nameOf.get(u) ?? 'a seated verifier',
        ),
        hotels: hotelsByEngagement.get(String(e.id)) ?? [],
        startsOn: String(e.starts_on),
        plannedCompletion: text(e.planned_completion),
        accessExpiresAt: String(e.access_expires_at),
        accessLapsed: Date.parse(String(e.access_expires_at)) < Date.now(),
        status: String(e.status) as EngagementView['status'],
        statementPath: e.statement_document_id
          ? (statementPath.get(String(e.statement_document_id)) ?? null)
          : null,
        statementScope: text(e.statement_scope_note),
        findings: findingsByEngagement.get(String(e.id)) ?? [],
        samples: samplesByEngagement.get(String(e.id)) ?? [],
        iAmSeated: seatedByMe.has(String(e.id)),
      }
    })
  }

  // Every published figure that changed, with when, why and who (C-05).
  const restatements: RestatementView[] = []
  for (const p of (periods.data ?? []).filter((p) => p.reopened_reason)) {
    const { data } = await supabase.schema('data').rpc('restatement_of', { p_period_id: p.id })
    const row = ((data ?? []) as Record<string, unknown>[])[0]
    restatements.push({
      periodId: String(p.id),
      month: String(p.period_start).slice(0, 7),
      reason: String(p.reopened_reason),
      reopenedAt: text(row?.reopened_at),
      reopenedBy: text(row?.reopened_by_name),
      previouslyApprovedAt: text(row?.previously_approved_at),
      previouslyApprovedBy: text(row?.previously_approved_by_name),
    })
  }

  return {
    hotelName: String(hotel.data.name),
    clientName: String((tenant as { name?: unknown } | null)?.name ?? ''),
    tenantId,
    mayEdit,
    mayExport,
    engagements,
    restatements,
    periods: (periods.data ?? []).map((p) => ({
      id: String(p.id),
      month: String(p.period_start).slice(0, 7),
      status: String(p.status),
    })),
    hotelsInClient: (hotels.data ?? []).map((h) => ({ id: String(h.id), name: String(h.name) })),
    reproduce: reproduce
      ? {
          ...reproduce,
          result: await reproduceFigure(
            supabase,
            locale,
            hotelId,
            reproduce.periodId,
            reproduce.metric,
          ),
        }
      : null,
  }
}
