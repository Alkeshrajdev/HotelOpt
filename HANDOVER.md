# Hotel Optimizer — Handover

**Updated:** 2026-09-12 · Read this first. The session-by-session changelog that used to live here is in [docs/HISTORY.md](docs/HISTORY.md); the legacy-vs-new product review is in [REVIEW.md](REVIEW.md); the v2 product spec is in `/Users/alkeshrajdev/Documents/Cloude/hotel-optimizer-v2/docs/` (Product_Technical_Development_Guide_v2.0.md, Owners_Requirements_Rev2.md, HANDOVER.md).

---

## 1. Where things are

| Item | Value |
|---|---|
| Repo | `/Users/alkeshrajdev/Documents/Cloude/hotel-optimizer` — GitHub `Alkeshrajdev/HotelOpt`, branch `main` |
| Stack | React 18 · Vite · TypeScript · Tailwind 3 · Recharts · supabase-js 2.105 |
| Hosting | Vercel `hotel-optimizer.vercel.app` (project `prj_qdJsYWywcfEdP3nRxnKjeRgFNoh8`, team `team_vqV0m3ZukxTnxRHSS7g0QiFX`), auto-deploys on push to `main` |
| Backend | Supabase project **hotel-optimizer**, ref `tehwjoonuryqzvnotvxo`, region ap-south-1. Restored from paused on 2026-09-12. |
| Local env | `.env.local` → `VITE_SUPABASE_URL=https://tehwjoonuryqzvnotvxo.supabase.co`, `VITE_SUPABASE_ANON_KEY=sb_publishable_…` (publishable key) |
| **Production gap** | The Vercel build has **no Supabase env vars**, so production runs in demo mode. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Project → Settings → Environment Variables and redeploy. |
| Design system | `.claude/skills/ui-ux-craft/SKILL.md` (load before UI work) · chart palette `src/lib/chartPalette.ts` |

### Demo logins (password `HotelOpt!2026`)

| Email | Role | id |
|---|---|---|
| admin@demo.test | super_admin | 9ea9b680-a518-432a-8d74-19e1d39d417c |
| checker@demo.test | checker | 9fb5d261-d1b6-4d92-9cd9-d9678a1e459a |
| maker@demo.test | maker | 7822eb5b-6b72-482f-a81b-a9494855d0f3 |

Client `11111111-1111-1111-1111-111111111111` (Acme Hotels). Maker and checker have `user_properties` rows for all ten hotels. "Continue as Demo" on the login page sets `localStorage.ho_demo=1` and runs the app on the mock dataset with no network calls.

---

## 2. Run, check, test

```bash
npm run dev            # http://localhost:5173
npm run lint           # = tsc --noEmit (the only automated check; there are no unit or e2e tests yet)
npm run build
```

Restart a stuck dev server: `lsof -ti:5173 | xargs kill; nohup npm run dev > /tmp/ho-dev.log 2>&1 &`

**Live vs demo.** `useDataMode()` (`src/lib/data/mode.ts`) is `live` when Supabase is configured and the session user is not `"demo"`. Pages branch on it; in live mode the portfolio pages show a `LiveDataNotice` because they still use the mock dataset.

**Testing in the browser.** Never type passwords into the app from automation. Mint a session instead:

```bash
node scripts/mint-session.cjs maker@demo.test 'HotelOpt!2026'
```

then in the page console: `localStorage.removeItem("ho_demo"); localStorage.setItem("sb-tehwjoonuryqzvnotvxo-auth-token", <json>); location.reload()`. Scripts must never call `signOut()` — it revokes the session the browser is using.

**Database work.** Use the Supabase MCP (`apply_migration` for schema, `execute_sql` for checks). `execute_sql` returns only the **last** statement's rows — run one statement per call when you need the result.

**Push.** Commit with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, never stage `README.md` or `tsconfig*.tsbuildinfo`, then:

