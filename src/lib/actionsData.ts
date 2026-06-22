// ─────────────────────────────────────────────────────────────────────────────
// Actions & Measures — the action control centre data model.
//
// One typed model for the whole improvement workflow, deliberately separating:
//   • Physical REDUCTION actions (operational efficiency, water, waste, behaviour,
//     policy, Smart-Ops maintenance) — the things that actually cut consumption.
//   • MARKET INSTRUMENTS (renewable procurement / I-RECs, carbon offsets) — kept
//     apart because they support market-based reporting or residual compensation;
//     they do NOT replace physical reduction and never count toward verified
//     reduction progress.
//
// Savings are tracked in three honest buckets — Estimated pipeline · Implemented
// (under monitoring) · Verified — and ONLY Verified counts toward the 2030
// pathway. Impact is pillar-specific (kWh / m³ / kg diverted / people trained …),
// never forced into a misleading "0 tCO₂e".
// ─────────────────────────────────────────────────────────────────────────────

export type Pillar = "energy" | "water" | "waste" | "carbon" | "social" | "governance";

export type ActionType =
  | "operational-efficiency"
  | "water"
  | "waste"
  | "renewable-procurement"   // market instrument
  | "carbon-offset"           // market instrument
  | "behaviour-training"
  | "policy-governance"
  | "smartops-maintenance";

export type Source =
  | "smart-ops"
  | "performance-gap"
  | "certification-gap"
  | "ai"
  | "manual"
  | "marketplace"
  | "audit";

export type Stage = "proposed" | "approved" | "in-progress" | "completed" | "verified";
export type Priority = "critical" | "high" | "medium" | "low";
export type Ease = "easy" | "moderate" | "complex";
export type Capex = "capex" | "opex" | "mixed";
export type EvidenceStatus = "complete" | "partial" | "none";
export type VerificationStatus = "verified" | "monitoring" | "unverified";

/** A pillar-specific impact figure. `key` lets us roll up like-for-like across
 *  actions; the first metric on an action is the headline shown on the card. */
export type ImpactMetric = { key: string; label: string; value: number; unit: string };

export type ApprovalLogEntry = { at: string; by: string; action: string };

export type SmartOpsLink = {
  asset: string;
  alertId: string;
  alertTitle: string;
  estimatedLossUsd: number;   // $/yr the open alert is estimated to be costing
  verifiedSavingsUsd?: number; // populated once the action is verified/closed
  alertLink: string;
};

export type Action = {
  id: string;
  code: string;
  name: string;
  description: string;
  actionType: ActionType;
  pillar: Pillar;
  property: string;
  source: Source;
  sourceRef?: string;         // e.g. alert id, cert criterion, benchmark, finding ref
  triggerLink?: string;
  priority: Priority;

  // ── Action fields (req. 8) ──
  impact: ImpactMetric[];     // pillar-specific; [0] = headline
  co2e?: number;              // tCO₂e/yr — omitted for social/governance
  costUsd: number;
  capexClass: Capex;
  paybackYears?: number;      // omitted when not financially framed
  ease: Ease;
  confidence: number;         // 0–100
  owner: string;
  dueDate: string;            // YYYY-MM-DD
  requiredApproval: string;
  evidenceStatus: EvidenceStatus;
  verificationStatus: VerificationStatus;
  stage: Stage;

  // ── Evidence & audit (req. 11) ──
  calculationNote: string;
  verificationNote?: string;
  approvalLog: ApprovalLogEntry[];

  smartOps?: SmartOpsLink;
};

// ── Stage metadata ───────────────────────────────────────────────────────────
export const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: "proposed",    label: "Proposed",    hint: "Awaiting approval" },
  { key: "approved",    label: "Approved",    hint: "Signed off — scheduled" },
  { key: "in-progress", label: "In Progress", hint: "Implementation under way" },
  { key: "completed",   label: "Implemented", hint: "Done — under monitoring" },
  { key: "verified",    label: "Verified",    hint: "Savings measured & verified" },
];
export const STAGE_INDEX: Record<Stage, number> = {
  proposed: 0, approved: 1, "in-progress": 2, completed: 3, verified: 4,
};

