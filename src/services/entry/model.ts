/**
 * The month editor — §3, §6.
 *
 * One month, one hotel: the activity record that supplies every denominator, one row per
 * configured source, and the transitions the reader is actually permitted to make.
 *
 * Two things this deliberately does not do.
 *
 * It does not decide whether a write will succeed. `permitted` here says which controls
 * EXIST, because §2.4 puts a module the reader does not hold outside navigation rather
 * than behind an error. The database asks the same question again when the write arrives,
 * and it is the database's answer that governs — a hidden button is a courtesy, and a
 * shown one is not a promise.
 *
 * It does not compute anything. No total, no intensity, no variance. The month editor is
 * where figures are ENTERED; what they mean is the engine's business, and a subtotal drawn
 * here would be a second implementation of a formula that already exists (standing rule 1).
 */

export type PeriodStatus = 'draft' | 'submitted' | 'returned' | 'approved' | 'locked'

export interface EntryPermissions {
  /** Data categories the reader may create and edit at this hotel. */
  readonly editableCategories: readonly string[]
  /** approval:V — may open a month's review, accept a flag, request a reopen. */
  readonly canReview: boolean
  readonly canSubmit: boolean
  readonly canApprove: boolean
  readonly canReturn: boolean
  readonly canReopen: boolean
}

export interface ActivityValues {
  readonly grossArn: string | null
  readonly roomsOutOfOrder: string | null
  readonly occupiedRoomNights: string | null
  /**
   * The denominator App. C.2 puts waste intensity on. A separate figure from occupied room
   * nights, not a restatement of it: two guests in one room are one room night and two
   * guest nights, and a hotel's waste tracks the guests.
   */
  readonly guestNights: string | null
  /** True where the stored figure was worked out from a factor rather than counted. */
  readonly guestNightsDerived: boolean
  readonly guestsPerRoomFactor: string | null
  readonly guestsPerRoomSource: string | null
  readonly fbCovers: string | null
  readonly note: string | null
}

export interface EvidenceDocument {
  readonly documentId: string
  readonly storagePath: string
  readonly documentType: string
  readonly checksum: string
  /** True where it was attached to a figure that has since been replaced (§6.6). */
  readonly supersededReading: boolean
}

export interface SourceRow {
  readonly sourceId: string
  readonly resource: string
  readonly label: string
  readonly provider: string | null
  readonly accountReference: string | null
  readonly unit: string
  /** The data category this source belongs to, which is what bounds the grant. */
  readonly category: string
  readonly value: string | null
  readonly qualityTier: 'measured' | 'estimated' | 'proxy' | null
  readonly estimationMethod: string | null
  /**
   * What the bill charged for this reading, in the currency it was incurred in (I-05), or
   * null where the bill carried no cost — which is not zero (SPEC-04F §3.6).
   */
  readonly cost: string | null
  readonly costCurrency: string | null
  /** Standing, capacity and demand charges where the bill separates them (§3.3). */
  readonly fixedCharges: string | null
  /** How many superseded values sit behind the current one (§6.6). */
  readonly correctionCount: number
  /** False where the reader holds no create-and-edit on this source's category. */
  readonly editable: boolean
  /** Every document attached to any version of this figure, newest first. */
  readonly evidence: readonly EvidenceDocument[]
}

/**
 * A waste line as the editor shows it back.
 *
 * Not "a waste record": what identifies a line is the stream, where it went, and how that
 * destination was established. Two of those are choices the person makes and can get
 * wrong, which is why the id is here — it is what a correction names (migration 029).
 */
export interface WasteLine {
  readonly id: string
  readonly stream: string
  readonly streamLabel: string
  readonly destinationId: string | null
  readonly destinationName: string | null
  readonly destinationMethod: DestinationMethod
  /** Null exactly where no destination was established — an outcome, not a gap (§15.4.1). */
  readonly treatmentClass: string | null
  readonly weightKg: string
  readonly weightBasis: WeightBasis
  readonly sourceOfRecord: WasteSourceKind
  readonly qualityTier: 'measured' | 'estimated' | 'proxy'
  readonly estimationMethod: string | null
}

export interface WasteDestination {
  readonly id: string
  readonly name: string
  readonly treatmentClass: string
  readonly treatmentClassLabel: string
  readonly onSite: boolean
}