```bash
TOKEN=$(security find-generic-password -s "GitHub - https://api.github.com" -w) && git push "https://Alkeshrajdev:${TOKEN}@github.com/Alkeshrajdev/HotelOpt.git" main
```

---

## 3. Product rules already decided

- **Portfolio is the only cross-property section** (Dashboard, Properties, Compare, Setup, Reporting Readiness). Every other tool works on one property; the top bar's property selector is required there and "All Properties" is invalid outside Portfolio. Last-used property persists in `localStorage.ho.lastProperty`.
- **Reporting year is May → April** (`reportingYearRange`, `MONTH_ORDER` in `src/lib/data/performance.ts`).
- **Carbon = consumption × EF** matched by `source_type` + unit (suffix of `ef_unit`) + property country (ISO2), falling back to `GLOBAL`. Headline carbon is Scope 1+2 location-based; Scope 3 is shown separately.
- **ORN is the canonical denominator** (water stays per guest-night). Intensities need approved `activity_records` for the month.
- **Facts are pictures before sentences**; rows align, content fills (see the skill file). Charts use the chart vocabulary (Sankey for flows, bullet for target progress, waterfall for bridges, etc.).
- Smart Ops shows facts only — no savings claims or verdicts.

---

## 4. What is live, what is demo, what is missing

Status of every route. **Live** = reads/writes the Supabase project. **Demo** = renders the mock dataset in both modes. **Missing** = not built.

