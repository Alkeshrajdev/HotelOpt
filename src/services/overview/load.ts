/**
 * Assembling the Overview view model from stored records — §5.
 *
 * Data access is a port, as it is for the API, so the assembly can be tested without a
 * database and so the page cannot reach past it into a client.
 *
 * What this deliberately does NOT do is invent a state. Where a resource has no approved
 * record for the period the card is `data_unavailable` naming the missing input, and where
 * the period has no occupied room nights the intensity is suppressed with its reason. Both
 * are §5.2 states, not empty screens — an absent card and a card reading zero are the two
 * wrong answers here.
 */
import type { FactorVersion } from '@/engine/factors'
import { intensityPer } from '@/engine/kpi'
// Aliased: this module already has a local `intensity` for the single card it is
// building, and two things called intensity in one function is how the wrong one gets
// called.
import { intensity as monthlyIntensity, yearOnYear } from '@/engine/period'
import type { MonthValue } from '@/engine/period'
import type { QuantityKind } from '@/engine/rounding'
import { forDisplay } from '@/engine/units'
import type { CanonicalUnit } from '@/engine/units'
import { formatQuantity, formatReportingMonth, t } from '@/i18n'
import type { Locale, StringKey } from '@/i18n'
import { buildAttentionBlock } from './attention'
import { TREND_RESOURCES, aYearBefore, buildTrend, twelveMonthsEnding } from './trend'
import type { TrendResource } from './trend'
import { evaluateModel } from '@/services/performance'
import { BASELINE_NOT_SET, applyWindow } from '@/services/performance/tiers'
import type { WindowState } from '@/services/performance/tiers'
import type { ModelOutcome, MonthRecord } from '@/services/performance'
import { buildCarbon } from './carbonFigures'
import type { ActivityFactorResolution } from './activityFactor'
import { refrigerantLosses } from './refrigerants'
import type { Gwp, RefrigerantEventRow, RefrigerantLosses } from './refrigerants'
import type { GridFactorResolution } from './gridFactor'
import type { EnergyLine } from './carbonFigures'
import { buildWasteTreatment } from './waste'
import type { WasteLineInput } from './waste'
import type { AttentionItem } from './attention'
import { resolveCardState } from './cards'
import type { CardState, DenominatorState } from './cards'
import { buildOverviewModel, declaredPlaceholder } from './model'
import type { MainTrend, OverviewModel } from './model'

export interface HotelSummary {
  readonly id: string
  readonly name: string
  /** Whose property it is. Carried because a factor lookup is asked on a tenant's behalf. */
  readonly tenantId: string
  /** The scope an emission factor is matched on. Exact — App. F has no near miss. */
  readonly country: string
  /**
   * The grid this property draws from, as the factor database names it. Null where the
   * country has one grid, or where nobody has recorded it — which are different states and
   * the grid resolver tells them apart.
   */
  readonly gridCode: string | null
}

export interface PeriodSummary {
  readonly id: string
  /** 'YYYY-MM' of the period start. */
  readonly month: string
  readonly status: string
}

export interface ResourceTotal {
  readonly resource: 'energy' | 'water' | 'waste'
  readonly total: string
  /** The canonical unit the records are stored in. The display unit is decided below. */
  readonly unit: string
  /**
   * Set when the month's records for this resource are in more than one unit and no total
   * exists. Names the units, because the fix is a decision somebody has to make.
   *
   * This is not hypothetical. Energy covers grid electricity in kilowatt-hours and diesel
   * in litres, and the first version of this summed them: a total that adds 141,900 to
   * 1,200 and calls the answer kilowatt-hours. Converting a fuel volume into energy needs
   * its calorific value, which is a published factor and a choice, not something a total
   * may assume on the way past.
   */
  readonly mixedUnits?: readonly string[]
  readonly estimatedInputs?: readonly {
    label: string
    tier: 'estimated' | 'proxy'
    method: string
  }[]
}

