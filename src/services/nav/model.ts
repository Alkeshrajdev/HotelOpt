/**
 * What appears in the navigation rail — §2.4, §2.5.
 *
 * Two rules decide, and they are ANDed rather than ORed, which is the whole content of
 * this module.
 *
 *   1. §2.4: a module the reader does not hold is outside navigation. Not greyed, not
 *      shown-then-refused — absent. A disabled item still discloses that the module
 *      exists and that this person is not allowed it, which is the disclosure §2.5 spends
 *      the whole 404-not-403 rule avoiding.
 *
 *   2. A module with no screen is also absent. This is not in the guide; it is here
 *      because the alternative is a rail full of links to nothing, and a person cannot
 *      tell "you do not hold this" from "this was never built" by clicking. There are
 *      twenty-three modules in access.role_capabilities and five screens. A rail listing
 *      twenty-three of them would look like a product and behave like a mockup.
 *
 * When a screen lands, its module moves from UNBUILT to ITEMS and the rail grows for
 * everyone who holds it, with no other change anywhere.
 */

export interface NavItem {
  readonly key: string
  readonly label: string
  readonly href: string
  /**
   * The rail groups by the question being asked, not by the module list (SPEC-02 §2):
   * Data · Workflow · Performance · Compliance · Carbon · Administration. A group appears
   * only when it holds at least one visible item, so grouping adds nothing to a rail with
   * one item in it and structure to one with nine.
   */
  readonly group: NavGroup
  /**
   * A count beside the label — always something counted, never a decoration. Absent, not
   * zero, when there is nothing to count: a badge showing 0 is a badge that has to be
   * read before it can be dismissed.
   */
  readonly badge?: number
}

export type NavGroup =
  'Data' | 'Workflow' | 'Performance' | 'Compliance' | 'Carbon' | 'Administration'

/** The order groups appear in the rail. SPEC-02 §2. */
export const NAV_GROUPS: readonly NavGroup[] = [
  'Data',
  'Workflow',
  'Performance',
  'Compliance',
  'Carbon',
  'Administration',
]

/**
 * Module → the screen it opens, for the modules that HAVE one. The href takes the hotel
 * because every screen built so far is a screen about one hotel.
 */
