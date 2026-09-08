/**
 * Activity × factor — Appendix F, §24.1.
 *
 * The multiplication is trivial. What is not trivial, and what this module exists for, is
 * that THE UNITS HAVE TO AGREE. A factor is published as kgCO2e per something, and the
 * something is part of the factor: 0.4041 kgCO2e/kWh applied to a quantity of litres
 * produces a number, silently, and that number is a hotel's reported emissions.
 *
 * So the denominator of the factor's unit is checked against the quantity's unit and a
 * mismatch is refused. There is no coercion and no conversion here — converting would
 * require knowing which litres of which fuel, which is a different factor set's job.
 */
import { Decimal, dec, sum } from '../rounding'

export class UnitMismatch extends Error {}

export interface ActivityLine {
  /** Named so a refusal can say which line was wrong. */
  readonly label: string
  readonly quantity: Decimal.Value
  /** The unit the quantity is in — 'kWh', 'L', 'kg'. */
  readonly quantityUnit: string
  readonly factorValue: Decimal.Value
  /** As published: 'kgCO2e/kWh'. The part after the slash must be the quantity's unit. */
  readonly factorUnit: string
}

/** The denominator of a published factor unit, or null where it has no slash. */
export function factorDenominator(factorUnit: string): string | null {
  const slash = factorUnit.indexOf('/')
  if (slash < 0) return null
  return factorUnit.slice(slash + 1).trim()
}

function assertUnitsAgree(line: ActivityLine): void {
  const denominator = factorDenominator(line.factorUnit)
  if (denominator === null) {
    throw new UnitMismatch(
      `${line.label}: the factor unit "${line.factorUnit}" names no quantity to apply it to; an emission factor is published per unit of activity (App. F)`,
    )
  }
  if (denominator !== line.quantityUnit) {
    throw new UnitMismatch(
      `${line.label}: the factor is per ${denominator} and the quantity is in ${line.quantityUnit}; a factor is never applied across units (App. F)`,
    )
  }
}

/**
 * Emissions in kilograms of CO2e, from lines whose units agree.
 *
 * Kilograms, not tonnes: the factors are published per kilogram and the conversion to
 * tonnes is a presentation decision that App. C.2 makes at the boundary. Dividing here
 * would round a figure three steps before anybody looked at it.
 */
export function emissionsKgCO2e(lines: readonly ActivityLine[]): string {
  for (const line of lines) assertUnitsAgree(line)
  return sum(lines.map((l) => dec(l.quantity).times(dec(l.factorValue)))).toFixed()
}