export interface OverviewPorts {
  readonly hotel: (hotelId: string) => Promise<HotelSummary | null>
  /**
   * Every reporting period this hotel holds, newest first. The whole list rather than the
   * latest one, because the period control offers what EXISTS: a picker built from a
   * calendar would offer months the hotel has no data for, and the page behind it would
   * then have to explain an emptiness the control promised was full.
   */
  readonly periods: (hotelId: string) => Promise<readonly PeriodSummary[]>
  readonly occupiedRoomNights: (periodId: string) => Promise<string | null>
  /** Appendix C.2 puts waste intensity on guest nights, so both denominators are read. */
  readonly guestNights: (periodId: string) => Promise<string | null>
  readonly wasteLines: (periodId: string) => Promise<readonly WasteLineInput[]>
  readonly resourceTotals: (periodId: string) => Promise<readonly ResourceTotal[]>
  readonly attentionItems: (hotelId: string) => Promise<readonly AttentionItem[]>
  /**
   * Approved totals for one resource across named months. Approved only — §24.8 counts
   * nothing else toward a trend, and a draft month drawn on a chart is a figure somebody
   * is still typing, shown as though it were settled.
   */
  readonly monthlyTotals: (
    hotelId: string,
    resource: 'energy' | 'water' | 'waste',
    months: readonly string[],
  ) => Promise<ReadonlyMap<string, string>>
  /** Approved energy by metered resource for one period — the carbon card's activity. */
  readonly energyByResource: (periodId: string) => Promise<readonly EnergyLine[]>
  /** Every active factor version. Small, governed, and the same for every tenant. */
  readonly factorCatalogue: () => Promise<readonly FactorVersion[]>
  /**
   * The grid factor in force for this property on this date, with everything the reader
   * has to be told about it. Null where the publisher is not loaded at all.
   */
  readonly gridFactor: (
    country: string,
    gridCode: string | null,
    onDate: string,
  ) => Promise<GridFactorResolution | null>
  /**
   * The factor for a burned fuel, from the published library, through the binding that
   * says which series this resource resolves to. Null where nothing is bound — which is
   * not a failure: the governed set store answers for district cooling, and a resource
   * with neither is refused by name.
   */
  readonly activityFactor: (
    tenantId: string,
    code: string,
    unit: string,
    onDate: string,
  ) => Promise<ActivityFactorResolution | null>
  /** Refrigerant service events for one month, with the asset facts the method needs. */
  readonly refrigerantEvents: (
    hotelId: string,
    month: string,
  ) => Promise<readonly RefrigerantEventRow[]>
  /** A gas's global warming potential, as the published library answers it. */
  readonly refrigerantGwp: (gas: string, onDate: string) => Promise<Gwp | null>
  /**
   * Every month this hotel holds for a resource, with its quality tier, its approval
   * state and its denominator — the training window's raw material (§B.4).
   *
   * All of it, not the approved subset: which months were excluded and WHY is what the
   * card says when a model is not eligible, and a query that pre-filtered them would
   * leave "insufficient history" as the only thing anyone could be told.
   */
  readonly modelHistory: (
    hotelId: string,
    resource: 'energy' | 'water',
  ) => Promise<readonly MonthRecord[]>
  /**
   * The training window Farnek set and confirmed for this resource, with its annotations
   * (SPEC-04B §3.6, C6). Until it is confirmed no verdict publishes, and the card says
   * "baseline not yet set" without naming an operator screen the client cannot reach.
   */
  readonly trainingWindow: (hotelId: string, resource: 'energy' | 'water') => Promise<WindowState>
  /**
   * The month's purchased goods and services, as three numbers.
   *
   * Three numbers rather than one, because a Scope 3 total with lines missing from it is
   * the defect this whole port exists to close: the card has to be able to say "and four
   * purchase lines could not be computed" rather than quietly reporting the subset that
   * could. `kg` is null when the month holds no purchases at all, which is a different
   * statement from zero.
   *
   * The hotel id is passed as well as the period because visibility is decided per hotel
   * per data category, and a reader who does not hold procurement must not be told there
   * are no purchases — see PurchaseTotals.visible.
   */
  readonly purchaseTotals: (periodId: string, hotelId: string) => Promise<PurchaseTotals>
}

/** What a month's invoice register adds up to, and how much of it is missing. */
export interface PurchaseTotals {
  /**
   * Whether this reader holds procurement at this hotel at all.
   *
   * The lines RPC returns NOTHING to a reader without the category — correctly, on §2.5's
   * rule that absence and refusal look alike. Read as "no purchases exist" that becomes a
   * false statement on the card: a manager granted energy and water would be told the
   * month has no Scope 3 while an invoice register sat behind a grant they do not hold.
   * Not-visible says nothing about whether records exist, which is the whole point.
   */
  readonly visible: boolean
  readonly kg: string | null
  readonly lines: number
  readonly uncomputed: number
}

