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
          "Inter",
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
        // Sidebar palette — dark emerald, white-label overridable via CSS vars.
        sidebar: {
          bg:           "#062A1C",
          "bg-hover":   "#0D3C28",
          "bg-active":  "#0F6A3C",
          border:       "#0E3D28",
          text:         "#A7D5BC",
          "text-muted": "#6FA589",
          heading:      "#4D8A6A",
        },
        // Page surface (not CSS-var-backed — static warm near-white)
        page: "#F6F8F7",
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
        good: "rgb(var(--good) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad:  "rgb(var(--bad)  / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
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
        card:      "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.04)",
        "card-lg": "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.05)",
        pop:       "0 8px 24px rgba(15, 23, 42, 0.08)",
        "pop-lg":  "0 16px 48px rgba(15, 23, 42, 0.12)",
      },
      borderRadius: {
        xl2: "14px",
        xl3: "18px",
      },
      fontSize: {
        // Page-level title. ~30px / tight tracking.
        "page-title":    ["1.875rem", { lineHeight: "1.15", letterSpacing: "-0.012em", fontWeight: "800" }],
        // KPI value — at least 32px bold per BRD §1.3.
        "kpi":           ["2rem",     { lineHeight: "1",    fontWeight: "800" }],
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
