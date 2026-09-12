/**
 * E1's contract — SPEC-03E · E1. What the review screen receives for one month.
 *
 * Written first (SPEC-01 §2.1 rule 1): the stub is a value of this type, the route passes
 * it to components as props, and nothing on the screen computes. The flags, the
 * comparisons and the sentences come from engine/checks/review; the acceptances, queries
 * and requests from the database.
 */
import type { FlagKind, LineComparison } from '@/engine/checks'

export type ReviewPeriodState = 'draft' | 'submitted' | 'returned' | 'approved' | 'locked'

export interface ReviewPeriodRef {
  readonly id: string
  /** YYYY-MM. */
  readonly month: string
  readonly hotelId: string
  readonly hotelName: string
  readonly state: ReviewPeriodState
  readonly submittedByName: string | null
  readonly submittedAt: string | null
  readonly approvedByName: string | null
  readonly returnedReason: string | null
  readonly reopenedReason: string | null
}

export interface FlagResolution {
  readonly byName: string
  readonly at: string
  readonly note: string | null
}

export interface ReviewFlag {
  /** Null until the engine's flag has been recorded by data.record_review. */
  readonly id: string | null
  readonly kind: FlagKind
  readonly resolution: FlagResolution | null
}

export interface ReviewQuery {
  readonly id: string
  readonly question: string
  readonly askedByName: string
  readonly askedAt: string
}

export interface FlaggedLine {
  readonly sourceId: string
  readonly label: string
  readonly flags: readonly ReviewFlag[]
  readonly comparison: LineComparison
  /** The manager's half; the audit half went to the trail. */
  readonly sentence: string
  readonly queries: readonly ReviewQuery[]
}

export interface ConsistentLine {
  readonly sourceId: string
  readonly label: string
  readonly comparison: LineComparison
  readonly sentence: string
  /** Flags a person accepted, so a consistent line still says it was looked at. */
  readonly accepted: readonly ReviewFlag[]
}

export interface ReopenRequest {
  readonly id: string
  readonly reason: string
  readonly requestedByName: string
  readonly requestedAt: string
  readonly granted: boolean | null
  readonly decidedByName: string | null
  readonly decidedAt: string | null
  readonly decisionReason: string | null
}

export interface ReviewDecisions {
  readonly mayAccept: boolean
  readonly mayQuery: boolean
  readonly mayApprove: boolean
  readonly mayReturn: boolean
  readonly mayReopen: boolean
  readonly mayRequestReopen: boolean
  /** "you submitted this month" — said plainly; a rule, not a fault. */
  readonly blockedReason: string | null
}

export interface ReviewModel {
  readonly period: ReviewPeriodRef
  readonly counts: {
    readonly submitted: number
    readonly flagged: number
    readonly consistent: number
  }
  readonly flagged: readonly FlaggedLine[]
  readonly consistent: readonly ConsistentLine[]
  /** A property in its first year: said once, at the top. */
  readonly noHistory: boolean
  readonly decisions: ReviewDecisions
  readonly reopenRequests: readonly ReopenRequest[]
}

/** The label the verdict strip gives a count. */
export function verdict(counts: ReviewModel['counts']): string {
  if (counts.submitted === 0) return 'Nothing submitted'
  if (counts.flagged === 0) {
    return `Nothing in this month needs your judgement. ${counts.consistent} ${
      counts.consistent === 1 ? 'line is' : 'lines are'
    } consistent with expectation.`
  }
  return `${counts.flagged} ${counts.flagged === 1 ? 'line needs' : 'lines need'} your judgement.`
}
