/**
 * Turning a month's energy into a carbon card — App. F, §5.2, §24.1.
 *
 * THE ABSENCE RULE IS THE POINT. Appendix F says a figure with no approved factor is not
 * calculated, the input is disclosed, and nothing is substituted. There is no
 * nearest-geography fallback, no last-year's-factor, no zero. So this module's main job is
 * to refuse well: where any energy input the hotel used has no factor in force for the
 * period, the whole card declines and names that input, because a carbon total missing one
 * of its sources looks exactly like a complete one.
 *
 * WHY BOTH PERIODS. The card §5.2 specifies is not a number, it is a DECOMPOSITION: how
 * much of the change came from using less, and how much from a cleaner grid. That needs
 * this period and the base period, each with its own quantity and its own factor in force
 * at the time. A hotel with no approved prior year therefore has no card — not because the
 * emissions cannot be computed, but because the thing the card says cannot be said.
 */
import { emissionsKgCO2e } from '@/engine/ghg'
import { resolveFactor } from '@/engine/factors'
import type { FactorVersion } from '@/engine/factors'
import type { DecompositionInput } from '@/engine/kpi'
import { dec } from '@/engine/rounding'
import { formatQuantity } from '@/i18n'
import type { Locale } from '@/i18n'
import { activityFactorNotes, activityFactorSource, activityFactorUnit } from './activityFactor'
import type { ActivityFactorResolution } from './activityFactor'
import type { RefrigerantLosses } from './refrigerants'
import { gridFactorNotes } from './gridFactor'
import { scopeCoverage } from './scopes'
import type { GridFactorResolution } from './gridFactor'
import { buildCarbonCard } from './carbon'
import type { CarbonCard } from './carbon'
import type { DeclaredPlaceholder } from './model'
import { declaredPlaceholder } from './model'

const KG_PER_TONNE = 1000

/** The emission factor code for each metered energy resource. */
const FACTOR_CODE: Record<string, string> = {
  grid_electricity: 'grid_electricity',
  district_cooling: 'district_cooling',
  purchased_heat: 'purchased_heat',
  purchased_steam: 'purchased_steam',
  piped_gas: 'piped_gas',
  delivered_diesel: 'diesel',
  delivered_lpg: 'lpg',
}

const RESOURCE_LABEL: Record<string, string> = {
  grid_electricity: 'Grid electricity',
  district_cooling: 'District cooling',
  purchased_heat: 'Purchased heat',
  purchased_steam: 'Purchased steam',
  piped_gas: 'Piped gas',
  delivered_diesel: 'Delivered diesel',
  delivered_lpg: 'Delivered LPG',
}

export interface EnergyLine {
  readonly resource: string
  readonly kwh: string
  readonly unit: string
}

export interface CarbonInput {
  readonly locale: Locale
  readonly catalogue: readonly FactorVersion[]
  /**
   * Grid electricity does not come from the catalogue. It comes from the governed grid
   * database, which answers by property rather than by country — a national average is
   * refused in the eleven countries where one would misstate — and which carries the gas
   * basis, the vintage and the reliability grade with the number.
   */
  readonly gridCurrent: GridFactorResolution | null
  readonly gridBase: GridFactorResolution | null
  /**
   * Fuels, from the published library, keyed by resource. Scope 1 has no answer without
   * these: the governed set store holds no fuel factor and never did, so before this
   * every property in the product reported Scope 2 only.
   *
   * A resource missing from the map has nothing bound to it and falls through to the
   * governed store, which is how district cooling keeps its demonstration placeholder.
   */
  readonly activityCurrent: ReadonlyMap<string, ActivityFactorResolution>
  readonly activityBase: ReadonlyMap<string, ActivityFactorResolution>
  /**
   * Refrigerant losses for the two months, computed through the engine before they arrive
   * here. They join the headline rather than sitting beside it: gross operational
   * emissions means Scope 1 plus Scope 2, and a leak is Scope 1.
   */
  readonly refrigerantCurrent: RefrigerantLosses
  readonly refrigerantBase: RefrigerantLosses
  /** The country the hotel is in. Matching is exact — App. F has no nearest geography. */
  readonly scope: string
  /** 'YYYY-MM'. */
  readonly month: string
  readonly current: readonly EnergyLine[]
  /** The same month a year earlier, or null where none is approved. */
  readonly baseMonth: string | null
  readonly base: readonly EnergyLine[]
  readonly occupiedRoomNights: string | null
  readonly hotelHref: string
  /** Whether this reader holds procurement here at all. See ScopeInput.purchasesVisible. */
  readonly purchasesVisible: boolean
  /** Scope 3 category 1 for the same month, where any purchase lines were computed. */
  readonly purchasedGoodsKg: string | null
  readonly purchaseLinesTotal: number
  readonly purchaseLinesUncomputed: number
}

