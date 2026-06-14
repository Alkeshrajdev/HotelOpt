# Hotel Optimiser — Legacy vs Upcoming Tool Review

> **Scope / assumption:** Sections 1–2 assess the **legacy tool** as evidenced by its four exported reports (per-property, monthly + YTD + prior-year + variation): *Overall Utilities Consumption*, *Utilities Performance & Carbon Emissions*, *Benchmark & Genuine Performance*, *Overall Waste Performance*. Where data cells are `0`/`-`, the *report structure* is read (which fields exist), not the sample values. Sections 4–6 bridge to the **upcoming React tool** (`hotel-optimizer/`), citing what it already does.

The legacy tool is, on data depth, **excellent** — a mature consumption / benchmarking / genuine-performance engine. Its weaknesses are all on the *presentation / defensibility / action* side (static Excel, no dashboards, no targets, unsourced benchmarks). The upcoming React tool is the mirror image: strong dashboards, GHG-Protocol structure, targets, EF library — but currently shallower on the legacy's deep intensity / normalisation battery and waste taxonomy.

---

## 1. Inputs currently considered (legacy tool)

| Area | Field | Status | Should be |
|---|---|---|---|
| **Property master** | Hotel name, category (5-star/Metropolitan), Climastation, rooms, beds, restaurant seats, Energy Reference Area (m²), construction year, location, contact, **Inst. heating/cooling load (W/m²)**, facilities | **Available** (all present) | Mandatory (load + ERA → **Advanced**, drives ERN & intensity) |
| **Occupancy & activity** | Occupancy %, guest nights, staff nights, F&B covers, employee covers (meals), fitness guests, conference guests, employees, laundry kg | **Available** | Mandatory |
| ↳ Occupied/Available room nights | uses Occupancy % + guest nights, **not ORN/ARN directly** | **Partial** | Mandatory (add explicit ORN — the defensible normaliser) |
| ↳ Revenue | field present but blank (`-`) | **Partial** | Optional (enables €/revenue carbon intensity) |
| **Weather** | Avg outside temp, **CDD, HDD** | **Available** | Mandatory (Advanced for genuine performance) |
| **Electricity** | Consumption, cost, **Equivalent Consumption** (kWh-equiv) | **Available** | Mandatory |
| ↳ Tariffs / renewable electricity | no tariff breakdown; **no renewable/I-REC line** | **Missing** | Optional (renewable → Mandatory for carbon) |
| **District cooling** | Cooling consumption (kWhc), cooling cost, rolled into "Equivalent Consumption" | **Available**; carbon-conversion logic **not surfaced** | Mandatory |
| **Fuel / gas** | Kitchen gas (kWh + cost), Heat (kWh + cost) | **Available** | Mandatory |
| ↳ Diesel / LPG | no dedicated line (fleet sits in "CO₂e from Vehicles") | **Partial / Missing** | Optional (Advanced for full Scope 1) |
| **Water** | Consumption (m³), cost, intensity (l/guest, l/SU) | **Available** | Mandatory |
| **Waste (streams)** | ~28 named streams: general, food, paper, cardboard, plastic, glass, aluminium/metal cans, tetra, cooking oil (purchased+waste), green, ceramics, toiletries, **yellow-bag medical, textiles, hazardous, paints, batteries, bulbs, e-waste, bulky (furniture/metal/mattress/C&D/other), wood** | **Available** (best-in-class) | Mandatory core streams; hazardous/bulky → Optional |
| **Waste financials** | General + food waste cost, total waste cost, **rebates, net waste cost** | **Available** | Mandatory |
| **Refrigerants** | "CO₂e from Refrigerants" emission line present; type/qty/leakage/GWP **not in export** | **Partial** | Advanced (Scope 1) |
| **Scope 3** | Business travel, employee commuting, purchased material, vehicles, waste | **Available** but **generic** (no GHG-Protocol category numbers; "outsourced services" absent) | Advanced |
| **Carbon factors** | EF value / **source / year / country / unit / logic not shown anywhere in the exports** | **Missing** (calculated, not disclosed) | Mandatory (backend) — defensibility |
| **Targets** | energy/water/carbon/waste/cost/diversion/net-zero — **no target column**, only prior-year variation | **Missing** | Mandatory (upcoming tool) |

