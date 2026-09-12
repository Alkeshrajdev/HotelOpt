/**
 * Surveys — SPEC-03H · H4, SPEC-03A · A4, Guide §15.
 *
 * What are we asking, of whom, and who has answered? The only route by which people with
 * no account put data into the platform. A response rate is a fraction, and where no
 * denominator exists none is computed anywhere (§15.1.2).
 */

export type DistributionMode = 'recipient_link' | 'shared_qr' | 'public_url'
export type Audience = 'supplier' | 'staff' | 'guest' | 'attendee' | 'occupant'

export interface TemplateSummary {
  readonly code: string
  readonly name: string
  readonly audience: Audience
  readonly anonymous: boolean
  readonly version: string
  readonly questionCount: number
  readonly feeds: readonly string[]
}

export interface QuestionResult {
  readonly code: string
  readonly prompt: string
  readonly type: string
  readonly metric: string | null
  readonly answered: number
  readonly mean: string | null
  readonly yesSharePercent: string | null
  readonly choices: Readonly<Record<string, number>>
  readonly texts: readonly string[]
}

export interface SurveyResults {
  readonly responses: number
  readonly invited: number
  readonly population: number | null
  readonly populationSource: string | null
  readonly responseRatePercent: string | null
  readonly openCollectionLabel: string | null
  readonly questions: readonly QuestionResult[]
}

export interface DistributionView {
  readonly id: string
  readonly name: string
  readonly template: TemplateSummary
  readonly mode: DistributionMode
  readonly month: string | null
  readonly opensAt: string
  readonly closesAt: string | null
  readonly revokedAt: string | null
  readonly state: 'scheduled' | 'open' | 'closed'
  readonly responses: number
  readonly invited: number
  readonly answered: number
  readonly results: SurveyResults | null
  readonly recipients: readonly {
    readonly id: string
    readonly reference: string | null
    readonly invitedAt: string
    readonly respondedAt: string | null
  }[]
  readonly aggregatedMetrics: readonly {
    readonly code: string
    readonly value: string
    readonly month: string
  }[]
}

export interface SurveysModel {
  readonly hotelName: string
  readonly mayEdit: boolean
  readonly mayExport: boolean
  readonly templates: readonly TemplateSummary[]
  readonly distributions: readonly DistributionView[]
  readonly selected: DistributionView | null
  readonly periods: readonly { readonly id: string; readonly month: string }[]
  readonly responsesThisPeriod: number
}

export const MODE_LABEL: Readonly<Record<DistributionMode, string>> = {
  recipient_link: 'Recipient link: one link, one response',
  shared_qr: 'Shared code: many scans, a session each',
  public_url: 'Public address: no token, capped and rate-limited',
}

export const AUDIENCE_LABEL: Readonly<Record<Audience, string>> = {
  supplier: 'Suppliers and contractors',
  staff: 'Staff',
  guest: 'Guests',
  attendee: 'Event attendees',
  occupant: 'Occupants',
}

/** The state of a distribution at a moment. */
export function distributionState(
  opensAt: string,
  closesAt: string | null,
  revokedAt: string | null,
  now = new Date(),
): DistributionView['state'] {
  if (revokedAt) return 'closed'
  if (Date.parse(opensAt) > now.getTime()) return 'scheduled'
  if (closesAt && Date.parse(closesAt) <= now.getTime()) return 'closed'
  return 'open'
}

/** The rate sentence, or the count sentence where no denominator exists (§15.1.2). */
export function coverageSentence(r: SurveyResults): string {
  if (r.population === null)
    return `${r.responses} ${r.responses === 1 ? 'response' : 'responses'} · ${r.openCollectionLabel ?? 'open collection, no defined population'}`
  return `${r.responses} of ${r.population} answered (${r.responseRatePercent ?? '0'}%) · population: ${r.populationSource ?? 'stated'}`
}
