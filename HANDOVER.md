# Hotel Optimizer — Session Handover

**Project path:** `/Users/alkeshrajdev/Documents/Cloude/hotel-optimizer`
**GitHub:** `https://github.com/Alkeshrajdev/HotelOpt` (branch: `main`)
**Vercel:** `https://hotel-optimizer.vercel.app` (auto-deploys on push to main)
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS 3 + Supabase

---

## Current status (updated 2026-06-11)

Latest commit: **`bea9c26`** on `main` (Vercel auto-deploys). `npm run lint` (= `tsc --noEmit`) passes clean; no runtime console errors.

A full page-by-page UX review was done and the high-priority findings were fixed. The app is now **consistent and substance-first** (real operational/$ metrics, not vanity scores). Fixes shipped this session:

1. **One hotel dataset everywhere** — the dashboard and the Properties/Review/Guest pages used two different hotel lists. Everything now uses the canonical 10 hotels from `PORTFOLIO_HOTELS` (`mock.ts`); `propertiesData.ts` was rewritten to match, generic names renamed across ~18 files, and the count unified to **10** (topbar/sidebar/Billing).
2. **Targets progress bug** — bars showed "0% to go" while saying "At Risk". Now measured along baseline→target (direction-aware) in `TargetsTab.tsx` with `baseVal`/`baseLabel`/`higherIsBetter` on `PORTFOLIO_TARGETS`.
3. **Renewable share** reconciled to **12%** across Performance/benchmarks/drilldown/guest page (was a 78% placeholder that contradicted the per-hotel data).
4. **Currency** — Smart Ops converted AED→USD so portfolio money is consistent with the rest of the app.
5. **Responsive** — sidebar is now an off-canvas drawer + hamburger below `lg`; KPI tiles no longer clip on mobile. Desktop docked sidebar unchanged.
6. **Sustainability score explained** — ⓘ tooltip (`InfoHint`) on Properties + Property Detail describing the composite (kept the score, removed the black-box feel).
7. **Polish** — demo session now **persists across refresh** (localStorage `ho_demo`); Admin "Stub" badges → "Soon"; jargon glossary (`Abbr`) wired for GP/EF.

---

## Deploy command

After every update, commit and run this to push to GitHub (Vercel auto-deploys on push):

```bash
TOKEN=$(security find-generic-password -s "GitHub - https://api.github.com" -w)
git push "https://Alkeshrajdev:${TOKEN}@github.com/Alkeshrajdev/HotelOpt.git" main
```

---

## All completed work

### 1. Sidebar — simplified & collapsible
**Files:** `src/components/layout/Sidebar.tsx`, `src/lib/nav.ts`

- Removed all group label headers
- New `NavSection` type: `item | group | divider`
- 3 collapsible dropdown groups: **Portfolio** (super_admin), **Smart Ops** (7 sub-pages), **Engagement** (3 sub-pages)
- **Billing** and **Admin Settings** as flat items at bottom
- Orphan divider cleanup (no stacked lines when role filters items out)
- Brand area: "HOTEL" extrabold + "optimizer" muted — matches logo typography
- Building icon badge in collapsed state

### 2. Review & Approval — Capture Status tab
**File:** `src/pages/ReviewApproval.tsx`

- Page now has 2 tabs: **Approval Queue** (existing, untouched) and **Capture Status** (new)
- Capture Status: month-by-month grid (6 months × 8 data types × 3 properties)
- Status chips: Approved / Pending / Draft / Missing / N/A
- Property picker, summary cards (coverage %, missing count, contacts to remind)
- **Reminder modal**: groups missing entries by responsible email, editable email body per contact, success state
- Mock data in `STATUS_MOCK` constant inside ReviewApproval.tsx

### 3. Data Capture — AI Assist method
**Files:** `src/pages/DataCapture.tsx`, `src/lib/dataCaptureConfig.ts`

- Added `"ai-assist"` to Method type and all pillar method arrays
- `AiAssistWorkflow` component: 4-phase flow (upload → analyzing → Q&A → extraction table)
- Per-data-type scripted questions and extracted fields
- Outputs `CaptureResult` via `onPreview()` — integrates with existing Steps 4+5

### 4. Logo
**Files:** `public/LogoLight.png`, `public/LogoDark.png`, `public/Logo.png`

- `LogoLight.png` → Login page right panel (mobile, `lg:hidden`)
- `LogoDark.png` → Login left panel (green gradient)
- Sidebar uses styled text instead of logo image

### 5. Dashboard — chart diversity
**Files:** `src/pages/dashboard/OverviewTab.tsx`, `HotelsTab.tsx`, `EnvironmentTab.tsx`, `SocialGovernanceTab.tsx`

