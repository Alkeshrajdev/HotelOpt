/**
 * The Hotel Overview view model — §5.1.
 *
 * The page renders this and computes nothing. That is the standing rule — `engine/`
 * computes, everything else calls it (§1.2) — and it is what makes the page testable
 * without a browser: every §5 rule is asserted against this object.
 *
 * The block order is the §5.1 order, expressed as an array rather than as the order
 * someone happened to write the JSX in, so a reordering is a change to a tested value.
 */
import type { Locale } from '@/i18n'
import type { AttentionBlock } from './attention'
import type { CarbonCard } from './carbon'
import type { CarbonPosition } from './carbonPosition'
import type { CardState } from './cards'
import type { WasteTreatment } from './waste'
import type { TrendSeries, TrendTab } from './trend'

export const BLOCK_ORDER = [
  'header',
  'performance_cards',
  'main_trend',
  'compact_comparison',
  'carbon_position',
  'attention_required',
] as const

export type BlockName = (typeof BLOCK_ORDER)[number]

export interface PeriodChoice {
  readonly id: string
  readonly label: string
}

export interface OverviewHeader {
  readonly hotelName: string
  readonly periodLabel: string
  readonly addOrReviewDataHref: string
}

/**
 * A block that is specified but whose data is not yet available.
 *
 * §31 allows a declared placeholder that states its state, and forbids one that displays
 * a number. This type has no field a number could occupy.
 */
export interface DeclaredPlaceholder {
  readonly available: false
  readonly state: string
  readonly reason: string
}

/**
 * The trend block, as the page now draws it.
 *
 * This replaced a shape that described a tabbed chart fetching its points from a
 * seriesHref: four fields naming an arrangement, and no points. It rendered as three
 * inert tab buttons. The series is here instead, because a block that carries its own
 * data is a block the model's tests can assert, and the previous shape could be entirely
 * correct while the chart was empty.
 */
/**
 * The trend block: one tab per resource, and the series for whichever is selected.
 *
 * The tabs are always all three, and the SERIES may still be a placeholder — a hotel can
 * have a year of energy and two months of waste, and the reader has to be able to get
 * back to energy from the empty waste chart. Tabs that disappeared with their data would
 * strand them there.
 *
 * Only the selected series is built. Three would be three queries for two charts nobody
 * is looking at.
 */
export interface MainTrend {
  readonly available: true
  readonly tabs: readonly TrendTab[]
  readonly series: TrendSeries | DeclaredPlaceholder
}

export interface ComparisonRowView {
  readonly kpi: string
  readonly yourHotel: string
  readonly hotelA: string
  readonly hotelB: string
  readonly difference: string
}

export interface CompactComparison {
  readonly available: true
  readonly rows: readonly ComparisonRowView[]
  /** One material comparability note (§5.4). */
  readonly comparabilityNote: string
}

export interface OverviewModel {
  readonly locale: Locale
  readonly blockOrder: typeof BLOCK_ORDER
  readonly header: OverviewHeader
  /** Every period this hotel holds, for the period control. Newest first. */
  readonly periods: readonly PeriodChoice[]
  readonly selectedPeriodId: string | null
  /**
   * The period this one is compared against, in words, or null where there is none. Null
   * and the cards' "No prior-year period" are the SAME fact, said in two places because a
   * reader looking at a control and a reader looking at a card each need it.
   */
  readonly comparisonLabel: string | null
  /** Energy, Water, Waste — carbon is its own type because it carries no verdict. */
  readonly cards: readonly CardState[]
  readonly carbonCard: CarbonCard | DeclaredPlaceholder
  /**
   * Both diversion figures, or a placeholder. Not a block in BLOCK_ORDER: §5.2 names the
   * blocks and this is not one of them — it belongs beside the waste card, inside
   * Performance, which is where a reader looking at a waste total expects to find where
   * that waste went.
   */
  readonly wasteTreatment: WasteTreatment | DeclaredPlaceholder
  readonly mainTrend: MainTrend | DeclaredPlaceholder
  readonly comparison: CompactComparison | DeclaredPlaceholder
  readonly carbonPosition: CarbonPosition | DeclaredPlaceholder
  readonly attention: AttentionBlock
}

export class OverviewModelError extends Error {}

export interface OverviewModelInput {
  readonly locale: Locale
  readonly header: OverviewHeader
  /** Every period this hotel holds, for the period control. Newest first. */
  readonly periods: readonly PeriodChoice[]
  readonly selectedPeriodId: string | null
  /**
   * The period this one is compared against, in words, or null where there is none. Null
   * and the cards' "No prior-year period" are the SAME fact, said in two places because a
   * reader looking at a control and a reader looking at a card each need it.
   */
  readonly comparisonLabel: string | null
  readonly cards: readonly CardState[]
  readonly carbonCard: CarbonCard | DeclaredPlaceholder
  readonly wasteTreatment: WasteTreatment | DeclaredPlaceholder
  readonly mainTrend: MainTrend | DeclaredPlaceholder
  readonly comparison: CompactComparison | DeclaredPlaceholder
  readonly carbonPosition: CarbonPosition | DeclaredPlaceholder
  readonly attention: AttentionBlock
}

export function buildOverviewModel(input: OverviewModelInput): OverviewModel {
  // §5.2 names four cards, and the carbon one is carried separately because its type
  // differs. Three here, always: a missing resource is a card in a state, not an absence.
  const resources = input.cards.map((c) => c.resource)
  for (const required of ['energy', 'water', 'waste'] as const) {
    if (!resources.includes(required)) {
      throw new OverviewModelError(
        `the ${required} card is missing; a resource with no data is a card in the data_unavailable state, not an absent card (§5.2)`,
      )
    }
  }
  if (resources.includes('carbon')) {
    throw new OverviewModelError(
      'the carbon card is carried separately because it has no verdict; it is not one of the three verdict-carrying cards (§5.2)',
    )
  }

  return {
    locale: input.locale,
    blockOrder: BLOCK_ORDER,
    header: input.header,
    periods: input.periods,
    selectedPeriodId: input.selectedPeriodId,
    comparisonLabel: input.comparisonLabel,
    cards: input.cards,
    carbonCard: input.carbonCard,
    wasteTreatment: input.wasteTreatment,
    mainTrend: input.mainTrend,
    comparison: input.comparison,
    carbonPosition: input.carbonPosition,
    attention: input.attention,
  }
}

/** The state a block shows before its workstream has data (§31 sequencing notes). */
export function declaredPlaceholder(state: string, reason: string): DeclaredPlaceholder {
  return { available: false, state, reason }
}