export const ACTION_TYPE_META: Record<ActionType, { label: string; pillar: Pillar; market: boolean }> = {
  "operational-efficiency": { label: "Operational efficiency", pillar: "energy",      market: false },
  "water":                  { label: "Water measure",          pillar: "water",       market: false },
  "waste":                  { label: "Waste measure",          pillar: "waste",       market: false },
  "behaviour-training":     { label: "Behaviour / training",   pillar: "social",      market: false },
  "policy-governance":      { label: "Policy / governance",    pillar: "governance",  market: false },
  "smartops-maintenance":   { label: "Smart Ops maintenance",  pillar: "energy",      market: false },
  "renewable-procurement":  { label: "Renewable procurement",  pillar: "carbon",      market: true  },
  "carbon-offset":          { label: "Carbon compensation",    pillar: "carbon",      market: true  },
};

export const SOURCE_META: Record<Source, { label: string }> = {
  "smart-ops":         { label: "Smart Ops alert" },
  "performance-gap":   { label: "Performance gap" },
  "certification-gap": { label: "Certification gap" },
  "ai":                { label: "AI recommendation" },
  "manual":            { label: "Manual action" },
  "marketplace":       { label: "Marketplace recommendation" },
  "audit":             { label: "Audit finding" },
};

export const PILLAR_TONE: Record<Pillar, "good" | "info" | "brand" | "warn" | "neutral"> = {
  energy: "good", water: "info", waste: "info", carbon: "brand", social: "warn", governance: "neutral",
};
export const PRIORITY_TONE: Record<Priority, "bad" | "warn" | "info" | "neutral"> = {
  critical: "bad", high: "warn", medium: "info", low: "neutral",
};

