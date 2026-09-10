/**
 * Versioned unit conversion registry — Appendix C.3.
 *
 * No conversion constant is ever inline in code. Every conversion resolves through
 * this registry and records the version used, so a historical figure remains
 * reproducible from the factor set in force when it was issued (O-01).
 *
 * Conversions are applied once, at the boundary between the billed unit and the
 * canonical unit. The billed value and billed unit are both retained. Converting a
 * converted value is a defect (App. C.3).
 *
 * District cooling is deliberately absent from this table: it converts through a
 * governed, published COP factor held per property, never a constant (§32).
 */
import { Decimal } from '../rounding'

export type CanonicalUnit = 'kWh' | 'm3' | 'kg' | 'tCO2e'

export interface ConversionRule {
  readonly from: string
  readonly to: CanonicalUnit
  /** Multiply the billed value by this to reach the canonical unit. */
  readonly factor: string
  readonly source: string
  readonly note?: string
}

export interface ConversionSet {
  readonly version: string
  readonly effectiveFrom: string
  readonly rules: readonly ConversionRule[]
}

/**
 * v1 conversion set. Dimensional conversions only — exact by definition, or from a
 * named standard. Anything requiring a fuel property (density, calorific value) is a
 * factor-set concern, not a unit conversion, and is not admitted here.
 */
export const CONVERSION_SET_V1: ConversionSet = {
  version: 'units-v1',
  effectiveFrom: '2026-01-01',
  rules: [
    { from: 'MWh', to: 'kWh', factor: '1000', source: 'SI, exact' },
    { from: 'GWh', to: 'kWh', factor: '1000000', source: 'SI, exact' },
    {
      from: 'GJ',
      to: 'kWh',
      factor: '277.777777777777777777777777777778',
      source: 'SI, 1 kWh = 3.6 MJ',
    },
    {
      from: 'MJ',
      to: 'kWh',
      factor: '0.277777777777777777777777777777778',
      source: 'SI, 1 kWh = 3.6 MJ',
    },
    { from: 'therm', to: 'kWh', factor: '29.3071', source: 'IEA unit conversions, therm (EC)' },
    { from: 'L', to: 'm3', factor: '0.001', source: 'SI, exact' },
    { from: 'IG', to: 'm3', factor: '0.00454609', source: 'Imperial gallon, exact' },
    { from: 'USG', to: 'm3', factor: '0.003785411784', source: 'US liquid gallon, exact' },
    { from: 'tonne', to: 'kg', factor: '1000', source: 'SI, exact' },
    { from: 'g', to: 'kg', factor: '0.001', source: 'SI, exact' },
    {
      from: 'lb',
      to: 'kg',
      factor: '0.45359237',
      source: 'International avoirdupois pound, exact',
    },
    { from: 'kgCO2e', to: 'tCO2e', factor: '0.001', source: 'SI, exact' },
  ],
}

const SETS: Record<string, ConversionSet> = {
  [CONVERSION_SET_V1.version]: CONVERSION_SET_V1,
}

export class UnknownConversionError extends Error {
  constructor(from: string, to: CanonicalUnit, version: string) {
    super(`No conversion from "${from}" to "${to}" in set ${version}`)
    this.name = 'UnknownConversionError'
  }
}

/**
 * The result of a boundary conversion. Both the billed and canonical figures are
 * retained, with the conversion set version that produced it.
 */
export interface ConvertedQuantity {
  readonly billedValue: string
  readonly billedUnit: string
  readonly canonicalValue: string
  readonly canonicalUnit: CanonicalUnit
  readonly conversionVersion: string
}

/**
 * Convert a billed quantity to its canonical unit. Apply once, at ingestion.
 *
 * A value already in the canonical unit passes through with factor 1, so callers
 * need no special case and the provenance record stays uniform.
 */
export function toCanonical(
  value: Decimal.Value,
  billedUnit: string,
  canonicalUnit: CanonicalUnit,
  version: string = CONVERSION_SET_V1.version,
): ConvertedQuantity {
  const set = SETS[version]
  if (!set) throw new UnknownConversionError(billedUnit, canonicalUnit, version)

  const billed = new Decimal(value)
  const base = {
    billedValue: billed.toFixed(),
    billedUnit,
    canonicalUnit,
    conversionVersion: set.version,
  }

  if (billedUnit === canonicalUnit) {
    return { ...base, canonicalValue: billed.toFixed() }
  }

  const rule = set.rules.find((r) => r.from === billedUnit && r.to === canonicalUnit)
  if (!rule) throw new UnknownConversionError(billedUnit, canonicalUnit, version)

  return { ...base, canonicalValue: billed.times(rule.factor).toFixed() }
}

export function conversionSet(version: string = CONVERSION_SET_V1.version): ConversionSet {
  const set = SETS[version]
  if (!set) throw new Error(`Unknown conversion set: ${version}`)
  return set
}

/**
 * Convert a canonical value into a presentation unit — the inverse of `toCanonical`,
 * resolving through the same registry so the constant still is not inline anywhere.
 *
 * This is NOT the counterpart of ingestion and must not be used as one. Nothing is stored
 * in a presentation unit; App. C.3's rule that a converted value is never converted again
 * still holds, because this produces a figure for a screen and hands it to no one. It
 * exists because Appendix C.2 sets the display precision of water intensity in litres per
 * occupied room night while water is stored in cubic metres, and a screen that prints the
 * stored number under the specified label is off by a thousand.
 */
export function forDisplay(
  canonicalValue: Decimal.Value,
  canonicalUnit: CanonicalUnit,
  displayUnit: string,
  version: string = CONVERSION_SET_V1.version,
): string {
  const set = SETS[version]
  if (!set) throw new UnknownConversionError(displayUnit, canonicalUnit, version)
  if (displayUnit === canonicalUnit) return new Decimal(canonicalValue).toFixed()

  const rule = set.rules.find((r) => r.from === displayUnit && r.to === canonicalUnit)
  if (!rule) throw new UnknownConversionError(displayUnit, canonicalUnit, set.version)

  // The rule multiplies display -> canonical, so display = canonical / factor. Division
  // rather than a second stored reciprocal: one direction of every conversion is enough,
  // and a reciprocal written out by hand is a rounding error waiting for a reviewer.
  return new Decimal(canonicalValue).div(new Decimal(rule.factor)).toFixed()
}