| Tab | Chart | Notes |
|---|---|---|
| Overview | **Treemap** | Hotel contribution by metric (Carbon / Energy / Water / Waste) |
| Overview | **RadarChart** | 6-pillar ESG score vs target |
| Hotels | **Heatmap matrix** | 10 hotels × 6 metrics, colour-coded RAG |
| Env/Waste | **Waterfall** (ComposedChart) | YoY diversion change per stream |
| Social | **ScatterChart** | Training hrs vs LTIFR, bubble = headcount |
| Social | **RadarChart** | Governance completeness across 6 dimensions |

- Treemap entry animation disabled (`isAnimationActive={false}`) — instant render

### 6. Auth — Demo mode
**Files:** `src/lib/auth.tsx`, `src/pages/Login.tsx`

- `signInDemo()` added to auth context — sets in-memory session, role `super_admin`, no Supabase call
- **"Continue as Demo"** button on Login page (below divider, calls `signInDemo()`)
- `DemoNotice`: amber dismissible banner in AppShell when demo session active
- Demo profile activates when `VITE_SUPABASE_URL` is missing **or** user clicks "Continue as Demo"

### 7. Dashboard FilterBar — replaces topbar filters
**Files:** `src/pages/dashboard/FilterBar.tsx` (new), `src/components/layout/Topbar.tsx`, `src/lib/topbarContext.tsx`

- Topbar search bar and Region/Year/Approved-only filters **removed** from `/portfolio/dashboard` route
- New `DashboardFilterBar` renders inline in the topbar for the dashboard route, taking that freed space
- **Properties multi-select**: grouped by region (EMEA 7 · APAC 2 · Africa 1), indeterminate checkboxes, region-level toggle, adaptive label ("All Properties" / "EMEA (7)" / "3 of 10 properties" / hotel name)
- **Mode toggle**: `Year | Quarter | Month`
- **Period picker**: Year → single year select · Quarter → Q1/Q2/Q3/Q4 + year · Month → month + year
- **Comparison selector**: Year → prior-year dropdown · Quarter → Same Qtr LY / Prior Qtr pills · Month → Same month LY / Prior month / Custom pills (Custom reveals inline date selects)
- Filter state (`dashHotelIds`, `dashMode`, `dashYear`, `dashQuarter`, `dashMonth`, `dashComparison`) lives in `TopbarContext`
- Mobile: compact "Filters" button opens a full panel with all controls
- `DashMode` type: `"year" | "quarter" | "month"` — exported from `topbarContext.tsx`
- `DashComparison` type: union of 6 variants — exported from `topbarContext.tsx`

### 8. Dashboard — 5-way metric switcher + aggregation toggle
**File:** `src/pages/dashboard/OverviewTab.tsx`

- **Metric switcher** (5 options, top-right of trend section): `Energy | Water | Waste | Combined | Carbon`
  - Energy: amber bar (TY) + dashed grey prior-year line
  - Water: sky-blue bar + dashed prior-year line
  - Waste: violet bar + dashed prior-year line
  - Combined: 3 stacked bars (energy + water + waste) + dashed prior-year total line
  - Carbon: teal line (intensity) + dashed green 2030 reference line at 11 kgCO₂e/ORN
- **Aggregation toggle** (3 options, top-left of trend section): `Monthly | Quarterly | Annually`
  - Monthly: 12-month view (May–Apr), dashed prior-year line — original behaviour
  - Quarterly: last 8 quarters (Q1 '24 → Q4 '25), dashed same-quarter-prior-year line
  - Annually: 2022 · 2023 · 2024 · 2025 bars — true YoY view, no dashed line needed
- `MONTHLY` data expanded with per-utility columns (`energyTY`, `waterTY`, `wasteTY`, `energyPY`, `waterPY`, `wastePY`, `costPY`, `intensity`)
- `QUARTERLY` dataset added (8 quarters with same column structure)
- `ANNUAL` dataset added (4 years: 2022–2025)
- Summary strip and chart legend update contextually per aggregation mode
- Tooltip adapts per metric: shows breakdown in Combined, intensity vs target in Carbon

---

## Key file map

```
src/
  lib/
    nav.ts                  — sidebar nav structure (NavSection types)
    mock.ts                 — all mock data (PORTFOLIO_HOTELS, PORTFOLIO_SCOPE3_CATEGORIES, etc.)
    dataCaptureConfig.ts    — data capture pillar/method config
    auth.tsx                — Supabase auth + demo fallback (signInDemo)
    topbarContext.tsx        — per-route topbar config + DashboardFilter state
                              exports: DashMode, DashComparison types
  components/layout/
    Sidebar.tsx             — sidebar with collapsible groups
    Topbar.tsx              — renders DashboardFilterBar for dashboard route,
                              standard filters + search for all other routes
    AppShell.tsx            — layout wrapper + DemoNotice
  components/ui/
    DemoNotice.tsx          — amber demo mode banner
    InfoHint.tsx            — ⓘ + tooltip; exports SUSTAINABILITY_SCORE_EXPLAINER
    Abbr.tsx                — acronym glossary (GLOSSARY: ORN/GP/EF/LTIFR/COP/GN)
  pages/
    Login.tsx               — sign in + "Continue as Demo" button
    Dashboard.tsx           — 5-tab portfolio dashboard shell
    dashboard/
      FilterBar.tsx         — dashboard filter controls (renders inside Topbar)
      OverviewTab.tsx       — KPI tiles + trend chart (metric + aggregation toggles)
      EnvironmentTab.tsx    — Carbon/Energy/Water/Waste with Waterfall
      HotelsTab.tsx         — Heatmap matrix + hotel cards
      SocialGovernanceTab.tsx — Scatter + Radar + existing charts
    DataCapture.tsx         — 5-step wizard incl. AiAssistWorkflow
    ReviewApproval.tsx      — Approval Queue + Capture Status tabs
    Properties.tsx          — portfolio-level property registry (see next task)
  public/
    LogoLight.png           — coloured logo (white bg)
    LogoDark.png            — white logo (dark green bg)
```

