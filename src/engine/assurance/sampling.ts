/**
 * Assurance sampling — §19.3.
 *
 * A stratified sample across hotels, resources, months and quality tiers, with a
 * configurable size and a FIXED RANDOM SEED recorded on the sample so it is reproducible.
 *
 * Reproducibility is the whole point and it is easy to lose in two ways, both handled here:
 *
 *   • A seeded generator is not enough if the candidate order can vary. The same seed
 *     against the same population must give the same sample even when the query that
 *     produced the population returned its rows in a different order, so the population is
 *     sorted into a canonical order before anything is drawn.
 *   • Language-provided randomness is not reproducible across runtimes or versions. The
 *     generator here is a small explicit one whose sequence is fully determined by the
 *     seed, so a verifier re-running the draw in three years gets the same records.
 *
 * Estimated and Proxy records are over-sampled relative to their share, since non-measured
 * data attracts the most scrutiny. The factor is recorded alongside the seed, because a
 * sample is only reproducible if every parameter that shaped it is known.
 */
import { dec, Decimal } from '../rounding'
import type { QualityTier } from '../quality'

export interface SampleCandidate {
  readonly recordType: string
  readonly recordId: string
  readonly hotelId: string
  readonly resource: string
  /** 'YYYY-MM'. */
  readonly month: string
  readonly qualityTier: QualityTier
}

export interface SampledRecord extends SampleCandidate {
  readonly stratum: string
}

export interface StratumSummary {
  readonly stratum: string
  readonly populationCount: number
  readonly drawnCount: number
  readonly populationSharePercent: string
  readonly drawnSharePercent: string
  /** True where the stratum's share of the sample exceeds its share of the population. */
  readonly overSampled: boolean
}

export interface DrawnSample {
  readonly seed: number
  readonly requestedSize: number
  readonly drawnSize: number
  readonly nonMeasuredOversampling: number
  readonly records: readonly SampledRecord[]
  readonly strata: readonly StratumSummary[]
  readonly targetedCriteria: string | null
}

export interface SampleRequest {
  readonly candidates: readonly SampleCandidate[]
  readonly size: number
  readonly seed: number
  /** Defaults to 2: Estimated and Proxy records are drawn at twice their share. */
  readonly nonMeasuredOversampling?: number
  /** Recorded where the verifier asked for an additional targeted sample (§19.3). */
  readonly targetedCriteria?: string
}

export const DEFAULT_NON_MEASURED_OVERSAMPLING = 2

/**
 * A small explicit generator (mulberry32). Chosen over the runtime's own randomness for
 * one reason: its sequence is a pure function of the seed and will not change with a
 * runtime upgrade, which is what "reproducible" has to mean for an audit artefact.
 */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function stratumKey(c: SampleCandidate): string {
  return `${c.hotelId}|${c.resource}|${c.month}|${c.qualityTier}`
}