---

## 2. Outputs currently generated (legacy tool)

| Output | Status | Note |
|---|---|---|
| **Consumption trends** (energy/water/cooling/gas/waste, monthly + annual) | **Already available** | Month col + YTD total + average + prior-year |
| **Cost trends** (utility, waste, cost/m², cost/guest, cost/employee, cost/SU) | **Already available**; **cost per occupied-room-night** weak | Per-ORN basis missing |
| **Intensity KPIs** (kWh/guest, **ERN kWh/m²·yr**, kWh/cover, l/guest, kg waste/guest, kgCO₂e/guest, /SU, /employee) | **Already available** (very strong) | But **kWh/occupied-room** absent (uses guest + m²) |
| **Weather-normalised** — Measured vs **Calculated vs Genuine Performance** | **Already available** | The crown jewel; defensible efficiency view |
| **YoY** (current vs prior, % + absolute variation) | **Already available** | On every line |
| **Benchmarking** (Good/Fair/Poor/Very Poor bands) | **Available but weak** | Band ranges are `0–0` / unsourced; no external/category/climate-adjusted peer set |
| **Carbon** (Scope 1, 2, 3, total, by source) | **Available but weak** | Two parallel framings — "Utility+Waste" vs "Scope 1&2, Scope 3" — confusing; no GHG-Protocol category map |
| **Carbon intensity** (per guest) | **Available**; per ORN / m² / **revenue** | **Weak** (per-guest only; revenue empty) |
| **Waste outputs** (total, landfill, recycling, compost, donation, **WtE separated**, diversion, landfill-diversion) | **Already available** (excellent) | WtE correctly broken out from recycling |
| **Food waste** (per guest, **per cover**, trend) | **Already available** | Plus cooking-oil recovery % |
| **Commercial** (rebates, net cost) | **Available**; **cost leakage / savings / payback** | **Missing** |
| **Target tracking** (actual vs target, progress to 2030, gap) | **Missing** | No target concept in exports |
| **Reporting** (monthly, property report) | **Already available**; **portfolio rollup + structured GHG/ESG export** | **Weak** (per-property sheets, not a portfolio or audit-ready inventory) |

---

## 3. What is good to show on dashboards

### A. Executive dashboard
**Show:** total utility cost · energy · water · carbon (gross) · waste generated · diversion % · **cost per ORN** · **kgCO₂e per ORN** · YoY change · progress vs target · count of properties better/worse than baseline.
*Upcoming tool: already has this as the Overview/Environment tabs — add cost-per-ORN and the better/worse-than-baseline counter.*

### B. Property performance dashboard
**Show:** energy/water/**district-cooling**/gas trends · cost trend · **Genuine (weather-normalised) performance** · occupancy-normalised (per ORN) · actual vs expected · **top abnormal months** · main driver of change.
*This is where the legacy "Measured vs Calculated vs Genuine" belongs — port it verbatim; it's the most defensible thing the old tool has.*

### C. Carbon dashboard
**Show:** Scope 1 / 2 / 3 · emissions by source · intensity (per ORN) · **refrigerant emissions** · **waste emissions** · renewable/I-REC impact · **gross emissions and offsets shown separately** · target progress.
*Critical: keep the legacy's instinct of a separate "Total Emissions Offset" line — never net offsets into gross.*

### D. Waste dashboard
**Show:** total · by stream · landfill · recycling · compost · donation · **WtE on its own line** · **TRUE-style diversion excluding WtE** · landfill-diversion including WtE · **food waste per cover** · waste cost & rebates.
*Legacy already computes all of these — only the dual diversion definitions need to be made explicit.*

### E. Asset dashboard
**Only if asset/BMS data exists.** Chiller/HVAC energy, cooling efficiency, AHU, runtime, setpoints, BMS alerts, abnormal consumption, maintenance triggers, asset-level intensity.
**Do not** render asset dashboards for bill-only hotels. *The legacy exports are monthly-bill granularity → asset dashboards would be fabricated. The upcoming Smart-Ops module must gate these behind an actual integration flag.*

