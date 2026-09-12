/**
 * Refrigerant losses, as the carbon card needs them — §8.10.
 *
 * Frequently a material share of a hotel's Scope 1 and the most audit-challenged line in
 * the inventory. The arithmetic has been in the engine, tested, since it was written; what
 * was missing was everything around it — a way to read the events, a way to turn a gas
 * name into a global warming potential, and a decision about what to do when either is
 * absent.
 *
 * THE ANSWER TO ABSENCE IS NEVER ZERO. A month with no service event produces no figure
 * and says so; a gas nobody publishes a factor for produces no figure and names the gas.
 * Those are different states from "nothing leaked", and the difference is the whole
 * discipline: an inventory that reports zero where it means unknown understates a hotel's
 * emissions and passes assurance right up until somebody opens the service file.
 */
import { dec, sum } from '@/engine/rounding'
import { leakRate, refrigerantEmissions } from '@/engine/ghg/refrigerant'
import type { RefrigerantEvent, RefrigerantMethod } from '@/engine/ghg/refrigerant'

export interface RefrigerantEventRow {
  readonly assetId: string
  readonly assetName: string
  readonly gas: string
  readonly method: RefrigerantMethod
  readonly nameplateChargeKg: string
  readonly eventType: RefrigerantEvent['eventType']
  readonly quantityKg: string
  readonly date: string
  readonly recoveredKg: string | null
  readonly evidenceReference: string | null
  readonly technician: string | null
}

/** A gas's global warming potential, as the published library answers it. */
export interface Gwp {
  readonly value: string | null
  /** Including the non-Kyoto products in a blend. Equal to `value` for a pure HFC. */
  readonly allProducts: string | null
  readonly edition: string | null
  readonly activityPath: readonly string[]
  readonly refusal: string | null
}

export interface RefrigerantLine {
  readonly assetName: string
  readonly gas: string
  readonly quantityEmittedKg: string
  readonly emissionsKgCO2e: string | null
  /** The global warming potential applied, so the decomposition can name the factor. */
  readonly gwpValue: string | null
  readonly leakRatePercent: string | null
  /** Set when this line contributes nothing, and says why in a sentence. */
  readonly refusal: string | null
}

export interface RefrigerantLosses {
  /** Null when NOTHING could be computed. Never zero standing in for unknown. */
  readonly totalKgCO2e: string | null
  readonly lines: readonly RefrigerantLine[]
  readonly notes: readonly string[]
}

/**
 * One line per asset and gas, because that is the unit §8.10 fixes the method at: a
 * property running two chillers on different gases has two leak rates and no combined one.
 */
export function refrigerantLosses(
  rows: readonly RefrigerantEventRow[],
  gwpFor: (gas: string) => Gwp | undefined,
): RefrigerantLosses {
  if (rows.length === 0) return { totalKgCO2e: null, lines: [], notes: [] }

  const events: RefrigerantEvent[] = rows.map((r) => ({
    assetId: r.assetId,
    gas: r.gas,
    eventType: r.eventType,
    quantityKg: r.quantityKg,
    date: r.date,
    ...(r.recoveredKg !== null ? { recoveredKg: r.recoveredKg } : {}),
    ...(r.evidenceReference !== null ? { evidenceReference: r.evidenceReference } : {}),
    ...(r.technician !== null ? { technician: r.technician } : {}),
  }))

  const pairs = new Map<string, RefrigerantEventRow>()
  for (const r of rows) pairs.set(`${r.assetId}|${r.gas}`, r)

  const lines: RefrigerantLine[] = []
  const notes: string[] = []
  const computed: string[] = []

  for (const [, first] of pairs) {
    // Mass balance needs the net charge increase in installed equipment over the period,
    // which nothing in this product records yet. Guessing it would be inventing the term
    // that decides the answer, so the line refuses and names what it needs.
    if (first.method === 'mass_balance') {
      lines.push({
        assetName: first.assetName,
        gas: first.gas,
        quantityEmittedKg: '0',
        emissionsKgCO2e: null,
        gwpValue: null,
        leakRatePercent: null,
        refusal: `${first.assetName} is on the mass balance method, which needs the net charge increase in installed equipment over the period; that is not on record, and it is the term that decides the answer.`,
      })
      continue
    }

    const rate = leakRate(first.assetId, first.gas, first.nameplateChargeKg, events)
    const emitted = refrigerantEmissions({
      assetId: first.assetId,
      gas: first.gas,
      method: 'screening_service_record',
      events,
      // GWP is applied below, where a refusal can be reported per gas. Passing 1 here makes
      // the engine return the quantity, which is the part it decides.
      gwp: '1',
      gwpVintage: 'n/a',
    })

    const gwp = gwpFor(first.gas)
    if (!gwp || gwp.value === null) {
      lines.push({
        assetName: first.assetName,
        gas: first.gas,
        quantityEmittedKg: emitted.quantityEmittedKg,
        emissionsKgCO2e: null,
        gwpValue: null,
        leakRatePercent: rate.leakRatePercent,
        refusal:
          gwp?.refusal ??
          `no published global warming potential is on file for ${first.gas}, so its leakage cannot be stated in CO2e`,
      })
      continue
    }

    const kg = dec(emitted.quantityEmittedKg).times(dec(gwp.value)).toFixed()
    computed.push(kg)
    lines.push({
      assetName: first.assetName,
      gas: first.gas,
      quantityEmittedKg: emitted.quantityEmittedKg,
      emissionsKgCO2e: kg,
      gwpValue: gwp.value,
      leakRatePercent: rate.leakRatePercent,
      refusal: null,
    })

    // A blend containing an ozone-depleting product is stated on the Kyoto basket, which is
    // what a Scope 1 inventory covers — and the reader is told what that leaves out, rather
    // than being handed the smaller of two numbers without being told there were two.
    if (gwp.allProducts !== null && !dec(gwp.allProducts).equals(dec(gwp.value))) {
      notes.push(
        `${first.gas} is stated on the Kyoto basket at ${gwp.value} kgCO2e/kg. Including the non-Kyoto products in the blend it would be ${gwp.allProducts}; those are outside a Scope 1 inventory and are not in this figure.`,
      )
    }
    if (rate.attentionItem) notes.push(`${first.assetName}: ${rate.attentionItem}`)
  }

  return {
    totalKgCO2e: computed.length > 0 ? sum(computed).toFixed() : null,
    lines,
    notes,
  }
}