export interface WasteBlock {
  /** False where the reader holds no create-and-edit on the waste category. */
  readonly editable: boolean
  readonly lines: readonly WasteLine[]
  /** Every facility this client may send waste to, plus the shared reference ones. */
  readonly destinations: readonly WasteDestination[]
}

export type DestinationMethod =
  'collection_ticket' | 'collection_named' | 'route_derived' | 'not_established'

export type WeightBasis = 'weighed' | 'container_count' | 'estimated'

export type WasteSourceKind =
  'weighbridge_ticket' | 'contractor_statement' | 'weighed_capture' | 'estimated_capture'

/**
 * §15.4.1's ranks, in the order the guide ranks them, said as what the person actually
 * did rather than as the enum value. The order is the rank order: the list a person picks
 * from is the evidence hierarchy, so picking further down the list is visibly a weaker
 * claim.
 */
const DESTINATION_METHOD_DETAIL: Record<
  DestinationMethod,
  { readonly label: string; readonly hint: string }
> = {
  collection_ticket: {
    label: 'A ticket from the collection names the facility',
    hint: 'The strongest evidence: the document for this collection says where it went.',
  },
  collection_named: {
    label: 'The collection record names the facility',
    hint: 'Recorded against the collection, without a ticket for this load.',
  },
  route_derived: {
    label: 'Taken from the standing route for this stream',
    hint: 'No record for this collection; the destination is the one this stream normally goes to.',
  },
  not_established: {
    label: 'Not established',
    hint: 'Nothing evidences where this went. The weight still counts in the total, and in neither diversion figure.',
  },
}

/**
 * §15.4.1's ranks, IN RANK ORDER — strongest evidence first. The order is the content: a
 * person picking further down this list can see they are making a weaker claim, which an
 * alphabetical or arbitrary list would hide.
 *
 * The order is written out rather than taken from Object.keys, whose order is a property
 * of the object literal and not of the guide.
 */
export const DESTINATION_METHOD_ORDER: readonly DestinationMethod[] = [
  'collection_ticket',
  'collection_named',
  'route_derived',
  'not_established',
]

export const DESTINATION_METHODS: readonly {
  readonly value: DestinationMethod
  readonly label: string
  readonly hint: string
}[] = DESTINATION_METHOD_ORDER.map((value) => ({ value, ...DESTINATION_METHOD_DETAIL[value] }))

/** Total by type, so a rank added to the enum cannot reach a screen without its sentence. */
export function destinationMethodHint(method: DestinationMethod): string {
  return DESTINATION_METHOD_DETAIL[method].hint
}

export const WEIGHT_BASES: readonly { readonly value: WeightBasis; readonly label: string }[] = [
  { value: 'weighed', label: 'Weighed' },
  { value: 'container_count', label: 'Counted containers and converted' },
  { value: 'estimated', label: 'Estimated' },
]

export const WASTE_SOURCE_KINDS: readonly {
  readonly value: WasteSourceKind
  readonly label: string
}[] = [
  { value: 'weighbridge_ticket', label: 'Weighbridge ticket' },
  { value: 'contractor_statement', label: 'Contractor statement' },
  { value: 'weighed_capture', label: 'Weighed on site' },
  { value: 'estimated_capture', label: 'Estimated on site' },
]

const TREATMENT_CLASS_LABEL: Record<string, string> = {
  recycling: 'Recycling',
  organic_treatment: 'Organic treatment',
  reuse: 'Reuse',
  energy_recovery: 'Energy recovery',
  landfill: 'Landfill',
  incineration_no_recovery: 'Incineration without recovery',
  other_disposal: 'Other disposal',
}

export function labelForTreatmentClass(cls: string): string {
  return TREATMENT_CLASS_LABEL[cls] ?? cls
}

