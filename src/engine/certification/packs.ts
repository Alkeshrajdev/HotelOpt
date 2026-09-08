/**
 * Certification engine — §14, N-06, CON-09.
 *
 * A framework pack is a CONTENT ARTIFACT, authored and versioned outside application
 * code. Acceptance test T-27 adds a synthetic fifth pack entirely through content — new
 * structure depth, new criticality vocabulary, new applicability rules, new export
 * format — with no code change and no migration. "A pack that cannot be added this way
 * indicates a defect in the engine, not a limitation of the pack" (§14.2).
 *
 * So nothing here enumerates the four shipped packs. Depth, criticality terms, scoring
 * and export shape are all read from the pack.
 */

export type DataTier = 1 | 2 | 3

export interface TierDecisionInput {
  readonly quantity: string
  /** Does any core module already store this? The authoring check (§14.3). */
  readonly collectedByCoreModule: boolean
  /** A recurring, quantitative, time-series quantity. */
  readonly recurringMeasurable: boolean
}

export interface TierDecision {
  readonly tier: DataTier
  readonly storedIn: 'core_data_layer' | 'certification_module'
  readonly reAsked: boolean
  readonly reason: string
}

/**
 * Decide the tier for a quantity a pack requests.
 *
 * TIER IS DECIDED BY WHETHER A CORE MODULE ALREADY COLLECTS THE QUANTITY, not by which
 * framework asked first. Treated sewage effluent is tier 1, not tier 2, because §6.1
 * already collects every water source type separately — placing it in tier 2 would
 * create the second unreconciled dataset that tier 2 exists to prevent (§14.3).
 */
export function decideTier(input: TierDecisionInput): TierDecision {
  if (input.collectedByCoreModule) {
    return {
      tier: 1,
      storedIn: 'core_data_layer',
      reAsked: false,
      reason: `a core module already collects ${input.quantity}, so the pack binds to the existing record and never re-asks`,
    }
  }
  if (input.recurringMeasurable) {
    return {
      tier: 2,
      // Stored centrally, so the moment a second pack asks for the same number it is
      // not a second unreconciled dataset (§14.3).
      storedIn: 'core_data_layer',
      reAsked: false,
      reason: `${input.quantity} is a recurring measurable quantity no core module collects; it is declared as tier 2, answered in the certification module and stored centrally as a MetricRecord`,
    }
  }
  return {
    tier: 3,
    storedIn: 'certification_module',
    reAsked: false,
    reason: `${input.quantity} is static, qualitative or documentary with no meaningful time series`,
  }
}

// ─── Canonical questions (§14.5) ──────────────────────────────────────────────

export type AnswerType =
  'boolean' | 'date' | 'quantity' | 'single_select' | 'multi_select' | 'narrative' | 'evidence_only'

export interface CanonicalQuestion {
  readonly code: string
  readonly text: string
  readonly answerType: AnswerType
  readonly unit?: string | undefined
  /** A stale answer appears as an attention item in every pack that consumes it. */
  readonly validityMonths: number
  /**
   * Where a framework demands a stricter or differently-scoped variant, that is a
   * SEPARATE canonical question with a declared relationship (§14.5).
   */
  readonly stricterVariantOf?: string | undefined
}

export interface CanonicalAnswer {
  readonly questionCode: string
  readonly value: string
  readonly answeredAt: string
  readonly answeredBy: string
  readonly evidenceReferences: readonly string[]
}

export interface Requirement {
  readonly code: string
  readonly packCode: string
  readonly text: string
  /** The pack's own criticality term. The engine does not interpret it (§14.2). */
  readonly criticality: string
  readonly canonicalQuestionCode?: string | undefined
  /** Which core metric satisfies this requirement, for a tier 1 binding. */
  readonly coreDataBinding?: string | undefined
  readonly evidenceExpected: boolean
}

export class CertificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CertificationError'
  }
}

