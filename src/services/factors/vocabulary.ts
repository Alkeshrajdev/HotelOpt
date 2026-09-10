/**
 * How a governed factor is named in front of a person — App. F, §2.1.
 *
 * WHY THIS IS NOT IN THE SCREEN THAT USES IT. It was, and the build refused: a Server
 * Component that imports a plain constant from a `'use client'` module does not get the
 * constant. Everything a client module exports becomes a client reference across that
 * boundary, so `SET_TYPES.map` typechecked, compiled, and threw "map is not a function"
 * when Next collected the page's data.
 *
 * That is the same class as the Server Component that passed a function to a Client
 * Component: the boundary erases things the type system still says are there. Values
 * shared across it live in a module that belongs to neither side.
 */

/**
 * Every member of factors.set_type, with the label a person reads. Not a chosen subset:
 * an omitted kind is a kind nobody can publish, and the enum is the list the database will
 * actually accept. My first draft offered 'conversion' and 'benchmark', neither of which
 * exists — both would have been refused at publish time by an enum cast, which is a poor
 * way to learn a field's values.
 */
export const SET_TYPES: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'emission', label: 'Emission factor' },
  { value: 'gwp', label: 'Global warming potential' },
  { value: 'plant_efficiency', label: 'Plant efficiency' },
  { value: 'unit_conversion', label: 'Unit conversion' },
  { value: 'residual_mix', label: 'Residual mix' },
  { value: 'price_index', label: 'Price index' },
  { value: 'fx_rate', label: 'Exchange rate' },
  { value: 'sector_mapping', label: 'Sector mapping' },
  { value: 'assumption_set', label: 'Assumption set' },
  { value: 'supplier_pcf', label: 'Supplier product footprint' },
]

export const SET_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  SET_TYPES.map((t) => [t.value, t.label]),
)

/** A version's standing, said as a person would say it rather than as the enum spells it. */
export const FACTOR_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'In force',
  superseded: 'Superseded',
  withdrawn: 'Withdrawn',
}