| Area | Route | Status | Detail |
|---|---|---|---|
| Login | `/login` | Live | Email + password via Supabase Auth, plus "Continue as Demo". No sign-up, password reset, invitations or MFA. |
| Portfolio › Dashboard | `/portfolio/dashboard` | Demo | Overview / Environment / Targets / Hotels / S&G tabs on `PORTFOLIO_*` mock data and `src/lib/flows.ts`. Banner in live mode. |
| Portfolio › Properties | `/properties`, `/properties/:id` | Live (directory) | Ten hotels from `properties` (name, short name, type, brand, city, country, currency, timezone, rooms, GFA). Facility fields, meter registry, users, certifications, QR points and audit tabs are mock defaults (`toRich()` in `src/lib/data/properties.tsx`). |
| Portfolio › Compare | `/portfolio/compare` | Demo | League per pillar, slope, bubble, table — on mock hotels. Row click sets the top-bar property and opens that property's genuine-performance view. |
| Portfolio › Setup | `/portfolio/setup` | Demo | Targets, groups, users, rules, escalations are local state. |
| Portfolio › Reporting Readiness | `/portfolio/reports-certifications` | Demo | |
| Performance › Overview | `/performance/:pillar/overview` | **Live** for energy, water, waste, carbon | `usePropertyPerformance()` → `buildPerformance()`: two reporting years of approved records, sources, monthly series, totals, intensities per ORN/GN. Social and governance overviews are mock. |
| Performance › Genuine performance | `…/genuine-performance` | Demo | Fixed-share engine on mock hotels (see §7). |
| Performance › Carbon inventory | `/performance/carbon/carbon-inventory` | **Live** | `usePropertyInventory()` → `buildInventory()`: Scope 1 (gas, diesel, refrigerant), Scope 2 location-based, Scope 3 Cat 1–7, Cat 8–15 as N/A with reasons, factors applied, approved-month coverage strips, and a banner for captured-but-unapproved rows. Demo mode keeps the old illustrative view. |
| Performance › Benchmarks, External comparison | | Demo | CHSB-style cohorts are mock numbers. |
| Data Capture | `/data-capture` | **Live** for manual entry of energy (grid, gas, district cooling, diesel, solar PV), water, waste, occupancy, purchases (Cat 1/2/4), business travel & commute (Cat 6/7), refrigerants (Scope 1) | Writes `consumption_records` (status `submitted`) or `activity_records`. Evidence files upload to the private `evidence` bucket and the record stores pointers in `source_payload.evidence`. Capture-time anomaly messages are persisted as typed `anomaly_flags`. Purchases, travel/commute and refrigerants write `emission_activities` with the factor resolved at capture (`ef_id`, `ef_value`, `tco2e`); if the library has no factor the submission is refused with the reason. In live mode the other methods (OCR, bulk, QR, API, survey, AI assist) are shown as "Not connected yet", and the remaining data types (ops events, cert evidence, custom) refuse to submit with a clear message instead of a fake success. In demo mode everything is simulated. |
| Review & Approval › Approval Queue | `/review-approval` | **Live** | Queue from `consumption_records` (`useReviewRecords`), role from the profile, approve / query / reject / resubmit (`transitionRecord`, `resubmitRecord`), comments, audit trail, anomaly flags, evidence list with pre-signed Open / Download links (10 min). SLA is 5 days from submission. |
| Review & Approval › Capture Status, Platform Review | | Demo | `src/lib/dataReadiness.ts` seeded model; the anomalies panel there is illustrative. |
| Smart Ops (Overview, Meters, End-uses, Assets, Alerts, Verification) | `/smart-ops/*` | Demo | Metering model, alerts and verification bridge on `src/lib/smartOps*.ts` mock data. No meter feed. |
| Actions | `/actions` | Demo | Local state only; "convert alert to action" and the pathway tile are mock. |
| Reports › GHG Inventory | `/reports/ghg-inventory` | **Live** | One property (the top-bar selection), one reporting year. Boundary and methodology, the full line-item table with basis and factor, totals, intensity per ORN, factors applied with standard and version, Cat 8–15 N/A reasons, and a CSV export of all of it. Demo mode keeps the old portfolio-wide mock report. |
| Reports (index) | `/reports` | Demo | |
| Certifications | `/certifications` | Demo | |
| Marketplace | `/marketplace` | Demo | |
| Supplier Portal, AI Assistant, Guest Engagement | `/supplier-portal`, `/ai-assistant`, `/guest-engagement` | Demo | AI Assistant answers are canned strings; no model is called anywhere in the app. |
| Billing | `/billing` | Demo | |
| Admin › Clients | `/admin/clients` | Demo | Account type / module entitlements live in `localStorage` (`src/lib/account.tsx`), not the database. |
| Admin › Users | `/admin/users` | Demo | Mock list; "Invite user" is not wired. |
| Admin › EF Library | `/admin/ef-library` | **Live (read)** | Lists every `ef_library` row with its real scope and Scope 3 category, region, version, value and standard; filters work. New EF / import / edit are not wired. |
| Admin › Pools, other tiles | `/admin/pools`, `/admin/:section` | Demo / stub | |

---

## 5. Emission sources — coverage audit

What the user asked: "all emission sources? Scope 1, 2, 3 categories 1–7?" Answer: **Scope 1, Scope 2 location-based and Scope 3 Cat 1–7 are computed from the database. Still missing: the Scope 2 market-based method, four Scope 1 fuels that have no enum value, and the client's own EEIO dataset.**

