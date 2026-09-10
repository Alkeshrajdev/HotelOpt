/**
 * Delivered energy and intensity KPIs — §24.1, §8.8.
 *
 * Delivered energy = grid electricity + fuels at net calorific value + self-consumed
 * on-site generation + district cooling converted through the approved plant COP.
 *
 * WHERE NO APPROVED COP EXISTS, DISTRICT COOLING IS REPORTED ON ITS OWN LINE AND NOT
 * SUMMED. Summing thermal and electric kWh, or assuming a default COP, is prohibited
 * (§32). This module therefore cannot return a single total that quietly includes an
 * unconverted district-cooling figure: the total and the unconvertible remainder are
 * separate fields.
 *
 * ORN, not occupancy, is the denominator of every intensity KPI (§6.2).
 */
import { Decimal, dec, percentage, sum } from '../rounding'

export interface EnergyComponent {
  readonly sourceId: string
  readonly kind:
    'grid_electricity' | 'fuel' | 'onsite_generation_self_consumed' | 'district_cooling'
  /** Already in kWh for electricity and generation; in the billed unit for cooling. */
  readonly quantity: Decimal.Value
  readonly unit: string
  /**
   * Net calorific value conversion for a fuel, from a governed factor set. Absent means
   * the fuel cannot be converted and is excluded with that stated.
   */
  readonly netCalorificValueKwhPerUnit?: Decimal.Value | undefined
  /**
   * The approved plant COP for district cooling (§8.8). Absent means no approved COP,
   * and the line is not summed.
   */
  readonly approvedCop?: Decimal.Value | undefined
  readonly factorVersion?: string | undefined
}

export interface DeliveredEnergy {
  /** kWh. Includes only what could be converted through an approved factor. */
  readonly totalKwh: string
  readonly includedComponents: readonly { readonly sourceId: string; readonly kwh: string }[]
  /**
   * Lines reported separately and NOT summed, each with the reason. A surface renders
   * these beside the total; it never adds them into it.
   */
  readonly reportedSeparately: readonly {
    readonly sourceId: string
    readonly quantity: string
    readonly unit: string
    readonly reason: string
  }[]
  /** True where the total covers only part of the property's energy (§5.2 partial state). */
  readonly partial: boolean
}

export function deliveredEnergy(components: readonly EnergyComponent[]): DeliveredEnergy {
  const included: { sourceId: string; kwh: string }[] = []
  const separate: {
    sourceId: string
    quantity: string
    unit: string
    reason: string
  }[] = []

  for (const c of components) {
    switch (c.kind) {
      case 'grid_electricity':
      case 'onsite_generation_self_consumed':
        included.push({ sourceId: c.sourceId, kwh: dec(c.quantity).toFixed() })
        break

      case 'fuel':
        if (c.netCalorificValueKwhPerUnit === undefined) {
          separate.push({
            sourceId: c.sourceId,
            quantity: dec(c.quantity).toFixed(),
            unit: c.unit,
            reason: 'no approved net calorific value; not converted and not summed',
          })
        } else {
          included.push({
            sourceId: c.sourceId,
            kwh: dec(c.quantity).times(c.netCalorificValueKwhPerUnit).toFixed(),
          })
        }
        break

      case 'district_cooling':
        // Converted through a governed, published COP factor — never a default (§32).
        if (c.approvedCop === undefined) {
          separate.push({
            sourceId: c.sourceId,
            quantity: dec(c.quantity).toFixed(),
            unit: c.unit,
            reason: 'no approved plant COP; reported on its own line and not summed (§8.8)',
          })
        } else {
          included.push({
            sourceId: c.sourceId,
            kwh: dec(c.quantity).div(dec(c.approvedCop)).toFixed(),
          })
        }
        break
    }
  }

  return {
    totalKwh: sum(included.map((i) => i.kwh)).toFixed(),
    includedComponents: included,
    reportedSeparately: separate,
    partial: separate.length > 0,
  }
}

