export {
  quantities,
  assessInstrument,
  checkDoubleCount,
  marketBasedScope2,
  locationBasedScope2,
  instrumentsExceedGridImport,
  renewableCoverage,
  DoubleCountError,
  QUALITY_CRITERIA,
  TIER_4_DISCLOSURE,
} from './scope2'
export type {
  EnergyQuantities,
  Quantities,
  Instrument,
  InstrumentAssessment,
  QualityCriterion,
  Claim,
  DoubleCountConflict,
  Tier,
  TierAllocation,
  MarketBasedInput,
  MarketBasedResult,
} from './scope2'
export {
  leakRate,
  refrigerantEmissions,
  RefrigerantMethodError,
  LEAK_RATE_THRESHOLD_PERCENT,
} from './refrigerant'
export type {
  RefrigerantMethod,
  RefrigerantEvent,
  RefrigerantEventType,
  LeakRateResult,
  RefrigerantEmissions,
  RefrigerantEmissionsInput,
} from './refrigerant'
export {
  assembleInventory,
  consolidationShare,
  portfolioIntensity,
  compensationPosition,
  baseYearRecalculation,
} from './inventory'
export type {
  Inventory,
  ScopeInputs,
  ConsolidationApproach,
  ControlType,
  HotelBoundary,
  PortfolioLine,
  PortfolioIntensity,
  CompensationPosition,
  BaseYearTrigger,
  BaseYearAssessment,
} from './inventory'

export { emissionsKgCO2e, factorDenominator, UnitMismatch } from './emissions'
export type { ActivityLine } from './emissions'
