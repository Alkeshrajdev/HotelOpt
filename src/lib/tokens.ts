// Hotel Optimizer — design tokens
// ---------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for colors used by:
//   - Tailwind utilities (via tailwind.config.js — same values mirrored there)
//   - Chart components (recharts colors)
//   - White-label runtime overrides (via CSS variables in index.css)
//
// White-label flow: an admin can override the `--brand-*` CSS variables at
// runtime (write to document.documentElement.style.setProperty), which
// propagates through every Tailwind `bg-brand-*` / `text-brand-*` utility.
// Pillar and status colors are intentionally fixed — they encode meaning.

export const tokens = {
  /** Brand palette — driver for primary buttons, sidebar, hero accents.
   *  These are the values white-label clients can override. */
  brand: {
    50:  "#ECF8F1",
    100: "#D2EFDD",
    200: "#A6E0BD",
    300: "#71CB97",
    400: "#3FB374",
    500: "#1F9B5B",
    600: "#138049",
    700: "#0F6A3C",
    800: "#0C5530",
    900: "#0A4528",
    /** Near-black emerald — used for the sidebar background. */
    950: "#072A1A",
  },

  /** Six pillar accents. Fixed across white-label deployments. */
  pillar: {
    energy:     "#16A34A", // green
    water:      "#0EA5E9", // blue
    waste:      "#0D9488", // teal
    carbon:     "#134E4A", // darker teal / slate-green
    social:     "#7C3AED", // purple
    governance: "#EA580C", // orange
  },

  /** Status semantics — never overridden. */
  status: {
    good:    "#16A34A", // approved / ready / high
    warn:    "#F59E0B", // pending / attention / amber
    bad:     "#DC2626", // missing / overdue / rejected
    info:    "#0EA5E9", // info / draft / AI
    neutral: "#64748B",
  },

  /** Neutral / text scale. */
  ink: {
    50:  "#F7F9FC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    900: "#0F172A",
  },

  /** Sidebar palette (dark emerald). Resolves at both build and runtime. */
  sidebar: {
    bg:        "#072A1A", // matches brand-950
    bgHover:   "#0E3A26",
    bgActive:  "#0F6A3C", // matches brand-700
    border:    "#0F4528",
    text:      "#A7D5BC",
    textMuted: "#6FA589",
    textActive:"#FFFFFF",
    heading:   "#5C8E73",
  },

  /** Chart series — semantic mapping for line/bar/donut series. */
  chart: {
    primary:   "#0F6A3C", // brand-700 — main series
    accent:    "#16A34A", // brand-500 — secondary series
    cost:      "#0EA5E9", // sky — cost / financial metrics
    purple:    "#7C3AED",
    amber:     "#F59E0B",
    red:       "#DC2626",
    /** Soft fills for layered bars / area gradients. */
    softGreen: "#A6E0BD",
    softGray:  "#CBD5E1",
  },
} as const;

export type Tokens = typeof tokens;

/** Read a CSS custom property at runtime. Falls back to the build-time token
 *  if the variable is not set. Use this in chart code when you need to honour
 *  white-label overrides on the brand color in real time:
 *
 *      const primary = themeColor("brand", "700", tokens.chart.primary);
 */
export function themeColor(
  group: "brand" | "pillar" | "status" | "ink",
  key: string,
  fallback: string
): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${group}-${key}-hex`)
    .trim();
  return v || fallback;
}

/** Convenience map for chart code that wants pillar colors by key. */
export const PILLAR_COLOR = tokens.pillar;
export const STATUS_COLOR = tokens.status;
