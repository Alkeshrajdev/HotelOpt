/**
 * F4 — the matched hotel comparison, read only from the comparator store (SPEC-04E §3.3c).
 *
 * Three columns on the same period: this property, Hotel A, Hotel B. The client's own
 * intensities are the engine's over its own approved totals; the comparators' are the
 * store's snapshots, labelled A and B and nothing else. An average of the two appears only
 * where both approved the period; a comparator that has not is "not yet available", never
 * backfilled, and never silently dropped so the pair becomes one.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { averageOfComparators, comparatorCell } from '@/engine/comparison'
import type { ComparatorSnapshot, ComparisonCell } from '@/engine/comparison'
import { intensityPer } from '@/engine/kpi'
import { assertNoIdentifiers } from '@/engine/comparison'
import { supabaseOverviewPorts } from '@/services/overview/ports.supabase'
import type { Locale } from '@/i18n'
import type { PillarShell } from './model'

export type ComparisonState =
  'assigned' | 'unassigned' | 'reassignment_pending' | 'not_enabled' | 'forbidden'

export interface ComparisonRowView {
  readonly metric: string
  readonly unit: string
  readonly denominator: string
  readonly client: ComparisonCell
  readonly hotelA: ComparisonCell
  readonly hotelB: ComparisonCell
  readonly average: string | null
  readonly averageWithheldBecause: string | null
}

export interface ComparisonModel extends PillarShell {
  readonly state: ComparisonState
  readonly rationale: {
    readonly attributes: Readonly<Record<string, string>>
    readonly note: string
    readonly since: string
    readonly previousEnded: string | null
  } | null
  readonly rows: readonly ComparisonRowView[]
  /** The banded profile of A and B, as the store holds it. Never a name. */
  readonly profiles: readonly { readonly label: 'A' | 'B'; readonly lines: readonly string[] }[]
  readonly limitations: readonly string[]
}

interface SnapshotRow {
  label: string
  period: string
  approved: boolean
  energy_intensity_per_orn: number | string | null
  energy_intensity_per_m2: number | string | null
  cop_conversion_applied: boolean
  water_intensity_per_orn: number | string | null
  waste_intensity_per_guest_night: number | string | null
  material_recovery_rate_percent: number | string | null
  landfill_diversion_rate_percent: number | string | null
  carbon_intensity_per_orn: number | string | null
  carbon_intensity_per_m2: number | string | null
  room_count_band: string
  gfa_band: string
  star_classification: string
  cooling_system_type: string
  laundry_arrangement: string
  has_pool: boolean
  has_spa: boolean
  staff_accommodation_included: boolean
  climate_zone: string
}

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

function snapshotOf(r: SnapshotRow): ComparatorSnapshot {
  return {
    comparatorReference: r.label,
    period: String(r.period).slice(0, 7),
    approved: Boolean(r.approved),
    energyIntensityPerOrn: text(r.energy_intensity_per_orn),
    energyIntensityPerM2: text(r.energy_intensity_per_m2),
    copConversionApplied: Boolean(r.cop_conversion_applied),
    waterIntensityPerOrn: text(r.water_intensity_per_orn),
    wasteIntensityPerGuestNight: text(r.waste_intensity_per_guest_night),
    materialRecoveryRatePercent: text(r.material_recovery_rate_percent),
    landfillDiversionRatePercent: text(r.landfill_diversion_rate_percent),
    carbonIntensityPerOrn: text(r.carbon_intensity_per_orn),
    carbonIntensityPerM2: text(r.carbon_intensity_per_m2),
    profile: {
      roomCountBand: r.room_count_band as ComparatorSnapshot['profile']['roomCountBand'],
      gfaBand: r.gfa_band as ComparatorSnapshot['profile']['gfaBand'],
      starClassification: String(r.star_classification),
      coolingSystemType: String(r.cooling_system_type),
      laundryArrangement: String(r.laundry_arrangement),
      hasPool: Boolean(r.has_pool),
      hasSpa: Boolean(r.has_spa),
      staffAccommodationIncluded: Boolean(r.staff_accommodation_included),
      climateZone: String(r.climate_zone),
    },
  }
}

function clientCell(value: string | null, denominator: string): ComparisonCell {
  return value === null
    ? { kind: 'not_applicable', label: 'Not applicable for this period' }
    : { kind: 'value', value, denominator }
}

