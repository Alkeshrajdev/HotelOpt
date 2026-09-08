/**
 * Segregation of duties — §2.6, SPEC-02 §1.4.
 *
 * With segregation enabled, a user may never approve a record they submitted. The
 * default for a tenant's approval matrix is that the approver must differ from the
 * submitter. The check compares the actor against the submitter and has never depended
 * on role names — which is what lets two people with Property access at one hotel divide
 * entry and approval between them with no third role.
 */
import type { Role } from './vocabulary'

export interface ApprovalRequest {
  readonly approverUserId: string
  readonly submitterUserId: string
  readonly approverRole: Role
  /** From the tenant's ApprovalMatrix. Default: required (§2.6). */
  readonly segregationRequired: boolean
  /**
   * Farnek Admin may override a stalled approval with a mandatory reason, raising a
   * distinct audit event class (§2.6, SPEC-02 §1.4).
   */
  readonly override?: { readonly reason: string } | undefined
  /** Set when the approver is acting as a time-boxed delegate (§2.6). */
  readonly delegatingUserId?: string | undefined
}

export type ApprovalRefusal =
  'self_approval' | 'override_requires_reason' | 'override_not_permitted'

export type ApprovalOutcome =
  | { readonly permitted: true; readonly auditClass: 'approval' | 'emergency_override' }
  | { readonly permitted: false; readonly refusal: ApprovalRefusal; readonly detail: string }

export function evaluateApproval(r: ApprovalRequest): ApprovalOutcome {
  if (r.override !== undefined) {
    if (r.approverRole !== 'farnek_admin') {
      return {
        permitted: false,
        refusal: 'override_not_permitted',
        detail: 'only Farnek Admin may override a stalled approval',
      }
    }
    if (r.override.reason.trim().length === 0) {
      return {
        permitted: false,
        refusal: 'override_requires_reason',
        detail: 'an emergency override records a mandatory reason',
      }
    }
    return { permitted: true, auditClass: 'emergency_override' }
  }

  // A delegate acts for the delegator, so the delegator counts as the acting party too.
  const actingParties = [r.approverUserId, r.delegatingUserId].filter(
    (id): id is string => id !== undefined,
  )
  if (r.segregationRequired && actingParties.includes(r.submitterUserId)) {
    return {
      permitted: false,
      refusal: 'self_approval',
      detail: 'the approver must differ from the submitter',
    }
  }

  return { permitted: true, auditClass: 'approval' }
}
