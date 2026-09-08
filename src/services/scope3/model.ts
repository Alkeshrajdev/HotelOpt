/**
 * The words for Scope 3 — §13.11.
 *
 * Everything a screen or a report needs to say about a category, a travel mode or a waste
 * line, in one place. The database holds codes; a reader is never shown one.
 */

export const CATEGORY_NAMES: Record<number, string> = {
  1: 'Purchased goods and services',
  2: 'Capital goods',
  3: 'Fuel- and energy-related activities not in Scope 1 or 2',
  4: 'Upstream transportation and distribution',
  5: 'Waste generated in operations',
  6: 'Business travel',
  7: 'Employee commuting',
  8: 'Upstream leased assets',
  9: 'Downstream transportation and distribution',
  10: 'Processing of sold products',
  11: 'Use of sold products',
  12: 'End-of-life treatment of sold products',
  13: 'Downstream leased assets',
  14: 'Franchises',
  15: 'Investments',
}

export const STATUS_LABEL: Record<string, string> = {
  reported: 'Reported',
  not_applicable: 'Not applicable',
  not_reported: 'Not reported',
}

/**
 * A declared activity a person can record: a mode of travel, or a night away.
 *
 * `per` says what the count on the form means. A car's factor is per vehicle-kilometre,
 * so the count is cars; a flight's is per passenger-kilometre, so the count is people.
 * Getting this wrong multiplies a car journey by its occupants, which is the commonest
 * business travel error there is and is invisible in the total.
 */
export interface ActivityMode {
  readonly code: string
  readonly label: string
  readonly category: 6 | 7
  readonly domain: 'travel' | 'stay'
  readonly unit: string
  readonly per: 'passenger' | 'vehicle' | 'room'
  /** Set for a mode that emits nothing; recorded so the record exists, valued at zero. */
  readonly zero?: boolean
}

export const ACTIVITY_MODES: readonly ActivityMode[] = [
  {
    code: 'flight_international_average',
    label: 'Flight, international (cabin class unknown)',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'flight_international_economy',
    label: 'Flight, international, economy',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'flight_international_premium',
    label: 'Flight, international, premium economy',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'flight_international_business',
    label: 'Flight, international, business',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'flight_international_first',
    label: 'Flight, international, first',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'flight_short_haul_average',
    label: 'Flight, short-haul touching the UK',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'flight_long_haul_average',
    label: 'Flight, long-haul touching the UK',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'flight_long_haul_business',
    label: 'Flight, long-haul touching the UK, business',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'rail_national',
    label: 'Rail, intercity',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'rail_light',
    label: 'Metro or tram',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'bus_local',
    label: 'Bus',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'coach',
    label: 'Coach',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'taxi',
    label: 'Taxi',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'car_average',
    label: 'Car, hired or private',
    category: 6,
    domain: 'travel',
    unit: 'km',
    per: 'vehicle',
  },
  {
    code: 'motorbike',
    label: 'Motorbike',
    category: 6,
    domain: 'travel',
    unit: 'km',
    per: 'vehicle',
  },
  {
    code: 'ferry',
    label: 'Ferry',
    category: 6,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'hotel_night',
    label: 'Hotel night',
    category: 6,
    domain: 'stay',
    unit: 'Room per night',
    per: 'room',
  },
  {
    code: 'commute_staff_bus',
    label: 'Staff bus, hotel-operated or contracted',
    category: 7,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'commute_bus',
    label: 'Public bus',
    category: 7,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'commute_metro',
    label: 'Metro or tram',
    category: 7,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'commute_car',
    label: 'Private car',
    category: 7,
    domain: 'travel',
    unit: 'km',
    per: 'vehicle',
  },
  {
    code: 'commute_motorbike',
    label: 'Motorbike',
    category: 7,
    domain: 'travel',
    unit: 'km',
    per: 'vehicle',
  },
  {
    code: 'commute_taxi',
    label: 'Taxi',
    category: 7,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
  },
  {
    code: 'commute_walk_cycle',
    label: 'On foot or by bicycle',
    category: 7,
    domain: 'travel',
    unit: 'passenger.km',
    per: 'passenger',
    zero: true,
  },
]

export function activityMode(code: string): ActivityMode | null {
  return ACTIVITY_MODES.find((m) => m.code === code) ?? null
}

/** The countries a hotel night can be recorded in: the ones a factor is bound for. */
export const STAY_COUNTRIES: readonly { readonly code: string; readonly label: string }[] = [
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'QA', label: 'Qatar' },
  { code: 'OM', label: 'Oman' },
  { code: 'JO', label: 'Jordan' },
  { code: 'EG', label: 'Egypt' },
  { code: 'IN', label: 'India' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'SG', label: 'Singapore' },
  { code: 'TR', label: 'Turkey' },
]

const STREAM_LABEL: Record<string, string> = {
  general_mixed: 'General waste',
  mixed_recyclables: 'Mixed recyclables',
  paper_card: 'Paper and card',
  plastics: 'Plastics',
  glass: 'Glass',
  metals: 'Metals',
  food_organic: 'Food waste',
  garden_green: 'Garden waste',
  cooking_oil: 'Used cooking oil',
  e_waste: 'Electrical waste',
  batteries: 'Batteries',
  textiles: 'Textiles',
  hazardous: 'Hazardous waste',
  construction_demolition: 'Construction and demolition waste',
  other: 'Other waste',
}

const TREATMENT_LABEL: Record<string, string> = {
  recycling: 'recycled',
  organic_treatment: 'to organic treatment',
  reuse: 'reused',
  energy_recovery: 'to energy from waste',
  landfill: 'to landfill',
  incineration_no_recovery: 'incinerated without recovery',
  other_disposal: 'to other disposal',
}

export function wasteLineLabel(stream: string, treatment: string | null): string {
  const s = STREAM_LABEL[stream] ?? stream
  if (treatment === null) return `${s}, treatment not established`
  return `${s} ${TREATMENT_LABEL[treatment] ?? treatment}`
}

export const RESOURCE_LABEL: Record<string, string> = {
  grid_electricity: 'Grid electricity',
  district_cooling: 'District cooling',
  purchased_heat: 'Purchased heat',
  purchased_steam: 'Purchased steam',
  piped_gas: 'Piped gas',
  delivered_diesel: 'Delivered diesel',
  delivered_lpg: 'Delivered LPG',
  delivered_other: 'Other delivered fuel',
}

/** The fuels category 3 has a well-to-tank series for. Everything else says so. */
export const WTT_FUELS: readonly string[] = ['piped_gas', 'delivered_diesel', 'delivered_lpg']