| Source | Scope | Capture form | Stored | Carbon computed | Gap |
|---|---|---|---|---|---|
| Grid electricity | 2 (location) | ✔ manual | ✔ `consumption_records` | ✔ EF by country (AE, CA-BC, CH, ES, FR, GB, ID, PT, SG, TH, ZA) | Market-based method, RECs/PPAs, supplier factors not modelled — the report says so rather than showing a number |
| District cooling | 2 | ✔ | ✔ | ✔ (AE + GLOBAL) | |
| Natural gas | 1 | ✔ | ✔ | ✔ kWh and m³ factors | |
| Diesel (generators) | 1 | ✔ | ✔ | ✔ kWh and litre factors | |
| Solar PV on-site | 2 (zero) | ✔ | ✔ | ✔ EF 0 | Export / net-metering not handled |
| LPG, purchased heat/steam, biomass, owned-fleet fuel | 1 / 2 | ✖ | ✖ (not in `energy_source` enum) | ✖ | Add enum values + EFs |
| Refrigerants (fugitive) | 1 | ✔ manual | ✔ `emission_activities` | ✔ (charged − recovered) × GWP, IPCC AR6 | Leak-rate screening and an equipment register would beat per-event entry |
| Water | — | ✔ | ✔ m³ with source | ✔ as Scope 3 Cat 1 (supply + treatment, DEFRA) | Treatment assumes 95 % return to sewer |
| Waste | 3 · Cat 5 | ✔ | ✔ kg by stream and route | ✔ per-route DEFRA factors | Hazardous and e-waste routes have no factor of their own |
| Cat 1 Purchased goods & services | 3 | ✔ manual (spend or mass, tier 1–3) | ✔ `emission_activities` | ✔ spend × EEIO, or mass × product-class average | EEIO factors are **indicative** — load the client's EXIOBASE/USEEIO set; only USD is priced; no commodity classification |
| Cat 2 Capital goods | 3 | ✔ same form | ✔ | ✔ spend × EEIO | As Cat 1 |
| Cat 3 Fuel- and energy-related (WTT, T&D losses) | 3 | — (derived) | — | ✔ computed from the stored energy records | Region-specific WTT and T&D loss rates not loaded; GLOBAL applies everywhere |
| Cat 4 Upstream transport | 3 | ✔ same form | ✔ | ✔ spend × EEIO | Distance/mass-based freight not modelled |
| Cat 6 Business travel | 3 | ✔ manual (mode + distance) | ✔ | ✔ distance × mode factor | `trips` is refused — it needs a distance; hotel-stay factor is a portfolio average |
| Cat 7 Employee commuting | 3 | ✔ same form | ✔ | ✔ distance × mode factor | Survey headcount is stored but not used to extrapolate |
| Cat 8–15 | 3 | ✖ | ✖ | N/A with a stated reason | Cat 13 (sub-let space) and Cat 14 (franchises) become real if the client has either; nothing records a lease or a franchise agreement yet |

**Approval gap.** `emission_activities` rows are written with status `submitted`, but the Review & Approval queue reads `consumption_records` only, so nothing can approve them in the app — the inventory counts approved rows and shows a banner for the pending ones. `record_comments.record_id` has a foreign key to `consumption_records`, so wiring the queue needs that constraint generalised (see §11).

---

## 6. AI integration — status

There is **no AI or OCR integration**. `package.json` depends only on supabase-js, clsx, lucide-react, react, react-dom, react-router-dom and recharts. What looks like AI is scripted: `AI_QUESTIONS` / `AI_EXTRACTED` and `SAMPLE_OCR` in `src/lib/dataCaptureConfig.ts` drive the AI-assist and OCR wizards; the AI Assistant page returns canned text; Actions' "AI recommendations" are static rows.

Recommended shape for the real thing (keeps keys server-side):

1. A Supabase Edge Function `classify-purchase` that takes invoice text or line items (or the evidence file path, read from the bucket with the service role) and calls Claude (`claude-sonnet-5` for cost, `claude-opus-5` where accuracy matters) with a JSON schema: `{ category: cat1|cat2|cat4, commodity: <UNSPSC/NACE code>, ef_match: <ef_library id>, quantity, unit, confidence }`.
2. Persist to `emission_activities` (it exists — §9) with `ai_confidence`, `ai_model` and `ai_rationale` in `source_payload`; rows under 0.8 confidence get an `ai-low` entry in `anomaly_flags` so the checker sees them first (the queue already renders that flag shape). The function should resolve the factor the same way `lib/data/factors.ts` does, so an AI-classified purchase and a hand-entered one are calculated identically.
3. OCR: the same function family with Claude vision on PDFs/images already stored in `evidence`.
4. Function secrets hold `ANTHROPIC_API_KEY`; the Vite bundle never sees it.

---

