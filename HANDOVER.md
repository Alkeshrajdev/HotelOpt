# Hotel Optimizer — Session Handover

**Project path:** `/Users/alkeshrajdev/Documents/Cloude/hotel-optimizer`
**GitHub:** `https://github.com/Alkeshrajdev/HotelOpt` (branch: `main`)
**Vercel:** `https://hotel-optimizer.vercel.app` (auto-deploys on push to main)
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS 3 + Supabase

---

## Current status (updated 2026-06-22)

Latest commit on `main` (Vercel auto-deploys). `npm run lint` (= `tsc --noEmit`) passes clean; no runtime console errors. **This session: Data Readiness rework, Actions overhaul, property-page declutter, a 21-agent platform UX review, the quick-wins batch, and PR A (roster reconciliation) — all DONE. Next = PR A-2 (metric reconciliation) then PR B (shared client store + wire the top CTAs).**

### Session 2026-06-22 (cont.) — PR A: roster / identity reconciliation (DONE, verified)
The review's #1 trust-killer: the same hotel had different identities across pages. Fixed the unambiguous roster/identity/count issues (metric-number reconciliation deferred to PR A-2).
- **Canonical roster facts.** `mock.ts PROPERTIES` was a stale **8-hotel** array with wrong regions (Skyline APAC, Zermatt **Americas**) and wrong room counts. Rewrote it to the canonical **10** with correct region (EMEA 7 · APAC 2 · Africa 1) + rooms matching `PORTFOLIO_HOTELS` / `propertiesData`, adding the two missing hotels (Bay View Singapore, The Montrose Paris). Its only consumer is `performance/Internal.tsx` — note that view is **unreachable via nav** (`PILLAR_VIEWS` in `performance/Shell.tsx` omits `internal-comparison`), so the fix is correctness-not-visibility.
- **Deleted fabricated dead arrays.** `TOP_PROPERTIES` / `NEEDS_ATTENTION` (unused, only referenced in mock.ts) carried invented identities — "Skyline Dubai" located in **"Bali, Indonesia"**, "Whistler, Canada", plus non-existent hotels ("Coastal Inn", "Riverside Hotel"). Removed them with a pointer comment to derive from the canonical registry instead.
- **Smart Ops phantom hotel.** All 7 smart-ops pages hardcoded a **"Dubai Marina Hotel"** that isn't in the portfolio (14×). Renamed to the canonical flagship **"Skyline Dubai"** so ops data reconciles with reporting. (Verified live: alerts now read Skyline Dubai; phantom gone.)
- **Portfolio count 8→10.** `PortfolioReports` ("All 8 active hotels", "Entire portfolio (8 hotels)") and `GenerateReportModal` ("All 8 properties") now say 10.
- **Actions property picker.** `NewActionModal` listed only 6 of 10 hotels (my earlier code) — now derives from `PORTFOLIO_HOTELS` (all 10 + Portfolio).
- tsc clean; verified live (Smart Ops Skyline rename, no console errors); repo-wide sweep confirms no residual Dubai-Marina / Bali / "8 hotels" / "Americas".

**⚠️ Deferred to PR A-2 (metric reconciliation — riskier, touches the carbon spine + targets):** carbon intensity 25.2/ORN vs 59.5/RN vs ~54 (denominator + scope); Energy Overview 84,200 MWh vs By-Property sum ~24,767; independently-hardcoded YoY deltas; the ambiguous "6 of 8" cert/policy fractions (8 may be policy-areas, not hotels — verify each); the legacy 0–100 `score` scale (two scales: mock 92-based vs propertiesData 78-based) + Internal's hardcoded "92"/"78" KPIs. gfa values also still differ between rosters (not flagged, low-visibility).

### Session 2026-06-22 (cont.) — Platform UX review + quick-wins batch (DONE, verified)
Ran a 21-reviewer design/UX + power-user review (cross-cutting dimensions · surface reviews · persona journeys · adversarial synthesis → 202 raw findings, 24 prioritised). **Verdict:** best-in-class analytical core (GP engine, 3-bucket savings honesty, GHG rigor, Alerts Centre) held back by three systemic P0s — (1) unreconciled parallel datasets (same fact differs across pages; Skyline Dubai is simultaneously Dubai/APAC, EMEA and "Bali, Indonesia" with 240 vs 420 rooms; reporting says 8 hotels vs canonical 10), (2) the "act" half of the loop is largely non-functional (dead CTAs; two convert-to-action engines; DataCapture breaks in demo mode), (3) no shared client-state store so mutations evaporate on navigation. Full prioritised list + impact/effort matrix delivered in chat.

