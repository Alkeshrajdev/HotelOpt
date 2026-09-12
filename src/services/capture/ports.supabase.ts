import type { SupabaseClient } from '@supabase/supabase-js'
import { may as mayDo } from '@/services/access/may'
import type { DataCategory } from '@/services/access/may'
import type {
  CaptureCodeRow,
  CaptureModel,
  DocumentClass,
  ExtractionRow,
  ExtractionStatus,
  ImportBatchRow,
  ImportKind,
  ReadFields,
  RowOutcome,
} from './model'
import { EMPTY_FIELDS } from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

function fieldsOf(raw: unknown): ReadFields {
  const obj = (raw ?? {}) as Record<string, unknown>
  const out: Record<string, string | null> = { ...EMPTY_FIELDS }
  for (const key of Object.keys(EMPTY_FIELDS)) out[key] = text(obj[key])
  return out as unknown as ReadFields
}

export async function loadCaptureModel(
  supabase: SupabaseClient,
  hotelId: string,
): Promise<CaptureModel | null> {
  const hotelResult = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (hotelResult.error) throw new Error(`capture.hotel: ${hotelResult.error.message}`)
  if (!hotelResult.data) return null

  const may = (module: string, action: string, category: DataCategory | null) =>
    mayDo(supabase, module, action, hotelId, category)

  const [
    importHistory,
    attest,
    documents,
    codes,
    batches,
    extractions,
    codeRows,
    periods,
    sources,
    points,
    streams,
    captures,
  ] = await Promise.all([
    may('performance', 'C', null),
    may('data', 'E', 'activity'),
    may('data', 'E', 'evidence'),
    may('data', 'E', 'waste'),
    supabase
      .schema('data')
      .from('import_batches')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .schema('data')
      .from('document_extractions')
      .select('*,documents:document_id(storage_path)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .schema('waste')
      .from('capture_codes')
      .select('*,waste_points:waste_point_id(reference,name,location_note)')
      .eq('hotel_id', hotelId)
      .order('issued_at', { ascending: false }),
    supabase
      .schema('data')
      .from('reporting_periods')
      .select('id,period_start,status')
      .eq('hotel_id', hotelId)
      .order('period_start', { ascending: false })
      .limit(36),
    supabase
      .schema('data')
      .from('resource_sources')
      .select('id,resource,provider,account_reference,canonical_unit,included')
      .eq('hotel_id', hotelId)
      .eq('included', true),
    supabase
      .schema('waste')
      .from('waste_points')
      .select('id,reference,name')
      .eq('hotel_id', hotelId)
      .is('retired_at', null),
    supabase.schema('waste').from('waste_point_streams').select('waste_point_id,stream'),
    supabase
      .schema('waste')
      .from('captures')
      .select('waste_point_id,stream')
      .eq('hotel_id', hotelId)
      .gte('captured_at', new Date(Date.now() - 30 * 86400_000).toISOString()),
  ])
  for (const [name, r] of [
    ['batches', batches],
    ['extractions', extractions],
    ['codes', codeRows],
    ['periods', periods],
    ['sources', sources],
    ['points', points],
    ['streams', streams],
    ['captures', captures],
  ] as const) {
    if (r.error) throw new Error(`capture.${name}: ${r.error.message}`)
  }

  const batchRows: ImportBatchRow[] = (batches.data ?? []).map((b) => ({
    id: String(b.id),
    kind: String(b.kind) as ImportKind,
    fileName: String(b.file_name),
    sourceSystem: String(b.source_system),
    rowsTotal: Number(b.rows_total),
    rowsAccepted: Number(b.rows_accepted),
    rowsRejected: Number(b.rows_rejected),
    outcomes: ((b.outcomes ?? []) as RowOutcome[]).map((o) => ({
      row: Number(o.row),
      outcome: o.outcome,
      detail: String(o.detail ?? ''),
    })),
    createdAt: String(b.created_at),
    finishedAt: text(b.finished_at),
    attestedAt: text(b.attested_at),
    attestedBy: text(b.attested_by),
    attestationNote: text(b.attestation_note),
  }))

  const extractionRows: ExtractionRow[] = (extractions.data ?? []).map((e) => {
    const doc = Array.isArray(e.documents) ? e.documents[0] : e.documents
    return {
      id: String(e.id),
      documentId: String(e.document_id),
      storagePath: String((doc as { storage_path?: unknown } | null)?.storage_path ?? ''),
      documentClass: String(e.document_class) as DocumentClass,
      status: String(e.status) as ExtractionStatus,
      fieldsRead: fieldsOf(e.fields_read),
      failure: text(e.failure),
      modelVersion: text(e.model_version),
      createdAt: String(e.created_at),
      reviewedAt: text(e.reviewed_at),
      periodId: text(e.period_id),
      recordId: text(e.record_id),
    }
  })

  const captureCount = new Map<string, number>()
  for (const c of captures.data ?? []) {
    const key = `${String(c.waste_point_id)}:${String(c.stream)}`
    captureCount.set(key, (captureCount.get(key) ?? 0) + 1)
  }
  const codeList: CaptureCodeRow[] = (codeRows.data ?? []).map((c) => {
    const point = Array.isArray(c.waste_points) ? c.waste_points[0] : c.waste_points
    const p = (point ?? {}) as { reference?: unknown; name?: unknown; location_note?: unknown }
    return {
      id: String(c.id),
      pointReference: String(p.reference ?? ''),
      pointName: String(p.name ?? ''),
      locationNote: text(p.location_note),
      stream: String(c.stream),
      weightBasis: String(c.weight_basis),
      issuedAt: String(c.issued_at),
      retiredAt: text(c.retired_at),
      retiredReason: text(c.retired_reason),
      capturesLast30Days: captureCount.get(`${String(c.waste_point_id)}:${String(c.stream)}`) ?? 0,
    }
  })

  const streamsByPoint = new Map<string, string[]>()
  for (const s of streams.data ?? []) {
    const list = streamsByPoint.get(String(s.waste_point_id)) ?? []
    list.push(String(s.stream))
    streamsByPoint.set(String(s.waste_point_id), list)
  }

  return {
    hotelName: String(hotelResult.data.name),
    mayImportHistory: importHistory,
    mayAttest: attest,
    mayHandleDocuments: documents,
    mayIssueCodes: codes,
    batches: batchRows,
    extractions: extractionRows,
    codes: codeList,
    periods: (periods.data ?? []).map((p) => ({
      id: String(p.id),
      month: String(p.period_start).slice(0, 7),
      status: String(p.status),
    })),
    sources: (sources.data ?? []).map((s) => ({
      id: String(s.id),
      resource: String(s.resource),
      label: [String(s.resource).replaceAll('_', ' '), text(s.provider), text(s.account_reference)]
        .filter((x): x is string => x !== null && x !== '')
        .join(' · '),
      unit: String(s.canonical_unit),
    })),
    wastePoints: (points.data ?? []).map((p) => ({
      id: String(p.id),
      reference: String(p.reference),
      name: String(p.name),
      streams: streamsByPoint.get(String(p.id)) ?? [],
    })),
  }
}