const ITEMS: readonly {
  readonly key: string
  readonly module: string
  readonly label: string
  readonly group: NavGroup
  readonly href: (hotelId: string) => string
}[] = [
  {
    key: 'performance',
    module: 'performance',
    label: 'Performance',
    group: 'Performance',
    href: (h) => `/hotel/${h}/overview`,
  },
  { key: 'data', module: 'data', label: 'Data', group: 'Data', href: (h) => `/hotel/${h}/data` },
  {
    key: 'approval',
    module: 'approval',
    label: 'Review',
    group: 'Workflow',
    href: (h) => `/hotel/${h}/review`,
  },
  {
    // Registering a meter is a `data` action on the category it belongs to, which is why
    // it sits under that module rather than an invented 'configuration' one. A person who
    // may create energy data at a hotel may register an energy meter there.
    key: 'supplies',
    module: 'data',
    label: 'Meters',
    group: 'Data',
    href: (h) => `/hotel/${h}/supplies`,
  },
  {
    // Section C: every outside system feeding this property, its health, and the action
    // required when it is not delivering (C-11).
    key: 'connections',
    module: 'integrations',
    label: 'Connections',
    group: 'Data',
    href: (h) => `/hotel/${h}/connections`,
  },
  {
    // Classifications belong to the CLIENT rather than the property, but they are a
    // `data` action on the procurement category and the rail is hotel-scoped, so they are
    // reached from a hotel. The screen says so rather than leaving it to be discovered.
    key: 'classifications',
    module: 'data',
    label: 'Suppliers',
    group: 'Data',
    href: (h) => `/hotel/${h}/classifications`,
  },
  {
    // Section I over engine/cost (SPEC-03F · F8). A distinct module: a reader may hold
    // performance and not cost, and the rail then does not offer it.
    key: 'cost',
    module: 'cost',
    label: 'Cost',
    group: 'Performance',
    href: (h) => `/hotel/${h}/cost`,
  },
  {
    // Section H over engine/mv (SPEC-03G · G1, G2). Hotel-scoped here; the portfolio view
    // of the register is WP9's. `mv` is the module the matrix names for it.
    key: 'measures',
    module: 'mv',
    label: 'Measures',
    group: 'Performance',
    href: (h) => `/hotel/${h}/measures`,
  },
  {
    // H1 (SPEC-03H · H1). Packs are content; the rail item is the same whatever packs a
    // property pursues, and a reader holding certification:V sees it.
    key: 'certification',
    module: 'certification',
    label: 'Certifications',
    group: 'Compliance',
    href: (h) => `/hotel/${h}/certifications`,
  },
  {
    // H2 (SPEC-03H · H2). The verifier's screen as much as the client's: the audit role
    // holds assurance:V/E and sees its own engagement here.
    key: 'assurance',
    module: 'assurance',
    label: 'Assurance',
    group: 'Compliance',
    href: (h) => `/hotel/${h}/assurance`,
  },
  {
    // H3 (SPEC-03H · H3): the shared evidence library, read with assurance:V.
    key: 'documents',
    module: 'assurance',
    label: 'Documents',
    group: 'Compliance',
    href: (h) => `/hotel/${h}/documents`,
  },
  {
    // H4 (SPEC-03H · H4): the screen that handles everybody outside the platform.
    key: 'surveys',
    module: 'surveys',
    label: 'Surveys',
    group: 'Compliance',
    href: (h) => `/hotel/${h}/surveys`,
  },
  {
    // F6 over the overview's carbon card (SPEC-03F · F6). A level and a decomposition,
    // never a verdict; its own module, its own group.
    key: 'carbon',
    module: 'carbon',
    label: 'Carbon',
    group: 'Carbon',
    href: (h) => `/hotel/${h}/carbon`,
  },
  {
    // I1 and I2 (SPEC-03I): what leaves the platform. reports:V reads what was issued.
    key: 'reports',
    module: 'reports',
    label: 'Reports',
    group: 'Compliance',
    href: (h) => `/hotel/${h}/reports`,
  },
  {
    // The Carbon Offset Centre (SPEC-04H §8): the approved gross inventory first, then
    // what was retired against it, never netted (C-04).
    key: 'compensation',
    module: 'compensation',
    label: 'Compensation',
    group: 'Carbon',
    href: (h) => `/hotel/${h}/compensation`,
  },
  {
    // I3 (SPEC-03I · I3): holdings, retirements, certificates, and the energy attribute
    // instruments with their six checks.
    key: 'instruments',
    module: 'compensation',
    label: 'Instruments',
    group: 'Carbon',
    href: (h) => `/hotel/${h}/instruments`,
  },
  {
    // `users`, not an invented 'people' module. §2.4 gives users E/N to the platform,
    // portfolio and hotel admins; the screen is where that authority is exercised, and
    // a reader holding only V on it sees the list and is offered nothing.
    key: 'people',
    module: 'users',
    label: 'People',
    group: 'Administration',
    href: (h) => `/hotel/${h}/people`,
  },
]

/**
 * The screens that are NOT about one hotel, and the module each belongs to.
 *
 * Registering a hotel decides which hotels exist; publishing a factor set changes what
 * every tenant's historical figures mean. Neither has a property to be inside, so neither
 * can hang off a rail whose every href starts `/hotel/`.
 *
 * The same two rules decide these as decide the others — the reader holds the module, and
 * a screen exists — asked of what they hold at PLATFORM scope rather than at a hotel.
 */
/*
 * ONE WORD EACH (FE-01 §3.1), and the SAME word the page uses for itself (§3.6). The rail
 * said "Data capture" and the screen it opened said "Monthly data"; "Review & approval"
 * opened "Review and approval"; "Classification model" opened a page of the same name in
 * a rail three words wide. A reader should not have to translate between the thing they
 * clicked and the thing they arrived at.
 */
const OPERATOR_ITEMS: readonly {
  readonly key: string
  readonly module: string
  readonly label: string
  readonly href: string
}[] = [
  { key: 'operator-hotels', module: 'tenancy', label: 'Clients', href: '/operator' },
  { key: 'operator-factors', module: 'factors', label: 'Factors', href: '/operator/factors' },
  { key: 'operator-model', module: 'ai', label: 'Model', href: '/operator/model' },
  // Retirement pools and certificates: Farnek's half of compensation (SPEC-04H §2, §4, §9).
  { key: 'operator-pools', module: 'compensation', label: 'Pools', href: '/operator/pools' },
  { key: 'operator-users', module: 'users', label: 'Users', href: '/operator/users' },
  { key: 'operator-access', module: 'users', label: 'Access', href: '/operator/access' },
  { key: 'operator-schemes', module: 'certification', label: 'Schemes', href: '/operator/schemes' },
  { key: 'operator-security', module: 'users', label: 'Security', href: '/operator/security' },
]