// ── The action list ──────────────────────────────────────────────────────────
export const ACTIONS: Action[] = [
  // Operational efficiency · Energy
  {
    id: "a1", code: "ENG-001", name: "BMS optimisation — HVAC schedules",
    description: "Re-tune occupancy-driven HVAC setpoints across 14 zones; tighten night/shoulder setbacks.",
    actionType: "operational-efficiency", pillar: "energy", property: "Skyline Dubai",
    source: "performance-gap", sourceRef: "Energy GP −3.1% vs expected (Apr 2026)", triggerLink: "/genuine-performance",
    priority: "critical",
    impact: [
      { key: "energy_mwh", label: "Energy saved", value: 540, unit: "MWh/yr" },
      { key: "cost_usd",   label: "Cost saving",  value: 64800, unit: "$/yr" },
      { key: "co2e_t",     label: "Carbon",       value: 22, unit: "tCO₂e/yr" },
    ],
    co2e: 22, costUsd: 12000, capexClass: "opex", paybackYears: 0.2, ease: "easy", confidence: 86,
    owner: "Engineering Lead", dueDate: "2026-06-15", requiredApproval: "GM sign-off",
    evidenceStatus: "partial", verificationStatus: "unverified", stage: "in-progress",
    calculationNote: "540 MWh/yr = 3.1% of 17,400 MWh measured energy at Skyline; $0.12/kWh tariff; grid factor 0.41 kgCO₂e/kWh.",
    approvalLog: [
      { at: "2026-05-02", by: "Sustainability Manager", action: "Proposed from performance gap" },
      { at: "2026-05-09", by: "GM — Skyline Dubai", action: "Approved · opex within budget" },
      { at: "2026-05-14", by: "Engineering Lead", action: "Implementation started" },
    ],
  },
  {
    id: "a2", code: "ENG-002", name: "LED retrofit — back-of-house",
    description: "Replace 3,200 fluorescent fittings with LED across kitchens, BoH corridors and laundry.",
    actionType: "operational-efficiency", pillar: "energy", property: "Peaks Resort Zermatt",
    source: "ai", sourceRef: "AI: lighting share above peer median", triggerLink: "/genuine-performance",
    priority: "high",
    impact: [
      { key: "energy_mwh", label: "Energy saved", value: 95, unit: "MWh/yr" },
      { key: "cost_usd",   label: "Cost saving",  value: 19000, unit: "$/yr" },
      { key: "co2e_t",     label: "Carbon",       value: 38, unit: "tCO₂e/yr" },
    ],
    co2e: 38, costUsd: 120000, capexClass: "capex", paybackYears: 1.8, ease: "moderate", confidence: 92,
    owner: "Engineering Lead", dueDate: "2026-03-30", requiredApproval: "GM sign-off",
    evidenceStatus: "complete", verificationStatus: "verified", stage: "verified",
    calculationNote: "3,200 fittings × avg 22 W reduction × 5,000 h/yr = 95 MWh; verified against sub-metered BoH load before/after.",
    verificationNote: "Verified by M&V (IPMVP Option A) — measured 96 MWh/yr saved vs 95 expected (+1%). GP operational event logged.",
    approvalLog: [
      { at: "2025-11-10", by: "AI Engine", action: "Recommended from benchmark" },
      { at: "2025-11-22", by: "GM — Zermatt", action: "Approved capex" },
      { at: "2026-01-15", by: "Engineering Lead", action: "Implemented" },
      { at: "2026-03-30", by: "Auditor", action: "Verified savings (M&V)" },
    ],
  },
  {
    id: "a3", code: "ENG-003", name: "Heat recovery on chillers",
    description: "Capture chiller waste heat for laundry hot water; reduce boiler gas demand.",
    actionType: "operational-efficiency", pillar: "energy", property: "Oceanfront Cape Town",
    source: "performance-gap", sourceRef: "Energy benchmark — bottom quartile vs pool", triggerLink: "/performance/energy/external-comparison",
    priority: "high",
    impact: [
      { key: "energy_mwh", label: "Energy saved", value: 180, unit: "MWh/yr" },
      { key: "cost_usd",   label: "Cost saving",  value: 21600, unit: "$/yr" },
      { key: "co2e_t",     label: "Carbon",       value: 55, unit: "tCO₂e/yr" },
    ],
    co2e: 55, costUsd: 250000, capexClass: "capex", paybackYears: 2.6, ease: "complex", confidence: 74,
    owner: "Property SM", dueDate: "2026-12-01", requiredApproval: "GM + Board (capex > $250k)",
    evidenceStatus: "partial", verificationStatus: "unverified", stage: "approved",
    calculationNote: "Recoverable heat 180 MWh/yr from condenser loop; offsets gas boiler at 85% efficiency.",
    approvalLog: [
      { at: "2026-02-18", by: "Performance Engine", action: "Flagged from external comparison" },
      { at: "2026-04-02", by: "GM — Cape Town", action: "Approved pending board capex" },
    ],
  },
  // Smart Ops maintenance · Energy (converted from an alert)
  {
    id: "a4", code: "OPS-014", name: "Chiller 01 service — COP recovery",
    description: "Service Chiller 01: check refrigerant charge, compressor current and condenser water flow to restore COP.",
    actionType: "smartops-maintenance", pillar: "energy", property: "Skyline Dubai",
    source: "smart-ops", sourceRef: "A001", triggerLink: "/smart-ops/alerts",
    priority: "critical",
    impact: [
      { key: "energy_mwh", label: "Energy saved", value: 153, unit: "MWh/yr" },
      { key: "cost_usd",   label: "Cost saving",  value: 27360, unit: "$/yr" },
      { key: "co2e_t",     label: "Carbon",       value: 12, unit: "tCO₂e/yr" },
    ],
    co2e: 12, costUsd: 4500, capexClass: "opex", paybackYears: 0.2, ease: "easy", confidence: 80,
    owner: "Facilities Manager", dueDate: "2026-06-10", requiredApproval: "None — within ops budget",
    evidenceStatus: "partial", verificationStatus: "monitoring", stage: "completed",
    calculationNote: "Alert A001: COP 4.8→3.7 (−22%), ~420 kWh/day excess ≈ 153 MWh/yr. Estimated loss $2,280/mo before fix.",
    approvalLog: [
      { at: "2026-06-02", by: "Smart Ops", action: "Alert A001 raised (Critical)" },
      { at: "2026-06-03", by: "Facilities Manager", action: "Converted to action" },
      { at: "2026-06-08", by: "Facilities Manager", action: "Service completed — monitoring" },
    ],
    smartOps: { asset: "Chiller 01 / CH-01", alertId: "A001", alertTitle: "Chiller 01 COP dropped 22% below baseline", estimatedLossUsd: 27360, alertLink: "/smart-ops/alerts" },
  },
  // Water
  {
    id: "a5", code: "WTR-001", name: "Greywater reuse — landscaping",
    description: "Divert sink greywater for irrigation, ~22 m³/day; reduce municipal draw.",
    actionType: "water", pillar: "water", property: "Marina Residences Barcelona",
    source: "certification-gap", sourceRef: "Green Globe 3.2 — water efficiency criterion", triggerLink: "/performance/water/overview",
    priority: "medium",
    impact: [
      { key: "water_m3", label: "Water saved", value: 8030, unit: "m³/yr" },
      { key: "cost_usd", label: "Cost saving", value: 16060, unit: "$/yr" },
    ],
    co2e: 4, costUsd: 95000, capexClass: "capex", paybackYears: 3.0, ease: "moderate", confidence: 70,
    owner: "Engineering Lead", dueDate: "2026-09-20", requiredApproval: "GM sign-off",
    evidenceStatus: "partial", verificationStatus: "unverified", stage: "approved",
    calculationNote: "22 m³/day × 365 = 8,030 m³/yr; $2/m³ municipal rate.",
    approvalLog: [
      { at: "2026-03-11", by: "Certification Lead", action: "Raised from Green Globe gap" },
      { at: "2026-04-20", by: "GM — Marina", action: "Approved capex" },
    ],
  },
  // Water (Smart Ops, verified)
  {
    id: "a6", code: "WTR-002", name: "Zone 3 night-flow leak repair",
    description: "Isolate and repair continuous night flow on Zone 3 (Floors 3–6) — failed isolation valve replaced.",
    actionType: "water", pillar: "water", property: "Skyline Dubai",
    source: "smart-ops", sourceRef: "A002", triggerLink: "/smart-ops/alerts",
    priority: "high",
    impact: [
      { key: "water_m3", label: "Water saved", value: 6935, unit: "m³/yr" },
      { key: "cost_usd", label: "Cost saving", value: 13870, unit: "$/yr" },
    ],
    co2e: 12, costUsd: 1800, capexClass: "opex", paybackYears: 0.1, ease: "easy", confidence: 95,
    owner: "Chief Engineer", dueDate: "2026-05-05", requiredApproval: "None — within ops budget",
    evidenceStatus: "complete", verificationStatus: "verified", stage: "verified",
    calculationNote: "Alert A002: ~19 m³/day excess × 365 = 6,935 m³/yr; pumping + heating energy ≈ 12 tCO₂e/yr.",
    verificationNote: "Verified — Zone 3 night flow returned to 0.0 m³/hr for 30 consecutive nights post-repair.",
    approvalLog: [
      { at: "2026-04-21", by: "Smart Ops", action: "Alert A002 raised (Critical)" },
      { at: "2026-04-22", by: "Chief Engineer", action: "Converted to action" },
      { at: "2026-04-28", by: "Chief Engineer", action: "Valve replaced" },
      { at: "2026-05-30", by: "Smart Ops", action: "Verified — flow normalised" },
    ],
    smartOps: { asset: "Zone 3 Sub-meter / WM-Z3", alertId: "A002", alertTitle: "Continuous night water flow — Zone 3 (leak)", estimatedLossUsd: 20280, verifiedSavingsUsd: 13870, alertLink: "/smart-ops/alerts" },
  },
  // Waste
  {
    id: "a7", code: "WST-001", name: "Food-waste segregation programme",
    description: "Add organic stream + LeanPath weighing in the main kitchen; staff SOPs for separation.",
    actionType: "waste", pillar: "waste", property: "The Pavilion London",
    source: "ai", sourceRef: "AI: diversion gap to 60% target", triggerLink: "/performance/waste/overview",
    priority: "medium",
    impact: [
      { key: "waste_kg",     label: "Waste diverted", value: 84000, unit: "kg/yr" },
      { key: "diversion_pp", label: "Diversion uplift", value: 6, unit: "pp" },
    ],
    co2e: 12, costUsd: 12000, capexClass: "mixed", paybackYears: 0.9, ease: "easy", confidence: 78,
    owner: "F&B Manager", dueDate: "2026-06-01", requiredApproval: "GM sign-off",
    evidenceStatus: "complete", verificationStatus: "monitoring", stage: "completed",
    calculationNote: "84 t/yr organics diverted from landfill → +6pp TRUE diversion at Pavilion; avoided methane ≈ 12 tCO₂e.",
    approvalLog: [
      { at: "2026-01-20", by: "AI Engine", action: "Recommended from diversion gap" },
      { at: "2026-02-05", by: "GM — Pavilion", action: "Approved" },
      { at: "2026-04-15", by: "F&B Manager", action: "Implemented — monitoring" },
    ],
  },
  // Carbon · on-site renewable generation (physical, not procurement)
  {
    id: "a8", code: "CRB-001", name: "On-site solar PV — phase 2",
    description: "Add 240 kWp to the existing rooftop array; self-consume to cut grid Scope 2.",
    actionType: "operational-efficiency", pillar: "carbon", property: "Skyline Dubai",
    source: "performance-gap", sourceRef: "SBTi pathway — Scope 2 shortfall", triggerLink: "/performance/carbon/carbon-inventory",
    priority: "critical",
    impact: [
      { key: "co2e_t",     label: "Carbon",        value: 142, unit: "tCO₂e/yr" },
      { key: "energy_mwh", label: "Solar yield",   value: 410, unit: "MWh/yr" },
      { key: "cost_usd",   label: "Cost saving",   value: 49200, unit: "$/yr" },
    ],
    co2e: 142, costUsd: 480000, capexClass: "capex", paybackYears: 4.2, ease: "complex", confidence: 68,
    owner: "Sustainability Manager", dueDate: "2027-02-28", requiredApproval: "GM + Board (capex > $250k)",
    evidenceStatus: "partial", verificationStatus: "unverified", stage: "proposed",
    calculationNote: "240 kWp × ~1,700 kWh/kWp = 410 MWh/yr self-consumed; grid factor 0.41 → 142 tCO₂e avoided (location-based).",
    approvalLog: [
      { at: "2026-05-28", by: "Performance Engine", action: "Flagged from SBTi shortfall" },
    ],
  },
  // Behaviour / training · Social (NO tCO₂e headline)
  {
    id: "a9", code: "SOC-001", name: "Sustainability training rollout",
    description: "12-hour online + 4-hour in-person training for all operational staff; supports GRI 404.",
    actionType: "behaviour-training", pillar: "social", property: "Peaks Resort Zermatt",
    source: "certification-gap", sourceRef: "GSTC A7 — staff training criterion", triggerLink: "/performance/social/overview",
    priority: "medium",
    impact: [
      { key: "people_trained",  label: "Staff trained",        value: 168, unit: "of 240" },
      { key: "completion_pct",  label: "Completion",           value: 70, unit: "%" },
      { key: "criteria",        label: "GRI 404 evidence",     value: 1, unit: "supported" },
    ],
    costUsd: 8000, capexClass: "opex", ease: "easy", confidence: 88,
    owner: "HR Lead", dueDate: "2026-07-31", requiredApproval: "Sustainability Manager",
    evidenceStatus: "partial", verificationStatus: "monitoring", stage: "in-progress",
    calculationNote: "168 of 240 staff completed (70%). Supports GSTC A7 + GRI 404-1 disclosure; no direct tCO₂e — behaviour enabler.",
    approvalLog: [
      { at: "2026-05-01", by: "Certification Lead", action: "Raised from GSTC gap" },
      { at: "2026-05-06", by: "Sustainability Manager", action: "Approved" },
      { at: "2026-05-20", by: "HR Lead", action: "Rollout in progress" },
    ],
  },
  // Policy / governance · Governance (NO tCO₂e headline)
  {
    id: "a10", code: "GOV-001", name: "Sustainable procurement policy",
    description: "Adopt portfolio sustainable-procurement policy with supplier ESG screening thresholds.",
    actionType: "policy-governance", pillar: "governance", property: "Portfolio",
    source: "audit", sourceRef: "Internal audit finding AF-2026-03", triggerLink: "/reports",
    priority: "high",
    impact: [
      { key: "policies",  label: "Policies adopted",   value: 1, unit: "of 1" },
      { key: "criteria",  label: "Criteria supported", value: 3, unit: "GRI/CSRD" },
    ],
    costUsd: 0, capexClass: "opex", ease: "moderate", confidence: 90,
    owner: "Sustainability Manager", dueDate: "2026-05-31", requiredApproval: "Board",
    evidenceStatus: "complete", verificationStatus: "verified", stage: "completed",
    calculationNote: "Closes audit finding AF-2026-03; supports GRI 308, CSRD ESRS G1 governance disclosures.",
    verificationNote: "Policy ratified by board 2026-05-29; published to supplier portal.",
    approvalLog: [
      { at: "2026-03-15", by: "Internal Audit", action: "Finding AF-2026-03 raised" },
      { at: "2026-04-30", by: "Sustainability Manager", action: "Draft policy submitted" },
      { at: "2026-05-29", by: "Board", action: "Ratified" },
    ],
  },

  // ── MARKET INSTRUMENTS (separate tab) ──
  {
    id: "mi1", code: "MKT-001", name: "I-RECs — residual Scope 2 coverage",
    description: "Purchase I-RECs to cover the residual market-based Scope 2 after all committed physical efficiency measures.",
    actionType: "renewable-procurement", pillar: "carbon", property: "Skyline Dubai",
    source: "performance-gap", sourceRef: "Market-based Scope 2 residual", triggerLink: "/marketplace",
    priority: "high",
    impact: [
      { key: "co2e_market", label: "Market-based cover", value: 142, unit: "tCO₂e" },
    ],
    co2e: 142, costUsd: 1700, capexClass: "opex", ease: "easy", confidence: 95,
    owner: "Sustainability Manager", dueDate: "2026-12-31", requiredApproval: "GM sign-off",
    evidenceStatus: "none", verificationStatus: "unverified", stage: "proposed",
    calculationNote: "Market instrument — supports market-based Scope 2 reporting only. Does NOT reduce physical consumption and is excluded from verified reduction.",
    approvalLog: [
      { at: "2026-05-28", by: "Performance Engine", action: "Residual Scope 2 flagged" },
    ],
  },
  {
    id: "mi2", code: "MKT-002", name: "Verified carbon credits — residual Scope 1",
    description: "High-quality VCS / Gold Standard credits to compensate residual Scope 1 (refrigerants, standby gensets) as a last resort.",
    actionType: "carbon-offset", pillar: "carbon", property: "Portfolio",
    source: "ai", sourceRef: "Residual Scope 1 after reductions", triggerLink: "/marketplace",
    priority: "medium",
    impact: [
      { key: "co2e_offset", label: "Compensation", value: 38, unit: "tCO₂e" },
    ],
    co2e: 38, costUsd: 1520, capexClass: "opex", ease: "easy", confidence: 90,
    owner: "Sustainability Manager", dueDate: "2027-01-31", requiredApproval: "GM sign-off",
    evidenceStatus: "none", verificationStatus: "unverified", stage: "proposed",
    calculationNote: "Market instrument — residual compensation only, applied AFTER physical reduction. Excluded from verified reduction progress.",
    approvalLog: [
      { at: "2026-05-30", by: "AI Engine", action: "Residual Scope 1 estimated" },
    ],
  },
];

