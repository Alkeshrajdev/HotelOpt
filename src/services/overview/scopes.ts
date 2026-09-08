/**
 * Which scope a figure covers, and saying so.
 *
 * THE CARD SAID "GROSS OPERATIONAL EMISSIONS" FOR A SCOPE 2 NUMBER. Every metered energy
 * input a demo hotel has is purchased electricity or purchased cooling, so the total was
 * Scope 2 and was labelled as though it were everything. Meanwhile the same month's
 * purchased goods sat on a different screen, in a different unit of work, adding up to more
 * than the electricity did. A reader comparing that headline against another hotel's, or
 * putting it in a report, was comparing a part with a whole and nothing on the page said so.
 *
 * This is the same failure as a carbon total missing one of its energy inputs, which the
 * absence rule already refuses — one level up, at the boundary rather than inside it.
 *
 * WHAT THE HEADLINE IS. Scope 1 plus Scope 2, which is what "gross operational" means in
 * every framework that uses the phrase: what the property burned and what it bought as
 * energy. Scope 3 is stated beside it and never folded in, because a number that mixes them
 * cannot be compared with anybody's disclosure, including the same hotel's last year.
 */
import { dec } from '@/engine/rounding'

/**
 * The scope each metered resource belongs to.
 *
 * Fuel burned on the premises is Scope 1 however it arrived; energy bought already made is
 * Scope 2. The distinction is about combustion, not about the invoice, which is why piped
 * gas and district heat sit on opposite sides despite both arriving through a pipe from a
 * utility.
 */
export const RESOURCE_SCOPE: Record<string, 'scope_1' | 'scope_2'> = {
  piped_gas: 'scope_1',
  delivered_diesel: 'scope_1',
  delivered_lpg: 'scope_1',
  delivered_other: 'scope_1',
  onsite_generation: 'scope_1',
  grid_electricity: 'scope_2',
  district_cooling: 'scope_2',
  purchased_heat: 'scope_2',
  purchased_steam: 'scope_2',
}

export interface ScopeInput {
  /** Resource → kilograms, for the energy inputs the card computed. */
  readonly energyKg: ReadonlyMap<string, string>
  /**
   * Refrigerant losses for the month, where any could be computed.
   *
   * Null is not zero. A month with no service event, or a gas nobody publishes a factor
   * for, produces no figure — and an inventory that reports zero where it means unknown
   * understates a hotel's emissions and passes assurance until somebody opens the service
   * file.
   */
  readonly refrigerantKg: string | null
  /**
   * Whether this reader holds procurement at this hotel.
   *
   * False means SAY NOTHING about Scope 3 — not that there is none. The register returns
   * an empty set to a reader without the category exactly as it does for a month with no
   * invoices (§2.5), and asserting absence from that emptiness would tell a manager
   * granted energy and water that their month has no purchased goods when it has four
   * lines they are not cleared to see.
   */
  readonly purchasesVisible: boolean
  /** Purchased goods and services for the same month, where any were recorded. */
  readonly purchasedGoodsKg: string | null
  readonly purchaseLinesTotal: number
  readonly purchaseLinesUncomputed: number
}

export interface ScopeCoverage {
  readonly headingLabel: string
  readonly scope1Kg: string
  readonly scope2Kg: string
  readonly scope3Kg: string | null
  /** What the headline figure covers, and what it does not. */
  readonly sentence: string
}

export function scopeCoverage(input: ScopeInput): ScopeCoverage {
  let one = dec('0')
  let two = dec('0')
  let unclassified = false

  if (input.refrigerantKg !== null) one = one.plus(dec(input.refrigerantKg))

  for (const [resource, kg] of input.energyKg) {
    const scope = RESOURCE_SCOPE[resource]
    if (scope === 'scope_1') one = one.plus(dec(kg))
    else if (scope === 'scope_2') two = two.plus(dec(kg))
    else {
      // A resource nobody has assigned a scope to is counted nowhere and said out loud.
      // Silently folding it into Scope 2 would make the commonest new-resource mistake
      // invisible: an unassigned fuel would be reported as purchased energy.
      unclassified = true
    }
  }

  const hasScope1 = !one.isZero()
  const parts: string[] = []

  parts.push(
    hasScope1
      ? 'This figure covers Scope 1 and Scope 2 — what was burned or leaked here, and energy bought already made.'
      : 'This figure covers Scope 2 only: energy bought already made. No fuel is reported as burned at this property, so it has no Scope 1.',
  )
  if (hasScope1 && input.refrigerantKg === null) {
    // Said out loud, because refrigerant leakage is frequently a material share of a
    // hotel's Scope 1 and its absence from a total that HAS a Scope 1 reads as nil.
    parts.push('Refrigerant losses are not in it: none is computed for this month.')
  }

  if (!input.purchasesVisible) {
    // No claim in either direction. "Not shown here" is true whether the month holds
    // forty invoices or none, and it is the only sentence that is.
    parts.push('Purchased goods and services are not shown on this card.')
  } else if (input.purchaseLinesTotal === 0) {
    parts.push('No purchases have been recorded for this month, so Scope 3 is not in it either.')
  } else if (input.purchasedGoodsKg === null) {
    parts.push(
      `${input.purchaseLinesTotal} purchase ${input.purchaseLinesTotal === 1 ? 'line' : 'lines'} were recorded and none could be computed, so no Scope 3 figure exists for this month.`,
    )
  } else {
    const kg = dec(input.purchasedGoodsKg).toDecimalPlaces(0).toFixed(0)
    parts.push(
      `Purchased goods and services add ${kg} kg on top, shown separately because a total mixing scopes cannot be compared with anybody's disclosure.`,
    )
    if (input.purchaseLinesUncomputed > 0) {
      parts.push(
        `${input.purchaseLinesUncomputed} purchase ${input.purchaseLinesUncomputed === 1 ? 'line' : 'lines'} could not be computed and ${input.purchaseLinesUncomputed === 1 ? 'is' : 'are'} in neither number.`,
      )
    }
  }

  if (unclassified) {
    parts.push('One or more energy inputs have no scope assigned and are counted in neither scope.')
  }

  return {
    headingLabel: hasScope1 ? 'Scope 1 and 2 emissions' : 'Scope 2 emissions',
    scope1Kg: one.toFixed(),
    scope2Kg: two.toFixed(),
    scope3Kg: input.purchasesVisible ? input.purchasedGoodsKg : null,
    sentence: parts.join(' '),
  }
}
