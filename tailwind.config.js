/** @type {import('tailwindcss').Config} */
//
// Color values mirror src/lib/tokens.ts. The two are the single source of
// truth — keep them in sync when you change a value.
//
// Brand, status, and pillar colors are exposed as
// `rgb(var(--TOKEN) / <alpha-value>)` so Tailwind opacity utilities work
// (bg-good/10, bg-pillar-energy/10, etc.) and white-label overrides apply
// at runtime by writing CSS variables on :root.
//
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        // Brand palette — runtime overridable for white-label.
        brand: {
          50:  "rgb(var(--brand-50)  / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
          950: "rgb(var(--brand-950) / <alpha-value>)",
        },
        // Sidebar palette — light panel, emerald active pill; overridable via CSS vars.
        sidebar: {
          bg:           "#FFFFFF",
          "bg-hover":   "#F1F5F9",
          "bg-active":  "#0F6A3C",
          border:       "#E2E8F0",
          text:         "#475569",
          "text-muted": "#94A3B8",
          heading:      "#94A3B8",
        },
        // Page surface (not CSS-var-backed — static cool near-white; a touch
        // deeper than the cards so white surfaces read as elevated).
        page: "#ECEEF3",
        // Neutral scale — CSS-var-backed so dark mode flips automatically.
        ink: {
          900: "rgb(var(--ink-900) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          50:  "rgb(var(--ink-50)  / <alpha-value>)",
        },
        // Status semantics — CSS-var-backed so opacity utilities work (bg-good/10 etc).
        // DEFAULT = fill/chip shade; 700 = contrast-safe shade for text & icons.
        good: { DEFAULT: "rgb(var(--good) / <alpha-value>)", 700: "rgb(var(--good-700) / <alpha-value>)" },
        warn: { DEFAULT: "rgb(var(--warn) / <alpha-value>)", 700: "rgb(var(--warn-700) / <alpha-value>)" },
        bad:  { DEFAULT: "rgb(var(--bad)  / <alpha-value>)", 700: "rgb(var(--bad-700)  / <alpha-value>)" },
        info: { DEFAULT: "rgb(var(--info) / <alpha-value>)", 700: "rgb(var(--info-700) / <alpha-value>)" },
        // Pillar accents — CSS-var-backed for opacity utilities.
        pillar: {
          energy: "rgb(var(--pillar-energy) / <alpha-value>)",
          water:  "rgb(var(--pillar-water)  / <alpha-value>)",
          waste:  "rgb(var(--pillar-waste)  / <alpha-value>)",
          carbon: "rgb(var(--pillar-carbon) / <alpha-value>)",
          social: "rgb(var(--pillar-social) / <alpha-value>)",
          gov:    "rgb(var(--pillar-gov)    / <alpha-value>)",
        },
      },
      boxShadow: {
        // Soft, layered elevation so surfaces lift off the page (premium-SaaS feel)
        // without heavy drop shadows.
        card:      "0 1px 2px rgba(16, 24, 40, 0.04), 0 6px 18px -6px rgba(16, 24, 40, 0.10)",
        "card-lg": "0 1px 3px rgba(16, 24, 40, 0.05), 0 12px 28px -8px rgba(16, 24, 40, 0.12)",
        pop:       "0 6px 16px -4px rgba(16, 24, 40, 0.10), 0 12px 32px -8px rgba(16, 24, 40, 0.10)",
        "pop-lg":  "0 20px 48px -12px rgba(16, 24, 40, 0.18)",
      },
      borderRadius: {
        xl2: "20px",
        xl3: "24px",
      },
      fontSize: {
        // Page-level title. ~30px / tight tracking. Weight 700 (not 800) + tighter
        // tracking reads as crafted rather than heavy/default.
        "page-title":    ["1.875rem", { lineHeight: "1.15", letterSpacing: "-0.021em", fontWeight: "600" }],
        // KPI value — large, tight, tabular. 700 + negative tracking for a refined feel.
        "kpi":           ["2rem",     { lineHeight: "1",    letterSpacing: "-0.02em", fontWeight: "700" }],
        // Secondary stat value (summary tiles, hero stats) — one step below KPI.
        "stat":          ["1.625rem", { lineHeight: "1",    letterSpacing: "-0.02em", fontWeight: "700" }],
        // Section heading inside a page zone.
        "section-title": ["1.0625rem", { lineHeight: "1.3", fontWeight: "600" }],
        // Subtitle under a page title.
        "page-sub":      ["0.8125rem", { lineHeight: "1.5" }],
        // Helper / caption text.
        "helper":        ["0.75rem",   { lineHeight: "1.5" }],
      },
    },
  },
  plugins: [],
};