---

## 4. Points to carry into / improve in the upcoming tool

| Area | Requirement | Legacy has it? | Upcoming-tool action |
|---|---|---|---|
| Hotel-specific normalisation | ORN, guest nights, F&B covers, laundry kg, m², employees | ✓ (rich; ORN derived not explicit) | **Improve** — add explicit ORN; keep full set |
| Weather normalisation | CDD/HDD + Genuine Performance | ✓ (manual CDD/HDD) | **Keep & improve** — upcoming uses live Open-Meteo CDD/HDD; port the 3-column Measured/Calculated/Genuine view |
| District cooling | Separate from electricity, clear cost + carbon | ✓ (kWhc, equiv-kWh) | **Improve** — surface the kWhc→kWh→CO₂e conversion, don't hide it |
| Financial KPIs | cost/guest, cost/ORN, cost/m², cost leakage | Partial (no leakage) | **Improve** — add cost-per-ORN + leakage/savings |
| Waste treatment split | landfill/recycle/compost/donation/WtE separate | ✓ (exemplary) | **Keep** — match legacy taxonomy depth |
| Food waste | per cover + per guest | ✓ | **Keep** |
| Refrigerants | Scope 1 fugitive | ✓ (emission only) | **Keep & improve** — upcoming captures type+GWP+charge/recovery; better than legacy |
| Carbon structure | proper Scope 1/2/3 | Partial (generic) | **Improve** — upcoming already uses GHG-Protocol Cat 1/2/4/6/7; drop legacy's dual framing |
| Targets | actual vs target, YoY, gap to 2030 | ✗ | **Add** — upcoming has baseline→2030 progress already |
| Portfolio comparison | fair, normalised | ✗ (per-property only) | **Add** — normalised cross-property league table |
| Reporting export | property + portfolio + GHG report | Partial | **Improve** — audit-ready GHG inventory export |
| Audit trail | data source, file, **EF source/year, calc version** | ✗ (not in export) | **Add** — upcoming has versioned EF library (region/year/version) + evidence; wire calc-version stamping |

---

## 5. Points to avoid or challenge (don't copy blindly)

- **Unsourced benchmark bands.** Legacy's Good/Fair/Poor/Very Poor ranges are empty (`0–0`) with no cited source — do **not** reproduce a coloured band without a defensible peer set + source/year.
- **"Service Unit (SU)" black-box composite.** Per-SU KPIs are opaque to hotel staff — keep per-ORN / per-guest / per-cover, drop or clearly define SU.
- **Dual carbon framing.** "Utility+Waste" vs "Scope 1&2 + Scope 3" running in parallel confuses readers. Pick **GHG-Protocol Scope 1/2/3** as the single spine.
- **Offsets:** legacy *does* keep a separate offset line — **preserve that**; the failure mode to avoid is the upcoming tool netting offsets into gross in any headline number.
- **WtE as recycling.** Legacy correctly separates WtE — **keep WtE out of recycling / diversion-excl-WtE**; never let it inflate the green number.
- **KPI overload.** A single legacy sheet has 40+ intensity lines. On dashboards, surface ~6–8; push the long tail to report/backend.
- **Too many mandatory inputs.** Tier them (Mandatory / Optional / Advanced-GHG) so a bill-only hotel can still onboard.
- **Asset outputs without asset data** (see 3E).
- **Generic Scope 3** without GHG-Protocol category logic — legacy's "from Material / from Vehicles" must become numbered categories.
- **Carbon without EF source/year** — legacy never shows the factor; the upcoming tool's versioned EF library fixes this — enforce it.
- **Data that doesn't say what to do.** Legacy shows numbers, no actions. The upcoming "Needs attention" panel is the right antidote — every abnormal figure should deep-link to an action.

---

## 6. Final output

### A. Summary table

