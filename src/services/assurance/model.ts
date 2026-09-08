/**
 * Assurance — SPEC-03H · H2, Guide §19.
 *
 * Can we reproduce every published figure, and where has a verifier taken issue? The
 * engagement is a record with every field on screen; a verifier is time-boxed and reads
 * only; findings move through a fixed path and only the verifier closes them; and a
 * figure is reproduced from its inputs through the same snapshot the engine keeps.
 */

export type EngagementStatus =
  'planned' | 'in_progress' | 'findings_open' | 'complete' | 'withdrawn'
export type FindingStatus = 'open' | 'responded' | 'corrected' | 'closed' | 'withdrawn'
export type FindingSeverity = 'observation' | 'minor' | 'material' | 'critical'

export interface FindingView {
  readonly id: string
  readonly reference: string
  readonly severity: FindingSeverity
  readonly description: string
  readonly subjectType: string
  readonly subjectId: string | null
  readonly subjectMetric: string | null
  readonly status: FindingStatus
  readonly raisedBy: string | null
  readonly raisedAt: string
  readonly response: string | null
  readonly respondedBy: string | null
  readonly respondedAt: string | null
  readonly correctionMonth: string | null
  readonly owner: string | null
  readonly dueDate: string | null
  readonly closedBy: string | null
  readonly closedAt: string | null
}

export interface SampleView {
  readonly id: string
  readonly requestedSize: number
  readonly drawn: number
  readonly seed: string
  readonly oversampling: string
  readonly targeted: string | null
  readonly drawnAt: string
  readonly drawnBy: string | null
  readonly byTier: Readonly<Record<string, number>>
}

export interface EngagementView {
  readonly id: string
  readonly reference: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly metrics: readonly string[]
  readonly scopes: readonly number[]
  readonly standard: string
  readonly level: string
  readonly verifierOrganisation: string
  readonly verifierContact: string | null
  readonly verifiers: readonly string[]
  readonly hotels: readonly string[]
  readonly startsOn: string
  readonly plannedCompletion: string | null
  readonly accessExpiresAt: string
  readonly accessLapsed: boolean
  readonly status: EngagementStatus
  readonly statementPath: string | null
  readonly statementScope: string | null
  readonly findings: readonly FindingView[]
  readonly samples: readonly SampleView[]
  /** The reader is a verifier seated on this engagement. */
  readonly iAmSeated: boolean
}

export interface RestatementView {
  readonly periodId: string
  readonly month: string
  readonly reason: string
  readonly reopenedAt: string | null
  readonly reopenedBy: string | null
  readonly previouslyApprovedAt: string | null
  readonly previouslyApprovedBy: string | null
}

export interface ReproduceResult {
  readonly ok: boolean
  /** The figure, as published. */
  readonly headline: string
  /** The sentence H2 asks for: built from N readings, M corrections, across K supplies… */
  readonly sentences: readonly string[]
  /** The §19.4 trace, one line per step, intermediates at full precision. */
  readonly trace: readonly string[]
  readonly provenance: {
    readonly methodVersion: string
    readonly factorSetVersions: Readonly<Record<string, string>>
    readonly engineVersionHash: string
  }
  /** Why it could not be reproduced. A defect, not a state (§19.4). */
  readonly refusal: string | null
}

export const METRICS = [
  { key: 'energy', label: 'Energy, total kWh' },
  { key: 'water', label: 'Water, total m³' },
  { key: 'waste', label: 'Waste, total kg' },
  { key: 'carbon_scope2_location', label: 'Scope 2, location-based, kgCO2e' },
] as const
export type ReproduceMetric = (typeof METRICS)[number]['key']

export function isReproduceMetric(v: string): v is ReproduceMetric {
  return METRICS.some((m) => m.key === v)
}

export interface AssuranceModel {
  readonly hotelName: string
  readonly clientName: string
  readonly tenantId: string
  readonly mayEdit: boolean
  readonly mayExport: boolean
  readonly engagements: readonly EngagementView[]
  readonly restatements: readonly RestatementView[]
  readonly periods: readonly {
    readonly id: string
    readonly month: string
    readonly status: string
  }[]
  readonly hotelsInClient: readonly { readonly id: string; readonly name: string }[]
  readonly reproduce: {
    readonly periodId: string
    readonly metric: ReproduceMetric
    readonly result: ReproduceResult
  } | null
}

export const STANDARD_LABEL: Readonly<Record<string, string>> = {
  iso_14064_3: 'ISO 14064-3',
  isae_3000: 'ISAE 3000',
  other_named: 'another named standard',
}

export const ENGAGEMENT_STATUS_LABEL: Readonly<Record<EngagementStatus, string>> = {
  planned: 'Planned',
  in_progress: 'In progress',
  findings_open: 'Findings open',
  complete: 'Complete',
  withdrawn: 'Withdrawn',
}

export const FINDING_STATUS_LABEL: Readonly<Record<FindingStatus, string>> = {
  open: 'Open',
  responded: 'Responded',
  corrected: 'Corrected',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
}
