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
| Data Capture | `/data-capture` | **Live** for manual entry of energy (grid, gas, district cooling, diesel, solar PV), water, waste, occupancy, purchases (Cat 1/2/4), business travel & commute (Cat 6/7), refrigerants and the owned fleet (Scope 1) | Writes `consumption_records` (status `submitted`) or `activity_records`. Evidence files upload to the private `evidence` bucket and the record stores pointers in `source_payload.evidence`. Capture-time anomaly messages are persisted as typed `anomaly_flags`. Purchases, travel/commute and refrigerants write `emission_activities` with the factor resolved at capture (`ef_id`, `ef_value`, `tco2e`); if the library has no factor the submission is refused with the reason. In live mode the other methods (OCR, bulk, QR, API, survey, AI assist) are shown as "Not connected yet", and the remaining data types (ops events, cert evidence, custom) refuse to submit with a clear message instead of a fake success. In demo mode everything is simulated. |
| Review & Approval › Approval Queue | `/review-approval` | **Live** | One queue over **both** `consumption_records` and `emission_activities` (`useReviewRecords`), role from the profile, approve / query / reject / resubmit, comments, audit trail, anomaly flags, evidence list with pre-signed Open / Download links (10 min). SLA is 5 days from submission. Activity rows show quantity → tCO₂e and, for a foreign invoice, the original currency. |
| Review & Approval › Capture Status, Platform Review | | Demo | `src/lib/dataReadiness.ts` seeded model; the anomalies panel there is illustrative. |
| Smart Ops (Overview, Meters, End-uses, Assets, Alerts, Verification) | `/smart-ops/*` | Demo | Metering model, alerts and verification bridge on `src/lib/smartOps*.ts` mock data. No meter feed. |
| Actions | `/actions` | Demo | Local state only; "convert alert to action" and the pathway tile are mock. |
| Reports › GHG Inventory | `/reports/ghg-inventory` | **Live** | One property (the top-bar selection), one reporting year. Boundary and methodology, the full line-item table with basis and factor, totals, intensity per ORN, factors applied with standard and version, Cat 8–15 N/A reasons, and a CSV export of all of it. Demo mode keeps the old portfolio-wide mock report. |
| Reports (index) | `/reports` | Demo | |
| Certifications | `/certifications` | Demo | |
| Marketplace | `/marketplace` | Demo | |
| Supplier Portal, AI Assistant, Guest Engagement | `/supplier-portal`, `/ai-assistant`, `/guest-engagement` | Demo | AI Assistant answers are canned strings. A real model layer now exists (§6) but no page calls it yet. |
| AI purchase classification | `ai-classify` edge function | **Live (no UI)** | Provider-agnostic (Gemini / OpenAI-compatible / Anthropic; key in Vault). Batch-classifies procurement lines to NAICS against all 1,016 spend factors, caches every decision, never overwrites a human ruling, and prints a gap rather than substituting when no code fits. Verified on the live project; §6 has the numbers. Nothing in the app calls it — the Data Capture "bulk" method is still "Not connected yet". |
| Billing | `/billing` | Demo | |
| Admin › Clients | `/admin/clients` | Demo | Account type / module entitlements live in `localStorage` (`src/lib/account.tsx`), not the database. |
| Admin › Users | `/admin/users` | Demo | Mock list; "Invite user" is not wired. |
| Admin › EF Library | `/admin/ef-library` | **Live (read)** | Browses all 3,718 factors server-side: dataset, domain, boundary and geography filters, a provisional-only view, reliability grade per row, and the dataset table with each publisher's methodology note. "Import dataset" / "New factor" are not wired — loading is the `scripts/ef-import` pipeline. |
| Admin › Pools, other tiles | `/admin/pools`, `/admin/:section` | Demo / stub | |

---

## 5. Emission sources — coverage audit

What the user asked: "all emission sources? Scope 1, 2, 3 categories 1–7?" Answer: **Scope 1, Scope 2 location-based and Scope 3 Cat 1–7 are computed from published factors (see §9). Still missing: the Scope 2 market-based method, four Scope 1 fuels that have no `energy_source` enum value, a capture path for owned vehicles, and region-specific electricity WTT.**

