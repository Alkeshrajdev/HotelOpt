/**
 * The permission vocabulary — Guide §2.3, roles per Owner's Requirements Rev 2 §3.
 *
 * §2.5 requires deny-by-default granting "by tenant, portfolio, hotel, module and
 * action". That is only implementable if the modules and actions are enumerated, so
 * they are enumerated here once. This is the vocabulary the API authorises against
 * (§25.1), that `access.user_role_assignments` stores (§23.1), and that the audit trail
 * records (§26.1).
 *
 * No business logic, permission check, database value, API contract or test may
 * hard-code an operator name (§2.1). "Farnek Admin" is the owner's name for the platform
 * role (Rev 2 §3) and is used as its label; the identifier is `farnek_admin` because the
 * owner named the role, and a label that differs from its identifier is a label a reader
 * has to translate.
 */

/** The complete verb set. No module defines a verb outside it (§2.3). */
export const ACTIONS = ['V', 'E', 'S', 'R', 'A', 'O', 'C', 'N', 'X', 'G'] as const
export type Action = (typeof ACTIONS)[number]

export const ACTION_NAMES: Record<Action, string> = {
  V: 'View',
  E: 'Create and edit',
  S: 'Submit',
  R: 'Return',
  A: 'Approve',
  O: 'Reopen',
  C: 'Configure',
  N: 'Assign access',
  X: 'Export',
  G: 'Sign off',
}

/** Aligned to the services in §22.2 and the menus in §4. */
export const MODULES = [
  'tenancy',
  'users',
  'data',
  'approval',
  'assets',
  'mv',
  'performance',
  'comparison',
  'cost',
  'carbon',
  'scope3',
  'compensation',
  'events',
  'certification',
  'surveys',
  'targets',
  'reports',
  'assurance',
  'factors',
  'integrations',
  'ai',
  'payments',
  'audit',
] as const
export type Module = (typeof MODULES)[number]

/**
 * The `data` module is further restrictable by category. This is the canonical list;
 * a grant outside it is invalid (§2.3).
 */
export const DATA_CATEGORIES = [
  'activity',
  'energy',
  'water',
  'fuel',
  'waste',
  'refrigerants',
  'generation',
  'cost',
  'procurement',
  'assets',
  'certification',
  'surveys',
  'events',
  'evidence',
  'travel',
] as const
export type DataCategory = (typeof DATA_CATEGORIES)[number]

/**
 * THE FIVE ROLES — Owner's Requirements Rev 2 §3, SPEC-02 §1. Set by the owner on
 * 4 September 2026; an earlier revision of this file defined twelve.
 *
 * Four are assignable. The fifth, Survey participant, is a token with a purpose and an
 * expiry (`access.access_tokens`) and never an account, so it has no place in a table of
 * role assignments — Rev 2 §3 says so in as many words: "Not a role in the access model."
 *
 * Where the seven that went are now (SPEC-02 §1.3): Reviewer and Support Operator are
 * Farnek Admin; Portfolio Viewer is Portfolio access with the view-only flag; Hotel Admin,
 * Data Contributor and Hotel Viewer are Property access, the last with the flag; Verifier
 * is Audit; Service Account is an integration credential (`api.credentials`), not a user.
 */
export const ROLES = ['farnek_admin', 'portfolio_access', 'property_access', 'audit'] as const
export type Role = (typeof ROLES)[number]

export type RoleClass = 'operator' | 'client' | 'external'

export const ROLE_CLASS: Record<Role, RoleClass> = {
  farnek_admin: 'operator',
  portfolio_access: 'client',
  property_access: 'client',
  audit: 'external',
}

/** Scope levels, widest first. A grant binds at one of these (§2.5). */
export const SCOPE_LEVELS = ['platform', 'tenant', 'portfolio', 'hotel'] as const
export type ScopeLevel = (typeof SCOPE_LEVELS)[number]

/**
 * What a role is called in front of a person. A label, never an identifier: nothing
 * branches on these strings.
 *
 * Held here rather than beside the one screen that first needed it, because two screens
 * now name roles — the shell's badge and the people list — and a role named two ways is
 * a role a reader has to work out is the same role.
 */
export const ROLE_LABEL: Record<Role, string> = {
  farnek_admin: 'Farnek Admin',
  portfolio_access: 'Portfolio access',
  property_access: 'Property access',
  audit: 'Audit',
}

/**
 * The one flag on a grant (SPEC-02 §1.3). A Portfolio or Property grant marked view-only
 * keeps View on every module its role holds, and Export on reports, and nothing else.
 * One checkbox on the invite rather than a sixth role; it exists for the client executive
 * who receives consolidated performance and should never edit a figure or approve a
 * period.
 */
export const VIEW_ONLY_LABEL = 'view only'

/** A category in front of a person. Same rule: a label, never an identifier. */
export const DATA_CATEGORY_LABEL: Record<DataCategory, string> = {
  activity: 'Occupancy and guests',
  energy: 'Energy',
  water: 'Water',
  fuel: 'Fuel',
  waste: 'Waste',
  refrigerants: 'Refrigerants',
  generation: 'On-site generation',
  cost: 'Cost',
  procurement: 'Procurement',
  assets: 'Assets',
  certification: 'Certification',
  surveys: 'Surveys',
  events: 'Events',
  evidence: 'Evidence',
  travel: 'Travel and commuting',
}