## 7. Genuine performance — engine vs spec

**What exists** (`src/lib/genuinePerformance.ts`): `Expected = baseline × (base + weather·CDD ratio + occupancy·ORN ratio + activity·covers ratio)` with fixed `SENSITIVITY` shares per utility and hard-coded per-hotel `DRIVERS`; `Genuine = (Measured − Expected) / Expected`; `gpBridge()`, `GP_EVENTS`, `GP_INITIATIVES` are illustrative. It runs on `PORTFOLIO_HOTELS` (mock), never on database records.

**What the v2 spec asks for**: a monthly regression of consumption on drivers (CDD/HDD, ORN, covers, laundry kg) over the baseline year; fit gates CV(RMSE) ≤ 25 % and NMBE within ±5 % (ASHRAE Guideline 14); a prediction interval so small deviations are not reported as genuine; a materiality floor; a three-tier fallback (regression → ratio normalisation → raw YoY) when data is thin; an operational-events register that explains residuals.

**What is missing to build it on live data**: weather. Open-Meteo is listed as an integration but never called; properties have no coordinates. Plan: add `lat`/`lng` to `properties`, a `weather_monthly` table (property, month, cdd, hdd, mean temp), an edge function that backfills from the Open-Meteo archive API (no key needed) on a schedule, then implement the regression in `src/lib/data/genuine.ts` reading `buildPerformance()` output plus `activity_records`.

---

## 8. Integrations — status

`INTEGRATIONS` in `src/lib/dataCaptureConfig.ts` (Opera Cloud, Open-Meteo, BMS/SCADA, QuickBooks, Xero, Hauler API, LeanPath, Traytracker) is static configuration with invented statuses and sync times; the API capture method only displays it. Admin › Integrations is a stub. There are **no edge functions, no OAuth connectors, no webhooks and no scheduled jobs** in the Supabase project. Order to build: Open-Meteo (needed by §7, no auth) → CSV bulk import with all-or-none commit → PMS occupancy (Opera Cloud OHIP) → accounting (QuickBooks/Xero) for spend-based Scope 3.

---

## 9. Data model

Migrations (all applied via the MCP; SQL is not in the repo — pull it with `list_migrations` / the dashboard if you need to reproduce):

| # | Name | Content |
|---|---|---|
| 01 | core_enums_and_tenancy | enums `user_role`, `pillar`, `energy_source`, `record_status`; `clients`, `properties`, `user_profiles`, `user_properties` |
| 02 | ef_library_records_audit | `ef_library`, `consumption_records`, `record_comments`, `audit_log` |
| 03 | rls_policies | RLS by client via `private.current_client_id()`, `private.is_super_admin()`, `private.has_property_access(uuid)`, `private."current_role"()` |
| 04–06 | seed demo client / users | client, three demo users |
| 07 | working_tool_schema | property columns (short_name, type, brand, city, currency, timezone), `activity_records` (ORN, ARN, guest nights, covers, laundry per property-month, unique per period), `tg_records_set_client_id` always derives client from property, `tg_audit_records` writes the audit log |
| 08 | seed_portfolio_two_years | ten hotels `a0000000-0000-4000-8000-0000000000NN` (01 Skyline Dubai … 10 Riverside Bangkok, country ISO2), approved records May 2024–Apr 2026 (energy by source in kWh, water m³ with `source_payload.source`, waste kg with `source_payload.route`), activity rows, an open queue |
| 09 | evidence_bucket | private bucket `evidence` (25 MB, PDF/PNG/JPEG/WebP/CSV/XLSX), policies: read for anyone with property access, insert for maker/checker/property_sm/super_admin. No update or delete policy on purpose. |
| 10 | ef_library_scope_categories | `ef_library` gains `factor_key`, `scope`, `category`, `basis`, `standard`, `notes`; `source_type` becomes nullable with a check that one of the two keys is present. Two partial unique indexes (an enum→text cast is not immutable, so a single `coalesce` index is impossible). |
| 11 | seed_scope1_scope3_factors | 36 factor rows: refrigerant GWPs (IPCC AR6), WTT + grid T&D, waste routes, water supply/treatment, travel modes, spend-based EEIO. EEIO rows carry `standard = 'EEIO (indicative)'` so the report can flag them. |
| 12 | emission_activities | Scope 1 fugitive + Scope 3 activity table. Reuses `tg_records_set_client_id`; adds `tg_audit_rows()` (a generic `tg_audit_records` that takes the table name from the trigger context). RLS mirrors `consumption_records`. Stores `ef_id`, `ef_value`, `ef_unit`, `tco2e` as applied at capture. |
| 13 | seed_scope1_scope3_activities | ~1,400 approved rows, May 2024 – Apr 2026, ten hotels: Cat 1 (food / goods / services), Cat 2, Cat 4, Cat 6, Cat 7 and two refrigerant events a year. Deterministic from `md5(property || period || salt)`, scaled by room count, seasonal, 3 % better in year two. |
| 14 | rescale_scope3_seed | Corrects migration 13's per-room scales (capital goods had come out larger than purchased goods). Audit trigger disabled for the update — a seed rescale is not a business event. |

