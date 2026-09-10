import type { SupabaseClient } from '@supabase/supabase-js'
import { may as mayDo } from '@/services/access/may'
import { supabaseOverviewPorts } from '@/services/overview/ports.supabase'
import type { Locale } from '@/i18n'
import type {
  AnswerView,
  AssessmentStatus,
  CertificationModel,
  CycleCard,
  EvidenceDoc,
  PackSummary,
  Progress,
  RequirementGroup,
  RequirementView,
} from './model'
import { expiryState, missingFirst } from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

function packOf(p: Record<string, unknown>, requirementCount: number): PackSummary {
  return {
    id: String(p.id),
    code: String(p.code),
    version: Number(p.version),
    name: String(p.name),
    issuingBody: String(p.issuing_body),
    edition: String(p.edition),
    structure: (p.structure as PackSummary['structure']) ?? [],
    criticality: ((p.criticality as { term: string; mandatory?: unknown }[]) ?? []).map((c) => ({
      term: c.term,
      mandatory: Boolean(c.mandatory),
    })),
    exportDefinition: (p.export_definition as PackSummary['exportDefinition']) ?? {
      format: 'register',
    },
    contentNote: text(p.content_note),
    withdrawnAt: text(p.withdrawn_at),
    withdrawnReason: text(p.withdrawn_reason),
    requirementCount,
  }
}

const CORE_BINDING_LABEL: Record<string, string> = {
  energy_total: 'Energy consumption, from the monthly return',
  water_total: 'Water consumption, from the monthly return',
  waste_total: 'Waste generated, from the waste register',
  carbon_scope2_location: 'Scope 2 emissions, location-based, from the carbon inventory',
  occupancy: 'Occupied room nights, from the monthly return',
}

export async function loadCertificationModel(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  selectedCycleId: string | undefined,
): Promise<CertificationModel | null> {
  const hotel = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (hotel.error) throw new Error(`certification.hotel: ${hotel.error.message}`)
  if (!hotel.data) return null

  const may = (action: string) => mayDo(supabase, 'certification', action, hotelId)

  const [mayEdit, mayExport, packs, requirementCounts, cycles, periods] = await Promise.all([
    may('E'),
    may('X'),
    supabase
      .schema('certification')
      .from('packs')
      .select('*')
      .order('name')
      .order('version', { ascending: false }),
    supabase.schema('certification').from('requirements').select('pack_id'),
    supabase
      .schema('certification')
      .from('cycles')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('cycle_year', { ascending: false })
      .order('opened_at', { ascending: false }),
    supabase
      .schema('data')
      .from('reporting_periods')
      .select('id,period_start')
      .eq('hotel_id', hotelId)
      .order('period_start', { ascending: false })
      .limit(24),
  ])
  for (const [n, r] of [
    ['packs', packs],
    ['requirements', requirementCounts],
    ['cycles', cycles],
    ['periods', periods],
  ] as const) {
    if (r.error) throw new Error(`certification.${n}: ${r.error.message}`)
  }
  const countByPack = new Map<string, number>()
  for (const r of requirementCounts.data ?? []) {
    countByPack.set(String(r.pack_id), (countByPack.get(String(r.pack_id)) ?? 0) + 1)
  }
  const packList = (packs.data ?? []).map((p) =>
    packOf(p as Record<string, unknown>, countByPack.get(String(p.id)) ?? 0),
  )
  const packById = new Map(packList.map((p) => [p.id, p]))
  const newestByCode = new Map<string, PackSummary>()
  for (const p of packList) {
    if (p.withdrawnAt) continue
    const cur = newestByCode.get(p.code)
    if (!cur || p.version > cur.version) newestByCode.set(p.code, p)
  }

  const progressOf = async (cycleId: string): Promise<Progress> => {
    const { data, error } = await supabase
      .schema('certification')
      .rpc('progress', { p_cycle_id: cycleId })
    if (error) throw new Error(`certification.progress: ${error.message}`)
    const row = ((data ?? []) as Record<string, unknown>[])[0] ?? {}
    return {
      applicable: Number(row.applicable ?? 0),
      complete: Number(row.complete ?? 0),
      expiring: Number(row.expiring ?? 0),
      expired: Number(row.expired ?? 0),
      unanswered: Number(row.unanswered ?? 0),
      mandatoryOpen: Number(row.mandatory_open ?? 0),
    }
  }

  const cards: CycleCard[] = await Promise.all(
    (cycles.data ?? []).map(async (c) => {
      const pack = packById.get(String(c.pack_id))
      if (!pack)
        throw new Error(`certification.cycle ${String(c.id)} names a pack the reader cannot see`)
      const newest = newestByCode.get(pack.code)
      return {
        id: String(c.id),
        pack,
        cycleYear: Number(c.cycle_year),
        targetAuditDate: text(c.target_audit_date),
        auditor: text(c.auditor),
        status: String(c.status) as CycleCard['status'],
        progress: await progressOf(String(c.id)),
        migratedFrom: text(c.migrated_from_id),
        migrationDiff: (c.migration_diff as CycleCard['migrationDiff']) ?? null,
        newerPackId:
          newest && newest.version > pack.version && String(c.status) === 'open' ? newest.id : null,
      }
    }),
  )

  const selectedCard =
    (selectedCycleId ? cards.find((c) => c.id === selectedCycleId) : undefined) ??
    cards.find((c) => c.status === 'open') ??
    cards[0]

  let selected: CertificationModel['selected'] = null
  if (selectedCard) {
    selected = {
      cycle: selectedCard,
      ...(await loadCycle(supabase, locale, hotelId, selectedCard)),
    }
  }

  return {
    hotelName: String(hotel.data.name),
    mayEdit,
    mayExport,
    cycles: cards,
    availablePacks: [...newestByCode.values()].filter(
      (p) => !cards.some((c) => c.pack.code === p.code && c.status === 'open'),
    ),
    selected,
    periods: (periods.data ?? []).map((p) => ({
      id: String(p.id),
      month: String(p.period_start).slice(0, 7),
    })),
  }
}

