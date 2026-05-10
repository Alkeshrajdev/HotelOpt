// Dummy data — replace with real API calls when backend is wired in.
// Numbers are illustrative only and intentionally rounded.

export const KPIS = {
  energyScore: { value: 82, label: "% compliant" },
  energyPerformanceIndex: { value: 91, delta: -4.2 },
  energyIntensity: { value: 24, unit: "kWh/ORN", delta: -6 },
  energyCost: { value: "$4.6M", delta: -4 },
  renewableEnergy: { value: 78, suffix: "/100", delta: 3 },
  occupiedRoomNights: { value: 412585, delta: 2.7 },
  guestNights: { value: 876241, delta: 4.1 },
  floorAreaM2: { value: 654812, delta: 5.7 },
  laundryIntensity: { value: 3.9, unit: "kg/ORN", delta: 1.2 },
  foodWastePerCover: { value: 82, unit: "g/cover", delta: 8.6 },
  energyPerOccRoom: { value: 20.6, unit: "kWh/OR", delta: 3.3 },
};

import { tokens } from "./tokens";

export const PILLAR_SCORES = [
  { pillar: "Energy",     score: 82, color: tokens.pillar.energy },
  { pillar: "Water",      score: 69, color: tokens.pillar.water },
  { pillar: "Waste",      score: 78, color: tokens.pillar.waste },
  { pillar: "Carbon",     score: 76, color: tokens.pillar.carbon },
  { pillar: "Social",     score: 74, color: tokens.pillar.social },
  { pillar: "Governance", score: 81, color: tokens.pillar.governance },
];

export const MONTHLY_INTENSITY = [
  { month: "May 23", energy: 36, cost: 92, intensity: 28 },
  { month: "Jun", energy: 41, cost: 96, intensity: 30 },
  { month: "Jul", energy: 48, cost: 105, intensity: 33 },
  { month: "Aug", energy: 50, cost: 108, intensity: 35 },
  { month: "Sep", energy: 44, cost: 100, intensity: 32 },
  { month: "Oct", energy: 38, cost: 95, intensity: 28 },
  { month: "Nov", energy: 35, cost: 92, intensity: 26 },
  { month: "Dec", energy: 33, cost: 90, intensity: 25 },
  { month: "Jan 24", energy: 31, cost: 88, intensity: 24 },
  { month: "Feb", energy: 30, cost: 87, intensity: 23 },
  { month: "Mar", energy: 32, cost: 89, intensity: 24 },
  { month: "Apr", energy: 34, cost: 91, intensity: 25 },
];

export const RAW_VS_GP = [
  { period: "May 23", raw: 4.0, gp: 1.5 },
  { period: "Jun", raw: 6.5, gp: 2.3 },
  { period: "Jul", raw: 9.0, gp: 4.0 },
  { period: "Aug", raw: 7.2, gp: 5.0 },
  { period: "Sep", raw: 5.8, gp: 4.4 },
  { period: "Oct", raw: 4.0, gp: 3.6 },
  { period: "Nov", raw: 3.2, gp: 3.4 },
  { period: "Dec", raw: 3.8, gp: 3.9 },
  { period: "Jan", raw: -2.0, gp: 4.5 },
  { period: "Feb", raw: -3.4, gp: 4.7 },
  { period: "Mar", raw: -1.5, gp: 5.2 },
  { period: "Apr", raw: 7.6, gp: 4.2 },
];

export const ACTION_CENTRE = [
  { label: "Missing meter data",         count: 10, severity: "warn" as const, href: "/data-capture?flag=missing" },
  { label: "Pending approvals",          count: 24, severity: "warn" as const, href: "/review-approval?status=submitted" },
  { label: "Supplier reminders",         count: 12, severity: "info" as const, href: "/supplier-portal?status=pending" },
  { label: "Certification evidence due", count: 6,  severity: "warn" as const, href: "/certifications?status=evidence-due" },
  { label: "Targets off-track",          count: 4,  severity: "bad"  as const, href: "/performance/energy/overview" },
  { label: "Adjusted performance worsening", count: 3,  severity: "bad"  as const, href: "/performance/energy/overview" },
];

