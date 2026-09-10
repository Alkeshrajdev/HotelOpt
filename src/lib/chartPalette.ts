/**
 * Data-visualisation palette — "A Bridesmaid's Touch" (chosen by the product owner).
 *
 * UI tokens (good / warn / bad / pillar-*) are for chips, icons and status — they are
 * chosen for meaning, not for sitting next to each other. Charts use this palette, which
 * is designed as a SET: muted, earthy tones that read as one family and sit calmly under
 * the emerald accent and the cool-grey surfaces.
 *
 * The four swatches are the core; every other value is taken from the same ramps, so
 * negatives, warnings and extra series stay in-family. Never mix in UI status hues.
 */
export const CHART = {
  olive: "#807245", // primary series · positive
  mauve: "#AF8D84", // secondary series
  blush: "#F6C8CC", // light series
  sage:  "#E0E5DA", // tracks, neutral, prior period
  moss:  "#959891", // fourth series (sage ramp, mid)
  cocoa: "#8B6D66", // fifth series (mauve ramp, deep)
  rose:  "#B33650", // negative · attention (blush ramp, deep)
  sand:  "#CDB872", // warning (olive ramp, light) — use sparingly
  grid:  "#EDEFF0", // gridlines (neutral ramp, lightest)
  axis:  "#7B8285", // axis text, reference lines (neutral ramp, mid)
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
  CHART.olive, CHART.mauve, CHART.moss, CHART.blush, CHART.cocoa, CHART.sage,
];

/** Pillar → chart colour (consistent identity inside the set). */
export const CHART_PILLAR = {
  energy:     CHART.olive,
  water:      CHART.mauve,
  waste:      CHART.blush,
  carbon:     CHART.cocoa,
  social:     CHART.moss,
  governance: CHART.sage,
} as const;

/** Threshold / status colouring inside charts (good → warn → bad). */
export const CHART_STATUS = {
  good: CHART.olive,
  warn: CHART.sand,
  bad:  CHART.rose,
} as const;
