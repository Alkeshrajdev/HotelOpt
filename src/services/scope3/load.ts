/**
 * Scope 3 for one property and one month — §13.11; T-57.
 *
 * Six categories are assembled here, each from what the product already holds, through
 * the same resolution path category 1 has always taken. The ports return lines resolved or
 * refused; the engine decides what each category is and what the fifteen rows say.
 *
 * WHERE EACH CATEGORY COMES FROM
 *   1, 2   the purchases register, split by the accounting flag on the line
 *   3      grid losses and upstream electricity on the metered electricity, and
 *          well-to-tank on every fuel, from the resource records
 *   5      the waste records, by stream and treatment
 *   6, 7   declared activity: journeys, nights and commutes
 * The rest are whatever the screening says, with its reason.
 */
import { emissionsKgCO2e } from '@/engine/ghg/emissions'
import { assembleScope3, categoryFigure } from '@/engine/scope3'
import type { CategoryFigure, ResolvedLine, Scope3Inventory, ScreeningRow } from '@/engine/scope3'
import { CATEGORY_NAMES, RESOURCE_LABEL, WTT_FUELS, activityMode, wasteLineLabel } from './model'

export interface PurchaseScope3Line {
  readonly description: string
  readonly capex: boolean
  readonly amountNet: string
  readonly currency: string
  readonly emissionsKg: string | null
  readonly refusal: string | null
}

export interface WasteScope3Line {
  readonly stream: string
  readonly treatmentClass: string | null
  readonly weightKg: string
  readonly emissionsKg: string | null
  readonly refusal: string | null
  readonly carriedForward: boolean
}

export interface ActivityScope3Line {
  readonly id: string
  readonly category: number
  readonly code: string
  readonly region: string | null
  readonly quantity: string
  readonly unit: string
  readonly description: string
  readonly emissionsKg: string | null
  readonly refusal: string | null
  readonly carriedForward: boolean
}

export interface EnergyScope3Line {
  readonly resource: string
  readonly quantity: string
  readonly unit: string
}

export interface GridScope3 {
  readonly tdValue: string | null
  readonly tdEdition: string | null
  readonly tdCarriedForward: boolean
  readonly tdRefusal: string | null
  readonly upstreamValue: string | null
  readonly upstreamEdition: string | null
  readonly upstreamCarriedForward: boolean
  readonly upstreamRefusal: string | null
}

export interface WttResolution {
  readonly emissionsKg: string | null
  readonly carriedForward: boolean
  readonly refusal: string | null
}

export interface Scope3Ports {
  readonly hotel: (
    hotelId: string,
  ) => Promise<{ tenantId: string; country: string; gridCode: string | null } | null>
  readonly period: (periodId: string) => Promise<{ hotelId: string; month: string } | null>
  readonly screening: (tenantId: string) => Promise<readonly ScreeningRow[]>
  /** Empty for a reader without procurement, as the register itself is. */
  readonly purchaseLines: (periodId: string) => Promise<readonly PurchaseScope3Line[]>
  readonly wasteLines: (periodId: string) => Promise<readonly WasteScope3Line[]>
  readonly activityLines: (periodId: string) => Promise<readonly ActivityScope3Line[]>
  readonly energyLines: (periodId: string) => Promise<readonly EnergyScope3Line[]>
  readonly gridScope3: (
    country: string,
    gridCode: string | null,
    onDate: string,
  ) => Promise<GridScope3>
  readonly wtt: (
    tenantId: string,
    code: string,
    unit: string,
    quantity: string,
    onDate: string,
  ) => Promise<WttResolution>
}

export interface Scope3Model {
  readonly inventory: Scope3Inventory
  readonly month: string
  /** Every line behind the figures, for the screen that wants to show its working. */
  readonly detail: ReadonlyMap<number, readonly ResolvedLine[]>
}

export class Scope3NotFound extends Error {}