| Source | Scope | Capture form | Stored | Carbon computed | Gap |
|---|---|---|---|---|---|
| Grid electricity | 2 (location) | ✔ manual | ✔ `consumption_records` | ✔ 197 countries + 39 sub-national/utility overrides + 26 US eGRID subregions, by year | Market-based method, RECs/PPAs, supplier factors not modelled — the report says so rather than showing a number. 217 country factors are grade B‑. |
| District cooling | 2 | ✔ | ✔ | ✔ bridge factor, **grade C** | Nobody publishes one. Empower and Tabreed both publish an intensity — load it and delete the bridge row. |
| Natural gas | 1 | ✔ | ✔ | ✔ DEFRA 2025, kWh and m³ | |
| Diesel (generators) | 1 | ✔ | ✔ | ✔ DEFRA 2025 mineral diesel, kWh and L | |
| Solar PV on-site | 2 (zero) | ✔ | ✔ | ✔ bridge row, zero by definition | Export / net-metering not handled |
| Owned vehicles (fleet) | 1 | ✔ manual, fuel-based or distance-based | ✔ `emission_activities` (`activity_type = 'vehicle'`) | ✔ fuel × combustion factor (tier 1), or distance × vehicle factor (tier 2) | No equipment register; each entry stands alone |
| LPG, purchased heat/steam, biomass (stationary) | 1 / 2 | ✖ | ✖ (not in `energy_source` enum) | **factors are loaded** | Only the enum values and a capture path are missing |
| Refrigerants (fugitive) | 1 | ✔ manual | ✔ `emission_activities` | ✔ (charged − recovered) × GWP, **99 gases, IPCC AR5** | Leak-rate screening and an equipment register would beat per-event entry |
| Water | — | ✔ | ✔ m³ with source | ✔ as Scope 3 Cat 1 (DEFRA supply + treatment) | Treatment assumes 95 % return to sewer |
| Waste | 3 · Cat 5 | ✔ | ✔ kg by stream and route | ✔ DEFRA by **material × route** | Hazardous (beyond asbestos) has no factor; a stream/route pair the library does not cover prints the gap instead of borrowing a number |
| Cat 1 Purchased goods & services | 3 | ✔ manual, **16 hotel commodities → NAICS** | ✔ `emission_activities` | ✔ spend × USEEIO NAICS-6 (with margins) | US economy basis; USD 2022 only — non-USD spend is refused rather than converted at an invented rate. Supplier-specific (tier 1) factors still need a client-override path. |
| Cat 2 Capital goods | 3 | ✔ same form | ✔ | ✔ spend × USEEIO | As Cat 1 |
| Cat 3 Fuel- and energy-related (WTT, T&D losses) | 3 | — (derived) | — | ✔ the `wtt` and `t_and_d` boundaries of the same energy records | Electricity WTT exists only for GB and the eGRID grids — elsewhere the line prints "the library has no well-to-tank factor for purchased electricity at this location" rather than borrowing the UK figure. Region-specific T&D beyond the override sheet is not loaded. |
| Cat 4 Upstream transport | 3 | ✔ same form | ✔ | ✔ spend × USEEIO | DEFRA's 258 distance/mass freight factors are loaded but there is no tonne-km capture form yet |
| Cat 6 Business travel | 3 | ✔ manual (mode + distance) | ✔ | ✔ DEFRA by mode, RF included | `trips` is refused — it needs a distance. `Air — international (neither end UK)` was added because the short/long-haul rows are UK-origin and wrong for most of this portfolio. 37 country hotel-stay factors are loaded. |
| Cat 7 Employee commuting | 3 | ✔ same form | ✔ | ✔ DEFRA average car per **vehicle**-km | Survey headcount is stored but not used to extrapolate |
| Cat 8–15 | 3 | ✖ | ✖ | N/A with a stated reason | Cat 13 (sub-let space) and Cat 14 (franchises) become real if the client has either; nothing records a lease or a franchise agreement yet |

**The loop is closed.** A Scope 1/3 activity captured by a maker now appears in the same queue as a utility record and can be approved, queried or rejected there; the inventory picks it up on the next load. `record_comments` carries a nullable `activity_id` beside `record_id` with a check that exactly one is set, so comments keep their foreign keys.

---

## 6. AI integration — status

**Live, provider-agnostic, and used by one feature so far.** The `ai-classify` edge
function (v6) classifies procurement lines to NAICS codes for spend-based Scope 3.
Everything else that looks like AI is still scripted: `AI_QUESTIONS` / `AI_EXTRACTED`
and `SAMPLE_OCR` in `src/lib/dataCaptureConfig.ts` drive the capture wizards, the AI
Assistant page returns canned text, and Actions' "AI recommendations" are static rows.

