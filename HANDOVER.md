# Hotel Optimizer — Session Handover

**Project path:** `/Users/alkeshrajdev/Documents/Cloude/hotel-optimizer`
**GitHub:** `https://github.com/Alkeshrajdev/HotelOpt` (branch: `main`)
**Vercel:** `https://hotel-optimizer.vercel.app` (auto-deploys on push to main)
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS 3 + Supabase

---

## Push command (GitHub Desktop not available in CLI)
```bash
TOKEN=$(security find-generic-password -s "GitHub - https://api.github.com" -w)
git push "https://Alkeshrajdev:${TOKEN}@github.com/Alkeshrajdev/HotelOpt.git" main
```

---

## What was built this session

### 1. Sidebar — simplified & collapsible
**File:** `src/components/layout/Sidebar.tsx`
**Config:** `src/lib/nav.ts`

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
- `LogoDark.png` → Login left panel (green gradient, no container needed — user decided against image in sidebar)
- Sidebar uses styled text instead of logo image (see point 1)

### 5. Dashboard — chart diversity
**Files:** `src/pages/dashboard/OverviewTab.tsx`, `HotelsTab.tsx`, `EnvironmentTab.tsx`, `SocialGovernanceTab.tsx`

| Tab | New chart | Replaces / Adds |
|---|---|---|
| Overview | **Treemap** | Replaced horizontal BarChart for hotel contribution |
| Overview | **RadarChart** | Added — 6-pillar ESG score vs target |
| Hotels | **Heatmap matrix** | Added at top — 10 hotels × 6 metrics, colour-coded |
| Env/Waste | **Waterfall** (ComposedChart) | Added — YoY diversion change per stream |
| Social | **ScatterChart** | Added — training hrs vs LTIFR, bubble = headcount |
| Social | **RadarChart** | Added — governance completeness across 6 dimensions |

---

## Completed this session

- **Sankey diagram** — custom SVG in `EnvironmentTab.tsx` (`CarbonSankey` component). √ scaled nodes for readability, bezier connection bands, 3 scope groups with source breakdown. Carbon section only.
- **Topbar filter wiring** — `src/lib/dashboardFilter.ts` (`useDashboardFilter` hook). Filters `PORTFOLIO_HOTELS` by property + region → derives aggregates. Used in `OverviewTab` (KPI tiles + treemap), `HotelsTab` (heatmap + cards), `EnvironmentTab` (confidence %), `SocialGovernanceTab` (scatter, turnover, training, local sourcing).
- **Demo/live mode** — `DemoNotice` now shows amber banner when `!SUPABASE_CONFIGURED` OR `session.user.id === "demo"`. Renders in `AppShell` below Topbar. "Continue as Demo" button added to Login page.
- **Orphaned tab files** — already absent from filesystem; no action needed.

## Remaining / next ideas

- Sankey for Energy section (energy sources → end-uses) — same pattern as Carbon Sankey
- Wire topbar **period** filter to chart x-axis labels / data slice (requires mock data keyed by period)
- Push to GitHub / Vercel when ready for next demo

---

## Key file map

```
src/
  lib/
    nav.ts                  — sidebar nav structure (NavSection types)
    mock.ts                 — all mock data (PORTFOLIO_HOTELS, ESG_TOTALS, etc.)
    dataCaptureConfig.ts    — data capture pillar/method config
    auth.tsx                — Supabase auth + demo fallback
  components/layout/
    Sidebar.tsx             — sidebar with collapsible groups
    Topbar.tsx              — property/period/dataBasis filters
    AppShell.tsx            — layout wrapper
  pages/
    Dashboard.tsx           — 5-tab portfolio dashboard shell
    dashboard/
      OverviewTab.tsx       — Treemap + Radar + KPI tiles
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
- Current Supabase session = real user with role **maker** (so sidebar shows only Data Capture + Review & Approval)
- Demo fallback only activates when `VITE_SUPABASE_URL` is missing
- Role enum: `maker | checker | property_sm | super_admin`