export const RECOMMENDED_MEASURES = [
  { measure: "LED retrofit",           impact: "Medium",       cost: "AED 120k",  priority: "High", rationale: "Back-of-house lighting is 18% of total energy — LED swap pays back in 1.8 yrs and improves GP by est. 2.4%." },
  { measure: "Insulation & recovery",  impact: "High",         cost: "AED 250k",  priority: "High", rationale: "Heat recovery on laundry exhaust reduces energy per ORN by est. 4.2% and supports SBTi trajectory." },
  { measure: "Food waste segregation", impact: "Medium",       cost: "Low",       priority: "High", rationale: "3 properties missing segregation data — resolving unlocks GSTC Criterion D3 and reduces waste score gap." },
  { measure: "Supplier EF alignment",  impact: "Data quality", cost: "Low",       priority: "High", rationale: "18 high-impact suppliers still on default EFs; switching raises Scope 3 accuracy by ~12% and GP reliability." },
];

export const APPROVAL_STATUS = [
  { label: "Pending review", count: 24, accent: "warn" as const },
  { label: "Overdue", count: 6, accent: "bad" as const },
  { label: "Approved this period", count: 182, accent: "good" as const },
  { label: "Low confidence data", count: 9, accent: "info" as const },
];

export const REVIEW_BREAKDOWN = [
  { name: "Green Hotel", value: 82 },
  { name: "Green Globe", value: 74 },
  { name: "EarthCheck", value: 65 },
  { name: "Travelife", value: 75 },
  { name: "Hotel Sustainability Basics", value: 59 },
];

export const SUPPLIER_DATA_STATUS = [
  { label: "Suppliers invited", value: 120 },
  { label: "Responses", value: 68 },
  { label: "Supplier specific EFs", value: 54 },
  { label: "Genuine Performance data", value: 26 },
  { label: "High-impact pending", value: 18, alert: true },
];

export const ENERGY_DATA_QUALITY = [
  { name: "High accuracy", value: 82 },
  { name: "Fit for purpose", value: 76 },
  { name: "Good coverage", value: 61 },
  { name: "Adequate for PPF", value: 54 },
  { name: "Certification Evidence Match", value: 74 },
];

export const TOP_PROPERTIES = [
  { property: "Greenview Resort",  location: "Bali, Indonesia",       score: 92, reason: "Solar PV at 78% of demand, zero-landfill waste programme" },
  { property: "Mountain Lodge",    location: "Whistler, Canada",      score: 88, reason: "LED retrofit complete, greywater reuse saving 31% water" },
  { property: "Seaside Hotel",     location: "Melbourne, Australia",  score: 85, reason: "Green Globe certified, highest guest engagement score" },
  { property: "City Centre Hotel", location: "Copenhagen, Denmark",   score: 84, reason: "District heating connection, strong governance score" },
  { property: "Palm Beach Resort", location: "Phuket, Thailand",      score: 82, reason: "Top 10% for carbon intensity vs. APAC peer resorts" },
];

export const NEEDS_ATTENTION = [
  { property: "Airport Hotel",   location: "Dubai, UAE",           score: 45, reason: "Diesel backup running 18% of hours — Scope 1 spike" },
  { property: "Grand Hotel",     location: "Istanbul, Turkey",     score: 47, reason: "Water sub-metering incomplete, 3 months estimated data" },
  { property: "Downtown Inn",    location: "Manila, Philippines",  score: 49, reason: "F&B waste missing Q3, certification evidence overdue" },
  { property: "Coastal Inn",     location: "Doha, Qatar",          score: 50, reason: "Cooling load 40% above regional peer benchmark" },
  { property: "Riverside Hotel", location: "Bangkok, Thailand",    score: 42, reason: "Lowest in portfolio — onboarding incomplete, 6 blockers" },
];

