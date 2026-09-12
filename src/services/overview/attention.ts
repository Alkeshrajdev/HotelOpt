/**
 * Attention Required — §5.6.
 *
 * "Actionable items only... Maximum five, ordered by due date then severity, with a link
 * to the full list... Direct links to the exact record. When nothing is needed, show
 * 'No items requiring attention' and collapse the space."
 *
 * Two rules that are easy to implement backwards. The ordering is due date FIRST and
 * severity second — sorting by severity first buries an overdue approval under a critical
 * item that is not due for a month, which is the opposite of a work list. And the cap is
 * five WITH a link to the full list: five items and no link is a truncation that hides
 * work, which is worse than showing none.
 */

export type AttentionKind =
  | 'missing_data'
  | 'returned_submission'
  | 'approval_request'
  | 'expired_evidence'
  | 'pending_retirement_certificate'
  | 'open_verifier_finding'
  | 'overdue_calendar_item'
  | 'survey_response_gap'
  | 'final_report_approval'

export type Severity = 'critical' | 'material' | 'minor'

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, material: 1, minor: 2 }

export interface AttentionItem {
  readonly kind: AttentionKind
  readonly title: string
  /** ISO date. Items with no due date sort after those that have one. */
  readonly dueDate?: string
  readonly severity: Severity
  /** A direct link to the exact record, never to a filtered list (§5.6). */
  readonly href: string
}

export interface AttentionBlock {
  readonly items: readonly AttentionItem[]
  readonly total: number
  readonly collapsed: boolean
  readonly emptyLabel: 'No items requiring attention'
  /** Present whenever more items exist than the five shown. */
  readonly fullListHref: string | null
}

export const MAX_ATTENTION_ITEMS = 5

export class AttentionItemError extends Error {}

export function buildAttentionBlock(
  items: readonly AttentionItem[],
  fullListHref: string,
): AttentionBlock {
  for (const item of items) {
    if (item.href.trim() === '') {
      throw new AttentionItemError(
        `"${item.title}" has no link; §5.6 requires a direct link to the exact record`,
      )
    }
  }

  const ordered = [...items].sort((a, b) => {
    // Due date first. An item with no due date is not urgent by omission, so it sorts
    // after every dated one rather than to the top.
    const aDue = a.dueDate ?? '9999-12-31'
    const bDue = b.dueDate ?? '9999-12-31'
    if (aDue !== bDue) return aDue < bDue ? -1 : 1
    const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (severity !== 0) return severity
    return a.title < b.title ? -1 : a.title > b.title ? 1 : 0
  })

  const shown = ordered.slice(0, MAX_ATTENTION_ITEMS)

  return {
    items: shown,
    total: items.length,
    collapsed: items.length === 0,
    emptyLabel: 'No items requiring attention',
    // Five items and no link is a truncation that hides work.
    fullListHref: items.length > shown.length ? fullListHref : null,
  }
}