### The provider layer — `supabase/functions/ai-classify/provider.ts`

Nothing above this file knows which vendor answers. A row in `ai_providers` names the
provider, model and optional base URL; adapters shape the request for Gemini,
OpenAI-compatible and Anthropic wire formats and normalise the reply to plain text.
Adding a provider is one function and one line in `adapterFor`.

- **Resolution order**: the caller's own client row → the deployment default
  (`client_id is null`) → `AI_PROVIDER` / `AI_MODEL` / `AI_BASE_URL` in the function
  environment. So a client can bring their own key without redeploying anything.
- **Keys are never in a readable column.** `ai_providers` holds a Vault secret id;
  `get_ai_provider_key(uuid)` is SECURITY DEFINER with execute granted to `service_role`
  alone (migration 26). The Vite bundle never sees a key. The current deployment default
  is Gemini `gemini-3.6-flash`.
- **`Part` carries text or an inline image**, so the same layer will serve bill and meter
  OCR without a second integration.
- `ask()` retries 429/503/500 with backoff and gives up on anything else rather than
  papering over it. `parseJson()` tolerates fences and stray prose.
- Gemini is a reasoning model: thought parts are filtered out of the reply and
  `thinkingLevel` is held to `low`. An undersized `maxOutputTokens` truncates the *answer*,
  not the reasoning — that is what produced the half-emitted classifications on v3.

### The classifier — `supabase/functions/ai-classify/index.ts`

Built for how the data actually arrives: a spreadsheet of hundreds of lines, not one
invoice at a time.

- **Unique work only.** Lines are deduped on normalised vendor + description, so a
  thousand-row file with forty distinct suppliers costs forty decisions.
- **Cached.** Every decision is written to `purchase_classifications` (migration 27),
  keyed `(client_id, vendor_norm, description_norm)`. A re-upload of the same file costs
  nothing and — the point — cannot come back with different answers.
- **A human ruling is never overwritten.** The cache upsert uses `ignoreDuplicates`, so a
  corrected row survives any later model run and is returned flagged `cache-human`.
- **The whole taxonomy goes in the prompt** — all 1,016 codes, ~12k tokens, amortised
  across a chunk of 25 lines. This replaced keyword retrieval, which was the cause of the
  two worst misclassifications (below).
- **The library decides, not the model.** A proposed code is checked against `ef_factors`;
  anything else becomes an unclassified line with a stated gap. No substituted factor.
- Accepts `{lines:[{id,description,vendor}]}` or a single `{description,vendor}`; caps at
  500 lines per call. Returns per-line `origin` (`cache-human` | `cache-ai` | `model` |
  `unresolved`), the resolved factor, and a summary with `modelCalls` and `lowConfidence`.

Measured against the live project on 2026-09-13:

| Case | Result |
| --- | --- |
| 30 lines, 28 unknown | 2 model calls, 8.0 s, 2 unresolved (correctly) |
| Same 12 lines, second call | 12/12 from cache, 0 model calls, 77 ms |
| Human ruling vs a cache-bypassed run | survived, returned `cache-human` |
| "Bulk laundry and dry cleaning" | 314120 @ 0.10 → **812320 Drycleaning and Laundry @ 0.95** |
| "Consultancy for the 2026 ESG report" | 561492 Court Reporting @ 0.05 → **541620 Environmental Consulting @ 0.90** |

### What is still missing

1. **No UI.** The function has no caller in the app — the Data Capture "bulk" method is
   still "not connected". The Excel/CSV upload and a confidence-sorted review grid are the
   next piece: bulk-accept the high-confidence rows, hand-fix the rest, write corrections
   back as `source='human'`.
2. **Nothing is persisted to `emission_activities` yet.** A classified line should land
   there with `ai_confidence`, `ai_model` and `ai_rationale` in `source_payload`, and rows
   under 0.8 should get an `ai-low` entry in `anomaly_flags` so the checker sees them first
   (the queue already renders that flag shape).
