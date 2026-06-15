# Hotel Optimizer — Session Handover

**Project path:** `/Users/alkeshrajdev/Documents/Cloude/hotel-optimizer`
**GitHub:** `https://github.com/Alkeshrajdev/HotelOpt` (branch: `main`)
**Vercel:** `https://hotel-optimizer.vercel.app` (auto-deploys on push to main)
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS 3 + Supabase

---

## Current status (updated 2026-06-15)

Latest commit on `main` (Vercel auto-deploys): Task 1 (ORN normalisation) + Task 2 (carbon-spine / single-dataset reconciliation). `npm run lint` (= `tsc --noEmit`) passes clean; no runtime console errors.

### Session 2026-06-15 (cont.) — Task 2: Carbon spine / single-dataset reconciliation (DONE, verified)
Collapsed the stale "~⅛-scale" dataset ("Scale A") that lived in OverviewTab + the entire Performance hub into the canonical `PORTFOLIO_HOTELS` dataset. **Decisions:** headline carbon = **Scope 1+2 (location-based)** with Scope 3 shown separately; full breadth (exec + performance hub); carbon target refit.
- **`normalise.ts`** — added the canonical spine: `PORTFOLIO` totals (ORN 715k · Energy 84,200 MWh · Water 552,000 m³ · Waste 8,420 t · Cost $12.892M), `CARBON` (S1 3,428 · S2loc 14,569 · S2mkt 12,400 · S3 24,853 · **S1+2 17,997** · total 42,850 — reconciles exactly to Σcarbon_t), intensity helpers (`carbonS12PerOrn` 25.2 · `portfolioEnergyPerOrnTotal` 117.8), and `hotelCarbon()` per-hotel scope split (S1+2 allocated by energy share, S3 = residual).
- **OverviewTab** — tiles + efficiency intensities + trend all reconciled (Total spend $4.8M→$12.9M, Energy →84,200, Water →552,000, Carbon →17,997 S1+2 with S3 24,853 separate, carbon intensity 16.3→25.2). Trend arrays rescaled via one derived factor (seasonality preserved). Carbon-chart 2030 target line refit 11.0→17.0.
- **Performance hub** (reconciled to canonical, mostly via parallel subagents + my fixes): `PillarOverview/ByProperty/Performance/Benchmarks`, `EnergyOverview/ByProperty/Benchmarks/Performance`, `CarbonInventory`, `Overview`, plus shared **`pillarData.ts`** (KPIs/trends/by-property) and **`Drilldowns.tsx`** `ScopeDrilldown` (S1 donut 1,820→3,428, S2 6,140→14,569, trends/contributors rescaled), and `GuestEngagement` Scope 3 22,640→24,853.
- **Rescale factors used** (per-property/peer/monthly series): energy total ×8.505 / int ×4.908 · water total ×5.823 / int ×3.357 · waste total ×20.05 / int ×6.5–11.55 (base-dependent) · carbon total ×2.674 / int ×1.546.
- **Verified:** `tsc --noEmit` clean; no residual 6,730/9,900/94,800/22,640/60,539 anywhere; browser spot-checks (exec, carbon overview 17,997/25.2/24,853, energy 117.8) clean, no console errors. Carbon **target** already canonical-consistent (22% reduction from 54,900 baseline = 42,822 ≈ 42,850; monthly series sums to 41,850).
- **⚠️ Caveats / follow-ups:** (1) Per-property Performance tables are **uniform-rescaled** to the canonical average, NOT yet sourced row-by-row from `PORTFOLIO_HOTELS` per-hotel (rooms etc. still differ) — a deeper refactor if exact per-hotel parity is wanted. (2) `ESG_TOTALS` (mock.ts) is **dead code** with stale numbers — left as-is. (3) **Waste diversion 64%** vs canonical waste-stream split (~54% incl WtE / ~42% excl) is a separate definitional (WtE) issue — flagged for a waste pass, NOT touched here. (4) Smart Ops module is single-asset real-time data (different granularity) — intentionally out of scope.

