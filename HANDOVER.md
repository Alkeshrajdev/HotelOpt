# Hotel Optimizer — Session Handover

**Project path:** `/Users/alkeshrajdev/Documents/Cloude/hotel-optimizer`
**GitHub:** `https://github.com/Alkeshrajdev/HotelOpt` (branch: `main`)
**Vercel:** `https://hotel-optimizer.vercel.app` (auto-deploys on push to main)
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS 3 + Supabase

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

---

## Next task — Portfolio Dashboard redesign (NOT YET DONE)

This is the spec for the next session. Do **not** attempt to implement this yourself — hand it to the new session.

### Context
`src/pages/Dashboard.tsx` is the 5-tab shell (Overview / Environment / Targets / Hotels / Social & Governance).
`src/pages/dashboard/OverviewTab.tsx` is the current Overview tab — 6 equal KPI tiles + a composed chart + efficiency cards.
The topbar (`src/components/layout/Topbar.tsx`) currently shows Region + Year + "Approved only" filters for the dashboard route.

### What needs to be built

#### A. Remove old topbar filters from the dashboard route
In `src/lib/topbarContext.tsx`, the function `getTopbarConfig` returns for `/portfolio/dashboard`:
```
{ periodType: "year", showProperty: false, showRegion: true, showDataBasis: true }
```
Change it to:
```
{ periodType: "none", showProperty: false, showRegion: false, showDataBasis: false }
```
This removes Region, Year, and "Approved only" from the topbar on the dashboard. The topbar search bar and right-side controls (Ask AI, notifications, user) stay.

#### B. New FilterBar component inside the dashboard
Create `src/pages/dashboard/FilterBar.tsx`. It lives **below the tab bar** inside `Dashboard.tsx`, above the tab content. Dashboard.tsx owns the filter state and passes it down.

**Filter state type:**
```typescript
export type DashboardFilters = {
  hotelIds: "all" | string[];     // "all" or array of hotel IDs from PORTFOLIO_HOTELS
  mode: "year" | "month";
  year: number;                   // e.g. 2025
  month: number | null;           // 1–12, null in year mode
  comparison:
    | { type: "prior-year"; year: number }
    | { type: "same-month-ly" }
    | { type: "prior-month" }
    | { type: "custom"; year: number; month: number };
};

export const DEFAULT_FILTERS: DashboardFilters = {
  hotelIds: "all",
  mode: "year",
  year: 2025,
  month: null,
  comparison: { type: "prior-year", year: 2024 },
};
```

**Filter bar layout (left → right):**
1. **Properties dropdown** — expandable tree grouped by `region` from `PORTFOLIO_HOTELS`. Multi-select with indeterminate checkboxes. Selecting a region selects all its hotels. Label: "All Properties" / "EMEA (7)" / "3 of 10 properties" / hotel name.
2. **Divider** (1px vertical line)
3. **Mode toggle** — segmented control: `Year | Month`
4. **Period picker** — Year mode: single year `<select>`. Month mode: month `<select>` + year `<select>`.
5. **"vs" label + comparison selector** — Year mode: year `<select>` (defaults to year−1). Month mode: three pill buttons `Same month LY | Prior month | Custom` — Custom reveals month+year selects inline.

Regions in data: **EMEA** (7 hotels), **APAC** (2 hotels), **Africa** (1 hotel).

#### C. OverviewTab — accept filters + responsive data + redesign

`OverviewTab` receives `{ filters: DashboardFilters; onNavigate: (tab: string) => void }`.

**Data derivation:**
- Filter `PORTFOLIO_HOTELS` by `filters.hotelIds`
- Compute shares (`filteredEnergy / allEnergy`, etc.) to scale the hardcoded `MONTHLY` cost data
- `PORTFOLIO_SCOPE3_CATEGORIES` is exported from `src/lib/mock.ts` — use it for Scope 3 total

**Layout — four sections:**

**1. Executive Snapshot**
Title: `Executive Snapshot — {periodLabel}` e.g. "2025 vs 2024"

*3 primary tiles* (larger, `border-l-4` accent):
- **Total Spend** — `$X.XXM`, `−X.X% vs {compLabel}`
- **Total GHG** — `X.Xk tCO₂e`, unit `Scope 1, 2 & 3`, sub-label `S1+2: X.Xk · S3: X.Xk`, delta `−X.X% vs last year`
- **Est. cost avoidance** — `$Xk`, unit `vs {compLabel} spend`, highlight green

*3 secondary tiles* (compact horizontal — icon left, value right, delta chip far right):
- Energy (MWh), Water (m³), Waste diversion (%)

In **month mode** the tiles switch to monthly values: Total cost $Xk, Carbon intensity X.X kgCO₂e/ORN, Est. cost avoidance $Xk vs comparison; secondary: Energy cost $Xk, Water cost $Xk, Waste diversion %.