export const AI_INSIGHTS = [
  {
    title: "Electricity spike likely linked to occupancy increase",
    confidence: 86,
    cta: "Review",
  },
  {
    title: "3 procurement items may be double counted",
    confidence: 78,
    cta: "Resolve",
  },
  {
    title: "Waste diversion improved due to separation upgrade",
    confidence: 91,
    cta: "View evidence",
  },
  {
    title: "Scope 3 supplier data quality low",
    confidence: 65,
    cta: "Send reminders",
  },
];

export const ENERGY_BENCHMARK = {
  vsLastYear: 6.3,
  vsPeer: 4.8,
  vsTarget: 72,
  series: [
    { p: "M1", v: 60 },
    { p: "M2", v: 64 },
    { p: "M3", v: 62 },
    { p: "M4", v: 68 },
    { p: "M5", v: 70 },
    { p: "M6", v: 72 },
    { p: "M7", v: 74 },
  ],
};

export const PROPERTIES = [
  { id: "P-001", name: "Greenview Resort", region: "APAC", brand: "Hotel Optimizer", rooms: 240, gfa: 18500, status: "Active", score: 92 },
  { id: "P-002", name: "Mountain Lodge", region: "Americas", brand: "Hotel Optimizer", rooms: 180, gfa: 14200, status: "Active", score: 88 },
  { id: "P-003", name: "Seaside Hotel", region: "APAC", brand: "Hotel Optimizer", rooms: 320, gfa: 22500, status: "Active", score: 85 },
  { id: "P-004", name: "City Centre Hotel", region: "EMEA", brand: "Hotel Optimizer", rooms: 410, gfa: 28800, status: "Active", score: 84 },
  { id: "P-005", name: "Palm Beach Resort", region: "APAC", brand: "Hotel Optimizer", rooms: 290, gfa: 20100, status: "Active", score: 82 },
  { id: "P-006", name: "Airport Hotel", region: "EMEA", brand: "Hotel Optimizer", rooms: 360, gfa: 24600, status: "Onboarding", score: 45 },
  { id: "P-007", name: "Grand Hotel", region: "EMEA", brand: "Hotel Optimizer", rooms: 280, gfa: 20800, status: "Active", score: 47 },
  { id: "P-008", name: "Downtown Inn", region: "APAC", brand: "Hotel Optimizer", rooms: 220, gfa: 16400, status: "Active", score: 49 },
];

export const REVIEW_QUEUE = [
  { id: "R-1042", property: "Greenview Resort", type: "Energy bill", method: "OCR", maker: "F. Setiawan", submitted: "2024-04-29", flag: "Low confidence", severity: "warn" as const },
  { id: "R-1041", property: "City Centre Hotel", type: "Waste — landfill", method: "QR", maker: "P. Lund", submitted: "2024-04-29", flag: "Spike", severity: "warn" as const },
  { id: "R-1040", property: "Mountain Lodge", type: "Procurement Cat 1", method: "Accounting API", maker: "QuickBooks", submitted: "2024-04-28", flag: "AI low confidence", severity: "warn" as const },
  { id: "R-1039", property: "Seaside Hotel", type: "Water — municipal", method: "Manual", maker: "L. Park", submitted: "2024-04-28", flag: "OK", severity: "good" as const },
  { id: "R-1038", property: "Palm Beach Resort", type: "Energy — diesel", method: "Bulk CSV", maker: "K. Phuwadon", submitted: "2024-04-28", flag: "Range error", severity: "bad" as const },
  { id: "R-1037", property: "Grand Hotel", type: "Refrigerant log", method: "Manual", maker: "E. Aksoy", submitted: "2024-04-27", flag: "Tier regression", severity: "warn" as const },
];

