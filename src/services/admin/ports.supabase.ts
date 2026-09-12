import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AccessModel,
  AuditRow,
  Grant,
  Invitation,
  PackRow,
  SchemesModel,
  SecurityModel,
  UsersModel,
} from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

function grant(r: Record<string, unknown>): Grant {
  return {
    assignmentId: String(r.assignment_id),
    userId: String(r.user_id),
    fullName: String(r.full_name),
    email: String(r.email),
    role: String(r.role),
    viewOnly: Boolean(r.view_only),
    client: text(r.client),
    tenantId: text(r.tenant_id),
    hotel: text(r.hotel),
    hotelId: text(r.hotel_id),
    dataCategories: ((r.data_categories as string[] | null) ?? []).map(String),
    validFrom: String(r.valid_from),
    validTo: text(r.valid_to),
    grantedBy: text(r.granted_by),
    reason: text(r.reason),
    revokedAt: text(r.revoked_at),
    state: String(r.state) as Grant['state'],
  }
}

export async function loadRegister(supabase: SupabaseClient): Promise<Grant[]> {
  const r = await supabase.schema('access').rpc('register')
  if (r.error) throw new Error(`access.register: ${r.error.message}`)
  return ((r.data ?? []) as Record<string, unknown>[]).map(grant)
}

export async function loadUsersModel(supabase: SupabaseClient): Promise<UsersModel> {
  const [grants, invitations, profiles, hotels, tenants, admin] = await Promise.all([
    loadRegister(supabase),
    supabase.schema('access').rpc('pending_invitations'),
    supabase
      .schema('access')
      .from('user_profiles')
      .select('id,full_name,email,suspended_at,last_seen_at'),
    supabase.schema('core').from('hotels').select('id,name,tenant_id').order('name'),
    supabase.schema('core').from('tenants').select('id,name'),
    supabase.schema('access').rpc('is_platform_admin'),
  ])
  const clientOf = new Map((tenants.data ?? []).map((t) => [String(t.id), String(t.name)]))
  const byUser = new Map<string, Grant[]>()
  for (const g of grants) byUser.set(g.userId, [...(byUser.get(g.userId) ?? []), g])
  const profileOf = new Map((profiles.data ?? []).map((p) => [String(p.id), p]))
  const users = [...byUser.entries()]
    .map(([userId, gs]) => {
      const p = profileOf.get(userId)
      const first = gs[0]!
      return {
        userId,
        fullName: first.fullName,
        email: first.email,
        suspended: Boolean(p?.suspended_at),
        lastSeenAt: text(p?.last_seen_at),
        grants: gs.filter((g) => g.state === 'active' || g.state === 'not yet active'),
      }
    })
    .filter((u) => u.grants.length > 0)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
  return {
    users,
    withdrawn: grants.filter((g) => g.state === 'withdrawn' || g.state === 'lapsed'),
    invitations: ((invitations.data ?? []) as Record<string, unknown>[]).map((r): Invitation => ({
      id: String(r.id),
      email: String(r.email),
      role: String(r.role),
      viewOnly: Boolean(r.view_only),
      client: String(r.client),
      hotel: String(r.hotel),
      hotelId: String(r.hotel_id),
      invitedBy: text(r.invited_by),
      invitedAt: String(r.invited_at),
      resentAt: text(r.resent_at),
      reason: String(r.reason),
    })),
    hotels: (hotels.data ?? []).map((h) => ({
      id: String(h.id),
      name: String(h.name),
      client: clientOf.get(String(h.tenant_id)) ?? '',
    })),
    platformAdmin: Boolean(admin.data),
  }
}

function auditRow(r: Record<string, unknown>): AuditRow {
  return {
    occurredAt: String(r.occurred_at),
    kind: String(r.kind),
    actor: String(r.actor),
    entityType: String(r.entity_type),
    entityId: String(r.entity_id),
    client: text(r.client),
    property: text(r.property),
    reason: text(r.reason),
  }
}

