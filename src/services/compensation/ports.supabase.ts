import type { SupabaseClient } from '@supabase/supabase-js'
import { may as mayDo } from '@/services/access/may'
import { HotelNotFound, loadOverviewModel } from '@/services/overview'
import { supabaseOverviewPorts } from '@/services/overview/ports.supabase'
import type { Locale } from '@/i18n'
import type {
  CatalogueEntry,
  CertificateView,
  CompensationModel,
  InstrumentView,
  Position,
} from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

export async function loadCompensationModel(
  supabase: SupabaseClient,
  locale: Locale,
  hotelId: string,
  periodParam: string | undefined,
): Promise<CompensationModel | null> {
  let overview
  try {
    overview = await loadOverviewModel(
      hotelId,
      locale,
      supabaseOverviewPorts(supabase, locale),
      periodParam,
    )
  } catch (error) {
    if (error instanceof HotelNotFound) return null
    throw error
  }
  const hotel = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name,tenant_id')
    .eq('id', hotelId)
    .maybeSingle()
  if (hotel.error || !hotel.data) return null
  const tenant = await supabase
    .schema('core')
    .from('tenants')
    .select('name')
    .eq('id', hotel.data.tenant_id)
    .maybeSingle()

  const may = (action: string) => mayDo(supabase, 'compensation', action, hotelId)

  const [mayOrder, mayExport, position, catalogue, certificates, instruments, wording] =
    await Promise.all([
      may('E'),
      may('X'),
      supabase.schema('compensation').rpc('position', { p_hotel_id: hotelId }),
      supabase.schema('compensation').rpc('catalogue', { p_hotel_id: hotelId }),
      supabase
        .schema('compensation')
        .from('certificates')
        .select('*')
        .in('beneficiary_type', ['hotel', 'portfolio', 'event'])
        .order('issued_at', { ascending: false }),
      supabase
        .schema('compensation')
        .from('energy_instruments')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('period', { ascending: false }),
      supabase
        .schema('compensation')
        .from('wording')
        .select('registry_doc_threshold,permitted_claim_template')
        .eq('active', true)
        .maybeSingle(),
    ])
  for (const [n, r] of [
    ['position', position],
    ['catalogue', catalogue],
    ['certificates', certificates],
    ['instruments', instruments],
  ] as const) {
    if (r.error) throw new Error(`compensation.${n}: ${r.error.message}`)
  }

  const pos = position.data as Record<string, unknown> | null
  const positionView: Position | null = pos
    ? {
        compensated: ((pos.compensated as Record<string, unknown>[]) ?? []).map((c) => ({
          period: String(c.period),
          quantity: String(c.quantity),
          orders: Number(c.orders),
          certificates: Number(c.certificates),
        })),
        facilitated: {
          guest: String((pos.facilitated as Record<string, unknown>)?.guest ?? '0'),
          event: String((pos.facilitated as Record<string, unknown>)?.event ?? '0'),
          thirdParty: String((pos.facilitated as Record<string, unknown>)?.third_party ?? '0'),
        },
        orders: ((pos.orders as Record<string, unknown>[]) ?? []).map((o) => {
          const p = o.pool as Record<string, unknown>
          const c = o.certificate as Record<string, unknown> | null
          return {
            allocationId: String(o.allocation_id),
            period: String(o.period),
            quantity: String(o.quantity),
            allocatedAt: String(o.allocated_at),
            pool: {
              project: String(p.project),
              registry: String(p.registry),
              standard: String(p.standard),
              vintage: String(p.vintage),
              mode: String(p.mode),
              reference: String(p.reference),
            },
            certificate: c
              ? {
                  serial: String(c.serial),
                  issuedAt: String(c.issued_at),
                  voidedAt: text(c.voided_at),
                }
              : null,
          }
        }),
      }
    : null

  const hotelCertificateSerials = new Set(
    positionView?.orders.map((o) => o.certificate?.serial).filter(Boolean) ?? [],
  )
  const certificateViews: CertificateView[] = (certificates.data ?? [])
    .filter((c) => c.beneficiary_type !== 'hotel' || hotelCertificateSerials.has(String(c.serial)))
    .map((c) => ({
      serial: String(c.serial),
      beneficiaryType: String(c.beneficiary_type),
      beneficiaryLabel: String(c.beneficiary_label),
      quantity: String(c.quantity_tco2e),
      period: String(c.period),
      registry: String(c.registry),
      project: String(c.project),
      standard: String(c.standard),
      vintage: String(c.vintage),
      retirementReference: String(c.retirement_reference),
      retirementDate: String(c.retirement_date),
      claim: String(c.claim_text),
      issuedAt: String(c.issued_at),
      voidedAt: text(c.voided_at),
      voidReasonClass: text(c.void_reason_class),
    }))

  const card = overview.carbonCard
  const periodSummaries = await supabaseOverviewPorts(supabase, locale).periods(hotelId)
  const selected = periodSummaries.find((p) => p.id === overview.selectedPeriodId) ?? null
  return {
    hotelName: String(hotel.data.name),
    clientName: String(tenant.data?.name ?? ''),
    mayOrder,
    mayExport,
    periods: periodSummaries.map((p) => ({ id: p.id, month: p.month, status: p.status })),
    selectedPeriod: selected ? { id: selected.id, month: selected.month } : null,
    grossInventory: card.available
      ? { value: card.grossOperational.value, coverage: card.coverage }
      : { value: null, reason: card.reason },
    position: positionView,
    catalogue: ((catalogue.data ?? []) as Record<string, unknown>[]).map((c) => ({
      poolId: String(c.pool_id),
      mode: String(c.mode) as CatalogueEntry['mode'],
      registry: String(c.registry),
      project: String(c.project),
      standard: String(c.standard),
      country: text(c.country),
      projectType: text(c.project_type),
      avoidanceOrRemoval: text(c.avoidance_or_removal),
      vintage: String(c.vintage),
      price:
        c.price_amount === null || c.price_amount === undefined
          ? null
          : { amount: String(c.price_amount), currency: String(c.price_currency ?? '') },
      available: String(c.available),
      status: String(c.status),
      retirementReference: String(c.retirement_reference),
      retirementDate: String(c.retirement_date),
      dedicated: Boolean(c.dedicated),
    })),
    certificates: certificateViews,
    instruments: (instruments.data ?? []).map((i): InstrumentView => ({
      id: String(i.id),
      carrier: String(i.carrier),
      kind: String(i.kind),
      quantityMwh: String(i.quantity_mwh),
      period: String(i.period),
      market: String(i.market),
      registry: text(i.registry),
      serialRange: text(i.serial_range),
      emissionRate: text(i.emission_rate_kg_per_mwh),
      vintageFrom: text(i.vintage_from),
      vintageTo: text(i.vintage_to),
      retirementReference: text(i.retirement_reference),
      retirementDate: text(i.retirement_date),
      beneficiaryNamed: Boolean(i.beneficiary_named),
      checks: Object.fromEntries(
        Object.entries((i.checks as Record<string, unknown>) ?? {}).map(([k, v]) => [
          k,
          Boolean(v),
        ]),
      ),
      failedChecks: ((i.failed_checks as string[] | null) ?? []).map(String),
      status: String(i.status) as InstrumentView['status'],
      recordedAt: String(i.recorded_at),
    })),
    threshold: String(wording.data?.registry_doc_threshold ?? '10'),
    permittedClaim: String(
      wording.data?.permitted_claim_template ??
        '{quantity} tCO2e compensated through retired carbon credits',
    ),
  }
}
