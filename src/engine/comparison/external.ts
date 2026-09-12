/**
 * External benchmarks — SPEC-03F · F5; FE-01 §5.
 *
 * A benchmark renders only with its standard, year, cohort definition and sample size.
 * CHSB and HWMI publish per guest night; this product reports per occupied room night,
 * and the conversion onto the ORN basis is made here, once, and stated wherever the
 * benchmark appears. A benchmark is a distance, never a target.
 */
import { dec } from '@/engine/rounding'

export interface BenchmarkSource {
  readonly standard: string
  readonly year: number
  readonly cohortDefinition: string
  readonly sampleN: number
}

export function benchmarkRenders(b: Partial<BenchmarkSource>): b is BenchmarkSource {
  return Boolean(b.standard && b.year && b.cohortDefinition && b.sampleN && b.sampleN >= 5)
}

/**
 * A figure per guest night onto the occupied-room-night basis for one property and
 * period: per ORN = per guest night × guest nights ÷ occupied room nights. Null when
 * either denominator is missing or zero, and the screen says so rather than assuming
 * an occupancy ratio.
 */
export function perGuestNightToPerOrn(
  perGuestNight: string | number,
  guestNights: string | number | null,
  occupiedRoomNights: string | number | null,
): { value: string; ratio: string } | null {
  if (guestNights === null || occupiedRoomNights === null) return null
  const gn = dec(guestNights)
  const orn = dec(occupiedRoomNights)
  if (gn.lte(0) || orn.lte(0)) return null
  const ratio = gn.div(orn)
  return {
    value: dec(perGuestNight).times(ratio).toDecimalPlaces(4).toFixed(),
    ratio: ratio.toDecimalPlaces(3).toFixed(3),
  }
}

/** Where the property stands against a published figure, as a signed difference and a percentage of the benchmark. */
export function distanceFrom(
  property: string | number,
  benchmark: string | number,
): { difference: string; percent: string; below: boolean } {
  const p = dec(property)
  const b = dec(benchmark)
  const diff = p.minus(b)
  return {
    difference: diff.toDecimalPlaces(2).toFixed(2),
    percent: b.isZero() ? '0.0' : diff.div(b).times(100).toDecimalPlaces(1).toFixed(1),
    below: diff.lt(0),
  }
}
