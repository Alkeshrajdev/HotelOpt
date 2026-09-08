/**
 * A factor for a burned fuel, from the published library — App. F; §11.2.
 *
 * Scope 2 has had a governed answer since the grid database landed. Scope 1 had none: the
 * only emission factors the carbon card could reach were the two demonstration rows in the
 * governed set store, and neither is a fuel. Every property therefore reported Scope 2
 * only — correctly, and completely, and said so — which is honest and still means nothing
 * in this product had ever reported burning anything.
 *
 * This is the same seam the grid uses, for the same reason: the number is not written down
 * here. `factors.select_for_line` reads it from the published library at the date of the
 * month being reported, through a binding that says which published series this resource
 * resolves to. So a 2025 month keeps the 2025 edition after the 2026 one lands, and the
 * choice of series is a row somebody can read and argue with rather than a constant in
 * this file.
 */

export interface ActivityFactorResolution {
  /** Null when nothing could be resolved; `refusal` then says why, in a sentence. */
  readonly value: string | null
  readonly unit: string
  readonly publisher: string | null
  readonly edition: string | null
  /** True when the applicable edition has no value and an older one is being used. */
  readonly carriedForward: boolean
  readonly activityPath: readonly string[]
  readonly refusal: string | null
}

/** What a reader is owed about a fuel factor that WAS used. */
export function activityFactorNotes(
  resolution: ActivityFactorResolution,
  label: string,
): readonly string[] {
  if (resolution.value === null) return []
  if (!resolution.carriedForward) return []
  return [
    `${label} is computed with the ${resolution.edition ?? 'previous'} factor: no later edition covers this month.`,
  ]
}

/**
 * The factor's unit, written the way the engine requires it.
 *
 * The published library denominates a value by naming only the denominator — a fuels row
 * carries unit 'litres', meaning kilograms of CO2e per litre. The emissions engine refuses
 * a factor whose unit has no slash, deliberately: 0.4041 applied to litres produces a
 * number, silently, and that number becomes a hotel's reported emissions. So the two
 * halves are joined here, once, rather than each caller assuming what the bare word meant.
 */
export function activityFactorUnit(resolution: ActivityFactorResolution): string {
  return `kgCO2e/${resolution.unit}`
}

/** The source line a factor from the published library carries onto the card. */
export function activityFactorSource(resolution: ActivityFactorResolution): string {
  const path = resolution.activityPath.join(' > ')
  const publisher = resolution.publisher ?? 'published library'
  return resolution.edition
    ? `${publisher} ${resolution.edition} — ${path}`
    : `${publisher} — ${path}`
}
