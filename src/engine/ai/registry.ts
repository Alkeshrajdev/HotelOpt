/**
 * AI orchestration boundaries — §20.
 *
 * GOVERNING PRINCIPLE: AI extracts and classifies unstructured input. It never
 * calculates, never selects a method, never approves, never diagnoses and never claims.
 * Every AI output is a PROPOSAL that a human accepts before a deterministic engine acts
 * on it (§20, CON-06).
 *
 * §20.1 is exhaustive: "No AI runs anywhere in the platform outside this list." So the
 * approved tasks are an enumerated registry and `invoke` refuses anything absent from
 * it — an unregistered task is not merely undocumented, it is prohibited.
 */

export const APPROVED_AI_TASKS = [
  'document_classification_extraction',
  'scope3_classification_only',
  'waste_taxonomy_mapping',
  'certification_evidence_analysis',
  'document_to_hotel_matching',
  'canonical_question_suggestion',
] as const
export type AiTask = (typeof APPROVED_AI_TASKS)[number]

/**
 * §20.2's exclusions, named so a refusal can cite the one it breaches rather than
 * saying only "not permitted".
 */
export const AI_EXCLUSIONS = {
  kpi_mathematics:
    'KPI mathematics, GHG calculations, unit conversion, apportionment, stock accounting, aggregation, variance decomposition, currency and inflation',
  method_selection: 'method selection for any calculation, including Scope 3',
  genuine_performance:
    'Genuine Performance formulas, model fitting, driver selection or eligibility',
  measurement_verification:
    'anything in Measurement & Verification — no baselines, no attribution, no diagnostics, no savings',
  comparison_assignment: 'comparison assignment',
  approval: 'approval of data, certification, procurement, allocation or certificate issuance',
  recommendations:
    'automatic technical recommendations, retrofit proposals, savings claims, payback figures or neutrality claims',
  claim_wording: 'AI-generated claim wording, certificate text or marketing copy',
  invented_data: 'inventing missing data',
} as const
export type AiExclusion = keyof typeof AI_EXCLUSIONS

export interface TaskRegistration {
  readonly task: AiTask
  readonly purpose: string
  readonly modelVersion: string
  readonly promptVersion: string
  readonly outputSchemaVersion: string
  readonly evalSetId: string
  /** Minimum accuracy before promotion out of mandatory full review (§20.3). */
  readonly accuracyThreshold: number
  readonly measuredAccuracy: number
  readonly consecutivePeriodsAboveThreshold: number
  /** Zero data retention and no-training terms are contractual prerequisites (§20.3). */
  readonly zeroRetentionTerms: boolean
  readonly noTrainingTerms: boolean
  /** Inference region, checked against the residency decision (§20.3, §33). */
  readonly inferenceRegion: string
}

/** ≥95% field-level accuracy for high-impact extracted fields (§20.3). */
export const SUGGESTED_ACCURACY_THRESHOLD = 0.95
/** Sampled review is never below 10% (§20.3). */
export const MINIMUM_REVIEW_SAMPLE = 0.1
/** Consecutive periods above threshold before sampled review is permitted. */
export const PERIODS_BEFORE_SAMPLING = 3

export class AiBoundaryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiBoundaryError'
  }
}

export interface InvocationRequest {
  readonly task: string
  readonly documentClass: string
  /**
   * Documents are redacted of personal data before inference. Where redaction CANNOT be
   * performed for a document class, that class is not sent to a model at all (§20.3).
   */
  readonly redactionAvailable: boolean
  /** Purchaser data is never sent to a model (§12.6, §20.3). */
  readonly containsPurchaserData: boolean
  readonly compliantRegions: readonly string[]
  /** True where a deterministic mapping already resolved the input (§20.3 cost control). */
  readonly deterministicMappingSucceeded: boolean
  readonly providerAvailable: boolean
  readonly quotaRemaining: boolean
}

export type ReviewPolicy = 'full_review' | 'sampled_review'

export type InvocationDecision =
  | {
      readonly proceed: true
      readonly reviewPolicy: ReviewPolicy
      readonly minimumSampleRate: number
      readonly note: string
    }
  | {
      readonly proceed: false
      readonly refusal: string
      /** What happens instead. Never "nothing" — the work degrades, it does not vanish. */
      readonly fallback: 'manual_entry' | 'deterministic_result' | 'queued'
    }

function isApprovedTask(task: string): task is AiTask {
  return (APPROVED_AI_TASKS as readonly string[]).includes(task)
}

/**
 * Decide whether a model may be invoked, and under what review policy.
 *
 * Every refusal names a fallback. No page, dashboard or report depends on an AI service
 * being up (§20.3), so unavailability queues the work rather than failing.
 */