function canonicalOrder(a: SampleCandidate, b: SampleCandidate): number {
  const ka = `${stratumKey(a)}|${a.recordType}|${a.recordId}`
  const kb = `${stratumKey(b)}|${b.recordType}|${b.recordId}`
  return ka < kb ? -1 : ka > kb ? 1 : 0
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

export function drawSample(request: SampleRequest): DrawnSample {
  const oversampling = request.nonMeasuredOversampling ?? DEFAULT_NON_MEASURED_OVERSAMPLING
  const population = [...request.candidates].sort(canonicalOrder)

  const byStratum = new Map<string, SampleCandidate[]>()
  for (const c of population) {
    const key = stratumKey(c)
    const bucket = byStratum.get(key)
    if (bucket) bucket.push(c)
    else byStratum.set(key, [c])
  }

  const keys = [...byStratum.keys()].sort()
  const tierOf = (key: string) => key.split('|')[3] as QualityTier
  const target = Math.min(request.size, population.length)

  /**
   * Largest-remainder allocation over a set of buckets, capped by what each holds. Ties
   * broken by key so two runs of the same draw allocate identically.
   */
  const allocate = (
    buckets: readonly { key: string; weight: Decimal; cap: number }[],
    total: number,
  ): Map<string, number> => {
    const out = new Map<string, number>()
    const totalWeight = buckets.reduce((t, b) => t.plus(b.weight), dec(0))
    if (totalWeight.isZero() || total <= 0) {
      for (const b of buckets) out.set(b.key, 0)
      return out
    }
    const exact = buckets.map((b) => ({
      key: b.key,
      cap: b.cap,
      value: b.weight.dividedBy(totalWeight).times(total),
    }))
    let assigned = 0
    for (const e of exact) {
      const floor = Math.min(Math.floor(e.value.toNumber()), e.cap)
      out.set(e.key, floor)
      assigned += floor
    }
    const byRemainder = [...exact].sort((a, b) => {
      const cmp = b.value
        .minus(Math.floor(b.value.toNumber()))
        .comparedTo(a.value.minus(Math.floor(a.value.toNumber())))
      return cmp !== 0 ? cmp : a.key < b.key ? -1 : 1
    })
    let cursor = 0
    let guard = 0
    while (assigned < total && byRemainder.length > 0 && guard < byRemainder.length * (total + 2)) {
      const e = byRemainder[cursor % byRemainder.length]!
      const current = out.get(e.key)!
      if (current < e.cap) {
        out.set(e.key, current + 1)
        assigned += 1
      }
      cursor += 1
      guard += 1
    }
    return out
  }

  // Allocate by TIER first, then within each tier across its strata.
  //
  // Doing it in one pass over all strata looks equivalent and is not: with many small
  // strata, largest-remainder concentrates the whole sample in the big ones, and a
  // population that is 20% non-measured can yield a sample that is 0% non-measured. The
  // tier mix is the thing §19.3 actually legislates, so it is decided first and the
  // within-tier spread is decided under it.
  const tiers: QualityTier[] = ['measured', 'estimated', 'proxy']
  const tierBuckets = tiers.map((tier) => {
    const tierKeys = keys.filter((k) => tierOf(k) === tier)
    const count = tierKeys.reduce((t, k) => t + byStratum.get(k)!.length, 0)
    const factor = tier === 'measured' ? dec(1) : dec(oversampling)
    return { key: tier, weight: dec(count).times(factor), cap: count, keys: tierKeys }
  })
  const perTier = allocate(tierBuckets, target)

  const allocation = new Map<string, number>()
  for (const t of tierBuckets) {
    const within = allocate(
      t.keys.map((k) => ({
        key: k,
        weight: dec(byStratum.get(k)!.length),
        cap: byStratum.get(k)!.length,
      })),
      perTier.get(t.key) ?? 0,
    )
    for (const [k, v] of within) allocation.set(k, v)
  }

  const random = seededRandom(request.seed)
  const records: SampledRecord[] = []
  for (const key of keys) {
    const take = allocation.get(key) ?? 0
    if (take === 0) continue
    for (const c of shuffle(byStratum.get(key)!, random).slice(0, take)) {
      records.push({ ...c, stratum: key })
    }
  }
  records.sort(canonicalOrder)

  const strata: StratumSummary[] = keys.map((key) => {
    const populationCount = byStratum.get(key)!.length
    const drawnCount = records.filter((r) => r.stratum === key).length
    const populationShare = dec(populationCount).dividedBy(population.length).times(100)
    const drawnShare =
      records.length === 0 ? dec(0) : dec(drawnCount).dividedBy(records.length).times(100)
    return {
      stratum: key,
      populationCount,
      drawnCount,
      populationSharePercent: populationShare.toFixed(),
      drawnSharePercent: drawnShare.toFixed(),
      overSampled: drawnShare.greaterThan(populationShare),
    }
  })

  return {
    seed: request.seed,
    requestedSize: request.size,
    drawnSize: records.length,
    nonMeasuredOversampling: oversampling,
    records,
    strata,
    targetedCriteria: request.targetedCriteria ?? null,
  }
}

/** The share of a drawn sample that is not Measured, for the sample's own disclosure. */
export function nonMeasuredShare(sample: DrawnSample): string {
  if (sample.records.length === 0) return '0'
  const nonMeasured = sample.records.filter((r) => r.qualityTier !== 'measured').length
  return dec(nonMeasured).dividedBy(sample.records.length).times(100).toFixed()
}