Enums: `pillar` energy/water/waste/carbon/social/governance · `energy_source` electricity_grid/natural_gas/district_cooling/diesel/solar_pv · `record_status` draft/submitted/queried/approved/rejected · `user_role` maker/checker/property_sm/super_admin. `emission_activities.scope` (1 or 3), `category` (`cat1`…`cat15`) and `activity_type` (refrigerant / purchase / capital / upstream_transport / business_travel / commute) are checked text, not enums.

**Factor keys.** Non-energy factors are looked up by `factor_key`, which is deliberately the same string the capture form sends: a refrigerant gas code (`R-410A`), `waste_<route>`, `travel_<mode>`, `wtt_<source>`, `td_electricity_grid`, `water_supply` / `water_treatment`, `eeio_cat1_food` / `_goods` / `_services`, `eeio_cat2_capital`, `eeio_cat4_transport`, `goods_mass_average`. Matching is by key + the unit after the slash in `ef_unit` + region, falling back to GLOBAL.

Evidence object path: `<property_id>/<uuid>/<file name>` — the first folder is what the storage policies check.

Test rows created by sessions (safe to keep or delete): Airport Hotel Dubai electricity May 2026 `124f3503-f52b-4b62-9f46-39116b12d6aa` (approved with a checker comment) and June 2026 `41f605ec-e8f4-4a1b-ba87-bcde9eb8002b` (submitted, two flags, one CSV in the bucket). In `emission_activities`, two submitted test rows for Airport Hotel Dubai: a Cat 1 food purchase (48,250 USD, Sep 2026) and an R-407C release (8.5 kg net, Jan 2026, 16.2 tCO₂e) — the second is what makes the pending banner visible on the Carbon inventory for RY 2025/26.

App wiring: `src/lib/supabase.ts` (client) · `src/lib/auth.tsx` · `src/lib/data/mode.ts` · `src/lib/data/properties.tsx` (directory behind the top bar) · `src/lib/api.ts` (all queries, uploads, signed URLs) · `src/lib/data/records.ts` (queue adapter, flag mapping, evidence mapping) · `src/lib/data/performance.ts` (reporting-year builder) · `src/lib/data/factors.ts` (factor matching + form-value → factor key) · `src/lib/data/carbon.ts` (`buildInventory`, `usePropertyInventory`) · `src/lib/database.types.ts` (hand-maintained; regenerate with the MCP `generate_typescript_types` after schema changes).

**Where the inventory's numbers come from.** Utility lines are recomputed from the library on every load, so a factor correction restates them. Activity lines use the `tco2e` stored on the row, so the figure an approver saw is the figure that is reported. Both behaviours are stated on the page.

---

## 10. Pitfalls

