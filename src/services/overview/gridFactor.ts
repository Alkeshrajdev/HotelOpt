/**
 * A grid factor as the carbon card needs it.
 *
 * The supplied grid database answers more than "what is the number". It answers which gas
 * basis the number is on, which vintage it came from, whether that vintage is the one
 * governing the period or an older one carried forward, and what a reader must be told
 * before relying on it. All of that has to survive the trip to the screen, because each
 * piece changes what the figure MEANS:
 *
 *   a CO2-only factor produces a figure that is not a CO2e figure
 *   a carried-forward factor produces a 2025 figure computed from a 2024 factor
 *   a C-grade factor produces a figure its own publisher would not call official
 *
 * A card that showed the number and dropped these would be stating more confidence than
 * the data supports, which is the failure this whole product is arranged against.
 */

export interface GridFactorResolution {
  /** Null when the factor could not be resolved; `refusal` then says why. */
  readonly value: string | null
  /** 'CO2e' or 'CO2'. A CO2 factor omits methane and nitrous oxide. */
  readonly gasBasis: string | null
  readonly boundary: string | null
  readonly reliability: string | null
  /** False for a held factor, an unknown grid, or a country needing a grid it lacks. */
  readonly usable: boolean
  /** The caveat the grade and the value's own note oblige, already joined. */
  readonly warn: string | null
  readonly factorYear: number | null
  readonly edition: string | null
  readonly carriedForward: boolean
  readonly sourceReference: string | null
  readonly refusal: string | null
}

/**
 * What a reader is owed about a factor that WAS used, in the order the sentences matter.
 *
 * Carry-forward first: it is the one that changes what year the figure belongs to, and the
 * one an assurer asks about. The grade's caveat second. Nothing at all for an official
 * factor of the applicable vintage, because a note that appears on every card is a note
 * nobody reads.
 */
export function gridFactorNotes(
  resolution: GridFactorResolution,
  label: string,
): readonly string[] {
  if (resolution.value === null) return []
  const notes: string[] = []

  if (resolution.carriedForward && resolution.factorYear !== null) {
    notes.push(
      `${label} is computed with the ${resolution.factorYear} factor: no later one has been published for this grid.`,
    )
  }
  if (resolution.warn) notes.push(`${label}: ${resolution.warn}`)
  return notes
}
