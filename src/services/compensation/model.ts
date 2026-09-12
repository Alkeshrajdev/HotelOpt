/**
 * Compensation, the client half — SPEC-04H §1–§4, §8, §9; SPEC-03I · I3.
 *
 * The approved gross inventory first; then what was retired against it, reported beside
 * the inventory and never subtracted from it; guest, event and third-party compensation
 * facilitated by the hotel reported apart and never added to its own line (§1, C-04).
 */

export interface CatalogueEntry {
  readonly poolId: string
  readonly mode: 'retire_to_order' | 'pooled'
  readonly registry: string
  readonly project: string
  readonly standard: string
  readonly country: string | null
  readonly projectType: string | null
  readonly avoidanceOrRemoval: string | null
  readonly vintage: string
  readonly price: { readonly amount: string; readonly currency: string } | null
  readonly available: string
  readonly status: string
  readonly retirementReference: string
  readonly retirementDate: string
  readonly dedicated: boolean
}

export interface OrderView {
  readonly allocationId: string
  readonly period: string
  readonly quantity: string
  readonly allocatedAt: string
  readonly pool: {
    readonly project: string
    readonly registry: string
    readonly standard: string
    readonly vintage: string
    readonly mode: string
    readonly reference: string
  }
  readonly certificate: {
    readonly serial: string
    readonly issuedAt: string
    readonly voidedAt: string | null
  } | null
}

export interface Position {
  readonly compensated: readonly {
    readonly period: string
    readonly quantity: string
    readonly orders: number
    readonly certificates: number
  }[]
  readonly facilitated: {
    readonly guest: string
    readonly event: string
    readonly thirdParty: string
  }
  readonly orders: readonly OrderView[]
}

export interface CertificateView {
  readonly serial: string
  readonly beneficiaryType: string
  readonly beneficiaryLabel: string
  readonly quantity: string
  readonly period: string
  readonly registry: string
  readonly project: string
  readonly standard: string
  readonly vintage: string
  readonly retirementReference: string
  readonly retirementDate: string
  readonly claim: string
  readonly issuedAt: string
  readonly voidedAt: string | null
  readonly voidReasonClass: string | null
}

export interface InstrumentView {
  readonly id: string
  readonly carrier: string
  readonly kind: string
  readonly quantityMwh: string
  readonly period: string
  readonly market: string
  readonly registry: string | null
  readonly serialRange: string | null
  readonly emissionRate: string | null
  readonly vintageFrom: string | null
  readonly vintageTo: string | null
  readonly retirementReference: string | null
  readonly retirementDate: string | null
  readonly beneficiaryNamed: boolean
  readonly checks: Readonly<Record<string, boolean>>
  readonly failedChecks: readonly string[]
  readonly status: 'eligible' | 'visible_but_excluded'
  readonly recordedAt: string
}

export interface CompensationModel {
  readonly hotelName: string
  readonly clientName: string
  readonly mayOrder: boolean
  readonly mayExport: boolean
  readonly periods: readonly {
    readonly id: string
    readonly month: string
    readonly status: string
  }[]
  readonly selectedPeriod: { readonly id: string; readonly month: string } | null
  /** The approved gross inventory for the selected period, tCO2e, or why there is none. */
  readonly grossInventory:
    | { readonly value: string; readonly coverage: string }
    | { readonly value: null; readonly reason: string }
  readonly position: Position | null
  readonly catalogue: readonly CatalogueEntry[]
  readonly certificates: readonly CertificateView[]
  readonly instruments: readonly InstrumentView[]
  readonly threshold: string
  readonly permittedClaim: string
}

export const CHECK_LABEL: Readonly<Record<string, string>> = {
  attribute_conveyance: 'Attribute conveyance: the emission rate is recorded',
  exclusive_claim: 'Exclusive claim: no other instrument carries this serial range',
  retirement: 'Retirement: reference, date and the beneficiary named',
  vintage_proximity: 'Vintage proximity: generated within the window of the consumption period',
  market_boundary: 'Market boundary: the same market and grid as the consumption',
  evidence: 'Evidence: a registry statement with a serial reference',
}

export const KIND_LABEL: Readonly<Record<string, string>> = {
  irec: 'I-REC',
  ppa_physical: 'Physical PPA with attribute delivery',
  ppa_virtual: 'Virtual PPA, certificates delivered and retired',
  green_tariff: 'Green tariff backed by retired certificates',
  direct_line: 'Direct-line supply',
  other: 'Other contractual instrument',
}

/** The sentence the Offset Centre shows after an allocation (§8). Never a neutrality claim. */
export function compensatedSentence(
  quantity: string,
  period: string,
  project: string,
  registry: string,
): string {
  return `${quantity} tCO2e for ${period} compensated through retired carbon credits: ${project}, retired on the ${registry} registry. The inventory itself is unchanged.`
}

const NEUTRALITY =
  /carbon[- ]?neutral|net[- ]?zero|climate[- ]?positive|climate[- ]?neutral|offset (your|the) footprint entirely|fully offset|zero[- ]?carbon|carbon[- ]?free|neutrali[sz]ed/i

/** The client-side echo of the database's rule (§12.4): text that would be refused. */
export function containsNeutralityClaim(text: string): boolean {
  return NEUTRALITY.test(text)
}