/**
 * Populate every requirement mapped to a canonical question from one answer.
 *
 * The engine NEVER STRETCHES ONE ANSWER TO SATISFY A STRICTER REQUIREMENT: a requirement
 * whose question is a stricter variant is only satisfied by an answer to that variant,
 * not by an answer to the looser question it derives from (§14.5).
 */
export function propagateAnswer(
  answer: CanonicalAnswer,
  requirements: readonly Requirement[],
  questions: readonly CanonicalQuestion[],
): {
  readonly populated: readonly string[]
  readonly notPopulated: readonly { readonly requirement: string; readonly reason: string }[]
} {
  const populated: string[] = []
  const notPopulated: { requirement: string; reason: string }[] = []

  for (const r of requirements) {
    if (r.canonicalQuestionCode === undefined) continue
    if (r.canonicalQuestionCode === answer.questionCode) {
      populated.push(r.code)
      continue
    }
    const q = questions.find((x) => x.code === r.canonicalQuestionCode)
    if (q?.stricterVariantOf === answer.questionCode) {
      notPopulated.push({
        requirement: r.code,
        reason: `${r.canonicalQuestionCode} is a stricter variant of ${answer.questionCode}; the engine never stretches one answer to satisfy a stricter requirement`,
      })
    }
  }

  return { populated, notPopulated }
}

/** A stale answer raises an attention item in every pack that consumes it (§14.5). */
export function answerFreshness(
  answer: CanonicalAnswer,
  question: CanonicalQuestion,
  asOf: Date,
): { readonly stale: boolean; readonly attentionItem: string | null } {
  const answered = new Date(answer.answeredAt)
  const expires = new Date(answered)
  expires.setMonth(expires.getMonth() + question.validityMonths)
  const stale = asOf >= expires
  return {
    stale,
    attentionItem: stale
      ? `the answer to ${question.code} is older than its ${question.validityMonths}-month validity period`
      : null,
  }
}

// ─── Assessment and progress (§14.6) ──────────────────────────────────────────

export type AssessmentStatus =
  'compliant' | 'partially_compliant' | 'not_compliant' | 'not_applicable' | 'under_review'

export interface Assessment {
  readonly requirementCode: string
  readonly status: AssessmentStatus
  readonly evidenceReferences: readonly string[]
  readonly evidenceExpiresAt?: string | undefined
}

export interface Progress {
  /** Factual counts only. NO READINESS PERCENTAGE EXISTS ANYWHERE IN THE PRODUCT (§14.6). */
  readonly applicable: number
  readonly withCompleteEvidence: number
  readonly expiringWithin90Days: number
  readonly byStatus: Readonly<Record<AssessmentStatus, number>>
  /** The wording a surface renders. Counts, never a percentage. */
  readonly statement: string
}

export function summariseProgress(assessments: readonly Assessment[], asOf: Date): Progress {
  const applicable = assessments.filter((a) => a.status !== 'not_applicable')
  const withEvidence = applicable.filter((a) => a.evidenceReferences.length > 0)

  const horizon = new Date(asOf)
  horizon.setDate(horizon.getDate() + 90)
  const expiring = applicable.filter(
    (a) => a.evidenceExpiresAt !== undefined && new Date(a.evidenceExpiresAt) <= horizon,
  )

  const byStatus = assessments.reduce<Record<AssessmentStatus, number>>(
    (acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }),
    {
      compliant: 0,
      partially_compliant: 0,
      not_compliant: 0,
      not_applicable: 0,
      under_review: 0,
    },
  )

  return {
    applicable: applicable.length,
    withCompleteEvidence: withEvidence.length,
    expiringWithin90Days: expiring.length,
    byStatus,
    statement: `${withEvidence.length} of ${applicable.length} applicable requirements have complete evidence; ${expiring.length} items expire within 90 days`,
  }
}

