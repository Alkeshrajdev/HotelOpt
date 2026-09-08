import type { SupabaseClient } from '@supabase/supabase-js'
import type { AttentionModel, CalendarModel, NotificationPreference, Obligation } from './model'
import { addDays, CONSEQUENCE_LABEL, isoDate, KIND_LABEL, STATUTORY_KINDS } from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

export async function loadAttentionModel(supabase: SupabaseClient): Promise<AttentionModel> {
  const [items, closed, prefs] = await Promise.all([
    supabase.schema('tasks').rpc('attention'),
    supabase.schema('tasks').rpc('closed_today'),
    supabase.schema('tasks').from('notification_preferences').select('kind,enabled,digest'),
  ])
  const failedSources: string[] = []
  if (items.error) failedSources.push(`the register: ${items.error.message}`)
  if (closed.error) failedSources.push(`closed today: ${closed.error.message}`)
  const prefOf = new Map((prefs.data ?? []).map((p) => [String(p.kind), p]))
  const preferences: NotificationPreference[] = Object.keys(KIND_LABEL).map((kind) => {
    const p = prefOf.get(kind)
    return {
      kind,
      label: KIND_LABEL[kind] ?? kind,
      enabled: p ? Boolean(p.enabled) : true,
      digest: p ? Boolean(p.digest) : true,
      statutory: STATUTORY_KINDS.includes(kind),
    }
  })
  return {
    items: ((items.data ?? []) as Record<string, unknown>[]).map((r) => {
      const c = Number(r.consequence) as 1 | 2 | 3 | 4
      return {
        kind: String(r.kind),
        kindLabel: KIND_LABEL[String(r.kind)] ?? String(r.kind),
        consequence: c,
        consequenceLabel: CONSEQUENCE_LABEL[c] ?? 'By age',
        title: String(r.title),
        hotelId: text(r.hotel_id),
        hotelName: String(r.hotel_name ?? ''),
        why: String(r.why),
        dueOn: text(r.due_on),
        ageDays: Number(r.age_days ?? 0),
        action: String(r.action),
        href: String(r.href),
        reference: String(r.reference),
      }
    }),
    closedToday: ((closed.data ?? []) as Record<string, unknown>[]).map((r) => ({
      kind: String(r.kind),
      entityType: String(r.entity_type),
      occurredAt: String(r.occurred_at),
      reason: text(r.reason),
    })),
    preferences,
    failedSources,
  }
}

function obligation(r: Record<string, unknown>): Obligation {
  return {
    kind: String(r.kind),
    title: String(r.title),
    dueOn: String(r.due_on),
    hotelsCovered: Number(r.hotels_covered ?? 1),
    hotelId: text(r.hotel_id),
    hotelName: text(r.hotel_name),
    state: String(r.state ?? ''),
    outstanding: String(r.outstanding ?? ''),
    href: text(r.href),
  }
}

export async function loadCalendarModel(
  supabase: SupabaseClient,
  month: string,
  today = new Date(),
): Promise<CalendarModel> {
  const todayIso = isoDate(today)
  const from = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const to = isoDate(new Date(Date.UTC(y ?? 2000, m ?? 1, 0)))
  const [range, thirty, hotels, configs, closures, admin] = await Promise.all([
    supabase.schema('tasks').rpc('obligations', { p_from: from, p_to: to }),
    supabase.schema('tasks').rpc('obligations', { p_from: todayIso, p_to: addDays(todayIso, 30) }),
    supabase.schema('core').from('hotels').select('id,name,tenant_id').order('name'),
    supabase.schema('tasks').from('deadline_config').select('*'),
    supabase
      .schema('tasks')
      .from('hotel_closures')
      .select('*')
      .order('closed_from', { ascending: false }),
    supabase.schema('access').rpc('is_platform_admin'),
  ])
  if (range.error) throw new Error(`calendar.obligations: ${range.error.message}`)
  const hotelList = (hotels.data ?? []).map((h) => ({
    id: String(h.id),
    name: String(h.name),
    tenantId: String(h.tenant_id),
  }))
  const nameOf = new Map(hotelList.map((h) => [h.id, h.name]))
  const tenantId = hotelList[0]?.tenantId ?? null
  const administers = tenantId
    ? await supabase.schema('tasks').rpc('administers', { p_tenant_id: tenantId })
    : { data: false }
  return {
    from,
    to,
    today: todayIso,
    nextThirty: ((thirty.data ?? []) as Record<string, unknown>[]).map(obligation),
    inRange: ((range.data ?? []) as Record<string, unknown>[]).map(obligation),
    configs: (configs.data ?? []).map((c) => ({
      id: String(c.id),
      hotelId: text(c.hotel_id),
      hotelName: c.hotel_id ? (nameOf.get(String(c.hotel_id)) ?? null) : null,
      category: text(c.category),
      submissionWorkingDays: Number(c.submission_working_days),
      reviewWindowDays: Number(c.review_window_days),
      approvalWindowDays: Number(c.approval_window_days),
      escalationDays: Number(c.escalation_days),
    })),
    closures: (closures.data ?? []).map((x) => ({
      id: String(x.id),
      hotelName: nameOf.get(String(x.hotel_id)) ?? String(x.hotel_id),
      from: String(x.closed_from),
      to: String(x.closed_to),
      reason: String(x.reason),
    })),
    hotels: hotelList.map(({ id, name }) => ({ id, name })),
    tenantId,
    mayConfigure: Boolean(admin.data) || Boolean(administers.data),
  }
}
