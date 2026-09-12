/** Operator screens J3, J4, J7, J10 — the shapes the pages read. */
export interface Grant {
  readonly assignmentId: string
  readonly userId: string
  readonly fullName: string
  readonly email: string
  readonly role: string
  readonly viewOnly: boolean
  readonly client: string | null
  readonly tenantId: string | null
  readonly hotel: string | null
  readonly hotelId: string | null
  readonly dataCategories: readonly string[]
  readonly validFrom: string
  readonly validTo: string | null
  readonly grantedBy: string | null
  readonly reason: string | null
  readonly revokedAt: string | null
  readonly state: 'active' | 'withdrawn' | 'lapsed' | 'not yet active'
}

export interface Invitation {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly viewOnly: boolean
  readonly client: string
  readonly hotel: string
  readonly hotelId: string
  readonly invitedBy: string | null
  readonly invitedAt: string
  readonly resentAt: string | null
  readonly reason: string
}

export interface UserRow {
  readonly userId: string
  readonly fullName: string
  readonly email: string
  readonly suspended: boolean
  readonly lastSeenAt: string | null
  readonly grants: readonly Grant[]
}

export interface UsersModel {
  readonly users: readonly UserRow[]
  readonly withdrawn: readonly Grant[]
  readonly invitations: readonly Invitation[]
  readonly hotels: readonly { id: string; name: string; client: string }[]
  readonly platformAdmin: boolean
}

export interface Credential {
  readonly id: string
  readonly type: string
  readonly targetType: string
  readonly targetId: string
  readonly client: string | null
  readonly singleUse: boolean
  readonly usedAt: string | null
  readonly expiresAt: string | null
  readonly createdAt: string
  readonly live: boolean
}

export interface EngagementRow {
  readonly id: string
  readonly reference: string
  readonly client: string | null
  readonly hotels: number
  readonly verifier: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly status: string
  readonly accessExpiresAt: string | null
}

export interface AccessModel {
  readonly grants: readonly Grant[]
  readonly credentials: readonly Credential[]
  readonly engagements: readonly EngagementRow[]
  readonly accessEvents: readonly AuditRow[]
}

export interface AuditRow {
  readonly occurredAt: string
  readonly kind: string
  readonly actor: string
  readonly entityType: string
  readonly entityId: string
  readonly client: string | null
  readonly property: string | null
  readonly reason: string | null
}

export interface Assertion {
  readonly code: string
  readonly statement: string
  readonly verifiedAt: string | null
  readonly note: string | null
}

export interface SecurityModel {
  readonly assertions: readonly Assertion[]
  readonly countsThirtyDays: readonly { kind: string; events: number }[]
  readonly recent: readonly AuditRow[]
  readonly trail:
    | readonly {
        occurredAt: string
        kind: string
        actor: string
        reason: string | null
        before: unknown
        after: unknown
      }[]
    | null
  readonly trailQuery: { entityType: string; entityId: string } | null
  readonly retention: readonly { client: string; note: string }[]
}

export interface PackRow {
  readonly id: string
  readonly code: string
  readonly version: number
  readonly name: string
  readonly issuingBody: string | null
  readonly edition: string | null
  readonly effectiveFrom: string | null
  readonly effectiveTo: string | null
  readonly publishedAt: string | null
  readonly withdrawnAt: string | null
  readonly withdrawnReason: string | null
  readonly requirements: number
  readonly mappedQuestions: number
  readonly cyclesOpen: number
  readonly cyclesTotal: number
  readonly clientsOn: readonly string[]
}

export interface SchemesModel {
  readonly packs: readonly PackRow[]
}

/** Grants granted here versus reaching this scope from above, named honestly (J3). */
export function scopeLabel(g: Grant): string {
  if (g.hotelId) return `${g.hotel ?? 'a property'} (granted here)`
  if (g.client) return `${g.client}, every property (reaches from the client)`
  return 'the platform'
}

export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join(' ') : String(v)
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function registerCsv(grants: readonly Grant[]): string {
  const head = [
    'user',
    'email',
    'role',
    'view_only',
    'client',
    'scope',
    'data_categories',
    'valid_from',
    'valid_to',
    'granted_by',
    'reason',
    'revoked_at',
    'state',
  ]
  const rows = grants.map((g) => [
    g.fullName,
    g.email,
    g.role,
    g.viewOnly ? 'yes' : 'no',
    g.client ?? '',
    g.hotel ?? (g.client ? 'every property' : 'platform'),
    g.dataCategories.join(' '),
    g.validFrom,
    g.validTo ?? '',
    g.grantedBy ?? '',
    g.reason ?? '',
    g.revokedAt ?? '',
    g.state,
  ])
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}
