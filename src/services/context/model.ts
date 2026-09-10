/**
 * The context selector — §2.5, §4.1.
 *
 * A user reaches a hotel by choosing it from what their grants allow, never by typing an
 * identifier into the address bar and hoping. The list is therefore not "all hotels filtered
 * for you" — it is the result of a query that cannot see anything else, because RLS answers
 * it. A hotel outside the reader's grants does not appear here and returns 404 when reached
 * directly, which is the same answer the API gives (T-60).
 *
 * The grouping is by portfolio because that is the unit a portfolio admin thinks in. A hotel
 * with no portfolio is not hidden and not silently attached to one: it is listed under its
 * own heading, because a hotel nobody has filed is a fact about the client's setup and
 * suppressing it would make the count on this page disagree with the count in the database.
 */

export interface ContextHotel {
  readonly id: string
  readonly name: string
  readonly city: string | null
  /** 'YYYY-MM' of the most recent reporting period, or null where none has been opened. */
  readonly latestMonth: string | null
  readonly latestStatus: string | null
  /** Months sitting in draft or returned. A count, not a judgement. */
  readonly openMonths: number
}

export interface ContextGroup {
  readonly id: string | null
  readonly name: string
  readonly hotels: readonly ContextHotel[]
}

export interface ContextModel {
  readonly groups: readonly ContextGroup[]
  readonly hotelCount: number
}

export const UNGROUPED_LABEL = 'Not in a portfolio'

export interface ContextPorts {
  readonly portfolios: () => Promise<readonly { id: string; name: string }[]>
  readonly hotels: () => Promise<
    readonly {
      id: string
      name: string
      city: string | null
      portfolioId: string | null
    }[]
  >
  readonly periodSummary: (
    hotelIds: readonly string[],
  ) => Promise<
    ReadonlyMap<
      string,
      { latestMonth: string | null; latestStatus: string | null; openMonths: number }
    >
  >
}

export async function loadContextModel(ports: ContextPorts): Promise<ContextModel> {
  const [portfolios, hotels] = await Promise.all([ports.portfolios(), ports.hotels()])
  const summary = await ports.periodSummary(hotels.map((h) => h.id))

  const decorate = (h: (typeof hotels)[number]): ContextHotel => {
    const s = summary.get(h.id)
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      latestMonth: s?.latestMonth ?? null,
      latestStatus: s?.latestStatus ?? null,
      openMonths: s?.openMonths ?? 0,
    }
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

  const groups: ContextGroup[] = portfolios
    .slice()
    .sort(byName)
    .map((p) => ({
      id: p.id,
      name: p.name,
      hotels: hotels
        .filter((h) => h.portfolioId === p.id)
        .map(decorate)
        .sort(byName),
    }))
    // A portfolio the reader can see but which holds no hotel they can see would render as
    // an empty heading. It is dropped rather than shown empty: the heading would state a
    // scope the reader does not actually have.
    .filter((g) => g.hotels.length > 0)

  const ungrouped = hotels
    .filter((h) => h.portfolioId === null)
    .map(decorate)
    .sort(byName)

  if (ungrouped.length > 0) {
    groups.push({ id: null, name: UNGROUPED_LABEL, hotels: ungrouped })
  }

  return { groups, hotelCount: groups.reduce((n, g) => n + g.hotels.length, 0) }
}