### Session 2026-06-15 — Legacy-vs-upcoming review + Task 1 (ORN normalisation)
- **`REVIEW.md`** (repo root) — full review of the legacy "Hotel Optimiser" tool (from 4 `.xls` exports: Utilities Consumption, Utilities Performance & Carbon, Benchmark & Genuine Performance, Waste Performance) vs this upcoming React app. Inputs/outputs status tables, dashboard recommendations, avoid-list, and a critical-missing backlog.
- **Task 1 — ORN as the canonical denominator (DONE, verified, unpushed):**
  - `src/lib/normalise.ts` (NEW) — single source of truth: `DENOM`/`UNIT`, per-hotel helpers (`costPerOrn`/`carbonPerOrn`/`energyPerOrn`/`waterPerGn`/`occupancyPct`), denominator-weighted portfolio aggregates, `findHotelMetricsByName` bridge to the registry.
  - `mock.ts` `PORTFOLIO_HOTELS` — added `arn` (available room-nights) + `utility_cost_usd` to all 10 hotels (occupancy 55–84%, $/ORN $5–26).
  - `dataCaptureConfig.ts` — ORN re-labelled as canonical; added optional Guest-nights field (water basis).
  - `DataCapture.tsx` — real occupancy validation (`validateOccupancy`): ORN ≤ rooms×days, typed occupancy % must reconcile.
  - `OverviewTab.tsx` — new **Cost per ORN** snapshot tile (derived, $18.0 portfolio).
  - `PropertyDetail.tsx` — new "Normalised performance" card (Cost/Carbon/Energy per ORN + Water/GN + occupancy), bridged by name. Skyline verified: $25.4 · 86.7 kgCO₂e/ORN · 164 kWh/ORN · 794 L/GN · 70%.
  - **Decision:** water stays L/guest-night (CHSB/HWMI benchmark basis), documented exception; everything else on ORN. Mechanical "sweep" of remaining intensity labels was **deliberately skipped** — low value, and the real issue is the basis split below.
  - **⚠️ Carried to carbon-spine task:** Exec OverviewTab snapshot/efficiency tiles are hardcoded on a *different, smaller basis* (Carbon 6,730 t "Scope 1+2", 9,900 MWh, 94,800 m³ → ~16 kgCO₂e/ORN) than `PORTFOLIO_HOTELS` (42,850 t / 84,200 MWh / 552,000 m³ → ~60 kgCO₂e/ORN, which property pages already show). NOT silently rederived here because it flips headlines + breaks 2030 targets. Reconcile both, with targets, in the carbon-spine task.

## Prior status (2026-06-12)

Latest commit: **`a0f443d`** on `main` (Vercel auto-deploys). `npm run lint` (= `tsc --noEmit`) passes clean; no runtime console errors.