export interface IntensityResult {
  readonly value: string | null
  readonly denominator: 'occupied_room_night' | 'guest_night' | 'gross_floor_area_m2' | 'cover'
  /** The denominator is named on the same line as the figure (§6.2, D-03). */
  readonly label: string
  /** Carried through from delivered energy: an intensity over a partial total says so. */
  readonly partial: boolean
}

/**
 * An intensity KPI. Returns null rather than zero on an absent denominator: a hotel
 * with no occupied rooms has no intensity, it does not have an intensity of zero.
 */
export function intensityPer(
  numerator: Decimal.Value,
  denominator: Decimal.Value,
  kind: IntensityResult['denominator'],
  unit: string,
  partial = false,
): IntensityResult {
  const den = dec(denominator)
  const labels: Record<IntensityResult['denominator'], string> = {
    occupied_room_night: 'per occupied room night',
    guest_night: 'per guest night',
    gross_floor_area_m2: 'per m²',
    cover: 'per cover',
  }
  return {
    value: den.isZero() ? null : dec(numerator).div(den).toFixed(),
    denominator: kind,
    label: `${unit} ${labels[kind]}`,
    partial,
  }
}

/** Actual cost ÷ actual consumption, per source, per period (§24.1, §10.3). */
export function effectiveUnitRate(cost: Decimal.Value, consumption: Decimal.Value): string | null {
  const c = dec(consumption)
  return c.isZero() ? null : dec(cost).div(c).toFixed()
}

/** Annual top-up ÷ nameplate charge, per asset and per gas (§24.1). */
export function refrigerantLeakRate(
  annualTopUp: Decimal.Value,
  nameplateCharge: Decimal.Value,
): string | null {
  return percentage(annualTopUp, nameplateCharge)?.toFixed() ?? null
}

// ─── Carbon change decomposition (§24.1, §10.2) ───────────────────────────────

export interface DecompositionInput {
  readonly sourceId: string
  /** Activity in the base period (t₀) and the reporting period (t). */
  readonly activityBase: Decimal.Value
  readonly activityCurrent: Decimal.Value
  /** Emission factor in each period. */
  readonly factorBase: Decimal.Value
  readonly factorCurrent: Decimal.Value
}

export interface Decomposition {
  readonly consumptionEffect: string
  readonly factorEffect: string
  readonly totalChange: string
  /** The two effects sum exactly to the total change (§24.1). */
  readonly reconciles: boolean
}

/**
 * Decompose a carbon change into a consumption effect and a factor effect.
 *
 *   Consumption effect = Σ (Aᵢ,t − Aᵢ,t₀) · Fᵢ,t₀
 *   Factor effect      = Σ (Fᵢ,t − Fᵢ,t₀) · Aᵢ,t
 *
 * The two sum exactly to the total change. That identity holds only with this pairing —
 * base factor against the activity change, current activity against the factor change —
 * and is asserted rather than assumed. Carbon carries no verdict (§5.2).
 */
export function decomposeCarbonChange(lines: readonly DecompositionInput[]): Decomposition {
  const consumptionEffect = lines.reduce<Decimal>(
    (acc, l) => acc.plus(dec(l.activityCurrent).minus(l.activityBase).times(l.factorBase)),
    dec(0),
  )
  const factorEffect = lines.reduce<Decimal>(
    (acc, l) => acc.plus(dec(l.factorCurrent).minus(l.factorBase).times(l.activityCurrent)),
    dec(0),
  )
  const totalChange = lines.reduce<Decimal>(
    (acc, l) =>
      acc
        .plus(dec(l.activityCurrent).times(l.factorCurrent))
        .minus(dec(l.activityBase).times(l.factorBase)),
    dec(0),
  )

  return {
    consumptionEffect: consumptionEffect.toFixed(),
    factorEffect: factorEffect.toFixed(),
    totalChange: totalChange.toFixed(),
    reconciles: consumptionEffect.plus(factorEffect).equals(totalChange),
  }
}
