/**
 * How a waste capture acquires a treatment destination — §15.4.1.
 *
 * A capture records stream, weight and time at a bin. It records nothing about where the
 * material ended up, and every reported waste figure is by stream AND destination. The
 * gap between those two facts is this module.
 *
 * The rank order is not a preference list to be applied loosely. Each rank is a different
 * quality of evidence, the rank used is stored on the resulting record and appears in the
 * trace, and rank 4 — no collection and no route — is an outcome rather than a gap:
 *
 *   1  collection carrying a weighbridge ticket or contractor confirmation   Measured
 *   2  collection naming the destination, without a ticket                   Measured
 *   3  the WasteRoute in force for that point and stream on the capture date Measured, derived
 *   4  neither                                       Not established — in the denominator,
 *                                                    in neither numerator, never assumed
 *
 * This mirrors the waste.capture_destinations view in migration 016. The database resolves
 * it for query paths and this resolves it for the engine; they are tested against the same
 * cases so they cannot drift apart.
 */
import type { QualityTier } from '../quality'

export type DestinationMethod =
  'collection_ticket' | 'collection_named' | 'route_derived' | 'not_established'

export type WeightBasis = 'weighed' | 'container_count' | 'estimated'

export interface LinkedCollection {
  readonly destinationId: string
  /** A weighbridge ticket or a contractor confirmation naming the facility. */
  readonly weighbridgeTicket: boolean
}

export interface RouteInForce {
  readonly destinationId: string
}

export interface CaptureEvidence {
  /** The pickup this capture was linked to, where one exists. */
  readonly collection?: LinkedCollection
  /** The standing route for this waste point and stream on the capture date. */
  readonly route?: RouteInForce
  readonly weightBasis: WeightBasis
}

export interface ResolvedDestination {
  readonly method: DestinationMethod
  /** Null exactly when the method is `not_established`. */
  readonly destinationId: string | null
  /** True only for rank 3 — the record says how it got there (§15.4.1). */
  readonly derived: boolean
  /**
   * Whether this capture may count toward a material recovery or landfill diversion
   * numerator. False for rank 4, and false is not a bug to be worked around: assigning it
   * a destination is what the rule prohibits.
   */
  readonly countsTowardNumerators: boolean
  /** The tier the WEIGHT carries, driven by the weight basis (§15.4). */
  readonly weightQualityTier: QualityTier
}

/**
 * Weight basis to quality tier.
 *
 * Only a weighed capture measured this material. Container count × registered container
 * weight is a documented estimation method, and §6.6 calls that Estimated however
 * carefully the container weight was established — the count is real, the mass is not.
 */
export function weightQualityTier(basis: WeightBasis): QualityTier {
  return basis === 'weighed' ? 'measured' : 'estimated'
}

export function resolveDestination(evidence: CaptureEvidence): ResolvedDestination {
  const weightQuality = weightQualityTier(evidence.weightBasis)

  if (evidence.collection) {
    return {
      method: evidence.collection.weighbridgeTicket ? 'collection_ticket' : 'collection_named',
      destinationId: evidence.collection.destinationId,
      derived: false,
      countsTowardNumerators: true,
      weightQualityTier: weightQuality,
    }
  }

  if (evidence.route) {
    return {
      method: 'route_derived',
      destinationId: evidence.route.destinationId,
      derived: true,
      countsTowardNumerators: true,
      weightQualityTier: weightQuality,
    }
  }

  return {
    method: 'not_established',
    destinationId: null,
    derived: false,
    countsTowardNumerators: false,
    weightQualityTier: weightQuality,
  }
}

/** Wording for the trace and for any surface that shows how a destination was reached. */
export const METHOD_DESCRIPTION: Record<DestinationMethod, string> = {
  collection_ticket:
    'Linked to a collection carrying a weighbridge ticket or contractor confirmation naming the facility.',
  collection_named: 'Linked to a collection naming the destination, without a ticket.',
  route_derived:
    'Derived from the standing route in force for this waste point and stream on the capture date.',
  not_established:
    'No collection and no route. Counted in total generated waste and excluded from both the material recovery and landfill diversion numerators.',
}

/**
 * A persistent "Not established" volume means a route is missing, not that the waste
 * vanished (§15.4.1), so it is raised rather than absorbed.
 */
export function notEstablishedAttention(resolutions: readonly ResolvedDestination[]): {
  readonly count: number
  readonly raise: boolean
} {
  const count = resolutions.filter((r) => r.method === 'not_established').length
  return { count, raise: count > 0 }
}