export const CERTIFICATIONS = [
  { code: "GSTC", name: "Global Sustainable Tourism Council", criteria: 38, ready: 22, partial: 10, gap: 6 },
  { code: "HSB", name: "Hotel Sustainability Basics (WTTC)", criteria: 12, ready: 11, partial: 1, gap: 0 },
  { code: "GREEN-KEY", name: "Green Key", criteria: 45, ready: 28, partial: 12, gap: 5 },
  { code: "GREEN-GLOBE", name: "Green Globe", criteria: 44, ready: 30, partial: 8, gap: 6 },
  { code: "LEED-OM", name: "LEED O+M", criteria: 50, ready: 26, partial: 14, gap: 10 },
  { code: "TRAVELIFE", name: "Travelife", criteria: 163, ready: 92, partial: 41, gap: 30 },
  { code: "EU-ECO", name: "EU Ecolabel", criteria: 67, ready: 38, partial: 18, gap: 11 },
];

export const SUPPLIERS = [
  { id: "S-201", name: "Aurora Linens Co.", category: "Linen / Laundry", country: "Italy", attestations: 5, response: 92, lastUpdate: "2024-04-22" },
  { id: "S-202", name: "GreenMile Logistics", category: "Transport (Cat 4)", country: "Singapore", attestations: 3, response: 84, lastUpdate: "2024-04-25" },
  { id: "S-203", name: "Ocean Fresh Seafood", category: "F&B procurement", country: "Norway", attestations: 4, response: 67, lastUpdate: "2024-04-19" },
  { id: "S-204", name: "Solar Roofs MENA", category: "Capex / Renewables", country: "UAE", attestations: 6, response: 100, lastUpdate: "2024-04-30" },
  { id: "S-205", name: "FreshLeaf Produce", category: "F&B procurement", country: "Spain", attestations: 2, response: 41, lastUpdate: "2024-03-28" },
];

export const MEASURES = [
  { code: "ENG-001", name: "LED retrofit (back-of-house)", pillar: "Energy", capex: 120000, payback: 1.8, gpUplift: 2.4, status: "In progress" },
  { code: "ENG-002", name: "BMS optimisation", pillar: "Energy", capex: 85000, payback: 1.4, gpUplift: 3.1, status: "Approved" },
  { code: "ENG-003", name: "Heat recovery on chillers", pillar: "Energy", capex: 250000, payback: 2.6, gpUplift: 4.2, status: "Proposed" },
  { code: "WTR-001", name: "Greywater reuse", pillar: "Water", capex: 95000, payback: 3.0, gpUplift: 2.8, status: "Approved" },
  { code: "WST-001", name: "Food waste segregation", pillar: "Waste", capex: 12000, payback: 0.9, gpUplift: 1.7, status: "In progress" },
  { code: "CRB-001", name: "On-site solar PV — phase 2", pillar: "Carbon", capex: 480000, payback: 4.2, gpUplift: 6.5, status: "Proposed" },
];

export const REPORTS = [
  { framework: "GRI Standards", version: "2021", status: "Mapped", coverage: 86 },
  { framework: "GHG Protocol", version: "Corporate Standard", status: "Mapped", coverage: 92 },
  { framework: "SBTi", version: "Corporate Net-Zero", status: "Draft", coverage: 71 },
  { framework: "HCMI", version: "v1.2", status: "Mapped", coverage: 88 },
  { framework: "Green Globe", version: "2024", status: "Mapped", coverage: 78 },
  { framework: "CSRD / ESRS", version: "ESRS E1–S4", status: "Draft support", coverage: 64 },
  { framework: "GRESB", version: "2024 Real Estate", status: "Mapped", coverage: 81 },
  { framework: "CDP", version: "Climate / Water", status: "Draft", coverage: 73 },
];

export const RECENT_REPORTS = [
  { name: "GRESB submission package — Q1 2024", type: "PDF + Excel", owner: "Corporate Sustainability", date: "2024-04-25" },
  { name: "CSRD ESRS E1 draft", type: "Word", owner: "Corporate Sustainability", date: "2024-04-21" },
  { name: "GHG Protocol inventory — Greenview Resort", type: "PDF", owner: "Property SM", date: "2024-04-19" },
  { name: "GSTC readiness dossier — Mountain Lodge", type: "PDF", owner: "Property SM", date: "2024-04-18" },
];

