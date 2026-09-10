/**
 * External connections — OR Section C; the state of every outside system feeding a
 * property (C-11), with the action required when it is not delivering.
 */
export type ConnectionKind =
  'weather' | 'pms' | 'utility_feed' | 'district_cooling' | 'waste_contractor' | 'travel'
export type ConnectionStatus = 'configured' | 'healthy' | 'stale' | 'failed' | 'withdrawn'

export const KIND_LABEL: Record<ConnectionKind, string> = {
  weather: 'Weather',
  pms: 'Property management system',
  utility_feed: 'Utility feed',
  district_cooling: 'District cooling portal',
  waste_contractor: 'Waste contractor',
  travel: 'Travel management provider',
}

/** Label, glyph and tone together (V-04): never colour alone. */
export const STATUS_PRESENTATION: Record<
  ConnectionStatus,
  { label: string; glyph: string; tone: 'good' | 'warn' | 'bad' | 'neutral' | 'info' }
> = {
  configured: { label: 'Configured, nothing delivered yet', glyph: '○', tone: 'info' },
  healthy: { label: 'Healthy', glyph: '●', tone: 'good' },
  stale: { label: 'Stale', glyph: '◐', tone: 'warn' },
  failed: { label: 'Failed', glyph: '✕', tone: 'bad' },
  withdrawn: { label: 'Withdrawn', glyph: '—', tone: 'neutral' },
}

/** The providers an adapter exists for. Any other provider is registered, listed and honest: its data continues by hand. */
export const ADAPTERS: Record<ConnectionKind, readonly string[]> = {
  weather: ['Open-Meteo'],
  pms: [],
  utility_feed: [],
  district_cooling: [],
  waste_contractor: [],
  travel: [],
}

export function hasAdapter(kind: ConnectionKind, provider: string): boolean {
  return ADAPTERS[kind].some((p) => p.toLowerCase() === provider.trim().toLowerCase())
}

export interface ConnectionView {
  readonly id: string
  readonly kind: ConnectionKind
  readonly kindLabel: string
  readonly provider: string
  readonly label: string
  readonly sourceLabel: string | null
  readonly status: ConnectionStatus
  readonly lastDeliveredAt: string | null
  readonly lastCheckedAt: string | null
  readonly lastOutcome: string | null
  readonly lastError: string | null
  readonly actionRequired: string
  readonly expectedCadenceDays: number
  readonly config: Record<string, unknown>
  readonly runnable: boolean
  readonly withdrawnAt: string | null
  readonly withdrawnReason: string | null
}

export interface DeliveryView {
  readonly id: string
  readonly connectionId: string
  readonly connectionLabel: string
  readonly receivedAt: string
  readonly origin: string
  readonly reference: string
  readonly coveringFrom: string | null
  readonly coveringTo: string | null
  readonly recordsWritten: number
  readonly outcome: string
  readonly error: string | null
  readonly summary: Record<string, unknown>
}

export interface ConnectionsModel {
  readonly hotelName: string
  readonly mayRegister: boolean
  readonly connections: readonly ConnectionView[]
  readonly deliveries: readonly DeliveryView[]
  readonly sources: readonly { id: string; label: string }[]
}

/** The months a weather connection covers: its first month through the last complete one. */
export function weatherWindow(
  config: Record<string, unknown>,
  today: Date,
): { from: string; to: string } | null {
  const from =
    typeof config.from_month === 'string' && /^\d{4}-\d{2}$/.test(config.from_month)
      ? config.from_month
      : null
  const lastComplete = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
  const to = `${lastComplete.getUTCFullYear()}-${String(lastComplete.getUTCMonth() + 1).padStart(2, '0')}-${String(lastComplete.getUTCDate()).padStart(2, '0')}`
  if (!from || `${from}-01` > to) return null
  return { from: `${from}-01`, to }
}

export function baseTemperatures(config: Record<string, unknown>): number[] {
  const raw = Array.isArray(config.base_temperatures_c) ? config.base_temperatures_c : [18]
  const out = raw.map(Number).filter((n) => Number.isFinite(n) && n > -20 && n < 40)
  return out.length ? out : [18]
}