export interface MonthEditorModel {
  readonly hotelId: string
  readonly hotelName: string
  /** The client's reporting currency, which a cost entered without one is recorded in (I-05). */
  readonly currency: string | null
  readonly periodId: string
  readonly month: string
  readonly status: PeriodStatus
  /** Set only where the month was returned; shown to whoever has to correct it (§3.2). */
  readonly returnedReason: string | null
  /**
   * Set only where an APPROVED month was reopened — a published figure being restated.
   *
   * Separate from returnedReason and more serious than it: a returned month was never
   * published, and this one was. reopen_period nulls approved_by and approved_at, so
   * without this the month is indistinguishable from one nobody ever finished (CON-05).
   */
  readonly restatement: Restatement | null
  readonly submittedByName: string | null
  readonly approvedByName: string | null
  readonly activity: ActivityValues
  readonly sources: readonly SourceRow[]
  readonly waste: WasteBlock
  /** Entry is closed while a month is submitted, approved or locked (O-03). */
  readonly openForEntry: boolean
  readonly permitted: EntryPermissions
  /**
   * Why the submit control is unavailable, in words, where it is unavailable for a reason
   * the reader can act on. Null when submitting is possible, and null when the reader
   * simply does not hold submit — an absent permission is not an instruction.
   */
  readonly submitBlockedBecause: string | null
}

/** The approval a reopening undid, and why it was undone. */
export interface Restatement {
  readonly reason: string
  readonly reopenedAt: string | null
  readonly reopenedByName: string | null
  readonly previouslyApprovedAt: string | null
  readonly previouslyApprovedByName: string | null
}

/**
 * What a reopening undid, in one sentence.
 *
 * The reason alone is not enough. "The supplier reissued the bill" does not tell a reader
 * that a figure which had been approved and published is the thing being changed, nor from
 * when — and that is precisely what makes a reopened month different from a draft.
 */
export function restatementSentence(
  r: Restatement,
  status: PeriodStatus,
  formatOn: (iso: string) => string,
): string {
  const approved =
    r.previouslyApprovedAt === null
      ? 'This month had been approved'
      : `This month was approved on ${formatOn(r.previouslyApprovedAt.slice(0, 10))}`
  const by = r.previouslyApprovedByName === null ? '' : ` by ${r.previouslyApprovedByName}`
  const reopened =
    r.reopenedAt === null ? 'reopened' : `reopened on ${formatOn(r.reopenedAt.slice(0, 10))}`
  const reopenedBy = r.reopenedByName === null ? '' : ` by ${r.reopenedByName}`

  // The record survives re-approval, deliberately: a figure that was restated says so
  // permanently (CON-05). But the TENSE has to follow the month. Left in the present
  // continuous it told a reader that a finished restatement was still in progress —
  // observed on the deployed platform the moment a reopened month was approved again.
  const settled = status === 'approved' || status === 'locked'
  const lead = settled ? 'This figure was restated.' : 'Restating an approved figure.'
  const tail = settled ? ' It has since been approved again.' : ''
  return `${lead} ${approved}${by}, then ${reopened}${reopenedBy}: ${r.reason}${tail}`
}

const RESOURCE_LABEL: Record<string, string> = {
  grid_electricity: 'Grid electricity',
  district_cooling: 'District cooling',
  purchased_heat: 'Purchased heat',
  purchased_steam: 'Purchased steam',
  piped_gas: 'Piped gas',
  onsite_generation: 'On-site generation',
  water_municipal: 'Municipal water',
  water_tse: 'Treated sewage effluent',
  water_groundwater: 'Groundwater',
  water_desalinated: 'Desalinated water',
  water_tankered: 'Tankered water',
  water_cooling_makeup: 'Cooling make-up water',
  delivered_diesel: 'Delivered diesel',
  delivered_lpg: 'Delivered LPG',
  delivered_other: 'Delivered fuel (other)',
}

export function labelForResource(resource: string): string {
  return RESOURCE_LABEL[resource] ?? resource
}

/**
 * Mirrors data.category_of_resource in migration 022. The two must agree: this decides
 * which fields are offered and that one decides which writes are accepted, so a
 * disagreement is a field that always fails.
 */
export function categoryOfResource(resource: string): string {
  if (
    [
      'grid_electricity',
      'district_cooling',
      'purchased_heat',
      'purchased_steam',
      'piped_gas',
      'onsite_generation',
    ].includes(resource)
  ) {
    return 'energy'
  }
  if (
    [
      'water_municipal',
      'water_tse',
      'water_groundwater',
      'water_desalinated',
      'water_tankered',
      'water_cooling_makeup',
    ].includes(resource)
  ) {
    return 'water'
  }
  return 'fuel'
}

