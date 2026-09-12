/**
 * The shared rounding service — §24.5, Appendix C.
 *
 * One implementation serves every surface: UI, PDF renderer, Excel export,
 * certificate renderer and API. A second implementation anywhere is a defect (App. C.3).
 *
 * Quantities are stored and computed at full precision. Intermediates are never
 * rounded; aggregation always runs on unrounded values (App. C.1). No floating-point
 * type reaches a reported, financial or allocated figure (App. C.3) — a binary float
 * cannot represent a tenth exactly, and a conservation constraint with zero tolerance
 * fails on rounding noise alone.
 */
import Decimal from 'decimal.js'
import { displayPrecision, type QuantityKind } from './precision'

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP })

export type Quantity = Decimal.Value

/**
 * A value carried to the presentation boundary. The API returns the unrounded value
 * and the display precision, never the rounded value alone (App. C.3).
 */
export interface DisplayValue {
  /** Unrounded, full precision. Any further arithmetic must use this. */
  readonly value: string
  readonly precision: number
  /** Rounded half-up to `precision`, ready to render. */
  readonly display: string
  readonly kind: QuantityKind
}

export function dec(value: Quantity): Decimal {
  return new Decimal(value)
}

/**
 * Round to display precision, half-up.
 *
 * Presentation boundary only. Rounding an intermediate is a defect (App. C.1).
 */
export function roundForDisplay(value: Quantity, kind: QuantityKind): Decimal {
  const d = new Decimal(value)
  return d.toDecimalPlaces(displayPrecision(kind, d.toNumber()), Decimal.ROUND_HALF_UP)
}

export function present(value: Quantity, kind: QuantityKind): DisplayValue {
  const d = new Decimal(value)
  const precision = displayPrecision(kind, d.toNumber())
  return {
    value: d.toFixed(),
    precision,
    display: d.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toFixed(precision),
    kind,
  }
}

/**
 * Percentage from unrounded components — never from two rounded values (App. C.3).
 *
 * Percentages are never clamped. Target progress may be negative or exceed 100%
 * and is returned as computed (§17.1). Returns null on a zero denominator: the
 * caller states that the percentage is not available rather than showing zero.
 */
export function percentage(numerator: Quantity, denominator: Quantity): Decimal | null {
  const den = new Decimal(denominator)
  if (den.isZero()) return null
  return new Decimal(numerator).div(den).times(100)
}

/** Sum at full precision. Aggregation never runs on rounded components (App. C.1). */
export function sum(values: readonly Quantity[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(new Decimal(v)), new Decimal(0))
}

/**
 * True when the rounded components do not sum to the rounded total.
 *
 * The caller then shows the total as computed with a footnote. Components are never
 * adjusted to force agreement (App. C.3).
 */
export function hasRoundingResidual(components: readonly Quantity[], kind: QuantityKind): boolean {
  const roundedTotal = roundForDisplay(sum(components), kind)
  const sumOfRounded = components.reduce<Decimal>(
    (acc, v) => acc.plus(roundForDisplay(v, kind)),
    new Decimal(0),
  )
  return !sumOfRounded.equals(roundedTotal)
}

export { Decimal }
