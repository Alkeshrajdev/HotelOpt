/**
 * Tier B normalisation — SPEC-04B §3.4a.
 *
 * Tier B fits nothing. It is a ratio adjustment using published, versioned sensitivity
 * shares, with the property's own means as the reference conditions, so it says "compared
 * with how this hotel normally runs" and never "compared with other hotels".
 *
 *   B    = f · Ȳ                      base component, constant
 *   V_t  = Y_t − B                    variable component
 *   N_t  = B + V_t·s_occ·(ORN_ref/ORN_t) + V_t·s_wx·(DD_ref/DD_t)
 *
 * Divide-by-zero guard: where ORN_t = 0, or DD_t is below the normalisation floor, that
 * term is carried at actual and the period is marked partially normalised. The period is
 * never dropped and never divided by zero. No verdict, no expected range, no comparison
 * of one property's series with another's: the type has no field for any of them.
 */
import { Decimal, dec } from '../rounding'

/** The governed sensitivity shares of the variable component, summing to 1 (§3.4a). */
export interface SensitivityShares {
  readonly occupancy: Decimal.Value
  readonly weather: Decimal.Value
  /** The assumption set these came from, stated on screen. */
  readonly version: string
}

export const DEFAULT_SENSITIVITY_SHARES: Readonly<
  Record<'energy' | 'water' | 'waste', SensitivityShares>
> = {
  energy: { occupancy: '0.45', weather: '0.55', version: 'tierB.defaults.2026.1' },
  water: { occupancy: '0.85', weather: '0.15', version: 'tierB.defaults.2026.1' },
  waste: { occupancy: '1', weather: '0', version: 'tierB.defaults.2026.1' },
}

/** The same governed base-load fraction as apportionment (SPEC-04A). */
export const DEFAULT_BASE_LOAD_FRACTION: Readonly<Record<'energy' | 'water' | 'waste', string>> = {
  energy: '0.55',
  water: '0.50',
  waste: '0',
}

/** gp.dd_normalisation_floor — below this many degree days the weather term is not normalised. */
export const DD_NORMALISATION_FLOOR = 10

export const TIER_B_MINIMUM_MONTHS = 3

export interface TierBPeriod {
  readonly month: string
  readonly value: Decimal.Value
  readonly occupiedRoomNights: Decimal.Value | null
  readonly degreeDays: Decimal.Value | null
}

export interface NormalisedPoint {
  readonly month: string
  readonly actual: string
  readonly normalised: string
  /** Null where fully normalised; otherwise which driver term was carried at actual. */
  readonly partiallyNormalised: string | null
}

export interface NormalisedSeries {
  readonly points: readonly NormalisedPoint[]
  readonly months: number
  readonly reference: { readonly occupiedRoomNights: string; readonly degreeDays: string | null }
  readonly sharesVersion: string
  readonly caption: 'normalised to this hotel’s average operating conditions'
}

function meanOf(values: readonly Decimal[]): Decimal {
  if (values.length === 0) return dec(0)
  return values.reduce((a, b) => a.plus(b), dec(0)).div(values.length)
}

/**
 * Null where fewer than three months are available: below that the property is tier C and
 * shows actuals only.
 */
export function normaliseSeries(
  periods: readonly TierBPeriod[],
  shares: SensitivityShares,
  baseLoadFraction: Decimal.Value,
): NormalisedSeries | null {
  const usable = periods.filter((p) => p.occupiedRoomNights !== null)
  if (usable.length < TIER_B_MINIMUM_MONTHS) return null

  const weatherShare = dec(shares.weather)
  const usesWeather = !weatherShare.isZero()
  const withWeather = usable.filter((p) => p.degreeDays !== null)
  // A weather term needs degree days on every month it applies to; without them the
  // weather share is carried at actual on that month, and said so.
  const yMean = meanOf(usable.map((p) => dec(p.value)))
  const ornRef = meanOf(usable.map((p) => dec(p.occupiedRoomNights as Decimal.Value)))
  const ddRef =
    usesWeather && withWeather.length > 0
      ? meanOf(withWeather.map((p) => dec(p.degreeDays as Decimal.Value)))
      : null
  const base = dec(baseLoadFraction).times(yMean)

  const points: NormalisedPoint[] = usable.map((p) => {
    const y = dec(p.value)
    const v = y.minus(base)
    const orn = dec(p.occupiedRoomNights as Decimal.Value)
    const partial: string[] = []

    let occTerm: Decimal
    if (orn.isZero()) {
      occTerm = v.times(shares.occupancy)
      partial.push('occupancy')
    } else {
      occTerm = v.times(shares.occupancy).times(ornRef.div(orn))
    }

    let wxTerm: Decimal
    if (!usesWeather) {
      wxTerm = dec(0)
    } else if (
      p.degreeDays === null ||
      ddRef === null ||
      dec(p.degreeDays).lessThan(DD_NORMALISATION_FLOOR)
    ) {
      wxTerm = v.times(weatherShare)
      partial.push('degree days')
    } else {
      wxTerm = v.times(weatherShare).times(ddRef.div(dec(p.degreeDays)))
    }

    return {
      month: p.month,
      actual: y.toFixed(),
      normalised: base.plus(occTerm).plus(wxTerm).toFixed(),
      partiallyNormalised:
        partial.length === 0
          ? null
          : `partially normalised — ${partial.join(' and ')} outside normalisable range`,
    }
  })

  return {
    points,
    months: usable.length,
    reference: {
      occupiedRoomNights: ornRef.toFixed(),
      degreeDays: ddRef === null ? null : ddRef.toFixed(),
    },
    sharesVersion: shares.version,
    caption: 'normalised to this hotel’s average operating conditions',
  }
}