/** A period option for the context control. */
export interface PeriodChoice {
  readonly id: string
  readonly label: string
}

export class HotelNotFound extends Error {}

const RESOURCES = ['energy', 'water', 'waste'] as const

/**
 * Resources that are deliberately not modelled, and why.
 *
 * Said out loud rather than left to the stock "the model is not eligible for this period",
 * which reads as a temporary shortage of data. This one will not improve by waiting.
 */
const NO_MODEL_OFFERED: Partial<Record<(typeof RESOURCES)[number], string>> = {
  waste:
    'waste is not modelled — Appendix B’s drivers are degree days and occupancy, and neither predicts what a hotel throws away in a way this platform has evidence for',
}

const MISSING_LABEL: Record<(typeof RESOURCES)[number], string> = {
  energy: 'No approved energy record for this period',
  water: 'No approved water record for this period',
  waste: 'No approved waste record for this period',
}

const KPI_LABEL: Record<(typeof RESOURCES)[number], string> = {
  energy: 'Energy intensity',
  water: 'Water intensity',
  waste: 'Waste intensity',
}

/**
 * How each resource is presented — Appendix C.2.
 *
 * The display unit of an intensity is not always the unit the quantity is stored in.
 * Water is held in cubic metres and Appendix C.2 sets its intensity precision in litres
 * per occupied room night, so the numerator is converted for that figure and only that
 * figure. The total stays in m3.
 *
 * Every precision here comes from the registry rather than a toFixed() at the call site.
 * The Overview previously divided two JavaScript numbers and called toFixed(2) on the
 * result: two rules broken in one expression — a figure computed outside engine/, and a
 * precision set locally instead of by App. C.2.
 */
const PRESENTATION: Record<
  (typeof RESOURCES)[number],
  {
    totalKind: QuantityKind
    intensityKind: QuantityKind
    /** The unit the intensity numerator is expressed in, where it differs from storage. */
    intensityUnit: string
    /**
     * Which denominator. Not the same for every resource: Appendix C.2 puts waste
     * intensity on GUEST NIGHTS and energy and water on occupied room nights, and the
     * registry is the authority. Dividing waste by room nights while formatting it at the
     * guest-night precision would be a figure whose name and value disagree.
     */
    denominator: 'occupied_room_night' | 'guest_night'
    denominatorLabel: 'ORN' | 'GN'
    /**
     * The catalogue key for "no denominator this period". It sits in this record, beside
     * the denominator it describes, so the two cannot be changed apart — the waste card
     * once read "no occupied room nights" because the sentence lived somewhere else.
     */
    absentDenominatorKey: StringKey
  }
> = {
  energy: {
    totalKind: 'energy.kwh',
    intensityKind: 'intensity.energy.orn',
    intensityUnit: 'kWh',
    denominator: 'occupied_room_night',
    denominatorLabel: 'ORN',
    absentDenominatorKey: 'state.intensityNotApplicable.occupiedRoomNight',
  },
  water: {
    totalKind: 'water.m3',
    intensityKind: 'intensity.water.orn',
    intensityUnit: 'L',
    denominator: 'occupied_room_night',
    denominatorLabel: 'ORN',
    absentDenominatorKey: 'state.intensityNotApplicable.occupiedRoomNight',
  },
  waste: {
    totalKind: 'waste.kg',
    intensityKind: 'intensity.waste.guestNight',
    intensityUnit: 'kg',
    denominator: 'guest_night',
    denominatorLabel: 'GN',
    absentDenominatorKey: 'state.intensityNotApplicable.guestNight',
  },
}

/**
 * The absent-denominator state for a resource, with the sentence that names ITS
 * denominator. Called even on the data_unavailable paths, where the sentence never
 * reaches a screen: a type that can only be built correctly is worth more than the two
 * lines saved by an optional field that is usually wrong.
 */
function absentDenominator(resource: (typeof RESOURCES)[number], locale: Locale): DenominatorState {
  return { present: false, reason: t(PRESENTATION[resource].absentDenominatorKey, locale) }
}

