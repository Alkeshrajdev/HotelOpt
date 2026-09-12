/**
 * Review by exception — SPEC-04B §8, SPEC-03E · E1.
 *
 * Separate from Genuine Performance, and deliberately simpler. GP needs twelve months;
 * review happens every month from the first one, so it compares rather than models.
 *
 * TWO COMPARATORS, ALWAYS BOTH: the previous month (drift, a meter change, a step) and
 * the same month a year earlier (seasonality). Agreeing with one and not the other is
 * itself the finding — drift one way, seasonal break the other. Occupied room nights
 * accompany consumption for all three periods, unnormalised, so the reviewer answers
 * "were we busier" themselves.
 *
 * A TOLERANCE IS A THRESHOLD, NOT A JUDGEMENT, and it is per resource: a district-cooling
 * account and a diesel delivery do not vary alike, and one threshold across all of them
 * over-flags the lumpy and under-flags the steady, which is how a reviewer learns to accept
 * everything. Set by Farnek Admin; a client may tighten and never loosen (SPEC-02 §1.7).
 *
 * A FLAG IS NOT AN ACCUSATION. The sentence says what the pattern is, never what the reader
 * did: "up 19.5% on the same month last year" — never "unusually high", never "check this".
 * Every line carries its own comparison inline, so nothing has to be opened to be
 * understood; a flag with no comparison beside it is a demand to go and look somewhere
 * else, which is how a reviewer learns to accept everything without reading.
 *
 * Nothing here is a KPI. Changes are percentages of the comparator, rounded at the
 * registry's precision for a percentage, and the figures themselves pass through untouched.
 */
import { Decimal, dec, percentage, roundForDisplay } from '../rounding'
import type { QuantityKind } from '../rounding'

export type FlagKind =
  | 'outside_expectation'
  | 'drift'
  | 'seasonal_break'
  | 'against_occupancy'
  | 'estimated'
  | 'apportioned'
  | 'missing'
  | 'no_evidence'
  | 'corrected'
  | 'first_reading'

export const FLAG_LABEL: Record<FlagKind, string> = {
  outside_expectation: 'Outside expectation',
  drift: 'Drift',
  seasonal_break: 'Seasonal break',
  against_occupancy: 'Against occupancy',
  estimated: 'Estimated',
  apportioned: 'Apportioned',
  missing: 'Missing',
  no_evidence: 'No evidence',
  corrected: 'Corrected',
  first_reading: 'First reading',
}

/** The resource classes a tolerance is set for (SPEC-04B §8.3). */
export type ToleranceClass = 'energy' | 'water' | 'fuel' | 'waste' | 'occupancy'

/** Platform defaults, in percent. Starting values, to be tuned once twelve months exist. */
export const REVIEW_TOLERANCES: Record<ToleranceClass, string> = {
  energy: '7',
  water: '10',
  fuel: '25',
  waste: '20',
  occupancy: '10',
}

const CLASS_OF_RESOURCE: Record<string, ToleranceClass> = {
  grid_electricity: 'energy',
  district_cooling: 'energy',
  purchased_heat: 'energy',
  purchased_steam: 'energy',
  piped_gas: 'energy',
  onsite_generation: 'energy',
  water_municipal: 'water',
  water_tse: 'water',
  water_groundwater: 'water',
  water_desalinated: 'water',
  water_tankered: 'water',
  water_cooling_makeup: 'water',
  delivered_diesel: 'fuel',
  delivered_lpg: 'fuel',
  delivered_other: 'fuel',
  waste: 'waste',
  occupancy: 'occupancy',
}

export function toleranceClassOf(resource: string): ToleranceClass {
  return CLASS_OF_RESOURCE[resource] ?? 'energy'
}

/**
 * The tolerance in force for a resource. An override may only TIGHTEN the platform
 * default: a wider one is ignored and the default applies, because a reviewer who can
 * widen their own threshold can stop being shown the exceptions.
 */
export function toleranceFor(
  resource: string,
  overrides: Partial<Record<ToleranceClass, string>> = {},
): string {
  const cls = toleranceClassOf(resource)
  const platform = REVIEW_TOLERANCES[cls]
  const override = overrides[cls]
  if (override === undefined) return platform
  return dec(override).lessThan(platform) ? dec(override).toFixed() : platform
}