- **Auth lock deadlock**: never await a Supabase query inside `onAuthStateChange`; `auth.tsx` defers profile loading with `setTimeout`. Symptom: pages make no network requests at all.
- **Popup blockers**: do not `window.open` after an `await`. Evidence links are pre-signed anchors for this reason.
- **`execute_sql` shows only the last statement's result.**
- **An enum→text cast is not immutable**, so `coalesce(source_type::text, factor_key)` cannot go in an index expression — `ef_library` uses two partial unique indexes instead.
- `round(double precision, int)` does not exist in Postgres: cast to `numeric` first. `sin()` in a seed expression is what makes the whole thing a double.
- The trigger overwrites `client_id`; the API passes a placeholder on insert.
- RLS: a maker or checker sees a property only with a `user_properties` row; the seed covers all ten.
- zsh globbing in the tool shell: quote `--include='*.ts'`; the working directory sometimes resets — use absolute paths or `git -C`.
- Never stage `README.md` or `tsconfig*.tsbuildinfo` (both are always dirty locally).
- Recharts `AreaChart` ignores `Line` children; use `ComposedChart` (see `StackedArea.tsx`).
- The security advisor only flags leaked-password protection (an auth setting, the owner's call).

---

## 11. Next-session plan (priority order)

1. **Vercel env vars** (§1) so production runs live. Five minutes.
2. ~~**Full Scope 1 + Scope 3 data model.**~~ **Done** (migrations 10–14, `lib/data/factors.ts`, `lib/data/carbon.ts`, Carbon inventory and GHG Inventory live). What it left open, in priority order:
   - **Approve Scope 1/3 activity.** `emission_activities` rows are submitted but the queue only reads `consumption_records`, so no one can approve them. Generalise `record_comments.record_id` (drop the FK or add a `table_name`), extend `useReviewRecords` / `transitionRecord` in `src/lib/data/records.ts` to cover both tables, and add a filter so a checker can see activity rows. This closes capture → approve → report for Scope 3.
   - **Replace the indicative EEIO factors** with the client's own EXIOBASE/USEEIO set, and price currencies other than USD (the form refuses non-USD spend today).
   - **Scope 2 market-based.** Needs a contractual-instruments table (RECs, PPAs, green tariffs, supplier factors) and residual-mix factors. The report currently states that it is not modelled.
   - **Missing Scope 1 fuels**: LPG, purchased heat/steam, biomass, owned-fleet fuel need `energy_source` enum values and EFs.
   - **Region-specific WTT and T&D** loss rates, and factors for the hazardous and e-waste routes.
   - **Base year** is not in the data model; the report prints "Not configured".
   - **Portfolio-level GHG reporting** is still out of scope by the product rule (Portfolio is the only cross-property section) — if the owner wants a consolidated corporate inventory, that is a Portfolio page, not this report.
3. **AI classification for purchases + OCR** (§6) as edge functions; wire the AI-assist and OCR wizards to them and persist their output with confidence flags.
4. **Genuine performance on live data** (§7): coordinates, weather ingestion, regression with fit gates, events register, then point the Performance › Genuine performance view and Portfolio › Compare at it.
5. **Portfolio dashboard and Compare on live data**: aggregate `buildPerformance()` across properties or add a SQL view of monthly totals per property × source; keep the chart vocabulary.
6. **Integrations** in the order of §8, starting with CSV bulk import (all-or-none commit into `consumption_records`) since the bucket and queue already exist.
7. **Users**: invitations and password reset via an edge function holding the service role; disable public sign-up.
8. **Tests**: Vitest for `buildPerformance`, `anomalyFlagsFor`, `reportingYearRange`, the IPF fitter in `flows.ts`; a Playwright smoke test for capture → approve → performance.
9. The remaining demo modules (Actions persistence, Certifications, Reports, Smart Ops on real meter feeds, Billing) are product decisions — confirm scope with the owner before building.
