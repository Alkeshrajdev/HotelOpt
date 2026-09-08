/**
 * Certification — SPEC-03H · H1, Guide §14.
 *
 * What each scheme still needs from us, and when. Progress is two counts and a horizon;
 * nothing in this module produces a ratio, and the word "readiness" is never attached to a
 * number (§14.6). Status is per requirement; an answer is per question and shared.
 */

export type AnswerType =
  'boolean' | 'date' | 'quantity' | 'single_select' | 'multi_select' | 'narrative' | 'evidence_only'
export type Applicability = 'applicable' | 'not_applicable'
export type AssessmentStatus =
  'compliant' | 'partially_compliant' | 'not_compliant' | 'not_applicable' | 'under_review'
export type CycleStatus = 'open' | 'submitted' | 'closed'

export interface PackSummary {
  readonly id: string
  readonly code: string
  readonly version: number
  readonly name: string
  readonly issuingBody: string
  readonly edition: string
  readonly structure: readonly { readonly key: string; readonly name: string }[]
  readonly criticality: readonly { readonly term: string; readonly mandatory: boolean }[]
  readonly exportDefinition: {
    readonly format: string
    readonly folders?: readonly { readonly code: string; readonly name: string }[]
    readonly naming?: string
  }
  readonly contentNote: string | null
  readonly withdrawnAt: string | null
  readonly withdrawnReason: string | null
  readonly requirementCount: number
}

export interface Progress {
  readonly applicable: number
  readonly complete: number
  readonly expiring: number
  readonly expired: number
  readonly unanswered: number
  readonly mandatoryOpen: number
}

export interface CycleCard {
  readonly id: string
  readonly pack: PackSummary
  readonly cycleYear: number
  readonly targetAuditDate: string | null
  readonly auditor: string | null
  readonly status: CycleStatus
  readonly progress: Progress
  readonly migratedFrom: string | null
  readonly migrationDiff: { added: string[]; removed: string[]; changed: string[] } | null
  /** A newer edition of the same pack is published and this cycle is on the older one. */
  readonly newerPackId: string | null
}

export interface EvidenceDoc {
  readonly id: string
  readonly storagePath: string
  readonly documentType: string
  readonly checksum: string
  readonly expiresAt: string | null
  readonly uploadedAt: string
  readonly state: 'current' | 'expiring' | 'expired'
}

export interface AnswerView {
  readonly questionCode: string
  readonly questionText: string
  readonly answerType: AnswerType
  readonly unit: string | null
  readonly options: readonly string[]
  readonly value: unknown
  readonly answeredAt: string | null
  readonly answeredBy: string | null
  readonly validUntil: string | null
  readonly state: 'unanswered' | 'current' | 'expiring' | 'expired'
  /** The other packs whose open cycles at this hotel consume the same answer (§14.5). */
  readonly sharedWith: readonly string[]
  readonly relatedTo: { readonly code: string; readonly relationship: string } | null
}

export interface RequirementView {
  readonly assessmentId: string
  readonly code: string
  readonly levelKey: string
  readonly levelName: string
  readonly parentCode: string | null
  readonly title: string
  readonly text: string | null
  readonly guidance: string | null
  readonly evidenceExpectation: string | null
  readonly criticality: string
  readonly mandatory: boolean
  readonly applicability: Applicability
  readonly applicabilityReason: string | null
  readonly applicabilityOverridden: boolean
  readonly status: AssessmentStatus
  readonly statusNote: string | null
  readonly statusAt: string | null
  readonly statusBy: string | null
  readonly answer: AnswerView | null
  /** Tier 1: what the core module already holds, never re-asked. */
  readonly coreBinding: {
    readonly label: string
    readonly value: string | null
    readonly detail: string
  } | null
  /** Tier 2: the latest metric record, or none. */
  readonly tier2: {
    readonly code: string
    readonly name: string
    readonly unit: string
    readonly evidenceRequired: boolean
    readonly latest: {
      readonly month: string
      readonly value: string
      readonly tier: string
    } | null
  } | null
  readonly evidence: readonly EvidenceDoc[]
  readonly lastTouchedAt: string | null
  readonly lastTouchedBy: string | null
  readonly comments: readonly {
    readonly stream: string
    readonly body: string
    readonly author: string | null
    readonly at: string
  }[]
}