export const GUEST_PAGE_METRICS = [
  { metric: "Energy use per stay", value: "12.4 kWh", delta: -8 },
  { metric: "Water per stay", value: "184 L", delta: -5 },
  { metric: "Waste per stay", value: "0.42 kg", delta: -12 },
  { metric: "Carbon per stay (HCMI)", value: "8.2 kgCO₂e", delta: -9 },
];

export const KNOWLEDGE_TOPICS = [
  { topic: "How GP normalises occupancy", category: "Genuine Performance" },
  { topic: "Reading your CDD/HDD adjustment", category: "Genuine Performance" },
  { topic: "GHG Protocol Scope 3 Cat 1 vs Cat 4", category: "Carbon" },
  { topic: "GSTC Criterion B6 — local sourcing evidence", category: "Certifications" },
  { topic: "Setting an SBTi-aligned carbon target", category: "Targets" },
  { topic: "Supplier portal onboarding script", category: "Supplier" },
];

// ── Step-4 additions ──────────────────────────────────────────────────────────

export const GP_COMPOSITE = {
  score:           112.4,   // index, base 100 = 2022 baseline
  baseYear:        2022,
  pillarsImproving: 4,
  totalPillars:    6,
  yoyAdjPct:       4.2,     // YoY genuine-performance improvement (%)
};

export const OPERATING_METRICS = [
  { key: "orn",          label: "Occupied Room Nights", value: 412_585, unit: "",        delta: null,  goodDirection: null },
  { key: "guestNights",  label: "Guest Nights",       value: 876_241, unit: "",        delta: null,  goodDirection: null },
  { key: "occupancy",    label: "Occupancy",          value: 67.4,    unit: "%",       delta: null,  goodDirection: null },
  { key: "fbCovers",     label: "F&B Covers",         value: 248_420, unit: "",        delta: null,  goodDirection: null },
  { key: "laundry",      label: "Laundry kg / Room Night", value: 3.9,  unit: "kg/ORN",  delta: -1.2, goodDirection: "down" as const },
  { key: "foodWaste",    label: "Food Waste / Cover", value: 82,      unit: "g/cover", delta: -8.6, goodDirection: "down" as const },
  { key: "energyPerOr",  label: "Energy / Room Night", value: 20.6,    unit: "kWh/OR",  delta: -3.3, goodDirection: "down" as const },
];

export const PORTFOLIO_TRENDS = [
  { month: "May",  sustainabilityScore: 72, carbonIntensity: 14.2, energyIntensity: 24.8, waterIntensity: 420 },
  { month: "Jun",  sustainabilityScore: 73, carbonIntensity: 13.8, energyIntensity: 24.1, waterIntensity: 415 },
  { month: "Jul",  sustainabilityScore: 72, carbonIntensity: 14.1, energyIntensity: 25.2, waterIntensity: 418 },
  { month: "Aug",  sustainabilityScore: 74, carbonIntensity: 13.6, energyIntensity: 24.0, waterIntensity: 410 },
  { month: "Sep",  sustainabilityScore: 75, carbonIntensity: 13.2, energyIntensity: 23.4, waterIntensity: 405 },
  { month: "Oct",  sustainabilityScore: 76, carbonIntensity: 12.9, energyIntensity: 22.8, waterIntensity: 398 },
  { month: "Nov",  sustainabilityScore: 75, carbonIntensity: 13.1, energyIntensity: 23.2, waterIntensity: 402 },
  { month: "Dec",  sustainabilityScore: 76, carbonIntensity: 12.8, energyIntensity: 22.6, waterIntensity: 396 },
  { month: "Jan",  sustainabilityScore: 77, carbonIntensity: 12.5, energyIntensity: 22.0, waterIntensity: 390 },
  { month: "Feb",  sustainabilityScore: 77, carbonIntensity: 12.3, energyIntensity: 21.6, waterIntensity: 385 },
  { month: "Mar",  sustainabilityScore: 78, carbonIntensity: 12.1, energyIntensity: 21.4, waterIntensity: 382 },
  { month: "Apr",  sustainabilityScore: 78, carbonIntensity: 11.8, energyIntensity: 20.6, waterIntensity: 376 },
];

