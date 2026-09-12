/**
 * Factor set resolution — Appendix F, §24.6.
 *
 * Every governed numeric input the platform applies to client data is a factor set with
 * an identical lifecycle. That lifecycle is what makes results reproducible and
 * restatements controlled.
 *
 * Two rules dominate this module:
 *
 *   Effective dating — the version in force for a period is determined by effective
 *   dates, not by the date of calculation. A figure produced today for January 2024
 *   uses the factor that was in force in January 2024.
 *
 *   Absence — where no approved factor exists the calculation reports
 *   "Not calculated — no approved factor", with the input disclosed. No default,
 *   nearest-match or assumed value is ever substituted silently.
 */

export type FactorSetType =
  | 'emission'
  | 'gwp'
  | 'plant_efficiency'
  | 'unit_conversion'
  | 'residual_mix'
  | 'price_index'
  | 'fx_rate'
  | 'sector_mapping'
  | 'assumption_set'
  | 'supplier_pcf'

export type FactorStatus = 'draft' | 'active' | 'superseded' | 'withdrawn'

export interface FactorVersion {
  readonly id: string
  readonly type: FactorSetType
  readonly code: string
  /** Geography, market or scope this version applies to. */
  readonly scope: string
  readonly version: string
  readonly source: string
  readonly value: string
  readonly unit: string
  readonly status: FactorStatus
  /** Inclusive. */
  readonly effectiveFrom: string
  /** Exclusive. Null means open-ended. */
  readonly effectiveTo: string | null
  readonly nextReviewDate?: string | undefined
}

/**
 * A resolved factor, or an explicit refusal. There is no third state and no fallback
 * value: a caller cannot accidentally treat an absence as a zero.
 */
export type FactorResolution =
  | {
      readonly resolved: true
      readonly factor: FactorVersion
      /** Every output depending on a factor states its value, source and version (App. F). */
      readonly citation: string
    }
  | {
      readonly resolved: false
      readonly outcome: 'Not calculated — no approved factor'
      readonly disclosedInput: string
      readonly detail: string
    }

export interface FactorQuery {
  readonly type: FactorSetType
  readonly code: string
  readonly scope: string
  /** The period the figure belongs to — never the date the calculation runs. */
  readonly periodDate: string
  /** Described for disclosure when no factor exists. */
  readonly inputDescription: string
}

/**
 * Statuses whose value may be applied to the period they govern.
 *
 * SUPERSEDED IS INCLUDED, and this is the whole reproducibility rule (App. F, O-01). A
 * version is superseded when a LATER one takes over — it does not stop being the version
 * that was in force for its own months. Excluding it made every historical figure
 * unreproducible: the moment a 2026 factor was published, 2025's emissions became "not
 * calculated — no approved factor", and last year's published report could no longer be
 * regenerated. Found the first time three versions of one factor existed at once.
 *
 * DRAFT is excluded because nobody approved it, and WITHDRAWN because somebody
 * deliberately retracted it — a figure resting on a withdrawn version has to be restated,
 * not silently reproduced.
 */
const APPLICABLE: readonly FactorStatus[] = ['active', 'superseded']

function inForce(f: FactorVersion, on: string): boolean {
  if (!APPLICABLE.includes(f.status)) return false
  if (f.effectiveFrom > on) return false
  return f.effectiveTo === null || f.effectiveTo > on
}

/**
 * Resolve the factor in force for a period.
 *
 * Matching is exact on type, code and scope. There is deliberately no nearest-match:
 * a factor for a neighbouring geography is not this geography's factor, and silently
 * substituting one is the failure Appendix F forbids.
 */
export function resolveFactor(
  catalogue: readonly FactorVersion[],
  q: FactorQuery,
): FactorResolution {
  const candidates = catalogue.filter(
    (f) => f.type === q.type && f.code === q.code && f.scope === q.scope,
  )

  const inForceNow = candidates.filter((f) => inForce(f, q.periodDate))

  if (inForceNow.length === 0) {
    // Say why, so the disclosure is useful: no such factor at all, versus one that
    // exists but is not in force for this period, versus one not yet approved.
    const existsButNotInForce = candidates.some((f) => APPLICABLE.includes(f.status))
    const existsButNotActive = candidates.length > 0 && !existsButNotInForce
    const detail =
      candidates.length === 0
        ? `no factor set exists for ${q.type}/${q.code} in scope "${q.scope}"`
        : existsButNotActive
          ? `a factor exists for ${q.code} but no version is approved`
          : `a factor exists for ${q.code} but no version is in force on ${q.periodDate}`
    return {
      resolved: false,
      outcome: 'Not calculated — no approved factor',
      disclosedInput: q.inputDescription,
      detail,
    }
  }

  if (inForceNow.length > 1) {
    // Overlapping effective dates make the result non-reproducible, so this is an
    // error rather than a "most recent wins" guess.
    throw new Error(
      `factor ${q.type}/${q.code} scope "${q.scope}" has ${inForceNow.length} versions in force on ${q.periodDate}: ${inForceNow
        .map((f) => f.version)
        .join(', ')}`,
    )
  }

  const factor = inForceNow[0] as FactorVersion
  return {
    resolved: true,
    factor,
    citation: `${factor.value} ${factor.unit} (${factor.source}, ${factor.code} ${factor.version}, ${factor.scope})`,
  }
}

/**
 * The version references a CalculationResult stores so that a historical output can be
 * reproduced exactly (App. F, O-01).
 */
export interface FactorProvenance {
  readonly factorSetVersions: Readonly<Record<string, string>>
  readonly methodVersion: string
  readonly engineVersionHash: string
}

export function provenanceOf(
  resolutions: readonly FactorResolution[],
  methodVersion: string,
  engineVersionHash: string,
): FactorProvenance {
  const versions: Record<string, string> = {}
  for (const r of resolutions) {
    if (r.resolved)
      versions[`${r.factor.type}/${r.factor.code}/${r.factor.scope}`] = r.factor.version
  }
  return { factorSetVersions: versions, methodVersion, engineVersionHash }
}

/**
 * A new factor version never restates an approved historical report. Restatement
 * requires a controlled recalculation, which is an explicit audited action producing a
 * new report version with the prior retained (App. F, §24.6).
 */
export type RecalculationTrigger =
  | 'draft_data_change'
  | 'approved_period_change'
  | 'factor_update'
  | 'methodology_change'
  | 'model_refit'
  | 'engine_change'

export type RecalculationBehaviour =
  | { readonly automatic: true; readonly detail: string }
  | { readonly automatic: false; readonly requires: string }

export function recalculationBehaviour(trigger: RecalculationTrigger): RecalculationBehaviour {
  switch (trigger) {
    case 'draft_data_change':
      return { automatic: true, detail: 'draft data recalculates immediately' }
    case 'approved_period_change':
      return {
        automatic: false,
        requires: 'reopening with a reason, correction, reapproval and report versioning',
      }
    case 'factor_update':
    case 'methodology_change':
      return {
        automatic: false,
        requires:
          'a controlled recalculation: an explicit, audited action producing a new report version with the prior retained',
      }
    case 'model_refit':
      return {
        automatic: false,
        requires:
          'historical verdicts retain the model that produced them; re-fits apply prospectively unless a controlled recalculation is initiated',
      }
    case 'engine_change':
      return {
        automatic: false,
        requires:
          'a version hash is stored on every result, so a code change altering a number is detectable in the audit trail',
      }
  }
}
