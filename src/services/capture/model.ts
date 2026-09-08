/**
 * Capture — the three channels that are not a keyboard (SPEC-03D · D4, D5, D6).
 *
 * D4 a file at onboarding, D5 a document read by a model and confirmed by a person, D6 a
 * scan at a bin. Each has a table, a set of database functions that hold every rule, and a
 * screen. This module is the read side: what a screen shows about what has arrived.
 */

export type ImportKind = 'history' | 'procurement' | 'travel' | 'survey_results'

export interface RowOutcome {
  readonly row: number
  readonly outcome: 'accepted' | 'refused' | 'duplicate'
  readonly detail: string
}

export interface ImportBatchRow {
  readonly id: string
  readonly kind: ImportKind
  readonly fileName: string
  readonly sourceSystem: string
  readonly rowsTotal: number
  readonly rowsAccepted: number
  readonly rowsRejected: number
  readonly outcomes: readonly RowOutcome[]
  readonly createdAt: string
  readonly finishedAt: string | null
  readonly attestedAt: string | null
  readonly attestedBy: string | null
  readonly attestationNote: string | null
}

export type ExtractionStatus =
  'screening' | 'reading' | 'ready' | 'confirmed' | 'failed' | 'unavailable'
export type DocumentClass = 'invoice' | 'waste_transfer_note' | 'delivery_note'

/** The fields a reader is asked for. A field it could not read is null, never a guess. */
export interface ReadFields {
  readonly period_start: string | null
  readonly supplier: string | null
  readonly account_reference: string | null
  readonly quantity: string | null
  readonly unit: string | null
  readonly cost_total: string | null
  readonly currency: string | null
  readonly fixed_charges: string | null
  readonly document_date: string | null
}

export const EMPTY_FIELDS: ReadFields = {
  period_start: null,
  supplier: null,
  account_reference: null,
  quantity: null,
  unit: null,
  cost_total: null,
  currency: null,
  fixed_charges: null,
  document_date: null,
}

export interface ExtractionRow {
  readonly id: string
  readonly documentId: string
  readonly storagePath: string
  readonly documentClass: DocumentClass
  readonly status: ExtractionStatus
  readonly fieldsRead: ReadFields
  readonly failure: string | null
  readonly modelVersion: string | null
  readonly createdAt: string
  readonly reviewedAt: string | null
  readonly periodId: string | null
  readonly recordId: string | null
}

export interface CaptureCodeRow {
  readonly id: string
  readonly pointReference: string
  readonly pointName: string
  readonly locationNote: string | null
  readonly stream: string
  readonly weightBasis: string
  readonly issuedAt: string
  readonly retiredAt: string | null
  readonly retiredReason: string | null
  readonly capturesLast30Days: number
}

export interface CaptureModel {
  readonly hotelName: string
  readonly mayImportHistory: boolean
  readonly mayAttest: boolean
  readonly mayHandleDocuments: boolean
  readonly mayIssueCodes: boolean
  readonly batches: readonly ImportBatchRow[]
  readonly extractions: readonly ExtractionRow[]
  readonly codes: readonly CaptureCodeRow[]
  /** The hotel's open months and registered supplies, for the confirmation form. */
  readonly periods: readonly {
    readonly id: string
    readonly month: string
    readonly status: string
  }[]
  readonly sources: readonly {
    readonly id: string
    readonly resource: string
    readonly label: string
    readonly unit: string
  }[]
  readonly wastePoints: readonly {
    readonly id: string
    readonly reference: string
    readonly name: string
    readonly streams: readonly string[]
  }[]
}

export const STREAM_LABEL: Readonly<Record<string, string>> = {
  general_mixed: 'General waste',
  mixed_recyclables: 'Mixed recyclables',
  paper_card: 'Paper and card',
  plastics: 'Plastics',
  glass: 'Glass',
  metals: 'Metals',
  food_organic: 'Food waste',
  garden_green: 'Garden waste',
  cooking_oil: 'Cooking oil',
  e_waste: 'Electronic waste',
  batteries: 'Batteries',
  textiles: 'Textiles',
  hazardous: 'Hazardous waste',
  construction_demolition: 'Construction waste',
  other: 'Other',
}

export function streamLabel(stream: string): string {
  return STREAM_LABEL[stream] ?? stream.replaceAll('_', ' ')
}

/**
 * Which of a confirmed field's values came from the reader and which were typed (C-14).
 * A confirmed value that equals what was read is 'extracted'; anything else, including a
 * value where nothing was read, is 'typed'.
 */
export function provenanceOf(
  read: ReadFields,
  confirmed: Readonly<Record<string, string | null>>,
): Record<string, 'extracted' | 'typed'> {
  const out: Record<string, 'extracted' | 'typed'> = {}
  for (const [key, value] of Object.entries(confirmed)) {
    const was = (read as unknown as Record<string, string | null>)[key] ?? null
    out[key] =
      value !== null && value !== '' && was !== null && was.trim() === value.trim()
        ? 'extracted'
        : 'typed'
  }
  return out
}

/**
 * A CSV of history, one row per month and resource. The first line names the columns;
 * order is free. Commas inside a value are not supported: a bill is a number, a month is a
 * date and a resource is a code, so nothing here needs one.
 */
export interface HistoryRow {
  readonly line: number
  readonly month: string
  readonly grossArn: string
  readonly roomsOutOfOrder: string
  readonly occupiedRoomNights: string
  readonly guestNights: string
  readonly resource: string
  readonly value: string
  readonly qualityTier: string
  readonly cost: string
  readonly currency: string
}

export const HISTORY_COLUMNS = [
  'month',
  'gross_arn',
  'rooms_out_of_order',
  'occupied_room_nights',
  'guest_nights',
  'resource',
  'value',
  'quality_tier',
  'cost',
  'currency',
] as const

export function parseHistoryCsv(text: string): { rows: HistoryRow[]; problems: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  const problems: string[] = []
  if (lines.length === 0) return { rows: [], problems: ['The file is empty.'] }
  const header = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase())
  const index = (name: string) => header.indexOf(name)
  for (const required of ['month', 'gross_arn', 'occupied_room_nights', 'resource', 'value']) {
    if (index(required) === -1) problems.push(`The header has no "${required}" column.`)
  }
  if (problems.length > 0) return { rows: [], problems }
  const cell = (cols: string[], name: string) => {
    const i = index(name)
    return i === -1 ? '' : (cols[i] ?? '').trim()
  }
  const rows: HistoryRow[] = []
  lines.slice(1).forEach((line, i) => {
    const cols = line.split(',')
    rows.push({
      line: i + 2,
      month: cell(cols, 'month'),
      grossArn: cell(cols, 'gross_arn'),
      roomsOutOfOrder: cell(cols, 'rooms_out_of_order'),
      occupiedRoomNights: cell(cols, 'occupied_room_nights'),
      guestNights: cell(cols, 'guest_nights'),
      resource: cell(cols, 'resource'),
      value: cell(cols, 'value'),
      qualityTier: cell(cols, 'quality_tier') || 'proxy',
      cost: cell(cols, 'cost'),
      currency: cell(cols, 'currency'),
    })
  })
  return { rows, problems }
}