/**
 * Scoring is pack-defined and pack-owned. The engine stores what the framework
 * publishes and NEVER INVENTS A CROSS-FRAMEWORK SCORE (§14.6, N-06, CON-01).
 */
export class InventedScoreError extends Error {
  constructor() {
    super(
      'the engine never invents a readiness percentage or a cross-framework score. Progress is factual counts; scoring is pack-defined and pack-owned (§14.6, N-06, CON-01).',
    )
    this.name = 'InventedScoreError'
  }
}

export function packScore(pack: {
  readonly hasScoringModel: boolean
  readonly publishedScore?: string | undefined
}): string | null {
  // Where the pack defines no scoring model there is no score — not a computed one.
  if (!pack.hasScoringModel) return null
  return pack.publishedScore ?? null
}

export function readinessPercentage(): never {
  throw new InventedScoreError()
}

// ─── Evidence (§14.7) ─────────────────────────────────────────────────────────

/**
 * A requirement is NEVER automatically marked compliant because a document exists
 * (§14.7). AI may suggest links or flag missing dates; a human confirms status.
 */
export function statusFromEvidence(
  evidenceCount: number,
  humanConfirmed: { readonly status: AssessmentStatus; readonly by: string } | null,
): { readonly status: AssessmentStatus; readonly reason: string } {
  if (humanConfirmed === null) {
    return {
      status: 'under_review',
      reason:
        evidenceCount > 0
          ? 'evidence is attached but a requirement is never automatically marked compliant because a document exists'
          : 'no evidence is attached',
    }
  }
  return { status: humanConfirmed.status, reason: `confirmed by ${humanConfirmed.by}` }
}

// ─── Applicability and versioning (§14.6) ─────────────────────────────────────

export interface ApplicabilityDecision {
  readonly applicable: boolean
  readonly derived: boolean
  readonly overridden: boolean
  readonly reason: string
}

/**
 * Derived from the hotel profile by the PACK'S rules, then overridable by a Portfolio
 * Admin or Hotel Admin with a recorded reason (§14.6).
 */
export function decideApplicability(
  derivedApplicable: boolean,
  override: { readonly applicable: boolean; readonly reason: string; readonly by: string } | null,
): ApplicabilityDecision {
  if (override === null) {
    return {
      applicable: derivedApplicable,
      derived: true,
      overridden: false,
      reason: "derived from the hotel profile by the pack's applicability rules",
    }
  }
  if (override.reason.trim() === '') {
    throw new CertificationError('an applicability override records a reason (§14.6)')
  }
  return {
    applicable: override.applicable,
    derived: false,
    overridden: true,
    reason: `overridden by ${override.by}: ${override.reason}`,
  }
}

/**
 * A published assessment cycle is NEVER REWRITTEN by a newer pack version. Migration is
 * an explicit, audited action presenting a diff of what changed (§14.6).
 */
export function migrateCycle(input: {
  readonly cycleStatus: 'draft' | 'published'
  readonly fromVersion: string
  readonly toVersion: string
  readonly acknowledgedDiffBy?: string | undefined
}): { readonly permitted: boolean; readonly reason: string } {
  if (input.cycleStatus === 'draft') {
    return { permitted: true, reason: 'a draft cycle adopts the newer pack version directly' }
  }
  if ((input.acknowledgedDiffBy ?? '').trim() === '') {
    return {
      permitted: false,
      reason: `a published cycle on ${input.fromVersion} is never rewritten by ${input.toVersion}; migration is an explicit, audited action presenting a diff of what changed`,
    }
  }
  return {
    permitted: true,
    reason: `migration to ${input.toVersion} acknowledged by ${input.acknowledgedDiffBy} after reviewing the diff`,
  }
}

/**
 * Certification readiness is never represented as a certification award or approval by
 * any certification body (CON-09).
 */
export const READINESS_DISCLAIMER =
  'This is a readiness assessment prepared by the platform. It is not a certification award, approval or decision by Green Globe, Green Key, LEED or any other certification body.'