export async function loadComparison(
  supabase: SupabaseClient,
  locale: Locale,
  shell: PillarShell,
): Promise<ComparisonModel> {
  const { hotelId, pillar, period } = shell
  const [stateResult, rationaleResult, snapshotResult] = await Promise.all([
    supabase.schema('comparison').rpc('assignment_state', { p_hotel_id: hotelId }),
    supabase.schema('comparison').rpc('assignment_rationale', { p_hotel_id: hotelId }),
    period.month
      ? supabase
          .schema('comparison')
          .rpc('assigned_snapshots', { p_hotel_id: hotelId, p_period: `${period.month}-01` })
      : Promise.resolve({ data: [] as SnapshotRow[], error: null }),
  ])
  const state = (text(stateResult.data) ?? 'forbidden') as ComparisonState
  const rationaleRow = (
    rationaleResult.data as
      | {
          rationale?: unknown
          note?: unknown
          effective_from?: unknown
          previous_ended?: unknown
        }[]
      | null
  )?.[0]
  const rationale = rationaleRow
    ? {
        attributes: Object.fromEntries(
          Object.entries((rationaleRow.rationale ?? {}) as Record<string, unknown>).map(
            ([k, v]) => [k, String(v)],
          ),
        ),
        note: String(rationaleRow.note ?? ''),
        since: String(rationaleRow.effective_from ?? ''),
        previousEnded: text(rationaleRow.previous_ended),
      }
    : null

  const snapshots = ((snapshotResult.data ?? []) as SnapshotRow[]).map(snapshotOf)
  // The boundary assertion: nothing bound for a client response carries an identifier.
  assertNoIdentifiers(snapshots)
  const a = snapshots.find((s) => s.comparatorReference === 'A') ?? null
  const b = snapshots.find((s) => s.comparatorReference === 'B') ?? null

  // The client's own intensities over its own approved totals, the same way the store's
  // were computed: engine/kpi over the period's totals and denominators.
  const ports = supabaseOverviewPorts(supabase, locale)
  const [totals, orn, guestNights, profile] = period.id
    ? await Promise.all([
        ports.resourceTotals(period.id),
        ports.occupiedRoomNights(period.id),
        ports.guestNights(period.id),
        supabase
          .schema('core')
          .from('hotel_profiles')
          .select('gross_floor_area_m2')
          .eq('hotel_id', hotelId)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [[], null, null, { data: null }]
  const gfa = text(
    (profile as { data: { gross_floor_area_m2?: unknown } | null }).data?.gross_floor_area_m2,
  )
  const totalOf = (resource: 'energy' | 'water' | 'waste') =>
    totals.find((t) => t.resource === resource)?.total ?? null

  const intensity = (
    total: string | null,
    denominator: string | null,
    kind: 'occupied_room_night' | 'guest_night' | 'gross_floor_area_m2',
    unit: string,
  ) =>
    total === null || denominator === null
      ? null
      : intensityPer(total, denominator, kind, unit).value

  const rows: ComparisonRowView[] = []
  const pending = state !== 'assigned'
  const cell = (
    snapshot: ComparatorSnapshot | null,
    pick: (s: ComparatorSnapshot) => string | null,
    denominator: string,
  ) => comparatorCell(pending ? null : snapshot, snapshot ? pick(snapshot) : null, denominator)
  const row = (
    metric: string,
    unit: string,
    denominator: string,
    client: string | null,
    pick: (s: ComparatorSnapshot) => string | null,
  ) => {
    const hotelA = cell(a, pick, denominator)
    const hotelB = cell(b, pick, denominator)
    const avg = averageOfComparators(hotelA, hotelB)
    rows.push({
      metric,
      unit,
      denominator,
      client: clientCell(client, denominator),
      hotelA,
      hotelB,
      average: avg.average,
      averageWithheldBecause: avg.withheldBecause,
    })
  }

  if (pillar === 'energy') {
    row(
      'Energy intensity',
      'kWh',
      'per occupied room night',
      intensity(totalOf('energy'), orn, 'occupied_room_night', 'kWh'),
      (s) => s.energyIntensityPerOrn,
    )
    row(
      'Energy intensity',
      'kWh',
      'per m²',
      intensity(totalOf('energy'), gfa, 'gross_floor_area_m2', 'kWh'),
      (s) => s.energyIntensityPerM2,
    )
  } else if (pillar === 'water') {
    row(
      'Water intensity',
      'm3',
      'per occupied room night',
      intensity(totalOf('water'), orn, 'occupied_room_night', 'm3'),
      (s) => s.waterIntensityPerOrn,
    )
  } else if (pillar === 'waste') {
    row(
      'Waste intensity',
      'kg',
      'per guest night',
      intensity(totalOf('waste'), guestNights, 'guest_night', 'kg'),
      (s) => s.wasteIntensityPerGuestNight,
    )
    row(
      'Material recovery rate',
      '%',
      'excludes waste-to-energy',
      null,
      (s) => s.materialRecoveryRatePercent,
    )
    row(
      'Landfill diversion rate',
      '%',
      'includes waste-to-energy',
      null,
      (s) => s.landfillDiversionRatePercent,
    )
  } else {
    row(
      'Carbon intensity',
      'kgCO2e',
      'per occupied room night',
      null,
      (s) => s.carbonIntensityPerOrn,
    )
    row('Carbon intensity', 'kgCO2e', 'per m²', null, (s) => s.carbonIntensityPerM2)
  }

  const profileLines = (s: ComparatorSnapshot): string[] => [
    `${s.profile.roomCountBand} keys · ${s.profile.gfaBand} m²`,
    `${s.profile.starClassification} · ${s.profile.coolingSystemType.replaceAll('_', ' ')} cooling · laundry ${s.profile.laundryArrangement.replaceAll('_', ' ')}`,
    `${s.profile.hasPool ? 'pool' : 'no pool'} · ${s.profile.hasSpa ? 'spa' : 'no spa'} · ${s.profile.staffAccommodationIncluded ? 'staff accommodation included' : 'no staff accommodation'} · climate ${s.profile.climateZone}`,
  ]

  const limitations: string[] = []
  if (pillar === 'energy' && (a?.copConversionApplied || b?.copConversionApplied))
    limitations.push(
      'District cooling reconciles through the approved COP factor where one exists; a comparator without one shows district cooling on its own line.',
    )
  if (pillar === 'carbon')
    limitations.push(
      "This property's own carbon intensities on the comparison basis (Scope 1 and location-based Scope 2) are not yet computed here; the comparators' are the store's.",
    )
  if (pillar === 'waste')
    limitations.push(
      'Recovery and diversion rates are compared on a stated basis: material recovery excludes waste-to-energy, landfill diversion includes it.',
    )
  limitations.push(
    'All three hotels are on the same reporting period; a different month or an annual value is never substituted.',
  )

  return {
    ...shell,
    state,
    rationale,
    rows,
    profiles: [a, b]
      .filter((s): s is ComparatorSnapshot => s !== null)
      .map((s) => ({ label: s.comparatorReference as 'A' | 'B', lines: profileLines(s) })),
    limitations,
  }
}
