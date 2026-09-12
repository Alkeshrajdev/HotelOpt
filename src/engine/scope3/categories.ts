/**
 * Scope 3 by category: what each one adds up to, and what it says when it cannot — §13.11.
 *
 * Every category arrives here the same way: a list of lines, each already resolved
 * against a published factor or refused with a sentence. This module decides three things
 * and nothing else. Whether a category has a figure. Whether that figure is complete. And
 * what the fifteen-row table says for a category that is screened out, or reported but
 * empty this month, or reported but uncomputable — because the guide's list of prohibited
 * outcomes includes "a blank Scope 3 category rendered as zero, or omitted", and each of
 * those three states has to be a different sentence from zero.
 *
 * PARTIAL IS A STATE, NOT A ROUNDING. A month whose cooking oil could not be valued has a
 * category 5 figure that is missing a line, and the figure says so and names the line. The
 * alternative, refusing the whole category the way an energy input with no factor refuses
 * the carbon headline, would leave the largest waste categories unreported over a stream
 * nobody publishes a factor for. The specification's own screen states are Complete,
 * Partial and Refused, and Partial "does not present itself as complete".
 */
import { dec, Decimal, sum } from '../rounding'

export interface ResolvedLine {
  /** What the line is, in words a reader recognises: 'Food waste to organic treatment'. */
  readonly label: string
  readonly quantity: string
  readonly unit: string
  /** Null where the line could not be valued; `refusal` then says why. */
  readonly emissionsKg: string | null
  readonly refusal: string | null
  /** Set when the factor came from an earlier edition than the month's own. */
  readonly carriedForward?: boolean | undefined
}

export interface CategoryFigure {
  readonly category: number
  /** Null when no line could be valued. Never zero standing in for that. */
  readonly kgCO2e: string | null
  readonly lines: number
  readonly computed: number
  /** True when some lines were valued and some were not. */
  readonly partial: boolean
  /** The lines that contributed nothing, each with its reason. */
  readonly unresolved: readonly string[]
  readonly notes: readonly string[]
}

export function categoryFigure(category: number, lines: readonly ResolvedLine[]): CategoryFigure {
  const valued = lines.filter((l) => l.emissionsKg !== null)
  const unresolved = lines
    .filter((l) => l.emissionsKg === null)
    .map((l) => `${l.label}: ${l.refusal ?? 'could not be valued'}`)
  const notes: string[] = []
  const carried = valued.filter((l) => l.carriedForward).map((l) => l.label)
  if (carried.length > 0) {
    notes.push(
      `${carried.join(', ')}: computed with an earlier edition's factor, because no later one covers this month.`,
    )
  }
  return {
    category,
    kgCO2e: valued.length > 0 ? sum(valued.map((l) => l.emissionsKg as string)).toFixed() : null,
    lines: lines.length,
    computed: valued.length,
    partial: valued.length > 0 && unresolved.length > 0,
    unresolved,
    notes,
  }
}

/**
 * Passenger-kilometres from the four numbers a person actually knows.
 *
 * Travellers, one-way distance, whether it was a return, and how many times: a commute is
 * one person, twelve kilometres, both ways, twenty-two working days. The product is a
 * quantity with a unit; the four inputs are kept beside it so an assurer can re-derive it
 * rather than take the product's word. For a vehicle-kilometre mode `travellers` counts
 * vehicles, and the caller says so on the form.
 */
export function passengerKm(
  travellers: Decimal.Value,
  distanceKm: Decimal.Value,
  legs: 1 | 2,
  occasions: Decimal.Value,
): string {
  return dec(travellers).times(dec(distanceKm)).times(legs).times(dec(occasions)).toFixed()
}

export type ScreeningStatus = 'reported' | 'not_applicable' | 'not_reported'

export interface ScreeningRow {
  readonly category: number
  readonly name: string
  readonly status: ScreeningStatus
  readonly reason: string
  /** False while the guide's default is standing in for a decision nobody has made. */
  readonly accepted: boolean
  readonly reviewOverdue: boolean
}

