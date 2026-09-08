/**
 * The capability matrix — Guide §2.4, collapsed to the five roles of Owner's
 * Requirements Rev 2 §3 (SPEC-02 §1).
 *
 * A module absent from a role's entry means no access of any kind: the module does not
 * appear in navigation, and its API returns 404 rather than 403, so its existence is
 * not disclosed (§2.4, §2.5). Absence is therefore meaningful and is never to be
 * "filled in" with an empty array.
 *
 * Every capability here is bounded by the role's assigned scope. This table answers
 * "what may this role do"; `authorise.ts` answers "where", and the view-only flag on a
 * grant narrows it further (`viewOnlyActions` below).
 *
 * HOW EACH ROW WAS DERIVED, because the five-role matrix is written in no authority
 * document at module × action level and this file is where the derivation lives:
 *
 *   Farnek Admin      = §2.4 Platform Admin, which is a superset of Reviewer and Support
 *                       Operator, so folding those two in changes nothing.
 *   Portfolio access  = §2.4 Portfolio Admin, LESS reopen (`approval:O`) — reopening an
 *                       approved period restates a published figure and is Farnek Admin
 *                       alone (C-05, SPEC-02 §1.2); a client REQUESTS a reopen — and LESS
 *                       `integrations:E`, because an integration credential is issued by
 *                       Farnek and no client can create one (SPEC-02 §1.5 rule 2).
 *   Property access   = §2.4 Hotel Admin, with the same two removals (Hotel Admin never
 *                       held `O`; it held `integrations:E`).
 *   Audit             = §2.4 Verifier: view in scope, findings, export.
 *
 * The former Data Contributor's conditional grants (assets, cost, scope3, events,
 * certification, surveys — each only where the matching category was held) have no
 * equivalent: under Rev 2 a Property grant is narrowed by data category alone, and a
 * narrowed person still holds approval and user management at their property. That is
 * the one place the collapse widens somebody's reach, and the migration says so in the
 * audit trail of every assignment it maps.
 */
import type { Action, DataCategory, Module, Role } from './vocabulary'

/**
 * A conditional grant: the action is held only where the named data category is also
 * granted to the assignment (§2.3, §2.4). No role in the five-role model uses one; the
 * shape is kept because `access.role_capabilities.requires_data_category` still exists
 * and the contract test compares the two.
 */
export interface ConditionalGrant {
  readonly actions: readonly Action[]
  readonly requiresDataCategory: DataCategory
}

export type ModuleCapability = readonly Action[] | ConditionalGrant

export function isConditional(c: ModuleCapability): c is ConditionalGrant {
  return !Array.isArray(c)
}

export type CapabilitySet = Partial<Record<Module, ModuleCapability>>

/**
 * Client roles. Note that no client role holds `C` on any module: configuration
 * changes a calculation basis, and a calculation basis change silently restates
 * history. Only Farnek Admin configures (§2.4, §2.9, SPEC-02 §1.7). And no client role
 * holds `O`: a reopen is requested, and Farnek grants or refuses it on the record.
 */
const PORTFOLIO_ACCESS: CapabilitySet = {
  tenancy: ['V'],
  users: ['V', 'E', 'N'],
  data: ['V', 'E', 'S'],
  approval: ['V', 'R', 'A'],
  assets: ['V', 'E'],
  mv: ['V', 'X'],
  performance: ['V', 'X'],
  comparison: ['V', 'X'],
  cost: ['V', 'E', 'X'],
  carbon: ['V', 'E', 'X'],
  scope3: ['V', 'E', 'X'],
  compensation: ['V', 'E', 'X'],
  events: ['V', 'E', 'X'],
  certification: ['V', 'E', 'X'],
  surveys: ['V', 'E', 'X'],
  targets: ['V', 'E', 'X'],
  reports: ['V', 'E', 'X', 'G'],
  assurance: ['V', 'E', 'X'],
  factors: ['V'],
  integrations: ['V'],
  ai: ['V'],
  audit: ['V', 'X'],
}

