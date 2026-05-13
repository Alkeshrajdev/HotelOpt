export type DrilldownHotel = {
  name: string;
  value: number;
  secondary?: string;
  context: string;
  flag?: "bad" | "warn" | "good";
};

export type DrilldownEntry = {
  unit: string;
  parentLabel: string;
  color: string;
  insight: string;
  hotels: DrilldownHotel[];
};

export const DRILLDOWN_DATA: Record<string, DrilldownEntry> = {

  // ── CARBON: Scope 1 ─────────────────────────────────────────────────────────

  "scope1.gas": {
    unit: "tCO₂e", parentLabel: "Carbon → Scope 1 — Direct Emissions", color: "#F59E0B",
    insight: "Airport Hotel Dubai (old 2012 boilers) and Skyline Dubai together represent 36% of portfolio gas emissions. Replacing the Airport Dubai plant in the 2026 capex cycle would remove ~245 tCO₂e/yr at payback <4 years.",
    hotels: [
      { name: "Skyline Dubai",        value: 280, secondary: "1,270 m³/mo", context: "DHW & kitchen gas; heat-recovery on flues proposed for Q3 2026", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 245, secondary: "1,110 m³/mo", context: "Old boilers (2012); boiler replacement on 2026 capex plan", flag: "bad"  },
      { name: "The Pavilion London",  value: 230, secondary: "1,045 m³/mo", context: "District heating supplement; switching feasibility study complete", flag: "warn" },
      { name: "Bay View Singapore",   value: 195, secondary: "885 m³/mo",  context: "Central plant; steam traps serviced Q1 2026 — leaks resolved", flag: "warn" },
      { name: "Grand Lisbon",         value: 165, secondary: "750 m³/mo",  context: "BMS scheduling improvement reduced gas use 4% vs prior year", flag: "good" },
      { name: "Marina Barcelona",     value: 140, secondary: "635 m³/mo",  context: "Solar thermal pre-heats DHW — offsets ~15% of gas consumption", flag: "good" },
      { name: "The Montrose Paris",   value: 72,  secondary: "327 m³/mo",  context: "Listed building — gas boiler replacement architecturally complex", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 68,  secondary: "309 m³/mo",  context: "Solar DHW covers 40% of load since Nov 2025", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 28,  secondary: "127 m³/mo",  context: "Seasonal — winter peak only; summer consumption negligible", flag: "good" },
      { name: "Riverside Bangkok",    value: 17,  secondary: "77 m³/mo",   context: "Onboarding property — gas meter installed Feb 2026", flag: "warn" },
    ],
  },

  "scope1.refrigerants": {
    unit: "tCO₂e", parentLabel: "Carbon → Scope 1 — Direct Emissions", color: "#8B5CF6",
    insight: "Skyline Dubai and Bay View Singapore together represent 45% of refrigerant emissions. Annual HVAC leak testing is overdue at Skyline Dubai — scheduling this immediately could reduce 2026 Scope 1 by up to 60 tCO₂e.",
    hotels: [
      { name: "Skyline Dubai",        value: 240, secondary: "R-410A · 3.2% leak",  context: "2 chillers overdue annual leak test — flagged for immediate action", flag: "bad"  },
      { name: "Bay View Singapore",   value: 192, secondary: "R-32 · 2.8% leak",    context: "Lower-GWP refrigerant; leak rate down 18% since Q2 2025 repair", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 168, secondary: "R-410A · 4.1% leak",  context: "High-GWP refrigerant; full chiller audit scheduled Q3 2026", flag: "bad"  },
      { name: "The Pavilion London",  value: 110, secondary: "R-134a · 1.9% leak",  context: "BACnet real-time monitoring active — alerts triggered automatically", flag: "good" },
      { name: "Marina Barcelona",     value: 88,  secondary: "R-410A · 3.0% leak",  context: "Split units across 45 rooms; consolidated replacement planned 2027", flag: "warn" },
      { name: "Grand Lisbon",         value: 82,  secondary: "Mixed · 2.2% leak",   context: "Heat-pump upgrade feasibility done; GWP-300 target from 2027", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 48,  secondary: "R-410A · 1.8% leak",  context: "High ambient temps increase compressor cycling and leak risk", flag: "warn" },
      { name: "The Montrose Paris",   value: 18,  secondary: "R-134a · 0.9% leak",  context: "Modern system installed 2023; low fugitive rate — best in class", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 10,  secondary: "R-32 · 1.2% leak",    context: "Small system; annual service compliant and documented", flag: "good" },
      { name: "Riverside Bangkok",    value: 4,   secondary: "R-32 · 0.7% leak",    context: "New hotel — spec'd low-GWP refrigerant from day one", flag: "good" },
    ],
  },

  "scope1.diesel": {
    unit: "tCO₂e", parentLabel: "Carbon → Scope 1 — Direct Emissions", color: "#EF4444",
    insight: "Dubai hotels account for 53% of diesel emissions and Cape Town faces escalating load-shedding events. A battery + solar storage system at Airport Dubai (feasibility complete) would eliminate backup-gen usage and cut 185 tCO₂e/yr.",
    hotels: [
      { name: "Skyline Dubai",        value: 195, secondary: "82,400 L/yr",  context: "3 × 2MW generators for peak demand; demand-reduction programme active", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 185, secondary: "78,100 L/yr",  context: "Critical backup for airport operations; solar + battery feasibility done", flag: "bad"  },
      { name: "Bay View Singapore",   value: 140, secondary: "59,100 L/yr",  context: "Grid unreliability × 12 events in 2025; UPS upgrade approved Q2 2026", flag: "warn" },
      { name: "Marina Barcelona",     value: 42,  secondary: "17,700 L/yr",  context: "Coastal storm protection — 6 generator events in 2025", flag: "warn" },
      { name: "The Pavilion London",  value: 65,  secondary: "27,500 L/yr",  context: "1 × 500 kW gen; primarily test-only use — low actual consumption", flag: "good" },
      { name: "Grand Lisbon",         value: 40,  secondary: "16,900 L/yr",  context: "Grid stable; generator used only for annual load test", flag: "good" },
      { name: "Oceanfront Cape Town", value: 28,  secondary: "11,800 L/yr",  context: "Load-shedding × 28 events in 2025 — significant and growing risk", flag: "bad"  },
      { name: "The Montrose Paris",   value: 15,  secondary: "6,300 L/yr",   context: "Minimal use — Paris grid stable; small boutique backup gen", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 7,   secondary: "2,950 L/yr",   context: "Seasonal; generator used for peak ski-season periods only", flag: "good" },
      { name: "Riverside Bangkok",    value: 3,   secondary: "1,270 L/yr",   context: "Onboarding — generator not yet metered separately", flag: "warn" },
    ],
  },

  "scope1.vehicles": {
    unit: "tCO₂e", parentLabel: "Carbon → Scope 1 — Direct Emissions", color: "#6B7280",
    insight: "Bay View Singapore and Pavilion London are leading EV fleet transition. Portfolio-wide EV adoption plan could eliminate 140+ tCO₂e/yr by 2027 — Cape Town is the key blocker due to grid instability limiting EV charging.",
    hotels: [
      { name: "Skyline Dubai",        value: 48, secondary: "14 vehicles",  context: "Airport shuttle ×4, golf carts ×10; 2 EV replacements planned 2026", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 42, secondary: "12 vehicles",  context: "Airside access vehicles; EV restricted by airport authority permits", flag: "warn" },
      { name: "Bay View Singapore",   value: 32, secondary: "9 vehicles",   context: "5 EVs in fleet since 2025; dedicated charging bays installed", flag: "good" },
      { name: "The Pavilion London",  value: 28, secondary: "8 vehicles",   context: "4 EVs on order; remaining diesel fleet retired by end 2026", flag: "good" },
      { name: "Grand Lisbon",         value: 20, secondary: "6 vehicles",   context: "Fleet renewal planned 2027 cycle; EV suitability study complete", flag: "warn" },
      { name: "Marina Barcelona",     value: 18, secondary: "5 vehicles",   context: "3 EVs + 2 hybrids — one of better fleets in portfolio", flag: "good" },
      { name: "Oceanfront Cape Town", value: 10, secondary: "3 vehicles",   context: "EV charging feasibility blocked by grid instability concerns", flag: "bad"  },
      { name: "The Montrose Paris",   value: 5,  secondary: "2 vehicles",   context: "1 EV + 1 hybrid; small boutique — minimal fleet", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 1,  secondary: "1 vehicle",    context: "1 snowcat — diesel; no EV alternative commercially available", flag: "warn" },
      { name: "Riverside Bangkok",    value: 1,  secondary: "1 vehicle",    context: "Onboarding — no fleet inventory complete yet", flag: "warn" },
    ],
  },

  "scope1.other": {
    unit: "tCO₂e", parentLabel: "Carbon → Scope 1 — Direct Emissions", color: "#D1D5DB",
    insight: "Other combustion sources (biomass, LPG, cooking gas) are relatively minor at 3% of Scope 1 but should be metered individually. Three hotels still lump these under a single meter — separating will improve reporting accuracy.",
    hotels: [
      { name: "Skyline Dubai",        value: 28, secondary: "LPG + cooking gas", context: "Multiple gas types; separate metering planned Q2 2026", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 20, secondary: "LPG + biomass",     context: "LPG for outdoor catering; biomass boiler trial suspended 2024", flag: "warn" },
      { name: "Bay View Singapore",   value: 15, secondary: "LPG",               context: "Outdoor BBQ facilities; metered since Q3 2025", flag: "good" },
      { name: "The Pavilion London",  value: 18, secondary: "Gas + biomass",     context: "Biomass pellet boiler (supplementary); REGO certified fuel", flag: "good" },
      { name: "Grand Lisbon",         value: 8,  secondary: "LPG",               context: "Pool heater — LPG; solar thermal to replace by 2027", flag: "warn" },
      { name: "Marina Barcelona",     value: 7,  secondary: "LPG",               context: "Outdoor event catering; included in Scope 1 since 2025", flag: "good" },
      { name: "Oceanfront Cape Town", value: 4,  secondary: "LPG",               context: "Braai (BBQ) facilities; metered and reported", flag: "good" },
      { name: "The Montrose Paris",   value: 2,  secondary: "LPG",               context: "Minimal — 1 portable heater for outdoor terrace", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 1,  secondary: "Firewood",          context: "Decorative log fires in lobby; biomass counted at near-zero EF", flag: "good" },
      { name: "Riverside Bangkok",    value: 0,  secondary: "—",                 context: "No other combustion sources identified at onboarding", flag: "good" },
    ],
  },

  // ── CARBON: Scope 3 ─────────────────────────────────────────────────────────

  "scope3.goods": {
    unit: "tCO₂e", parentLabel: "Carbon → Scope 3 — Value Chain", color: "#6EE7B7",
    insight: "Airport Hotel Dubai has the highest unmatched supplier count (22) driving emission-factor uncertainty. Prioritising supplier engagement there first — combined with Skyline Dubai (18 unmatched) — addresses 41% of Scope 3 goods emissions.",
    hotels: [
      { name: "Skyline Dubai",        value: 2800, secondary: "18 unmatched suppliers", context: "F&B procurement dominates; 6 key suppliers on-boarded to platform Q1", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 2300, secondary: "22 unmatched suppliers", context: "Highest unmatched count in portfolio; supplier programme launching Q2", flag: "bad"  },
      { name: "Bay View Singapore",   value: 2600, secondary: "12 unmatched suppliers", context: "Local sourcing at 45% reduces emission-factor uncertainty", flag: "warn" },
      { name: "The Pavilion London",  value: 1850, secondary: "5 unmatched suppliers",  context: "54% local sourcing — best in portfolio; sharing supplier playbook", flag: "good" },
      { name: "Grand Lisbon",         value: 1020, secondary: "8 unmatched suppliers",  context: "3 suppliers added specific EFs in 2025; improving trajectory", flag: "warn" },
      { name: "Marina Barcelona",     value: 820,  secondary: "9 unmatched suppliers",  context: "Seasonal resort — peak procurement Jul–Sep; data gaps in Q3", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 560,  secondary: "4 unmatched suppliers",  context: "61% local sourcing from regional network; strong performance", flag: "good" },
      { name: "The Montrose Paris",   value: 220,  secondary: "1 unmatched supplier",   context: "Small boutique; local artisan suppliers fully engaged on platform", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 180,  secondary: "3 unmatched suppliers",  context: "Remote location limits supplier choice; supply chain constrained", flag: "warn" },
      { name: "Riverside Bangkok",    value: 50,   secondary: "2 unmatched suppliers",  context: "Onboarding; baseline procurement audit incomplete", flag: "warn" },
    ],
  },

  "scope3.travel": {
    unit: "tCO₂e", parentLabel: "Carbon → Scope 3 — Value Chain", color: "#6EE7B7",
    insight: "Skyline Dubai and Airport Dubai together generate 42% of business travel emissions. A portfolio-wide video-conference-first policy (modelled on Pavilion London's UK rail policy) could cut travel emissions by ~25% across 2 years.",
    hotels: [
      { name: "Skyline Dubai",        value: 940, secondary: "1,240 flights/yr", context: "HQ & regional meetings; VC-first policy reduced air travel ~30% since 2024", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 820, secondary: "1,080 flights/yr", context: "High transit — airport proximity drives management travel frequency", flag: "bad"  },
      { name: "Bay View Singapore",   value: 760, secondary: "1,010 flights/yr", context: "APAC regional hub; some meetings shifting to hybrid format", flag: "warn" },
      { name: "The Pavilion London",  value: 610, secondary: "810 flights/yr",   context: "UK train policy for <4hr journeys cuts air travel meaningfully", flag: "good" },
      { name: "Grand Lisbon",         value: 380, secondary: "505 flights/yr",   context: "EU rail use increasing — 18% mode shift from air in 2025", flag: "good" },
      { name: "Marina Barcelona",     value: 320, secondary: "425 flights/yr",   context: "No formal travel policy yet; currently in development", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 210, secondary: "280 flights/yr",   context: "Long-haul dependency — no rail alternatives to major hubs", flag: "bad"  },
      { name: "The Montrose Paris",   value: 90,  secondary: "120 flights/yr",   context: "Strong rail culture; 62% of trips taken by train", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 45,  secondary: "60 flights/yr",    context: "Seasonal management travel only — low baseline", flag: "good" },
      { name: "Riverside Bangkok",    value: 25,  secondary: "33 flights/yr",    context: "Onboarding — business travel not yet fully tracked", flag: "warn" },
    ],
  },

  // ── ENERGY: End-use systems ──────────────────────────────────────────────────

  "energy.hvac": {
    unit: "MWh", parentLabel: "Energy → HVAC & Cooling", color: "#0EA5E9",
    insight: "Skyline Dubai, Airport Dubai, and Bay View Singapore together account for 60% of HVAC energy. BMS optimisation across these three could save 4,400 MWh/yr — equivalent to 1,170 tCO₂e in avoided Scope 2 emissions.",
    hotels: [
      { name: "Skyline Dubai",        value: 8200, secondary: "78.1 kWh/RN",  context: "Free-cooling hours limited; BMS upgrade Q1 2026 targeting 12% saving", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 6800, secondary: "79.1 kWh/RN",  context: "24/7 operation; no set-back schedule possible for transit guests", flag: "bad"  },
      { name: "Bay View Singapore",   value: 7400, secondary: "76.9 kWh/RN",  context: "District cooling connected to 30% of building since Sep 2025", flag: "warn" },
      { name: "The Pavilion London",  value: 5200, secondary: "64.7 kWh/RN",  context: "Heat pump installed east wing; 22% HVAC reduction YTD 2026", flag: "good" },
      { name: "Grand Lisbon",         value: 3100, secondary: "35.2 kWh/RN",  context: "Mediterranean climate; natural ventilation reduces mechanical load", flag: "good" },
      { name: "Marina Barcelona",     value: 2800, secondary: "35.0 kWh/RN",  context: "Sea-water cooling study in progress — potential 40% energy saving", flag: "good" },
      { name: "Oceanfront Cape Town", value: 1800, secondary: "25.0 kWh/RN",  context: "Moderate climate; fans and passive cooling viable most of year", flag: "good" },
      { name: "The Montrose Paris",   value: 900,  secondary: "14.1 kWh/RN",  context: "European climate; minimal mechanical cooling needed Oct–Apr", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 450,  secondary: "28.1 kWh/RN",  context: "High altitude; heating load dominant — minimal cooling system", flag: "warn" },
      { name: "Riverside Bangkok",    value: 150,  secondary: "7.5 kWh/RN",   context: "Onboarding; HVAC submetering installed Feb 2026", flag: "warn" },
    ],
  },

  "energy.kitchen": {
    unit: "MWh", parentLabel: "Energy → Kitchen & F&B", color: "#F59E0B",
    insight: "Airport Dubai's airline catering kitchen is the highest per-room-night consumer. Switching high-BTU gas cooking to induction (piloted at Pavilion London with 80% already converted) would save an estimated 1,200 MWh/yr portfolio-wide.",
    hotels: [
      { name: "Skyline Dubai",        value: 3400, secondary: "32.4 kWh/RN",  context: "5 restaurants + 24-hr room service; induction rollout plan approved 2026", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 2800, secondary: "32.6 kWh/RN",  context: "Airline catering kitchen adds volume; high-throughput dishwashing", flag: "bad"  },
      { name: "Bay View Singapore",   value: 3100, secondary: "32.2 kWh/RN",  context: "Asian high-BTU cooking; gas to induction conversion plan Q3 2026", flag: "warn" },
      { name: "The Pavilion London",  value: 2600, secondary: "32.3 kWh/RN",  context: "3 restaurants; 80% induction already — leading portfolio practice", flag: "good" },
      { name: "Grand Lisbon",         value: 1700, secondary: "19.3 kWh/RN",  context: "2 outlets; efficient Mediterranean-style menu with lower cooking energy", flag: "good" },
      { name: "Marina Barcelona",     value: 1500, secondary: "18.8 kWh/RN",  context: "Seasonal peaks May–Sep; outdoor cooking reduces indoor energy use", flag: "good" },
      { name: "Oceanfront Cape Town", value: 1100, secondary: "15.3 kWh/RN",  context: "Full induction kitchen since 2024 — lowest intensity in portfolio", flag: "good" },
      { name: "The Montrose Paris",   value: 400,  secondary: "6.3 kWh/RN",   context: "Boutique with 1 restaurant; limited covers and efficient appliances", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 140,  secondary: "8.8 kWh/RN",   context: "Ski-chalet style catering; seasonal operation only", flag: "warn" },
      { name: "Riverside Bangkok",    value: 60,   secondary: "3.0 kWh/RN",   context: "Restaurant not yet operating at full capacity", flag: "warn" },
    ],
  },

  "energy.rooms": {
    unit: "MWh", parentLabel: "Energy → Guest Rooms", color: "#6366F1",
    insight: "Airport Hotel Dubai lacks occupancy sensors — a quick-win retrofit (est. AED 85k, 8-month payback) could save 480 MWh/yr. Pavilion London's LED + smart-control retrofit is the benchmark to replicate across the high-intensity properties.",
    hotels: [
      { name: "Skyline Dubai",        value: 3200, secondary: "30.5 kWh/RN",  context: "In-room AC control; key-card cut-off installed since 2024", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 2400, secondary: "27.9 kWh/RN",  context: "Occupancy sensors not installed; on 2026 capex plan", flag: "bad"  },
      { name: "Bay View Singapore",   value: 2700, secondary: "28.0 kWh/RN",  context: "Smart thermostats in 80% of rooms; remainder by Q4 2026", flag: "warn" },
      { name: "The Pavilion London",  value: 1800, secondary: "22.4 kWh/RN",  context: "LED + smart controls across all rooms since 2023 — portfolio benchmark", flag: "good" },
      { name: "Grand Lisbon",         value: 1100, secondary: "12.5 kWh/RN",  context: "Natural daylight design reduces artificial lighting demand", flag: "good" },
      { name: "Marina Barcelona",     value: 950,  secondary: "11.9 kWh/RN",  context: "Balcony rooms reduce HVAC dependency; below portfolio average", flag: "good" },
      { name: "Oceanfront Cape Town", value: 700,  secondary: "9.7 kWh/RN",   context: "Solar PV covers 38% of in-room energy demand", flag: "good" },
      { name: "The Montrose Paris",   value: 350,  secondary: "5.5 kWh/RN",   context: "Heritage building — passive thermal performance surprisingly strong", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 220,  secondary: "13.8 kWh/RN",  context: "Heated ski-boot rooms drive seasonal energy spikes Q1 + Q4", flag: "warn" },
      { name: "Riverside Bangkok",    value: 80,   secondary: "4.0 kWh/RN",   context: "Guest-room HVAC not fully submetered yet — estimate ±20%", flag: "warn" },
    ],
  },

  "energy.laundry": {
    unit: "MWh", parentLabel: "Energy → Laundry", color: "#22C55E",
    insight: "Skyline Dubai and Airport Dubai drive 39% of laundry energy. Pavilion London's ozone cold-wash system + 62% linen reuse is the proven playbook — replicating it at Skyline Dubai alone would save ~380 MWh/yr.",
    hotels: [
      { name: "Skyline Dubai",        value: 1600, secondary: "15.2 kWh/RN",  context: "High turnover; linen reuse opt-in at only 22% — key action needed", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 1350, secondary: "15.7 kWh/RN",  context: "Airline linen contract adds volume; off-site laundry feasibility done", flag: "bad"  },
      { name: "Bay View Singapore",   value: 1480, secondary: "15.4 kWh/RN",  context: "In-house laundry; ozone cold-wash system reduces hot-water demand", flag: "warn" },
      { name: "The Pavilion London",  value: 1150, secondary: "14.3 kWh/RN",  context: "Ozone system + 62% linen reuse — portfolio benchmark for laundry", flag: "good" },
      { name: "Grand Lisbon",         value: 700,  secondary: "7.95 kWh/RN",  context: "Outsourced to certified green laundry partner — efficient", flag: "good" },
      { name: "Marina Barcelona",     value: 620,  secondary: "7.75 kWh/RN",  context: "Linen reuse programme at 44% participation", flag: "good" },
      { name: "Oceanfront Cape Town", value: 380,  secondary: "5.3 kWh/RN",   context: "Cold-wash programme saves 18% energy vs prior year", flag: "good" },
      { name: "The Montrose Paris",   value: 140,  secondary: "2.2 kWh/RN",   context: "Small property; efficient batch washing — lowest per-RN", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 55,   secondary: "3.4 kWh/RN",   context: "Ski-lodge heavy laundry (outerwear, base layers); above intensity average", flag: "warn" },
      { name: "Riverside Bangkok",    value: 25,   secondary: "1.3 kWh/RN",   context: "Outsourced laundry; energy data partially estimated", flag: "warn" },
    ],
  },

  // ── WATER: End-use ───────────────────────────────────────────────────────────

  "water.rooms": {
    unit: "m³", parentLabel: "Water → Guest Rooms & Bathrooms", color: "#0EA5E9",
    insight: "Skyline Dubai and Bay View Singapore each use 40+ L/GN more than the Cape Town benchmark. Completing the low-flow fitting rollout at Skyline Dubai (currently 60%) to 100% would save an estimated 8,600 m³/yr.",
    hotels: [
      { name: "Skyline Dubai",        value: 43000, secondary: "410 L/GN",  context: "Low-flow fittings in 60% of rooms; programme to 100% by Q3 2026", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 36000, secondary: "419 L/GN",  context: "High occupancy; transit guests show shorter shower duration", flag: "warn" },
      { name: "Bay View Singapore",   value: 42000, secondary: "389 L/GN",  context: "All rooms low-flow; water savings cards encourage guest participation", flag: "good" },
      { name: "The Pavilion London",  value: 21000, secondary: "389 L/GN",  context: "Aerators + dual flush across all rooms; 12% below portfolio average", flag: "good" },
      { name: "Grand Lisbon",         value: 16800, secondary: "137 L/GN",  context: "Water-stressed region; mandatory low-flow fittings since 2022", flag: "good" },
      { name: "Marina Barcelona",     value: 15500, secondary: "138 L/GN",  context: "Drought response protocol — strict low-flow policy enforced", flag: "good" },
      { name: "Oceanfront Cape Town", value: 9800,  secondary: "97 L/GN",   context: "Day Zero legacy — 50 L/person/day embedded in operational culture", flag: "good" },
      { name: "The Montrose Paris",   value: 5200,  secondary: "58 L/GN",   context: "Smallest per-GN in portfolio — boutique high-efficiency specification", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 1500,  secondary: "67 L/GN",   context: "Mountain water; alpine climate reduces long shower behaviour", flag: "good" },
      { name: "Riverside Bangkok",    value: 1400,  secondary: "50 L/GN",   context: "Partially estimated; automated meter reading not yet installed", flag: "warn" },
    ],
  },

  "water.laundry": {
    unit: "m³", parentLabel: "Water → Laundry", color: "#38BDF8",
    insight: "Skyline Dubai's 22% linen reuse rate is the portfolio's weakest. Bringing it to Pavilion London's 62% level would reduce laundry water by an estimated 6,800 m³/yr — the single highest-ROI water action available.",
    hotels: [
      { name: "Skyline Dubai",        value: 31000, secondary: "295 L/GN",  context: "Linen reuse at 22%; target 60% by Q4 2026 — top water priority", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 24000, secondary: "279 L/GN",  context: "Off-site airline linen contract inflates volume; renegotiation Q2", flag: "bad"  },
      { name: "Bay View Singapore",   value: 27200, secondary: "252 L/GN",  context: "Ozone cold-wash reduces water 20%; rolled out to all laundry units", flag: "warn" },
      { name: "The Pavilion London",  value: 14000, secondary: "259 L/GN",  context: "Best-practice linen reuse (62%); sharing programme with portfolio", flag: "good" },
      { name: "Grand Lisbon",         value: 11200, secondary: "91 L/GN",   context: "Water recycling within laundry room — near closed-loop system", flag: "good" },
      { name: "Marina Barcelona",     value: 10000, secondary: "89 L/GN",   context: "Outsourced to water-certified laundry provider", flag: "good" },
      { name: "Oceanfront Cape Town", value: 7200,  secondary: "71 L/GN",   context: "Water scarcity culture drives tight controls — well below average", flag: "good" },
      { name: "The Montrose Paris",   value: 5000,  secondary: "56 L/GN",   context: "Small volume — efficient batch operation; lowest per-GN in portfolio", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 1500,  secondary: "67 L/GN",   context: "Ski outerwear and base-layer heavy laundry; above average per GN", flag: "warn" },
      { name: "Riverside Bangkok",    value: 580,   secondary: "21 L/GN",   context: "Partially estimated; laundry submetered from Q1 2026", flag: "warn" },
    ],
  },

  "water.kitchen": {
    unit: "m³", parentLabel: "Water → Kitchen & F&B", color: "#7DD3FC",
    insight: "Cape Town's kitchen uses 50 L/GN vs Skyline Dubai's 219 L/GN — a 4× difference driven by Day Zero water habits. Pre-rinse spray valve replacement (est. AED 12k per hotel) would cut kitchen water by ~8% across the portfolio.",
    hotels: [
      { name: "Skyline Dubai",        value: 23000, secondary: "219 L/GN", context: "Pre-rinse spray valve efficiency project approved, starting Q2", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 18500, secondary: "215 L/GN", context: "High-volume dishwashing; water recycling feasibility study complete", flag: "warn" },
      { name: "Bay View Singapore",   value: 20500, secondary: "190 L/GN", context: "Eco-rinse mode activated; waterless urinals in staff areas", flag: "warn" },
      { name: "The Pavilion London",  value: 10500, secondary: "194 L/GN", context: "Best practice kitchen — 40% below industry average per GN", flag: "good" },
      { name: "Grand Lisbon",         value: 8000,  secondary: "65 L/GN",  context: "Mediterranean cooking style requires less water in food prep", flag: "good" },
      { name: "Marina Barcelona",     value: 7500,  secondary: "67 L/GN",  context: "Local suppliers reduce transport washing; below portfolio average", flag: "good" },
      { name: "Oceanfront Cape Town", value: 5000,  secondary: "50 L/GN",  context: "Water-smart kitchen since Day Zero 2021 — habits maintained", flag: "good" },
      { name: "The Montrose Paris",   value: 3500,  secondary: "39 L/GN",  context: "Fine dining low-volume; high-efficiency equipment", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 1800,  secondary: "80 L/GN",  context: "Ski resort catering — outdoor operations increase water use", flag: "warn" },
      { name: "Riverside Bangkok",    value: 560,   secondary: "20 L/GN",  context: "Kitchen partially operational; consumption estimated", flag: "warn" },
    ],
  },

  "water.pool": {
    unit: "m³", parentLabel: "Water → Pool, Spa & Recreation", color: "#BAE6FD",
    insight: "Skyline Dubai's pool complex (25,000 m³/yr) is 3× the next largest user. Installing pool covers and recirculating filtration would cut pool water by 18–25% — saving 4,500–6,250 m³/yr with no guest experience impact.",
    hotels: [
      { name: "Skyline Dubai",        value: 25000, secondary: "3 pools + lagoon",   context: "Resort pool complex; evaporation loss high in desert climate", flag: "bad"  },
      { name: "Marina Barcelona",     value: 10000, secondary: "2 pools + spa",       context: "Mediterranean resort; seasonal outdoor pools Apr–Oct", flag: "warn" },
      { name: "Bay View Singapore",   value: 10000, secondary: "Rooftop infinity + spa", context: "Year-round operation; backwash frequency on review", flag: "warn" },
      { name: "The Pavilion London",  value: 5000,  secondary: "Indoor pool + spa",   context: "Heated indoor pool; covers fitted — reducing evaporation 22%", flag: "good" },
      { name: "Grand Lisbon",         value: 8000,  secondary: "Harbour-view pool",   context: "Seasonal outdoor; covers used — above average due to splashing events", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 3000,  secondary: "1 pool",              context: "Outdoor pool; transit guests — moderate use", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 3500,  secondary: "Pool + spa",          context: "Water-scarce; pool covered when unoccupied; saving 1,200 m³/yr", flag: "good" },
      { name: "The Montrose Paris",   value: 1200,  secondary: "Spa only",            context: "No pool; spa only — low volume, well managed", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 500,   secondary: "Indoor heated pool",  context: "Alpine indoor pool; heated — usage limited to guests", flag: "good" },
      { name: "Riverside Bangkok",    value: 40,    secondary: "No pool yet",         context: "Pool facility not operational during onboarding", flag: "good" },
    ],
  },

  "water.cooling": {
    unit: "m³", parentLabel: "Water → Cooling Towers & HVAC", color: "#6366F1",
    insight: "Desert-climate hotels (Dubai) account for 65% of cooling tower water. Conductivity monitoring and bleed-off optimisation at Skyline Dubai (est. AED 18k) could cut cooling water by 15% — saving 2,100 m³/yr.",
    hotels: [
      { name: "Skyline Dubai",        value: 14000, secondary: "7.0 cycles of concentration", context: "High evaporation in desert climate; conductivity controls to improve", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 11000, secondary: "6.5 cycles",                   context: "Large cooling tower plant; bleed-off optimisation planned Q2", flag: "bad"  },
      { name: "Bay View Singapore",   value: 7000,  secondary: "5.5 cycles",                   context: "Partial district cooling reduces tower load since Sep 2025", flag: "warn" },
      { name: "The Pavilion London",  value: 3500,  secondary: "4.0 cycles",                   context: "Mild UK climate reduces cooling load significantly", flag: "good" },
      { name: "Grand Lisbon",         value: 1500,  secondary: "3.5 cycles",                   context: "Mediterranean — air-cooled condensers reduce water dependency", flag: "good" },
      { name: "Marina Barcelona",     value: 1200,  secondary: "3.5 cycles",                   context: "Sea-water heat sink study could eliminate towers entirely", flag: "good" },
      { name: "Oceanfront Cape Town", value: 300,   secondary: "3.0 cycles",                   context: "Mild climate; cooling tower usage minimal", flag: "good" },
      { name: "The Montrose Paris",   value: 100,   secondary: "3.0 cycles",                   context: "Small system; air-cooled chiller — minimal water use", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 30,    secondary: "Alpine air cooling",            context: "No cooling towers; ambient air cooling sufficient", flag: "good" },
      { name: "Riverside Bangkok",    value: 10,    secondary: "Not metered separately",        context: "HVAC cooling water not yet submetered", flag: "warn" },
    ],
  },

  // ── WASTE: Sources ───────────────────────────────────────────────────────────

  "waste.fb": {
    unit: "t", parentLabel: "Waste → F&B & Kitchen", color: "#F59E0B",
    insight: "Airport Dubai's airline catering adds ~180t of avoidable waste. Bay View Singapore's on-site composting (68% diversion) and Pavilion London's portion-control pilot (18% waste reduction) are the two actions to replicate portfolio-wide immediately.",
    hotels: [
      { name: "Skyline Dubai",        value: 820, secondary: "5 F&B outlets",              context: "Food waste tracking per outlet since Jan 2026; pre-consumer 40%", flag: "warn" },
      { name: "Airport Hotel Dubai",  value: 680, secondary: "3 outlets + airline catering", context: "Airline catering adds ~180t; returning-trays programme underway", flag: "bad"  },
      { name: "Bay View Singapore",   value: 760, secondary: "4 F&B outlets",              context: "On-site composting since Q2 2025; 68% diversion — best in class", flag: "good" },
      { name: "The Pavilion London",  value: 490, secondary: "3 F&B outlets",              context: "Portion-control pilot cut waste 18%; ready to roll out portfolio-wide", flag: "good" },
      { name: "Grand Lisbon",         value: 260, secondary: "2 F&B outlets",              context: "Too Good To Go partnership saves ~12 t/mo from landfill", flag: "good" },
      { name: "Marina Barcelona",     value: 240, secondary: "2 F&B outlets",              context: "Seasonal volume spike Jul–Sep; waste tracking gaps in peak", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 200, secondary: "2 F&B outlets",              context: "Community surplus redistribution removes 8t/mo from waste stream", flag: "good" },
      { name: "The Montrose Paris",   value: 95,  secondary: "1 F&B outlet",               context: "Tasting-menu format minimises pre-consumer production waste", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 50,  secondary: "1 F&B outlet",               context: "All-inclusive ski-lodge drives plate waste; guest briefing trial", flag: "warn" },
      { name: "Riverside Bangkok",    value: 26,  secondary: "1 F&B outlet",               context: "Waste not yet segregated by source; data partially estimated", flag: "bad"  },
    ],
  },

  "waste.rooms": {
    unit: "t", parentLabel: "Waste → Rooms & Housekeeping", color: "#6366F1",
    insight: "Skyline Dubai and Airport Dubai still use single-use amenities for all rooms. Switching to bulk dispensers (proven at Bay View Singapore with 8t/yr projected saving) and linen opt-out programmes are the two immediate actions available.",
    hotels: [
      { name: "Skyline Dubai",        value: 506, secondary: "Resort, daily linen change",  context: "Single-use amenities standard; opt-out linen programme Q2 2026", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 440, secondary: "High transit turnover",        context: "Single-use plastics still in use; reusable programme delayed to Q3", flag: "bad"  },
      { name: "Bay View Singapore",   value: 425, secondary: "City hotel",                   context: "Bulk amenities installed Q1 2026 — 8t/yr saving projected", flag: "warn" },
      { name: "The Pavilion London",  value: 280, secondary: "Boutique, 68% diversion",     context: "No single-use plastics since 2024; linen reuse opt-in at 62%", flag: "good" },
      { name: "Grand Lisbon",         value: 180, secondary: "City hotel",                   context: "Linen reuse opt-in at 61%; improving trajectory", flag: "good" },
      { name: "Marina Barcelona",     value: 168, secondary: "Resort, seasonal",             context: "Seasonal peaks inflate housekeeping waste Jul–Sep", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 95,  secondary: "Resort, high eco awareness",  context: "Guest eco sensitivity high; linen opt-in at 74%", flag: "good" },
      { name: "The Montrose Paris",   value: 62,  secondary: "Boutique",                    context: "Curated amenities programme; minimal packaging waste per room", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 22,  secondary: "Ski resort",                  context: "Ski-bag and single-use ski-gear packaging flagged for Q1 2027", flag: "warn" },
      { name: "Riverside Bangkok",    value: 12,  secondary: "Onboarding",                  context: "Housekeeping waste not yet segregated or tracked by stream", flag: "bad"  },
    ],
  },

  "waste.maintenance": {
    unit: "t", parentLabel: "Waste → Maintenance & Operations", color: "#6B7280",
    insight: "Skyline Dubai's renovation project (casino refit 2025) inflated maintenance waste significantly — this normalises by Q3 2026. Pavilion London's 85% recycling rate for refurb waste is the standard all properties should target for planned works.",
    hotels: [
      { name: "Skyline Dubai",        value: 360, secondary: "Casino refit 2025",           context: "Renovation waste inflating figure — normalises Q3 2026", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 310, secondary: "Terminal-adjacent works",      context: "Construction debris included; ongoing terminal expansion impact", flag: "bad"  },
      { name: "Bay View Singapore",   value: 295, secondary: "Regular M&E programme",        context: "Waste contractor collects mixed; segregation trial starting Q2", flag: "warn" },
      { name: "The Pavilion London",  value: 165, secondary: "Planned refurb works",         context: "All refurb waste segregated and contracted; 85% recycled", flag: "good" },
      { name: "Grand Lisbon",         value: 110, secondary: "Routine maintenance",          context: "Partnership with local scrap dealer for metal recovery", flag: "good" },
      { name: "Marina Barcelona",     value: 100, secondary: "Off-season overhaul Dec–Feb",  context: "Concentrated works each winter; large batch but well contracted", flag: "warn" },
      { name: "Oceanfront Cape Town", value: 82,  secondary: "Routine",                     context: "Waste classification incomplete; estimation error ±15%", flag: "warn" },
      { name: "The Montrose Paris",   value: 42,  secondary: "Heritage maintenance",         context: "Heritage restrictions; specialist recyclers handle most materials", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 30,  secondary: "Ski infrastructure",           context: "Lift machinery and snow-groomer maintenance off-season", flag: "warn" },
      { name: "Riverside Bangkok",    value: 22,  secondary: "New hotel fit-out",            context: "Fit-out construction waste; not indicative of ongoing operational level", flag: "warn" },
    ],
  },

  "waste.events": {
    unit: "t", parentLabel: "Waste → Events & Conferences", color: "#EC4899",
    insight: "Skyline Dubai and Airport Dubai together generate 44% of events waste with the lowest diversion. Mandatory waste stream segregation — bins at every table station — is the simplest intervention and costs under AED 5k per event.",
    hotels: [
      { name: "Skyline Dubai",        value: 260, secondary: "24 events/mo avg",  context: "Large ballroom events; bin segregation not enforced — high priority", flag: "bad"  },
      { name: "Airport Hotel Dubai",  value: 220, secondary: "18 events/mo avg",  context: "Conference centre without dedicated waste streams in place", flag: "bad"  },
      { name: "Bay View Singapore",   value: 205, secondary: "20 events/mo avg",  context: "Hybrid events reduce physical attendance; waste −12% YoY", flag: "warn" },
      { name: "The Pavilion London",  value: 148, secondary: "12 events/mo avg",  context: "Zero single-use plastics at events since 2023 — portfolio leader", flag: "good" },
      { name: "Grand Lisbon",         value: 92,  secondary: "8 events/mo avg",   context: "Small conference rooms; composting bins being trialled", flag: "warn" },
      { name: "Marina Barcelona",     value: 80,  secondary: "10 events/mo avg",  context: "Seasonal outdoor events peak Jul–Sep; waste untracked in peak", flag: "bad"  },
      { name: "Oceanfront Cape Town", value: 55,  secondary: "5 events/mo avg",   context: "Eco-conscious guest profile drives low-waste event culture", flag: "good" },
      { name: "The Montrose Paris",   value: 22,  secondary: "3 events/mo avg",   context: "Boutique private events; catering partner manages waste directly", flag: "good" },
      { name: "Peaks Resort Zermatt", value: 8,   secondary: "2 events/mo avg",   context: "Seasonal corporate retreats only; small-scale", flag: "warn" },
      { name: "Riverside Bangkok",    value: 3,   secondary: "1 event/mo avg",    context: "Conference space not yet operational at full capacity", flag: "warn" },
    ],
  },
};
