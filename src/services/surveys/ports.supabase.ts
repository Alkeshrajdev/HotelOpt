import type { SupabaseClient } from '@supabase/supabase-js'
import { may as mayDo } from '@/services/access/may'
import type {
  DistributionView,
  QuestionResult,
  SurveyResults,
  SurveysModel,
  TemplateSummary,
} from './model'
import { distributionState } from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

function resultsOf(raw: unknown): SurveyResults | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    responses: Number(r.responses ?? 0),
    invited: Number(r.invited ?? 0),
    population: r.population === null || r.population === undefined ? null : Number(r.population),
    populationSource: text(r.population_source),
    responseRatePercent: text(r.response_rate_percent),
    openCollectionLabel: text(r.open_collection_label),
    questions: ((r.questions as Record<string, unknown>[] | null) ?? []).map(
      (q): QuestionResult => ({
        code: String(q.code),
        prompt: String(q.prompt ?? q.code),
        type: String(q.type),
        metric: text(q.metric),
        answered: Number(q.answered ?? 0),
        mean: text(q.mean),
        yesSharePercent: text(q.yes_share_percent),
        choices: Object.fromEntries(
          Object.entries((q.choices as Record<string, unknown>) ?? {}).map(([k, v]) => [
            k,
            Number(v),
          ]),
        ),
        texts: ((q.texts as unknown[] | null) ?? []).map(String),
      }),
    ),
  }
}

