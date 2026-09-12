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
| Performance › Benchmarks, External comparison, Carbon inventory | | Demo | CHSB-style cohorts and the Scope 1/2/3 inventory are mock numbers. |
| Data Capture | `/data-capture` | **Live** for manual entry of energy (grid, gas, district cooling, diesel, solar PV), water, waste, occupancy | Writes `consumption_records` (status `submitted`) or `activity_records`. Evidence files upload to the private `evidence` bucket and the record stores pointers in `source_payload.evidence`. Capture-time anomaly messages are persisted as typed `anomaly_flags`. In live mode the other methods (OCR, bulk, QR, API, survey, AI assist) are shown as "Not connected yet", and the other data types (procurement, travel/commute, refrigerants, ops events, cert evidence, custom) refuse to submit with a clear message instead of a fake success. In demo mode everything is simulated. |
| Review & Approval › Approval Queue | `/review-approval` | **Live** | Queue from `consumption_records` (`useReviewRecords`), role from the profile, approve / query / reject / resubmit (`transitionRecord`, `resubmitRecord`), comments, audit trail, anomaly flags, evidence list with pre-signed Open / Download links (10 min). SLA is 5 days from submission. |
| Review & Approval › Capture Status, Platform Review | | Demo | `src/lib/dataReadiness.ts` seeded model; the anomalies panel there is illustrative. |
| Smart Ops (Overview, Meters, End-uses, Assets, Alerts, Verification) | `/smart-ops/*` | Demo | Metering model, alerts and verification bridge on `src/lib/smartOps*.ts` mock data. No meter feed. |
| Actions | `/actions` | Demo | Local state only; "convert alert to action" and the pathway tile are mock. |
| Reports, GHG Inventory | `/reports`, `/reports/ghg-inventory` | Demo | The inventory table and CSV export use `CARBON` / `PORTFOLIO_SCOPE3_CATEGORIES` from `mock.ts`. |
| Certifications | `/certifications` | Demo | |
| Marketplace | `/marketplace` | Demo | |
| Supplier Portal, AI Assistant, Guest Engagement | `/supplier-portal`, `/ai-assistant`, `/guest-engagement` | Demo | AI Assistant answers are canned strings; no model is called anywhere in the app. |
| Billing | `/billing` | Demo | |
| Admin › Clients | `/admin/clients` | Demo | Account type / module entitlements live in `localStorage` (`src/lib/account.tsx`), not the database. |
| Admin › Users | `/admin/users` | Demo | Mock list; "Invite user" is not wired. |
| Admin › EF Library | `/admin/ef-library` | **Live (read)** | Lists every `ef_library` row with scope, region, version, value; filters work. New EF / import / edit are not wired. |
| Admin › Pools, other tiles | `/admin/pools`, `/admin/:section` | Demo / stub | |

---

## 5. Emission sources — coverage audit

What the user asked: "all emission sources? Scope 1, 2, 3 categories 1–7?" Answer: **Scope 1 and 2 stationary sources are live end to end; refrigerants and every Scope 3 category are forms or charts without storage or calculation.**

| Source | Scope | Capture form | Stored | Carbon computed | Gap |
|---|---|---|---|---|---|
| Grid electricity | 2 (location) | ✔ manual | ✔ `consumption_records` | ✔ EF by country (AE, CA-BC, CH, ES, FR, GB, ID, PT, SG, TH, ZA) | Market-based method, RECs/PPAs, supplier factors not modelled |
| District cooling | 2 | ✔ | ✔ | ✔ (AE + GLOBAL) | |
| Natural gas | 1 | ✔ | ✔ | ✔ kWh and m³ factors | |
| Diesel (generators) | 1 | ✔ | ✔ | ✔ kWh and litre factors | |
| Solar PV on-site | 2 (zero) | ✔ | ✔ | ✔ EF 0 | Export / net-metering not handled |
| LPG, purchased heat/steam, biomass, owned-fleet fuel | 1 / 2 | ✖ | ✖ (not in `energy_source` enum) | ✖ | Add enum values + EFs |
| Refrigerants (fugitive) | 1 | ✔ form (`refrigerants` type: gas, charged, recovered) | ✖ | ✖ no GWP table live | Needs `refrigerant_events` table + GWP factors (AR6) |
| Water | — | ✔ | ✔ m³ with source | — | Supply/treatment EF (Scope 3 Cat 1) not applied |
| Waste | 3 · Cat 5 | ✔ | ✔ kg by stream and route | ✖ no waste treatment EFs | Add DEFRA-style per-route factors |
| Cat 1 Purchased goods & services | 3 | ✔ form (`procurement` type with tier: spend / average / supplier-specific) | ✖ | ✖ | No spend-based EEIO factors, no classification |
| Cat 2 Capital goods | 3 | option in the same form | ✖ | ✖ | |
| Cat 3 Fuel- and energy-related (WTT, T&D losses) | 3 | — | derivable from stored energy | ✖ | Add WTT and T&D factors; compute from existing records |
| Cat 4 Upstream transport | 3 | option only | ✖ | ✖ | |
| Cat 6 Business travel | 3 | ✔ form (`travel-commute`, mode + distance) | ✖ | ✖ | |
| Cat 7 Employee commuting | 3 | ✔ form (survey headcount) | ✖ | ✖ | |
| Cat 8–15 | 3 | ✖ | ✖ | ✖ | Mostly not applicable to hotel operators; Cat 8/13 leased assets and Cat 14 franchises matter for brands. The inventory should list them as N/A with a justification. |