export const CERTIFICATIONS_OVERVIEW = {
  readinessScore:    78,
  evidenceGaps:      12,
  activeProgrammes:  4,
  inProgress:        2,
  nextAuditDays:     45,
  nextAuditName:     "Green Globe",
};

// ── Dashboard tab data ────────────────────────────────────────────────────────

export const ESG_TOTALS = {
  carbon:     { total: 42850,   displayTotal: "42,850",  unit: "tCO₂e",    delta: -4.2,  scope1: 12400, scope2: 18200, scope3: 12250, intensity: 2.9,  intensityUnit: "kgCO₂e / room night" },
  energy:     { total: 84200,   displayTotal: "84.2",    unit: "GWh",      delta: -6.1,  intensity: 20.6, intensityUnit: "kWh / room night",   renewablePct: 28 },
  water:      { total: 1250000, displayTotal: "1.25M",   unit: "m³",       delta: -3.8,  intensity: 342,  intensityUnit: "L / guest night",     recycledPct: 12 },
  waste:      { total: 8420,    displayTotal: "8,420",   unit: "tonnes",   delta:  1.4,  diversionPct: 42, foodWastePerCover: 82 },
  social:     { trainingHoursPerFTE: 24, ltifr: 0.82, turnoverPct: 18, localSourcingPct: 34 },
  governance: { attestationsPct: 81, supplierCodeAdoption: 74, openGaps: 4 },
};

export const PORTFOLIO_TARGETS = [
  { key: "carbon", label: "Carbon Target",       area: "Carbon",     icon: "cloud",  currentLabel: "22% reduction", currentVal: 22, targetVal: 40, unit: "%",      baseYear: 2019, targetYear: 2030, gap: "18% remaining", status: "bad"  as const, hotelCount: 6,  hotelsNote: "6 hotels driving 70% of emissions", owner: "Sarah Chen"      },
  { key: "energy", label: "Energy Target",       area: "Energy",     icon: "zap",    currentLabel: "18.4 kWh/RN",  currentVal: 18.4, targetVal: 16.5, unit: "kWh/RN", baseYear: 2022, targetYear: 2025, gap: "1.9 kWh above target", status: "warn" as const, hotelCount: 5,  hotelsNote: "5 hotels above intensity target",   owner: "Sarah Chen"      },
  { key: "water",  label: "Water Target",        area: "Water",      icon: "droplet",currentLabel: "342 L/GN",      currentVal: 342, targetVal: 310, unit: "L/GN", baseYear: 2022, targetYear: 2025, gap: "32 L above target",  status: "warn" as const, hotelCount: 7,  hotelsNote: "7 hotels above intensity target",   owner: "Jin Park"        },
  { key: "waste",  label: "Waste Diversion",     area: "Waste",      icon: "recycle",currentLabel: "42% diversion", currentVal: 42, targetVal: 60,  unit: "%",      baseYear: 2022, targetYear: 2025, gap: "18% below target",   status: "bad"  as const, hotelCount: 9,  hotelsNote: "9 hotels below diversion target",   owner: "Marco Rossi"     },
  { key: "cert",   label: "Certification Target",area: "Governance", icon: "award",  currentLabel: "6 of 8 active", currentVal: 75, targetVal: 100, unit: "%",      baseYear: 2023, targetYear: 2025, gap: "2 hotels uncertified",status: "warn" as const, hotelCount: 2,  hotelsNote: "2 hotels without current cert",     owner: "Layla Al-Hassan" },
  { key: "data",   label: "Data Approval Target",area: "Data",       icon: "shield", currentLabel: "86% approved",  currentVal: 86, targetVal: 95,  unit: "%",      baseYear: 2024, targetYear: 2025, gap: "9% below target",    status: "warn" as const, hotelCount: 4,  hotelsNote: "4 hotels with approval <80%",       owner: "Sarah Chen"      },
];