| Area | Current (legacy) status | Upcoming-tool action |
|---|---|---|
| Property data | Available (rich) | **Keep** |
| Activity data | Available; ORN derived | **Improve** (explicit ORN) |
| Weather normalisation | Available (manual) + Genuine Performance | **Keep & improve** (live CDD/HDD) |
| Energy | Available | **Keep** |
| District cooling | Available; logic hidden | **Improve** (surface conversion) |
| Water | Available | **Keep** |
| Waste | Available (best-in-class) | **Keep** taxonomy depth |
| Carbon | Available but weak/dual-framed | **Improve** (single Scope 1/2/3 spine) |
| Cost | Available; no leakage | **Improve** (cost/ORN + leakage) |
| Benchmarking | Weak/unsourced | **Improve** (sourced peer + climate-adjusted) |
| Targets | Missing | **Add** |
| Reporting | Partial (per-property) | **Improve** (portfolio + GHG export + audit trail) |

### B. Dashboard recommendation table

| Metric / output | Dashboard? | Level | Reason |
|---|---:|---|---|
| Energy / water / cost consumption | Yes | Executive + Property | Core performance |
| Cost per ORN, carbon per ORN | Yes | Executive | Decision metric, normalised |
| Genuine (weather-normalised) performance | Yes | Property | Most defensible efficiency view |
| Actual vs expected / top abnormal months | Yes | Property | Drives action |
| Scope 1/2/3 + by source | Yes | Carbon | GHG reporting |
| Gross vs offsets (separate) | Yes | Carbon | Defensibility |
| Refrigerant & waste emissions | Yes | Carbon | Scope completeness |
| Waste by stream, WtE separate, diversion (excl/incl WtE) | Yes | Waste | Operational + claim integrity |
| Food waste per cover | Yes | Waste / F&B | Operationally actionable |
| Full ~40 intensity-KPI battery (per SU, per m², per employee…) | No | Report / backend | Overload; long tail |
| Emission factor source/year/version | No | Backend / audit trail | Defensibility, not a tile |
| Raw meter / invoice upload history | No | Admin / audit | Important, not executive |
| Asset/BMS metrics (chiller, AHU, setpoints) | Conditional | Asset (only if integrated) | Don't fabricate from bills |

### C. Missing-requirements list

1. **Critical (build):** explicit ORN normalisation; target vs actual + gap-to-2030; single Scope 1/2/3 spine (retire dual framing); cost-per-ORN + cost leakage; sourced benchmarks; portfolio comparison; audit-ready GHG export.
2. **Good-to-have:** revenue-based carbon intensity; renewable/I-REC capture; explicit district-cooling conversion display; cooking-oil recovery %; payback indicators.
3. **Backend-only:** EF source/year/version + calc-version stamping; raw upload history; data-quality lineage.
4. **Not required (for hotel scope):** per-SU composite KPIs; asset dashboards for bill-only hotels; the full 40-line intensity battery on screen.

### D. Final recommendation

- **Doing well (legacy):** unmatched input depth, a genuine (weather + occupancy) normalisation engine, an exhaustive and correctly-split waste taxonomy with rebates/net cost, refrigerants and offsets handled separately, and a rich intensity set (ERN per m², per cover, per guest). This is a defensible measurement core — **don't lose it chasing UX.**
- **Carry forward:** Genuine Performance, district-cooling separation, full waste streams + WtE split + food-waste-per-cover, rebates/net cost, refrigerant Scope 1, separate offset line.
- **Improve:** make normalisation occupied-room-night-based, add targets + gap-to-2030, collapse the dual carbon framing into one GHG-Protocol Scope 1/2/3 spine, source the benchmarks, add cost leakage, and turn per-property sheets into a portfolio rollup + audit-ready export.
- **Remove / avoid:** unsourced benchmark bands, opaque SU composite, on-screen KPI overload, asset dashboards without asset data, and any netting of offsets into gross.
- **Dashboards vs backend:** dashboards = the ~6–8 decision/operational metrics + Genuine Performance + waste split; backend/report = the full intensity battery, EF provenance, and raw upload/audit lineage.

---

*Source evidence: legacy exports — `Overall Utilities Consumption (Kempinski Mall of the Emirates)`, `Utilities Performance & Carbon Emissions`, `Benchmark & Genuine Performance`, `Overall Waste Performance` (Farnek Village). Upcoming tool — `hotel-optimizer/src` (dataCaptureConfig.ts, mock.ts, admin/EFLibrary.tsx, performance/*).*
