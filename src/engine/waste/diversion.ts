/**
 * Waste treatment and the two-figure rule — §24.1, §24.2.
 *
 * A single unqualified "diversion percentage" is PROHIBITED. Wherever diversion appears
 * — dashboard, report, export, API — two named figures are published together:
 *
 *   • Material recovery rate, EXCLUDING waste-to-energy
 *   • Landfill diversion rate, INCLUDING waste-to-energy, with the waste-to-energy
 *     tonnage on its own line
 *
 * Neither may appear without the other, and neither may be labelled simply "diversion".
 *
 * This module makes that structural: there is no function returning a bare diversion
 * number. The only result type carries both figures and the waste-to-energy tonnage
 * together, so a caller cannot render one alone without deliberately taking it apart.
 */
import { Decimal, dec, percentage, sum } from '../rounding'

/**
 * Treatment destinations. `material_recovery` groups recycling and organic treatment —
 * the destinations that return material to use. Energy recovery is deliberately its own
 * class, because the whole two-figure rule turns on keeping it visible.
 */
export type TreatmentClass =
  | 'recycling'
  | 'organic_treatment'
  | 'reuse'
  | 'energy_recovery'
  | 'landfill'
  | 'incineration_no_recovery'
  | 'other_disposal'

const MATERIAL_RECOVERY: readonly TreatmentClass[] = ['recycling', 'organic_treatment', 'reuse']
const LANDFILL_OR_DISPOSAL: readonly TreatmentClass[] = [
  'landfill',
  'incineration_no_recovery',
  'other_disposal',
]

/**
 * What a line's destination is, once §15.4.1 has been applied to it.
 *
 * `not_established` is a real outcome, not a missing value. A capture with no collection
 * and no route in force has no evidenced destination, and the rule is explicit: it is
 * counted in total generated waste, excluded from BOTH numerators, never assumed to be
 * landfill and never assumed to be recycled.
 */
export type LineDestination = TreatmentClass | 'not_established'

export interface WasteLine {
  readonly stream: string
  readonly treatment: LineDestination
  /** Weight in a single common unit — tonnes throughout the engine. */
  readonly tonnes: Decimal.Value
}

/**
 * The two figures, inseparable by construction.
 *
 * `label` on each is the wording a surface must use. Neither is ever rendered as
 * "diversion" alone (§24.2).
 */
export interface DiversionFigures {
  readonly totalGenerated: string
  readonly materialRecovery: {
    readonly tonnes: string
    readonly ratePercent: string | null
    readonly label: 'Material recovery rate'
    readonly basis: 'excludes waste-to-energy'
  }
  readonly landfillDiversion: {
    readonly tonnes: string
    readonly ratePercent: string | null
    readonly label: 'Landfill diversion rate'
    readonly basis: 'includes waste-to-energy'
  }
  /** On its own line, always (§24.2). */
  readonly wasteToEnergy: {
    readonly tonnes: string
    readonly label: 'Waste to energy'
  }
  readonly landfilled: { readonly tonnes: string }
  /**
   * In the denominator, in neither numerator, on its own line (§15.4.1). A persistent
   * figure here means a route is missing, not that the waste vanished, so it is surfaced
   * as an attention item rather than absorbed.
   */
  readonly destinationNotEstablished: {
    readonly tonnes: string
    readonly label: 'Destination not established'
    readonly attention: boolean
  }
}

/**
 * Compute both diversion figures.
 *
 * Material recovery excludes energy recovery; landfill diversion includes it. The gap
 * between the two figures IS the waste-to-energy tonnage, which is why publishing one
 * alone misleads in a way publishing both cannot.
 */
export function diversionFigures(lines: readonly WasteLine[]): DiversionFigures {
  const tonnesOf = (classes: readonly LineDestination[]): Decimal =>
    sum(lines.filter((l) => classes.includes(l.treatment)).map((l) => l.tonnes))

  // Every line, including the ones whose destination was never established: total
  // generated is what was thrown away, not what we can account for (§15.4.1).
  const total = sum(lines.map((l) => l.tonnes))
  const notEstablished = tonnesOf(['not_established'])
  const recovery = tonnesOf(MATERIAL_RECOVERY)
  const wte = tonnesOf(['energy_recovery'])
  const diverted = recovery.plus(wte)
  const landfilled = tonnesOf(LANDFILL_OR_DISPOSAL)

  return {
    totalGenerated: total.toFixed(),
    materialRecovery: {
      tonnes: recovery.toFixed(),
      ratePercent: percentage(recovery, total)?.toFixed() ?? null,
      label: 'Material recovery rate',
      basis: 'excludes waste-to-energy',
    },
    landfillDiversion: {
      tonnes: diverted.toFixed(),
      ratePercent: percentage(diverted, total)?.toFixed() ?? null,
      label: 'Landfill diversion rate',
      basis: 'includes waste-to-energy',
    },
    wasteToEnergy: { tonnes: wte.toFixed(), label: 'Waste to energy' },
    landfilled: { tonnes: landfilled.toFixed() },
    destinationNotEstablished: {
      tonnes: notEstablished.toFixed(),
      label: 'Destination not established',
      attention: notEstablished.greaterThan(0),
    },
  }
}

/**
 * Render the pair for a surface. Both figures, always, each named.
 *
 * A caller wanting "the diversion number" has to choose which of the two it means, and
 * the wording it gets back says which — that is the point of the rule.
 */
export function renderDiversionPair(f: DiversionFigures): readonly string[] {
  const pct = (v: string | null) =>
    v === null ? 'not available' : `${dec(v).toDecimalPlaces(1).toFixed(1)}%`
  const t = (v: string) => `${dec(v).toDecimalPlaces(2).toFixed(2)} t`
  const lines = [
    `${f.materialRecovery.label}: ${pct(f.materialRecovery.ratePercent)} (${f.materialRecovery.basis})`,
    `${f.landfillDiversion.label}: ${pct(f.landfillDiversion.ratePercent)} (${f.landfillDiversion.basis})`,
    `${f.wasteToEnergy.label}: ${t(f.wasteToEnergy.tonnes)}`,
  ]
  // Only when there is some, and never silently: both rates above are already depressed
  // by this tonnage sitting in their denominator, and the reader is owed the reason.
  if (f.destinationNotEstablished.attention) {
    lines.push(`${f.destinationNotEstablished.label}: ${t(f.destinationNotEstablished.tonnes)}`)
  }
  return lines
}
