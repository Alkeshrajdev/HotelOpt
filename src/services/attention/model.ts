/**
 * Attention and the obligations calendar — SPEC-03E · E2, E3; Guide §17.3–§17.5.
 *
 * One task type, derived from the records; consequence defined, not felt; a calendar fed
 * by the same records; notifications restrained.
 */
export interface AttentionItem {
  readonly kind: string
  readonly kindLabel: string
  readonly consequence: 1 | 2 | 3 | 4
  readonly consequenceLabel: string
  readonly title: string
  readonly hotelId: string | null
  readonly hotelName: string
  readonly why: string
  readonly dueOn: string | null
  readonly ageDays: number
  readonly action: string
  readonly href: string
  readonly reference: string
}

export interface ClosedItem {
  readonly kind: string
  readonly entityType: string
  readonly occurredAt: string
  readonly reason: string | null
}

export interface NotificationPreference {
  readonly kind: string
  readonly label: string
  readonly enabled: boolean
  readonly digest: boolean
  readonly statutory: boolean
}

export interface AttentionModel {
  readonly items: readonly AttentionItem[]
  readonly closedToday: readonly ClosedItem[]
  readonly preferences: readonly NotificationPreference[]
  /** Sources that fail are one row each; the rest of the list still renders. */
  readonly failedSources: readonly string[]
}

export const KIND_LABEL: Record<string, string> = {
  submission_overdue: 'Monthly return overdue',
  submission_due: 'Monthly return due',
  month_returned: 'Month returned',
  approval_waiting: 'Approval waiting',
  source_stopped: 'Connection stopped delivering',
  evidence_expiring: 'Evidence expiring',
  finding_open: 'Verifier finding open',
  reopen_requested: 'Reopen request awaiting decision',
  audit_approaching: 'Certification audit approaching',
  access_expiring: 'Verifier access lapsing',
  pool_low_balance: 'Retirement pool low',
  report_deferred: 'Scheduled report deferred',
}

/** The statutory and security kinds a person cannot switch off (§17.5). Mirrors tasks.is_statutory. */
export const STATUTORY_KINDS: readonly string[] = [
  'submission_overdue',
  'reopen_requested',
  'finding_open',
  'access_expiring',
]

export const CONSEQUENCE_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: 'Overdue',
  2: 'Due within seven days',
  3: 'Would change a published figure',
  4: 'By age',
}

export interface Obligation {
  readonly kind: string
  readonly title: string
  readonly dueOn: string
  readonly hotelsCovered: number
  readonly hotelId: string | null
  readonly hotelName: string | null
  readonly state: string
  readonly outstanding: string
  readonly href: string | null
}

export interface DeadlineConfigView {
  readonly id: string
  readonly hotelId: string | null
  readonly hotelName: string | null
  readonly category: string | null
  readonly submissionWorkingDays: number
  readonly reviewWindowDays: number
  readonly approvalWindowDays: number
  readonly escalationDays: number
}

export interface ClosureView {
  readonly id: string
  readonly hotelName: string
  readonly from: string
  readonly to: string
  readonly reason: string
}

export interface CalendarModel {
  readonly from: string
  readonly to: string
  readonly today: string
  readonly nextThirty: readonly Obligation[]
  readonly inRange: readonly Obligation[]
  readonly configs: readonly DeadlineConfigView[]
  readonly closures: readonly ClosureView[]
  readonly hotels: readonly { id: string; name: string }[]
  readonly tenantId: string | null
  readonly mayConfigure: boolean
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return isoDate(d)
}

/** The weeks of a month, Monday first, as ISO dates; days outside the month are null. */
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, 1))
  const days = new Date(Date.UTC(y ?? 2000, m ?? 1, 0)).getUTCDate()
  const lead = (first.getUTCDay() + 6) % 7
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) =>
      isoDate(new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, i + 1))),
    ),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