export const MARKET_DISCLAIMER =
  "Market instruments support market-based reporting or residual compensation. They do not replace physical reduction measures.";

// ── Smart Ops alerts available to convert into actions (req. 12) ──────────────
export type ConvertibleAlert = {
  id: string;
  title: string;
  asset: string;
  property: string;
  category: Pillar;
  severity: "Critical" | "High" | "Medium";
  estimatedLossUsd: number;   // $/yr
  estCo2e: number;            // tCO₂e/yr if fixed
  recommended: string;
  link: string;
};

export const CONVERTIBLE_ALERTS: ConvertibleAlert[] = [
  { id: "A011", title: "Chiller 02 COP drift — 9% below baseline", asset: "Chiller 02 / CH-02", property: "Skyline Dubai", category: "energy", severity: "High", estimatedLossUsd: 16800, estCo2e: 7, recommended: "Schedule condenser clean & refrigerant check.", link: "/smart-ops/alerts" },
  { id: "A007", title: "Kitchen sub-meter overnight base load high", asset: "Kitchen Sub-meter / EM-KIT-01", property: "The Pavilion London", category: "energy", severity: "Medium", estimatedLossUsd: 9120, estCo2e: 4, recommended: "Audit overnight equipment left on; add timers.", link: "/smart-ops/alerts" },
  { id: "A013", title: "Pool make-up water above expected", asset: "Pool Makeup Meter / WM-POOL", property: "Oceanfront Cape Town", category: "water", severity: "Medium", estimatedLossUsd: 6480, estCo2e: 3, recommended: "Check pool backwash cycle & evaporation cover.", link: "/smart-ops/alerts" },
];

