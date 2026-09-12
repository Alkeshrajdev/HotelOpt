/**
 * Reading a PostgREST embedded relationship.
 *
 * PostgREST returns an embed's shape according to the CARDINALITY of the relationship it
 * followed: a to-many embed arrives as an array, a to-one embed as a single object. The
 * generated TypeScript types do not always distinguish the two, so `embed?.[0]` compiles
 * against a to-one embed, returns undefined at runtime, and the calling code treats a row
 * that exists as a row that does not.
 *
 * That is what happened to the Overview. Every resource record was read, every one had its
 * resource resolved to undefined, every one was skipped, and all three cards reported "no
 * approved record for this period" over a database holding twenty months of them. Nothing
 * threw. The page was internally consistent and completely wrong, and the only way to see
 * it was to load it against real rows.
 *
 * So the shape is normalised once, here, rather than at each call site.
 */
export function firstEmbedded<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) return undefined
  if (Array.isArray(value)) return value.length > 0 ? (value[0] as T) : undefined
  if (typeof value === 'object') return value as T
  return undefined
}
