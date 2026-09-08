import type { SupabaseClient } from '@supabase/supabase-js'
import { may as mayDo } from '@/services/access/may'
import type { LibraryDocument, LibraryModel } from './model'
import { expiryState, orderForLibrary } from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

export async function loadLibraryModel(
  supabase: SupabaseClient,
  hotelId: string,
): Promise<LibraryModel | null> {
  const hotel = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (hotel.error) throw new Error(`documents.hotel: ${hotel.error.message}`)
  if (!hotel.data) return null

  const [mayUpload, docs, periods, profiles] = await Promise.all([
    mayDo(supabase, 'data', 'E', hotelId, 'evidence'),
    supabase
      .schema('data')
      .from('documents')
      .select('id,storage_path,document_type,checksum,expires_at,created_at,uploaded_by')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .schema('data')
      .from('reporting_periods')
      .select('id,period_start')
      .eq('hotel_id', hotelId)
      .order('period_start', { ascending: false })
      .limit(36),
    supabase.schema('access').from('user_profiles').select('id,full_name'),
  ])
  for (const [n, r] of [
    ['documents', docs],
    ['periods', periods],
    ['profiles', profiles],
  ] as const) {
    if (r.error) throw new Error(`documents.${n}: ${r.error.message}`)
  }
  const nameOf = new Map((profiles.data ?? []).map((p) => [String(p.id), String(p.full_name)]))

  const documents: LibraryDocument[] = await Promise.all(
    (docs.data ?? []).map(async (d) => {
      const links = await supabase
        .schema('data')
        .rpc('document_links_in_words', { p_document_id: d.id })
      return {
        id: String(d.id),
        storagePath: String(d.storage_path),
        documentType: String(d.document_type).replace(/^demo-cert:/, ''),
        checksum: String(d.checksum),
        uploadedBy: d.uploaded_by ? (nameOf.get(String(d.uploaded_by)) ?? null) : null,
        uploadedAt: String(d.created_at),
        expiresAt: text(d.expires_at),
        expiry: expiryState(text(d.expires_at)),
        linkedTo: ((links.data as string[] | null) ?? []).map(String),
        retrievable: String(d.storage_path).startsWith('demo/') ? false : null,
      }
    }),
  )
  const ordered = orderForLibrary(documents)
  return {
    hotelName: String(hotel.data.name),
    mayUpload,
    documents: ordered,
    expiringSoon: ordered.filter((d) => d.expiry === 'expiring').length,
    expired: ordered.filter((d) => d.expiry === 'expired').length,
    types: [...new Set(ordered.map((d) => d.documentType))].sort(),
    periods: (periods.data ?? []).map((p) => ({
      id: String(p.id),
      month: String(p.period_start).slice(0, 7),
    })),
    retention:
      'Kept for as long as the client contract and every pursued scheme require, and no longer (W-02, X-07). Deleting is never offered here; a document past its term is withdrawn by Farnek with the retention rule that applies recorded.',
  }
}
