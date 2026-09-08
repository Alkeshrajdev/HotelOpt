/**
 * User management and privilege escalation — §2.7, SPEC-02 §1.5.
 *
 * "Who may create a user, and what they may grant" is a permission question in its own
 * right and is the most common place an access model leaks. There is no path by which
 * any user acquires a capability they do not already hold.
 *
 * Five rules, each mirrored in access.grant_role():
 *
 *   1. Subset. A holder grants only what they already hold, at a scope at or below their
 *      own. Two people with Property access at one hotel is the model's normal shape
 *      (§1.4), so a peer grant is permitted — the ceiling is the grantor's own capability.
 *   2. Audit is Farnek-issued only, through an assurance engagement. No client grants it.
 *   3. Segregation of duties is per record, not per role (segregation.ts).
 *   4. Last admin standing: blocked with an explanation, not warned about.
 *   5. Farnek Admin is never created inside the product. The first comes from a runbook
 *      step performed once by a named person and audited, and so does every other one.
 */
import { CAPABILITIES, isConditional, viewOnlyActions, type CapabilitySet } from './capabilities'
import { ROLES, type Action, type Module, type Role } from './vocabulary'
import type { Assignment } from './authorise'

/** Roles Farnek alone may grant, and never at a hotel — through an engagement (rule 2). */
export const NEVER_CLIENT_GRANTABLE: readonly Role[] = ['audit']

/** Roles no grant inside the product may create, whoever asks (rule 5). */
export const NEVER_GRANTED_IN_PRODUCT: readonly Role[] = ['farnek_admin']

function effectiveActions(set: CapabilitySet, module: Module): readonly Action[] {
  const capability = set[module]
  if (capability === undefined) return []
  // The widest form of a conditional grant is what it grants when the category is held.
  return isConditional(capability) ? capability.actions : capability
}

/**
 * True when `candidate`'s capability set is a subset of `holder`'s — the subset rule.
 */
export function isCapabilitySubset(candidate: Role, holder: Role): boolean {
  const candidateSet = CAPABILITIES[candidate]
  const holderSet = CAPABILITIES[holder]
  for (const mod of Object.keys(candidateSet) as Module[]) {
    const held = effectiveActions(holderSet, mod)
    for (const action of effectiveActions(candidateSet, mod)) {
      if (!held.includes(action)) return false
    }
  }
  return true
}

/**
 * The roles a holder may grant: a subset of their own capability, never Farnek Admin,
 * and never Audit unless they are Farnek. Only a role holding `N` on `users` grants at
 * all.
 */
export function grantableRoles(holder: Role): readonly Role[] {
  if (!effectiveActions(CAPABILITIES[holder], 'users').includes('N')) return []
  return ROLES.filter(
    (r) =>
      !NEVER_GRANTED_IN_PRODUCT.includes(r) &&
      (holder === 'farnek_admin' || !NEVER_CLIENT_GRANTABLE.includes(r)) &&
      isCapabilitySubset(r, holder),
  )
}

export type GrantRefusal =
  | 'not_a_granting_role'
  | 'role_not_client_grantable'
  | 'role_not_grantable_in_product'
  | 'exceeds_granter_capability'
  | 'scope_above_granter'
  | 'self_modification'
  | 'reason_required'
  | 'last_admin_protected'

export interface GrantRequest {
  readonly granter: Assignment
  readonly granterUserId: string
  readonly granteeUserId: string
  readonly role: Role
  readonly tenantId: string | null
  readonly portfolioId: string | null
  readonly hotelId: string | null
  readonly reason: string
  /**
   * True when the grantee is the last active admin at this scope and the request would
   * remove or downgrade them. The action is blocked with an explanation, not warned
   * about (§2.7); the caller establishes this from the register.
   */
  readonly wouldRemoveLastAdmin?: boolean | undefined
}

export type GrantOutcome =
  | { readonly permitted: true }
  | { readonly permitted: false; readonly refusal: GrantRefusal; readonly detail: string }

/** Is the requested scope at or below the granter's own? */
function scopeAtOrBelow(g: GrantRequest): boolean {
  const { granter } = g
  if (granter.tenantId === null) return true // platform scope grants anywhere
  if (g.tenantId !== granter.tenantId) return false
  if (granter.hotelId !== null) return g.hotelId === granter.hotelId
  if (granter.portfolioId !== null) {
    // Within their own portfolio only: either the portfolio itself or a hotel in it.
    return g.portfolioId === granter.portfolioId || g.hotelId !== null
  }
  return true
}

export function evaluateGrant(g: GrantRequest): GrantOutcome {
  if (g.reason.trim().length === 0) {
    return { permitted: false, refusal: 'reason_required', detail: 'every grant records a reason' }
  }

  // A user may never create, amend, extend or revoke their own role assignment, nor
  // grant a role to a delegate acting for them (§2.7).
  if (g.granterUserId === g.granteeUserId) {
    return {
      permitted: false,
      refusal: 'self_modification',
      detail: 'a user may not modify their own role assignment',
    }
  }

  if (g.wouldRemoveLastAdmin === true) {
    return {
      permitted: false,
      refusal: 'last_admin_protected',
      detail: 'the last active admin at this scope cannot be removed or downgraded',
    }
  }

  const holder = g.granter.role
  const usersActions = g.granter.viewOnly
    ? viewOnlyActions('users', effectiveActions(CAPABILITIES[holder], 'users'))
    : effectiveActions(CAPABILITIES[holder], 'users')
  if (!usersActions.includes('N')) {
    return {
      permitted: false,
      refusal: 'not_a_granting_role',
      detail: g.granter.viewOnly
        ? 'a view-only grant does not assign access'
        : `${holder} does not hold assign-access on users`,
    }
  }

  if (NEVER_GRANTED_IN_PRODUCT.includes(g.role)) {
    return {
      permitted: false,
      refusal: 'role_not_grantable_in_product',
      detail: `${g.role} is created by a runbook step outside the product, never by a grant inside it`,
    }
  }

  if (holder !== 'farnek_admin' && NEVER_CLIENT_GRANTABLE.includes(g.role)) {
    return {
      permitted: false,
      refusal: 'role_not_client_grantable',
      detail: `${g.role} is issued by Farnek through an assurance engagement`,
    }
  }

  if (!isCapabilitySubset(g.role, holder)) {
    return {
      permitted: false,
      refusal: 'exceeds_granter_capability',
      detail: `${g.role} holds capability that ${holder} does not`,
    }
  }

  if (!scopeAtOrBelow(g)) {
    return {
      permitted: false,
      refusal: 'scope_above_granter',
      detail: 'the requested scope is not at or below the granting user',
    }
  }

  return { permitted: true }
}
