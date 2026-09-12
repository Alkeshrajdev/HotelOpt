/**
 * A month's purchased goods and services, as a screen needs them.
 *
 * THE TOTAL IS NOT THE ANSWER ON ITS OWN. A month of invoice lines where four could not be
 * classified has a total, and that total looks exactly like a complete one — which is the
 * same failure the carbon card's absence rule exists to prevent, one category along. So
 * the summary states both figures: what was computed, and how much money was not. A reader
 * who sees "12,400 kg from 18 lines" and a reader who sees "12,400 kg from 18 lines, with
 * 4 lines and USD 9,200 not computed" are looking at very different months.
 *
 * WHY MONEY AND NOT LINES ALONE. Four unclassified lines could be USD 40 of stationery or
 * USD 400,000 of construction, and the count says nothing about which. The uncomputed
 * spend is the figure that says whether the gap matters.
 */
import { dec } from '@/engine/rounding'
import { formatQuantity } from '@/i18n'

export interface PurchaseLine {
  readonly id: string
  readonly supplier: string | null
  readonly description: string
  readonly reference: string | null
  readonly amount: string
  readonly currency: string
  readonly spendYear: number
  readonly quantity: string | null
  readonly unit: string | null
  readonly route: string | null
  readonly naics: string | null
  readonly classificationMethod: string | null
  readonly classificationConfidence: string | null
  readonly publisher: string | null
  readonly edition: string | null
  readonly factorValue: string | null
  readonly emissionsKg: string | null
  readonly qualityTier: string
  readonly refusal: string | null
  /** Capital goods: category 2, by accounting treatment and never by amount (§13.3). */
  readonly capex: boolean
  readonly recoverableTax: string | null
  /** The amount the factor is applied to: net of recoverable tax (§13.4, step one). */
  readonly amountNet: string
}

export interface PurchaseSummary {
  readonly lineCount: number
  readonly computedCount: number
  readonly totalKg: string
  readonly uncomputed: readonly { readonly currency: string; readonly amount: string }[]
  readonly sentence: string
}

/**
 * How a classification was arrived at, said to a person.
 *
 * 'rule' is somebody's written rule, 'ai_proposed' is a machine's guess nobody has checked,
 * and 'confirmed' is a person's decision. A screen that showed all three the same way would
 * make the second indistinguishable from the third, which is the whole reason the column
 * exists.
 */
export function methodLabel(method: string | null, confidence: string | null): string | null {
  if (method === null) return null
  if (method === 'rule') return 'Matched a written rule'
  if (method === 'confirmed') return 'Confirmed by a person'
  if (method === 'ai_proposed') {
    const pct = confidence === null ? null : Math.round(Number(confidence) * 100)
    return pct === null || Number.isNaN(pct)
      ? 'Proposed by a model, not yet confirmed'
      : `Proposed by a model at ${pct}% confidence, not yet confirmed`
  }
  return method
}

/** Whether this line's classification is still somebody's to check. */
export function awaitingConfirmation(line: PurchaseLine): boolean {
  return line.classificationMethod === 'ai_proposed'
}

export function summarise(lines: readonly PurchaseLine[]): PurchaseSummary {
  const computed = lines.filter((l) => l.emissionsKg !== null)
  const total = computed.reduce((sum, l) => sum.plus(dec(l.emissionsKg ?? '0')), dec('0'))

  // Grouped by currency and never summed across them. Adding AED to USD to produce one
  // number would be inventing an exchange rate in the place the whole selection layer
  // refuses to invent one.
  const byCurrency = new Map<string, ReturnType<typeof dec>>()
  for (const line of lines) {
    if (line.emissionsKg !== null) continue
    byCurrency.set(
      line.currency,
      (byCurrency.get(line.currency) ?? dec('0')).plus(dec(line.amount)),
    )
  }
  const uncomputed = [...byCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) }))
    .sort((a, b) => a.currency.localeCompare(b.currency))

  const missing = lines.length - computed.length
  // Through the registry, like every figure that reaches a screen: this read 6982 in the
  // page header while every line beneath it was grouped.
  const kg = formatQuantity(total.toFixed(), 'emissions.kgco2e', 'en')

  const sentence =
    lines.length === 0
      ? 'No purchases have been recorded for this month.'
      : missing === 0
        ? `${kg} kg CO2e from ${lines.length} ${lines.length === 1 ? 'line' : 'lines'}.`
        : `${kg} kg CO2e from ${computed.length} of ${lines.length} lines. ` +
          `${missing} ${missing === 1 ? 'line' : 'lines'} could not be computed, ` +
          `covering ${uncomputed.map((u) => `${u.amount} ${u.currency}`).join(' and ')}.`

  return {
    lineCount: lines.length,
    computedCount: computed.length,
    totalKg: kg,
    uncomputed,
    sentence,
  }
}

/**
 * How many live lines a classification decides, said as a sentence.
 *
 * Here rather than in the component because it is the kind of thing that reads fine while
 * you are writing the markup and wrong on the page: the first version produced "1 line in
 * this client are computed from it" for every classification governing exactly one line,
 * which is most of them early on.
 */
export function linesGovernedSentence(count: number): string {
  if (count === 0) return 'No lines have been entered against it yet'
  if (count === 1) return '1 line in this client is computed from it'
  return `${count} lines in this client are computed from it`
}
