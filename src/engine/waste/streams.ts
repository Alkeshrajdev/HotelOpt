/**
 * The waste stream vocabulary, matching the waste.stream enum in migration 016.
 *
 * Streams are grouped only where §15.4.2 needs the grouping to pick a default source of
 * record. They are never grouped for reporting: a reported figure is by stream and
 * treatment destination.
 */
export type WasteStream =
  | 'general_mixed'
  | 'mixed_recyclables'
  | 'paper_card'
  | 'plastics'
  | 'glass'
  | 'metals'
  | 'food_organic'
  | 'garden_green'
  | 'cooking_oil'
  | 'e_waste'
  | 'batteries'
  | 'textiles'
  | 'hazardous'
  | 'construction_demolition'
  | 'other'

/** The streams a contractor statement is the sensible default for (§15.4.2). */
export function isGeneralOrMixedStream(stream: WasteStream): boolean {
  return stream === 'general_mixed' || stream === 'mixed_recyclables'
}

/** Food and organic waste, where on-site weighed capture is the default (§15.4.2). */
export function isOrganicStream(stream: WasteStream): boolean {
  return stream === 'food_organic' || stream === 'garden_green' || stream === 'cooking_oil'
}