export interface RequirementGroup {
  readonly code: string
  readonly title: string
  readonly rows: readonly RequirementView[]
}

export interface CertificationModel {
  readonly hotelName: string
  readonly mayEdit: boolean
  readonly mayExport: boolean
  readonly cycles: readonly CycleCard[]
  readonly availablePacks: readonly PackSummary[]
  readonly selected: {
    readonly cycle: CycleCard
    readonly groups: readonly RequirementGroup[]
    readonly missing: readonly RequirementView[]
  } | null
  readonly periods: readonly { readonly id: string; readonly month: string }[]
}

export const STATUS_LABEL: Readonly<Record<AssessmentStatus, string>> = {
  compliant: 'Compliant',
  partially_compliant: 'Partially compliant',
  not_compliant: 'Not compliant',
  not_applicable: 'Not applicable',
  under_review: 'Under review',
}

/**
 * The progress line, in words (§14.6): two counts and a horizon. Never a percentage.
 */
export function progressSentence(p: Progress, horizonDays = 90): string {
  const parts = [
    `${p.complete} of ${p.applicable} applicable requirements have complete, unexpired evidence`,
  ]
  if (p.expiring > 0) parts.push(`${p.expiring} expire within ${horizonDays} days`)
  if (p.expired > 0) parts.push(`${p.expired} have expired evidence`)
  if (p.unanswered > 0) parts.push(`${p.unanswered} are unanswered`)
  return parts.join('; ') + '.'
}

export function daysUntil(iso: string, today = new Date()): number {
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const d = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
  return Math.round((d - t) / 86400_000)
}

export function expiryState(
  iso: string | null,
  horizonDays = 90,
  today = new Date(),
): 'current' | 'expiring' | 'expired' {
  if (iso === null) return 'current'
  const days = daysUntil(iso, today)
  if (days < 0) return 'expired'
  if (days < horizonDays) return 'expiring'
  return 'current'
}

/** The order the "what is missing" list takes: expired first, then mandatory, then the rest. */
export function missingFirst(rows: readonly RequirementView[]): RequirementView[] {
  const weight = (r: RequirementView) => {
    if (r.applicability !== 'applicable') return 99
    const expired = r.evidence.some((e) => e.state === 'expired') || r.answer?.state === 'expired'
    if (expired) return 0
    if (r.status !== 'compliant' && r.mandatory) return 1
    if (r.status !== 'compliant') return 2
    if (r.evidence.some((e) => e.state === 'expiring') || r.answer?.state === 'expiring') return 3
    return 98
  }
  return rows.filter((r) => weight(r) < 98).sort((a, b) => weight(a) - weight(b))
}

/** A value as the screen prints it. */
export function answerText(a: AnswerView | null): string {
  if (!a || a.state === 'unanswered' || a.value === null || a.value === undefined)
    return 'Not answered'
  const v = a.value
  switch (a.answerType) {
    case 'boolean':
      return v === true ? 'Yes' : 'No'
    case 'quantity': {
      const q = v as { value?: unknown; unit?: unknown }
      return `${String(q.value ?? '')} ${String(q.unit ?? a.unit ?? '')}`.trim()
    }
    case 'multi_select':
      return Array.isArray(v) ? v.map(String).join(', ') : String(v)
    case 'evidence_only':
      return 'Answered by evidence'
    default:
      return String(v)
  }
}

/**
 * The file name a document takes in the pack's export (§14.8): the pack's naming pattern
 * with its placeholders filled, safe for a folder.
 */
export function exportFileName(
  pattern: string | undefined,
  fields: { folder: string; requirement: string; documentType: string; date: string; ext: string },
): string {
  const base = (pattern ?? '{folder}_{requirement}_{document_type}_{date}')
    .replaceAll('{folder}', fields.folder)
    .replaceAll('{requirement}', fields.requirement)
    .replaceAll('{document_type}', fields.documentType)
    .replaceAll('{date}', fields.date)
  return `${base.replace(/[^A-Za-z0-9._-]+/g, '-')}.${fields.ext}`
}
