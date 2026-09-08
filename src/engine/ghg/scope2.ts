/**
 * Scope 2 — location-based and market-based — §11.4 to §11.7.
 *
 * THREE QUANTITIES, DEFINED ONCE, USED EVERYWHERE (§11.7). Conflating them is the most
 * common Scope 2 accounting error:
 *
 *   G = grid import              electricity purchased from the grid, per the bill
 *   S = self-consumed generation on-site generation consumed on site
 *   T = G + S                    total electricity consumed
 *
 * G is what the meter and the bill measure. S never appears on the supplier bill.
 * T is the denominator of renewable coverage (§11.9); G is the denominator of Scope 2,
 * because Scope 2 covers purchased energy only.
 *
 * Applying a grid factor to self-consumed solar is a defect class explicitly tested for
 * (T-23), and Σ (quantity at each tier) = G exactly is acceptance test T-43.
 *
 * Location-based Scope 2 is always produced, always reported, and is never affected by
 * any contractual instrument, on-site attribute claim or compensation (§11.4, CON-04).
 */
import { Decimal, dec, percentage, sum } from '../rounding'

export interface EnergyQuantities {
  /** G — purchased from the grid, per the supplier bill. */
  readonly gridImport: Decimal.Value
  /** S — on-site generation consumed on site. Never on the supplier bill. */
  readonly selfConsumedGeneration: Decimal.Value
  /** Attributes retained rather than sold. Governs renewable coverage, not E (§11.7). */
  readonly selfConsumedAttributesRetained?: Decimal.Value | undefined
  /** Exported generation enters neither G, S, T nor E. Information only (§8.11). */
  readonly exportedGeneration?: Decimal.Value | undefined
}

export interface Quantities {
  readonly gridImport: string
  readonly selfConsumed: string
  readonly totalConsumed: string
}

export function quantities(q: EnergyQuantities): Quantities {
  const g = dec(q.gridImport)
  const s = dec(q.selfConsumedGeneration)
  return { gridImport: g.toFixed(), selfConsumed: s.toFixed(), totalConsumed: g.plus(s).toFixed() }
}

// ─── Instrument Quality Criteria (§11.6) ──────────────────────────────────────

export const QUALITY_CRITERIA = [
  'attribute_conveyance',
  'exclusive_claim',
  'retirement',
  'vintage_proximity',
  'market_boundary',
  'evidence',
] as const
export type QualityCriterion = (typeof QUALITY_CRITERIA)[number]

export interface Instrument {
  readonly id: string
  /** MWh or kWh — the same unit as G throughout a calculation. */
  readonly quantity: Decimal.Value
  /** The instrument's own stated emission rate, applied to the covered quantity. */
  readonly emissionRate: Decimal.Value
  readonly market: string
  readonly checks: Readonly<Record<QualityCriterion, boolean>>
  readonly evidenceReference?: string | undefined
}

export interface InstrumentAssessment {
  readonly instrumentId: string
  readonly passed: boolean
  readonly failedChecks: readonly QualityCriterion[]
  /** A failing instrument is visible but excluded, with the failed check named (§11.6). */
  readonly disposition: 'eligible' | 'visible_but_excluded'
}

export function assessInstrument(i: Instrument): InstrumentAssessment {
  const failed = QUALITY_CRITERIA.filter((c) => !i.checks[c])
  return {
    instrumentId: i.id,
    passed: failed.length === 0,
    failedChecks: failed,
    disposition: failed.length === 0 ? 'eligible' : 'visible_but_excluded',
  }
}

// ─── Double-count register (§11.7) ────────────────────────────────────────────

export interface Claim {
  readonly claimId: string
  readonly kind: 'retained_onsite_generation' | 'contractual_instrument' | 'supplier_rate'
  readonly quantity: Decimal.Value
  readonly market: string
  /** Hotel and period the claim is allocated to, for the cross-allocation checks. */
  readonly hotelId: string
  readonly period: string
  /** The instrument's own face value, where the claim comes from one. */
  readonly instrumentFaceValue?: Decimal.Value | undefined
  readonly instrumentId?: string | undefined
}

export interface DoubleCountConflict {
  readonly claimA: string
  readonly claimB: string
  readonly quantity: string
  readonly reason: string
}

export class DoubleCountError extends Error {
  constructor(public readonly conflicts: readonly DoubleCountConflict[]) {
    super(
      `the calculation is blocked by ${conflicts.length} double-count conflict(s): ${conflicts
        .map((c) => `${c.claimA} vs ${c.claimB} (${c.quantity})`)
        .join('; ')}`,
    )
    this.name = 'DoubleCountError'
  }
}

/**
 * The double-count register is a HARD CONSTRAINT, not a warning. The calculation blocks
 * — it does not warn and proceed — where any unit of energy would be counted more than
 * once. Every block names the two claims in conflict and the quantity. Nothing is
 * silently netted (§11.7).
 */