3. **`ai-extract` for OCR** — energy and water bills, reusing `provider.ts` unchanged.
4. **Admin → AI provider page.** `set_ai_provider_key` exists as an RPC; nothing calls it,
   so adding or rotating a key is a SQL statement today.

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
| 15 / 15b | ef_library_v2_schema | `ef_datasets`, `ef_factors`, `ef_unit_conversions`, `ef_haul_definitions`. Reference rows are shared (`client_id` null, readable by any signed-in user); a client's own factors are their own rows. 15b adds `domain` to the unique key — DEFRA's "Mini" is both an owned car (Scope 1) and business travel (Cat 6). |
| 16 | properties_grid_assignment | `properties.grid_code` / `grid_label`, resolved before the country. Both Dubai hotels → `AE-DEWA`. |
| 17 | ef_bridge_factors | Six rows for what nothing publishes: district cooling (graded C, an unsourced estimate), on-site solar at zero, mixed recyclables, donated food. Each states its derivation. |
| 18 | spend_factor_category_is_per_purchase | A NAICS factor has no Scope 3 category of its own — the same factor is Cat 1 for food, Cat 2 for furniture, Cat 4 for freight. Spend rows carry `category` null. |
| 19 | migrate_activities_to_ef_factors | Repoints `emission_activities.ef_id` at `ef_factors`, restates the AR6 refrigerants to AR5 and the indicative EEIO placeholders to real NAICS factors (the reason is written into each row's `source_payload.restated_2026_09`), then drops `ef_library`. |
| 21 | spend_currency_and_price_year | `emission_activities` gains the money trail (`amount_original`, `currency_original`, `fx_rate`, `fx_source`, `price_year`, `deflator`, `deflator_source`); `ef_fx_rates` and `ef_price_index` reference tables, both deliberately empty; `ef_datasets.currency_code` / `currency_base_year`. |
| 24 | comments_on_emission_activities | `record_comments.record_id` becomes nullable and gains `activity_id` (FK to `emission_activities`) with a check that exactly one target is set; all three RLS policies rewritten to accept either. This is what had blocked the approval queue. |
| 23 | emission_activities_vehicle_type | Adds `vehicle` to the activity-type check. Owned vehicles are Scope 1 mobile combustion and live with the other activity data, not in `consumption_records`. |
| 22 | label_seeded_spend_rows | Marks the 882 seeded spend rows as nominal USD with no FX and no deflation, so they do not read as converted invoices. |
| 20 | ef_facets_view | `ef_facets` view (distinct domain / boundary / geo_code with counts). The library browser's filters were being built from whatever PostgREST returned first, which caps at 1,000 rows, so most values never appeared. |

Enums: `pillar` energy/water/waste/carbon/social/governance · `energy_source` electricity_grid/natural_gas/district_cooling/diesel/solar_pv · `record_status` draft/submitted/queried/approved/rejected · `user_role` maker/checker/property_sm/super_admin. `emission_activities.scope` (1 or 3), `category` (`cat1`…`cat15`) and `activity_type` (refrigerant / purchase / capital / upstream_transport / business_travel / commute) are checked text, not enums.

### The factor library

`ef_factors` holds **3,718 rows across five datasets**. An activity is identified by four things, not one:

| | |
|---|---|
| `domain` | electricity · fuel · bioenergy · heat · refrigerant · water · waste · material · travel · freight · vehicle · hotel_stay · homeworking · spend · other |
| `activity_key` | the publisher's row, normalised — `natural_gas`, `r410a`, `average_car`, `commercial_and_industrial_waste`, `naics_311999` |
| `boundary` | **the load-bearing one.** `combustion` · `location_based` · `market_based` · `t_and_d` · `wtt` · `disposal` · `gwp` · `lifecycle` · `out_of_scope`. A grid factor, its T&D losses and its upstream fuel cycle are three rows for the same activity, so a Cat 3 figure cannot be summed into Scope 2. WTT stopped being a separate key and became a boundary. |
| `unit_denominator` | matched, never converted blind. `kWh` is **gross CV** (DEFRA's basis for company reporting); net CV is kept as `kWh_net`. |

**Resolution** (`resolveFactor` in `src/lib/data/factors.ts`): client override → geography (`grid_code` → subdivision → country → `GLOBAL`) → newest `factor_year` **at or before** the reporting year → dataset `precedence` → `is_default`. No match returns null and the caller states the gap; nothing is substituted.

| Dataset | Rows | Notes |
|---|---|---|
| Hotel Optimizer — Global Grid EF Master 2026-09-12 | 436 | 197 country defaults, 138 historical, 39 sub-national/utility overrides, each split into up to three boundary rows. `factor_year` is parsed for resolution; `factor_year_label` keeps the publisher's own wording ("varies (mainly 2021–22)", "IEA 2025 ed.") verbatim. **217 rows are grade B‑ or worse** and the UI says so. |
| UK DESNZ/DEFRA 2025 v1 | 2,175 | Fuels, bioenergy, 99 refrigerant GWPs (AR5), owned vehicles, heat, WTT, T&D, water, materials, waste by material × route, travel, freight, hotel stay, homeworking. Its `Overseas electricity` sheet is empty in 2025 — the Grid Master is the only non-UK grid source. |
| US EPA GHG Emission Factors Hub 2025 | 85 | 26 eGRID subregions (lb/MWh → kgCO₂e/kWh, loss rate as a separate `t_and_d` row) and the AR5 GWP tables. Tables 1–5 and 8–10 are **not** loaded — DEFRA covers those activities and no property reports in US units. |
| US EPA / USEEIO v1.3.0 (NAICS, USD 2022) | 1,016 | **With margins**: invoice spend is a purchaser price. `category` is null — it depends on the purchase. |
| Hotel Optimizer — Bridge factors 2026.1 | 6 | District cooling (grade C, unsourced estimate), on-site solar = 0, mixed recyclables, donated food. Each row's `notes` records its derivation. |

### Spend-based Scope 3: currency and price year

A spend factor is denominated in a currency **and** a price year — USEEIO is kgCO₂e per **2022 USD at purchaser price**. Every hotel in the portfolio invoices in something else, so an invoice is restated twice before it touches the factor:

```
usd_nominal = amount_original × fx_rate        (fx_rate = USD per 1 unit of currency)
usd_base    = usd_nominal     × deflator       (deflator = base-year index / spend-year index)
quantity    = usd_base                          ← what the factor multiplies
```

Every term is stored on the row with its source. `ef_fx_rates` and `ef_price_index` start **empty on purpose**: a wrong exchange rate is exactly the kind of plausible-looking number this product will not invent. The capture form pre-fills from them when a row exists; with no rate and none on file it **refuses**, naming the currency and year; with no price index it proceeds at a deflator of 1 and raises an anomaly flag saying the figure is overstated. Loading real annual-average rates and a US price series is a data task for the platform admin, not a code change.

**GWP set is AR5 throughout**, matching both published sets. `ef_unit_conversions` (210 rows) holds DEFRA's conversions and per-fuel calorific values, so litres→kWh is data rather than a constant. `ef_haul_definitions` (215) is flagged UK-origin and so cannot classify flights for this portfolio.

Evidence object path: `<property_id>/<uuid>/<file name>` — the first folder is what the storage policies check.

Test rows created by sessions (safe to keep or delete): Airport Hotel Dubai electricity May 2026 `124f3503-f52b-4b62-9f46-39116b12d6aa` (approved with a checker comment) and June 2026 `41f605ec-e8f4-4a1b-ba87-bcde9eb8002b` (submitted, two flags, one CSV in the bucket). In `emission_activities`, test rows for Airport Hotel Dubai — two approved fleet rows (1,850 L diesel, 4,200 van-km, Jan 2026) added while verifying the fleet capture, plus: a Cat 1 food purchase (48,250 USD, Sep 2026) and an R-407C release (8.5 kg net, Jan 2026, 16.2 tCO₂e) — the second is what makes the pending banner visible on the Carbon inventory for RY 2025/26.

App wiring: `src/lib/supabase.ts` (client) · `src/lib/auth.tsx` · `src/lib/data/mode.ts` · `src/lib/data/properties.tsx` (directory behind the top bar, carries `gridCode`) · `src/lib/api.ts` (all queries, uploads, signed URLs) · `src/lib/data/records.ts` (queue adapter, flag mapping, evidence mapping) · `src/lib/data/performance.ts` (reporting-year builder) · `src/lib/data/factors.ts` (the resolver + every form-value → taxonomy mapping) · `src/lib/data/carbon.ts` (`buildInventory`, `usePropertyInventory`) · `src/lib/database.types.ts` (hand-maintained; regenerate with the MCP `generate_typescript_types` after schema changes).

**Never load the whole library into the browser.** `listFactorSet({domains, geoCodes, boundaries, activityKeys})` fetches the narrow slice a page needs (~400 rows for one property); `listFactorsByIds` fetches exactly the rows stored records were calculated with; `listFactorCandidates` resolves one capture; `queryFactors` pages the admin browser server-side.

### Reloading the factor library

```bash
python3 scripts/ef-import/build_ef_sql.py          # reads ../EF/*.xlsx|csv -> out/ef-library.json
node scripts/ef-import/load.mjs '<admin password>' # upserts as admin@demo.test, through RLS
```

The workbooks live in `/Users/alkeshrajdev/Documents/Cloude/EF` (not in the repo). The importer is idempotent — dataset ids are deterministic and every table has a natural unique key — and prints a quality scan (suspect rows, colliding signatures) that should come back empty. `out/` is gitignored: it is fully derived from the workbooks plus the script.

**Where the inventory's numbers come from.** Utility lines are recomputed from the library on every load, so a factor correction restates them. Activity lines use the `tco2e` stored on the row, so the figure an approver saw is the figure that is reported. Both behaviours are stated on the page.

---

## 10. Pitfalls

- **Auth lock deadlock**: never await a Supabase query inside `onAuthStateChange`; `auth.tsx` defers profile loading with `setTimeout`. Symptom: pages make no network requests at all.
- **Popup blockers**: do not `window.open` after an `await`. Evidence links are pre-signed anchors for this reason.
- **`execute_sql` shows only the last statement's result.**
- **An enum→text cast is not immutable**, so it cannot appear in an index expression.
- `round(double precision, int)` does not exist in Postgres: cast to `numeric` first. `sin()` in a seed expression is what makes the whole thing a double.
- **PostgREST caps a select at 1,000 rows**, so deriving distinct values by selecting a column and de-duplicating in the browser silently truncates. Use a view — that is what `ef_facets` is for.
- **Never `select *` from `ef_factors` without filters.** It is 3,718 rows; every page asks for the slice it needs (§9).
- DEFRA names blends by ASHRAE number without a hyphen (`R410A`) but pure gases by chemical designation (`HFC-134a`), while the capture form and EPA hyphenate throughout. `refrigerantKey` in `factors.ts` carries the alias map.
- **Never let a unit fall through to a default.** The old `energyQty` returned `kWh` for anything it did not recognise, so 100 kg of LPG became 100 kWh. Units now convert through `ef_unit_conversions` (which carries DEFRA's per-fuel calorific values and densities) or the record is excluded and counted.
- **Never let an unmapped enum fall back to a sibling.** `wasteFactorFor` used to return the mixed-refuse key for any stream it did not know, so hazardous waste was priced as household landfill. An unmapped stream returns null and the inventory states the gap.
- A field hidden by `showWhen` must be skipped by the validator too, or a required-but-invisible field blocks submission with no visible cause. `isFieldVisible` in `DataCapture.tsx` is the single predicate the renderer, validator and blur handler all use.
- Two views of the same pillar must be computed the same way. The Carbon pillar summed twelve *rounded* months and omitted refrigerants, so it sat 30 tCO₂e away from the Carbon inventory tab for the same property.
- The trigger overwrites `client_id`; the API passes a placeholder on insert.
- RLS: a maker or checker sees a property only with a `user_properties` row; the seed covers all ten.
- zsh globbing in the tool shell: quote `--include='*.ts'`; the working directory sometimes resets — use absolute paths or `git -C`.
- Never stage `README.md` or `tsconfig*.tsbuildinfo` (both are always dirty locally).
- Recharts `AreaChart` ignores `Line` children; use `ComposedChart` (see `StackedArea.tsx`).
- The security advisor only flags leaked-password protection (an auth setting, the owner's call).

---

## 11. Next-session plan (priority order)

1. **Vercel env vars** (§1) so production runs live. Five minutes.
2. ~~**Full Scope 1 + Scope 3 data model.**~~ ~~**The real factor library.**~~ ~~**Calculation audit.**~~ **Done** (migrations 10–22, `lib/data/factors.ts`, `lib/data/carbon.ts`, `scripts/ef-import`, §9).

   The audit of 2026-09-13 found and fixed seven defects — hotel-stay capture that could never resolve, hazardous waste silently becoming mixed refuse, three unit conversions that relabelled rather than converted, the Carbon pillar disagreeing with its own inventory tab, and a resolver that did not implement the documented order. All were latent on the uniform seed data and all reachable from the capture forms; see the commit for each. It also added cabin class to flights (long-haul business is 2.2× average passenger), DEFRA's material list to waste, the spend money model, and a searchable picker over all 1,016 NAICS codes.

   What is still open, in priority order:
   - **Assign the remaining grid overrides.** Only the two Dubai hotels have a `grid_code`. Malaysia, Australia, Canada, Indonesia and the US eGRID subregions all have A+ sub-national factors sitting unused, and the Properties detail page has no field to set one.
   - ~~**AI classification and OCR**~~ — the classifier is **built, deployed and verified** (§6): a provider-agnostic AI layer over Gemini/OpenAI/Anthropic, batch classification of procurement lines against all 1,016 NAICS codes, a cache that a human ruling always wins, and gaps printed rather than substituted. What is left is the *UI*: the Excel/CSV bulk upload, a confidence-sorted review grid, persistence into `emission_activities` with `ai-low` flags, and the `ai-extract` OCR sibling for bills.
   - **Load the FX rates and a US price index.** `ef_fx_rates` and `ef_price_index` are empty by design, so every foreign invoice currently needs a hand-typed rate and no spend is deflated (each undeflated row carries a flag saying so). Annual averages for the seven portfolio currencies plus a US PPI/CPI series would automate both.
   - **Client factor overrides.** The schema supports them (`ef_factors.client_id`, which wins during resolution) but nothing in the UI can add a supplier-specific factor, which is what tier 1 Cat 1 actually needs.
   - **Scope 2 market-based.** Needs a contractual-instruments table (RECs, PPAs, green tariffs, supplier factors) plus residual-mix factors; the `market_based` boundary already exists and is empty. The report states that it is not modelled.
   - **The missing stationary Scope 1 fuels.** DEFRA's LPG, heat/steam and bioenergy factors are loaded; what is missing is `energy_source` enum values and a capture path. (Owned vehicles are done — migration 23.)
   - **Unwired reference data**: `ef_haul_definitions` (215 rows) and the `value_co2 / ch4 / n2o` gas split on most DEFRA rows are stored and never read. The gas split is what CDP asks for.
   - **District cooling** is a grade-C unsourced estimate. Empower and Tabreed publish intensities — load one and delete the bridge row.
   - **Base year** is not in the data model; the report prints "Not configured".
   - **Portfolio-level GHG reporting** is still out of scope by the product rule (Portfolio is the only cross-property section) — if the owner wants a consolidated corporate inventory, that is a Portfolio page, not this report.
3. **Wire the classifier into the product** (§6) — the engine is done, the UI is not:
   - **Excel/CSV bulk procurement upload.** Parse the sheet, map columns to
     `{description, vendor, amount, currency, date}`, POST in batches of ≤500 to
     `ai-classify`. This is where the batch design pays off.
   - **Review grid**, sorted by confidence ascending so the doubtful rows are at the top.
     Bulk-accept above a threshold; hand-fix below it. Every correction writes
     `purchase_classifications` with `source='human'`, which then binds for good.
   - **Persist to `emission_activities`** with `ai_confidence` / `ai_model` /
     `ai_rationale` in `source_payload`, and an `ai-low` anomaly flag under 0.8, so an
     AI-classified purchase and a hand-entered one calculate identically through
     `lib/data/factors.ts`.
   - **`ai-extract`** for energy and water bills: same `provider.ts`, image parts, a JSON
     schema of meter/period/quantity/unit/amount, and the same rule that the library
     decides the factor.
   - **Admin → AI provider** page over the existing `set_ai_provider_key` RPC.
4. **Genuine performance on live data** (§7): coordinates, weather ingestion, regression with fit gates, events register, then point the Performance › Genuine performance view and Portfolio › Compare at it.
5. **Portfolio dashboard and Compare on live data**: aggregate `buildPerformance()` across properties or add a SQL view of monthly totals per property × source; keep the chart vocabulary.
6. **Integrations** in the order of §8, starting with CSV bulk import (all-or-none commit into `consumption_records`) since the bucket and queue already exist.
7. **Users**: invitations and password reset via an edge function holding the service role; disable public sign-up.
8. **Tests**: Vitest for `buildPerformance`, `anomalyFlagsFor`, `reportingYearRange`, the IPF fitter in `flows.ts`; a Playwright smoke test for capture → approve → performance.
9. The remaining demo modules (Actions persistence, Certifications, Reports, Smart Ops on real meter feeds, Billing) are product decisions — confirm scope with the owner before building.
