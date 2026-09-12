/**
 * The three tiers — SPEC-04B §3.4, §3.6; SPEC-03F "the tier is stated on every view".
 *
 * Every property sits in exactly one tier at any moment, decided here and carried to the
 * screens with the result. No view infers the tier for itself.
 *
 *   A · Genuine Performance: the window is confirmed and the model passes §3.3.
 *   B · Normalised trend: at least three approved months with drivers. A ratio adjustment
 *       by the published shares — no verdict, no range, never the words "Genuine
 *       Performance".
 *   C · Actual only.
 *
 * The confirmation gate comes first (§3.6): until Farnek has confirmed the training window
 * no verdict publishes, and the client is told "baseline not yet set" without naming an
 * operator screen they cannot reach (C6 rule 1).
 */
import { DEFAULT_SENSITIVITY_SHARES, TIER_B_BASE_LOAD_FRACTION, normaliseSeries } from '@/engine/gp'
import type { NormalisedSeries } from '@/engine/gp'
import { evaluateModel } from './model'
import type { ModelInput, ModelOutcome } from './model'

export type ModelledResource = 'energy' | 'water' | 'waste'

export interface WindowState {
  /** Null where no window has been set at all. */
  readonly from: string | null
  readonly to: string | null
  readonly confirmed: boolean
  /** Months a person excluded, and the month re-baselining starts from, if any. */
  readonly excludedMonths: readonly string[]
  readonly stepChangeFrom: string | null
}

export const BASELINE_NOT_SET =
  'baseline not yet set — Genuine Performance publishes once the training window for this property has been confirmed'

export type TierOutcome =
  | { readonly tier: 'A'; readonly model: ModelOutcome & { readonly eligible: true } }
  | {
      readonly tier: 'B'
      /** Why not A, in words. */
      readonly reason: string
      readonly series: NormalisedSeries
    }
  | { readonly tier: 'C'; readonly reason: string }

/**
 * Apply the confirmed window and its annotations to the history the model sees. Months a
 * person excluded do not train; months before a step change do not train the current
 * model; months outside the set window do not train. The reporting month is untouched.
 */
export function applyWindow(input: ModelInput, window: WindowState): ModelInput {
  const excluded = new Set(window.excludedMonths)
  const history = input.history.map((m) => {
    if (m.month === input.reportingMonth) return m
    const outside =
      (window.from !== null && m.month < window.from.slice(0, 7)) ||
      (window.to !== null && m.month >= window.to.slice(0, 7)) ||
      (window.stepChangeFrom !== null && m.month < window.stepChangeFrom.slice(0, 7))
    if (outside || excluded.has(m.month)) {
      // Marked as not approved for the model's purposes: the training assembler then
      // excludes it with a named reason rather than this module inventing a new one.
      return { ...m, approved: false }
    }
    return m
  })
  return { ...input, history }
}

export function evaluateTier(
  input: ModelInput,
  resource: ModelledResource,
  window: WindowState,
): TierOutcome {
  const approved = input.history.filter((m) => m.approved && m.month !== input.reportingMonth)

  const fallback = (reason: string): TierOutcome => {
    const series = normaliseSeries(
      approved.map((m) => ({
        month: m.month,
        value: m.value,
        occupiedRoomNights: m.occupiedRoomNights,
        degreeDays: m.coolingDegreeDays,
      })),
      DEFAULT_SENSITIVITY_SHARES[resource],
      TIER_B_BASE_LOAD_FRACTION[resource],
    )
    return series === null ? { tier: 'C', reason } : { tier: 'B', reason, series }
  }

  if (!window.confirmed) return fallback(BASELINE_NOT_SET)

  const outcome = evaluateModel(applyWindow(input, window))
  if (!outcome.eligible) return fallback(outcome.reason)
  return { tier: 'A', model: outcome }
}
