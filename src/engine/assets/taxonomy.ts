/**
 * End-use taxonomy and the physical model — §8.2, §8.3.
 *
 * The v2.0 single linear hierarchy could not represent a real building, so two distinct
 * relationships are modelled separately:
 *
 *   Measurement topology — a TREE.  A sub-meter is physically downstream of a billing
 *   meter. This is what reconciliation and unallocated calculations use.
 *
 *   Service relationships — a GRAPH. What a meter measures and what an asset serves are
 *   many-to-many, carrying an allocation share, a basis and effective dates.
 *
 * END-USES ARE RESOURCE-SCOPED. Attributing water to "Lighting" or electricity to
 * "Cooling tower makeup" is rejected at write time (§8.3), not filtered out later.
 */

export type Resource = 'electricity' | 'thermal' | 'water'

export const END_USES = [
  'hvac_generation',
  'hvac_distribution',
  'cooling_tower_makeup',
  'domestic_hot_water',
  'guest_rooms',
  'kitchen_fb',
  'laundry',
  'lighting',
  'vertical_transport',
  'pool_spa',
  'irrigation_landscape',
  'back_of_house',
  'staff_accommodation',
  'tenant_leased',
  'ev_charging',
  'onsite_generation',
  'combined_group',
  'unallocated',
] as const
export type EndUse = (typeof END_USES)[number]

/**
 * The standard taxonomy is fixed so attribution is comparable across properties.
 * Tenants may add sub-categories, never top-level categories (§8.3).
 *
 * Cooling tower makeup is water-only and deliberately present: in hot, arid markets it
 * is frequently the second-largest water end-use, and it is the water consequence of
 * the same chiller plant whose electricity sits under HVAC — generation.
 */
export const END_USE_RESOURCES: Record<EndUse, readonly Resource[]> = {
  hvac_generation: ['electricity', 'thermal'],
  hvac_distribution: ['electricity'],
  cooling_tower_makeup: ['water'],
  domestic_hot_water: ['electricity', 'thermal', 'water'],
  guest_rooms: ['electricity', 'water'],
  kitchen_fb: ['electricity', 'thermal', 'water'],
  laundry: ['electricity', 'thermal', 'water'],
  lighting: ['electricity'],
  vertical_transport: ['electricity'],
  pool_spa: ['electricity', 'thermal', 'water'],
  irrigation_landscape: ['electricity', 'water'],
  back_of_house: ['electricity', 'water'],
  staff_accommodation: ['electricity', 'thermal', 'water'],
  tenant_leased: ['electricity', 'thermal', 'water'],
  ev_charging: ['electricity'],
  onsite_generation: ['electricity', 'thermal'],
  combined_group: ['electricity', 'thermal', 'water'],
  unallocated: ['electricity', 'thermal', 'water'],
}

export class EndUseScopeError extends Error {
  constructor(endUse: EndUse, resource: Resource) {
    super(
      `end-use "${endUse}" is not valid for ${resource}; a meter's service edges may only target end-uses valid for that meter's resource (§8.3)`,
    )
    this.name = 'EndUseScopeError'
  }
}

export function isValidForResource(endUse: EndUse, resource: Resource): boolean {
  return END_USE_RESOURCES[endUse].includes(resource)
}

/** Rejected at write time, not filtered out downstream (§8.3). */
export function assertEndUseValid(endUse: EndUse, resource: Resource): void {
  if (!isValidForResource(endUse, resource)) throw new EndUseScopeError(endUse, resource)
}

// ─── Combined end-use groups (§8.2) ───────────────────────────────────────────

/**
 * The basis on which a meter's consumption is allocated to an end-use.
 *
 * Only an evidenced measurement or an evidenced schedule counts toward end-use
 * separation. An assumption counts toward the combined group, never toward a named
 * end-use (§8.7).
 */
export type AllocationBasis =
  'temporary_metered_sub_split' | 'load_survey' | 'rated_schedule_with_runtime' | 'assumption'

export const EVIDENCED_BASES: readonly AllocationBasis[] = [
  'temporary_metered_sub_split',
  'load_survey',
  'rated_schedule_with_runtime',
]

export function isEvidencedBasis(basis: AllocationBasis): boolean {
  return EVIDENCED_BASES.includes(basis)
}

export interface CombinedGroupSplit {
  readonly groupName: string
  readonly basis: AllocationBasis
  readonly evidenceReference?: string | undefined
  readonly approvedBy?: string | undefined
  readonly approvedAt?: string | undefined
}

export class CombinedGroupSplitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CombinedGroupSplitError'
  }
}

/**
 * A combined group may only be split on a recorded, evidenced basis: a temporary
 * metered sub-split, a load survey, or a manufacturer-rated schedule with recorded
 * runtime.
 *
 * Splitting by assumption, floor area or engineering judgement alone is PROHIBITED, and
 * any split records its evidence, its date and who approved it (§8.2).
 */
export function assertSplitPermitted(split: CombinedGroupSplit): void {
  if (!isEvidencedBasis(split.basis)) {
    throw new CombinedGroupSplitError(
      `"${split.groupName}" cannot be split on basis "${split.basis}": splitting by assumption, floor area or engineering judgement alone is prohibited (§8.2)`,
    )
  }
  if ((split.evidenceReference ?? '').trim() === '') {
    throw new CombinedGroupSplitError(
      `"${split.groupName}" split requires a recorded evidence reference (§8.2)`,
    )
  }
  if ((split.approvedBy ?? '').trim() === '' || (split.approvedAt ?? '').trim() === '') {
    throw new CombinedGroupSplitError(
      `"${split.groupName}" split requires the date and the approver to be recorded (§8.2)`,
    )
  }
}

// ─── Measurement topology (§8.2) ──────────────────────────────────────────────

export interface MeterPoint {
  readonly id: string
  readonly resource: Resource
  readonly isBillingMeter: boolean
  /** Null for a billing meter, which is the root of its own tree. */
  readonly parentMeterId: string | null
}

export class TopologyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TopologyError'
  }
}

/**
 * Validate the measurement topology as a tree.
 *
 * A cycle, a missing parent, or a parent of a different resource all make
 * reconciliation meaningless, so they are refused rather than tolerated.
 */
export function assertValidTopology(meters: readonly MeterPoint[]): void {
  const byId = new Map(meters.map((m) => [m.id, m]))

  for (const m of meters) {
    if (m.isBillingMeter && m.parentMeterId !== null) {
      throw new TopologyError(`billing meter ${m.id} cannot sit downstream of another meter`)
    }
    if (m.parentMeterId === null) continue

    const parent = byId.get(m.parentMeterId)
    if (parent === undefined) {
      throw new TopologyError(`meter ${m.id} names a parent ${m.parentMeterId} that does not exist`)
    }
    if (parent.resource !== m.resource) {
      throw new TopologyError(
        `meter ${m.id} (${m.resource}) cannot sit under a ${parent.resource} meter`,
      )
    }

    // Walk to the root, refusing a cycle.
    const seen = new Set<string>([m.id])
    let cursor: MeterPoint | undefined = parent
    while (cursor !== undefined) {
      if (seen.has(cursor.id)) {
        throw new TopologyError(`the measurement topology contains a cycle through ${cursor.id}`)
      }
      seen.add(cursor.id)
      cursor = cursor.parentMeterId === null ? undefined : byId.get(cursor.parentMeterId)
    }
  }
}

/** Direct children of a meter under the measurement topology. */
export function childrenOf(meters: readonly MeterPoint[], parentId: string): readonly MeterPoint[] {
  return meters.filter((m) => m.parentMeterId === parentId)
}
