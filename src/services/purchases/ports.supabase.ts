import type { SupabaseClient } from '@supabase/supabase-js'
import type { PurchaseLine } from './model'

/**
 * A month's lines, each with what it resolves to.
 *
 * One call, because the resolution happens in the database: which factor applies to a line
 * depends on its frozen classification, on the vintage in force for the period, and on
 * whether the money can be converted — and every one of those rules is written once, in
 * SQL, where the REST surface cannot go round it.
 */
export async function loadPurchaseLines(
  supabase: SupabaseClient,
  periodId: string,
): Promise<readonly PurchaseLine[]> {
  const { data, error } = await supabase
    .schema('data')
    .rpc('spend_lines_for_period', { p_period_id: periodId })
  if (error) throw new Error(`purchases.lines: ${error.message}`)

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row['id']),
    supplier: row['supplier'] === null ? null : String(row['supplier']),
    description: String(row['description']),
    reference: row['reference'] === null ? null : String(row['reference']),
    amount: String(row['amount']),
    currency: String(row['currency']),
    spendYear: Number(row['spend_year']),
    quantity: row['quantity'] === null ? null : String(row['quantity']),
    unit: row['unit'] === null ? null : String(row['unit']),
    route: row['route'] === null ? null : String(row['route']),
    naics: row['naics'] === null ? null : String(row['naics']),
    classificationMethod:
      row['classification_method'] === null ? null : String(row['classification_method']),
    classificationConfidence:
      row['classification_confidence'] === null ? null : String(row['classification_confidence']),
    publisher: row['publisher'] === null ? null : String(row['publisher']),
    edition: row['edition'] === null ? null : String(row['edition']),
    factorValue: row['factor_value'] === null ? null : String(row['factor_value']),
    emissionsKg: row['emissions_kg'] === null ? null : String(row['emissions_kg']),
    qualityTier: String(row['quality_tier']),
    refusal: row['refusal'] === null ? null : String(row['refusal']),
    capex: row['capex'] === true,
    recoverableTax: row['recoverable_tax'] === null ? null : String(row['recoverable_tax']),
    amountNet: String(row['amount_net'] ?? row['amount']),
  }))
}