**2. Portfolio Cost & Performance**
Header right side: `Cost | Carbon` toggle (segmented control, year mode only).

Layout: `grid-cols-1 xl:grid-cols-12`
- **Chart (xl:col-span-8)**:
  - *Year / Cost mode*: 12-month stacked bars (energy/water/waste $k) + dashed prior-year line. Single Y-axis only (no dual axis, no carbon overlay on this chart).
  - *Year / Carbon mode*: Simple line chart of `intensity` per month + `ReferenceLine` at `y={11}` labelled "2030 target".
  - *Month mode*: Horizontal stacked bar chart — one row per filtered hotel, sorted by total descending. No toggle (carbon toggle only relevant in year mode).
- **Insights panel (xl:col-span-4)** — year mode only, 4 stacked cards:
  1. `X/12 months below prior year spend` (green highlight)
  2. Best month: month name + `−$Xk vs prior year`
  3. Peak carbon intensity: `X.X kgCO₂e/ORN` + month name
  4. Est. avoidance breakdown: mini progress bars for Energy / Water / Waste %

**3. Efficiency — intensity per occupied room night**
Keep as static portfolio-level benchmarks (not filter-reactive — data scales are inconsistent):
- Energy 24.0 kWh/ORN, −6%, 42% to target
- Water 0.23 m³/ORN, −8%, 50%
- Carbon 16.3 kgCO₂e/ORN, −10%, 52%
- Waste diversion: compute from `PORTFOLIO_HOTELS` weighted average (≈44%), progress toward 80% by 2030

**4. Hotel Performance** (new section, year mode)
Two side-by-side cards:

*Leaders — lowest carbon intensity* (filtered to `dataConfidence >= 70`):
- Rank 1–3 by `(h.carbonIntensity + h.yoyCarbon * 3)` ascending
- Show: rank badge, hotel name, region + confidence%, carbon intensity kgCO₂e/ORN, YoY chip

*Needs attention*:
- Score: `(70 − confidence) * 2` if confidence < 70, + `(carbonIntensity − 60)` if > 60, + `(2 + yoyCarbon) * 4` if yoyCarbon > −2
- Top 3 by score descending
- Show: warning icon, hotel name, reason string, carbon intensity, data% or YoY chip

Reason function:
```typescript
function attentionReason(h): string {
  if (h.dataConfidence < 50) return "Low data confidence";
  if (h.dataConfidence < 70) return "Data gaps detected";
  if (h.carbonIntensity > 70) return "High carbon intensity";
  if (h.yoyCarbon > -2) return "Minimal YoY improvement";
  return "Needs review";
}
```

**Remove:** bottom navigation pills (the 4 "Environment detail / Targets / Hotels / Social" buttons).

---

## Key file map

```
src/
  lib/
    nav.ts                  — sidebar nav structure (NavSection types)
    mock.ts                 — all mock data (PORTFOLIO_HOTELS, PORTFOLIO_SCOPE3_CATEGORIES, etc.)
    dataCaptureConfig.ts    — data capture pillar/method config
    auth.tsx                — Supabase auth + demo fallback (signInDemo)
    topbarContext.tsx        — per-route topbar filter config (getTopbarConfig)
  components/layout/
    Sidebar.tsx             — sidebar with collapsible groups
    Topbar.tsx              — property/period/dataBasis filters
    AppShell.tsx            — layout wrapper + DemoNotice
  components/ui/
    DemoNotice.tsx          — amber demo mode banner
  pages/
    Login.tsx               — sign in + "Continue as Demo" button
    Dashboard.tsx           — 5-tab portfolio dashboard shell (no FilterBar yet)
    dashboard/
      OverviewTab.tsx       — current: 6 equal KPI tiles + composed chart (to be redesigned)
      EnvironmentTab.tsx    — Carbon/Energy/Water/Waste with Waterfall
      HotelsTab.tsx         — Heatmap matrix + hotel cards
      SocialGovernanceTab.tsx — Scatter + Radar + existing charts
    DataCapture.tsx         — 5-step wizard incl. AiAssistWorkflow
    ReviewApproval.tsx      — Approval Queue + Capture Status tabs
  public/
    LogoLight.png           — coloured logo (white bg)
    LogoDark.png            — white logo (dark green bg)
```

---

## Auth / roles

- **Supabase configured** (`.env.local` has real URL + anon key)
- `signInDemo()` sets in-memory session with role `super_admin` — does not persist across hard navigation
- Role enum: `maker | checker | property_sm | super_admin`
- Demo profile activates when `VITE_SUPABASE_URL` is missing **or** user clicks "Continue as Demo"