**Quick-wins batch shipped (verified live, tsc clean):**
- **a11y:** global `:focus-visible` ring in `index.css` (dark-sidebar variant) — restores keyboard focus app-wide (WCAG 2.4.7).
- **single-hotel nav bug:** `Sidebar.tsx` ran the role gate before the My Hotel substitution, so a `property_sm` got no sidebar route to their property. Moved the substitution above the gate.
- **property_sm resubmit bug:** `ReviewApproval.tsx` `MakerResponsePanel` was hard-gated to `role==='maker'`, so a single-property SM could never answer a query on her own record. Now `maker || property_sm`.
- **derived counts:** `PropertyDetail` SetupHealthCard users/cert-gaps/QR were hardcoded (5/12/4) regardless of property — now derived via `getAssignedUsers`/`PROPERTY_CERT_READINESS`/`getQrPoints`. ReviewApproval header subtitle derived from `summary` (note: PageHeader still doesn't render subtitles, so this is hygiene).
- **token drift:** `tokens.ts` pillar waste/carbon hex (#0D9488/#134E4A) disagreed with `index.css` (#14B8A6/#0F766E), so a chart series and a chip rendered different hues. Aligned `tokens.ts` to the CSS vars.
- **PageHeader eyebrow:** now rendered as a compact uppercase context label (subtitles still suppressed for density) — restores the only breadcrumb on smart-ops sub-pages.
- **DemoNotice mounted** in `AppShell` (it self-gates on demo session; demo is the default) — the honest "sample data only" banner finally ships.
- **dead links / microcopy:** SmartOpsOverview "View all"→`/actions` and "Details"→`/smart-ops/assets` (both were 404s); Certifications gap "Fix" `<a onClick=preventDefault>`→`<Link>`; fixed garbled AIAssistant refusal banner (dup phrase) + Supplier ConfidentialityCallout stray "()".
- **Deferred from quick wins:** `cn()`+`tailwind-merge` (dep not installed — skipped to avoid a network install + app-wide behavior change); making clickable rows keyboard-operable (`role`/`tabIndex`) folded into the P1 a11y pass.

### Session 2026-06-22 (cont.) — Declutter the property/My Hotel page (DONE, verified)
The property page is a setup/config hub, so the two **analysis** tabs were removed and their per-property detail relocated to where each already lives (client request — "not required here, it's already in a different section").
- **`PropertyDetail.tsx`** — removed the **Data Readiness** and **Genuine Performance** tabs (and their bodies + now-dead helpers `DataReadinessTab`/`GPSetupTab`/`PILLAR_READINESS`/`DimBar`/`Stat`/`YearTile` + unused imports). Property tabs are now Overview · Configuration · Users · Certifications · QR Points · Audit History. Baseline year still shows in Overview ("GP baseline") + SetupHealthCard; old `?tab=gp` / `?tab=data-readiness` deep-links fall back to Overview.
- **Genuine Performance relocation** — `performance/GenuinePortfolio.tsx` (`/genuine-performance`) leaderboard rows were a link into the property GP tab; now they **drill in within the section** — click a hotel → an inline `GenuinePerformancePanel` (Measured→Expected→Genuine + decomposition) with a "Property config" link. `GenuinePerformancePanel.tsx` is now consumed here.
- **Anomaly-detection relocation** — extracted the anomalies UI into **`components/review/AnomaliesPanel.tsx`** and rendered it in **Review & Approval → Capture Status** (under the monthly matrix), so the per-property monthly tracker + anomaly review now live together in one place. The old `components/properties/DataReadinessPanel.tsx` was deleted (matrix already exists in Capture Status; anomalies moved).
- **`RowActionsMenu.tsx`** — the "Configure baseline / GP" row action now points at `?tab=configuration` (was `?tab=gp`).
- Verified live: property page shows 6 tabs (no analysis tabs); GP section drill-in renders per-hotel detail; Capture Status shows the anomaly panel (acknowledge/remind intact). tsc clean; no console errors.

### Session 2026-06-22 (cont.) — Actions & Measures → action control centre (DONE, verified)
Reworked the page per the client brief: it mixed reduction measures, AI recs, market instruments, offsets, approval workflow and verified savings without enough separation. Now a typed control centre.
- **`lib/actionsData.ts`** (NEW) — the action model. `Action` with an 8-value `actionType` (operational-efficiency · water · waste · renewable-procurement · carbon-offset · behaviour-training · policy-governance · smartops-maintenance), 7-value `source` (smart-ops · performance-gap · certification-gap · ai · manual · marketplace · audit), **pillar-specific `impact` metrics** (kWh/$/tCO₂e · m³ · kg + diversion pp · people trained + completion % · policies) so social/governance never show a misleading "0 tCO₂e", plus cost/payback/ease/confidence/owner/due/requiredApproval/evidenceStatus/verificationStatus + calculationNote/verificationNote/approvalLog. Helpers: `savingsBuckets()` (Estimated pipeline = proposed/approved/in-progress · Implemented-monitoring = completed · **Verified** = verified — only Verified counts), `verifiedPathway()` (`PATHWAY_REQUIRED_TCO2E = 275`), `pillarProgress()` (pillar-specific, people/policy metrics count in-progress too), `matchesLens()` (7 lenses), `CONVERTIBLE_ALERTS` + `MARKET_DISCLAIMER`. Currency standardised to USD (fixes the old multi-currency mess).
- **`pages/Actions.tsx`** (REWRITTEN) — two tabs: **Reduction actions** (6 physical types) and **Market instruments** (renewable procurement + offsets, behind the required disclaimer banner, "excluded from verified reduction" — I-RECs/credits are no longer the first solution). Header shows the **3 savings buckets + "Verified reduction vs 2030 pathway" tile** ("50 / 275 tCO₂e", 18%). **Lens filter chips** (Quick win · High impact · Strategic capex · Certification blocker · Market instrument · Overdue · Awaiting approval) with live counts (Market-instrument lens switches tab). **Source badges** on every card. Cards are **compact by default (headline impact + compact stage badge); the full workflow pipeline + the 10-field grid + the 4 evidence/verification buttons (View evidence · calculation · verification · approval log) appear only when expanded** (chevron). **Smart Ops convert panel** — open alerts (asset · est. loss · tCO₂e) → "Convert to action" creates a `smartops-maintenance` action that shows linked asset/alert/estimated-loss and verified savings after closure (e.g. WTR-002 leak repair shows $13.9k/yr verified). New-action modal updated with action-type + market flag.
- Verified live: pathway 50/275 (18%); buckets 223/24/50; pillar progress shows MWh/m³/kg/people/policies (not CO₂e everywhere); expand reveals workflow + fields + evidence buttons; Overdue lens → 1; convert adds an action (10→11, pipeline updates); Market tab shows the disclaimer + 2 instruments. tsc clean; no console errors.

### Session 2026-06-22 — Data Readiness: monthly tracking + anomaly detection (DONE, verified)
Replaced the static 6-pillar snapshot with a real monthly tracker + driver-normalised anomaly detection, and made it the single source of truth shared with ReviewApproval's Capture Status tab.
- **`lib/dataReadiness.ts`** (NEW) — the canonical monthly-status model. Per (property, dataType) it generates a deterministic **24-month** series `{ month, status, value }` (seeded hash, no Math.random/Date) from `PORTFOLIO_HOTELS` + GP drivers; the UI windows to the last 12. 14 data types grouped by pillar (Electricity, District cooling, Natural gas, Diesel, Water, 4 waste streams, Refrigerant, Occupancy/ORN, F&B covers, Headcount, Training). Climate sets gate fuel applicability (N/A). Responsible contacts derived per hotel+role (deterministic name pool). `detectAnomalies()` flags monthly values vs a **driver-normalised expected** (degree-days · occupancy · activity, reusing GP `SENSITIVITY`), with MoM & YoY as supporting context; severity >±15% warn / >±30% critical. **Key design point:** a flagged anomaly is the *residual after* weather/occupancy are normalised out, so it's genuine by construction — the hint says what to physically check; the season note is context only (no false "driver-explained" labels). Summary + portfolio roll-up helpers (`readinessSummary`, `portfolioReadiness`, `portfolioAnomalyCount`).
- **`components/properties/DataReadinessPanel.tsx`** (NEW) — primary content of the property **Data Readiness** tab. Summary tiles (months tracked · coverage % · missing · open anomalies/critical); 12-month coverage matrix grouped by pillar with status chips, anomaly dots, per-row sparkline (anomalies highlighted), per-row + per-month coverage %; pillar filter + "approved only" lens + "Chase missing" bulk reminder. Anomalies panel: expected vs actual, deviation %, MoM/YoY, investigation hint, **acknowledge with reason code → audit trail**, remind owner. Click a populated cell → record modal; missing cell → reminder. The old 6-pillar readiness scores are kept as a **secondary** summary below. Dropped the stale hardcoded "Outstanding meters" card.
- **`components/review/ReminderModal.tsx`** + **`CaptureStatusChip.tsx`** (NEW, extracted) — the Task-11 ReminderModal and the status chip are now shared components (status chip gains the `submitted` state).
- **ReviewApproval consolidation** — `CaptureStatusTab` now consumes `lib/dataReadiness.ts` (all **10 canonical hotels** via `PORTFOLIO_HOTELS`, rolling 12 months, per-row/per-month coverage footer), deleting the local `STATUS_MOCK` (which covered only 3 stale-named properties — "Blue Horizon"/"Palm Residences" didn't exist in the canonical set). The two pages now share one model and identical responsible contacts.
- Verified live: property tab (Skyline 76% coverage · 8 missing · 6 anomalies/3 critical), acknowledge drops open count + writes audit trail, Capture Status renders 14 data types × 12 months with N/A + coverage footer, contacts match across both pages. tsc clean; no console errors.
- **Optional follow-ups:** wire `portfolioAnomalyCount()`/`portfolioReadiness()` into the dashboard "Needs attention" panel; a portfolio roll-up surface (which properties/months are missing). Anomaly generation is illustrative (seeded) — swap for real submissions when the backend lands.

### Session 2026-06-15 (cont.) — Task 12: Property page → pure setup/config hub (DONE, verified)
The property page (incl. single-hotel "My Hotel") still read as a performance page. Removed the always-visible **"Normalised performance"** card (cost/carbon/energy per ORN) and the **"Carbon vs benchmark"** hero stat from `PropertyDetail.tsx`; reframed the hero to setup/readiness (**Setup status · Data completeness · GP readiness · Certifications**). Performance still lives in the Performance module + the property's Genuine Performance tab. The property is now a clean configuration hub (hero → Setup Health → config tabs). Note: the property still has a "Genuine Performance" tab (opt-in); flag if it should move fully into the Performance module.

### Session 2026-06-15 (cont.) — Task 11: Admin/ops batch — billing, report tracker, reminders, 2-layer QC (DONE, verified)
Four features, each committed separately:
- **Billing → "Payments & tracking" tab** (`Billing.tsx`): dunning/overdue banner, payment summary (outstanding/next charge/paid-YTD/lifetime), payment history (charges/retries/refunds + receipts), cost-by-property breakdown, mid-cycle proration preview, credit notes.
- **Report availability tracker** (`Reports.tsx`): monthly/quarterly/annual reports with a recent-period status strip (available/pending/overdue/not-due), next-due, owner, per-row "Remind".
- **Reminder composer** (`Reports.tsx` `ReminderModal`): pick recipients (set of people) + subject (prefilled from the report) + message → send, with success state. Triggerable from any tracker row or header.
- **Two-layer QC (optional)** — per-account `platformReview` flag added to `lib/account.tsx`; toggle in the Admin → Clients provisioning card ("Platform review · 2nd-layer QC"). When on, a **"Platform Review"** tab appears in Review & Approval showing company-approved records awaiting platform sign-off, with **Approve / Bypass** actions + live counts. Off = company approval is final (bypass).
- All verified live in the browser; tsc clean; no console errors.

### Session 2026-06-15 (cont.) — Task 10: Account entitlements + single-hotel mode (DONE, verified)
Solved "where does a 1-hotel client manage their property when Portfolio is hidden?" with a per-account entitlements system provisioned from Admin. Root cause: the Portfolio nav group bundled the multi-hotel rollup WITH the only entry point to property management.
- **`lib/account.tsx`** (NEW) — `AccountProvider`/`useAccount()`: `accountType` (single/portfolio), `singleHotelId`, per-module flags (`portfolio, smartOps, engagement, performance, marketplace, actions`), persisted to localStorage. Mounted in `main.tsx`.
- **`nav.ts` + `Sidebar.tsx`** — each section tagged with a `module`; nav filters by **role AND entitlement**. Single-hotel: the Portfolio group collapses to a top-level **"My Hotel"** → that property's `PropertyDetail` (property-centric, choice C). Client header derives from the account.
- **`EntitlementGuard.tsx`** (NEW, mounted in AppShell) — redirects un-entitled URLs home (single-hotel `/portfolio/*` + `/properties` registry → the property; un-entitled module routes → home). Admin/Billing/core workspace are never module-gated (platform-operator tools).
- **`admin/Clients.tsx`** — live **"Account provisioning"** card: account-type segmented control + single-hotel property picker + module toggle switches + reset. Writes to AccountContext → **nav reshapes immediately** (this is both the real provisioning mechanism and the single-hotel preview).
- **`PropertyDetail.tsx`** — hides the "All properties" breadcrumb in single-hotel mode (shows "My Hotel").
- Verified live: flip Single↔Portfolio reshapes nav with no reload; module toggles show/hide; route guard redirects; persists across refresh; reset restores. tsc clean; no console errors.

### Session 2026-06-15 (cont.) — Task 9: Audit-ready GHG export (DONE, verified)
Built a structured, defensible GHG Inventory artifact tied to the canonical carbon spine (was just report-generation UI).
- **`pages/GhgInventory.tsx`** (NEW) at route **`/reports/ghg-inventory`** — GHG-Protocol metadata (period FY2025, organisational boundary 10 hotels · operational control, base year 2019, GWP IPCC AR6 100-yr, Scope 2 location-headline + market-memo, offsets reported separately), assurance/data-confidence block, full **Scope 1/2/3 inventory table** by source (from `SCOPE1_BREAKDOWN` / `SCOPE2_METHODS` / `PORTFOLIO_SCOPE3_CATEGORIES`) with totals from `CARBON` (S1+2 17,997 · S3 24,853 · total 42,850 · 25.2 kgCO₂e/ORN), **emission-factor provenance** table (source · standard · version), and offsets-separate panel.
- **Real CSV export** — `downloadCsv()` builds a Blob and downloads `GHG-Inventory-FY2025.csv` (metadata + inventory rows + totals). Verified functional.
- **Wiring** — App route added; Reports "GHG Inventory" card now navigates to the inventory (was opening the generate modal). tsc clean; browser-verified; no console errors. **This closes the last Critical-build item in REVIEW.md.**

### Session 2026-06-15 (cont.) — Task 8: Targets vs actual + gap-to-2030 (DONE, verified)
Replaced hardcoded, off-basis, all-"off-track" targets with a derived engine.
- **`lib/targets.ts`** (NEW) — `portfolioTargets()` derives **current** from canonical helpers (carbon 25.2 kgCO₂e/ORN · energy 117.8 kWh/ORN · water 556 L/GN · waste 42% TRUE diversion — same basis as the efficiency tiles), targets **2030**, and computes progress, gap-to-2030, **required vs actual annual rate** (energy/carbon actual = consumption-weighted per-hotel YoY), and a real **on-track / at-risk / off-track** status (ratio of actual÷required rate). Also `targetsOffTrackCount()`.
- **Result (derived, realistic mix):** Energy/Water/Cert/Data **on-track**, Waste **at-risk** (3.0 vs 3.6 pp/yr), Carbon **off-track** (achieving 4.1%/yr vs 6.5%/yr needed). Fixes the old off-basis values (energy "18.4 kWh/RN", water "342 L/GN") and the wrong 2025 target year.
- **TargetsTab** rewritten to consume the engine: 3-state status + colours, baseline→current→target pathway, gap-to-2030, "Needs X/yr · achieving Y/yr — on pace / short of pace". Banner shows the live mix.
- Dashboard ACTION_CENTRE "Targets off-track (4)" → **"Targets behind pace (2)"** (carbon off + waste at-risk), href → /portfolio/dashboard.
- Note: old `PORTFOLIO_TARGETS` (mock.ts) now unused — left for a cleanup pass. tsc clean; browser-verified; no console errors.

### Session 2026-06-15 (cont.) — Task 7: Retire opaque Sustainability Score (DONE, verified)
Replaced the black-box 0–100 "Sustainability score" (a composite the client dislikes) with a concrete, **sourced** benchmark standing.
- **`lib/benchmarks.ts`** — added `CARBON_COHORT` (S1+2 kgCO₂e/ORN: top quartile 18.24, median 21.95) + `carbonBand(s1s2PerOrn)` → {Top quartile / Above median / Below median}, tied to the CHSB cohort from Task 6.
- **PropertyDetail hero** — "Sustainability score X/100" → **"Carbon vs benchmark"** band (e.g. Skyline "Below median", Montrose "Top quartile"), via `hotelCarbon()` (normalise.ts) + `carbonBand()`. Removed `SUSTAINABILITY_SCORE_EXPLAINER` usage.
- **Properties summary** — "Average score (0–100)" → **"At/above CHSB median N/10"** (counts properties with carbon/ORN at/above cohort median).
- Note: `RichProperty.score` field + `SUSTAINABILITY_SCORE_EXPLAINER` constant are now unused (left in place; safe to delete in a cleanup). Verified: no "/100" anywhere; bands vary per property; tsc clean; no console errors.

### Session 2026-06-15 (cont.) — Task 6: Sourced benchmarks (DONE, verified)
Replaced anonymous, unsourced "Peer A/B/C" benchmark bars with cited industry-standard cohort reference points.
- **`lib/benchmarks.ts`** (NEW) — `BENCHMARK_SOURCE` (Cornell CHSB 2023 · full-service · hot/temperate · n=312; carbon per HCMI v1.2; water per HWMI 2.0; illustrative-cohort disclaimer) + `COHORT_MEDIAN_LABEL`/`COHORT_BEST_LABEL` + `benchmarkStd(metric)`.
- **`components/ui/BenchmarkSource.tsx`** (NEW) — cited provenance footnote (source · year · cohort · n · per-metric standard · disclaimer).
- **EnergyBenchmarks + PillarBenchmarks (water/waste/carbon)** — peers → "You / Cohort median / Top quartile" (median ≈ old Peer B, top quartile ≈ old Peer A; carbon renewable made realistic 18/35 not 84/92). Old "anonymised peers" footnotes replaced with `<BenchmarkSource metric=…/>`. **External.tsx** pool gets the same footnote.
- **Bug fix (pre-existing, now visible):** PillarBenchmarks carbon savings was computed in kg but labelled tCO₂e — "Opportunity 4,970,600 tCO₂e / $248,530,000" → fixed to **4,971 tCO₂e / $248,550** (added carbon to the ÷1000 kg→t conversion alongside waste).
- Verified: CHSB source + HCMI/HWMI suffixes render; "if you matched Top quartile"; tsc clean; no console errors.

### Session 2026-06-15 (cont.) — Task 5: Cost leakage / savings (DONE, verified)
Monetised the Genuine Performance engine — **cost leakage = genuine overspend × unit cost**. A hotel using more than its drivers predict is leaking money; the gap is the recoverable savings opportunity.
- **`lib/genuinePerformance.ts`** — added `gpCostImpact(property)` (per energy/water/waste: overspend volume × rate → $ leakage/saving) + `gpPortfolioCost()`. Rates match the canonical `utility_cost_usd` (Task 1): electricity $120/MWh, water $2/m³, waste $200/t. Carbon excluded (emission, not a bill).
- **GenuinePortfolio (`/genuine-performance`)** — new **"$ Impact / yr"** leaderboard column (leakage red / savings green) + **"Savings opportunity" $102k** summary tile (= sum of overspend across the 3 worsening hotels: Airport $64k, Marina $30k, Peaks ~$8k).
- **PropertyDetail GP panel** — `$ / yr` column per utility + footer "Net genuine $ impact: $X leaking/saved per yr" (e.g. Marina $30k leaking, Skyline −$243k saved).
- Verified: portfolio $102k ties to per-hotel + per-utility; tsc clean; no console errors.

### Session 2026-06-15 (cont.) — Task 4: Genuine Performance (DONE, verified)
Replaced the opaque, orphaned "GP Index (base 100)" with a concrete, defensible, **property-level** Measured→Expected→Genuine model. **Decisions:** concrete model leads (index dropped); all drivers (weather CDD/HDD + occupancy ORN + activity covers/laundry); GP is property-level.
- **`lib/genuinePerformance.ts`** (NEW) — engine: `Expected = baseline × (base + weather·CDD-ratio + occupancy·ORN-ratio + activity·covers-ratio)`, `Genuine = (Measured−Expected)/Expected`. Decomposition reconciles to raw (`raw% = weatherΔ + occΔ + actΔ + genuineΔ`). Derived per-hotel from PORTFOLIO_HOTELS + documented `SENSITIVITY` shares + per-hotel `DRIVERS` ratios. Helpers: `gpResult`/`gpAll`/`gpMonthly`/`gpLeaderboard`/`gpWorseningCount`.
- **`components/properties/GenuinePerformancePanel.tsx`** (NEW) — concrete per-utility Measured/Expected/Genuine table + plain-language insight + Raw-vs-Genuine chart + driver decomposition. Wired into PropertyDetail **"Genuine Performance"** tab (was "GP Setup"): GP-ready → results, else → setup checklist.
- **`pages/performance/GenuinePortfolio.tsx`** (NEW) — portfolio roll-up at **`/genuine-performance`** (was a dead redirect): genuine-improvement leaderboard by hotel (sorted, worsening flagged) + operational-events log + GP boundary note. 3 hotels worsening (Airport/Marina/Peaks — low-data laggards, drivers tuned so occupancy/activity fell faster than consumption), matching the dashboard "Adjusted performance worsening (3)".
- **Wiring/cleanup:** deleted dead `pages/performance/Genuine.tsx` (opaque index) + its Shell import; dashboard ACTION_CENTRE + Actions trigger now point at `/genuine-performance`. Verified: Skyline genuine −8.8% vs raw −4.8%, decomposition reconciles, tsc clean, no console errors.

### Session 2026-06-15 (cont.) — Task 2: Carbon spine / single-dataset reconciliation (DONE, verified)
Collapsed the stale "~⅛-scale" dataset ("Scale A") that lived in OverviewTab + the entire Performance hub into the canonical `PORTFOLIO_HOTELS` dataset. **Decisions:** headline carbon = **Scope 1+2 (location-based)** with Scope 3 shown separately; full breadth (exec + performance hub); carbon target refit.
- **`normalise.ts`** — added the canonical spine: `PORTFOLIO` totals (ORN 715k · Energy 84,200 MWh · Water 552,000 m³ · Waste 8,420 t · Cost $12.892M), `CARBON` (S1 3,428 · S2loc 14,569 · S2mkt 12,400 · S3 24,853 · **S1+2 17,997** · total 42,850 — reconciles exactly to Σcarbon_t), intensity helpers (`carbonS12PerOrn` 25.2 · `portfolioEnergyPerOrnTotal` 117.8), and `hotelCarbon()` per-hotel scope split (S1+2 allocated by energy share, S3 = residual).
- **OverviewTab** — tiles + efficiency intensities + trend all reconciled (Total spend $4.8M→$12.9M, Energy →84,200, Water →552,000, Carbon →17,997 S1+2 with S3 24,853 separate, carbon intensity 16.3→25.2). Trend arrays rescaled via one derived factor (seasonality preserved). Carbon-chart 2030 target line refit 11.0→17.0.
- **Performance hub** (reconciled to canonical, mostly via parallel subagents + my fixes): `PillarOverview/ByProperty/Performance/Benchmarks`, `EnergyOverview/ByProperty/Benchmarks/Performance`, `CarbonInventory`, `Overview`, plus shared **`pillarData.ts`** (KPIs/trends/by-property) and **`Drilldowns.tsx`** `ScopeDrilldown` (S1 donut 1,820→3,428, S2 6,140→14,569, trends/contributors rescaled), and `GuestEngagement` Scope 3 22,640→24,853.
- **Rescale factors used** (per-property/peer/monthly series): energy total ×8.505 / int ×4.908 · water total ×5.823 / int ×3.357 · waste total ×20.05 / int ×6.5–11.55 (base-dependent) · carbon total ×2.674 / int ×1.546.
- **Verified:** `tsc --noEmit` clean; no residual 6,730/9,900/94,800/22,640/60,539 anywhere; browser spot-checks (exec, carbon overview 17,997/25.2/24,853, energy 117.8) clean, no console errors. Carbon **target** already canonical-consistent (22% reduction from 54,900 baseline = 42,822 ≈ 42,850; monthly series sums to 41,850).
- **⚠️ Caveats / follow-ups:** (1) Per-property Performance tables are **uniform-rescaled** to the canonical average, NOT yet sourced row-by-row from `PORTFOLIO_HOTELS` per-hotel (rooms etc. still differ) — a deeper refactor if exact per-hotel parity is wanted. (2) `ESG_TOTALS` (mock.ts) is **dead code** with stale numbers — left as-is. (3) Smart Ops module is single-asset real-time data (different granularity) — intentionally out of scope.

### Session 2026-06-15 (cont.) — Task 3: Waste diversion / WtE (DONE, verified)
Killed the inflated hardcoded **64%** diversion (higher even than incl-WtE) and derived diversion from canonical `PORTFOLIO_WASTE_STREAMS` (Recycled 2,170 + Composted 1,360 + WtE 1,007 + Landfill 3,883 = 8,420 t). **Decision:** show **both equally** — TRUE diversion (excl WtE) **42%** / landfill diversion (incl WtE) **54%**, WtE kept its own line; target standardised to **60%** (matches PORTFOLIO_TARGETS). New helpers in `normalise.ts`: `WASTE`, `wasteDiversionExclWte`/`InclWte`/`wasteWtePct`/`wasteLandfillPct`/`wasteDiversionDual`. Surfaces: OverviewTab SNAP + efficiency tiles ("42 / 54%"), `pillarData.ts` + `PillarOverview` waste KPI, `Actions` trigger (42% excl WtE → 60% target), `GuestEngagement`, `PillarBenchmarks` "You" diversion 64→54 (incl-WtE, comparable to peers), per-property drilldown labelled "incl. waste-to-energy". tsc clean, browser-verified, no console errors.

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

## ✅ DONE (2026-06-22) — Data Readiness: monthly tracking + anomaly detection

Implemented as described below — see the **Session 2026-06-22** entry near the top for what shipped. The original build plan is retained here for reference / future extension (portfolio roll-up, backend wiring).

**Why:** The current Data Readiness tab (`PropertyDetail.tsx` `DataReadinessTab`) is a static *snapshot* — a 6-pillar grid of % scores (completeness / timeliness / evidence-match / approval), plus certification / supplier / public-page readiness cards and a short "outstanding meters" list. It does **not** show month-by-month coverage and has **no anomaly detection**. Make it practical: a real monthly data tracker + abnormal-value detection.

**Build plan:**

1. **Monthly coverage matrix (centrepiece).** Rows = data types / meters (Electricity, District cooling, Natural gas, Diesel, Water, each Waste stream, Refrigerant, Occupancy/ORN, F&B covers…), grouped by pillar. Columns = rolling last 12 months. Cells = status chip: **Approved / Submitted (pending) / Draft / Missing / N/A**. Per-month completeness % footer and per-row coverage %. Filter by pillar + "approved only". Click a populated cell → the record; click a Missing cell → quick "remind responsible".
   - **Reuse** the Capture-Status grid already in `ReviewApproval.tsx` (`STATUS_MOCK`, responsible person/email per data type) — ideally consolidate so one monthly-status model drives both the Capture Status tab and this matrix (avoid two sources of truth).
   - Reuse the **ReminderModal** built in Task 11 for the "remind" action (recipients prefilled from the responsible person).

2. **Anomaly detection.** Per data type/meter per month, flag spikes/drops vs (a) prior month, (b) same month last year, and (c) a **driver-normalised expected** value — reuse the GP engine's normalisation (`lib/genuinePerformance.ts` SENSITIVITY/DRIVERS: degree-days, ORN, covers) so a hot month or a fuller hotel isn't falsely flagged. Severity by deviation: e.g. >±15% = warn, >±30% = bad. Show **expected vs actual + % deviation + likely driver** (weather/occupancy/event vs genuine anomaly). Per-row 12-month sparkline with anomalous points highlighted. An "Anomalies" panel listing flagged month/data-type → drill to record, acknowledge/explain (reason code → audit trail), or log an operational event (which GP already accounts for).

3. **Workflow / actions.** Summary tiles (months tracked · % coverage · missing count · open anomalies). "Chase all missing this month" (bulk reminder). Acknowledge/resolve anomalies. Keep the existing readiness scores as a secondary summary.

4. **Data model.** New `lib/dataReadiness.ts` (or extend `reviewMock.ts`): a monthly series per (property, dataType) `{ month, value, status, responsible }` + a `detectAnomalies()` helper (MoM / YoY / driver-normalised). Wire to `PORTFOLIO_HOTELS` + GP drivers for the "expected" baseline.

5. **Surfaces.** Primary: the property **Data Readiness** tab (per-property matrix + anomalies). Optional portfolio roll-up (which properties/months are missing, portfolio anomaly count) — could feed the dashboard "Needs attention" (already shows "Missing meter data"). **Keep distinct from Smart Ops AlertsCentre** (that's real-time asset/BMS anomalies; this is monthly *submission/bill-level* tracking + anomaly review).

**Decisions to confirm when starting:** anomaly basis (MoM + YoY + driver-normalised — recommended — vs simple thresholds); whether to consolidate the monthly-status model with ReviewApproval Capture Status (recommended); portfolio roll-up scope.

---

## Admin Settings — section build plans

Status of every Admin tile (`pages/Admin.tsx`) and a build plan for each. **Live** = a real sub-page exists; **Stub** = tile labelled "Soon", opens the `AdminStub` shell (`/admin/:section`). Provisioning, entitlements and 2-layer QC are now driven by the account context (`lib/account.tsx`) — new admin sections should read/write that where relevant.

### Tenancy & branding
- **Clients & deployments** — *Live* (`admin/Clients.tsx`). Has the client list + the live **Account provisioning** card (account type, single-hotel picker, module toggles, platform-review 2nd-layer QC, reset). **Plan:** make each *client row* editable (per-client entitlements drawer, not just the current session account); a "New client" wizard (name, deployment type, billing entity, region, starting modules); data-isolation indicator; lifecycle (activate / suspend / offboard); cross-link to that client's billing + subscription.
- **White-label branding** — *Stub*. **Plan:** per-client theming — logo upload (light/dark), primary/accent colour pickers with a live preview pane (sidebar/topbar/login), custom domain + DNS/SSL status, email sender identity (from-name, domain, DKIM/SPF), favicon, login background, report header/footer branding, "reset to Hotel Optimizer default". Gate to deployment type = White-label.
- **Users & roles** — *Live* (`admin/Users.tsx`). **Plan/remaining:** a role→permission matrix (maker/checker/property_sm/super_admin + Corporate SM/Auditor/Client Admin), maker–checker rights per user, property/region scoping, bulk invite, SSO-provisioned vs manual, MFA/last-login status, role-change audit trail. (Note: Billing → Seat management overlaps — decide canonical home or cross-link.)

### Configuration
- **Property configuration** — *Stub*. **Plan:** platform-level property defaults + per-property overrides (GP baseline year, enabled pillars, climate station, units, currency, reporting year, certifications, ORN denominator, facilities). "Property template" for fast onboarding; bulk-apply to new properties. Mirrors the PropertyDetail Configuration tab at the template level.
- **Emission factor library** — *Live* (`admin/EFLibrary.tsx`). Versioned EFs by region/year/version. **Plan/remaining:** add/edit EF with effective-date ranges + source citation (IEA/IPCC/DEFRA/supplier), CSV bulk import, version lock/freeze for assurance, restate-prior-period uses the period-active EF, region-coverage gap report, GWP-set selector (AR5/AR6), change audit. (Feeds the GHG Inventory EF provenance.)
- **GP configuration** — *Stub*. **Plan:** expose the Genuine-Performance engine knobs (`lib/genuinePerformance.ts`): per-utility sensitivity shares (weather/occupancy/activity/base, validated to sum=1), composite weights, baseline-year rules, degree-day source (Open-Meteo), GP-ready minimum-data thresholds. Preview impact on a sample property. Currently those shares/drivers are hardcoded — make them configurable per portfolio.
- **Comparable pools** — *Live* (`admin/Pools.tsx`). **Plan/remaining:** pool definition rules (climate / star / size band / segment), per-client isolation, minimum pool size driving the Full/Directional/Reference tier (used by `External.tsx`), CHSB cohort mapping (ties to `lib/benchmarks.ts`), per-property opt-in/out, membership preview, anonymisation rules.
- **QR management** — *Stub*. **Plan:** QR-point registry per property, generate/print sheets (PDF), point→location/campaign assignment, activate/deactivate, destination URL per point, scan analytics (over time, by point), bulk generation. Ties to PropertyDetail QR Points tab + Guest Engagement.
- **Measure library** — *Stub*. **Plan:** capex/opex measure catalogue — per measure: default impact (energy/water/carbon %), payback years, capex band, applicability rules (property type/climate), recommended priority, M&V method. Powers auto-suggested Actions; CRUD + versioning. Ties to `Actions.tsx` + Marketplace.

### Knowledge & alerts
- **Knowledge base** — *Stub*. **Plan:** versioned articles/explainers (Knowledge Curator role), certification-criterion explainers, recommendation templates, category taxonomy, draft/publish workflow, search. Feeds AI Assistant + InfoHints + cert criteria.
- **Alert rules** — *Stub*. **Plan:** rule builder — anomaly thresholds (spike/drop %), SLA escalations (review overdue), deadline reminders (report/cert due), integration-failure alerts; per rule: condition, severity, recipients, channel (email/in-app), cooldown. Ties to Smart Ops AlertsCentre + the new reminder composer.
- **Report templates** — *Stub*. **Plan:** per-framework PDF/PPT/XLSX templates (GHG, GRI, CSRD, board pack), white-label overrides, section/field mapping, versioning, default-per-cadence, preview. Feeds the Reports generate flow, the new Report Tracker, and the GHG Inventory export.

### Connectors & access
- **Integrations & API keys** — *Stub*. **Plan:** OAuth connectors (QuickBooks/Xero/Workday/Opera PMS/BMS/Open-Meteo/hauler) — connect/disconnect, token status, last-sync, field mapping, sync logs/errors; webhooks; consolidate or cross-link the outbound API keys that currently live on the Billing page. Ties to `dataCaptureConfig.ts` API integrations.
- **Security & access** — *Stub*. **Plan:** SSO (SAML/OIDC), MFA enforcement policy, IP allowlists, session timeout / concurrent-session rules, password policy, sovereign-hosting / data-residency controls per client, RBAC review, security-event log (failed logins from the audit feed). Per-client where deployment = Sovereign hosting.
- **Subscriptions** — *Stub*. **Plan:** plan catalogue (tiers, base + per-property + white-label licence fees), trials, discounts/coupons, AI/OCR pass-through pricing, plan assignment per client, proration + dunning policy, cross-client revenue overview. **This is the platform-operator view across all clients**, complementary to the single-client **Billing** page (incl. the new Payments & tracking tab) — cross-link the two.
- **Platform audit log** — tile is *Stub*, but a working `AuditLog` is already rendered inline on the Admin landing. **Plan:** promote `/admin/audit` to a dedicated full page (the inline one is a preview), add CSV export, date-range filter, retention policy, tamper-evidence/hash-chain indicator, drill-to-record, more event types — and de-dupe the inline-vs-dedicated rendering.

> Build priority suggestion: **Subscriptions** (pairs with the Billing work just shipped) → **White-label branding** (high client-visible value, gated to White-label deployments) → **GP configuration** + **Property configuration** (unlock per-portfolio tuning of engines already built) → the rest.

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