---

## Auth / roles

- **Supabase configured** (`.env.local` has real URL + anon key)
- `signInDemo()` sets a `super_admin` session **and persists a `ho_demo` flag in localStorage**, so a hard refresh keeps the user signed in; `signOut()` clears the flag + local state
- Role enum: `maker | checker | property_sm | super_admin`
- Demo profile activates when `VITE_SUPABASE_URL` is missing, the `ho_demo` flag is set, **or** the user clicks "Continue as Demo"

---

## ✅ Completed — Relocate Properties page + de-duplicate Setup/Hotels tab

**Files changed:** `src/lib/nav.ts`, `src/pages/portfolio/PortfolioSetup.tsx`
**Commits:** `e27ba1b`, `4df511a`

### What was done

**1. Properties moved into Portfolio sidebar group** (`super_admin` only)
- Added `{ to: "/properties", label: "Properties", icon: Building2 }` as the second item in the Portfolio group (after Dashboard, before Setup)
- Removed the flat workspace-section item `{ type: "item", to: "/properties", ... }`
- `property_sm` no longer sees the master registry list; `/properties/:id` detail pages remain accessible to them via direct link

**2. Setup → Hotels tab de-duplicated**
- Was: full hotel table duplicating Properties (Brand, Country, Rooms, GFA, Approved % bar — all already in Properties)
- Now: lightweight **Portfolio Scope** view — Hotel name, Report Status, Cert Status, Pending records, In Portfolio toggle + exclusion reason
- Summary tiles changed from (Ready/Missing/Evidence) → (Blocked / At Risk / Cert gaps)
- Added inline "Properties" link in the subtitle so admins can jump to the master registry for full editing
- Button renamed from "Add Hotels to Portfolio" → "Add to Portfolio"

### Current Portfolio sidebar order
```
Portfolio (super_admin)
  Dashboard
  Properties   ← master registry (10 hotels, full filter, add/edit)
  Setup        ← portfolio scope: inclusion, groups, targets, users, rules, escalations
  Reports & Certs
```

---

## Way forward — open actions

Ordered by impact. None are blocking; the app is in a consistent, demoable state.

### P1 — worth doing next
1. **Consolidate Reports/Certs information architecture.** Reporting & certification content lives in three nav entries — top-nav **Reports**, top-nav **Certifications**, and **Portfolio → Reports & Certs**. Pick one canonical home and make the others link to it (or merge), so users aren't unsure where to go. Files: `pages/Reports.tsx`, `pages/Certifications.tsx`, `pages/portfolio/PortfolioReports.tsx`, `lib/nav.ts`.
2. **Currency display style.** Money now reads as USD everywhere, but the *format* is mixed — `$4.8M` (prefix) on the dashboard vs `USD 49,610` (suffix) in Smart Ops. Pick one convention (suggest `$` prefix + compact `M/k`) and apply via a small `formatCurrency()` helper.

### P2 — polish
3. **Wider jargon coverage.** `components/ui/Abbr.tsx` + `GLOSSARY` exist but are only wired for **GP** (Property Detail) and **EF** (Supplier Portal). Adopt `<Abbr>` for remaining first-use spots if desired (ORN, GN). Note: LTIFR and COP already self-expand in adjacent text, so they're low priority.
4. **Per-hotel "renewable share" vs portfolio 12%.** Portfolio renewable is now 12% everywhere; the per-hotel `renewablePct` values (0–42%) in `PORTFOLIO_HOTELS` are hotel-level and consistent, but if anyone wants the portfolio figure to be a *derived* weighted average rather than a constant, compute it from the hotel data.

### Verification checklist before each push
- `npm run lint` (= `tsc --noEmit`) must pass.
- Spot-check at desktop (1440) **and** mobile (375) — the sidebar drawer + KPI tiles.
- Confirm hotel names/counts stay consistent if you touch `mock.ts` or `propertiesData.ts` (both must describe the same 10 hotels).
