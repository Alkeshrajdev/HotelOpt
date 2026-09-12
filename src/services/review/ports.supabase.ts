/**
 * Loading one month's review — E1 — under the caller's session, so RLS answers.
 *
 * The engine decides what flags; this gathers what it needs (the current reading, the
 * previous month, the same month a year earlier, occupancy for all three), records the
 * result through data.record_review so approve_period can refuse an unreviewed month, and
 * then reads back the flags with their acceptances so the screen shows who saw what.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { flagKey, reviewMonth } from '@/engine/checks'
import type { FlagKind, ReviewLineInput, ReviewedLine } from '@/engine/checks'
import type { QuantityKind } from '@/engine/rounding'
import { labelForResource, nextMonthAfter } from '@/services/entry/model'
import { loadPermissions, namesOf } from '@/services/entry/ports.supabase'
import type {
  ConsistentLine,
  FlaggedLine,
  ReopenRequest,
  ReviewFlag,
  ReviewModel,
  ReviewPeriodState,
  ReviewQuery,
} from './review-model'

interface PeriodRecord {
  id: string
  hotel_id: string
  tenant_id: string
  period_start: string
  period_end: string
  status: string
  submitted_by: string | null
  submitted_at: string | null
  approved_by: string | null
  returned_reason: string | null
  reopened_reason: string | null
}

interface SourceRecord {
  id: string
  resource: string
  canonical_unit: string
}

interface ReadingRecord {
  period_id: string
  source_id: string
  value: string | number
  quality_tier: 'measured' | 'estimated' | 'proxy'
  apportioned: boolean
  corrected: boolean
}

interface FlagRecord {
  id: string
  source_id: string
  flag: string
  accepted_by: string | null
  accepted_at: string | null
  note: string | null
}

interface QueryRecord {
  id: string
  source_id: string
  question: string
  asked_by: string
  asked_at: string
}

interface RequestRecord {
  id: string
  reason: string
  requested_by: string
  requested_at: string
  granted: boolean | null
  decided_by: string | null
  decided_at: string | null
  decision_reason: string | null
}

/** Resources a document is normally attached to: anything billed or delivered. */
const EVIDENCE_EXPECTED = new Set([
  'grid_electricity',
  'district_cooling',
  'purchased_heat',
  'purchased_steam',
  'piped_gas',
  'water_municipal',
  'water_tse',
  'water_desalinated',
  'water_tankered',
  'delivered_diesel',
  'delivered_lpg',
  'delivered_other',
])

/** The registry kind a stored unit rounds at. The canonical units are the platform's own. */
function kindForUnit(unit: string): QuantityKind {
  switch (unit) {
    case 'kWh':
      return 'energy.kwh'
    case 'm3':
      return 'water.m3'
    case 'L':
    case 'litres':
      return 'fuel.litres'
    case 'kg':
      return 'fuel.kg'
    default:
      return 'energy.kwh'
  }
}