export function decideInvocation(
  request: InvocationRequest,
  registration: TaskRegistration | null,
): InvocationDecision {
  // Nothing invokes a model outside the registry (§20.3).
  if (!isApprovedTask(request.task)) {
    return {
      proceed: false,
      refusal: `"${request.task}" is not an approved AI task; §20.1 is exhaustive and nothing invokes a model outside it`,
      fallback: 'manual_entry',
    }
  }
  if (registration === null || registration.task !== request.task) {
    return {
      proceed: false,
      refusal: `task "${request.task}" is not registered with a model, prompt version and eval set`,
      fallback: 'manual_entry',
    }
  }

  // Deterministic mapping is always attempted first (§20.3 cost control).
  if (request.deterministicMappingSucceeded) {
    return {
      proceed: false,
      refusal: 'a deterministic mapping already resolved this input',
      fallback: 'deterministic_result',
    }
  }

  // "Where technically feasible" is not a permitted qualifier on this control (§20.3).
  if (!request.redactionAvailable) {
    return {
      proceed: false,
      refusal: `personal-data redaction cannot be performed for document class "${request.documentClass}", so the task is disabled for it`,
      fallback: 'manual_entry',
    }
  }
  if (request.containsPurchaserData) {
    return {
      proceed: false,
      refusal: 'purchaser data is never sent to a model (§12.6)',
      fallback: 'manual_entry',
    }
  }

  // Where no compliant region exists for a task, the task is disabled rather than
  // routed elsewhere (§20.3).
  if (!request.compliantRegions.includes(registration.inferenceRegion)) {
    return {
      proceed: false,
      refusal: `no data-residency-compliant inference region for this task; it is disabled rather than routed elsewhere`,
      fallback: 'manual_entry',
    }
  }

  if (!registration.zeroRetentionTerms || !registration.noTrainingTerms) {
    return {
      proceed: false,
      refusal: 'zero data retention and no-training terms are contractual prerequisites',
      fallback: 'manual_entry',
    }
  }

  // Unavailability and quota exhaustion queue the work; they never fail a page.
  if (!request.providerAvailable) {
    return { proceed: false, refusal: 'the model provider is unavailable', fallback: 'queued' }
  }
  if (!request.quotaRemaining) {
    return { proceed: false, refusal: 'the tenant quota is exhausted', fallback: 'queued' }
  }

  // Below threshold the task stays in mandatory full-review mode (§20.3).
  const aboveThreshold = registration.measuredAccuracy >= registration.accuracyThreshold
  const enoughPeriods = registration.consecutivePeriodsAboveThreshold >= PERIODS_BEFORE_SAMPLING

  if (!aboveThreshold) {
    return {
      proceed: true,
      reviewPolicy: 'full_review',
      minimumSampleRate: 1,
      note: `measured accuracy ${registration.measuredAccuracy} is below the ${registration.accuracyThreshold} threshold; the task stays in mandatory full review`,
    }
  }
  if (!enoughPeriods) {
    return {
      proceed: true,
      reviewPolicy: 'full_review',
      minimumSampleRate: 1,
      note: `100% review until ${PERIODS_BEFORE_SAMPLING} consecutive periods above threshold; currently ${registration.consecutivePeriodsAboveThreshold}`,
    }
  }
  return {
    proceed: true,
    reviewPolicy: 'sampled_review',
    minimumSampleRate: MINIMUM_REVIEW_SAMPLE,
    note: 'sampled review permitted; material lines are always fully reviewed (§13.7)',
  }
}

/**
 * Refuse an excluded use outright. This exists so a caller reaching for AI in a
 * prohibited place gets a named refusal rather than a silently registered task.
 */
export function assertNotExcluded(use: AiExclusion): never {
  throw new AiBoundaryError(
    `AI is excluded from ${AI_EXCLUSIONS[use]} (§20.2). AI extracts and classifies; it never calculates, selects a method, approves, diagnoses or claims.`,
  )
}

// ─── Provenance (§20.3) ───────────────────────────────────────────────────────

export interface AiProvenance {
  readonly task: AiTask
  readonly modelVersion: string
  readonly promptVersion: string
  readonly invokedAt: string
  readonly reviewedBy: string | null
  readonly reviewedAt: string | null
  /** Stored for QA and NEVER displayed (§20.3). */
  readonly internalConfidence: number
}

export interface ReviewedValue<T> {
  readonly proposed: T
  readonly accepted: T
  readonly overridden: boolean
  readonly provenance: AiProvenance
}

/**
 * Record a human decision on an AI proposal.
 *
 * An AI-derived value is not stored until a human accepts it: CON-06 requires material
 * classifications to remain reviewable and overridable, so an unreviewed proposal has
 * no accepted value at all.
 */
export function acceptProposal<T>(
  proposed: T,
  accepted: T,
  provenance: Omit<AiProvenance, 'reviewedBy' | 'reviewedAt'>,
  reviewer: { readonly userId: string; readonly at: string },
): ReviewedValue<T> {
  if (reviewer.userId.trim() === '') {
    throw new AiBoundaryError('an AI proposal is accepted by a named reviewer, never anonymously')
  }
  return {
    proposed,
    accepted,
    overridden: JSON.stringify(proposed) !== JSON.stringify(accepted),
    provenance: { ...provenance, reviewedBy: reviewer.userId, reviewedAt: reviewer.at },
  }
}

/**
 * The subset of provenance safe to render. Internal confidence is deliberately absent:
 * it is stored for QA and never displayed (§20.3), because a confidence score reads as
 * a quality figure and is not one.
 */
export function displayableProvenance(p: AiProvenance): Omit<AiProvenance, 'internalConfidence'> {
  const { internalConfidence: _omitted, ...rest } = p
  return rest
}