Three review passes were completed: a **data-consistency / substance** review, a **UI/UX design-expert** review, then a **density / layout cleanup** (per the client's "minimal, data-dense, no empty space" direction). The app is now consistent, substance-first (real operational/$ metrics, not vanity scores), data-dense, and the daily "scan → decide → act" loop is much cleaner.

### Pass 1 — data consistency & substance
1. **One hotel dataset everywhere** — dashboard and Properties/Review/Guest used two different hotel lists. Everything now uses the canonical 10 hotels from `PORTFOLIO_HOTELS` (`mock.ts`); `propertiesData.ts` rewritten to match, generic names renamed across ~18 files, count unified to **10** (topbar/sidebar/Billing).
2. **Targets progress bug** — "0% to go" while "At Risk". Now baseline→target (direction-aware) in `TargetsTab.tsx` via `baseVal`/`baseLabel`/`higherIsBetter` on `PORTFOLIO_TARGETS`.
3. **Renewable share** reconciled to **12%** across Performance/benchmarks/drilldown/guest page (was a 78% placeholder).
4. **Currency** — Smart Ops AED→USD, later unified to `$` prefix to match the rest of the app.
5. **Responsive** — sidebar is an off-canvas drawer + hamburger below `lg`; KPI tiles no longer clip on mobile.
6. **Sustainability score explained** — ⓘ tooltip (`InfoHint`) on Properties + Property Detail.
7. **Polish** — demo session persists across refresh (localStorage `ho_demo`); Admin "Stub"→"Soon"; jargon glossary (`Abbr`) wired for GP/EF.

### Pass 2 — UI/UX design review (P0 → P2)
8. **Review & Approval (P0)** — detail panel is now a right **slide-over drawer** so the queue table is full-width; flag cells capped to 1 + "+N"; nav badge + dashboard "Pending approvals" aligned to the real queue count (4). (`ReviewApproval.tsx`)
9. **"Needs attention" panel (P1)** — act-first entry point at the top of the dashboard Overview, built from the previously-dead `ACTION_CENTRE` data; severity-coloured cards deep-link to each page. (`OverviewTab.tsx`)
10. **Hotels cert signal (P1)** — dropped the green "Certified" pill from the performance-RAG card header (it's in the neutral stats row); no more green badge on a red card. (`HotelsTab.tsx`)
11. **Reports/Certs IA (P1, Option A)** — three pages stay distinct (generate disclosures · manage cert schemes · portfolio rollup) but clarified + cross-linked. "Portfolio → Reports & Certs" renamed **"Reporting Readiness"**; Reports↔Certifications cross-links; shared certificate block's canonical home is Certifications.
12. **Header actions wrap (P2)** — `PageHeader` action buttons wrap instead of clipping (fixes Property Detail). NOTE: subtitle/eyebrow rendering was briefly added here then **removed in Pass 3** (see below) — `PageHeader` now renders **title + actions only**; the `subtitle`/`eyebrow` props are kept for compat but intentionally not output.
13. **Chart flash (P2)** — `isAnimationActive={false}` on Environment (28 series) + Social & Governance (2 bars). Data Capture method pills capped to 3 + "+N".

### Pass 3 — density / layout cleanup ("minimal, data-dense")
14. **Stripped filler text** — `PageHeader` no longer renders paragraph subtitles/eyebrows; removed instructional helper lines (Reports "Report types", Certifications "Certification portfolio", Data Capture steps 1 & 2, External/Genuine empty-state hints, the two "Switch to … in the sidebar" hints); dropped the "Executive Snapshot" filler label. **Kept** functional descriptors (chart legends, axis explanations, domain notes).
15. **Compact KPI tiles** — `KpiTile` redesigned: label + small (32px) icon on one row, then value/delta; `p-6`→`p-4`. Removed the dead vertical space on Performance & Smart Ops. Dashboard `SNAP_TILES` (`OverviewTab`) aligned to the same pattern.
16. **Fixed empty-space / alignment on flagged pages** (`a0f443d`):
    - **S&G supplier funnel** (`SocialGovernanceTab`) — was capped at `max-w-xl` (right half empty); funnel now fills width + summary stats moved to a right rail.
    - **Performance › Governance "Outstanding items"** (`GovernanceOverview`) — was label-left / chip-far-right with an empty middle; now an aligned Item · Owner · Due · Status table.
    - **Portfolio Setup** (`PortfolioSetup`) — Hotels & Escalations tables sized to content (no inter-column chasms); Groups cards in a 2-col grid; Rules settings in a 2-col section layout (was a narrow `max-w-2xl` form). Targets/Users left full-width (already dense, 9–11 cols).
    - **Reporting Readiness › Generate Report** (`PortfolioReports`) — wizard widened `max-w-2xl`→`max-w-4xl`. The other tabs' tables (8–10 cols) already fill the width.

**Consciously deferred** (structural/subjective, not "polish"): Performance double-tab rework; section anchors on long pages; period-control vocabulary alignment; AI Assistant 1024–1280 tightness; Guest Engagement property picker. Also still slightly airy by design: the small 3–4 KPI/stat summary rows (standard dashboard pattern — tighten only if the client asks). See the design-review notes for rationale.

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
  Reporting Readiness   ← portfolio framework/cert readiness rollup (was "Reports & Certs")
```

---

## Way forward — open actions

Ordered by impact. None are blocking; the app is consistent and demoable. The big consistency + UX items from both review passes are done (see Current status). What remains is structural/subjective or minor.

### Structural / subjective (treat each as its own scoped task, not a drive-by)
1. **Performance double-tab nav.** Two stacked tab rows (6 pillars × 4 views) add cognitive load. Consider a left segmented pillar rail or a pillar dropdown with views as the primary tabs, or a breadcrumb. Touches the whole Performance shell — design it deliberately. Files: `pages/performance/Shell.tsx` + pillar pages.
2. **Section anchors on long pages** (Environment, Reports, Property Detail, Smart Ops). Sticky in-page sub-nav / anchor chips to cut scrolling. Lower priority now that subtitles + the "Needs attention" panel improved orientation.
3. **Guest Engagement property picker.** Page is scoped to one property ("Skyline Dubai") with no on-page selector; wiring a real picker means threading property state through the whole page.

### Minor / cosmetic
4. **Wider jargon coverage.** `components/ui/Abbr.tsx` + `GLOSSARY` are wired only for **GP** + **EF**. Adopt `<Abbr>` for ORN/GN if desired (LTIFR/COP already self-expand nearby).
5. **Currency compacting.** Now consistently `$`-prefixed, but Smart Ops shows full numbers (`$49,610`) vs the dashboard's compact `$4.8M`. A `formatCurrency(n, {compact})` helper would unify the *magnitude* style too.
6. **Period-control vocabulary.** Smart Ops uses `Day/Week/Month/Year/Custom`; dashboard/Performance use `Monthly/Quarterly/Annually`. They're genuinely different controls (real-time ops vs reporting aggregation) — align labels only if it doesn't blur that distinction.
7. **Derived renewable %.** Portfolio renewable is a 12% constant; could be computed as an energy-weighted average from `PORTFOLIO_HOTELS` if a live figure is wanted.

### Verification checklist before each push
- `npm run lint` (= `tsc --noEmit`) must pass.
- Spot-check at desktop (1440) **and** mobile (375) — the sidebar drawer + KPI tiles.
- Confirm hotel names/counts stay consistent if you touch `mock.ts` or `propertiesData.ts` (both must describe the same 10 hotels).
