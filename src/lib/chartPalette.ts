/**
 * Data-visualisation palette — "A Bridesmaid's Touch" (chosen by the product owner).
 *
 * UI tokens (good / warn / bad / pillar-*) are for chips, icons and status — they are
 * chosen for meaning, not for sitting next to each other. Charts use this palette, which
 * is designed as a SET: muted, earthy tones that read as one family and sit calmly under
 * the emerald accent and the cool-grey surfaces.
 *
 * The four swatches are the core; every other value is taken from the same ramps, so
 * negatives, warnings, reference lines and extra series stay in-family. Never mix in UI
 * status hues or raw Tailwind colours.
 *
 * Assigning colours to a breakdown: rank the items by share and walk CHART_SERIES in
 * order. A slice that means "nothing happened" (landfill, conventional grid, other) takes
 * `remainder`; a slice that is genuinely bad (hazardous, overdue) takes `rose`.
 */
export const CHART = {
  olive: "#807245", // primary series · positive
  mauve: "#AF8D84", // secondary series
  blush: "#F6C8CC", // light series · soft fills next to olive
  sage:  "#E0E5DA", // tracks, area fills, lightest series
  moss:  "#959891", // third series (sage ramp, mid)
  cocoa: "#8B6D66", // fifth series (mauve ramp, deep)
  rose:  "#B33650", // negative · attention (blush ramp, deep)
  sand:  "#CDB872", // warning (olive ramp, light) — use sparingly

  prior:     "#BABEB5", // prior-period bars (sage ramp 2)
  reference: "#9BA3A8", // baselines, averages, prior-period dashed lines (neutral ramp 3)
  remainder: "#C2C9CC", // "everything else" slices — recessive by design (neutral ramp 2)
  grid:      "#EDEFF0", // gridlines, tooltip borders (neutral ramp 1)
  axis:      "#7B8285", // axis ticks, legend text (neutral ramp 4)
  label:     "#383B3D", // category labels that must read as text (neutral ramp 6)
} as const;

/** Full 7-step ramps (light → dark) for sequential scales, heat maps and hover states. */
export const CHART_RAMP = {
  sage:    ["#E0E5DA", "#BABEB5", "#959891", "#747771", "#535550", "#31322F", "#121311"],
  olive:   ["#F1DFA3", "#CDB872", "#A4935A", "#807245", "#5B502F", "#352E19", "#131006"],
  mauve:   ["#E8E0DE", "#CAB6B1", "#AF8D84", "#8B6D66", "#634D48", "#3B2D29", "#17100E"],
  rose:    ["#F6C8CC", "#EF8F9B", "#E7486A", "#B33650", "#7D2336", "#48101C", "#180205"],
  neutral: ["#EDEFF0", "#C2C9CC", "#9BA3A8", "#7B8285", "#595F61", "#383B3D", "#191B1C"],
} as const;

/** Ordered categorical series for multi-series charts (most → least prominent). */
export const CHART_SERIES: readonly string[] = [
  CHART.olive, CHART.mauve, CHART.moss, CHART.blush, CHART.cocoa, CHART.sand, CHART.sage,
];

/**
 * Pillar → chart colour. Every value must hold a 1px line on white, so the light
 * swatches (blush, sage) are not pillar identities — they stay fills.
 */
export const CHART_PILLAR = {
  energy:     CHART.olive,
  water:      CHART.mauve,
  waste:      CHART.moss,
  carbon:     CHART.cocoa,
  social:     "#634D48", // mauve ramp 5 — plum
  governance: "#747771", // sage ramp 4 — stone
} as const;

/** Threshold / status colouring inside charts (good → warn → bad). */
export const CHART_STATUS = {
  good: CHART.olive,
  warn: CHART.sand,
  bad:  CHART.rose,
} as const;