export const HOTEL_HEATMAP = [
  { id:"h1",  name:"The Pavilion London",           region:"EMEA",   brand:"Flagship",  type:"City Hotel",   data:"ok",   carbon:"ok",   energy:"ok",   water:"warn", waste:"ok",   cert:"ok",   actions:"warn", overall:"ok"   },
  { id:"h2",  name:"Grand Harbour Lisbon",           region:"EMEA",   brand:"Grand",     type:"City Hotel",   data:"warn", carbon:"warn", energy:"ok",   water:"ok",   waste:"warn", cert:"warn", actions:"ok",   overall:"warn" },
  { id:"h3",  name:"Skyline Dubai",                  region:"EMEA",   brand:"Skyline",   type:"Resort",       data:"ok",   carbon:"ok",   energy:"ok",   water:"ok",   waste:"ok",   cert:"ok",   actions:"ok",   overall:"ok"   },
  { id:"h4",  name:"Bay View Singapore",             region:"APAC",   brand:"Bay",       type:"City Hotel",   data:"warn", carbon:"ok",   energy:"warn", water:"ok",   waste:"ok",   cert:"ok",   actions:"warn", overall:"warn" },
  { id:"h5",  name:"The Montrose Paris",             region:"EMEA",   brand:"Flagship",  type:"Boutique",     data:"ok",   carbon:"ok",   energy:"ok",   water:"ok",   waste:"ok",   cert:"warn", actions:"ok",   overall:"ok"   },
  { id:"h6",  name:"Marina Residences Barcelona",    region:"EMEA",   brand:"Marina",    type:"Resort",       data:"bad",  carbon:"warn", energy:"warn", water:"ok",   waste:"bad",  cert:"warn", actions:"bad",  overall:"bad"  },
  { id:"h7",  name:"Peaks Resort Zermatt",           region:"EMEA",   brand:"Mountain",  type:"Ski Resort",   data:"bad",  carbon:"bad",  energy:"bad",  water:"bad",  waste:"bad",  cert:"bad",  actions:"bad",  overall:"bad"  },
  { id:"h8",  name:"Oceanfront Cape Town",           region:"Africa", brand:"Ocean",     type:"Resort",       data:"ok",   carbon:"ok",   energy:"ok",   water:"warn", waste:"ok",   cert:"ok",   actions:"ok",   overall:"ok"   },
  { id:"h9",  name:"Airport Hotel Dubai",            region:"EMEA",   brand:"Skyline",   type:"Airport",      data:"bad",  carbon:"bad",  energy:"bad",  water:"ok",   waste:"warn", cert:"bad",  actions:"bad",  overall:"bad"  },
  { id:"h10", name:"Riverside Bangkok",              region:"APAC",   brand:"River",     type:"City Hotel",   data:"bad",  carbon:"ok",   energy:"ok",   water:"ok",   waste:"ok",   cert:"bad",  actions:"ok",   overall:"bad"  },
];

