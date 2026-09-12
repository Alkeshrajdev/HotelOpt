/**
 * The month list — SPEC-03D · D1. The contract for `/hotel/:h/data`.
 *
 * Written first, per SPEC-01 §2.1 rule 1: the stub is a value of this type and the route
 * passes it to components as props. Nothing here is a figure; the completeness pair is a
 * count of supplies, not a KPI, and the strip is a count of months.
 */
import type { PeriodStatus } from '@/services/entry/model'

export interface Completeness {
  /** Supplies with a reading this month. */
  readonly reported: number
  /** Supplies in service this month (effective-dated, C3). A month before a meter existed is not incomplete. */
  readonly inService: number
}

export interface MonthRow {
  readonly id: string
  /** YYYY-MM. */
  readonly month: string
  readonly status: PeriodStatus
  /** Set when the month was approved and reopened: it is not an ordinary draft. */
  readonly reopened: boolean
  readonly returnedReason: string | null
  /** Null where the reader may not see the supplies. */
  readonly completeness: Completeness | null
  /** When the month last moved — submitted, approved — as an ISO instant, or null. */
  readonly lastMovedAt: string | null
}

/** D1 block 2: the strip. Months closed · open · returned. */
export interface MonthsStrip {
  readonly closed: number
  readonly open: number
  readonly returned: number
}

export interface MonthsModel {
  readonly hotelName: string
  /** Newest first. */
  readonly rows: readonly MonthRow[]
  readonly strip: MonthsStrip
  /** The reader holds create-and-edit on at least one category here. */
  readonly mayEnter: boolean
  /** YYYY-MM-DD of the next month to open, or null where every month to date exists. */
  readonly nextMonthToOpen: string | null
}

export function stripFor(rows: readonly MonthRow[]): MonthsStrip {
  let closed = 0
  let open = 0
  let returned = 0
  for (const r of rows) {
    if (r.status === 'approved' || r.status === 'locked') closed += 1
    else if (r.status === 'returned') returned += 1
    else open += 1
  }
  return { closed, open, returned }
}

/**
 * The first month, at or before the current one, that has no reporting period.
 *
 * Offering "open the next month" from the newest existing one would let a hotel open
 * October while September is missing, and a gap in the calendar is the thing §24.8 makes
 * every annual figure disclose. Working forward from the earliest gap instead means the
 * obvious button never creates one.
 */
export function nextUnopenedMonth(existing: readonly string[], now = new Date()): string | null {
  const held = new Set(existing.map((d) => d.slice(0, 7)))
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  if (held.size === 0) return current.toISOString().slice(0, 10)

  const earliest = [...held].sort()[0]!
  const cursor = new Date(`${earliest}-01T00:00:00Z`)
  while (cursor <= current) {
    const key = cursor.toISOString().slice(0, 7)
    if (!held.has(key)) return `${key}-01`
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return null
}

/** Does a supply's service window overlap a month? Overlap, not containment. */
export function inServiceDuring(
  supply: { readonly effectiveFrom: string; readonly effectiveTo: string | null },
  periodStart: string,
  periodEnd: string,
): boolean {
  return (
    supply.effectiveFrom < periodEnd &&
    (supply.effectiveTo === null || supply.effectiveTo > periodStart)
  )
}