/**
 * The period a year earlier, if this hotel holds one AND it is approved.
 *
 * Approved and nothing less. §24.8 counts only approved months toward a comparison, and a
 * draft prior year would let this year improve against a figure somebody is still typing.
 */
function priorYearOf(periods: readonly PeriodSummary[], month: string): PeriodSummary | undefined {
  const year = Number(month.slice(0, 4))
  if (!Number.isFinite(year)) return undefined
  const wanted = `${year - 1}${month.slice(4)}`
  return periods.find((p) => p.month === wanted && p.status === 'approved')
}

/** One month, as the completeness engine wants it. */
function oneMonth(month: string, status: string, value: string | null): MonthValue {
  return {
    month,
    status: status === 'approved' ? 'approved' : (status as MonthValue['status']),
    value,
  }
}

/**
 * Resolve a published factor for every metered resource in a month that has one bound.
 *
 * Grid electricity is not asked for: it is answered by the grid database, which is a
 * different question with different rules. Everything else is asked once, and a resource
 * with no binding simply gets no answer here and falls through to the governed set store,
 * which is where district cooling's demonstration placeholder lives.
 */
async function activityFactorsFor(
  ports: OverviewPorts,
  tenantId: string,
  lines: readonly EnergyLine[],
  month: string,
): Promise<ReadonlyMap<string, ActivityFactorResolution>> {
  const out = new Map<string, ActivityFactorResolution>()
  const wanted = lines.filter((l) => l.resource !== 'grid_electricity')
  const resolved = await Promise.all(
    wanted.map((l) => ports.activityFactor(tenantId, l.resource, l.unit, `${month}-01`)),
  )
  wanted.forEach((l, i) => {
    const r = resolved[i]
    if (r) out.set(l.resource, r)
  })
  return out
}

/**
 * Refrigerant losses for one month, computed through the engine.
 *
 * The global warming potentials are fetched once per distinct gas rather than once per
 * event: a plant room servicing the same chiller four times in a month asks the library
 * one question, not four.
 */
async function refrigerantLossesFor(
  ports: OverviewPorts,
  hotelId: string,
  month: string,
): Promise<RefrigerantLosses> {
  const rows = await ports.refrigerantEvents(hotelId, month)
  if (rows.length === 0) return { totalKgCO2e: null, lines: [], notes: [] }
  const gases = [...new Set(rows.map((r) => r.gas))]
  const resolved = await Promise.all(gases.map((g) => ports.refrigerantGwp(g, `${month}-01`)))
  const byGas = new Map<string, Gwp>()
  gases.forEach((g, i) => {
    const r = resolved[i]
    if (r) byGas.set(g, r)
  })
  return refrigerantLosses(rows, (gas) => byGas.get(gas))
}