async function loadCycle(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  card: CycleCard,
): Promise<{ groups: RequirementGroup[]; missing: RequirementView[] }> {
  const [
    assessments,
    requirements,
    questions,
    answers,
    uses,
    comments,
    metricDefs,
    metricRecords,
    profiles,
  ] = await Promise.all([
    supabase.schema('certification').from('assessments').select('*').eq('cycle_id', card.id),
    supabase
      .schema('certification')
      .from('requirements')
      .select('*')
      .eq('pack_id', card.pack.id)
      .order('ordinal'),
    supabase.schema('certification').from('canonical_questions').select('*'),
    supabase
      .schema('certification')
      .from('answers')
      .select('*')
      .eq('hotel_id', hotelId)
      .is('superseded_by', null),
    // Every open cycle's requirements at this hotel, to say which other packs share an answer.
    supabase
      .schema('certification')
      .from('cycles')
      // Two embeds through the same foreign key confuse PostgREST: it read the second as
      // another embed of `packs` and asked packs for a requirements column. The
      // requirements come as their own read below.
      .select('id,pack_id,status,packs:pack_id(name)')
      .eq('hotel_id', hotelId)
      .eq('status', 'open'),
    supabase
      .schema('certification')
      .from('comments')
      .select('assessment_id,stream,body,author,created_at')
      .order('created_at'),
    supabase
      .schema('data')
      .from('metric_definitions')
      .select('code,name,canonical_unit,evidence_required'),
    supabase
      .schema('data')
      .from('metric_records')
      .select('metric_code,value,quality_tier,reporting_periods:period_id(period_start)')
      .eq('hotel_id', hotelId),
    supabase.schema('access').from('user_profiles').select('id,full_name'),
  ])
  for (const [n, r] of [
    ['assessments', assessments],
    ['requirements', requirements],
    ['questions', questions],
    ['answers', answers],
    ['uses', uses],
    ['comments', comments],
    ['metricDefs', metricDefs],
    ['metricRecords', metricRecords],
    ['profiles', profiles],
  ] as const) {
    if (r.error) throw new Error(`certification.${n}: ${r.error.message}`)
  }
  const nameOf = new Map((profiles.data ?? []).map((p) => [String(p.id), String(p.full_name)]))
  const questionById = new Map((questions.data ?? []).map((q) => [String(q.id), q]))
  const answerByQuestion = new Map((answers.data ?? []).map((a) => [String(a.question_id), a]))
  const requirementById = new Map((requirements.data ?? []).map((r) => [String(r.id), r]))
  const levelName = new Map(card.pack.structure.map((l) => [l.key, l.name]))
  const mandatoryTerms = new Set(
    card.pack.criticality.filter((c) => c.mandatory).map((c) => c.term),
  )

  // Which other packs, in open cycles here, map to each question.
  const otherPackIds = [
    ...new Set((uses.data ?? []).map((c) => String(c.pack_id)).filter((id) => id !== card.pack.id)),
  ]
  const otherRequirements = otherPackIds.length
    ? await supabase
        .schema('certification')
        .from('requirements')
        .select('pack_id,canonical_question_id')
        .in('pack_id', otherPackIds)
        .not('canonical_question_id', 'is', null)
    : { data: [], error: null }
  if (otherRequirements.error)
    throw new Error(`certification.uses: ${otherRequirements.error.message}`)
  const packNameById = new Map<string, string>()
  for (const c of uses.data ?? []) {
    const pack = Array.isArray(c.packs) ? c.packs[0] : c.packs
    packNameById.set(String(c.pack_id), String((pack as { name?: unknown } | null)?.name ?? ''))
  }
  const packsByQuestion = new Map<string, Set<string>>()
  for (const r of otherRequirements.data ?? []) {
    const name = packNameById.get(String(r.pack_id)) ?? ''
    const set = packsByQuestion.get(String(r.canonical_question_id)) ?? new Set<string>()
    set.add(name)
    packsByQuestion.set(String(r.canonical_question_id), set)
  }

  // Evidence per assessment, through the evidence links.
  const assessmentIds = (assessments.data ?? []).map((a) => String(a.id))
  const links = assessmentIds.length
    ? await supabase
        .schema('data')
        .from('evidence_links')
        .select(
          'target_id,linked_by,linked_at,documents:document_id(id,storage_path,document_type,checksum,expires_at,created_at,uploaded_by)',
        )
        .eq('target_type', 'certification.assessments')
        .in('target_id', assessmentIds)
    : { data: [], error: null }
  if (links.error) throw new Error(`certification.evidence: ${links.error.message}`)
  const evidenceByAssessment = new Map<string, EvidenceDoc[]>()
  const evidenceTouch = new Map<string, { at: string; by: string | null }>()
  for (const l of links.data ?? []) {
    const d = (Array.isArray(l.documents) ? l.documents[0] : l.documents) as Record<
      string,
      unknown
    > | null
    if (!d) continue
    const list = evidenceByAssessment.get(String(l.target_id)) ?? []
    list.push({
      id: String(d.id),
      storagePath: String(d.storage_path),
      documentType: String(d.document_type),
      checksum: String(d.checksum),
      expiresAt: text(d.expires_at),
      uploadedAt: String(d.created_at),
      state: expiryState(text(d.expires_at)),
    })
    evidenceByAssessment.set(String(l.target_id), list)
    const prev = evidenceTouch.get(String(l.target_id))
    if (!prev || String(l.linked_at) > prev.at)
      evidenceTouch.set(String(l.target_id), {
        at: String(l.linked_at),
        by: nameOf.get(String(l.linked_by)) ?? null,
      })
  }

  const commentsByAssessment = new Map<string, RequirementView['comments'][number][]>()
  for (const c of comments.data ?? []) {
    const list = commentsByAssessment.get(String(c.assessment_id)) ?? []
    list.push({
      stream: String(c.stream),
      body: String(c.body),
      author: c.author ? (nameOf.get(String(c.author)) ?? null) : null,
      at: String(c.created_at),
    })
    commentsByAssessment.set(String(c.assessment_id), list)
  }

  const metricDefByCode = new Map((metricDefs.data ?? []).map((m) => [String(m.code), m]))
  const latestMetric = new Map<string, { month: string; value: string; tier: string }>()
  for (const m of metricRecords.data ?? []) {
    const p = Array.isArray(m.reporting_periods) ? m.reporting_periods[0] : m.reporting_periods
    const month = String((p as { period_start?: unknown } | null)?.period_start ?? '').slice(0, 7)
    const cur = latestMetric.get(String(m.metric_code))
    if (!cur || month > cur.month)
      latestMetric.set(String(m.metric_code), {
        month,
        value: String(m.value),
        tier: String(m.quality_tier),
      })
  }

  // Tier 1 bindings read the latest approved month through the overview ports.
  const ports = supabaseOverviewPorts(supabase, locale)
  const approved = await supabase
    .schema('data')
    .from('reporting_periods')
    .select('id,period_start')
    .eq('hotel_id', hotelId)
    .eq('status', 'approved')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  const latestPeriod = approved.data
    ? { id: String(approved.data.id), month: String(approved.data.period_start).slice(0, 7) }
    : null
  const totals = latestPeriod ? await ports.resourceTotals(latestPeriod.id) : []
  const orn = latestPeriod ? await ports.occupiedRoomNights(latestPeriod.id) : null
  const bindingValue = (binding: string): string | null => {
    if (!latestPeriod) return null
    if (binding === 'occupancy') return orn
    const resource =
      binding === 'energy_total'
        ? 'energy'
        : binding === 'water_total'
          ? 'water'
          : binding === 'waste_total'
            ? 'waste'
            : null
    if (!resource) return null
    return totals.find((t) => t.resource === resource)?.total ?? null
  }

  const rows: RequirementView[] = (assessments.data ?? []).map((a) => {
    const r = requirementById.get(String(a.requirement_id))
    if (!r) throw new Error('certification: an assessment names a requirement outside its pack')
    const q = r.canonical_question_id
      ? questionById.get(String(r.canonical_question_id))
      : undefined
    let answer: AnswerView | null = null
    if (q) {
      const ans = answerByQuestion.get(String(q.id))
      const related = q.related_question_id
        ? questionById.get(String(q.related_question_id))
        : undefined
      answer = {
        questionCode: String(q.code),
        questionText: String(q.text),
        answerType: String(q.answer_type) as AnswerView['answerType'],
        unit: text(q.unit),
        options: ((q.options as unknown[] | null) ?? []).map(String),
        value: ans?.value ?? null,
        answeredAt: ans ? String(ans.answered_at) : null,
        answeredBy: ans ? (nameOf.get(String(ans.answered_by)) ?? null) : null,
        validUntil: ans ? text(ans.valid_until) : null,
        state: ans ? expiryState(text(ans.valid_until)) : 'unanswered',
        sharedWith: [...(packsByQuestion.get(String(q.id)) ?? [])],
        relatedTo: related
          ? { code: String(related.code), relationship: String(q.relationship) }
          : null,
      }
    }
    const def = r.tier2_metric_code ? metricDefByCode.get(String(r.tier2_metric_code)) : undefined
    const evidence = evidenceByAssessment.get(String(a.id)) ?? []
    const touches: { at: string; by: string | null }[] = []
    if (a.status_at)
      touches.push({ at: String(a.status_at), by: nameOf.get(String(a.status_by)) ?? null })
    if (answer?.answeredAt) touches.push({ at: answer.answeredAt, by: answer.answeredBy })
    const ev = evidenceTouch.get(String(a.id))
    if (ev) touches.push(ev)
    touches.sort((x, y) => (x.at < y.at ? 1 : -1))
    const parent = r.parent_id ? requirementById.get(String(r.parent_id)) : undefined
    return {
      assessmentId: String(a.id),
      code: String(r.code),
      levelKey: String(r.level_key),
      levelName: levelName.get(String(r.level_key)) ?? String(r.level_key),
      parentCode: parent ? String(parent.code) : null,
      title: String(r.title),
      text: text(r.text),
      guidance: text(r.guidance),
      evidenceExpectation: text(r.evidence_expectation),
      criticality: String(r.criticality),
      mandatory: mandatoryTerms.has(String(r.criticality)),
      applicability: String(a.applicability) as RequirementView['applicability'],
      applicabilityReason: text(a.applicability_reason),
      applicabilityOverridden: a.applicability_overridden_at !== null,
      status: String(a.status) as AssessmentStatus,
      statusNote: text(a.status_note),
      statusAt: text(a.status_at),
      statusBy: a.status_by ? (nameOf.get(String(a.status_by)) ?? null) : null,
      answer,
      coreBinding: r.core_binding
        ? {
            label: CORE_BINDING_LABEL[String(r.core_binding)] ?? String(r.core_binding),
            value: bindingValue(String(r.core_binding)),
            detail: latestPeriod
              ? `latest approved month ${latestPeriod.month}`
              : 'no approved month yet',
          }
        : null,
      tier2: def
        ? {
            code: String(def.code),
            name: String(def.name),
            unit: String(def.canonical_unit),
            evidenceRequired: Boolean(def.evidence_required),
            latest: latestMetric.get(String(def.code)) ?? null,
          }
        : null,
      evidence,
      lastTouchedAt: touches[0]?.at ?? null,
      lastTouchedBy: touches[0]?.by ?? null,
      comments: commentsByAssessment.get(String(a.id)) ?? [],
    }
  })

  // Grouped as the pack groups them: by the outermost level the pack declares. A
  // requirement at the outermost level is a group of its own children; a pack with one
  // level is one group.
  const byCode = new Map(rows.map((r) => [r.code, r]))
  const order = new Map((requirements.data ?? []).map((r, i) => [String(r.code), i]))
  const sorted = [...rows].sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0))
  const outer = card.pack.structure[0]?.key
  const groups: RequirementGroup[] = []
  if (card.pack.structure.length <= 1) {
    groups.push({
      code: card.pack.code,
      title: card.pack.structure[0]?.name ?? 'Requirements',
      rows: sorted,
    })
  } else {
    const topOf = (r: RequirementView): RequirementView => {
      let cur = r
      while (cur.parentCode && cur.levelKey !== outer) {
        const p = byCode.get(cur.parentCode)
        if (!p) break
        cur = p
      }
      return cur
    }
    const seen = new Map<string, RequirementView[]>()
    for (const r of sorted) {
      if (r.levelKey === outer) {
        if (!seen.has(r.code)) seen.set(r.code, [])
        continue
      }
      const top = topOf(r)
      const list = seen.get(top.code) ?? []
      list.push(r)
      seen.set(top.code, list)
    }
    for (const [code, list] of seen) {
      const top = byCode.get(code)
      groups.push({ code, title: top ? `${top.code} · ${top.title}` : code, rows: list })
    }
  }

  return { groups, missing: missingFirst(rows) }
}
