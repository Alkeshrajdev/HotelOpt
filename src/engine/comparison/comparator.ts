/**
 * Matched Hotel Comparison — §9, §26.3, CON-07.
 *
 * §26.3 calls this "the only intentional breach of tenant isolation, and therefore
 * explicitly mechanised". The mechanism is a separate comparator store holding an opaque
 * reference, the period, approved KPI values and BANDED profile attributes — and nothing
 * else. There is no code path from a client request to another tenant's operational
 * tables.
 *
 * The snapshot type below is the whole of what may cross. §9.3: "Adding a field is a
 * re-identification review, not a change request." So the type is closed, and a test
 * asserts no identifier survives into it — §26.3 requires exactly that test.
 */
import { Decimal, dec } from '../rounding'

/** comparison.min_eligible_pool. Two comparators drawn from a pool of three are
 *  effectively named (§26.3). */
export const MIN_ELIGIBLE_POOL = 5

export type RoomCountBand = '<100' | '100-199' | '200-349' | '350-499' | '500+'
export type GfaBand = '<10k' | '10k-24k' | '25k-49k' | '50k-99k' | '100k+'

/**
 * Bands, never exact values. An exact room count and GFA identify a hotel in most
 * markets (§9.3, §26.3).
 */
export function bandRoomCount(rooms: number): RoomCountBand {
  if (rooms < 100) return '<100'
  if (rooms < 200) return '100-199'
  if (rooms < 350) return '200-349'
  if (rooms < 500) return '350-499'
  return '500+'
}

export function bandGfa(gfaM2: number): GfaBand {
  if (gfaM2 < 10000) return '<10k'
  if (gfaM2 < 25000) return '10k-24k'
  if (gfaM2 < 50000) return '25k-49k'
  if (gfaM2 < 100000) return '50k-99k'
  return '100k+'
}

/** The fixed profile attribute set (§9.3). Bands only. */
export interface ComparatorProfile {
  readonly roomCountBand: RoomCountBand
  readonly gfaBand: GfaBand
  readonly starClassification: string
  readonly coolingSystemType: string
  readonly laundryArrangement: string
  readonly hasPool: boolean
  readonly hasSpa: boolean
  readonly staffAccommodationIncluded: boolean
  readonly climateZone: string
}

/**
 * The comparator snapshot KPI set is FIXED. The read-model carries exactly these values
 * per comparator, per period, and nothing else (§9.3).
 */
export interface ComparatorSnapshot {
  /** No tenant, hotel, brand, operator, address or coordinate (§9.3). */
  readonly comparatorReference: string
  readonly period: string
  readonly approved: boolean
  readonly energyIntensityPerOrn: string | null
  readonly energyIntensityPerM2: string | null
  /** Whether a COP conversion occurred BEFORE the snapshot was written (§9.3). */
  readonly copConversionApplied: boolean
  readonly waterIntensityPerOrn: string | null
  readonly wasteIntensityPerGuestNight: string | null
  /** The two-figure rule applies to comparators exactly as to the client hotel (§24.2). */
  readonly materialRecoveryRatePercent: string | null
  readonly landfillDiversionRatePercent: string | null
  readonly carbonIntensityPerOrn: string | null
  readonly carbonIntensityPerM2: string | null
  readonly profile: ComparatorProfile
}

/** Fields that must never appear in the comparator store or a client response. */
export const FORBIDDEN_IDENTIFIER_KEYS = [
  'tenantId',
  'tenant_id',
  'hotelId',
  'hotel_id',
  'hotelName',
  'name',
  'brand',
  'operator',
  'address',
  'latitude',
  'longitude',
  'city',
] as const

export class ReIdentificationError extends Error {
  constructor(found: readonly string[]) {
    super(
      `a comparator payload carries identifier field(s): ${found.join(', ')}. The comparator store holds an opaque reference only (§26.3, CON-07).`,
    )
    this.name = 'ReIdentificationError'
  }
}

/**
 * Assert a payload bound for the comparator store or a client response carries no
 * identifier. §26.3 requires tests that no client-facing response contains a
 * comparator's tenant, hotel or brand identifier — this is the check those tests drive.
 */
export function assertNoIdentifiers(payload: unknown): void {
  const found: string[] = []
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if ((FORBIDDEN_IDENTIFIER_KEYS as readonly string[]).includes(key)) found.push(key)
      walk(value)
    }
  }
  walk(payload)
  if (found.length > 0) throw new ReIdentificationError([...new Set(found)])
}

// ─── Assignment eligibility (§9.4, §26.3) ─────────────────────────────────────

export interface AssignmentRequest {
  readonly clientHotelId: string
  readonly candidateReference: string
  /** Comparator participation is a contractual tenant setting (§9.4 reciprocity). */
  readonly candidateTenantConsented: boolean
  readonly clientTenantConsented: boolean
  /** The market is the CITY or metropolitan area, not the country (§26.3). */
  readonly market: string
  /** Consented hotels sharing this market and profile band combination. */
  readonly eligiblePoolSize: number
  /** Competitor groups the client tenant has registered (§9.4). */
  readonly conflictGroups: readonly string[]
  readonly candidateGroups: readonly string[]
}

export type AssignmentOutcome =
  | { readonly permitted: true; readonly rationaleRequired: true }
  | { readonly permitted: false; readonly refusal: string }

