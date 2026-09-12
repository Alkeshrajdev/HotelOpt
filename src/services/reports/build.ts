/**
 * Building a report from the approved dataset — SPEC-03I · I1, I2; Guide §18.
 *
 * Twelve presentations of one dataset (R-03). Each builder reads through the same
 * services the screens read through, so a figure here is the figure on the screen; both
 * round through the same engine. Nothing is assembled by hand and no narrative is
 * generated (W-006): the sections carry figures, the disclosures §18 requires, and the
 * manager's own note for the month.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { intensityPer } from '@/engine/kpi'
import { prepareFinalisation, renderDisclosure } from '@/engine/reporting'
import type { DisclosureInput, FactorSetVersion, NonMeasuredFigure } from '@/engine/reporting'
import type { ConsolidationApproach } from '@/engine/reporting'
import { Decimal, dec } from '@/engine/rounding'
import type { Locale } from '@/i18n'
import { formatQuantity } from '@/i18n'
import { STATUS_LABEL, loadScope3 } from '@/services/scope3'
import { supabaseScope3Ports } from '@/services/scope3/ports.supabase'

/**
 * A billed amount, rounded and grouped the way the registry says.
 *
 * A total is a reported figure the moment it is on a page, and a report is the most
 * reported page there is. `currency.aggregated` rather than `currency.transaction`: these
 * are sums over a month's invoices, not one line off one bill.
 */
function money(value: string, locale: Locale): string {
  return formatQuantity(value, 'currency.aggregated', locale)
}
import { loadAssuranceModel } from '@/services/assurance/ports.supabase'
import { progressSentence } from '@/services/certification'
import { loadCertificationModel } from '@/services/certification/ports.supabase'
import { loadCompensationModel } from '@/services/compensation/ports.supabase'
import { loadCostModel } from '@/services/cost/ports.supabase'
import { loadMeasuresModel } from '@/services/measures/ports.supabase'
import { loadOverviewModel } from '@/services/overview'
import { supabaseOverviewPorts } from '@/services/overview/ports.supabase'
import { loadComparison } from '@/services/pillar/comparison'
import { loadGenuine, loadPillarOverview } from '@/services/pillar/ports.supabase'
import { buildMetrics } from '@/services/portfolio'
import { loadHotelMonths, loadPortfolioHotels } from '@/services/portfolio/ports.supabase'
import { loadPortfolioTargets } from '@/services/targets/ports.supabase'
import type { ReportKind } from './model'
import { monthsEndingAt, periodEndOf, reportKindInfo } from './model'
import type { ReportDocument, ReportSection } from './render'

export interface BuiltReport {
  readonly document: ReportDocument
  readonly periodStart: string
  readonly periodEnd: string
  readonly boundaryNote: string
  readonly consolidation: ConsolidationApproach
  readonly methodologyVersion: string
  readonly factorSetVersions: readonly FactorSetVersion[]
  readonly modelVersion: string | null
  readonly dataStatus: string
  readonly monthsExpected: number
  readonly monthsIncluded: number
  readonly monthsMissing: readonly string[]
  readonly estimatedFigures: number
  readonly draft: boolean
  readonly subject: 'hotel' | 'portfolio'
  readonly portfolioId: string | null
}

export type BuildOutcome =
  | { readonly ok: true; readonly report: BuiltReport }
  | { readonly ok: false; readonly refusal: string; readonly missing: readonly string[] }

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

const APPROACH: Record<string, ConsolidationApproach> = {
  operational_control: 'operational_control',
  financial_control: 'financial_control',
  equity_share: 'equity_share',
}

interface Context {
  readonly supabase: SupabaseClient
  readonly locale: Locale
  readonly hotelId: string
  readonly hotelName: string
  readonly clientName: string
  readonly tenantId: string
  readonly portfolioId: string | null
  readonly consolidation: ConsolidationApproach
  readonly boundaryNote: string
  readonly baseYear: string
  readonly methodologyVersion: string
  readonly month: string
  readonly periodId: string | null
  readonly periodStatus: string | null
  readonly ports: ReturnType<typeof supabaseOverviewPorts>
}

