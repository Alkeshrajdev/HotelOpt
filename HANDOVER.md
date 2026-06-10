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
- `signInDemo()` sets in-memory session with role `super_admin` — does not persist across hard navigation
- Role enum: `maker | checker | property_sm | super_admin`
- Demo profile activates when `VITE_SUPABASE_URL` is missing **or** user clicks "Continue as Demo"

---

## Next task — Relocate Properties page

### The problem
`/properties` (`src/pages/Properties.tsx`) is currently a sidebar item in the workspace section alongside Data Capture and Review & Approval. This is wrong — it is a **portfolio-level admin/configuration tool**, not a day-to-day workspace tool.

What the Properties page actually is:
- Master registry of all 72 properties across the portfolio
- Shows per-property: status, rooms, GFA, region, brand, data completeness %, GP readiness, certifications
- Has "Add property" button and full advanced filter panel
- Eyebrow label: "Configuration hub"

Currently in `src/lib/nav.ts`:
```typescript
{ type: "item", to: "/properties", label: "Properties", icon: Building2, roles: ["property_sm", "super_admin"] },
```
This places it as a flat workspace item visible to both `property_sm` and `super_admin`.

### What needs to change

**1. Move into the Portfolio sidebar group** (`super_admin` only)

In `src/lib/nav.ts`, the Portfolio group currently has:
```typescript
{
  type: "group",
  label: "Portfolio",
  icon: FolderOpen,
  matchPrefix: "/portfolio",
  roles: ["super_admin"],
  items: [
    { to: "/portfolio/dashboard",              label: "Dashboard",       icon: LayoutDashboard },
    { to: "/portfolio/setup",                  label: "Setup",           icon: SettingsIcon    },
    { to: "/portfolio/reports-certifications", label: "Reports & Certs", icon: FileText        },
  ],
},
```

Add Properties as a new item in this group (or replace "Setup" if that page is a stub):
```typescript
{ to: "/properties", label: "Properties", icon: Building2 },
```

**2. Remove from workspace section**

Delete the flat `{ type: "item", to: "/properties", ... }` line from the workspace section.

**3. Remove `property_sm` access**

A property manager has no business managing the master property registry. The individual property detail page (`/properties/:id`) can remain accessible to `property_sm` but the registry list should be `super_admin` only — which is already enforced by it being inside the Portfolio group.

### Decision on "Setup" sub-item
Check whether `/portfolio/setup` has a real page or is a stub. If it's a stub/placeholder, replace it with Properties. If it has real content, keep both as separate items.