export type CategoryState =
  /** Reported, and every line valued. */
  | 'figure'
  /** Reported, some lines valued, some named as not. */
  | 'partial'
  /** Reported, lines exist, none could be valued. */
  | 'not_computable'
  /** Reported, and nothing is on record for this month. Absence, not zero. */
  | 'nothing_recorded'
  /** Screened out, with the reason. */
  | 'excluded'

export interface Scope3Row {
  readonly category: number
  readonly name: string
  readonly status: ScreeningStatus
  readonly reason: string
  readonly accepted: boolean
  readonly reviewOverdue: boolean
  readonly state: CategoryState
  readonly kgCO2e: string | null
  readonly figure: CategoryFigure | null
  /** What the Value column says. Always a sentence, never a dash. */
  readonly statement: string
}

export interface Scope3Inventory {
  readonly rows: readonly Scope3Row[]
  /** Across the reported categories that produced a figure. Null when none did. */
  readonly totalKgCO2e: string | null
  readonly reported: number
  readonly withFigure: number
  /** True unless every reported category produced a complete figure. */
  readonly partial: boolean
  readonly sentence: string
}

function stateOf(status: ScreeningStatus, figure: CategoryFigure | null): CategoryState {
  if (status !== 'reported') return 'excluded'
  if (!figure || figure.lines === 0) return 'nothing_recorded'
  if (figure.kgCO2e === null) return 'not_computable'
  return figure.partial ? 'partial' : 'figure'
}

function statementFor(state: CategoryState, figure: CategoryFigure | null): string {
  switch (state) {
    case 'figure':
      return `${figure!.computed} ${figure!.computed === 1 ? 'line' : 'lines'} valued`
    case 'partial':
      return `${figure!.computed} of ${figure!.lines} lines valued; ${figure!.unresolved.length} could not be and ${figure!.unresolved.length === 1 ? 'is' : 'are'} not in the figure`
    case 'not_computable':
      return `${figure!.lines} ${figure!.lines === 1 ? 'line' : 'lines'} on record, none could be valued`
    case 'nothing_recorded':
      return 'nothing on record for this month'
    case 'excluded':
      return 'not in the inventory'
  }
}

export function assembleScope3(
  screening: readonly ScreeningRow[],
  figures: ReadonlyMap<number, CategoryFigure>,
): Scope3Inventory {
  const rows = [...screening]
    .sort((a, b) => a.category - b.category)
    .map((s): Scope3Row => {
      const figure = figures.get(s.category) ?? null
      const state = stateOf(s.status, figure)
      return {
        category: s.category,
        name: s.name,
        status: s.status,
        reason: s.reason,
        accepted: s.accepted,
        reviewOverdue: s.reviewOverdue,
        state,
        kgCO2e: state === 'figure' || state === 'partial' ? figure!.kgCO2e : null,
        figure: state === 'excluded' ? null : figure,
        statement: statementFor(state, figure),
      }
    })

  const reportedRows = rows.filter((r) => r.status === 'reported')
  const withFigure = reportedRows.filter((r) => r.kgCO2e !== null)
  const partial =
    withFigure.length < reportedRows.length || reportedRows.some((r) => r.state === 'partial')
  const total =
    withFigure.length > 0 ? sum(withFigure.map((r) => r.kgCO2e as string)).toFixed() : null

  const sentence =
    reportedRows.length === 0
      ? 'No Scope 3 category is reported for this client.'
      : withFigure.length === 0
        ? `${reportedRows.length} categories are reported and none carries a figure this month; the total is not stated.`
        : partial
          ? `${withFigure.length} of ${reportedRows.length} reported categories carry a figure this month. The total covers those and does not present itself as complete.`
          : `All ${reportedRows.length} reported categories carry a complete figure this month.`

  return {
    rows,
    totalKgCO2e: total,
    reported: reportedRows.length,
    withFigure: withFigure.length,
    partial,
    sentence,
  }
}