/** The first day of a month, which is the date a factor is resolved for. */
function dateOf(month: string): string {
  return `${month}-01`
}

/**
 * Resolve every line's factor, or return the first refusal.
 *
 * First rather than all: the reader needs to know the card cannot be produced and why,
 * and a list of four refusals for a hotel whose factors were never published is four ways
 * of saying the same thing.
 */
function resolveAll(
  lines: readonly EnergyLine[],
  catalogue: readonly FactorVersion[],
  scope: string,
  month: string,
  grid: GridFactorResolution | null,
  activity: ReadonlyMap<string, ActivityFactorResolution>,
):
  | { readonly ok: true; readonly factors: ReadonlyMap<string, FactorVersion> }
  | {
      readonly ok: false
      readonly outcome: string
      readonly detail: string
    } {
  const factors = new Map<string, FactorVersion>()
  for (const line of lines) {
    const label = RESOURCE_LABEL[line.resource] ?? line.resource

    // Grid electricity is answered by the grid database, not the catalogue. Its refusals
    // are already sentences a person can act on — "name the grid it draws from", "the
    // factor on file is held and must not be used" — so they are passed through rather
    // than restated in this module's own words.
    if (line.resource === 'grid_electricity') {
      if (grid === null || !grid.usable || grid.value === null) {
        return {
          ok: false,
          outcome: 'Not calculated — no approved factor',
          detail:
            grid?.refusal ??
            `no grid electricity factor could be resolved for this property in ${month}`,
        }
      }
      factors.set(line.resource, {
        id: `grid:${grid.edition ?? 'unknown'}`,
        type: 'emission',
        code: 'grid_electricity',
        scope,
        version: grid.edition ?? '',
        source: grid.sourceReference ?? '',
        value: grid.value,
        unit: 'kgCO2e/kWh',
        status: 'active',
        effectiveFrom: dateOf(month),
        effectiveTo: null,
      })
      continue
    }

    // The published library first, where a binding says which series this resource
    // resolves to. It is the governed answer for a burned fuel and the only one: the set
    // store holds none. A refusal from here is passed through in its own words, because
    // it names the thing a person can act on — "no factor is bound to delivered_lpg in
    // kilograms" tells somebody exactly what to add.
    const bound = activity.get(line.resource)
    if (bound) {
      if (bound.value === null) {
        return {
          ok: false,
          outcome: 'Not calculated — no approved factor',
          detail: bound.refusal ?? `no published factor could be resolved for ${label} in ${month}`,
        }
      }
      factors.set(line.resource, {
        id: `published:${bound.publisher ?? 'unknown'}:${bound.activityPath.join('/')}`,
        type: 'emission',
        code: FACTOR_CODE[line.resource] ?? line.resource,
        scope,
        version: bound.edition ?? '',
        source: activityFactorSource(bound),
        value: bound.value,
        unit: activityFactorUnit(bound),
        status: 'active',
        effectiveFrom: dateOf(month),
        effectiveTo: null,
      })
      continue
    }

    const code = FACTOR_CODE[line.resource]
    if (code === undefined) {
      return {
        ok: false,
        outcome: 'Not calculated — no approved factor',
        detail: `${label} has no emission factor code, so no factor can be looked up for it`,
      }
    }
    const resolution = resolveFactor(catalogue, {
      type: 'emission',
      code,
      scope,
      // The period the figure belongs to, never the date the calculation runs (App. F).
      periodDate: dateOf(month),
      inputDescription: `${label}, ${line.kwh} ${line.unit}`,
    })
    if (!resolution.resolved) {
      return { ok: false, outcome: resolution.outcome, detail: resolution.detail }
    }
    factors.set(line.resource, resolution.factor)
  }
  return { ok: true, factors }
}