/**
 * What loads into the "guest nights counted" field.
 *
 * Empty for a DERIVED figure, and the stored number for a stated one. A derived figure is
 * an output — occupied room nights multiplied by a factor — and putting it in the field a
 * person types a count into means the next save of that form, for any reason at all, sends
 * it back as a figure the property counted. The provenance would flip from derived to
 * stated without anybody touching it, which is precisely the claim App. C.2's quality
 * reporting relies on.
 *
 * Here rather than in the component so it can be asserted; the component reads it.
 */
export function guestNightsFieldValue(activity: ActivityValues): string {
  if (activity.guestNightsDerived) return ''
  return activity.guestNights ?? ''
}

export const OPEN_STATUSES: readonly PeriodStatus[] = ['draft', 'returned']

export function isOpenForEntry(status: PeriodStatus): boolean {
  return OPEN_STATUSES.includes(status)
}

/**
 * The reason submitting is unavailable, or null.
 *
 * §6.2 makes the denominator part of the month: a month with no occupied room nights can
 * produce no intensity, so submitting it spends an approver's attention on a month that
 * cannot answer the question anyone opens it to ask. data.submit_period refuses it; this
 * says so before the click rather than after it.
 */
export function submitBlockedBecause(
  status: PeriodStatus,
  activity: ActivityValues,
  canSubmit: boolean,
  sources: readonly SourceRow[] = [],
): string | null {
  if (!canSubmit) return null
  if (!isOpenForEntry(status)) return null
  if (activity.occupiedRoomNights === null || activity.occupiedRoomNights.trim() === '') {
    return 'Enter the occupied room nights first. Without them this month has no denominator, so no intensity can be produced from it.'
  }
  if (Number(activity.occupiedRoomNights) <= 0) {
    return 'Occupied room nights must be above zero for this month to produce an intensity.'
  }

  // A supply the hotel is configured for and nobody has read. data.submit_period refuses
  // it (migration 047); this says so before the click, because a refusal somebody could
  // have seen coming should have been a warning.
  //
  // The sources are already loaded — the editor draws a field for each — so this needs no
  // second query and cannot disagree with what is on the screen.
  const unread = sources.filter((s) => s.value === null)
  if (unread.length > 0) {
    const names = unread.map((s) => s.label).join(', ')
    const theirs = unread.filter((s) => !s.editable)
    // Naming what this reader cannot do themselves matters more than naming what they can.
    // "Record the reading" is not an instruction to somebody without the category, and a
    // message that gives one sends them to a field that will refuse them.
    const whoElse =
      theirs.length === 0
        ? ''
        : ` ${theirs.map((s) => s.label).join(' and ')} ${theirs.length === 1 ? 'is' : 'are'} outside what you hold here, so somebody with that category has to enter ${theirs.length === 1 ? 'it' : 'them'}.`
    return (
      `${names} ${unread.length === 1 ? 'has' : 'have'} no reading for this month. ` +
      `Record the reading, or 0 if the supply was not used, or close the supply if it has ended — ` +
      `a total computed from some of a hotel's supplies is not a smaller total, it is a wrong one.${whoElse}`
    )
  }
  return null
}

/**
 * The first day of the month after this one — the exclusive end of a reporting period.
 *
 * Here rather than in the port so it can be asserted. It decides which supplies a month's
 * editor offers: a meter registered from September must not appear on July's editor,
 * because offering it invites a reading for a month the meter did not exist in, and
 * nothing downstream would question a figure that arrived through the normal form.
 *
 * Plain arithmetic, not a Date. A Date built from 'YYYY-MM-DD' is parsed as UTC midnight
 * and formatted in the reader's zone, which moves the boundary for anyone west of
 * Greenwich; the bug is invisible in London.
 */
export function nextMonthAfter(firstOfMonth: string): string {
  const year = Number(firstOfMonth.slice(0, 4))
  const month = Number(firstOfMonth.slice(5, 7))
  const absolute = year * 12 + (month - 1) + 1
  return `${Math.floor(absolute / 12)}-${String((absolute % 12) + 1).padStart(2, '0')}-01`
}