export function checkDoubleCount(claims: readonly Claim[]): readonly DoubleCountConflict[] {
  const conflicts: DoubleCountConflict[] = []

  // An instrument allocated beyond its own face value, or to two periods or hotels.
  const byInstrument = new Map<string, Claim[]>()
  for (const c of claims) {
    if (c.instrumentId === undefined) continue
    byInstrument.set(c.instrumentId, [...(byInstrument.get(c.instrumentId) ?? []), c])
  }
  for (const [instrumentId, group] of byInstrument) {
    const allocated = sum(group.map((c) => c.quantity))
    const face = group[0]?.instrumentFaceValue
    if (face !== undefined && allocated.greaterThan(dec(face))) {
      conflicts.push({
        claimA: instrumentId,
        claimB: 'its own face value',
        quantity: allocated.minus(face).toFixed(),
        reason: `instrument ${instrumentId} is allocated beyond its face value`,
      })
    }
    const periods = new Set(group.map((c) => c.period))
    const hotels = new Set(group.map((c) => c.hotelId))
    if (periods.size > 1) {
      conflicts.push({
        claimA: instrumentId,
        claimB: [...periods].join(' and '),
        quantity: allocated.toFixed(),
        reason: `instrument ${instrumentId} is allocated to more than one period`,
      })
    }
    if (hotels.size > 1) {
      conflicts.push({
        claimA: instrumentId,
        claimB: [...hotels].join(' and '),
        quantity: allocated.toFixed(),
        reason: `instrument ${instrumentId} is allocated to more than one hotel`,
      })
    }
  }

  // Two claims of any kind covering the same MWh for the same hotel, period and market.
  const scoped = new Map<string, Claim[]>()
  for (const c of claims) {
    const key = `${c.hotelId}|${c.period}|${c.market}`
    scoped.set(key, [...(scoped.get(key) ?? []), c])
  }
  for (const group of scoped.values()) {
    const retained = group.filter((c) => c.kind === 'retained_onsite_generation')
    const instruments = group.filter((c) => c.kind === 'contractual_instrument')
    const supplier = group.filter((c) => c.kind === 'supplier_rate')

    // Retained on-site generation and an instrument covering the same MWh.
    for (const r of retained) {
      for (const i of instruments) {
        conflicts.push({
          claimA: r.claimId,
          claimB: i.claimId,
          quantity: Decimal.min(dec(r.quantity), dec(i.quantity)).toFixed(),
          reason: 'retained on-site generation and a contractual instrument cover the same energy',
        })
      }
    }
    // A supplier rate substantiated by instruments already counted.
    for (const s of supplier) {
      for (const i of instruments) {
        conflicts.push({
          claimA: s.claimId,
          claimB: i.claimId,
          quantity: Decimal.min(dec(s.quantity), dec(i.quantity)).toFixed(),
          reason:
            'a supplier-specific rate and a contractual instrument both claim the same energy',
        })
      }
    }
  }

  return conflicts
}

// ─── Market-based tier hierarchy (§11.5) ──────────────────────────────────────

export type Tier = 1 | 2 | 3 | 4

export interface TierAllocation {
  readonly tier: Tier
  readonly quantity: string
  readonly emissionRate: string
  readonly emissions: string
  readonly basis: string
  /** Tier 4 carries a mandatory disclosure (§11.5). */
  readonly disclosure?: string | undefined
}

export interface MarketBasedInput {
  readonly quantities: EnergyQuantities
  readonly instruments: readonly Instrument[]
  /** Substantiated by instruments the supplier retired on the customer's behalf (§11.5). */
  readonly supplierRate?:
    | { readonly rate: Decimal.Value; readonly substantiatedByRetiredInstruments: boolean }
    | undefined
  /** The published residual mix for the market, where one exists. */
  readonly residualMixRate?: Decimal.Value | undefined
  /** Used at Tier 4 only, where no residual mix is published. */
  readonly locationBasedRate: Decimal.Value
  readonly market: string
}

export interface MarketBasedResult {
  readonly gridImport: string
  readonly allocations: readonly TierAllocation[]
  readonly totalEmissions: string
  /** Σ (quantity at each tier) = G exactly — acceptance test T-43. */
  readonly reconcilesToGridImport: boolean
  readonly excludedInstruments: readonly InstrumentAssessment[]
  /** Set where Tier 4 applied to any quantity. */
  readonly disclosure: string | null
  readonly tierComposition: Readonly<Record<string, string>>
}

export const TIER_4_DISCLOSURE =
  'the market has no published residual mix, so the figure may include attributes claimed by other parties and the market-based result may therefore be understated'

/**
 * Apply the method hierarchy to G, the grid import — never to total consumption.
 * Self-consumed on-site generation has no Scope 2 emission rate because it was not
 * purchased (§11.5, §11.7).
 *
 * A quantity that fails Tier 1 falls to the next applicable tier. It never disappears
 * and is never left uncosted.
 */
