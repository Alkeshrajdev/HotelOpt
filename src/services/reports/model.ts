/**
 * Reports — SPEC-03I · I1, I2; Guide §18.
 *
 * Twelve kinds, one approved dataset. A report a person can produce here is one the
 * platform can assemble entirely from stored data; one it cannot says what it needs. A
 * regenerated report is a new version; a finalised one is never rewritten.
 */

export type ReportKind =
  | 'monthly_hotel_performance'
  | 'annual_sustainability'
  | 'carbon_inventory'
  | 'hotel_comparison'
  | 'portfolio_performance'
  | 'cost_budget_variance'
  | 'mv_report'
  | 'event_carbon'
  | 'compensation_retirement'
  | 'certification_readiness'
  | 'assurance_pack'
  | 'hospitality_methodology'

export interface ReportKindInfo {
  readonly kind: ReportKind
  readonly label: string
  readonly covers: string
  readonly needs: string
  /** 'month' takes one period; 'year' takes twelve months ending at the chosen one; 'none' is period-free. */
  readonly span: 'month' | 'year' | 'none'
  readonly subject: 'hotel' | 'portfolio'
}

export const REPORT_KINDS: readonly ReportKindInfo[] = [
  {
    kind: 'monthly_hotel_performance',
    label: 'Monthly Hotel Performance',
    covers:
      'energy, water, waste, carbon, Genuine Performance, comparison, cost variance, targets, the operational note',
    needs: 'an approved month',
    span: 'month',
    subject: 'hotel',
  },
  {
    kind: 'annual_sustainability',
    label: 'Annual Sustainability Performance',
    covers: 'annual totals, intensities, trends, retired instruments, target results',
    needs: 'twelve approved months, or it is issued as partial and names the months',
    span: 'year',
    subject: 'hotel',
  },
  {
    kind: 'carbon_inventory',
    label: 'Carbon Inventory',
    covers:
      'boundary, consolidation, base year, Scope 1, Scope 2 on both bases, Scope 3 with method mix, factors, instruments, compensation reported separately',
    needs: 'an approved month with a resolved grid factor',
    span: 'month',
    subject: 'hotel',
  },
  {
    kind: 'hotel_comparison',
    label: 'Hotel Comparison',
    covers:
      'this property against Hotel A and Hotel B on the same period, profiles, the COP factors, limitations',
    needs: 'two assigned comparators; refused while unassigned',
    span: 'month',
    subject: 'hotel',
  },
  {
    kind: 'portfolio_performance',
    label: 'Portfolio Performance',
    covers: 'consolidated totals, intensities with coverage disclosure, hotel drivers, targets',
    needs: 'the property to belong to a portfolio',
    span: 'month',
    subject: 'portfolio',
  },
  {
    kind: 'cost_budget_variance',
    label: 'Cost Variance',
    covers:
      'this period against the same period last year by resource, price and volume effects, effective rates',
    needs: 'billed cost on the month',
    span: 'month',
    subject: 'hotel',
  },
  {
    kind: 'mv_report',
    label: 'M&V Report',
    covers:
      'baseline, reporting period, IPMVP option, adjustments, the determination, reconciliation, the signatory',
    needs: 'at least one measure with a determination',
    span: 'none',
    subject: 'hotel',
  },
  {
    kind: 'event_carbon',
    label: 'Event Carbon',
    covers:
      'footprint by category, attendee travel with response rate and default-derived share, allocation, certificate',
    needs: 'an event with a computed footprint; none is on record',
    span: 'none',
    subject: 'hotel',
  },
  {
    kind: 'compensation_retirement',
    label: 'Compensation and Retirement',
    covers:
      'pools, retirements with references, allocations by beneficiary and period, certificates issued',
    needs: 'nothing; an empty position is stated as empty',
    span: 'none',
    subject: 'hotel',
  },
  {
    kind: 'certification_readiness',
    label: 'Certification Readiness',
    covers: 'requirement checklist, evidence register, gaps, linked documentation, per scheme',
    needs: 'an open certification cycle',
    span: 'none',
    subject: 'hotel',
  },
  {
    kind: 'assurance_pack',
    label: 'Assurance Pack',
    covers: 'sampling, calculation traces, data-quality summary, findings register',
    needs: 'an approved month; an engagement enriches it',
    span: 'month',
    subject: 'hotel',
  },
  {
    kind: 'hospitality_methodology',
    label: 'HCMI / HWMI / HWMM outputs',
    covers:
      'the hospitality-specific carbon, water and waste outputs at the activated methodology versions',
    needs: 'an activated HCMI, HWMI or HWMM methodology version; none is activated',
    span: 'month',
    subject: 'hotel',
  },
]

export function reportKindInfo(kind: string): ReportKindInfo | null {
  return REPORT_KINDS.find((k) => k.kind === kind) ?? null
}

export interface IssuedVersion {
  readonly id: string
  readonly version: number
  readonly status: 'draft' | 'finalised' | 'superseded'
  readonly createdAt: string
  readonly finalisedAt: string | null
  readonly finalisedBy: string | null
  readonly monthsIncluded: number
  readonly monthsExpected: number
  readonly monthsMissing: readonly string[]
  readonly dataStatus: string | null
  readonly checksum: string | null
  readonly storagePath: string | null
  readonly assured: boolean
}

export interface IssuedReport {
  readonly id: string
  readonly kind: ReportKind
  readonly label: string
  readonly title: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly versions: readonly IssuedVersion[]
}

export interface ScheduleView {
  readonly id: string
  readonly kind: ReportKind
  readonly label: string
  readonly dayOfMonth: number
  readonly recipients: readonly string[]
  readonly lastRunAt: string | null
  readonly lastOutcome: string | null
  readonly deferredReason: string | null
}

/**
 * One message this product sent about this property. Shown because a record nobody can
 * look at answers no question: "did the August report go out, and to whom?" is asked by
 * the person who did not receive it, and they need to see the answer, including when the
 * answer is that it was redirected or that nothing was sent at all.
 */
export interface MessageView {
  readonly id: string
  readonly subject: string
  readonly sentAt: string
  readonly intendedTo: readonly string[]
  readonly redirectedTo: string | null
  readonly outcome: 'sent' | 'failed' | 'suppressed'
  readonly detail: string
}

export interface ReportsModel {
  readonly hotelName: string
  readonly clientName: string
  readonly tenantId: string
  readonly portfolioId: string | null
  readonly mayProduce: boolean
  readonly mayFinalise: boolean
  readonly mayExport: boolean
  readonly periods: readonly {
    readonly id: string
    readonly month: string
    readonly status: string
  }[]
  readonly library: readonly ReportKindInfo[]
  readonly issued: readonly IssuedReport[]
  readonly schedules: readonly ScheduleView[]
  readonly correspondence: readonly MessageView[]
}

/** The months a span covers, ending at the chosen one: 'YYYY-MM' descending. */
export function monthsEndingAt(month: string, count: number): string[] {
  const [y, m] = month.split('-').map(Number)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1 - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

/** The first day after the last month, 'YYYY-MM-DD'. */
export function periodEndOf(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y ?? 2000, m ?? 1, 1))
  return d.toISOString().slice(0, 10)
}