The GHG Inventory report and the Carbon inventory view show Cat 1–7 percentages, but those are constants in `mock.ts`.

---

## 6. AI integration — status

There is **no AI or OCR integration**. `package.json` depends only on supabase-js, clsx, lucide-react, react, react-dom, react-router-dom and recharts. What looks like AI is scripted: `AI_QUESTIONS` / `AI_EXTRACTED` and `SAMPLE_OCR` in `src/lib/dataCaptureConfig.ts` drive the AI-assist and OCR wizards; the AI Assistant page returns canned text; Actions' "AI recommendations" are static rows.

Recommended shape for the real thing (keeps keys server-side):

1. A Supabase Edge Function `classify-purchase` that takes invoice text or line items (or the evidence file path, read from the bucket with the service role) and calls Claude (`claude-sonnet-5` for cost, `claude-opus-5` where accuracy matters) with a JSON schema: `{ category: cat1|cat2|cat4, commodity: <UNSPSC/NACE code>, ef_match: <ef_library id>, quantity, unit, confidence }`.
2. Persist to a new `scope3_records` table with `ai_confidence`, `ai_model`, `ai_rationale`; records under 0.8 confidence get an `ai-low` flag so the checker sees them first (the queue already renders that flag).
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

Enums: `pillar` energy/water/waste/carbon/social/governance · `energy_source` electricity_grid/natural_gas/district_cooling/diesel/solar_pv · `record_status` draft/submitted/queried/approved/rejected · `user_role` maker/checker/property_sm/super_admin.

Evidence object path: `<property_id>/<uuid>/<file name>` — the first folder is what the storage policies check.

Test rows created by sessions (safe to keep or delete): Airport Hotel Dubai electricity May 2026 `124f3503-f52b-4b62-9f46-39116b12d6aa` (approved with a checker comment) and June 2026 `41f605ec-e8f4-4a1b-ba87-bcde9eb8002b` (submitted, two flags, one CSV in the bucket).

App wiring: `src/lib/supabase.ts` (client) · `src/lib/auth.tsx` · `src/lib/data/mode.ts` · `src/lib/data/properties.tsx` (directory behind the top bar) · `src/lib/api.ts` (all queries, uploads, signed URLs) · `src/lib/data/records.ts` (queue adapter, flag mapping, evidence mapping) · `src/lib/data/performance.ts` (reporting-year builder) · `src/lib/database.types.ts` (hand-maintained; regenerate with the MCP `generate_typescript_types` after schema changes).

---

## 10. Pitfalls

- **Auth lock deadlock**: never await a Supabase query inside `onAuthStateChange`; `auth.tsx` defers profile loading with `setTimeout`. Symptom: pages make no network requests at all.
- **Popup blockers**: do not `window.open` after an `await`. Evidence links are pre-signed anchors for this reason.
- **`execute_sql` shows only the last statement's result.**
- The trigger overwrites `client_id`; the API passes a placeholder on insert.
- RLS: a maker or checker sees a property only with a `user_properties` row; the seed covers all ten.
- zsh globbing in the tool shell: quote `--include='*.ts'`; the working directory sometimes resets — use absolute paths or `git -C`.
- Never stage `README.md` or `tsconfig*.tsbuildinfo` (both are always dirty locally).
- Recharts `AreaChart` ignores `Line` children; use `ComposedChart` (see `StackedArea.tsx`).
- The security advisor only flags leaked-password protection (an auth setting, the owner's call).

---

## 11. Next-session plan (priority order)

1. **Vercel env vars** (§1) so production runs live. Five minutes.
2. **Full Scope 1 + Scope 3 data model.** Add a generic `emission_activities` table (property, period, scope, category, activity type, quantity, unit, tier, supplier, ef_id, tco2e, status, source_payload) — or extend `consumption_records` — and persist the procurement, travel/commute and refrigerant forms into it. Extend `ef_library` with a `scope`/`category` column, GWP rows for refrigerants, WTT and T&D factors, waste-route factors, travel factors and spend-based EEIO factors. Then compute the Carbon inventory view and the GHG Inventory report from the database, with Cat 8–15 listed as N/A with reasons.
3. **AI classification for purchases + OCR** (§6) as edge functions; wire the AI-assist and OCR wizards to them and persist their output with confidence flags.
4. **Genuine performance on live data** (§7): coordinates, weather ingestion, regression with fit gates, events register, then point the Performance › Genuine performance view and Portfolio › Compare at it.
5. **Portfolio dashboard and Compare on live data**: aggregate `buildPerformance()` across properties or add a SQL view of monthly totals per property × source; keep the chart vocabulary.
6. **Integrations** in the order of §8, starting with CSV bulk import (all-or-none commit into `consumption_records`) since the bucket and queue already exist.
7. **Users**: invitations and password reset via an edge function holding the service role; disable public sign-up.
8. **Tests**: Vitest for `buildPerformance`, `anomalyFlagsFor`, `reportingYearRange`, the IPF fitter in `flows.ts`; a Playwright smoke test for capture → approve → performance.
9. The remaining demo modules (Actions persistence, Certifications, Reports, Smart Ops on real meter feeds, Billing) are product decisions — confirm scope with the owner before building.