function priorMonthStart(periodStart: string): string {
  const [y, m] = periodStart.slice(0, 7).split('-').map(Number) as [number, number]
  return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`
}

function sameMonthLastYearStart(periodStart: string): string {
  return `${Number(periodStart.slice(0, 4)) - 1}${periodStart.slice(4, 10)}`
}

/** Null where the period is outside the reader's grants — 404, never 403 (§2.5). */
export async function loadReviewModel(
  supabase: SupabaseClient,
  periodId: string,
  userId: string,
): Promise<ReviewModel | null> {
  const { data: period, error } = await supabase
    .schema('data')
    .from('reporting_periods')
    .select(
      'id,hotel_id,tenant_id,period_start,period_end,status,submitted_by,submitted_at,approved_by,returned_reason,reopened_reason',
    )
    .eq('id', periodId)
    .maybeSingle()
  if (error) throw new Error(`review.period: ${error.message}`)
  if (!period) return null
  const p = period as PeriodRecord
  const hotelId = String(p.hotel_id)
  const periodStart = String(p.period_start)
  const periodEnd = nextMonthAfter(periodStart)

  const [hotelResult, permitted, sourcesResult, comparatorPeriods] = await Promise.all([
    supabase.schema('core').from('hotels').select('id,name').eq('id', hotelId).maybeSingle(),
    loadPermissions(supabase, hotelId),
    supabase
      .schema('data')
      .from('resource_sources')
      .select('id,resource,canonical_unit')
      .eq('hotel_id', hotelId)
      .eq('included', true)
      .lt('effective_from', periodEnd)
      .or(`effective_to.is.null,effective_to.gt.${periodStart}`),
    // The two comparators. A draft is not a comparator: only a month somebody has at least
    // submitted stands still enough to be compared against.
    supabase
      .schema('data')
      .from('reporting_periods')
      .select('id,period_start')
      .eq('hotel_id', hotelId)
      .in('period_start', [priorMonthStart(periodStart), sameMonthLastYearStart(periodStart)])
      .in('status', ['submitted', 'approved', 'locked']),
  ])
  if (!hotelResult.data) return null

  const sources = (sourcesResult.data ?? []) as SourceRecord[]
  const comparators = (comparatorPeriods.data ?? []) as { id: string; period_start: string }[]
  const prevPeriodId =
    comparators.find((c) => String(c.period_start) === priorMonthStart(periodStart))?.id ?? null
  const lastYearPeriodId =
    comparators.find((c) => String(c.period_start) === sameMonthLastYearStart(periodStart))?.id ??
    null
  const periodIds = [periodId, prevPeriodId, lastYearPeriodId].filter(
    (x): x is string => x !== null,
  )

  const [readingsResult, activityResult, evidenceResult] = await Promise.all([
    supabase
      .schema('data')
      .from('resource_records')
      .select('period_id,source_id,value,quality_tier,apportioned,corrected')
      .in('period_id', periodIds),
    supabase
      .schema('data')
      .from('activity_records')
      .select('period_id,occupied_room_nights')
      .in('period_id', periodIds),
    supabase
      .schema('data')
      .from('evidence_for_reading')
      .select('source_id')
      .eq('period_id', periodId),
  ])

  const readings = (readingsResult.data ?? []) as ReadingRecord[]
  const current = (sourceId: string) =>
    readings.find((r) => r.period_id === periodId && r.source_id === sourceId && !r.corrected)
  const correctionCount = (sourceId: string) =>
    readings.filter((r) => r.period_id === periodId && r.source_id === sourceId && r.corrected)
      .length
  const valueIn = (pid: string | null, sourceId: string): string | null => {
    if (pid === null) return null
    const r = readings.find((x) => x.period_id === pid && x.source_id === sourceId && !x.corrected)
    return r ? String(r.value) : null
  }
  const orn = new Map(
    (
      (activityResult.data ?? []) as { period_id: string; occupied_room_nights: string | number }[]
    ).map((a) => [String(a.period_id), String(a.occupied_room_nights)]),
  )
  const withEvidence = new Set(
    ((evidenceResult.data ?? []) as { source_id: string }[]).map((e) => String(e.source_id)),
  )

  const inputs: ReviewLineInput[] = sources.map((s) => {
    const now = current(s.id)
    return {
      sourceId: String(s.id),
      resource: String(s.resource),
      label: labelForResource(String(s.resource)),
      unit: String(s.canonical_unit),
      kind: kindForUnit(String(s.canonical_unit)),
      current: now
        ? {
            value: String(now.value),
            qualityTier: now.quality_tier,
            apportioned: now.apportioned === true,
            correctionCount: correctionCount(s.id),
            hasEvidence: withEvidence.has(String(s.id)),
            evidenceExpected: EVIDENCE_EXPECTED.has(String(s.resource)),
          }
        : null,
      previousMonth: valueIn(prevPeriodId, s.id),
      sameMonthLastYear: valueIn(lastYearPeriodId, s.id),
      occupancy: {
        current: orn.get(periodId) ?? null,
        previousMonth: prevPeriodId ? (orn.get(prevPeriodId) ?? null) : null,
        sameMonthLastYear: lastYearPeriodId ? (orn.get(lastYearPeriodId) ?? null) : null,
      },
    }
  })

  // What a person has already accepted, so the engine files those lines as consistent.
  const stored = await loadFlags(supabase, periodId)
  const accepted = new Set(
    stored
      .filter((f) => f.accepted_at !== null)
      .map((f) => flagKey(f.source_id, f.flag as FlagKind)),
  )
  const reviewed = reviewMonth(inputs, accepted)

  // Record what the engine found, so approve_period can refuse an unreviewed month or an
  // unresolved flag. Only while the month is under review, and only for a reader who may
  // review it; a refusal here is not the reader's problem and is not shown.
  let flags = stored
  if (p.status === 'submitted' && permitted.canReview) {
    const payload = reviewed.flagged.flatMap((line) =>
      line.flags.map((flag) => ({
        source_id: line.sourceId,
        flag,
        sentence: line.sentence,
        comparison: line.audit,
      })),
    )
    const { error: recordError } = await supabase.schema('data').rpc('record_review', {
      p_period_id: periodId,
      p_flags: payload,
      p_submitted: reviewed.counts.submitted,
      p_consistent: reviewed.counts.consistent,
    })
    if (!recordError) flags = await loadFlags(supabase, periodId)
  }

  const [queriesResult, requestsResult] = await Promise.all([
    supabase
      .schema('data')
      .from('review_queries')
      .select('id,source_id,question,asked_by,asked_at')
      .eq('period_id', periodId)
      .order('asked_at'),
    supabase
      .schema('data')
      .from('reopen_requests')
      .select('id,reason,requested_by,requested_at,granted,decided_by,decided_at,decision_reason')
      .eq('period_id', periodId)
      .order('requested_at', { ascending: false }),
  ])
  const queries = (queriesResult.data ?? []) as QueryRecord[]
  const requests = (requestsResult.data ?? []) as RequestRecord[]

  const names = await namesOf(supabase, [
    p.submitted_by,
    p.approved_by,
    ...flags.map((f) => f.accepted_by),
    ...queries.map((q) => q.asked_by),
    ...requests.flatMap((r) => [r.requested_by, r.decided_by]),
  ])
  const nameOf = (id: string | null): string | null =>
    id === null ? null : (names.get(String(id)) ?? null)
  // A name §2.5 keeps from this reader is still a person: say so rather than blank.
  const named = (id: string): string => nameOf(id) ?? 'A colleague'

  const flagFor = (line: ReviewedLine, kind: FlagKind): ReviewFlag => {
    const row = flags.find((f) => f.source_id === line.sourceId && f.flag === kind)
    return {
      id: row?.id ?? null,
      kind,
      resolution:
        row?.accepted_at && row.accepted_by
          ? { byName: named(row.accepted_by), at: row.accepted_at, note: row.note }
          : null,
    }
  }
  const queriesFor = (sourceId: string): ReviewQuery[] =>
    queries
      .filter((q) => q.source_id === sourceId)
      .map((q) => ({
        id: q.id,
        question: q.question,
        askedByName: named(q.asked_by),
        askedAt: q.asked_at,
      }))

  const flagged: FlaggedLine[] = reviewed.flagged.map((line) => ({
    sourceId: line.sourceId,
    label: line.label,
    flags: line.flags.map((k) => flagFor(line, k)),
    comparison: line.comparison,
    sentence: line.sentence,
    queries: queriesFor(line.sourceId),
  }))
  const consistent: ConsistentLine[] = reviewed.consistent.map((line) => ({
    sourceId: line.sourceId,
    label: line.label,
    comparison: line.comparison,
    sentence: line.sentence,
    accepted: line.flags.map((k) => flagFor(line, k)),
  }))

  const state = String(p.status) as ReviewPeriodState
  const submittedByMe = p.submitted_by !== null && String(p.submitted_by) === userId
  const underReview = state === 'submitted'

  return {
    period: {
      id: periodId,
      month: periodStart.slice(0, 7),
      hotelId,
      hotelName: String(hotelResult.data.name),
      state,
      submittedByName: nameOf(p.submitted_by),
      submittedAt: p.submitted_at,
      approvedByName: nameOf(p.approved_by),
      returnedReason: p.returned_reason,
      reopenedReason: p.reopened_reason,
    },
    counts: reviewed.counts,
    flagged,
    consistent,
    noHistory: reviewed.noHistory,
    decisions: {
      mayAccept: underReview && permitted.canReview,
      mayQuery: underReview && permitted.canReturn,
      mayApprove: underReview && permitted.canApprove && !submittedByMe,
      mayReturn: underReview && permitted.canReturn,
      mayReopen: state === 'approved' && permitted.canReopen,
      mayRequestReopen:
        state === 'approved' &&
        permitted.canReview &&
        !permitted.canReopen &&
        !requests.some((r) => r.decided_at === null),
      blockedReason:
        underReview && submittedByMe && permitted.canApprove
          ? 'You submitted this month, so you may not approve it. Segregation of duties is on for this client.'
          : null,
    },
    reopenRequests: requests.map((r): ReopenRequest => ({
      id: r.id,
      reason: r.reason,
      requestedByName: named(r.requested_by),
      requestedAt: r.requested_at,
      granted: r.granted,
      decidedByName: nameOf(r.decided_by),
      decidedAt: r.decided_at,
      decisionReason: r.decision_reason,
    })),
  }
}

async function loadFlags(supabase: SupabaseClient, periodId: string): Promise<FlagRecord[]> {
  const { data } = await supabase
    .schema('data')
    .from('review_flags')
    .select('id,source_id,flag,accepted_by,accepted_at,note')
    .eq('period_id', periodId)
  return (data ?? []) as FlagRecord[]
}
