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

### 6. Demo / live mode
**Files:** `src/components/ui/DemoNotice.tsx`, `src/components/layout/AppShell.tsx`, `src/pages/Login.tsx`

- `DemoNotice`: amber dismissible banner, renders in `AppShell` below Topbar
- Shows when `!SUPABASE_CONFIGURED` **or** `session.user.id === "demo"` (demo login active)
- **"Continue as Demo"** button added to Login page — calls `signInDemo()` (no credentials needed)
- Demo profile: role `super_admin`, all sidebar sections visible

---

## Key file map

```
src/
  lib/
    nav.ts                  — sidebar nav structure (NavSection types)
    mock.ts                 — all mock data (PORTFOLIO_HOTELS, ESG_TOTALS, etc.)
    dataCaptureConfig.ts    — data capture pillar/method config
    auth.tsx                — Supabase auth + demo fallback (signInDemo)
  components/layout/
    Sidebar.tsx             — sidebar with collapsible groups
    Topbar.tsx              — property/period/dataBasis filters
    AppShell.tsx            — layout wrapper + DemoNotice
  components/ui/
    DemoNotice.tsx          — amber demo mode banner
  pages/
    Login.tsx               — sign in + "Continue as Demo" button
    Dashboard.tsx           — 5-tab portfolio dashboard shell
    dashboard/
      OverviewTab.tsx       — Treemap (no animation) + Radar + KPI tiles
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
