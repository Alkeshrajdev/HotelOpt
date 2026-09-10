---
name: ui-ux-craft
description: Design standard for every UI change in Hotel Optimizer — the dashboard/SaaS craft rules the product is aligned to, mapped to this codebase's tokens and components. Load before touching any page, component, or style.
---

# UI/UX Craft — the Hotel Optimizer design standard

Source material: Kole Jain's dashboard/UI series — *Every UI/UX Concept Explained in Under 10 Minutes*
(affordances, visual hierarchy, grids & spacing, typography, colour, dark mode, shadows, icons & buttons,
feedback & states, micro-interactions, overlays), *EVERYTHING you need to know to build a Dashboard UI*
(sidebars, main layout, modals/popovers/pages, the core dashboard components, micro-interactions) and
*The 3 dashboard UI flaws that give away you've never built one* (data drives the UI, progressive
disclosure, "UI is what you can't see"). Visual target: RonDesignLab's *Sugar CRM SaaS Dashboard*
(dribbble.com/shots/26629031) — soft layered light surfaces, big radii, pills, geometric sans, one
accent. User decisions: emerald stays the accent; light sidebar with the existing navigation tree;
Plus Jakarta Sans. The rules below are the standard practice for each topic, expressed in this
repo's tokens. When in doubt, the rule wins over the existing code.

## 1. Data drives the UI
- Design for real data shapes: long hotel names (`truncate`/`min-w-0`), large numbers
  (`toLocaleString()`, `tabular-nums`), zero/empty (`EmptyState`), and many rows (tables, not cards).
- Pick the component from the data: trend → line/bars; share → stacked bar/donut; ranking → table or
  horizontal bars; a single number with context → `KpiTile`.
- Never leave a chart that can render empty — a percentage-height bar needs a definite-height column
  (`h-full` column + `flex-1 flex items-end` track). Charts get explicit heights.

## 2. Layout, grids & spacing (symmetry + space utilisation)
- Page root is `space-y-5`; card grids use `gap-4`; card padding `card-pad` (p-6) or `p-5`.
- Content fills the shell: no page-level `max-w-*` caps, no nested containers, no fixed pixel widths on
  fluid content, every `<table>` is `w-full`.
- Grid column counts must divide the item count (8 → 4 cols, 10 → 5, 12 → 4). If the count is
  data-driven, keep cards the same size and let the last row left-align.
- Two-column splits: tables and charts take the wide half (8/4 or 7/5); key/value rails take the narrow.
  Equal content → equal halves (6/6). Use `items-start` so short cards don't stretch.

## 3. Visual hierarchy
- One page title (`h1.page-title`, 700/-0.021em), optional short eyebrow, **no subtitle paragraphs**.
- One primary action per header (`btn-primary`); everything else `btn-secondary`/`btn-ghost`.
  Destructive actions are never a filled button in the header — outline red or inside a menu.
- Numbers: `text-kpi` (32px) for the KPI row, `text-stat` (26px) for summary/hero tiles, `text-2xl`
  and `text-xl` for headings. Weight 700, never 800. Labels: 11px uppercase `tracking-[0.06em]`
  `text-ink-400`.

## 4. Typography
- Typeface: **Plus Jakarta Sans** (Google Fonts, 400–800; loaded in index.html). Page title 600,
  numbers 700, body 400/500. Keep `tabular-nums` on any column of figures.
- Scale: 10 / 11 / 12 / 13 / 14 (sm) / 16 / 20 (xl) / 24 (2xl) / 26 (stat) / 32 (kpi).
  **Nothing below 10px.** Prefer 12–13px for body-in-cards, 11px for micro-labels.
- Line-height `leading-snug` for multi-line 12px; `leading-none` on big numbers.

## 5. Colour
- Tokens only. Neutrals: `ink-50…900`. Brand: `brand-*`. Status: `good / warn / bad / info`
  (fills, chips, bars) and `good-700 / warn-700 / bad-700 / info-700` for text and icons (contrast-safe).
  Pillars: `pillar-energy/water/waste/carbon/social/gov`. **No raw Tailwind palette classes**
  (`slate-*`, `gray-*`, `amber-*`, `blue-*` …) — the one exception is a categorical chart series.
- Colour means something: status, pillar, or brand action. Decorative colour (rainbow icon chips on
  settings/hub cards) is replaced by `bg-ink-100 text-ink-600`.
- **No accent lines.** No coloured top bars, left bars, or outline rings on cards/tiles — they read
  as template/AI decoration (user feedback, Sep 2026). Carry pillar/status colour in the icon chip,
  a `Badge`, or the value colour instead.