export function evaluateAssignment(r: AssignmentRequest): AssignmentOutcome {
  if (!r.candidateTenantConsented) {
    return {
      permitted: false,
      refusal:
        'the candidate tenant has not consented to comparator participation; it is never used as a comparator',
    }
  }
  if (!r.clientTenantConsented) {
    return {
      permitted: false,
      refusal: 'cross-client comparison is not enabled for this tenant (§26.6)',
    }
  }
  const conflict = r.candidateGroups.filter((g) => r.conflictGroups.includes(g))
  if (conflict.length > 0) {
    return {
      permitted: false,
      refusal: `the candidate belongs to a registered competitor group (${conflict.join(', ')}) and is never assigned`,
    }
  }
  if (r.eligiblePoolSize < MIN_ELIGIBLE_POOL) {
    return {
      permitted: false,
      refusal: `only ${r.eligiblePoolSize} consented hotels share this market and profile band combination, below the floor of ${MIN_ELIGIBLE_POOL}; two comparators drawn from a pool that small are effectively named`,
    }
  }
  return { permitted: true, rationaleRequired: true }
}

// ─── Display rules (§9.2, §9.3, §9.4) ─────────────────────────────────────────

export type ComparisonCell =
  | { readonly kind: 'value'; readonly value: string; readonly denominator: string }
  | { readonly kind: 'not_applicable'; readonly label: 'Not applicable for this period' }
  | { readonly kind: 'not_yet_available'; readonly label: 'Not yet available for this period' }
  | {
      readonly kind: 'reassignment_pending'
      readonly label: 'Comparison hotel reassignment pending'
    }

export interface ComparisonRow {
  readonly metric: string
  readonly clientHotel: ComparisonCell
  readonly comparatorA: ComparisonCell
  readonly comparatorB: ComparisonCell
  /** Shown only where BOTH comparators have approved the period (§9.3). */
  readonly averageOfTwo: string | null
  readonly averageWithheldBecause: string | null
}

/**
 * An average of Hotel A and B may be shown only where both have approved the period.
 * Where one has not, no average is shown — AN AVERAGE OF ONE IS A DISCLOSURE OF THAT
 * ONE (§9.3).
 */
export function averageOfComparators(
  a: ComparisonCell,
  b: ComparisonCell,
): { readonly average: string | null; readonly withheldBecause: string | null } {
  if (a.kind !== 'value' || b.kind !== 'value') {
    return {
      average: null,
      withheldBecause:
        'both comparators must have approved the period; an average of one comparator discloses that comparator',
    }
  }
  return {
    average: dec(a.value).plus(b.value).div(2).toFixed(),
    withheldBecause: null,
  }
}

/**
 * A comparator whose intensity is suppressed under the zero-denominator rule shows
 * "Not applicable for this period". It is NEVER rendered as zero, and the pair is never
 * silently reduced to a single comparator (§9.3).
 */
export function comparatorCell(
  snapshot: ComparatorSnapshot | null,
  value: string | null,
  denominator: string,
): ComparisonCell {
  if (snapshot === null)
    return { kind: 'reassignment_pending', label: 'Comparison hotel reassignment pending' }
  if (!snapshot.approved)
    return { kind: 'not_yet_available', label: 'Not yet available for this period' }
  if (value === null) return { kind: 'not_applicable', label: 'Not applicable for this period' }
  return { kind: 'value', value, denominator }
}

/** Dual denominator is MANDATORY for energy and carbon comparison (§9.3). */
export const DUAL_DENOMINATOR_METRICS = ['energy_intensity', 'carbon_intensity'] as const

export class DisplayRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DisplayRuleError'
  }
}

export function assertDualDenominator(metric: string, denominatorsShown: readonly string[]): void {
  if (!(DUAL_DENOMINATOR_METRICS as readonly string[]).includes(metric)) return
  const hasOrn = denominatorsShown.includes('occupied_room_night')
  const hasArea = denominatorsShown.includes('gross_floor_area_m2')
  if (!hasOrn || !hasArea) {
    throw new DisplayRuleError(
      `${metric} comparison presents both per occupied room night and per m²; dual denominator is mandatory (§9.3)`,
    )
  }
}

/**
 * No ranking implying a population beyond these two hotels, and no percentiles,
 * quartiles or market-wide benchmark claims (§9.2).
 */
export const PROHIBITED_DISPLAY = {
  percentile: 'percentiles, quartiles or market-wide benchmark claims',
  ranking: 'any ranking implying a population beyond these two hotels',
  match_score: 'a numeric match score — the stored rationale is what a client or verifier sees',
  identity: 'a real hotel name, brand, operator or address',
  hotel_list: 'a searchable list of platform hotels',
} as const
export type ProhibitedDisplay = keyof typeof PROHIBITED_DISPLAY

export function assertDisplayPermitted(d: ProhibitedDisplay): never {
  throw new DisplayRuleError(
    `prohibited in client comparison display: ${PROHIBITED_DISPLAY[d]} (§9.2)`,
  )
}

/**
 * Instrument coverage and compensation may be compared separately but NEVER improve
 * operational ranking (§9.3) — the comparison equivalent of CON-04.
 */
export function operationalComparisonBasis(input: {
  readonly scope1: Decimal.Value
  readonly scope2LocationBased: Decimal.Value
  readonly scope2MarketBased?: Decimal.Value | undefined
  readonly compensationRetired?: Decimal.Value | undefined
}): { readonly value: string; readonly basis: string } {
  return {
    value: dec(input.scope1).plus(input.scope2LocationBased).toFixed(),
    basis:
      'Scope 1 and location-based Scope 2 within compatible boundaries; market-based accounting and compensation never improve operational ranking',
  }
}