export async function loadSurveysModel(
  supabase: SupabaseClient,
  hotelId: string,
  selectedId: string | undefined,
): Promise<SurveysModel | null> {
  const hotel = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (hotel.error) throw new Error(`surveys.hotel: ${hotel.error.message}`)
  if (!hotel.data) return null

  const may = (action: string) => mayDo(supabase, 'surveys', action, hotelId)

  const [mayEdit, mayExport, versions, questions, texts, distributions, periods] =
    await Promise.all([
      may('E'),
      may('X'),
      supabase
        .schema('surveys')
        .from('template_versions')
        .select('id,version,status,templates:template_id(code,name,audience,anonymous)')
        .eq('status', 'active'),
      supabase.schema('surveys').from('questions').select('template_version_id,metric_code'),
      supabase.schema('surveys').from('template_version_texts').select('template_version_id,title'),
      supabase
        .schema('surveys')
        .from('distributions')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('opens_at', { ascending: false }),
      supabase
        .schema('data')
        .from('reporting_periods')
        .select('id,period_start')
        .eq('hotel_id', hotelId)
        .order('period_start', { ascending: false })
        .limit(24),
    ])
  for (const [n, r] of [
    ['versions', versions],
    ['questions', questions],
    ['texts', texts],
    ['distributions', distributions],
    ['periods', periods],
  ] as const) {
    if (r.error) throw new Error(`surveys.${n}: ${r.error.message}`)
  }
  const questionsByVersion = new Map<string, { count: number; feeds: string[] }>()
  for (const q of questions.data ?? []) {
    const e = questionsByVersion.get(String(q.template_version_id)) ?? { count: 0, feeds: [] }
    e.count += 1
    if (q.metric_code) e.feeds.push(String(q.metric_code))
    questionsByVersion.set(String(q.template_version_id), e)
  }
  const templateByVersion = new Map<string, TemplateSummary>()
  for (const v of versions.data ?? []) {
    const t = (Array.isArray(v.templates) ? v.templates[0] : v.templates) as {
      code: string
      name: string
      audience: string
      anonymous: boolean
    } | null
    if (!t) continue
    const qs = questionsByVersion.get(String(v.id)) ?? { count: 0, feeds: [] }
    templateByVersion.set(String(v.id), {
      code: String(t.code),
      name: String(t.name),
      audience: String(t.audience) as TemplateSummary['audience'],
      anonymous: Boolean(t.anonymous),
      version: String(v.version),
      questionCount: qs.count,
      feeds: qs.feeds,
    })
  }
  // A distribution on a retired version still names its template.
  const allVersionIds = [
    ...new Set((distributions.data ?? []).map((d) => String(d.template_version_id))),
  ].filter((id) => !templateByVersion.has(id))
  if (allVersionIds.length > 0) {
    const older = await supabase
      .schema('surveys')
      .from('template_versions')
      .select('id,version,templates:template_id(code,name,audience,anonymous)')
      .in('id', allVersionIds)
    for (const v of older.data ?? []) {
      const t = (Array.isArray(v.templates) ? v.templates[0] : v.templates) as {
        code: string
        name: string
        audience: string
        anonymous: boolean
      } | null
      if (!t) continue
      const qs = questionsByVersion.get(String(v.id)) ?? { count: 0, feeds: [] }
      templateByVersion.set(String(v.id), {
        code: String(t.code),
        name: String(t.name),
        audience: String(t.audience) as TemplateSummary['audience'],
        anonymous: Boolean(t.anonymous),
        version: String(v.version),
        questionCount: qs.count,
        feeds: qs.feeds,
      })
    }
  }

  const ids = (distributions.data ?? []).map((d) => String(d.id))
  const [responseCounts, recipients] = ids.length
    ? await Promise.all([
        supabase
          .schema('surveys')
          .from('responses')
          .select('distribution_id')
          .in('distribution_id', ids),
        supabase
          .schema('surveys')
          .from('recipients')
          .select('id,distribution_id,respondent_reference,invited_at,responded_at')
          .in('distribution_id', ids)
          .order('invited_at'),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ]
  const responsesBy = new Map<string, number>()
  for (const r of responseCounts.data ?? [])
    responsesBy.set(
      String(r.distribution_id),
      (responsesBy.get(String(r.distribution_id)) ?? 0) + 1,
    )
  const recipientsBy = new Map<string, DistributionView['recipients'][number][]>()
  for (const r of recipients.data ?? []) {
    const list = recipientsBy.get(String(r.distribution_id)) ?? []
    list.push({
      id: String(r.id),
      reference: text(r.respondent_reference),
      invitedAt: String(r.invited_at),
      respondedAt: text(r.responded_at),
    })
    recipientsBy.set(String(r.distribution_id), list)
  }

  const monthOfPeriod = new Map(
    (periods.data ?? []).map((p) => [String(p.id), String(p.period_start).slice(0, 7)]),
  )
  const views: DistributionView[] = (distributions.data ?? []).map((d) => {
    const recs = recipientsBy.get(String(d.id)) ?? []
    return {
      id: String(d.id),
      name: String(d.name),
      template: templateByVersion.get(String(d.template_version_id)) ?? {
        code: '?',
        name: 'a withdrawn template',
        audience: 'staff',
        anonymous: true,
        version: '?',
        questionCount: 0,
        feeds: [],
      },
      mode: String(d.mode) as DistributionView['mode'],
      month: d.period_id ? (monthOfPeriod.get(String(d.period_id)) ?? null) : null,
      opensAt: String(d.opens_at),
      closesAt: text(d.closes_at),
      revokedAt: text(d.revoked_at),
      state: distributionState(String(d.opens_at), text(d.closes_at), text(d.revoked_at)),
      responses: responsesBy.get(String(d.id)) ?? 0,
      invited: recs.length,
      answered: recs.filter((r) => r.respondedAt !== null).length,
      results: null,
      recipients: recs,
      aggregatedMetrics: [],
    }
  })

  let selected: DistributionView | null = views.find((v) => v.id === selectedId) ?? views[0] ?? null
  if (selected) {
    const [results, metrics] = await Promise.all([
      supabase.schema('surveys').rpc('results', { p_distribution_id: selected.id }),
      supabase
        .schema('data')
        .from('metric_records')
        .select('metric_code,value,reporting_periods:period_id(period_start)')
        .eq('origin_reference', `surveys.distributions:${selected.id}`),
    ])
    if (results.error) throw new Error(`surveys.results: ${results.error.message}`)
    selected = {
      ...selected,
      results: resultsOf(results.data),
      aggregatedMetrics: (metrics.data ?? []).map((m) => {
        const p = Array.isArray(m.reporting_periods) ? m.reporting_periods[0] : m.reporting_periods
        return {
          code: String(m.metric_code),
          value: String(m.value),
          month: String((p as { period_start: unknown } | null)?.period_start ?? '').slice(0, 7),
        }
      }),
    }
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  return {
    hotelName: String(hotel.data.name),
    mayEdit,
    mayExport,
    templates: [...templateByVersion.values()].filter((t) =>
      (versions.data ?? []).some((v) => templateByVersion.get(String(v.id))?.code === t.code),
    ),
    distributions: views,
    selected,
    periods: (periods.data ?? []).map((p) => ({
      id: String(p.id),
      month: String(p.period_start).slice(0, 7),
    })),
    responsesThisPeriod: views
      .filter((v) => v.month === currentMonth)
      .reduce((n, v) => n + v.responses, 0),
  }
}
