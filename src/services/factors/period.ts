/**
 * What a factor version's dates mean, given its status.
 *
 * THE DEFECT. The Factor sets screen printed the period the same way for every version:
 *
 *     In force from {effective_from}{effective_to ? ` to ${to}` : ' — still'}
 *
 * Withdrawal is a status change and does not close `effective_to`, correctly — the window
 * is a fact about when the value was published to apply, and rewriting it would destroy
 * the record. So a withdrawn version keeps an open end, and the screen rendered:
 *
 *     0.4041 kgCO2e/kWh   version 2026.1   Withdrawn   In force from 1 Jan 2026 — still
 *
 * Two of those are on the deployed platform right now, and they are the versions that were
 * withdrawn for citing a publication the numbers never came from. The one screen whose job
 * is to record what was in force when was telling a reader that a retracted factor is
 * current — while the engine, which excludes withdrawn from resolution entirely, would
 * refuse to compute anything with it. Status and sentence disagreed and the sentence was
 * the louder one.
 *
 * WHY THE STATUS CHIP WAS NOT ENOUGH. It read "Withdrawn" three words away. A chip and a
 * sentence that contradict each other do not average out in a reader's head — the sentence
 * wins, because it is the one in prose. Two facts in one place have to be reconciled where
 * they are written, not left to the reader.
 *
 * "— still" was also not a sentence. It was doing the work of "and still in force" in two
 * characters, and read as a truncation.
 */
import { formatDate } from '@/i18n'
import type { Locale } from '@/i18n'

export interface FactorPeriod {
  readonly status: string
  readonly effectiveFrom: string
  readonly effectiveTo: string | null
}

export function factorPeriodSentence(period: FactorPeriod, locale: Locale): string {
  const from = formatDate(period.effectiveFrom, locale)
  const to = period.effectiveTo === null ? null : formatDate(period.effectiveTo, locale)

  switch (period.status) {
    case 'withdrawn':
      // Never the words "in force". A withdrawn version is excluded from resolution by the
      // engine (APPLICABLE in engine/factors/resolve.ts), so nothing computes with it — and
      // the dates still matter, because figures issued before the withdrawal cite it and
      // have to be restated rather than silently reproduced.
      return to === null
        ? `Withdrawn. It was published to apply from ${from} and is no longer used for any figure.`
        : `Withdrawn. It was published to apply from ${from} to ${to} and is no longer used for any figure.`

    case 'superseded':
      // Past tense, and it still governs its own months: superseded is applicable, which is
      // the whole of O-01. "Was in force" says both — it is not current, and it was real.
      return to === null
        ? `Was in force from ${from}, and still governs the months it covered.`
        : `Was in force from ${from} to ${to}, and still governs those months.`

    case 'draft':
      // Nobody approved it, so it has never been in force and may never be.
      return to === null
        ? `Not approved. It would apply from ${from} if it were published.`
        : `Not approved. It would apply from ${from} to ${to} if it were published.`

    case 'active':
    default:
      return to === null
        ? `In force from ${from}, and still in force.`
        : `In force from ${from} to ${to}.`
  }
}