- Tints: `bg-good/10` + `border-good/30` + `text-good-700` is the status-callout recipe.
- **Charts use their own palette, never UI status hues or raw Tailwind colours.** It is
  `src/lib/chartPalette.ts` ("A Bridesmaid's Touch", chosen by the owner): olive `#807245`
  primary → mauve `#AF8D84` → moss `#959891` → blush `#F6C8CC` → cocoa `#8B6D66`; sage `#E0E5DA`
  for tracks/neutral; rose `#B33650` for negatives; sand `#CDB872` for warnings (sparingly).
  Hand-built bars and legend swatches use the matching `bg-chart-*` classes. Stacked series get a
  1px white separator. Pillars map via `CHART_PILLAR`, thresholds via `CHART_STATUS`.
- Tab rows are contained pill tracks (`Tabs` primitive, or `inline-flex … rounded-full bg-ink-100 p-1`
  with white active pills) — never an underline row floating on the page.

## 6. Elevation & shadows
- `shadow-card` (resting card), `shadow-card-lg` (primary card), `shadow-pop` (menus, popovers,
  hovered cards), `shadow-pop-lg` (modals, drawers). No `shadow-sm/md/lg/xl/2xl`.
- Surfaces are layered by tone, not lines: page `#ECEEF3` → tinted panel `bg-ink-50` → white card.
  Cards are **borderless** (`card` = white + `shadow-card`), radius `rounded-xl2` (20px) /
  `rounded-xl3` (24px). Table rows keep `border-ink-100` hairlines; inputs keep `border-ink-200`.
- Shapes: chips, badges, tabs and segmented controls are pills (`rounded-full`); buttons and inputs
  `rounded-xl`; icon-only buttons `rounded-full`.

## 7. Sidebar & navigation
- Light `sidebar-shell` (white panel, ink text, hairline right border), 252px, icon + label,
  grouped, one emerald active pill (`nav-item-active`), collapsible to an icon rail. Brand lockup:
  emerald icon chip + ink wordmark. No decorative footer content. Section context lives in the eyebrow.

## 8. Icons & buttons
- lucide only; 14px inside buttons/chips, 16–18px standalone. `btn` is h-9; compact contexts h-7/h-8.
- Icon-only buttons need `aria-label`/`title`.

## 9. Overlays
- Modal → short focused task; popover/dropdown → light choice; new page/wizard → multi-step or long
  forms. Never nest modals.
- One scrim everywhere: `bg-ink-900/50 backdrop-blur-sm` (drawers may use `/40`). Escape closes.
- Floating layers (menus, dropdowns, popovers, toasts) use `.popover` — white + `shadow-pop` + a
  6% ink hairline ring — never a bare `card`, or the edge vanishes over white content. Modals
  and drawers: `rounded-xl3 shadow-pop-lg ring-1 ring-ink-900/[0.06]`.

## 9b. Performance is UX
- Pages are route-split (`lazy()` in App.tsx) with Suspense inside the shell; new pages must be
  added the same way. Heavy vendors (recharts) stay out of the initial bundle. Keep the first
  paint to the shell + one page.

## 10. Feedback & states (UI is what you can't see)
- Every interactive element has hover, focus-visible (global), active, disabled. Clickable cards use
  `card-interactive`; clickable rows use `hover:bg-ink-50/60 cursor-pointer`.
- Every save/submit/approve/delete gives feedback: `useToast().success("Saved")` / `.error(...)`.
- Empty (`EmptyState`), loading, and error states exist for every data surface.
- Transitions 100–150ms (`transition-colors` / `transition-all duration-150`); hover lift is
  `-translate-y-0.5` + `shadow-pop`.

## 11. Progressive disclosure
- Overview first: KPI row → primary chart → attention/queue → details on demand (tabs, drill-downs,
  "View all →", expandable rows, advanced-filter toggles). Don't put every metric on the first screen.

## 12. Component families (one design per family)
- KPI row: `KpiTile`. Summary/hero tiles: plain elevated `card card-pad` (label / value / hint) — no accent bars.
  Tables: `table-th` / `table-td`. Status: `Badge`. Cards: `Card` + `CardHeader`. Tabs: `Tabs`.
  Don't introduce a new variant of an existing family — extend the family.

## Pre-merge checklist
- [ ] fills width, symmetric grid, `space-y-5` / `gap-4`
- [ ] tokens only (no raw palette), status text uses `*-700`
- [ ] no text under 10px; numbers on `kpi`/`stat`
- [ ] hover + focus on everything clickable; toast on every action
- [ ] charts render with data; empty state without
- [ ] one primary button; destructive demoted; no subtitle paragraphs