export interface CurrentReading {
  readonly value: Decimal.Value
  readonly qualityTier: 'measured' | 'estimated' | 'proxy'
  readonly apportioned: boolean
  /** Superseded values behind this one in this period (§6.6). */
  readonly correctionCount: number
  readonly hasEvidence: boolean
  /** Whether this resource normally carries a document — a bill, a delivery note. */
  readonly evidenceExpected: boolean
}

export interface OccupancyTriple {
  readonly current: Decimal.Value | null
  readonly previousMonth: Decimal.Value | null
  readonly sameMonthLastYear: Decimal.Value | null
}

export interface ReviewLineInput {
  readonly sourceId: string
  readonly resource: string
  readonly label: string
  readonly unit: string
  /** The registry kind the figures round at when shown (App. C.2). */
  readonly kind: QuantityKind
  /** Null where the supply was in service and nothing was read — the Missing flag. */
  readonly current: CurrentReading | null
  readonly previousMonth: Decimal.Value | null
  readonly sameMonthLastYear: Decimal.Value | null
  readonly occupancy: OccupancyTriple
}

export interface Measured {
  readonly value: string
  readonly unit: string
}

export interface LineComparison {
  readonly kind: QuantityKind
  readonly current: Measured | null
  /** Null on a first reading — not zero. */
  readonly previousMonth: Measured | null
  readonly sameMonthLastYear: Measured | null
  /** Percent change against each comparator, at the registry's percentage precision. */
  readonly changeVsPreviousMonth: string | null
  readonly changeVsSameMonthLastYear: string | null
  readonly occupancy: {
    readonly current: string | null
    readonly previousMonth: string | null
    readonly sameMonthLastYear: string | null
  }
  /** "±7%", and which resource class it is for. */
  readonly toleranceApplied: string
}

export interface ReviewedLine {
  readonly sourceId: string
  readonly resource: string
  readonly label: string
  readonly flags: readonly FlagKind[]
  readonly comparison: LineComparison
  /** The manager's half: what the pattern is, in one or two sentences. */
  readonly sentence: string
  /** The audit half: every figure and the tolerance, for the trail. */
  readonly audit: string
}

function pct(current: Decimal, reference: Decimal | null): Decimal | null {
  if (reference === null) return null
  return percentage(current.minus(reference), reference)
}

function shown(value: Decimal | null): string | null {
  return value === null ? null : roundForDisplay(value, 'percentage').toFixed()
}

function within(change: Decimal | null, tolerance: string): boolean | null {
  if (change === null) return null
  return change.abs().lessThanOrEqualTo(tolerance)
}

/** "up 19.5%", "down 3.1%", "unchanged". */
function describe(change: Decimal): string {
  const magnitude = roundForDisplay(change.abs(), 'percentage')
  if (magnitude.isZero()) return 'unchanged'
  return `${change.isNegative() ? 'down' : 'up'} ${magnitude.toFixed()}%`
}

/** "on 6% fewer occupied room nights", or nothing where occupancy is unknown. */
function occupancyClause(current: Decimal | null, reference: Decimal | null): string {
  if (current === null || reference === null) return ''
  const change = pct(current, reference)
  if (change === null) return ''
  const magnitude = roundForDisplay(change.abs(), 'percentage')
  if (magnitude.isZero()) return ', on the same occupied room nights'
  return `, on ${magnitude.toFixed()}% ${change.isNegative() ? 'fewer' : 'more'} occupied room nights`
}

const decOrNull = (v: Decimal.Value | null): Decimal | null => (v === null ? null : dec(v))

/**
 * Review one line against its two comparators and its own qualifiers.
 */