// ── Derived: savings buckets (req. 3) ────────────────────────────────────────
// Only physical reduction actions feed the buckets (market instruments excluded).
export type SavingsBuckets = {
  estimated: { co2e: number; usd: number };   // proposed + approved + in-progress
  monitoring: { co2e: number; usd: number };  // completed (implemented, monitoring)
  verified: { co2e: number; usd: number };    // verified — the only "achieved" bucket
};

function annualUsd(a: Action): number {
  const cost = a.impact.find((m) => m.key === "cost_usd");
  return cost?.value ?? a.smartOps?.verifiedSavingsUsd ?? 0;
}

export function isMarketInstrument(a: Action): boolean {
  return ACTION_TYPE_META[a.actionType].market;
}
export const reductionActions = () => ACTIONS.filter((a) => !isMarketInstrument(a));
export const marketInstruments = () => ACTIONS.filter(isMarketInstrument);

export function savingsBuckets(actions: Action[] = reductionActions()): SavingsBuckets {
  const z = () => ({ co2e: 0, usd: 0 });
  const out: SavingsBuckets = { estimated: z(), monitoring: z(), verified: z() };
  for (const a of actions) {
    const bucket =
      a.stage === "verified" ? out.verified
      : a.stage === "completed" ? out.monitoring
      : out.estimated; // proposed / approved / in-progress
    bucket.co2e += a.co2e ?? 0;
    bucket.usd += annualUsd(a);
  }
  return out;
}

