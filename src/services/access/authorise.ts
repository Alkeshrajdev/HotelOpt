/**
 * Authorisation decisions — §2.5, §2.6, §2.7.
 *
 * Deny by default. Scope binds before action. Enforced server-side, in the service
 * layer — never in the UI, never from a client-supplied parameter, and identically for
 * the web application and the API (§25.1).
 *
 * A role a user does not hold is invisible, not forbidden: a module outside a grant is
 * absent from navigation and answers 404. A 403 tells an attacker the thing exists
 * (§2.5). `decide()` returns that distinction so callers cannot collapse it by accident.
 */
import { CAPABILITIES, isConditional, viewOnlyActions, type CapabilitySet } from './capabilities'
import type { Action, DataCategory, Module, Role } from './vocabulary'

export interface Assignment {
  readonly role: Role
  /** Null tenant means platform scope: Farnek Admin only. */
  readonly tenantId: string | null
  readonly portfolioId: string | null
  readonly hotelId: string | null
  /** Categories granted for the `data` module. Empty means none (§2.3). */
  readonly dataCategories: readonly DataCategory[]
  /**
   * The one flag (SPEC-02 §1.3): View on every module the role holds, Export on reports,
   * nothing else. Meaningful on Portfolio and Property access only; the database refuses
   * it elsewhere.
   */
  readonly viewOnly: boolean
  readonly validFrom: Date
  /** Null means open-ended. An expired assignment stops granting at expiry (§2.7). */
  readonly validTo: Date | null
}

/** The record an authorisation question is asked about. */
export interface Target {
  readonly tenantId: string
  readonly portfolioId?: string | undefined
  readonly hotelId?: string | undefined
}

/**
 * `invisible` yields 404, `forbidden` yields 403. The distinction is deliberate and is
 * an acceptance test, not a nicety.
 */
export type Decision =
  | { readonly outcome: 'allowed'; readonly via: Role }
  | { readonly outcome: 'forbidden'; readonly reason: string }
  | { readonly outcome: 'invisible' }

export function isActive(a: Assignment, at: Date): boolean {
  if (a.validFrom > at) return false
  return a.validTo === null || a.validTo > at
}

/**
 * True when the assignment's scope contains the target. Scope binds before action:
 * a Portfolio Admin holds `O` on `approval`, but only for hotels in their portfolio.
 */
export function scopeContains(a: Assignment, t: Target): boolean {
  if (a.tenantId === null) return true // platform scope
  if (a.tenantId !== t.tenantId) return false
  if (a.hotelId !== null) return a.hotelId === t.hotelId
  if (a.portfolioId !== null) return a.portfolioId === t.portfolioId
  return true // tenant-wide
}

function actionsFor(
  set: CapabilitySet,
  module: Module,
  granted: readonly DataCategory[],
  viewOnly: boolean,
): readonly Action[] | null {
  const capability = set[module]
  if (capability === undefined) return null // module invisible to this role
  const actions = !isConditional(capability)
    ? capability
    : granted.includes(capability.requiresDataCategory)
      ? capability.actions
      : []
  // A view-only grant keeps the module visible — the reader holds it — and keeps only
  // the reading of it. Invisible would be wrong: they can open the screen.
  return viewOnly ? viewOnlyActions(module, actions) : actions
}

export interface Question {
  readonly module: Module
  readonly action: Action
  readonly target: Target
  /** Required when `module` is `data`: the category the record belongs to (§2.3). */
  readonly dataCategory?: DataCategory | undefined
}

/**
 * Resolve a question against every assignment a user holds.
 *
 * A user may hold different roles at several hotels and portfolios within one tenant;
 * the effective capability at any record is the union of grants whose scope contains
 * that record (§2.7).
 */
export function decide(
  assignments: readonly Assignment[],
  q: Question,
  at: Date = new Date(),
): Decision {
  const inScope = assignments.filter((a) => isActive(a, at) && scopeContains(a, q.target))
  if (inScope.length === 0) return { outcome: 'invisible' }

  let moduleVisible = false
  let categoryDenied = false

  for (const a of inScope) {
    const actions = actionsFor(CAPABILITIES[a.role], q.module, a.dataCategories, a.viewOnly)
    if (actions === null) continue
    moduleVisible = true

    if (q.module === 'data') {
      // A data grant is bounded by category. Absent a category the question is
      // unanswerable, so it is refused rather than guessed.
      if (q.dataCategory === undefined) {
        return { outcome: 'forbidden', reason: 'a data category is required for the data module' }
      }
      if (!a.dataCategories.includes(q.dataCategory)) {
        categoryDenied = true
        continue
      }
    }

    if (actions.includes(q.action)) return { outcome: 'allowed', via: a.role }
  }

  if (!moduleVisible) return { outcome: 'invisible' }
  if (categoryDenied) {
    return { outcome: 'forbidden', reason: `data category "${q.dataCategory}" is not granted` }
  }
  return { outcome: 'forbidden', reason: `action "${q.action}" is not held on "${q.module}"` }
}

export function can(
  assignments: readonly Assignment[],
  q: Question,
  at: Date = new Date(),
): boolean {
  return decide(assignments, q, at).outcome === 'allowed'
}