const PROPERTY_ACCESS: CapabilitySet = {
  tenancy: ['V'],
  users: ['V', 'E', 'N'],
  data: ['V', 'E', 'S'],
  approval: ['V', 'R', 'A'],
  assets: ['V', 'E'],
  mv: ['V', 'X'],
  performance: ['V', 'X'],
  comparison: ['V', 'X'],
  cost: ['V', 'E', 'X'],
  carbon: ['V', 'E', 'X'],
  scope3: ['V', 'E', 'X'],
  compensation: ['V', 'E', 'X'],
  events: ['V', 'E', 'X'],
  certification: ['V', 'E', 'X'],
  surveys: ['V', 'E', 'X'],
  targets: ['V', 'E', 'X'],
  reports: ['V', 'E', 'X', 'G'],
  assurance: ['V', 'X'],
  factors: ['V'],
  integrations: ['V'],
  ai: ['V'],
  audit: ['V', 'X'],
}

/** The platform owner. The only role with `C` anywhere, and the only one with `O`. */
const FARNEK_ADMIN: CapabilitySet = {
  tenancy: ['V', 'E', 'C', 'N'],
  users: ['V', 'E', 'N'],
  data: ['V', 'E', 'S'],
  approval: ['V', 'R', 'A', 'O'],
  assets: ['V', 'E', 'C'],
  mv: ['V', 'E', 'C', 'X', 'G'],
  performance: ['V', 'E', 'C', 'X'],
  comparison: ['V', 'E', 'C', 'X'],
  cost: ['V', 'E', 'X'],
  carbon: ['V', 'E', 'C', 'X'],
  scope3: ['V', 'E', 'C', 'X'],
  compensation: ['V', 'E', 'C', 'X', 'G'],
  events: ['V', 'E', 'A', 'X'],
  certification: ['V', 'E', 'C', 'X'],
  surveys: ['V', 'E', 'C', 'X'],
  targets: ['V', 'E', 'X'],
  reports: ['V', 'E', 'C', 'X', 'G'],
  assurance: ['V', 'E', 'C', 'X'],
  factors: ['V', 'E', 'C'],
  integrations: ['V', 'E', 'C'],
  ai: ['V', 'E', 'C'],
  payments: ['V', 'E', 'X'],
  audit: ['V', 'X'],
}

/**
 * Third-party assurance. Read-only within the engagement's scope, raises findings,
 * expires automatically (§2.2, §19.2). `assurance:E` is findings only — the assurance
 * schema admits no other verifier write.
 */
const AUDIT: CapabilitySet = {
  tenancy: ['V'],
  data: ['V'],
  assets: ['V'],
  mv: ['V'],
  performance: ['V'],
  cost: ['V'],
  carbon: ['V'],
  scope3: ['V'],
  compensation: ['V'], // retirements and allocations; no purchaser data
  events: ['V'],
  certification: ['V'],
  surveys: ['V'],
  targets: ['V'],
  reports: ['V', 'X'],
  assurance: ['V', 'E'], // findings only
  factors: ['V'],
  ai: ['V'], // provenance
  audit: ['V'],
}

export const CAPABILITIES: Record<Role, CapabilitySet> = {
  farnek_admin: FARNEK_ADMIN,
  portfolio_access: PORTFOLIO_ACCESS,
  property_access: PROPERTY_ACCESS,
  audit: AUDIT,
}

/**
 * What a view-only grant keeps of its role's actions on one module: View, plus Export on
 * reports — which is what the former Portfolio Viewer and Hotel Viewer held, so the flag
 * reproduces those two roles exactly rather than inventing a third reading (SPEC-02 §1.3).
 * Mirrored in SQL by access.may(), access.my_actions() and factors.may_classify().
 */
export function viewOnlyActions(module: Module, actions: readonly Action[]): readonly Action[] {
  return actions.filter((a) => a === 'V' || (module === 'reports' && a === 'X'))
}