/**
 * The modules that exist in the capability matrix and have no screen. Listed rather than
 * inferred, so that adding a module to the matrix without deciding where it belongs shows
 * up as a failing test rather than as an item quietly missing from every rail.
 */
export const UNBUILT_MODULES: readonly string[] = [
  'assets',
  'audit',
  'comparison',
  'events',
  'payments',
  'scope3',
  'targets',
]

/**
 * Every module a nav item could ever be built for. The matrix must not exceed this.
 *
 * Deduplicated, because one module can serve more than one screen: entering a reading and
 * registering the meter it is read from are both `data` actions, and both are things a
 * person holding create-and-edit on that category may do.
 */
export function knownModules(): readonly string[] {
  return [
    ...new Set([
      ...ITEMS.map((i) => i.module),
      ...OPERATOR_ITEMS.map((i) => i.module),
      ...UNBUILT_MODULES,
    ]),
  ].sort()
}

/**
 * The rail off a hotel, for a reader who holds something above one.
 *
 * A reader who holds nothing at platform scope gets nothing — not a rail of items that
 * would refuse, and not a message saying the screens exist (§2.5). That is the same
 * answer they got before these screens were built, which is the point: adding an operator
 * area must not change what an ordinary reader sees anywhere.
 */
/**
 * The two screens whose scope is the reader, not a hotel (SPEC-03E · E2, E3). They sit in
 * the Workflow group of every rail that holds the module they belong to.
 */
export const GLOBAL_ITEMS: readonly { key: string; module: string; label: string; href: string }[] =
  [
    { key: 'attention', module: 'performance', label: 'Attention', href: '/attention' },
    { key: 'calendar', module: 'reports', label: 'Calendar', href: '/calendar' },
  ]

export function globalNavItems(heldModules: readonly string[] | null): readonly NavItem[] {
  return GLOBAL_ITEMS.filter((i) => heldModules === null || heldModules.includes(i.module)).map(
    (i) => ({
      key: i.key,
      label: i.label,
      href: i.href,
      group: 'Workflow' as const,
    }),
  )
}

export function operatorNavItems(heldModules: readonly string[]): readonly NavItem[] {
  return OPERATOR_ITEMS.filter((i) => heldModules.includes(i.module)).map((i) => ({
    key: i.key,
    label: i.label,
    href: i.href,
    group: 'Administration' as const,
  }))
}

export interface NavInput {
  readonly hotelId: string
  /** Modules the reader holds any action on at this hotel, from access.my_actions. */
  readonly heldModules: readonly string[]
  /** Months awaiting this reader's approval at this hotel. */
  readonly pendingApprovals: number
}

export function navItems(input: NavInput): readonly NavItem[] {
  return ITEMS.filter((i) => input.heldModules.includes(i.module)).map((i) => {
    const base: NavItem = {
      key: i.key,
      label: i.label,
      href: i.href(input.hotelId),
      group: i.group,
    }
    // The badge counts months this reader can actually act on. A count of what someone
    // ELSE has to approve would be a number the reader cannot make go away.
    if (i.key === 'approval' && input.pendingApprovals > 0) {
      return { ...base, badge: input.pendingApprovals }
    }
    return base
  })
}

/**
 * Which item is current, given the path. Longest matching href wins, so
 * /hotel/x/data/2026-07 marks Data capture rather than nothing.
 */
export function currentNavKey(items: readonly NavItem[], pathname: string): string | null {
  let best: NavItem | null = null
  for (const item of items) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (best === null || item.href.length > best.href.length) best = item
    }
  }
  if (best === null) {
    // The pillar views (SPEC-03F) live under /hotel/:h/performance/… and open from the
    // overview; the rail's one Performance item stays current on all of them.
    const pillar = /^\/hotel\/[^/]+\/performance(\/|$)/.test(pathname)
    if (pillar) return items.find((i) => i.key === 'performance')?.key ?? null
  }
  return best?.key ?? null
}

/** The rail's wording, exported so FE-01 §3.1 can be asserted rather than remembered. */
export const HOTEL_ITEM_LABELS: readonly string[] = ITEMS.map((i) => i.label)
export const OPERATOR_ITEM_LABELS: readonly string[] = OPERATOR_ITEMS.map((i) => i.label)