export const PORTFOLIO_ACTIONS = [
  { id:"A-001", action:"LED retrofit — back-of-house",     hotel:"Airport Hotel Dubai",         area:"Energy",     status:"overdue",     owner:"Layla Al-Hassan", due:"2025-03-31", capex:"AED 85k",  expected:"AED 22k/yr",  verified:"—"        },
  { id:"A-002", action:"BMS optimisation",                  hotel:"Marina Residences Barcelona", area:"Energy",     status:"in-progress", owner:"Marco Rossi",    due:"2025-06-30", capex:"AED 60k",  expected:"AED 18k/yr",  verified:"—"        },
  { id:"A-003", action:"Water sub-metering rollout",        hotel:"Grand Harbour Lisbon",        area:"Water",      status:"overdue",     owner:"Marco Rossi",    due:"2025-04-15", capex:"AED 35k",  expected:"AED 8k/yr",   verified:"—"        },
  { id:"A-004", action:"Greywater reuse system",            hotel:"Skyline Dubai",               area:"Water",      status:"approved",    owner:"Layla Al-Hassan", due:"2025-09-30", capex:"AED 120k", expected:"AED 30k/yr",  verified:"—"        },
  { id:"A-005", action:"Food waste segregation",            hotel:"The Pavilion London",         area:"Waste",      status:"in-progress", owner:"Sarah Chen",     due:"2025-06-01", capex:"AED 12k",  expected:"AED 6k/yr",   verified:"AED 4k/yr"},
  { id:"A-006", action:"On-site solar PV — phase 2",        hotel:"Oceanfront Cape Town",        area:"Carbon",     status:"proposed",    owner:"Thabo Nkosi",    due:"2025-12-31", capex:"AED 480k", expected:"AED 95k/yr",  verified:"—"        },
  { id:"A-007", action:"Supplier EF alignment — Scope 3",   hotel:"Portfolio",                   area:"Carbon",     status:"overdue",     owner:"Sarah Chen",     due:"2025-04-30", capex:"—",        expected:"—",           verified:"—"        },
  { id:"A-008", action:"Certification evidence upload",     hotel:"Airport Hotel Dubai",         area:"Governance", status:"overdue",     owner:"Layla Al-Hassan", due:"2025-05-01", capex:"—",        expected:"—",           verified:"—"        },
  { id:"A-009", action:"Heat recovery on chillers",         hotel:"Bay View Singapore",          area:"Energy",     status:"proposed",    owner:"Jin Park",       due:"2025-10-31", capex:"AED 250k", expected:"AED 58k/yr",  verified:"—"        },
  { id:"A-010", action:"Staff sustainability training",     hotel:"Riverside Bangkok",           area:"Social",     status:"in-progress", owner:"Sarah Chen",     due:"2025-06-30", capex:"AED 8k",   expected:"—",           verified:"—"        },
  { id:"A-011", action:"Scope 3 travel data collection",    hotel:"Portfolio",                   area:"Carbon",     status:"overdue",     owner:"Sophie Müller",  due:"2025-05-15", capex:"—",        expected:"—",           verified:"—"        },
  { id:"A-012", action:"Green Key renewal documentation",   hotel:"The Pavilion London",         area:"Governance", status:"in-progress", owner:"Sarah Chen",     due:"2025-06-15", capex:"—",        expected:"—",           verified:"—"        },
];

export const DATA_ASSURANCE_BY_HOTEL = [
  { hotel:"The Pavilion London",          approved:91, estimated:4,  missing:2,  pending:2,  evidenceGaps:2,  lowConfidence:1  },
  { hotel:"Grand Harbour Lisbon",          approved:87, estimated:6,  missing:5,  pending:5,  evidenceGaps:5,  lowConfidence:2  },
  { hotel:"Skyline Dubai",                 approved:94, estimated:3,  missing:1,  pending:1,  evidenceGaps:7,  lowConfidence:1  },
  { hotel:"Bay View Singapore",            approved:82, estimated:9,  missing:8,  pending:8,  evidenceGaps:8,  lowConfidence:3  },
  { hotel:"The Montrose Paris",            approved:96, estimated:2,  missing:0,  pending:0,  evidenceGaps:3,  lowConfidence:0  },
  { hotel:"Marina Residences Barcelona",   approved:74, estimated:14, missing:12, pending:12, evidenceGaps:7,  lowConfidence:6  },
  { hotel:"Peaks Resort Zermatt",          approved:41, estimated:42, missing:0,  pending:0,  evidenceGaps:19, lowConfidence:0  },
  { hotel:"Oceanfront Cape Town",          approved:88, estimated:5,  missing:3,  pending:3,  evidenceGaps:5,  lowConfidence:1  },
  { hotel:"Airport Hotel Dubai",           approved:45, estimated:22, missing:18, pending:18, evidenceGaps:22, lowConfidence:8  },
  { hotel:"Riverside Bangkok",             approved:12, estimated:71, missing:0,  pending:0,  evidenceGaps:0,  lowConfidence:0  },
];
