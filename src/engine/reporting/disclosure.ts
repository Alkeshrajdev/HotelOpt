/**
 * What a finalised report must say — §18, §24.8.
 *
 * §18 lists seven things a finalised report shows: reporting period, boundary,
 * consolidation approach, methodology version, all factor set versions applied, model
 * version where applicable, and data status. A report missing any of them is not a report
 * with a gap; it is a document whose figures cannot be reproduced, which is the one thing
 * §18 exists to prevent.
 *
 * So this module does not produce a disclosure with holes in it. `prepareFinalisation`
 * returns either a complete block or a refusal naming exactly what is absent, and there is
 * no path from the second to a rendered report.
 *
 * Two things this module deliberately does not have:
 *
 *   • A report-quality score. §18 says non-measured inputs are labelled beside the affected
 *     results and no report-quality score is produced. A grade for the document invites the
 *     reader to skip the labels, which are the actual disclosure.
 *   • Any way to present an incomplete period as a comparable one. Completeness is
 *     computed from the month counts, the partial label names the missing months, and the
 *     wording §24.8 requires is part of the label rather than left to the surface.
 */
import type { ConsolidationApproach } from './approaches'
import type { QualityTier } from '../quality'

export interface FactorSetVersion {
  readonly set: string
  readonly version: string
}

export interface CompletenessInput {
  readonly monthsExpected: number
  readonly monthsIncluded: number
  /** 'YYYY-MM' for each month absent, Draft, Submitted or Returned (§24.8). */
  readonly monthsMissing: readonly string[]
}

export interface NonMeasuredFigure {
  readonly label: string
  readonly tier: Exclude<QualityTier, 'measured'>
  /** The documented method, which §6.6 requires on every non-measured value. */
  readonly method: string
}

export interface AssuranceCoverage {
  readonly engagementReference: string
  readonly standard: string
  readonly level: 'limited' | 'reasonable'
  readonly statementScope: string
}

export interface DisclosureInput {
  readonly periodStart: string
  readonly periodEnd: string
  readonly boundaryNote?: string
  readonly consolidationApproach?: ConsolidationApproach
  readonly methodologyVersion?: string
  readonly factorSetVersions?: readonly FactorSetVersion[]
  readonly modelVersion?: string
  readonly dataStatus?: string
  readonly completeness: CompletenessInput
  readonly assurance?: AssuranceCoverage
  readonly nonMeasuredFigures?: readonly NonMeasuredFigure[]
}

export interface CompletenessStatement {
  readonly complete: boolean
  /** Exactly what §24.8 asks a partial figure to say. */
  readonly label: string
  readonly monthsIncluded: number
  readonly monthsExpected: number
  readonly monthsMissing: readonly string[]
  /** False for a partial period: it is never presented as a comparable annual figure. */
  readonly comparableAsFullPeriod: boolean
}

export interface DisclosureBlock {
  readonly reportingPeriod: string
  readonly boundaryNote: string
  readonly consolidationApproach: ConsolidationApproach
  readonly methodologyVersion: string
  readonly factorSetVersions: readonly FactorSetVersion[]
  readonly modelVersion: string | null
  readonly dataStatus: string
  readonly completeness: CompletenessStatement
  readonly assurance: AssuranceCoverage | null
  readonly nonMeasuredFigures: readonly NonMeasuredFigure[]
}

export type FinalisationOutcome =
  | { readonly finalisable: true; readonly disclosure: DisclosureBlock }
  | { readonly finalisable: false; readonly missing: readonly string[] }

export function completenessStatement(c: CompletenessInput): CompletenessStatement {
  const complete = c.monthsIncluded >= c.monthsExpected
  return {
    complete,
    monthsIncluded: c.monthsIncluded,
    monthsExpected: c.monthsExpected,
    monthsMissing: c.monthsMissing,
    comparableAsFullPeriod: complete,
    label: complete
      ? `Complete — all ${c.monthsExpected} months approved`
      : `Partial — ${c.monthsIncluded} of ${c.monthsExpected} approved months; missing ${
          c.monthsMissing.length > 0 ? c.monthsMissing.join(', ') : 'not named'
        }. Not a comparable ${c.monthsExpected === 12 ? 'annual' : 'period'} figure and not extrapolated.`,
  }
}

export function prepareFinalisation(input: DisclosureInput): FinalisationOutcome {
  const missing: string[] = []

  if (!input.boundaryNote?.trim()) missing.push('boundary')
  if (!input.consolidationApproach) missing.push('consolidation approach')
  if (!input.methodologyVersion?.trim()) missing.push('methodology version')
  if (!input.factorSetVersions || input.factorSetVersions.length === 0) {
    // Either the report applied no factor version, which is worth stating explicitly, or
    // it lost track of which it applied, which is worse than not publishing.
    missing.push('factor set versions')
  }
  if (!input.dataStatus?.trim()) missing.push('data status')
  if (
    input.completeness.monthsIncluded < input.completeness.monthsExpected &&
    input.completeness.monthsMissing.length === 0
  ) {
    // "Partial" without the months is not the disclosure §24.8 asks for.
    missing.push('the months missing from this partial period')
  }

  for (const f of input.nonMeasuredFigures ?? []) {
    if (!f.method.trim()) missing.push(`the estimation method for "${f.label}"`)
  }

  if (missing.length > 0) return { finalisable: false, missing }

  return {
    finalisable: true,
    disclosure: {
      reportingPeriod: `${input.periodStart} to ${input.periodEnd}`,
      boundaryNote: input.boundaryNote!.trim(),
      consolidationApproach: input.consolidationApproach!,
      methodologyVersion: input.methodologyVersion!.trim(),
      factorSetVersions: [...input.factorSetVersions!].sort((a, b) =>
        `${a.set}${a.version}` < `${b.set}${b.version}` ? -1 : 1,
      ),
      modelVersion: input.modelVersion?.trim() ?? null,
      dataStatus: input.dataStatus!.trim(),
      completeness: completenessStatement(input.completeness),
      assurance: input.assurance ?? null,
      nonMeasuredFigures: input.nonMeasuredFigures ?? [],
    },
  }
}

/** The disclosure block as a report renders it. Never a score (§18). */
export function renderDisclosure(d: DisclosureBlock): readonly string[] {
  const lines = [
    `Reporting period: ${d.reportingPeriod}`,
    `Boundary: ${d.boundaryNote}`,
    `Consolidation approach: ${d.consolidationApproach}`,
    `Methodology version: ${d.methodologyVersion}`,
    `Factor set versions: ${d.factorSetVersions.map((f) => `${f.set} ${f.version}`).join(', ')}`,
  ]
  if (d.modelVersion !== null) lines.push(`Model version: ${d.modelVersion}`)
  lines.push(`Data status: ${d.dataStatus}`, `Period completeness: ${d.completeness.label}`)
  if (d.assurance) {
    lines.push(
      `Assurance: ${d.assurance.level} assurance under ${d.assurance.standard}, engagement ${d.assurance.engagementReference} — ${d.assurance.statementScope}`,
    )
  }
  for (const f of d.nonMeasuredFigures) {
    lines.push(`${f.label}: ${f.tier} — ${f.method}`)
  }
  return lines
}

/** Percentage of a report's stated figures that are not Measured, for the data status. */
export function nonMeasuredCount(d: DisclosureBlock): number {
  return d.nonMeasuredFigures.length
}