export async function loadAccessModel(supabase: SupabaseClient): Promise<AccessModel> {
  const [grants, tokens, engagements, hotelsOf, tenants, events] = await Promise.all([
    loadRegister(supabase),
    supabase
      .schema('access')
      .from('access_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .schema('assurance')
      .from('engagements')
      .select(
        'id,reference,tenant_id,verifier_organisation,period_start,period_end,status,access_expires_at',
      )
      .order('starts_on', { ascending: false }),
    supabase.schema('assurance').from('engagement_hotels').select('engagement_id'),
    supabase.schema('core').from('tenants').select('id,name'),
    supabase
      .schema('audit')
      .rpc('recent', { p_kinds: ['access_granted', 'access_revoked'], p_limit: 100 }),
  ])
  const clientOf = new Map((tenants.data ?? []).map((t) => [String(t.id), String(t.name)]))
  const hotelCount = new Map<string, number>()
  for (const h of hotelsOf.data ?? [])
    hotelCount.set(String(h.engagement_id), (hotelCount.get(String(h.engagement_id)) ?? 0) + 1)
  const now = Date.now()
  return {
    grants,
    credentials: (tokens.data ?? []).map((t) => ({
      id: String(t.id),
      type: String(t.type),
      targetType: String(t.target_type),
      targetId: String(t.target_id),
      client: t.tenant_id ? (clientOf.get(String(t.tenant_id)) ?? null) : null,
      singleUse: Boolean(t.single_use),
      usedAt: text(t.used_at),
      expiresAt: text(t.expires_at),
      createdAt: String(t.created_at),
      live:
        !(t.single_use && t.used_at) &&
        (!t.expires_at || new Date(String(t.expires_at)).getTime() > now),
    })),
    engagements: (engagements.data ?? []).map((e) => ({
      id: String(e.id),
      reference: String(e.reference),
      client: clientOf.get(String(e.tenant_id)) ?? null,
      hotels: hotelCount.get(String(e.id)) ?? 0,
      verifier: String(e.verifier_organisation),
      periodStart: String(e.period_start),
      periodEnd: String(e.period_end),
      status: String(e.status),
      accessExpiresAt: text(e.access_expires_at),
    })),
    accessEvents: ((events.data ?? []) as Record<string, unknown>[]).map(auditRow),
  }
}

export async function loadSecurityModel(
  supabase: SupabaseClient,
  trailQuery: { entityType: string; entityId: string } | null,
): Promise<SecurityModel> {
  const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
  const [assertions, counts, recent, tenants, trail] = await Promise.all([
    supabase.schema('audit').from('assertions').select('*').order('code'),
    supabase.schema('audit').rpc('counts_since', { p_since: since }),
    supabase.schema('audit').rpc('recent', { p_kinds: null, p_limit: 40 }),
    supabase.schema('core').from('tenants').select('name,settings'),
    trailQuery
      ? supabase.schema('audit').rpc('trail_for', {
          p_entity_type: trailQuery.entityType,
          p_entity_id: trailQuery.entityId,
        })
      : Promise.resolve({ data: null, error: null }),
  ])
  return {
    assertions: (assertions.data ?? []).map((a) => ({
      code: String(a.code),
      statement: String(a.statement),
      verifiedAt: text(a.verified_at),
      note: text(a.note),
    })),
    countsThirtyDays: ((counts.data ?? []) as Record<string, unknown>[]).map((c) => ({
      kind: String(c.kind),
      events: Number(c.events),
    })),
    recent: ((recent.data ?? []) as Record<string, unknown>[]).map(auditRow),
    trail: trail.data
      ? (trail.data as Record<string, unknown>[]).map((t) => ({
          occurredAt: String(t.occurred_at),
          kind: String(t.kind),
          actor: String(t.actor),
          reason: text(t.reason),
          before: t.before,
          after: t.after,
        }))
      : null,
    trailQuery,
    retention: (tenants.data ?? []).map((t) => {
      const s = (t.settings ?? {}) as Record<string, unknown>
      return {
        client: String(t.name),
        note:
          typeof s.retention === 'string'
            ? s.retention
            : 'not stated: the contract and the schemes decide (W-02); nothing is deleted meanwhile',
      }
    }),
  }
}

export async function loadSchemesModel(supabase: SupabaseClient): Promise<SchemesModel> {
  const [packs, reqs, cycles, hotels, tenants] = await Promise.all([
    supabase
      .schema('certification')
      .from('packs')
      .select('*')
      .order('code')
      .order('version', { ascending: false }),
    supabase.schema('certification').from('requirements').select('pack_id,canonical_question_id'),
    supabase.schema('certification').from('cycles').select('pack_id,status,hotel_id'),
    supabase.schema('core').from('hotels').select('id,tenant_id'),
    supabase.schema('core').from('tenants').select('id,name'),
  ])
  if (packs.error) throw new Error(`schemes.packs: ${packs.error.message}`)
  const tenantOfHotel = new Map((hotels.data ?? []).map((h) => [String(h.id), String(h.tenant_id)]))
  const clientOf = new Map((tenants.data ?? []).map((t) => [String(t.id), String(t.name)]))
  return {
    packs: (packs.data ?? []).map((p): PackRow => {
      const rs = (reqs.data ?? []).filter((r) => String(r.pack_id) === String(p.id))
      const cs = (cycles.data ?? []).filter((c) => String(c.pack_id) === String(p.id))
      return {
        id: String(p.id),
        code: String(p.code),
        version: Number(p.version),
        name: String(p.name),
        issuingBody: text(p.issuing_body),
        edition: text(p.edition),
        effectiveFrom: text(p.effective_from),
        effectiveTo: text(p.effective_to),
        publishedAt: text(p.published_at),
        withdrawnAt: text(p.withdrawn_at),
        withdrawnReason: text(p.withdrawn_reason),
        requirements: rs.length,
        mappedQuestions: rs.filter((r) => r.canonical_question_id).length,
        cyclesOpen: cs.filter((c) => String(c.status) === 'open').length,
        cyclesTotal: cs.length,
        clientsOn: [
          ...new Set(
            cs
              .map((c) => clientOf.get(tenantOfHotel.get(String(c.hotel_id)) ?? '') ?? '')
              .filter(Boolean),
          ),
        ],
      }
    }),
  }
}