// ── Derived: 2030 pathway (req. 4) ───────────────────────────────────────────
export const PATHWAY_REQUIRED_TCO2E = 275; // annual reduction required by the 2030 pathway
export function verifiedPathway() {
  const verified = savingsBuckets().verified.co2e;
  return {
    verified,
    required: PATHWAY_REQUIRED_TCO2E,
    pct: Math.min(100, Math.round((verified / PATHWAY_REQUIRED_TCO2E) * 100)),
  };
}

// ── Derived: pillar-specific progress (req. 9) ───────────────────────────────
// Each pillar reports the indicator that actually matters for it, summing
// delivered (implemented + verified) actions — never forcing CO₂e everywhere.
export type PillarProgress = {
  pillar: Pillar;
  metrics: { label: string; value: number; unit: string }[];
  delivered: number;
  total: number;
};

const DELIVERED: Stage[] = ["completed", "verified"];

function sumMetric(actions: Action[], key: string): number {
  return actions.reduce((s, a) => s + (a.impact.find((m) => m.key === key)?.value ?? 0), 0);
}

export function pillarProgress(): PillarProgress[] {
  const reduction = reductionActions();
  const pillars: Pillar[] = ["energy", "water", "waste", "carbon", "social", "governance"];
  return pillars.map((p) => {
    const inPillar = reduction.filter((a) => a.pillar === p);
    const delivered = inPillar.filter((a) => DELIVERED.includes(a.stage));
    const total = inPillar.length;
    // For people/policy metrics, work in progress already counts (staff are
    // trained as the rollout runs); hard savings stay gated on delivered.
    const active = inPillar.filter((a) => a.stage === "in-progress" || DELIVERED.includes(a.stage));
    let metrics: PillarProgress["metrics"] = [];
    switch (p) {
      case "energy":
        metrics = [
          { label: "Energy saved", value: Math.round(sumMetric(delivered, "energy_mwh")), unit: "MWh" },
          { label: "Cost", value: Math.round(sumMetric(delivered, "cost_usd")), unit: "$" },
          { label: "Carbon", value: delivered.reduce((s, a) => s + (a.co2e ?? 0), 0), unit: "tCO₂e" },
        ]; break;
      case "water":
        metrics = [
          { label: "Water saved", value: Math.round(sumMetric(delivered, "water_m3")), unit: "m³" },
          { label: "Cost", value: Math.round(sumMetric(delivered, "cost_usd")), unit: "$" },
        ]; break;
      case "waste":
        metrics = [
          { label: "Diverted", value: Math.round(sumMetric(delivered, "waste_kg")), unit: "kg" },
          { label: "Diversion uplift", value: sumMetric(delivered, "diversion_pp"), unit: "pp" },
        ]; break;
      case "carbon":
        metrics = [
          { label: "Carbon avoided", value: delivered.reduce((s, a) => s + (a.co2e ?? 0), 0), unit: "tCO₂e" },
        ]; break;
      case "social":
        metrics = [
          { label: "Staff trained", value: Math.round(sumMetric(active, "people_trained")), unit: "people" },
          { label: "Completion", value: active.length ? Math.round(sumMetric(active, "completion_pct") / active.length) : 0, unit: "% avg" },
        ]; break;
      case "governance":
        metrics = [
          { label: "Policies / actions", value: Math.round(sumMetric(active, "policies")), unit: "completed" },
        ]; break;
    }
    return { pillar: p, metrics, delivered: delivered.length, total };
  }).filter((p) => p.total > 0);
}

