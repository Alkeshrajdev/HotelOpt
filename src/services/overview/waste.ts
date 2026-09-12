/**
 * The waste treatment block — §24.2.
 *
 * A single unqualified "diversion percentage" is prohibited. Two named figures appear
 * together or neither appears: material recovery EXCLUDING waste-to-energy, and landfill
 * diversion INCLUDING it with the waste-to-energy tonnage on its own line.
 *
 * This module does not enforce that; engine/waste does, by having no function that returns
 * a bare diversion number. What this does is carry the engine's result to the surface
 * without taking it apart, and hand the view a shape it cannot render half of.
 */
import { diversionFigures } from '@/engine/waste'
import type { DiversionFigures, LineDestination } from '@/engine/waste'

export interface WasteLineInput {
  readonly stream: string
  /** Null where §15.4.1 established no destination — an outcome, not a missing value. */
  readonly treatmentClass: string | null
  readonly kg: string
}

export interface WasteTreatment {
  /** The discriminant every optional block on this page carries (§31 placeholders). */
  readonly available: true
  readonly figures: DiversionFigures
  /** Streams whose destination is not evidenced, which is a task, not a data gap. */
  readonly notEstablishedStreams: readonly string[]
}

const KG_PER_TONNE = 1000

/**
 * The streams, in the words a hotel uses for them.
 *
 * `garden_green` is a database value and reached the screen as one. A code shown to a
 * person is a small failure of the same kind as a raw decimal: correct, and not written
 * for the reader.
 */
const STREAM_LABEL: Record<string, string> = {
  general_mixed: 'General and mixed waste',
  mixed_recyclables: 'Mixed recyclables',
  paper_card: 'Paper and card',
  plastics: 'Plastics',
  glass: 'Glass',
  metals: 'Metals',
  food_organic: 'Food and organic waste',
  garden_green: 'Garden and green waste',
  cooking_oil: 'Used cooking oil',
  e_waste: 'Electrical and electronic waste',
  batteries: 'Batteries',
  textiles: 'Textiles and linen',
  hazardous: 'Hazardous waste',
  construction_demolition: 'Construction and demolition waste',
  other: 'Other waste',
}

export function labelForStream(stream: string): string {
  // An unmapped stream returns its own code rather than an empty string: seeing the code is
  // how somebody notices a stream was added to the enum and not to this table.
  return STREAM_LABEL[stream] ?? stream
}

export function buildWasteTreatment(lines: readonly WasteLineInput[]): WasteTreatment | null {
  if (lines.length === 0) return null

  return {
    available: true,
    // The engine works in tonnes throughout; the hotel enters kilograms because that is
    // what a weighbridge ticket says. Converting here rather than storing tonnes keeps the
    // stored figure the one that was written on the ticket (§6.1).
    figures: diversionFigures(
      lines.map((l) => ({
        stream: l.stream,
        treatment: (l.treatmentClass ?? 'not_established') as LineDestination,
        tonnes: (Number(l.kg) / KG_PER_TONNE).toString(),
      })),
    ),
    notEstablishedStreams: [
      ...new Set(
        lines.filter((l) => l.treatmentClass === null).map((l) => labelForStream(l.stream)),
      ),
    ].sort(),
  }
}
