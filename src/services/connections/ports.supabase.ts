import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConnectionKind, ConnectionsModel, ConnectionStatus, ConnectionView } from './model'
import { hasAdapter, KIND_LABEL } from './model'

function text(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

export async function loadConnectionsModel(
  supabase: SupabaseClient,
  hotelId: string,
): Promise<ConnectionsModel | null> {
  const hotel = await supabase
    .schema('core')
    .from('hotels')
    .select('id,name')
    .eq('id', hotelId)
    .maybeSingle()
  if (hotel.error || !hotel.data) return null
  const [admin, health, sources] = await Promise.all([
    supabase.schema('access').rpc('is_platform_admin'),
    supabase.schema('integrations').rpc('health', { p_hotel_id: hotelId }),
    supabase
      .schema('data')
      .from('resource_sources')
      .select('id,resource,provider,account_reference')
      .eq('hotel_id', hotelId)
      .order('resource'),
  ])
  if (health.error) throw new Error(`connections.health: ${health.error.message}`)
  const rows = (health.data ?? []) as Record<string, unknown>[]
  const connections: ConnectionView[] = rows.map((r) => {
    const kind = String(r.kind) as ConnectionKind
    return {
      id: String(r.connection_id),
      kind,
      kindLabel: KIND_LABEL[kind] ?? kind,
      provider: String(r.provider),
      label: String(r.label),
      sourceLabel: text(r.source_label),
      status: String(r.status) as ConnectionStatus,
      lastDeliveredAt: text(r.last_delivered_at),
      lastCheckedAt: text(r.last_checked_at),
      lastOutcome: text(r.last_outcome),
      lastError: text(r.last_error),
      actionRequired: String(r.action_required),
      expectedCadenceDays: Number(r.expected_cadence_days),
      config: (r.config ?? {}) as Record<string, unknown>,
      runnable: r.withdrawn_at === null && hasAdapter(kind, String(r.provider)),
      withdrawnAt: text(r.withdrawn_at),
      withdrawnReason: text(r.withdrawn_reason),
    }
  })
  const ids = connections.map((c) => c.id)
  const deliveries = ids.length
    ? await supabase
        .schema('integrations')
        .from('deliveries')
        .select('*')
        .in('connection_id', ids)
        .order('received_at', { ascending: false })
        .limit(40)
    : { data: [], error: null }
  const labelOf = new Map(connections.map((c) => [c.id, c.label]))
  return {
    hotelName: String(hotel.data.name),
    mayRegister: Boolean(admin.data),
    connections,
    deliveries: (deliveries.data ?? []).map((d) => ({
      id: String(d.id),
      connectionId: String(d.connection_id),
      connectionLabel: labelOf.get(String(d.connection_id)) ?? '',
      receivedAt: String(d.received_at),
      origin: String(d.origin),
      reference: String(d.reference),
      coveringFrom: text(d.covering_from),
      coveringTo: text(d.covering_to),
      recordsWritten: Number(d.records_written),
      outcome: String(d.outcome),
      error: text(d.error),
      summary: (d.summary ?? {}) as Record<string, unknown>,
    })),
    sources: (sources.data ?? []).map((s) => ({
      id: String(s.id),
      label: `${String(s.resource)}${s.provider ? ` · ${String(s.provider)}` : ''}${s.account_reference ? ` · ${String(s.account_reference)}` : ''}`,
    })),
  }
}