export function buildCarbon(input: CarbonInput): CarbonCard | DeclaredPlaceholder {
  if (input.current.length === 0) {
    return declaredPlaceholder(
      'Not yet available',
      'No approved energy record for this period, so there is nothing to apply a factor to.',
    )
  }

  const current = resolveAll(
    input.current,
    input.catalogue,
    input.scope,
    input.month,
    input.gridCurrent,
    input.activityCurrent,
  )
  if (!current.ok) {
    // Appendix F's own wording, with the reason the resolver gave. "No approved factor"
    // and "a factor exists but is not in force for this period" are different problems
    // for whoever has to fix them.
    return declaredPlaceholder(current.outcome, `${current.detail}.`)
  }

  if (input.baseMonth === null || input.base.length === 0) {
    return declaredPlaceholder(
      'Not yet available',
      'The carbon card states how much of a change came from consumption and how much from the factor, which needs an approved prior-year period. This hotel has none.',
    )
  }

  // THE ABSENCE RULE, APPLIED TO A LEAK. A refrigerant event that cannot be valued is the
  // same problem as an energy input with no approved factor, and gets the same answer: the
  // card is not produced. Reporting the gases that happened to resolve would state a Scope
  // 1 total that is missing part of itself, which is the failure the rule exists against.
  const refrigerantRefusal =
    input.refrigerantCurrent.lines.find((l) => l.refusal !== null) ??
    input.refrigerantBase.lines.find((l) => l.refusal !== null)
  if (refrigerantRefusal?.refusal) {
    return declaredPlaceholder(
      'Not calculated — no approved factor',
      `${refrigerantRefusal.refusal}`,
    )
  }

  const base = resolveAll(
    input.base,
    input.catalogue,
    input.scope,
    input.baseMonth,
    input.gridBase,
    input.activityBase,
  )
  if (!base.ok) {
    return declaredPlaceholder(
      base.outcome,
      `${base.detail}, so the prior-year figure this period would be compared against cannot be produced.`,
    )
  }

  // Every resource in either period, so a source that appeared or disappeared between the
  // two years is still decomposed — as a quantity change against its own factor, which is
  // what it is.
  const resources = [...new Set([...input.current, ...input.base].map((l) => l.resource))]
  const currentByResource = new Map(input.current.map((l) => [l.resource, l]))
  const baseByResource = new Map(input.base.map((l) => [l.resource, l]))

  const lines: DecompositionInput[] = []
  for (const resource of resources) {
    const factorCurrent = current.factors.get(resource) ?? base.factors.get(resource)
    const factorBase = base.factors.get(resource) ?? current.factors.get(resource)
    if (!factorCurrent || !factorBase) continue
    lines.push({
      sourceId: resource,
      activityCurrent: currentByResource.get(resource)?.kwh ?? '0',
      activityBase: baseByResource.get(resource)?.kwh ?? '0',
      factorCurrent: factorCurrent.value,
      factorBase: factorBase.value,
    })
  }

  // A leak decomposes exactly like a metered resource: quantity of gas against its global
  // warming potential. So it joins the same split rather than sitting outside it, and
  // "how much came from consumption and how much from the factor" stays an answer about
  // the whole figure. A gas present in one year and not the other decomposes as a quantity
  // change against its own factor, which is what it is.
  const refrigerantGases = [
    ...new Set(
      [...input.refrigerantCurrent.lines, ...input.refrigerantBase.lines].map((l) => l.gas),
    ),
  ]
  const refCurrentByGas = new Map(input.refrigerantCurrent.lines.map((l) => [l.gas, l]))
  const refBaseByGas = new Map(input.refrigerantBase.lines.map((l) => [l.gas, l]))
  for (const gas of refrigerantGases) {
    const gwp = refCurrentByGas.get(gas)?.gwpValue ?? refBaseByGas.get(gas)?.gwpValue
    const gwpBase = refBaseByGas.get(gas)?.gwpValue ?? refCurrentByGas.get(gas)?.gwpValue
    if (!gwp || !gwpBase) continue
    lines.push({
      sourceId: `refrigerant:${gas}`,
      activityCurrent: refCurrentByGas.get(gas)?.quantityEmittedKg ?? '0',
      activityBase: refBaseByGas.get(gas)?.quantityEmittedKg ?? '0',
      factorCurrent: gwp,
      factorBase: gwpBase,
    })
  }

  // Through the engine, which refuses a factor whose unit does not match the quantity's.
  // Refrigerant losses are added to the total rather than stated beside it: gross
  // operational emissions is Scope 1 plus Scope 2, and a leak is Scope 1.
  const currentKg = dec(
    emissionsKgCO2e(
      input.current.map((l) => ({
        label: RESOURCE_LABEL[l.resource] ?? l.resource,
        quantity: l.kwh,
        quantityUnit: l.unit,
        factorValue: current.factors.get(l.resource)!.value,
        factorUnit: current.factors.get(l.resource)!.unit,
      })),
    ),
  )
    .plus(dec(input.refrigerantCurrent.totalKgCO2e ?? '0'))
    .toFixed()
  const baseKg = dec(
    emissionsKgCO2e(
      input.base.map((l) => ({
        label: RESOURCE_LABEL[l.resource] ?? l.resource,
        quantity: l.kwh,
        quantityUnit: l.unit,
        factorValue: base.factors.get(l.resource)!.value,
        factorUnit: base.factors.get(l.resource)!.unit,
      })),
    ),
  )
    .plus(dec(input.refrigerantBase.totalKgCO2e ?? '0'))
    .toFixed()

  if (dec(baseKg).isZero()) {
    return declaredPlaceholder(
      'Not yet available',
      'The prior-year period produced no emissions, so a percentage change cannot be stated.',
    )
  }

  const tonnes = dec(currentKg).dividedBy(KG_PER_TONNE)

  // THE GAS BASIS OF THE TOTAL.
  //
  // A CO2-only factor produces a figure that omits methane and nitrous oxide. Labelling
  // that total 'tCO2e' claims a completeness it does not have — a small overstatement of
  // confidence, on the figure a hotel puts in its annual report. Abu Dhabi's grid factor
  // is CO2-only and Dubai's is CO2e, so this is not hypothetical: two properties in one
  // portfolio are on different bases.
  //
  // All CO2e is a CO2e total. All CO2 is a CO2 total, and says so in the unit. A mix stays
  // labelled CO2e — relabelling the whole thing CO2 would understate the inputs that DO
  // include the other gases — and names the inputs that are not, because that is the part
  // a reader cannot see from the number.
  const co2OnlyInputs = input.current
    .filter((l) => l.resource === 'grid_electricity' && input.gridCurrent?.gasBasis === 'CO2')
    .map((l) => RESOURCE_LABEL[l.resource] ?? l.resource)
  const allCo2Only = co2OnlyInputs.length > 0 && co2OnlyInputs.length === input.current.length
  const emissionsUnit = allCo2Only ? 'tCO2' : 'tCO2e'

  // Which scopes the headline covers, said rather than implied. Computed per resource so
  // that a hotel burning gas gets a Scope 1 and 2 figure and one buying only electricity is
  // told its number is Scope 2.
  const perResource = new Map<string, string>()
  for (const l of input.current) {
    const f = current.factors.get(l.resource)
    if (!f) continue
    perResource.set(
      l.resource,
      emissionsKgCO2e([
        {
          label: RESOURCE_LABEL[l.resource] ?? l.resource,
          quantity: l.kwh,
          quantityUnit: l.unit,
          factorValue: f.value,
          factorUnit: f.unit,
        },
      ]),
    )
  }
  const coverage = scopeCoverage({
    energyKg: perResource,
    refrigerantKg: input.refrigerantCurrent.totalKgCO2e,
    purchasesVisible: input.purchasesVisible,
    purchasedGoodsKg: input.purchasedGoodsKg,
    purchaseLinesTotal: input.purchaseLinesTotal,
    purchaseLinesUncomputed: input.purchaseLinesUncomputed,
  })

  const notes: string[] = []
  if (allCo2Only) {
    notes.push(
      'This total is stated as CO2 only. The factor its publisher provides covers carbon dioxide; methane and nitrous oxide are not included.',
    )
  } else if (co2OnlyInputs.length > 0) {
    notes.push(
      `${co2OnlyInputs.join(' and ')} is computed from a CO2-only factor, so that part of the total excludes methane and nitrous oxide.`,
    )
  }
  if (input.gridCurrent) {
    notes.push(...gridFactorNotes(input.gridCurrent, 'Grid electricity'))
  }
  // The same duty for a fuel: a figure computed from a superseded edition is a figure
  // about a different year's publication, and an assurer asks.
  for (const [resource, r] of input.activityCurrent) {
    notes.push(...activityFactorNotes(r, RESOURCE_LABEL[resource] ?? resource))
  }
  notes.push(...input.refrigerantCurrent.notes)

  // KILOGRAMS per occupied room night, not tonnes.
  //
  // App. C.2 sets this figure at two decimal places, and a hotel emits of the order of
  // tens of kilograms per room night: in tonnes that is 0.03, which is two decimal places
  // spent on a leading zero and a figure nobody can compare month to month. 27.31 is the
  // same quantity, legibly, and kgCO2e per occupied room night is the unit the industry
  // states it in.
  const intensity =
    input.occupiedRoomNights === null || dec(input.occupiedRoomNights).isZero()
      ? null
      : dec(currentKg).dividedBy(dec(input.occupiedRoomNights))

  return buildCarbonCard({
    kpi:
      intensity === null
        ? // Suppressed on the same rule as every other intensity: never zero, never
          // infinity (§5.2). The gross figure below still stands.
          { value: 'Not applicable', unit: '', label: 'Carbon intensity' }
        : {
            // Through the registry, like every other figure. The first version of this
            // card put `Decimal.toFixed()` on the screen and published
            // 0.02730561428571428571428571428571429 tCO2e/ORN — the same defect as the
            // toFixed(2) at a call site and the 624575.3999999999 float, in a third place.
            value: formatQuantity(intensity.toFixed(), 'intensity.carbon.orn', input.locale),
            unit: allCo2Only ? 'kgCO2/ORN' : 'kgCO2e/ORN',
            label: 'Carbon intensity',
          },
    grossOperational: {
      value: formatQuantity(tonnes.toFixed(), 'emissions.tco2e', input.locale),
      unit: emissionsUnit,
      // Named for what it covers. "Gross operational emissions" on a Scope 2 number is a
      // part described as a whole, and it is the label a reader copies into a report.
      label: coverage.headingLabel,
    },
    lines,
    baseTotal: baseKg,
    hotelHref: input.hotelHref,
    notes,
    coverage: coverage.sentence,
    // Through the registry, like every other figure that reaches a screen. The first
    // version of this put Decimal.toFixed() on the card and published a Scope 1 total of
    // 2736.542464 kgCO2e — the same defect as the toFixed(2) at a call site and the
    // 624575.3999999999 float, in a fourth place.
    scope1Kg: formatQuantity(coverage.scope1Kg, 'emissions.kgco2e', input.locale),
    scope2Kg: formatQuantity(coverage.scope2Kg, 'emissions.kgco2e', input.locale),
    refrigerantKg:
      input.refrigerantCurrent.totalKgCO2e === null
        ? null
        : formatQuantity(input.refrigerantCurrent.totalKgCO2e, 'emissions.kgco2e', input.locale),
    scope3Kg:
      coverage.scope3Kg === null
        ? null
        : formatQuantity(coverage.scope3Kg, 'emissions.kgco2e', input.locale),
  })
}