// ── Derived: prioritisation lenses (req. 7) ──────────────────────────────────
export type Lens =
  | "quick-win" | "high-impact" | "strategic-capex" | "certification-blocker"
  | "market-instrument" | "overdue" | "awaiting-approval";

export const LENS_META: { key: Lens; label: string }[] = [
  { key: "quick-win",             label: "Quick win" },
  { key: "high-impact",           label: "High impact" },
  { key: "strategic-capex",       label: "Strategic capex" },
  { key: "certification-blocker", label: "Certification blocker" },
  { key: "market-instrument",     label: "Market instrument" },
  { key: "overdue",               label: "Overdue" },
  { key: "awaiting-approval",     label: "Awaiting approval" },
];

const TODAY = "2026-06-22";

export function matchesLens(a: Action, lens: Lens): boolean {
  switch (lens) {
    case "quick-win":
      return a.ease === "easy" && (a.paybackYears ?? 99) <= 1.5 && a.costUsd < 50000;
    case "high-impact":
      return (a.co2e ?? 0) >= 50 || a.priority === "critical";
    case "strategic-capex":
      return a.capexClass === "capex" && a.costUsd >= 200000;
    case "certification-blocker":
      return a.source === "certification-gap";
    case "market-instrument":
      return isMarketInstrument(a);
    case "overdue":
      return a.stage !== "verified" && a.stage !== "completed" && a.dueDate < TODAY;
    case "awaiting-approval":
      return a.stage === "proposed";
  }
}

export function isOverdue(a: Action): boolean {
  return matchesLens(a, "overdue");
}