export async function loadOverviewModel(
  hotelId: string,
  locale: Locale,
  ports: OverviewPorts,
  selectedPeriodId?: string,
  selectedTrend: TrendResource = 'energy',
): Promise<OverviewModel> {
  const hotel = await ports.hotel(hotelId)
  if (!hotel) throw new HotelNotFound(hotelId)

  const periods = await ports.periods(hotelId)
  // A period id that is not this hotel's falls back to the latest rather than 404ing: the
  // id arrives from a query string, and a stale link is not an access failure.
  // The latest APPROVED month by default, not simply the latest.
  //
  // The Overview is a performance page and an open month has no performance yet: on the
  // first of the month it would show "no approved energy record for this period" across
  // every card, which is true and is not what the page is for. The period control still
  // offers the open month, so somebody who wants to see what has been entered so far can;
  // they are just not dropped there.
  const period =
    (selectedPeriodId === undefined ? undefined : periods.find((p) => p.id === selectedPeriodId)) ??
    periods.find((p) => p.status === 'approved') ??
    periods[0] ??
    null
  const dataHref = `/hotel/${hotelId}/data`

  const periodChoices: PeriodChoice[] = periods.map((p) => ({
    id: p.id,
    label: `${formatReportingMonth(p.month, locale)} — ${p.status}`,
  }))

  if (!period) {
    return buildOverviewModel({
      locale,
      header: {
        hotelName: hotel.name,
        periodLabel: 'No reporting period open',
        addOrReviewDataHref: dataHref,
      },
      periods: periodChoices,
      selectedPeriodId: null,
      comparisonLabel: null,
      cards: RESOURCES.map((resource) =>
        resolveCardState({
          resource,
          missingInputs: ['No reporting period has been opened for this hotel'],
          entryHref: dataHref,
          denominator: absentDenominator(resource, locale),
          priorYearPresent: false,
          modelEligible: false,
        }),
      ),
      carbonCard: declaredPlaceholder(
        'Not yet available',
        'No approved inventory exists for this hotel.',
      ),
      wasteTreatment: declaredPlaceholder(
        'Not yet available',
        'No waste has been recorded for this hotel.',
      ),
      mainTrend: declaredPlaceholder('Not yet available', 'No approved months to plot.'),
      comparison: declaredPlaceholder(
        'Not yet available',
        'No comparator has been assigned to this hotel.',
      ),
      carbonPosition: declaredPlaceholder(
        'Not yet available',
        'No approved inventory exists for this period.',
      ),
      attention: buildAttentionBlock(
        await ports.attentionItems(hotelId),
        `/hotel/${hotelId}/tasks`,
      ),
    })
  }

  const orn = await ports.occupiedRoomNights(period.id)
  const guestNights = await ports.guestNights(period.id)
  const wasteLines = await ports.wasteLines(period.id)
  const totals = await ports.resourceTotals(period.id)
  const byResource = new Map(totals.map((t) => [t.resource, t]))

  // The prior year, where one exists and is approved. Everything about the comparison is
  // decided by the engine: this reads two months and hands them over. §24.8's rule —
  // suppressed unless both periods are complete or built from the identical set of months
  // — is the engine's to apply, and a single month against the same single month a year
  // earlier satisfies it exactly when both are approved.
  const prior = priorYearOf(periods, period.month)
  const priorTotals = prior ? await ports.resourceTotals(prior.id) : []
  const priorByResource = new Map(priorTotals.map((t) => [t.resource, t]))
  const priorOrn = prior ? await ports.occupiedRoomNights(prior.id) : null
  const priorGuestNights = prior ? await ports.guestNights(prior.id) : null

  const comparisonLabel = prior ? formatReportingMonth(prior.month, locale) : null

  // Carbon. The catalogue is read whole because it is governed content, identical for
  // every tenant and small; filtering it in SQL would put App. F's exact-match rule in
  // two places, and the resolver is where it is tested.
  const [catalogue, currentEnergy, baseEnergy] = await Promise.all([
    ports.factorCatalogue(),
    ports.energyByResource(period.id),
    prior ? ports.energyByResource(prior.id) : Promise.resolve([]),
  ])
  // Resolved for the first of each month, which is the date a factor belongs to — never
  // the date the page is rendered (App. F).
  const [gridCurrent, gridBase] = await Promise.all([
    ports.gridFactor(hotel.country, hotel.gridCode, `${period.month}-01`),
    prior
      ? ports.gridFactor(hotel.country, hotel.gridCode, `${prior.month}-01`)
      : Promise.resolve(null),
  ])

  // Fuels, from the published library. Asked per resource and per month, because a factor
  // belongs to the period it is computing, and only for the resources the property
  // actually meters — a hotel with no generator asks nothing about diesel.
  const activityCurrent = await activityFactorsFor(
    ports,
    hotel.tenantId,
    currentEnergy,
    period.month,
  )
  const activityBase = prior
    ? await activityFactorsFor(ports, hotel.tenantId, baseEnergy, prior.month)
    : new Map()

  const [refrigerantCurrent, refrigerantBase] = await Promise.all([
    refrigerantLossesFor(ports, hotelId, period.month),
    prior
      ? refrigerantLossesFor(ports, hotelId, prior.month)
      : Promise.resolve<RefrigerantLosses>({ totalKgCO2e: null, lines: [], notes: [] }),
  ])

  // Purchased goods for the same month. Read here rather than on the purchases screen's
  // own terms because the carbon card's job is to say what its headline does NOT cover,
  // and it cannot say that without knowing whether there is anything to leave out.
  const purchases = await ports.purchaseTotals(period.id, hotelId)

  const carbonCard = buildCarbon({
    locale,
    catalogue,
    gridCurrent,
    gridBase,
    activityCurrent,
    activityBase,
    refrigerantCurrent,
    refrigerantBase,
    scope: hotel.country,
    month: period.month,
    current: currentEnergy,
    baseMonth: prior?.month ?? null,
    base: baseEnergy,
    occupiedRoomNights: orn,
    hotelHref: `/hotel/${hotelId}`,
    purchasesVisible: purchases.visible,
    purchasedGoodsKg: purchases.kg,
    purchaseLinesTotal: purchases.lines,
    purchaseLinesUncomputed: purchases.uncomputed,
  })

  // Only the selected resource's series is fetched. The tabs are links, so switching is a
  // navigation, and the other two are never queried for a chart nobody is looking at.
  const shown = TREND_RESOURCES.find((r) => r.resource === selectedTrend) ?? TREND_RESOURCES[0]!
  const trendMonths = twelveMonthsEnding(period.month)
  const trendTotals = await ports.monthlyTotals(hotelId, shown.resource, [
    ...trendMonths,
    ...trendMonths.map(aYearBefore),
  ])
  const trendSeries = buildTrend({
    resourceLabel: shown.label,
    unit: shown.unit,
    endMonth: period.month,
    totals: trendTotals,
    monthLabel: (m) => formatReportingMonth(m, locale),
  })

  // The tabs stand whether or not the selected resource has a series to draw. A hotel can
  // hold a year of energy and two months of waste, and a reader who lands on the empty
  // waste chart has to be able to get back; tabs that vanished with their data would
  // strand them there.
  const trendBase = `/hotel/${hotelId}/overview?period=${period.id}`
  const trend: MainTrend = {
    available: true,
    tabs: TREND_RESOURCES.map((r) => ({
      resource: r.resource,
      label: r.label,
      href: `${trendBase}&trend=${r.resource}`,
      current: r.resource === shown.resource,
    })),
    series:
      trendSeries ??
      declaredPlaceholder(
        'Not yet available',
        `A trend needs more than one approved month, and fewer than two of the twelve months to this period carry an approved ${shown.label.toLowerCase()} figure.`,
      ),
  }

  // §7.3 for the metered resources. Waste has no model: App. B's drivers are degree days
  // and occupancy, and neither predicts what a hotel throws away in any way this platform
  // has evidence for — so it is not offered one rather than given a poor one.
  const modelled = ['energy', 'water'] as const
  const modelEntries = await Promise.all(
    modelled.map(async (resource) => {
      const [history, window] = await Promise.all([
        ports.modelHistory(hotelId, resource),
        ports.trainingWindow(hotelId, resource),
      ])
      const input = { history, reportingMonth: period.month, resourceLabel: resource }
      return [
        resource,
        window.confirmed
          ? evaluateModel(applyWindow(input, window))
          : ({ eligible: false, reason: BASELINE_NOT_SET } as const),
      ] as const
    }),
  )
  const modelByResource = new Map<string, ModelOutcome>(modelEntries)

  const cards: CardState[] = RESOURCES.map((resource) => {
    const found = byResource.get(resource)
    if (!found) {
      return resolveCardState({
        resource,
        missingInputs: [MISSING_LABEL[resource]],
        entryHref: dataHref,
        denominator: absentDenominator(resource, locale),
        priorYearPresent: false,
        modelEligible: false,
      })
    }

    // A month whose records for this resource are in more than one unit has no total.
    // Adding litres of diesel to kilowatt-hours of electricity produces a number, and
    // labelling it kWh makes it a reported figure; converting the fuel needs its calorific
    // value, which is a published factor and a choice somebody has to make.
    if (found.mixedUnits && found.mixedUnits.length > 1) {
      return resolveCardState({
        resource,
        missingInputs: [
          `this month's ${resource} records are in ${found.mixedUnits.join(' and ')}, and a total across units needs a conversion nobody has chosen`,
        ],
        entryHref: dataHref,
        denominator: absentDenominator(resource, locale),
        priorYearPresent: false,
        modelEligible: false,
      })
    }

    const shape = PRESENTATION[resource]
    const denominator = shape.denominator === 'guest_night' ? guestNights : orn
    const denominatorPresent = denominator !== null && Number(denominator) > 0

    // Year on year, through the engine. Two single-month series and the month they are
    // both expected to carry; the engine decides whether that is comparable and refuses
    // where it is not, rather than this module dividing two numbers and hoping.
    const priorFound = priorByResource.get(resource)
    const priorDenominator = shape.denominator === 'guest_night' ? priorGuestNights : priorOrn
    const change =
      prior && priorFound && priorDenominator !== null && Number(priorDenominator) > 0
        ? yearOnYear(
            monthlyIntensity(
              [oneMonth(period.month, period.status, found.total)],
              [oneMonth(period.month, period.status, denominator)],
              [period.month],
            ),
            monthlyIntensity(
              [oneMonth(prior.month, prior.status, priorFound.total)],
              [oneMonth(prior.month, prior.status, priorDenominator)],
              [prior.month],
            ),
          )
        : null

    // The intensity is the engine's, not this module's. Standing rule 1: engine/ computes
    // and everything else calls it, and a division written here is a second implementation
    // of a KPI the engine already owns.
    const intensity = denominatorPresent
      ? intensityPer(
          forDisplay(found.total, found.unit as CanonicalUnit, shape.intensityUnit),
          denominator,
          shape.denominator,
          shape.intensityUnit,
        )
      : null

    const model = modelByResource.get(resource)

    return resolveCardState({
      resource,
      total: {
        // formatQuantity, not present(): both round through the engine at App. C.2's
        // precision, but only one groups the digits. 141900 is a figure somebody reads off
        // a screen and types into an email; 141,900 is the same number, legibly.
        value: formatQuantity(found.total, shape.totalKind, locale),
        unit: found.unit,
        label: `Total ${resource}`,
      },
      denominator: denominatorPresent ? { present: true } : absentDenominator(resource, locale),
      ...(intensity && intensity.value !== null
        ? {
            kpi: {
              value: formatQuantity(intensity.value, shape.intensityKind, locale),
              unit: `${shape.intensityUnit}/${shape.denominatorLabel}`,
              label: KPI_LABEL[resource],
            },
          }
        : {}),
      priorYearPresent: change?.available === true,
      ...(change?.available === true
        ? {
            change: {
              // Signed and rounded through the engine's registry, like every other figure
              // on this page. The sign is kept: -7.3 and 7.3 are opposite facts.
              percent: formatQuantity(change.changePercent, 'percentage', locale),
              label: `versus ${formatReportingMonth(prior?.month ?? period.month, locale)}`,
            },
          }
        : {}),
      // §7.3's model, where this hotel has the history for one. A comparison needs no
      // model, so the card can carry a change and still have no verdict — which is a
      // different thing from having nothing to compare.
      modelEligible: model?.eligible === true,
      ...(model?.eligible === true
        ? {
            verdict: model.verdict,
            // Lower is better for all three of these: less energy, less water and less
            // waste for the same activity. §5.2 forbids a verdict on a metric with no
            // direction, so the direction travels with it rather than being assumed by
            // whatever renders it.
            direction: 'lower_is_better' as const,
            basis: model.basis,
          }
        : {}),
      ...(model?.eligible === false
        ? { ineligibilityReason: model.reason }
        : model === undefined
          ? { ineligibilityReason: NO_MODEL_OFFERED[resource] ?? '' }
          : change?.available === false
            ? { ineligibilityReason: change.reason }
            : {}),
      ...(found.estimatedInputs ? { estimatedInputs: found.estimatedInputs } : {}),
    })
  })

  return buildOverviewModel({
    locale,
    header: {
      hotelName: hotel.name,
      periodLabel: `${formatReportingMonth(period.month, locale)} — ${period.status}`,
      addOrReviewDataHref: dataHref,
    },
    periods: periodChoices,
    selectedPeriodId: period.id,
    comparisonLabel,
    cards,
    carbonCard,
    wasteTreatment:
      buildWasteTreatment(wasteLines) ??
      declaredPlaceholder(
        'Not yet available',
        'No waste has been recorded for this period, so neither diversion figure can be produced.',
      ),
    mainTrend: trend,
    comparison: declaredPlaceholder(
      'Not yet available',
      'No comparator has been assigned to this hotel.',
    ),
    carbonPosition: declaredPlaceholder(
      'Not yet available',
      'No approved inventory exists for this period.',
    ),
    attention: buildAttentionBlock(await ports.attentionItems(hotelId), `/hotel/${hotelId}/tasks`),
  })
}