export function reviewLine(
  input: ReviewLineInput,
  overrides: Partial<Record<ToleranceClass, string>> = {},
): ReviewedLine {
  const tolerance = toleranceFor(input.resource, overrides)
  const occupancyTolerance = toleranceFor('occupancy', overrides)
  const toleranceApplied = `±${tolerance}% · ${input.label.toLowerCase()}`

  const prev = decOrNull(input.previousMonth)
  const lastYear = decOrNull(input.sameMonthLastYear)
  const ornNow = decOrNull(input.occupancy.current)
  const ornPrev = decOrNull(input.occupancy.previousMonth)
  const ornLastYear = decOrNull(input.occupancy.sameMonthLastYear)

  const measured = (v: Decimal | null): Measured | null =>
    v === null ? null : { value: v.toFixed(), unit: input.unit }

  const occupancy = {
    current: ornNow?.toFixed() ?? null,
    previousMonth: ornPrev?.toFixed() ?? null,
    sameMonthLastYear: ornLastYear?.toFixed() ?? null,
  }

  // Missing: in service, nothing read. The only flag a line with no value can carry.
  if (input.current === null) {
    return {
      sourceId: input.sourceId,
      resource: input.resource,
      label: input.label,
      flags: ['missing'],
      comparison: {
        kind: input.kind,
        current: null,
        previousMonth: measured(prev),
        sameMonthLastYear: measured(lastYear),
        changeVsPreviousMonth: null,
        changeVsSameMonthLastYear: null,
        occupancy,
        toleranceApplied,
      },
      sentence: `No reading for ${input.label.toLowerCase()} this month. The supply was in service and a figure is owed.`,
      audit: `${input.resource}: no current reading; previous month ${prev?.toFixed() ?? 'none'}; same month last year ${lastYear?.toFixed() ?? 'none'}`,
    }
  }

  const current = dec(input.current.value)
  const changePrev = pct(current, prev)
  const changeLastYear = pct(current, lastYear)
  const withinPrev = within(changePrev, tolerance)
  const withinLastYear = within(changeLastYear, tolerance)

  const flags: FlagKind[] = []
  const sentences: string[] = []

  if (prev === null && lastYear === null) {
    // A new supply with no history to compare. Not a fault; it needs a human eye once.
    flags.push('first_reading')
    sentences.push('First reading for this supply. There is nothing yet to compare it with.')
  } else if (withinPrev !== null && withinLastYear !== null) {
    if (!withinPrev && !withinLastYear) {
      flags.push('outside_expectation')
      sentences.push(
        `${cap(describe(changePrev!))} on last month and ${describe(changeLastYear!)} on the same month last year${occupancyClause(ornNow, ornLastYear)}.`,
      )
    } else if (withinLastYear && !withinPrev) {
      flags.push('drift')
      sentences.push(
        `${cap(describe(changePrev!))} on last month${occupancyClause(ornNow, ornPrev)}. In line with the same month last year (${describe(changeLastYear!)}).`,
      )
    } else if (withinPrev && !withinLastYear) {
      flags.push('seasonal_break')
      sentences.push(
        `${cap(describe(changeLastYear!))} on the same month last year${occupancyClause(ornNow, ornLastYear)}. Within tolerance against last month (${describe(changePrev!)}).`,
      )
    }
  } else {
    // One comparator only. Never presented as if it were two (SPEC-03E, No history).
    const [only, change, ornRef, name] =
      prev !== null
        ? ([withinPrev, changePrev, ornPrev, 'last month'] as const)
        : ([withinLastYear, changeLastYear, ornLastYear, 'the same month last year'] as const)
    if (only === false) {
      flags.push('outside_expectation')
      sentences.push(
        `${cap(describe(change!))} on ${name}${occupancyClause(ornNow, ornRef)}. Compared on ${name} alone: there is no ${name === 'last month' ? 'same month last year' : 'previous month'} to set it against.`,
      )
    }
  }

  // Against occupancy: consumption moved one way while occupied room nights moved the
  // other, each beyond its tolerance. Against either comparator.
  const opposed = (change: Decimal | null, ornRef: Decimal | null): boolean => {
    if (change === null || ornNow === null || ornRef === null) return false
    const ornChange = pct(ornNow, ornRef)
    if (ornChange === null) return false
    return (
      change.abs().greaterThan(tolerance) &&
      ornChange.abs().greaterThan(occupancyTolerance) &&
      change.isNegative() !== ornChange.isNegative()
    )
  }
  if (opposed(changePrev, ornPrev) || opposed(changeLastYear, ornLastYear)) {
    flags.push('against_occupancy')
    sentences.push('Consumption and occupied room nights moved in opposite directions.')
  }

  if (input.current.qualityTier !== 'measured') {
    flags.push('estimated')
    sentences.push(
      input.current.qualityTier === 'proxy'
        ? 'A proxy figure, stood in for by another.'
        : 'An estimated figure, not a read.',
    )
  }
  if (input.current.apportioned) {
    flags.push('apportioned')
    sentences.push('Apportioned from a bill that spans the month boundary.')
  }
  if (input.current.evidenceExpected && !input.current.hasEvidence) {
    flags.push('no_evidence')
    sentences.push('No document is attached; an approver has only the number to go on.')
  }
  if (input.current.correctionCount > 0) {
    flags.push('corrected')
    sentences.push(
      input.current.correctionCount === 1
        ? 'Corrected once since it was first entered; the earlier value is retained.'
        : `Corrected ${input.current.correctionCount} times since it was first entered; the earlier values are retained.`,
    )
  }

  const sentence =
    sentences.length > 0
      ? sentences.join(' ')
      : `Within tolerance against ${
          prev !== null && lastYear !== null
            ? 'both last month and the same month last year'
            : prev !== null
              ? 'last month'
              : 'the same month last year'
        }.`

  return {
    sourceId: input.sourceId,
    resource: input.resource,
    label: input.label,
    flags,
    comparison: {
      kind: input.kind,
      current: measured(current),
      previousMonth: measured(prev),
      sameMonthLastYear: measured(lastYear),
      changeVsPreviousMonth: shown(changePrev),
      changeVsSameMonthLastYear: shown(changeLastYear),
      occupancy,
      toleranceApplied,
    },
    sentence,
    audit: `${input.resource}: current ${current.toFixed()} ${input.unit}; previous month ${prev?.toFixed() ?? 'none'} (${shown(changePrev) ?? 'n/a'}%); same month last year ${lastYear?.toFixed() ?? 'none'} (${shown(changeLastYear) ?? 'n/a'}%); ORN ${occupancy.current ?? 'none'}/${occupancy.previousMonth ?? 'none'}/${occupancy.sameMonthLastYear ?? 'none'}; tolerance ±${tolerance}%; tier ${input.current.qualityTier}; flags ${flags.join(',') || 'none'}`,
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export interface ReviewedMonth {
  readonly counts: {
    readonly submitted: number
    readonly flagged: number
    readonly consistent: number
  }
  /** Lines carrying at least one unresolved flag. */
  readonly flagged: readonly ReviewedLine[]
  /** Lines carrying none, or whose every flag has been accepted. */
  readonly consistent: readonly ReviewedLine[]
  /** True where no line has a same-month-last-year comparator: say so once, at the top. */
  readonly noHistory: boolean
}

/**
 * Review a month. `accepted` names the flags a person has already seen and accepted, as
 * `${sourceId}:${flag}`; a line whose every flag is accepted moves to the consistent set.
 */
export function reviewMonth(
  lines: readonly ReviewLineInput[],
  accepted: ReadonlySet<string> = new Set(),
  overrides: Partial<Record<ToleranceClass, string>> = {},
): ReviewedMonth {
  const reviewed = lines.map((l) => reviewLine(l, overrides))
  const unresolved = (line: ReviewedLine) =>
    line.flags.filter((f) => !accepted.has(`${line.sourceId}:${f}`))
  const flagged = reviewed.filter((l) => unresolved(l).length > 0)
  const consistent = reviewed.filter((l) => unresolved(l).length === 0)
  return {
    counts: {
      submitted: reviewed.filter((l) => l.comparison.current !== null).length,
      flagged: flagged.length,
      consistent: consistent.length,
    },
    flagged,
    consistent,
    noHistory: lines.length > 0 && lines.every((l) => l.sameMonthLastYear === null),
  }
}

export function flagKey(sourceId: string, flag: FlagKind): string {
  return `${sourceId}:${flag}`
}