export function marketBasedScope2(input: MarketBasedInput): MarketBasedResult {
  const G = dec(input.quantities.gridImport)
  const allocations: TierAllocation[] = []
  const excluded: InstrumentAssessment[] = []
  let remaining = G

  // Tier 1 — contractual instruments passing every Quality Criterion.
  for (const instrument of input.instruments) {
    const assessment = assessInstrument(instrument)
    if (!assessment.passed) {
      excluded.push(assessment)
      continue
    }
    if (instrument.market !== input.market) {
      // Cross-market application fails; caught by the market_boundary check, but held
      // here too so a mis-set check cannot let it through.
      excluded.push({
        ...assessment,
        passed: false,
        disposition: 'visible_but_excluded',
        failedChecks: ['market_boundary'],
      })
      continue
    }
    if (remaining.lessThanOrEqualTo(0)) break

    const covered = Decimal.min(dec(instrument.quantity), remaining)
    allocations.push({
      tier: 1,
      quantity: covered.toFixed(),
      emissionRate: dec(instrument.emissionRate).toFixed(),
      emissions: covered.times(instrument.emissionRate).toFixed(),
      basis: `contractual instrument ${instrument.id}`,
    })
    remaining = remaining.minus(covered)
  }

  // Tier 2 — a supplier-specific rate, only where substantiated by retired instruments.
  // A supplier rate that is not so substantiated does not qualify and falls to Tier 3.
  if (
    remaining.greaterThan(0) &&
    input.supplierRate !== undefined &&
    input.supplierRate.substantiatedByRetiredInstruments
  ) {
    allocations.push({
      tier: 2,
      quantity: remaining.toFixed(),
      emissionRate: dec(input.supplierRate.rate).toFixed(),
      emissions: remaining.times(input.supplierRate.rate).toFixed(),
      basis: 'supplier-specific rate substantiated by retired instruments',
    })
    remaining = dec(0)
  }

  // Tier 3 — the published residual mix for the market.
  if (remaining.greaterThan(0) && input.residualMixRate !== undefined) {
    allocations.push({
      tier: 3,
      quantity: remaining.toFixed(),
      emissionRate: dec(input.residualMixRate).toFixed(),
      emissions: remaining.times(input.residualMixRate).toFixed(),
      basis: 'published residual mix',
    })
    remaining = dec(0)
  }

  // Tier 4 — grid average, only where no residual mix is published, with disclosure.
  if (remaining.greaterThan(0)) {
    allocations.push({
      tier: 4,
      quantity: remaining.toFixed(),
      emissionRate: dec(input.locationBasedRate).toFixed(),
      emissions: remaining.times(input.locationBasedRate).toFixed(),
      basis: 'grid average, no residual mix published for this market',
      disclosure: TIER_4_DISCLOSURE,
    })
    remaining = dec(0)
  }

  const allocated = sum(allocations.map((a) => a.quantity))
  const composition: Record<string, string> = {}
  for (const a of allocations) {
    composition[`tier_${a.tier}`] = dec(composition[`tier_${a.tier}`] ?? 0)
      .plus(a.quantity)
      .toFixed()
  }

  return {
    gridImport: G.toFixed(),
    allocations,
    totalEmissions: sum(allocations.map((a) => a.emissions)).toFixed(),
    reconcilesToGridImport: allocated.equals(G),
    excludedInstruments: excluded,
    disclosure: allocations.some((a) => a.tier === 4) ? TIER_4_DISCLOSURE : null,
    tierComposition: composition,
  }
}

/**
 * Location-based Scope 2. Always produced, always reported, never affected by any
 * contractual instrument, on-site attribute claim or compensation (§11.4).
 *
 * Calculated on G, never on T: applying a grid factor to self-consumed solar is a
 * defect class explicitly tested for (T-23).
 */
export function locationBasedScope2(q: EnergyQuantities, gridFactor: Decimal.Value): string {
  return dec(q.gridImport).times(gridFactor).toFixed()
}

/**
 * Instruments in excess of G are rejected at write time: a hotel cannot retire
 * certificates against electricity it did not purchase (§11.7).
 */
export function instrumentsExceedGridImport(
  q: EnergyQuantities,
  instrumentTotal: Decimal.Value,
): { readonly rejected: boolean; readonly excess: string } {
  const excess = dec(instrumentTotal).minus(dec(q.gridImport))
  return { rejected: excess.greaterThan(0), excess: excess.greaterThan(0) ? excess.toFixed() : '0' }
}

/**
 * Renewable electricity coverage — (self-consumed retained generation + eligible
 * allocated certificates) ÷ TOTAL electricity consumed, T (§11.9, §24.1).
 *
 * Note the denominator differs from Scope 2's: coverage is about the site's whole
 * consumption, Scope 2 only about what was purchased.
 */
export function renewableCoverage(
  q: EnergyQuantities,
  eligibleCertificates: Decimal.Value,
): string | null {
  const t = dec(q.gridImport).plus(q.selfConsumedGeneration)
  const retained = dec(q.selfConsumedAttributesRetained ?? 0)
  return percentage(retained.plus(eligibleCertificates), t)?.toFixed() ?? null
}