function categoryThree(
  energy: readonly EnergyScope3Line[],
  grid: GridScope3,
  wttFor: (line: EnergyScope3Line) => Promise<WttResolution>,
): Promise<ResolvedLine[]> {
  return Promise.all(
    energy.flatMap((line): Promise<ResolvedLine>[] => {
      const label = RESOURCE_LABEL[line.resource] ?? line.resource
      if (line.resource === 'grid_electricity') {
        // Two lines for electricity, because the two halves are published separately and
        // Dubai has one of them: losses in the wires, and the upstream chain of generation.
        const td: ResolvedLine = {
          label: `${label}: transmission and distribution losses`,
          quantity: line.quantity,
          unit: line.unit,
          emissionsKg:
            grid.tdValue === null
              ? null
              : emissionsKgCO2e([
                  {
                    label,
                    quantity: line.quantity,
                    quantityUnit: line.unit,
                    factorValue: grid.tdValue,
                    factorUnit: `kgCO2e/${line.unit}`,
                  },
                ]),
          refusal: grid.tdRefusal,
          carriedForward: grid.tdCarriedForward,
        }
        const upstream: ResolvedLine = {
          label: `${label}: upstream generation`,
          quantity: line.quantity,
          unit: line.unit,
          emissionsKg:
            grid.upstreamValue === null
              ? null
              : emissionsKgCO2e([
                  {
                    label,
                    quantity: line.quantity,
                    quantityUnit: line.unit,
                    factorValue: grid.upstreamValue,
                    factorUnit: `kgCO2e/${line.unit}`,
                  },
                ]),
          refusal: grid.upstreamRefusal,
          carriedForward: grid.upstreamCarriedForward,
        }
        return [Promise.resolve(td), Promise.resolve(upstream)]
      }
      if (!WTT_FUELS.includes(line.resource)) {
        // Purchased cooling, heat and steam have no published upstream series in the
        // library. Said, so the category reads as partial rather than complete.
        return [
          Promise.resolve<ResolvedLine>({
            label: `${label}: well-to-tank`,
            quantity: line.quantity,
            unit: line.unit,
            emissionsKg: null,
            refusal: `no published upstream factor exists for ${label.toLowerCase()}`,
          }),
        ]
      }
      return [
        wttFor(line).then((r): ResolvedLine => ({
          label: `${label}: well-to-tank`,
          quantity: line.quantity,
          unit: line.unit,
          emissionsKg: r.emissionsKg,
          refusal: r.refusal,
          carriedForward: r.carriedForward,
        })),
      ]
    }),
  )
}

export async function loadScope3(
  ports: Scope3Ports,
  hotelId: string,
  periodId: string,
): Promise<Scope3Model> {
  const [hotel, period] = await Promise.all([ports.hotel(hotelId), ports.period(periodId)])
  if (!hotel || !period || period.hotelId !== hotelId) throw new Scope3NotFound(periodId)
  const onDate = `${period.month}-01`

  const [screening, purchases, waste, activity, energy] = await Promise.all([
    ports.screening(hotel.tenantId),
    ports.purchaseLines(periodId),
    ports.wasteLines(periodId),
    ports.activityLines(periodId),
    ports.energyLines(periodId),
  ])
  const grid = await ports.gridScope3(hotel.country, hotel.gridCode, onDate)

  const detail = new Map<number, readonly ResolvedLine[]>()
  const figures = new Map<number, CategoryFigure>()
  const set = (category: number, lines: readonly ResolvedLine[]) => {
    detail.set(category, lines)
    figures.set(category, categoryFigure(category, lines))
  }

  const purchaseLine = (p: PurchaseScope3Line): ResolvedLine => ({
    label: p.description,
    quantity: p.amountNet,
    unit: p.currency,
    emissionsKg: p.emissionsKg,
    refusal: p.refusal,
  })
  set(1, purchases.filter((p) => !p.capex).map(purchaseLine))
  set(2, purchases.filter((p) => p.capex).map(purchaseLine))

  set(
    3,
    await categoryThree(energy, grid, (line) =>
      ports.wtt(hotel.tenantId, line.resource, line.unit, line.quantity, onDate),
    ),
  )

  set(
    5,
    waste.map((w): ResolvedLine => ({
      label: wasteLineLabel(w.stream, w.treatmentClass),
      quantity: w.weightKg,
      unit: 'kg',
      emissionsKg: w.emissionsKg,
      refusal: w.refusal,
      carriedForward: w.carriedForward,
    })),
  )

  const activityLine = (a: ActivityScope3Line): ResolvedLine => {
    const mode = activityMode(a.code)
    // A mode that emits nothing is valued at zero because it IS zero, and the record
    // stays so the commute survey adds up to the headcount.
    const zero = mode?.zero === true
    return {
      label: `${a.description} (${mode?.label ?? a.code})`,
      quantity: a.quantity,
      unit: a.unit,
      emissionsKg: zero ? '0' : a.emissionsKg,
      refusal: zero ? null : a.refusal,
      carriedForward: a.carriedForward,
    }
  }
  set(6, activity.filter((a) => a.category === 6).map(activityLine))
  set(7, activity.filter((a) => a.category === 7).map(activityLine))

  const named = screening.map((s) => ({ ...s, name: CATEGORY_NAMES[s.category] ?? s.name }))
  return { inventory: assembleScope3(named, figures), month: period.month, detail }
}