export async function buildReport(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  kind: ReportKind,
  month: string,
): Promise<BuildOutcome> {
  const info = reportKindInfo(kind)
  if (!info)
    return { ok: false, refusal: 'That report kind is not one the platform produces.', missing: [] }
  const [hotel, method] = await Promise.all([
    supabase
      .schema('core')
      .from('hotels')
      .select('id,name,tenant_id,portfolio_id,control_type,consolidation_share,country,grid_code')
      .eq('id', hotelId)
      .maybeSingle(),
    // Through a function in an exposed schema: the API does not answer in `calc`, and
    // reading nothing quietly put the words "none published" where §18 wants a version.
    supabase.schema('reports').rpc('methodology_in_force', { p_on: `${month}-01` }),
  ])
  if (hotel.error || !hotel.data)
    return { ok: false, refusal: 'That property is not on record.', missing: [] }
  const tenant = await supabase
    .schema('core')
    .from('tenants')
    .select('name,consolidation_approach,base_year')
    .eq('id', hotel.data.tenant_id)
    .maybeSingle()
  const methodRow = ((method.data ?? []) as Record<string, unknown>[])[0] ?? null
  const ports = supabaseOverviewPorts(supabase, locale)
  const periods = await ports.periods(hotelId)
  const period = periods.find((p) => p.month === month) ?? null
  const consolidation =
    APPROACH[String(tenant.data?.consolidation_approach ?? 'operational_control')] ??
    'operational_control'
  const ctx: Context = {
    supabase,
    locale,
    hotelId,
    hotelName: String(hotel.data.name),
    clientName: String(tenant.data?.name ?? ''),
    tenantId: String(hotel.data.tenant_id),
    portfolioId: text(hotel.data.portfolio_id),
    consolidation,
    boundaryNote: `${String(hotel.data.name)}, ${String(hotel.data.control_type ?? 'operational')} control, consolidated at ${String(hotel.data.consolidation_share ?? '100')}% under ${consolidation.replaceAll('_', ' ')}`,
    baseYear: tenant.data?.base_year ? String(tenant.data.base_year) : 'not set',
    // Empty, not a sentence saying there is none: prepareFinalisation refuses a report
    // that cannot name its method version, and a placeholder would satisfy the check.
    methodologyVersion: methodRow ? `${String(methodRow.name)} (${String(methodRow.code)})` : '',
    month,
    periodId: period?.id ?? null,
    periodStatus: period?.status ?? null,
    ports,
  }

  switch (kind) {
    case 'monthly_hotel_performance':
      return monthly(ctx)
    case 'annual_sustainability':
      return annual(ctx)
    case 'carbon_inventory':
      return carbonInventory(ctx)
    case 'hotel_comparison':
      return comparison(ctx)
    case 'portfolio_performance':
      return portfolio(ctx)
    case 'cost_budget_variance':
      return cost(ctx)
    case 'mv_report':
      return mv(ctx)
    case 'compensation_retirement':
      return compensation(ctx)
    case 'certification_readiness':
      return certification(ctx)
    case 'assurance_pack':
      return assurancePack(ctx)
    case 'event_carbon':
      return {
        ok: false,
        refusal:
          'No event has a computed footprint at this property, so there is nothing to report. An event footprint is produced from the event record, its allocation and its attendee travel survey.',
        missing: ['an event footprint'],
      }
    case 'hospitality_methodology':
      return {
        ok: false,
        refusal:
          'No HCMI, HWMI or HWMM methodology version is activated for this client. The outputs are produced at the activated versions, never at a version chosen by the report.',
        missing: ['an activated hospitality methodology version'],
      }
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function gridFactorVersion(ctx: Context): Promise<FactorSetVersion | null> {
  const h = await ctx.supabase
    .schema('core')
    .from('hotels')
    .select('country,grid_code')
    .eq('id', ctx.hotelId)
    .maybeSingle()
  if (!h.data) return null
  const f = await ctx.ports.gridFactor(
    String(h.data.country),
    text(h.data.grid_code),
    `${ctx.month}-01`,
  )
  if (!f || !f.usable) return null
  return {
    set: `grid ${String(h.data.country)}${h.data.grid_code ? ` ${String(h.data.grid_code)}` : ''}`,
    version: `${f.edition ?? 'unknown edition'}${f.factorYear ? ` · ${f.factorYear}` : ''}${f.carriedForward ? ' · carried forward' : ''}`,
  }
}

async function operationalNote(ctx: Context): Promise<string | null> {
  if (!ctx.periodId) return null
  const a = await ctx.supabase
    .schema('data')
    .from('activity_records')
    .select('operational_note')
    .eq('period_id', ctx.periodId)
    .maybeSingle()
  return text(a.data?.operational_note)
}

function finish(
  ctx: Context,
  opts: {
    title: string
    subtitle: string
    sections: ReportSection[]
    factorSetVersions: FactorSetVersion[]
    modelVersion?: string | null
    nonMeasured: NonMeasuredFigure[]
    figures: number
    monthsExpected: number
    monthsIncluded: number
    monthsMissing: string[]
    periodStart: string
    periodEnd: string
    operationalNote: string | null
    subject?: 'hotel' | 'portfolio'
    draft: boolean
  },
): BuildOutcome {
  const factorSetVersions =
    opts.factorSetVersions.length > 0
      ? opts.factorSetVersions
      : [{ set: 'no emission factor applied', version: 'not applicable' }]
  const dataStatus = `${opts.nonMeasured.length} of ${opts.figures} figures estimated or proxy${opts.draft ? '; over figures not all approved (draft)' : '; all approved'}`
  const input: DisclosureInput = {
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
    boundaryNote: ctx.boundaryNote,
    consolidationApproach: ctx.consolidation,
    methodologyVersion: ctx.methodologyVersion,
    factorSetVersions,
    ...(opts.modelVersion ? { modelVersion: opts.modelVersion } : {}),
    dataStatus,
    completeness: {
      monthsExpected: opts.monthsExpected,
      monthsIncluded: opts.monthsIncluded,
      monthsMissing: opts.monthsMissing,
    },
    nonMeasuredFigures: opts.nonMeasured,
  }
  const outcome = prepareFinalisation(input)
  if (!outcome.finalisable)
    return {
      ok: false,
      refusal: `This report cannot be produced honestly: it is missing ${outcome.missing.join(', ')}.`,
      missing: outcome.missing,
    }
  const document: ReportDocument = {
    title: opts.title,
    subtitle: opts.subtitle,
    client: ctx.clientName,
    issuedNote: `Produced ${new Date().toISOString().slice(0, 10)} from the approved dataset. Every figure reproduces from its inputs, the factor version and the method version stated in the disclosures (P-01). No narrative was generated.`,
    draft: opts.draft,
    sections: opts.sections,
    disclosureLines: renderDisclosure(outcome.disclosure),
    operationalNote: opts.operationalNote,
  }
  return {
    ok: true,
    report: {
      document,
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
      boundaryNote: ctx.boundaryNote,
      consolidation: ctx.consolidation,
      methodologyVersion: ctx.methodologyVersion,
      factorSetVersions,
      modelVersion: opts.modelVersion ?? null,
      dataStatus,
      monthsExpected: opts.monthsExpected,
      monthsIncluded: opts.monthsIncluded,
      monthsMissing: opts.monthsMissing,
      estimatedFigures: opts.nonMeasured.length,
      draft: opts.draft,
      subject: opts.subject ?? 'hotel',
      portfolioId: opts.subject === 'portfolio' ? ctx.portfolioId : null,
    },
  }
}

function monthWindow(ctx: Context) {
  const approved = ctx.periodStatus === 'approved'
  return {
    periodStart: `${ctx.month}-01`,
    periodEnd: periodEndOf(ctx.month),
    monthsExpected: 1,
    monthsIncluded: approved ? 1 : 0,
    monthsMissing: approved ? [] : [ctx.month],
    draft: !approved,
  }
}

function fmt(v: string | null, kind: Parameters<typeof formatQuantity>[1], locale: Locale): string {
  return v === null ? '—' : formatQuantity(v, kind, locale)
}

// ─── the kinds ───────────────────────────────────────────────────────────────

async function monthly(ctx: Context): Promise<BuildOutcome> {
  if (!ctx.periodId)
    return {
      ok: false,
      refusal: `No reporting month ${ctx.month} exists at this property.`,
      missing: ['the month'],
    }
  const [overview, costModel, energyGp, waterGp, note, factor] = await Promise.all([
    loadOverviewModel(ctx.hotelId, ctx.locale, ctx.ports, ctx.periodId),
    loadCostModel(ctx.supabase, ctx.hotelId, ctx.periodId),
    loadGenuine(ctx.supabase, ctx.locale, ctx.hotelId, 'energy', ctx.periodId),
    loadGenuine(ctx.supabase, ctx.locale, ctx.hotelId, 'water', ctx.periodId),
    operationalNote(ctx),
    gridFactorVersion(ctx),
  ])
  const sections: ReportSection[] = []
  const nonMeasured: NonMeasuredFigure[] = []
  let figures = 0
  const rows: string[][] = []
  for (const card of overview.cards) {
    const label = card.resource[0]!.toUpperCase() + card.resource.slice(1)
    if ('kpi' in card && 'total' in card) {
      rows.push([
        label,
        `${card.total.value} ${card.total.unit}`,
        `${card.kpi.value} ${card.kpi.unit}`,
        'change' in card
          ? `${card.change.percent}% · ${card.change.label}`
          : card.state.replaceAll('_', ' '),
      ])
      figures += 2
    } else if (card.state === 'partial_energy_basis') {
      rows.push([
        label,
        `${card.comparableTotal.value} ${card.comparableTotal.unit} (electricity and fuel) + ${card.districtCoolingThermalKwh} kWh thermal, not summed`,
        '—',
        card.reason,
      ])
      figures += 1
    } else if (card.state === 'intensity_not_applicable') {
      rows.push([label, `${card.total.value} ${card.total.unit}`, 'not applicable', card.reason])
      figures += 1
    } else {
      rows.push([label, 'not available', '—', `missing: ${card.missing.join(', ')}`])
    }
    if (card.marker.present)
      for (const i of card.marker.inputs)
        nonMeasured.push({ label: `${label}: ${i.label}`, tier: i.tier, method: i.method })
  }
  sections.push({
    heading: 'Energy, water and waste',
    table: {
      caption: 'Totals and intensities for the month',
      columns: ['Pillar', 'Total', 'Intensity', 'Change against the same period last year'],
      rows,
    },
    markers: nonMeasured.map((n) => `${n.label}: ${n.tier} — ${n.method}`),
  })
  const c = overview.carbonCard
  if (c.available) {
    figures += 2
    sections.push({
      heading: 'Carbon',
      paragraphs: [
        // The card's own label for what the headline covers, not a fixed string. This read
        // "Scope 2 location-based" on every report, and stayed saying it after fuels and
        // refrigerants started resolving — so a report carrying a Scope 1 figure described
        // itself as Scope 2 only, in the sentence a reader copies into a disclosure.
        `${c.grossOperational.value} ${c.grossOperational.unit} gross, ${c.grossOperational.label}, location-based. ${c.sentence}`,
        c.coverage,
        ...c.notes,
      ],
      table: {
        caption: 'The headline by scope',
        columns: ['Scope', 'kgCO2e'],
        rows: [
          ['Scope 1, burned and leaked here', c.scope1Kg],
          ['Scope 2, energy bought already made', c.scope2Kg],
          ...(c.scope3Kg !== null
            ? // Stated beside the headline and never inside it: a total mixing scopes
              // cannot be compared with anybody's disclosure.
              ([['Scope 3 category 1, purchased goods (not in the headline)', c.scope3Kg]] as const)
            : []),
        ],
      },
    })
    sections.push({
      heading: 'Consumption and factor',
      table: {
        caption: 'Consumption and factor effects',
        columns: ['Effect', 'kgCO2e'],
        rows: [
          [
            'Consumption effect',
            formatQuantity(c.consumptionEffect, 'emissions.kgco2e', ctx.locale),
          ],
          ['Factor effect', formatQuantity(c.factorEffect, 'emissions.kgco2e', ctx.locale)],
          ['Total change', formatQuantity(c.totalChange, 'emissions.kgco2e', ctx.locale)],
        ],
      },
    })
  } else {
    sections.push({ heading: 'Carbon', refusal: `Not available: ${c.reason}` })
  }
  for (const [name, gp, kind, unit] of [
    ['Energy', energyGp, 'energy.kwh', 'kWh'],
    ['Water', waterGp, 'water.m3', 'm3'],
  ] as const) {
    sections.push({
      heading: `Genuine Performance · ${name}`,
      paragraphs: [
        gp.headline,
        ...(gp.unavailableBecause ? [gp.unavailableBecause] : []),
        ...gp.progress,
      ],
      ...(gp.verdict
        ? {
            table: {
              caption: `${name}: expected against actual`,
              columns: ['Figure', 'Value'],
              // Rounded once, here, with the unit: the engine's expected value and its
              // bounds are full precision, and a range printed to thirty decimals is not
              // a range anybody reads (§24.5).
              rows: [
                [
                  'Actual',
                  gp.actual ? `${formatQuantity(gp.actual, kind, ctx.locale)} ${unit}` : '—',
                ],
                ['Expected', `${formatQuantity(gp.verdict.expected, kind, ctx.locale)} ${unit}`],
                [
                  'Range',
                  gp.verdict.lowerBound && gp.verdict.upperBound
                    ? `${formatQuantity(gp.verdict.lowerBound, kind, ctx.locale)} to ${formatQuantity(gp.verdict.upperBound, kind, ctx.locale)} ${unit}`
                    : 'no range',
                ],
                ['Verdict', gp.verdict.verdict.replaceAll('_', ' ')],
              ],
            },
          }
        : {}),
    })
  }
  if (overview.comparison.available) {
    sections.push({
      heading: 'Comparison',
      paragraphs: [
        'Against the two assigned comparison hotels on the same period; see the Hotel Comparison report for the full table.',
      ],
    })
  } else {
    sections.push({ heading: 'Comparison', refusal: overview.comparison.reason })
  }
  if (costModel && !costModel.noCostEver) {
    const t = costModel.summary.totals
    figures += 1
    sections.push({
      heading: 'Cost variance',
      table: {
        caption: `Billed cost, ${costModel.currency}`,
        columns: ['Figure', 'Value'],
        rows: [
          // Through the registry, like every other figure. These went onto a report as
          // 353938.08 and -3625.15: raw decimals, ungrouped, in the document a hotel sends
          // its owner. The rounding rules exist so that no figure reaches a reader by
          // whatever route happened to be shortest.
          ['This period', t.actual ? money(t.actual, ctx.locale) : 'no priced utility'],
          [
            'Same period last year',
            t.prior ? money(t.prior, ctx.locale) : (t.priorWithheldBecause ?? '—'),
          ],
          [
            'Variance',
            t.variance
              ? `${money(t.variance, ctx.locale)} (${t.variancePercent ? formatQuantity(t.variancePercent, 'percentage', ctx.locale) : '—'}%)`
              : '—',
          ],
          ['Priced utilities', `${t.priced.of} of ${t.priced.total}`],
        ],
      },
    })
  } else {
    sections.push({
      heading: 'Cost variance',
      refusal: 'No billed cost is recorded for this month.',
    })
  }
  if (ctx.portfolioId) {
    const targets = await loadPortfolioTargets(ctx.supabase, ctx.portfolioId, [
      { id: ctx.hotelId, name: ctx.hotelName },
    ])
    sections.push({
      heading: 'Targets',
      table: {
        caption: 'Targets covering this property',
        columns: ['Target', 'Baseline', 'Target', 'Latest reading'],
        rows: targets.cards.map((t) => [
          `${t.metricLabel} (${t.scopeLabel})`,
          `${t.baselineValue} ${t.unit} in ${t.baselineYear}`,
          `${t.targetValue} ${t.unit} by ${t.targetYear}`,
          t.reading ? `${t.reading.value} ${t.unit} at ${t.reading.asAt}` : 'no reading retained',
        ]),
      },
    })
  }
  const w = monthWindow(ctx)
  return finish(ctx, {
    title: 'Monthly Hotel Performance',
    subtitle: `${ctx.hotelName} · ${overview.header.periodLabel}`,
    sections,
    factorSetVersions: factor ? [factor] : [],
    modelVersion: energyGp.verdict ? 'GP model as fitted for this property' : null,
    nonMeasured,
    figures,
    ...w,
    operationalNote: note,
    draft: w.draft,
  })
}

async function annual(ctx: Context): Promise<BuildOutcome> {
  const months = monthsEndingAt(ctx.month, 12)
  const periods = await ctx.ports.periods(ctx.hotelId)
  const byMonth = new Map(periods.map((p) => [p.month, p]))
  const approvedMonths = months.filter((m) => byMonth.get(m)?.status === 'approved')
  const totals = { energy: dec(0), water: dec(0), waste: dec(0) }
  let orn = dec(0)
  const nonMeasured: NonMeasuredFigure[] = []
  const monthRows: string[][] = []
  for (const m of months) {
    const p = byMonth.get(m)
    if (!p || p.status !== 'approved') {
      monthRows.push([m, 'not approved', '—', '—', '—'])
      continue
    }
    const [t, o] = await Promise.all([
      ctx.ports.resourceTotals(p.id),
      ctx.ports.occupiedRoomNights(p.id),
    ])
    const e = t.find((x) => x.resource === 'energy')?.total ?? null
    const wa = t.find((x) => x.resource === 'water')?.total ?? null
    const ws = t.find((x) => x.resource === 'waste')?.total ?? null
    if (e) totals.energy = totals.energy.plus(e)
    if (wa) totals.water = totals.water.plus(wa)
    if (ws) totals.waste = totals.waste.plus(ws)
    if (o) orn = orn.plus(o)
    for (const x of t)
      for (const est of x.estimatedInputs ?? [])
        nonMeasured.push({
          label: `${m} ${x.resource}: ${est.label}`,
          tier: est.tier,
          method: est.method,
        })
    monthRows.push([
      m,
      fmt(e, 'energy.kwh', ctx.locale),
      fmt(wa, 'water.m3', ctx.locale),
      fmt(ws, 'waste.kg', ctx.locale),
      fmt(o, 'energy.kwh', ctx.locale),
    ])
  }
  const complete = approvedMonths.length === 12
  const intensity = (total: Decimal, kind: 'occupied_room_night', unit: string) =>
    orn.isZero() ? null : intensityPer(total.toFixed(), orn.toFixed(), kind, unit).value
  const compensationModel = await loadCompensationModel(
    ctx.supabase,
    ctx.locale,
    ctx.hotelId,
    undefined,
  )
  const sections: ReportSection[] = [
    {
      heading: complete ? 'Annual totals' : 'Totals over the approved months (partial year)',
      paragraphs: complete
        ? []
        : [
            `Assembled from ${approvedMonths.length} of 12 approved months: ${approvedMonths.join(', ')}. Not a comparable annual figure and not extrapolated (§24.8).`,
          ],
      table: {
        caption: 'Totals and intensities over the approved months',
        columns: ['Pillar', 'Total', 'Per occupied room night'],
        rows: [
          [
            'Energy',
            `${fmt(totals.energy.toFixed(), 'energy.kwh', ctx.locale)} kWh`,
            intensity(totals.energy, 'occupied_room_night', 'kWh') ?? '—',
          ],
          [
            'Water',
            `${fmt(totals.water.toFixed(), 'water.m3', ctx.locale)} m3`,
            intensity(totals.water, 'occupied_room_night', 'm3') ?? '—',
          ],
          [
            'Waste',
            `${fmt(totals.waste.toFixed(), 'waste.kg', ctx.locale)} kg`,
            intensity(totals.waste, 'occupied_room_night', 'kg') ?? '—',
          ],
          ['Occupied room nights', fmt(orn.toFixed(), 'energy.kwh', ctx.locale), '—'],
        ],
      },
      markers: nonMeasured.slice(0, 40).map((n) => `${n.label}: ${n.tier} — ${n.method}`),
    },
    {
      heading: 'Months',
      table: {
        caption: 'Each month of the span',
        columns: ['Month', 'Energy kWh', 'Water m3', 'Waste kg', 'Occupied room nights'],
        rows: monthRows,
      },
    },
    {
      heading: 'Renewable coverage',
      refusal:
        'Not computed: on-site generation and retained attributes are not recorded for this property, so the coverage of total electricity by renewable sources is not stated rather than assumed.',
    },
    {
      heading: 'Retired instruments',
      paragraphs: compensationModel?.position
        ? [
            `Compensated by period: ${compensationModel.position.compensated.map((c) => `${c.period} ${c.quantity} tCO2e`).join('; ') || 'none'}. Reported beside the inventory, never subtracted from it.`,
          ]
        : ['No compensation position.'],
    },
  ]
  if (ctx.portfolioId) {
    const targets = await loadPortfolioTargets(ctx.supabase, ctx.portfolioId, [
      { id: ctx.hotelId, name: ctx.hotelName },
    ])
    sections.push({
      heading: 'Target results',
      table: {
        caption: 'Targets',
        columns: ['Target', 'Baseline', 'Target', 'Latest reading'],
        rows: targets.cards.map((t) => [
          t.metricLabel,
          `${t.baselineValue} ${t.unit} (${t.baselineYear})`,
          `${t.targetValue} ${t.unit} by ${t.targetYear}`,
          t.reading ? `${t.reading.value} ${t.unit} at ${t.reading.asAt}` : 'no reading',
        ]),
      },
    })
  }
  const first = months[months.length - 1]!
  return finish(ctx, {
    title: 'Annual Sustainability Performance',
    subtitle: `${ctx.hotelName} · ${first} to ${ctx.month}`,
    sections,
    factorSetVersions: [],
    nonMeasured,
    figures: 4,
    monthsExpected: 12,
    monthsIncluded: approvedMonths.length,
    monthsMissing: months.filter((m) => !approvedMonths.includes(m)),
    periodStart: `${first}-01`,
    periodEnd: periodEndOf(ctx.month),
    operationalNote: null,
    draft: !complete,
  })
}

async function carbonInventory(ctx: Context): Promise<BuildOutcome> {
  if (!ctx.periodId)
    return {
      ok: false,
      refusal: `No reporting month ${ctx.month} exists at this property.`,
      missing: ['the month'],
    }
  const [overview, factor, comp, restatement, note, scope3] = await Promise.all([
    loadOverviewModel(ctx.hotelId, ctx.locale, ctx.ports, ctx.periodId),
    gridFactorVersion(ctx),
    loadCompensationModel(ctx.supabase, ctx.locale, ctx.hotelId, ctx.periodId),
    ctx.supabase.schema('data').rpc('restatement_of', { p_period_id: ctx.periodId }),
    operationalNote(ctx),
    loadScope3(supabaseScope3Ports(ctx.supabase), ctx.hotelId, ctx.periodId).catch(() => null),
  ])
  const c = overview.carbonCard
  if (!c.available)
    return {
      ok: false,
      refusal: `The inventory cannot be issued: ${c.reason}. An inventory that cannot be checked is not an inventory (X-12).`,
      missing: ['an approved month with a resolved grid factor'],
    }
  const eligible = (comp?.instruments ?? []).filter(
    (i) => i.period === ctx.month && i.status === 'eligible',
  )
  const excluded = (comp?.instruments ?? []).filter(
    (i) => i.period === ctx.month && i.status !== 'eligible',
  )
  const r = ((restatement.data ?? []) as Record<string, unknown>[])[0]
  const nonMeasured: NonMeasuredFigure[] = c.marker.present
    ? c.marker.inputs.map((i) => ({ label: `Scope 2: ${i.label}`, tier: i.tier, method: i.method }))
    : []
  const sections: ReportSection[] = [
    {
      heading: 'Boundary and basis',
      table: {
        caption: 'Organisational boundary',
        columns: ['Item', 'Value'],
        rows: [
          ['Boundary', ctx.boundaryNote],
          ['Consolidation approach', ctx.consolidation.replaceAll('_', ' ')],
          ['Base year', ctx.baseYear],
          ['Reporting period', `${ctx.month}`],
          ['Methodology', ctx.methodologyVersion],
        ],
      },
    },
    {
      heading: 'Scope 1',
      refusal:
        'No Scope 1 source is recorded for this property this period: no fuel delivery, refrigerant charge or on-site combustion. No figure is presented as zero.',
    },
    {
      heading: 'Scope 2, both bases, never combined',
      table: {
        caption: 'Scope 2',
        columns: ['Basis', 'Value', 'Note'],
        rows: [
          ['Location-based', `${c.grossOperational.value} ${c.grossOperational.unit}`, c.coverage],
          [
            'Market-based',
            eligible.length > 0
              ? `${eligible.reduce((n, i) => n + Number(i.quantityMwh), 0)} MWh covered by eligible instruments at their stated rate; the remainder at the location-based rate with the Tier 4 disclosure`
              : 'Not stated: no eligible instrument and no published residual mix; where Tier 4 covers the whole quantity the market-based figure equals the location-based one and is reported with the disclosure',
          ],
        ],
      },
      paragraphs: [c.sentence, ...c.notes],
      markers: nonMeasured.map((n) => `${n.label}: ${n.tier} — ${n.method}`),
    },
    {
      heading: 'Scope 3',
      paragraphs: [
        scope3
          ? scope3.inventory.sentence
          : 'Scope 3 could not be assembled for this month; every category is listed as not stated.',
        'Stated beside the Scope 1 and 2 headline and never inside it. All fifteen categories appear with their screening status and reason, so a reader sees a completed screening rather than a partial inventory (§13.11).',
      ],
      table: {
        caption: 'Scope 3 by category',
        columns: ['Category', 'Screening', 'kgCO2e'],
        rows: scope3
          ? [
              ...scope3.inventory.rows.map((r) => [
                `${r.category} · ${r.name}`,
                `${STATUS_LABEL[r.status] ?? r.status}${r.accepted ? '' : ' (default, not yet accepted)'}`,
                r.kgCO2e !== null
                  ? `${formatQuantity(r.kgCO2e, 'emissions.kgco2e', ctx.locale)}${r.state === 'partial' ? ' (partial)' : ''}`
                  : r.statement,
              ]),
              [
                'Total across categories with a figure',
                scope3.inventory.partial ? 'not complete' : 'complete',
                scope3.inventory.totalKgCO2e !== null
                  ? formatQuantity(scope3.inventory.totalKgCO2e, 'emissions.kgco2e', ctx.locale)
                  : 'not stated',
              ],
            ]
          : [['1 to 15', 'not stated', 'the screening could not be read']],
      },
      // Every reason, and every line that could not be valued, in words. A verifier reads
      // this section for what is NOT in the figure.
      markers: scope3
        ? scope3.inventory.rows.flatMap((r) => [
            ...(r.status !== 'reported' ? [`${r.category} · ${r.name}: ${r.reason}`] : []),
            ...(r.figure?.unresolved ?? []).map(
              (u) => `${r.category} · ${r.name}, not in the figure: ${u}`,
            ),
          ])
        : [],
    },
    {
      heading: 'Intensity',
      table: {
        caption: 'Per occupied room night',
        columns: ['Figure', 'Value'],
        rows: [[c.kpi.label, `${c.kpi.value} ${c.kpi.unit}`]],
      },
    },
    {
      heading: 'Instruments',
      table: {
        caption: 'Energy attribute instruments for the month',
        columns: ['Instrument', 'MWh', 'Disposition'],
        rows: [...eligible, ...excluded].map((i) => [
          `${i.kind} · ${i.registry ?? ''} ${i.serialRange ?? ''}`,
          i.quantityMwh,
          i.status === 'eligible'
            ? 'eligible'
            : `visible but excluded: ${i.failedChecks.join(', ')}`,
        ]),
      },
    },
    {
      heading: 'Compensation, reported separately',
      paragraphs: [
        comp?.position
          ? `Compensated for ${ctx.month}: ${comp.position.compensated.find((x) => x.period === ctx.month)?.quantity ?? '0'} tCO2e through retired carbon credits. Never netted against the inventory above (K-05, C-04).`
          : 'No compensation position.',
      ],
    },
    {
      heading: 'Restatements',
      paragraphs: [
        r
          ? `This month was reopened on ${String(r.reopened_at ?? '').slice(0, 10)} by ${String(r.reopened_by_name ?? 'a named person')}: ${String(r.reopened_reason)}. The approval undone was ${String(r.previously_approved_at ?? '').slice(0, 10)} by ${String(r.previously_approved_by_name ?? '')}.`
          : 'No published figure for this month has been restated.',
      ],
    },
    {
      heading: 'Exclusions',
      paragraphs: [
        'Scope 1 sources not recorded; Scope 3 categories 2 to 15 not on record; self-consumed generation not recorded. Each is stated rather than assumed zero.',
      ],
    },
  ]
  const w = monthWindow(ctx)
  return finish(ctx, {
    title: 'Carbon Inventory',
    subtitle: `${ctx.hotelName} · ${overview.header.periodLabel}`,
    sections,
    factorSetVersions: factor ? [factor] : [],
    nonMeasured,
    figures: 4,
    ...w,
    operationalNote: note,
    draft: w.draft,
  })
}

async function comparison(ctx: Context): Promise<BuildOutcome> {
  if (!ctx.periodId)
    return {
      ok: false,
      refusal: `No reporting month ${ctx.month} exists at this property.`,
      missing: ['the month'],
    }
  const shell = await loadPillarOverview(
    ctx.supabase,
    ctx.locale,
    ctx.hotelId,
    'energy',
    ctx.periodId,
  )
  const sections: ReportSection[] = []
  for (const pillar of ['energy', 'water', 'waste', 'carbon'] as const) {
    const m = await loadComparison(ctx.supabase, ctx.locale, { ...shell, pillar })
    if (m.state !== 'assigned')
      return {
        ok: false,
        refusal:
          m.state === 'not_enabled'
            ? 'Comparison is not enabled for this client.'
            : m.state === 'unassigned'
              ? 'No comparison hotels are assigned to this property; a pair is assigned by Farnek from the consented hotels sharing its market and band, and never from fewer than five.'
              : 'A comparison hotel left and the assignment is end-dated; a new pair is assigned by Farnek.',
        missing: ['two assigned comparators'],
      }
    const cellText = (c: { kind: string; value?: string; label?: string }) =>
      c.kind === 'value' ? (c.value ?? '') : (c.label ?? c.kind)
    sections.push({
      heading: pillar[0]!.toUpperCase() + pillar.slice(1),
      table: {
        caption: 'This property, Hotel A and Hotel B on the same period',
        columns: ['Metric', 'This property', 'Hotel A', 'Hotel B', 'Average of A and B'],
        rows: m.rows.map((r) => [
          `${r.metric} ${r.unit} ${r.denominator}`,
          cellText(r.client),
          cellText(r.hotelA),
          cellText(r.hotelB),
          r.average ?? r.averageWithheldBecause ?? 'withheld',
        ]),
      },
      paragraphs:
        pillar === 'energy'
          ? [...m.profiles.map((p) => `Hotel ${p.label}: ${p.lines.join(' · ')}`), ...m.limitations]
          : m.limitations,
    })
  }
  const w = monthWindow(ctx)
  return finish(ctx, {
    title: 'Hotel Comparison',
    subtitle: `${ctx.hotelName} · ${ctx.month}`,
    sections,
    factorSetVersions: [],
    nonMeasured: [],
    figures: 6,
    ...w,
    operationalNote: null,
    draft: w.draft,
  })
}

async function portfolio(ctx: Context): Promise<BuildOutcome> {
  if (!ctx.portfolioId)
    return {
      ok: false,
      refusal:
        'This property belongs to no portfolio, so there is no consolidated position to report.',
      missing: ['a portfolio'],
    }
  const hotels = await loadPortfolioHotels(ctx.supabase, ctx.portfolioId)
  const inputs = await loadHotelMonths(ctx.supabase, hotels, ctx.month)
  const metrics = buildMetrics(inputs)
  const targets = await loadPortfolioTargets(ctx.supabase, ctx.portfolioId, hotels)
  const approvedCount = inputs.filter((i) => i.approved).length
  const sections: ReportSection[] = [
    {
      heading: 'Consolidated totals and intensities',
      paragraphs: [
        `${approvedCount} of ${inputs.length} properties approved for ${ctx.month}; an aggregate over fewer than all is disclosed as such and never extrapolated.`,
      ],
      table: {
        caption: 'Portfolio metrics',
        columns: ['Resource', 'Total', 'Intensity', 'Coverage'],
        rows: metrics.map((m) => [
          m.label,
          `${m.figure.total ?? '—'} ${m.totalUnit}`,
          m.intensityForDisplay
            ? `${m.intensityForDisplay} ${m.intensityUnit} ${m.denominatorLabel}`
            : '—',
          m.figure.coverage?.statement ?? 'stated',
        ]),
      },
    },
    {
      heading: 'Hotels',
      table: {
        caption: 'Each property this month',
        columns: [
          'Property',
          'Approved',
          'Energy kWh',
          'Water m3',
          'Waste kg',
          'Occupied room nights',
        ],
        rows: inputs.map((i) => [
          i.hotelName,
          i.approved ? 'yes' : 'no',
          i.energyKwh ?? '—',
          i.waterM3 ?? '—',
          i.wasteKg ?? '—',
          i.occupiedRoomNights ?? '—',
        ]),
      },
    },
    {
      heading: 'Targets',
      table: {
        caption: 'Portfolio targets',
        columns: ['Target', 'Baseline', 'Target', 'Latest reading'],
        rows: targets.cards.map((t) => [
          `${t.metricLabel} (${t.scopeLabel})`,
          `${t.baselineValue} ${t.unit} (${t.baselineYear})`,
          `${t.targetValue} ${t.unit} by ${t.targetYear}`,
          t.reading ? `${t.reading.value} ${t.unit} at ${t.reading.asAt}` : 'no reading',
        ]),
      },
    },
    {
      heading: 'Carbon position',
      paragraphs: [
        "Per property in each property's own Carbon Inventory; the portfolio total is formed only over properties with an approved month and a resolved factor.",
      ],
    },
  ]
  return finish(ctx, {
    title: 'Portfolio Performance',
    subtitle: `${ctx.month}`,
    sections,
    factorSetVersions: [],
    nonMeasured: [],
    figures: metrics.length,
    monthsExpected: 1,
    monthsIncluded: approvedCount === inputs.length && inputs.length > 0 ? 1 : 0,
    monthsMissing: approvedCount === inputs.length && inputs.length > 0 ? [] : [ctx.month],
    periodStart: `${ctx.month}-01`,
    periodEnd: periodEndOf(ctx.month),
    operationalNote: null,
    subject: 'portfolio',
    draft: approvedCount !== inputs.length,
  })
}

async function cost(ctx: Context): Promise<BuildOutcome> {
  if (!ctx.periodId)
    return {
      ok: false,
      refusal: `No reporting month ${ctx.month} exists at this property.`,
      missing: ['the month'],
    }
  const model = await loadCostModel(ctx.supabase, ctx.hotelId, ctx.periodId)
  if (!model || model.noCostEver)
    return {
      ok: false,
      refusal:
        'No billed cost has ever been entered for this property; there is no variance to report.',
      missing: ['billed cost'],
    }
  const t = model.summary.totals
  const lineRows = model.summary.lines.map((l) => {
    const u = model.utilities.find((x) => x.sourceId === l.sourceId)
    const v = l.variance
    const varianceText =
      v === null
        ? 'no cost this period'
        : 'withheld' in v
          ? `withheld: ${v.because}`
          : Object.entries(v as unknown as Record<string, unknown>)
              .filter(([, x]) => typeof x === 'string' || typeof x === 'number')
              .map(([k, x]) => `${k.replaceAll(/([A-Z])/g, ' $1').toLowerCase()} ${String(x)}`)
              .join('; ')
    return [
      u?.label ?? l.sourceId,
      l.cost ?? '—',
      l.priorCost ?? '—',
      l.rate ? `${String((l.rate as unknown as { value?: unknown }).value ?? '')}` : '—',
      varianceText,
    ]
  })
  const nonMeasured: NonMeasuredFigure[] = model.utilities
    .filter((u) => u.costTier && u.costTier !== 'measured')
    .map((u) => ({
      label: `${u.label} cost`,
      tier: u.costTier as 'estimated' | 'proxy',
      method: 'as billed; tier as stated on the reading',
    }))
  const sections: ReportSection[] = [
    {
      heading: 'Totals',
      table: {
        caption: `Billed cost in ${model.currency}`,
        columns: ['Figure', 'Value'],
        rows: [
          // Through the registry, like every other figure. These went onto a report as
          // 353938.08 and -3625.15: raw decimals, ungrouped, in the document a hotel sends
          // its owner. The rounding rules exist so that no figure reaches a reader by
          // whatever route happened to be shortest.
          ['This period', t.actual ? money(t.actual, ctx.locale) : 'no priced utility'],
          [
            'Same period last year',
            t.prior ? money(t.prior, ctx.locale) : (t.priorWithheldBecause ?? '—'),
          ],
          [
            'Variance',
            t.variance
              ? `${money(t.variance, ctx.locale)} (${t.variancePercent ? formatQuantity(t.variancePercent, 'percentage', ctx.locale) : '—'}%)`
              : '—',
          ],
          ['Priced utilities', `${t.priced.of} of ${t.priced.total}`],
        ],
      },
    },
    {
      heading: 'By utility: price and volume effects',
      paragraphs: [
        'Cost as billed (I-05); the split of the change into price and volume follows the convention in the footnote of the Cost screen and reconciles to the total.',
      ],
      table: {
        caption: 'Utilities',
        columns: ['Utility', 'Cost', 'Prior', 'Effective rate', 'Variance split'],
        rows: lineRows,
      },
      markers: nonMeasured.map((n) => `${n.label}: ${n.tier}`),
    },
  ]
  const w = monthWindow(ctx)
  return finish(ctx, {
    title: 'Cost Variance',
    subtitle: `${ctx.hotelName} · ${ctx.month}`,
    sections,
    factorSetVersions: [],
    nonMeasured,
    figures: lineRows.length + 1,
    ...w,
    operationalNote: await operationalNote(ctx),
    draft: w.draft,
  })
}

async function mv(ctx: Context): Promise<BuildOutcome> {
  const model = await loadMeasuresModel(ctx.supabase, ctx.hotelId)
  const withSaving = (model?.rows ?? []).filter((r) => r.saving !== null)
  if (withSaving.length === 0)
    return {
      ok: false,
      refusal:
        'No measure at this property has a determination. An M&V report states a verified saving against its plan and signatory, or nothing.',
      missing: ['a measure with a determination'],
    }
  const sections: ReportSection[] = [
    {
      heading: 'Measures and determinations',
      table: {
        caption: 'Each measure with a determination',
        columns: ['Measure', 'Resource', 'Status', 'Implemented', 'Saving', 'Basis', 'Signatory'],
        rows: withSaving.map((r) => [
          r.title,
          r.resourceLabel,
          r.status,
          r.implementedOn ?? '—',
          `${r.saving!.value} ${r.saving!.unit}`,
          String(r.saving!.basis).replaceAll('_', ' '),
          r.saving!.signatoryName ?? 'not yet signed',
        ]),
      },
    },
    {
      heading: 'Reconciliation',
      paragraphs: [
        "Each determination reconciles to the billed record of its reporting period through the verification plan's boundary; an estimate is unsigned and an unreconciled boundary refuses a verified claim (SPEC-04G §5).",
      ],
    },
  ]
  const now = new Date().toISOString().slice(0, 7)
  return finish(ctx, {
    title: 'M&V Report',
    subtitle: `${ctx.hotelName} · as at ${now}`,
    sections,
    factorSetVersions: [],
    nonMeasured: withSaving
      .filter((r) => String(r.saving!.basis).includes('estimate'))
      .map((r) => ({
        label: r.title,
        tier: 'estimated' as const,
        method: 'estimated determination, unsigned',
      })),
    figures: withSaving.length,
    monthsExpected: 1,
    monthsIncluded: 1,
    monthsMissing: [],
    periodStart: `${now}-01`,
    periodEnd: periodEndOf(now),
    operationalNote: null,
    draft: withSaving.some((r) => r.saving!.signatoryName === null),
  })
}

async function compensation(ctx: Context): Promise<BuildOutcome> {
  const model = await loadCompensationModel(ctx.supabase, ctx.locale, ctx.hotelId, undefined)
  const p = model?.position
  const sections: ReportSection[] = [
    {
      heading: 'Compensated by period',
      table: {
        caption: 'Retired credits allocated to this property',
        columns: ['Period', 'tCO2e', 'Orders', 'Certificates'],
        rows: (p?.compensated ?? []).map((c) => [
          c.period,
          c.quantity,
          String(c.orders),
          String(c.certificates),
        ]),
      },
      paragraphs: [
        (p?.compensated.length ?? 0) === 0
          ? 'Nothing compensated: stated as empty, not omitted.'
          : 'Reported beside the inventory and never subtracted from it (§12.1).',
      ],
    },
    {
      heading: 'Retirements and certificates',
      table: {
        caption: 'Each order, its retirement and its certificate',
        columns: ['Period', 'tCO2e', 'Project', 'Registry', 'Retirement reference', 'Certificate'],
        rows: (p?.orders ?? []).map((o) => [
          o.period,
          o.quantity,
          `${o.pool.project} · ${o.pool.standard} · ${o.pool.vintage}`,
          o.pool.registry,
          o.pool.reference,
          o.certificate
            ? o.certificate.voidedAt
              ? `${o.certificate.serial} (void)`
              : o.certificate.serial
            : 'not issued',
        ]),
      },
    },
    {
      heading: 'Facilitated for others, reported apart',
      table: {
        caption: "Never added to the hotel's own line",
        columns: ['Beneficiary', 'tCO2e'],
        rows: [
          ['Guests', p?.facilitated.guest ?? '0'],
          ['Events', p?.facilitated.event ?? '0'],
          ['Third parties', p?.facilitated.thirdParty ?? '0'],
        ],
      },
    },
  ]
  const now = new Date().toISOString().slice(0, 7)
  return finish(ctx, {
    title: 'Compensation and Retirement',
    subtitle: `${ctx.hotelName} · as at ${now}`,
    sections,
    factorSetVersions: [],
    nonMeasured: [],
    figures: (p?.orders.length ?? 0) + 3,
    monthsExpected: 1,
    monthsIncluded: 1,
    monthsMissing: [],
    periodStart: `${now}-01`,
    periodEnd: periodEndOf(now),
    operationalNote: null,
    draft: false,
  })
}

async function certification(ctx: Context): Promise<BuildOutcome> {
  const model = await loadCertificationModel(ctx.supabase, ctx.locale, ctx.hotelId, undefined)
  if (!model || model.cycles.length === 0)
    return {
      ok: false,
      refusal: 'No certification cycle is open at this property.',
      missing: ['an open certification cycle'],
    }
  const sections: ReportSection[] = []
  for (const c of model.cycles) {
    const register = await ctx.supabase
      .schema('certification')
      .rpc('evidence_register', { p_cycle_id: c.id })
    const rows = ((register.data ?? []) as Record<string, unknown>[]).map((r) => [
      String(r.requirement_code),
      String(r.requirement_title),
      String(r.applicability),
      String(r.status).replaceAll('_', ' '),
      r.answer === null || r.answer === undefined ? '—' : JSON.stringify(r.answer),
      r.storage_path
        ? `${String(r.document_type)} · ${r.expires_at ? `expires ${String(r.expires_at)}` : 'no expiry'}`
        : 'none',
    ])
    sections.push({
      heading: `${c.pack.name} · edition ${c.pack.edition} · cycle ${c.cycleYear}`,
      paragraphs: [
        progressSentence(c.progress),
        c.targetAuditDate
          ? `Target audit ${c.targetAuditDate}${c.auditor ? ` · ${c.auditor}` : ''}.`
          : 'No audit date set.',
        ...(c.pack.contentNote ? [c.pack.contentNote] : []),
      ],
      table: {
        caption: `Requirement checklist and evidence register (${c.pack.exportDefinition.format})`,
        columns: ['Requirement', 'Title', 'Applicability', 'Status', 'Answer', 'Evidence'],
        rows,
      },
    })
  }
  const now = new Date().toISOString().slice(0, 7)
  return finish(ctx, {
    title: 'Certification Readiness',
    subtitle: `${ctx.hotelName} · as at ${now}`,
    sections,
    factorSetVersions: [],
    nonMeasured: [],
    figures: model.cycles.length,
    monthsExpected: 1,
    monthsIncluded: 1,
    monthsMissing: [],
    periodStart: `${now}-01`,
    periodEnd: periodEndOf(now),
    operationalNote: null,
    draft: false,
  })
}

async function assurancePack(ctx: Context): Promise<BuildOutcome> {
  if (!ctx.periodId)
    return {
      ok: false,
      refusal: `No reporting month ${ctx.month} exists at this property.`,
      missing: ['the month'],
    }
  const [trail, model] = await Promise.all([
    ctx.supabase.schema('assurance').rpc('evidence_trail', { p_period_id: ctx.periodId }),
    loadAssuranceModel(ctx.supabase, ctx.locale, '', ctx.hotelId, null),
  ])
  if (trail.error)
    return {
      ok: false,
      refusal: `The evidence trail could not be read: ${trail.error.message}`,
      missing: ['the evidence trail'],
    }
  const t = trail.data as {
    resource_records: Record<string, unknown>[]
    audit_events: Record<string, unknown>[]
  }
  const records = t.resource_records ?? []
  const byTier = { measured: 0, estimated: 0, proxy: 0 }
  for (const r of records)
    if (!r.corrected) byTier[String(r.quality_tier) as keyof typeof byTier] += 1
  const engagements = model?.engagements ?? []
  const sections: ReportSection[] = [
    {
      heading: 'Data quality summary',
      table: {
        caption: 'Current readings by quality tier',
        columns: ['Tier', 'Readings'],
        rows: [
          ['Measured', String(byTier.measured)],
          ['Estimated', String(byTier.estimated)],
          ['Proxy', String(byTier.proxy)],
          ['Corrections retained', String(records.filter((r) => r.corrected).length)],
        ],
      },
    },
    {
      heading: 'Sampling',
      table: {
        caption: 'Samples drawn on engagements covering this property',
        columns: ['Engagement', 'Drawn', 'Seed', 'Records', 'By tier'],
        rows: engagements.flatMap((e) =>
          e.samples.map((s) => [
            e.reference,
            s.drawnAt.slice(0, 10),
            s.seed,
            String(s.drawn),
            Object.entries(s.byTier)
              .map(([k, v]) => `${k} ${v}`)
              .join(' · '),
          ]),
        ),
      },
    },
    {
      heading: 'Calculation traces',
      paragraphs: [
        'Each figure reproduces from its inputs through the executable snapshot on the Assurance screen (§19.4); the trail export carries every reading, correction, evidence document and audit event for the period.',
      ],
    },
    {
      heading: 'Findings register',
      table: {
        caption: 'Findings on engagements covering this property',
        columns: ['Reference', 'Severity', 'Status', 'Raised', 'Description'],
        rows: engagements.flatMap((e) =>
          e.findings.map((f) => [
            `${e.reference} ${f.reference}`,
            f.severity,
            f.status,
            f.raisedAt.slice(0, 10),
            f.description,
          ]),
        ),
      },
    },
    {
      heading: 'Audit events',
      table: {
        caption: `${(t.audit_events ?? []).length} events on the period`,
        columns: ['At', 'Kind', 'Entity', 'Actor'],
        rows: (t.audit_events ?? [])
          .slice(0, 60)
          .map((e) => [
            String(e.at).slice(0, 19),
            String(e.kind),
            String(e.entity_type),
            String(e.actor ?? 'system'),
          ]),
      },
    },
  ]
  const nonMeasured: NonMeasuredFigure[] = records
    .filter((r) => !r.corrected && String(r.quality_tier) !== 'measured')
    .map((r) => ({
      label: `${String((r.source as { resource: string }).resource)} reading`,
      tier: String(r.quality_tier) as 'estimated' | 'proxy',
      method: String(r.estimation_method ?? 'method not stated'),
    }))
  const w = monthWindow(ctx)
  return finish(ctx, {
    title: 'Assurance Pack',
    subtitle: `${ctx.hotelName} · ${ctx.month}`,
    sections,
    factorSetVersions: [],
    nonMeasured,
    figures: records.length,
    ...w,
    operationalNote: null,
    draft: w.draft,
  })
}
