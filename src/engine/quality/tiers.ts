/**
 * Data quality tiers — §6.6.
 *
 * Every quantitative record carries one of three tiers. The tier classifies WHAT THE
 * NUMBER IS, not how it arrived. Channel — bill, integration, OCR, manual entry — is
 * provenance, already recorded in source type, evidence link and audit trail, and is
 * not a quality signal: the same bill keyed by hand or read by OCR is the same number
 * at the same quality.
 *
 * A utility's own estimate is an Estimate. Treating an estimated supplier bill as
 * Measured because it arrived on a supplier document is the single most common way a
 * data-quality model is quietly falsified, and it corrupts Genuine Performance training
 * (§7.3) and assurance sampling (§19.3). `read_basis` therefore governs the tier and
 * cannot be overridden upward by a user.
 */

export type QualityTier = 'measured' | 'estimated' | 'proxy'

export const TIER_DEFINITION: Record<QualityTier, string> = {
  measured:
    'An actual meter read, or a supplier bill based on an actual read, for this hotel, this source and this period.',
  estimated:
    'No actual measurement exists for this period. Produced by a documented estimation method recorded on the record.',
  proxy:
    'Derived from a different quantity, a different property, a benchmark or an industry factor.',
}

/**
 * A captured field in OCR extraction, in every utility connector mapping, and on the
 * manual entry form. It is not optional (§6.6).
 */
export type ReadBasis = 'actual' | 'estimated' | 'customer_supplied' | 'unknown'

/**
 * Record attributes that are NOT tiers. Displayed as qualifiers where relevant (§6.4).
 */
export interface RecordAttributes {
  readonly apportioned: boolean
  readonly derived: boolean
  readonly corrected: boolean
}

export interface TierInput {
  readonly readBasis: ReadBasis
  /**
   * The tier the source or user proposes. It may be lowered by the rules below but
   * never raised: `read_basis` governs.
   */
  readonly proposedTier: QualityTier
  /** Required for Estimated and Proxy, and it appears in the calculation trace (§6.6). */
  readonly method?: string | undefined
}

export interface TierResolution {
  readonly tier: QualityTier
  /** The estimation method, mandatory for Estimated and Proxy. */
  readonly method: string | null
  /** True where read_basis forced a tier lower than the one proposed. */
  readonly forced: boolean
  /** Raised where the source's default read basis needs configuring (§6.6). */
  readonly attentionItem: string | null
}

export class QualityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QualityError'
  }
}

const RANK: Record<QualityTier, number> = { measured: 3, estimated: 2, proxy: 1 }

/**
 * Resolve the tier a record carries.
 *
 * A non-measured value without a stated method is a hard block (§6.3): the record
 * cannot be saved. That is enforced here rather than left to a form.
 */
export function resolveTier(input: TierInput): TierResolution {
  let tier = input.proposedTier
  let method = input.method?.trim() ?? ''
  let forced = false
  let attentionItem: string | null = null

  switch (input.readBasis) {
    case 'estimated':
      // Forces Estimated with this method. Cannot be overridden upward by a user.
      if (RANK[tier] > RANK.estimated) {
        tier = 'estimated'
        forced = true
      }
      if (method === '') method = 'supplier estimated read'
      break

    case 'unknown':
      if (RANK[tier] > RANK.estimated) {
        tier = 'estimated'
        forced = true
      }
      if (method === '') method = 'read basis not established'
      // Never silently promoted to Measured.
      attentionItem = "configure the source's default read basis"
      break

    case 'customer_supplied':
      // A customer-supplied read is not an actual read taken by the supplier.
      if (RANK[tier] > RANK.estimated) {
        tier = 'estimated'
        forced = true
      }
      if (method === '') method = 'customer-supplied read'
      break

    case 'actual':
      break
  }

  if (tier !== 'measured' && method === '') {
    throw new QualityError(
      `a ${tier} record cannot be saved without a stated estimation method (§6.3, §6.6)`,
    )
  }

  return {
    tier,
    method: tier === 'measured' ? null : method,
    forced,
    attentionItem,
  }
}

/**
 * The lifecycle a rebill completes: an estimated bill later reissued on an actual read
 * is a correction under §6.4, and the corrected record becomes Measured. This is the
 * normal and expected lifecycle, not an exception.
 */
export function applyRebill(): TierResolution {
  return { tier: 'measured', method: null, forced: false, attentionItem: null }
}

/**
 * Completeness may only be expressed within a common unit. Mixed kWh, m³, kg of
 * refrigerant and tonnes of waste cannot be volume-weighted into one figure; doing so
 * produces a number that means nothing (§6.6.1).
 */
export class MixedUnitCompletenessError extends Error {
  constructor(units: readonly string[]) {
    super(
      `completeness is expressible only within a common unit; got [${units.join(', ')}] (§6.6.1)`,
    )
    this.name = 'MixedUnitCompletenessError'
  }
}

export interface CompletenessInput {
  readonly unit: string
  readonly quantity: string
  readonly tier: QualityTier
}

export interface Completeness {
  readonly unit: string
  readonly measuredShare: string
  readonly byTier: Record<QualityTier, string>
}

/**
 * Completeness within one unit. Refuses a mixed-unit set rather than returning a
 * meaningless figure.
 */
export function completeness(records: readonly CompletenessInput[]): Completeness {
  const units = [...new Set(records.map((r) => r.unit))]
  if (units.length !== 1) throw new MixedUnitCompletenessError(units)
  const unit = units[0] as string

  // Imported lazily to keep this module free of a cycle through the rounding index.
  const totals: Record<QualityTier, number> = { measured: 0, estimated: 0, proxy: 0 }
  let grand = 0
  for (const r of records) {
    const q = Number(r.quantity)
    totals[r.tier] += q
    grand += q
  }

  const share = (v: number): string => (grand === 0 ? '0' : String((v / grand) * 100))

  return {
    unit,
    measuredShare: share(totals.measured),
    byTier: {
      measured: share(totals.measured),
      estimated: share(totals.estimated),
      proxy: share(totals.proxy),
    },
  }
}

/**
 * The dashboard disclosure rule: a single "includes estimated data" marker when any
 * input is not Measured, and nothing at all when every input is Measured. No
 * percentages on dashboards, cards or performance pages (§6.6.1).
 */
export function dashboardMarker(tiers: readonly QualityTier[]): string | null {
  return tiers.some((t) => t !== 'measured') ? 'includes estimated data' : null
}
