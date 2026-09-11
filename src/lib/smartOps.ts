/**
 * Smart Ops model — the asset and metering reality of a property (guide §8).
 *
 * Governing rules, in code so the pages can't drift from them:
 *  - Meter data feeds attribution, asset performance, diagnostics and verification only.
 *    It never feeds a KPI, the inventory or a report figure.
 *  - The meter TREE (parent → child) is what reconciliation and Unallocated use.
 *    The service GRAPH (meter → end-use / asset) says what a meter measures, with a basis.
 *  - Every meter mapping has a MODE: an asset with its output measured gives a performance
 *    ratio; a combined circuit gives a load profile; an operation with a throughput count
 *    gives an intensity. Efficiency is only claimed where both sides are measured.
 *  - References: design (day one), commissioned (where measured), own baseline
 *    (provisional after 3 months, established after 12). The user picks; the default
 *    follows the data.
 *  - Facts as measured: deviation, persistence and excess quantity. No savings, no loss,
 *    no health verdict, no suggested action. The audit is the client's.
 */

export type Resource = "electricity" | "water" | "thermal";
export type MeterStatus = "live" | "delayed" | "offline";
export type MeterKind = "billing" | "sub" | "output" | "sensor";
export type Mode = "asset-ratio" | "end-use-load" | "process-intensity";
export type Basis = "measured" | "schedule" | "assumption";
export type Level = "L1" | "L2" | "L3" | "L4";
export type RefKind = "design" | "commissioned" | "baseline";
export type FactStatus = "open" | "acknowledged" | "action-raised" | "resolved";

/* ── Methodology settings (owned by the Platform Admin, versioned) ───────── */

export const THRESHOLDS = {
  version: "M-2026.2",
  owner: "Platform Admin",
  persistenceDays: 3,
  materialityPct: 10,
  floorKwh: 500,
  floorM3: 20,
  reconciliationTolPct: 2,
  parentCoverageMinPct: 70,
  endUseSeparationMinPct: 90,
  baselineProvisionalMonths: 3,
  baselineEstablishedMonths: 12,
  leakRateThresholdPct: 10,
} as const;

/* ── Meter tree ─────────────────────────────────────────────────────────── */

export type MeterPoint = {
  id: string;
  name: string;
  resource: Resource;
  kind: MeterKind;
  parentId: string | null;
  unit: string;
  interval: "15 min" | "hourly" | "daily";
  source: "Utility API" | "BMS" | "IoT gateway" | "Meter API";
  status: MeterStatus;
  lastReading: string;
  /** Approved period total (this month to date) in `unit`. Sensors carry no total. */
  periodTotal: number | null;
  gapHours: number;
};

export const METERS: MeterPoint[] = [
  // Electricity boundary
  { id: "ELEC-MAIN",  name: "DEWA electricity — main incomer", resource: "electricity", kind: "billing", parentId: null,        unit: "kWh", interval: "15 min", source: "Utility API", status: "live",    lastReading: "2 min ago",  periodTotal: 284500, gapHours: 0 },
  { id: "SM-CHL-01",  name: "Chiller 01 — compressor feed",    resource: "electricity", kind: "sub",     parentId: "ELEC-MAIN", unit: "kWh", interval: "15 min", source: "BMS",         status: "live",    lastReading: "2 min ago",  periodTotal: 52800,  gapHours: 0 },
  { id: "SM-CHL-02",  name: "Chiller 02 — compressor feed",    resource: "electricity", kind: "sub",     parentId: "ELEC-MAIN", unit: "kWh", interval: "15 min", source: "BMS",         status: "live",    lastReading: "2 min ago",  periodTotal: 43600,  gapHours: 0 },
  { id: "SM-HVAC-D",  name: "Cooling towers + condenser pumps + AHUs", resource: "electricity", kind: "sub", parentId: "ELEC-MAIN", unit: "kWh", interval: "15 min", source: "BMS",     status: "live",    lastReading: "2 min ago",  periodTotal: 24600,  gapHours: 0 },
  { id: "SM-LGT-C",   name: "Lighting — common areas & façade", resource: "electricity", kind: "sub",    parentId: "ELEC-MAIN", unit: "kWh", interval: "15 min", source: "IoT gateway", status: "live",    lastReading: "4 min ago",  periodTotal: 38900,  gapHours: 0 },
  { id: "SM-GR-T1",   name: "Guest-room feeders — L1–L12",      resource: "electricity", kind: "sub",    parentId: "ELEC-MAIN", unit: "kWh", interval: "15 min", source: "IoT gateway", status: "live",    lastReading: "4 min ago",  periodTotal: 42600,  gapHours: 0 },
  { id: "SM-KIT-01",  name: "Main kitchen",                     resource: "electricity", kind: "sub",    parentId: "ELEC-MAIN", unit: "kWh", interval: "15 min", source: "IoT gateway", status: "live",    lastReading: "4 min ago",  periodTotal: 28400,  gapHours: 0 },
  { id: "SM-LDY-E",   name: "Laundry — electrical",             resource: "electricity", kind: "sub",    parentId: "ELEC-MAIN", unit: "kWh", interval: "15 min", source: "IoT gateway", status: "delayed", lastReading: "38 min ago", periodTotal: 20900,  gapHours: 3 },
  { id: "SM-POOL",    name: "Pool & spa plant",                 resource: "electricity", kind: "sub",    parentId: "ELEC-MAIN", unit: "kWh", interval: "hourly", source: "IoT gateway", status: "live",    lastReading: "31 min ago", periodTotal: 8600,   gapHours: 0 },
  { id: "SM-BOH",     name: "Back of house",                    resource: "electricity", kind: "sub",    parentId: "ELEC-MAIN", unit: "kWh", interval: "hourly", source: "IoT gateway", status: "offline", lastReading: "6 h ago",    periodTotal: 5100,   gapHours: 6 },
  // Cooling output + conditions (feed the chiller ratios)
  { id: "BTU-01",     name: "Chiller 01 — chilled-water BTU meter", resource: "thermal", kind: "output", parentId: null, unit: "TR·h", interval: "15 min", source: "BMS", status: "live",    lastReading: "2 min ago", periodTotal: 71300, gapHours: 0 },
  { id: "BTU-02",     name: "Chiller 02 — chilled-water BTU meter", resource: "thermal", kind: "output", parentId: null, unit: "TR·h", interval: "15 min", source: "BMS", status: "offline", lastReading: "4 d ago",   periodTotal: 66100, gapHours: 96 },
  { id: "SEN-WB",     name: "Wet-bulb — weather API (DXB)",     resource: "thermal",     kind: "sensor",  parentId: null, unit: "°C", interval: "hourly", source: "Meter API", status: "live", lastReading: "12 min ago", periodTotal: null, gapHours: 0 },
  { id: "SEN-LOAD-1", name: "Chiller 01 — % load (BMS)",        resource: "thermal",     kind: "sensor",  parentId: null, unit: "%",  interval: "15 min", source: "BMS", status: "live", lastReading: "2 min ago", periodTotal: null, gapHours: 0 },
  { id: "SEN-LOAD-2", name: "Chiller 02 — % load (BMS)",        resource: "thermal",     kind: "sensor",  parentId: null, unit: "%",  interval: "15 min", source: "BMS", status: "live", lastReading: "2 min ago", periodTotal: null, gapHours: 0 },
  // Water boundary
  { id: "WATER-MAIN", name: "DEWA water — main meter",          resource: "water", kind: "billing", parentId: null,         unit: "m³", interval: "hourly", source: "Utility API", status: "live", lastReading: "18 min ago", periodTotal: 8420, gapHours: 0 },
  { id: "WM-GR",      name: "Guest-room risers",                resource: "water", kind: "sub",     parentId: "WATER-MAIN", unit: "m³", interval: "hourly", source: "IoT gateway", status: "live", lastReading: "18 min ago", periodTotal: 3450, gapHours: 0 },
  { id: "WM-LDY",     name: "Laundry — water",                  resource: "water", kind: "sub",     parentId: "WATER-MAIN", unit: "m³", interval: "hourly", source: "IoT gateway", status: "live", lastReading: "18 min ago", periodTotal: 1850, gapHours: 0 },
  { id: "WM-KIT",     name: "Kitchen",                          resource: "water", kind: "sub",     parentId: "WATER-MAIN", unit: "m³", interval: "hourly", source: "IoT gateway", status: "live", lastReading: "18 min ago", periodTotal: 1100, gapHours: 0 },
  { id: "WM-CT",      name: "Cooling-tower makeup",             resource: "water", kind: "sub",     parentId: "WATER-MAIN", unit: "m³", interval: "hourly", source: "BMS",         status: "live", lastReading: "18 min ago", periodTotal: 980,  gapHours: 0 },
  { id: "WM-POOL",    name: "Pool top-up & backwash",           resource: "water", kind: "sub",     parentId: "WATER-MAIN", unit: "m³", interval: "daily",  source: "IoT gateway", status: "live", lastReading: "Today 06:00", periodTotal: 420, gapHours: 0 },
  { id: "WM-IRR",     name: "Irrigation",                       resource: "water", kind: "sub",     parentId: "WATER-MAIN", unit: "m³", interval: "daily",  source: "IoT gateway", status: "live", lastReading: "Today 06:00", periodTotal: 300, gapHours: 0 },
];

/* ── End-uses (fixed taxonomy subset) with their accountable department ─── */

export type EndUse = {
  id: string;
  label: string;
  resources: Resource[];
  department: string;
  /** A combined group is one meter over several end-uses with no physical separation. */
  combined?: string[];
};

export const END_USES: EndUse[] = [
  { id: "hvac-gen",   label: "HVAC — generation",        resources: ["electricity"],          department: "Engineering" },
  { id: "hvac-dist",  label: "HVAC — distribution",      resources: ["electricity"],          department: "Engineering", combined: ["Cooling-tower fans", "Condenser pumps", "AHUs"] },
  { id: "lighting",   label: "Lighting",                 resources: ["electricity"],          department: "Engineering" },
  { id: "rooms",      label: "Guest rooms",              resources: ["electricity", "water"], department: "Rooms division" },
  { id: "kitchen",    label: "Kitchen & F&B",            resources: ["electricity", "water"], department: "F&B" },
  { id: "laundry",    label: "Laundry",                  resources: ["electricity", "water"], department: "Housekeeping" },
  { id: "pool",       label: "Pool & spa",               resources: ["electricity", "water"], department: "Recreation" },
  { id: "ct-makeup",  label: "Cooling-tower makeup",     resources: ["water"],                department: "Engineering" },
  { id: "irrigation", label: "Irrigation & landscape",   resources: ["water"],                department: "Engineering" },
  { id: "boh",        label: "Back of house & admin",    resources: ["electricity"],          department: "Administration" },
];

/* ── Service graph: what each meter measures ────────────────────────────── */

export type ServiceEdge = {
  meterId: string;
  target: { type: "asset" | "end-use"; id: string };
  mode: Mode;
  share: number;
  basis: Basis;
  since: string;
};

export const SERVICE_EDGES: ServiceEdge[] = [
  { meterId: "SM-CHL-01", target: { type: "asset",   id: "AST-001" },   mode: "asset-ratio",       share: 1, basis: "measured", since: "2019-08" },
  { meterId: "SM-CHL-02", target: { type: "asset",   id: "AST-002" },   mode: "asset-ratio",       share: 1, basis: "measured", since: "2019-08" },
  { meterId: "SM-CHL-01", target: { type: "end-use", id: "hvac-gen" },  mode: "end-use-load",      share: 1, basis: "measured", since: "2019-08" },
  { meterId: "SM-CHL-02", target: { type: "end-use", id: "hvac-gen" },  mode: "end-use-load",      share: 1, basis: "measured", since: "2019-08" },
  { meterId: "SM-HVAC-D", target: { type: "end-use", id: "hvac-dist" }, mode: "end-use-load",      share: 1, basis: "measured", since: "2019-08" },
  { meterId: "SM-LGT-C",  target: { type: "end-use", id: "lighting" },  mode: "end-use-load",      share: 1, basis: "measured", since: "2024-11" },
  { meterId: "SM-GR-T1",  target: { type: "end-use", id: "rooms" },     mode: "end-use-load",      share: 1, basis: "measured", since: "2023-02" },
  { meterId: "SM-KIT-01", target: { type: "end-use", id: "kitchen" },   mode: "end-use-load",      share: 1, basis: "measured", since: "2023-02" },
  { meterId: "SM-LDY-E",  target: { type: "end-use", id: "laundry" },   mode: "process-intensity", share: 1, basis: "measured", since: "2023-02" },
  { meterId: "SM-POOL",   target: { type: "end-use", id: "pool" },      mode: "end-use-load",      share: 1, basis: "measured", since: "2023-06" },
  { meterId: "SM-BOH",    target: { type: "end-use", id: "boh" },       mode: "end-use-load",      share: 1, basis: "measured", since: "2023-06" },
  { meterId: "WM-GR",     target: { type: "end-use", id: "rooms" },     mode: "end-use-load",      share: 1, basis: "measured", since: "2023-02" },
  { meterId: "WM-LDY",    target: { type: "end-use", id: "laundry" },   mode: "process-intensity", share: 1, basis: "measured", since: "2023-02" },
  { meterId: "WM-KIT",    target: { type: "end-use", id: "kitchen" },   mode: "end-use-load",      share: 1, basis: "measured", since: "2023-02" },
  { meterId: "WM-CT",     target: { type: "end-use", id: "ct-makeup" }, mode: "end-use-load",      share: 1, basis: "measured", since: "2019-08" },
  { meterId: "WM-POOL",   target: { type: "end-use", id: "pool" },      mode: "end-use-load",      share: 1, basis: "measured", since: "2023-06" },
  { meterId: "WM-IRR",    target: { type: "end-use", id: "irrigation" },mode: "end-use-load",      share: 1, basis: "schedule", since: "2023-06" },
];

/* ── Reconciliation, coverage, levels ───────────────────────────────────── */

export type Reconciliation = {
  boundaryId: string;
  parent: number;
  children: number;
  unallocated: number;          // never negative
  unallocatedPct: number;
  differencePct: number;        // (children − parent) / parent, published always
  status: "reconciled" | "over-measured" | "failed";
  coveragePct: number;          // Σ children ÷ parent
};

export function reconcile(boundaryId: string): Reconciliation {
  const parent = METERS.find((m) => m.id === boundaryId)!;
  const P = parent.periodTotal ?? 0;
  const C = METERS.filter((m) => m.parentId === boundaryId).reduce((s, m) => s + (m.periodTotal ?? 0), 0);
  const tol = THRESHOLDS.reconciliationTolPct / 100;
  const differencePct = P ? ((C - P) / P) * 100 : 0;
  let status: Reconciliation["status"] = "reconciled";
  let unallocated = Math.max(0, P - C);
  if (C > P * (1 + tol)) { status = "failed"; unallocated = 0; }
  else if (C > P) { status = "over-measured"; unallocated = 0; }
  return {
    boundaryId, parent: P, children: C, unallocated,
    unallocatedPct: P ? (unallocated / P) * 100 : 0,
    differencePct, status,
    coveragePct: P ? Math.min(100, (C / P) * 100) : 0,
  };
}

export function childrenOf(meterId: string): MeterPoint[] {
  return METERS.filter((m) => m.parentId === meterId);
}

/** End-use separation: share of the metered quantity mapped to this end-use that is evidenced. */
export function separationPct(endUseId: string, resource: Resource): number {
  const edges = SERVICE_EDGES.filter((e) => e.target.type === "end-use" && e.target.id === endUseId)
    .filter((e) => METERS.find((m) => m.id === e.meterId)?.resource === resource);
  if (!edges.length) return 0;
  const evidenced = edges.filter((e) => e.basis !== "assumption").length;
  return Math.round((evidenced / edges.length) * 100);
}

/** The diagnostic level a target is entitled to this period (§8.7). */
export function levelFor(target: { type: "asset" | "end-use"; id: string }, resource: Resource): { level: Level; coveragePct: number; separationPct: number; note: string } {
  const boundary = resource === "water" ? "WATER-MAIN" : "ELEC-MAIN";
  const rec = reconcile(boundary);
  if (rec.status === "failed") return { level: "L1", coveragePct: rec.coveragePct, separationPct: 0, note: "Reconciliation failed — attribution suspended" };
  if (rec.coveragePct < THRESHOLDS.parentCoverageMinPct) return { level: "L1", coveragePct: rec.coveragePct, separationPct: 0, note: `Parent coverage ${Math.round(rec.coveragePct)}% is below the ${THRESHOLDS.parentCoverageMinPct}% minimum` };
  if (target.type === "asset") {
    const asset = ASSETS.find((a) => a.id === target.id);
    if (asset?.ratio.available) return { level: "L3", coveragePct: rec.coveragePct, separationPct: 100, note: "Asset metered with its output; ratio against its own reference" };
    return { level: "L2", coveragePct: rec.coveragePct, separationPct: 100, note: asset?.ratio.missing ? `Ratio unavailable — ${asset.ratio.missing}` : "Consumption only" };
  }
  const sep = separationPct(target.id, resource);
  if (sep < THRESHOLDS.endUseSeparationMinPct) return { level: "L1", coveragePct: rec.coveragePct, separationPct: sep, note: "End-use not separated — reported as its combined group" };
  return { level: "L2", coveragePct: rec.coveragePct, separationPct: sep, note: "End-use separated and reconciled" };
}

/* ── References (design · commissioned · own baseline) ──────────────────── */

/** A point on a part-load curve. `hours` = time the asset spent in that load band over the measured window. */
export type CurvePoint = { load: number; value: number; hours?: number };
export type Reference = {
  kind: RefKind;
  label: string;
  source: string;
  date: string;
  /** Baseline only: where the platform's own model stands in the cold-start rule. */
  baselineStatus?: "none" | "provisional" | "established";
  monthsOfData?: number;
};

export const REF_LABEL: Record<RefKind, string> = { design: "Design", commissioned: "Commissioned", baseline: "Own baseline" };

/** Default reference: established baseline → commissioned → design. The user may override. */
export function defaultReference(refs: Reference[]): RefKind {
  const b = refs.find((r) => r.kind === "baseline");
  if (b?.baselineStatus === "established") return "baseline";
  if (refs.some((r) => r.kind === "commissioned")) return "commissioned";
  return "design";
}

/* ── Conditions and throughput sources ──────────────────────────────────── */

export const CONDITIONS = {
  wetBulbC: 27.4,
  dryBulbC: 34.8,
  source: "Weather API — DXB, hourly" as const,
  manualOverrides: [
    { date: "2026-05-03", wetBulbC: 28.9, by: "F. Setiawan", reason: "Station outage 02:00–09:00" },
    { date: "2026-04-21", wetBulbC: 26.1, by: "F. Setiawan", reason: "Station outage" },
  ],
};

/** Wet-bulb from the weather API, hourly, last 48 h — what the chiller ratios are read against. */
export const WETBULB_48H = Array.from({ length: 48 }, (_, i) => {
  const h = i % 24;
  const wb = 26.6 + 1.6 * Math.sin(((h - 9) / 24) * Math.PI * 2) + (i >= 24 ? 0.4 : 0);
  return { h: `${String(h).padStart(2, "0")}:00`, day: i < 24 ? "Yesterday" : "Today", wb: +wb.toFixed(1) };
});

export const LAUNDRY_THROUGHPUT_SOURCE = {
  active: "Laundry system feed (Kannegiesser)" as const,
  options: ["Manual daily log", "Laundry system feed (Kannegiesser)"] as const,
  lastFeed: "Today 06:10",
  manualEntriesThisMonth: 2,
};

/* ── Assets ─────────────────────────────────────────────────────────────── */

export type Asset = {
  id: string;
  name: string;
  type: string;
  system: string;
  location: string;
  manufacturer: string;
  model: string;
  capacity: string;
  installed: string;
  refrigerant?: { gas: string; chargeKg: number; leakRate12mPct: number; method: "screening" | "mass balance" };
  ratio: {
    metric: string;
    available: boolean;
    missing?: string;
    references: Reference[];
    curves: Partial<Record<RefKind, CurvePoint[]>>;
    /** Last 14 days, binned by load. */
    measured: CurvePoint[];
    measuredWindow: string;
  };
  linkedMeters: string[];
  serviceEvents: { date: string; event: string }[];
};

export const ASSETS: Asset[] = [
  {
    id: "AST-001", name: "Chiller 01", type: "Water-cooled centrifugal chiller", system: "HVAC — generation",
    location: "Basement plant room", manufacturer: "Trane", model: "RTHD 500TR", capacity: "500 TR", installed: "Aug 2019",
    refrigerant: { gas: "R-134a", chargeKg: 410, leakRate12mPct: 6.8, method: "screening" },
    ratio: {
      metric: "kW/TR", available: true,
      references: [
        { kind: "design",       label: "Design",       source: "Trane datasheet RTHD-500 (AHRI 550/590 part-load points)", date: "2019-06" },
        { kind: "commissioned", label: "Commissioned", source: "Commissioning report, wet-bulb 28.1 °C",                   date: "2019-08-22" },
        { kind: "baseline",     label: "Own baseline", source: "Platform model · Apr 2025 – Mar 2026 · binned by load & wet-bulb", date: "2026-04-01", baselineStatus: "established", monthsOfData: 12 },
      ],
      curves: {
        design:       [{ load: 25, value: 0.72 }, { load: 50, value: 0.60 }, { load: 75, value: 0.58 }, { load: 100, value: 0.62 }],
        commissioned: [{ load: 25, value: 0.76 }, { load: 50, value: 0.63 }, { load: 75, value: 0.61 }, { load: 100, value: 0.65 }],
        baseline:     [{ load: 25, value: 0.80 }, { load: 50, value: 0.66 }, { load: 75, value: 0.63 }, { load: 100, value: 0.66 }],
      },
      measured:       [{ load: 25, value: 0.92, hours: 58 }, { load: 50, value: 0.77, hours: 121 }, { load: 75, value: 0.75, hours: 126 }, { load: 100, value: 0.79, hours: 31 }],
      measuredWindow: "26 Apr – 9 May 2026 · 1,344 intervals · wet-bulb 26.1–28.9 °C",
    },
    linkedMeters: ["SM-CHL-01", "BTU-01", "SEN-LOAD-1", "SEN-WB"],
    serviceEvents: [
      { date: "2026-03-14", event: "Condenser tube clean (contractor)" },
      { date: "2025-11-02", event: "Refrigerant top-up 28 kg" },
      { date: "2025-06-19", event: "Annual service" },
    ],
  },
  {
    id: "AST-002", name: "Chiller 02", type: "Water-cooled centrifugal chiller", system: "HVAC — generation",
    location: "Basement plant room", manufacturer: "Carrier", model: "19XR 420TR", capacity: "420 TR", installed: "Aug 2019",
    refrigerant: { gas: "R-134a", chargeKg: 360, leakRate12mPct: 2.1, method: "screening" },
    ratio: {
      metric: "kW/TR", available: false, missing: "BTU-02 flow sensor flat-lined since 6 May — cooling output not measured",
      references: [
        { kind: "design",       label: "Design",       source: "Carrier datasheet 19XR-420 (AHRI part-load points)", date: "2019-06" },
        { kind: "commissioned", label: "Commissioned", source: "Commissioning report, wet-bulb 27.6 °C",             date: "2019-08-23" },
        { kind: "baseline",     label: "Own baseline", source: "Platform model · Dec 2025 – Apr 2026 · 5 of 12 months", date: "2026-05-01", baselineStatus: "provisional", monthsOfData: 5 },
      ],
      curves: {
        design:       [{ load: 25, value: 0.70 }, { load: 50, value: 0.59 }, { load: 75, value: 0.56 }, { load: 100, value: 0.60 }],
        commissioned: [{ load: 25, value: 0.74 }, { load: 50, value: 0.62 }, { load: 75, value: 0.59 }, { load: 100, value: 0.63 }],
        baseline:     [{ load: 25, value: 0.75 }, { load: 50, value: 0.63 }, { load: 75, value: 0.60 }, { load: 100, value: 0.64 }],
      },
      measured:       [{ load: 25, value: 0.78, hours: 66 }, { load: 50, value: 0.64, hours: 118 }, { load: 75, value: 0.62, hours: 112 }, { load: 100, value: 0.66, hours: 28 }],
      measuredWindow: "22 Apr – 5 May 2026 · 1,296 intervals (last window with output measured)",
    },
    linkedMeters: ["SM-CHL-02", "BTU-02", "SEN-LOAD-2", "SEN-WB"],
    serviceEvents: [
      { date: "2026-04-08", event: "Annual service" },
      { date: "2025-10-12", event: "Oil analysis — within limits" },
    ],
  },
  {
    id: "AST-003", name: "Cooling towers 01–02", type: "Induced-draught cooling towers", system: "HVAC — distribution",
    location: "Roof level", manufacturer: "BAC", model: "S3E-1222", capacity: "2 × 560 TR heat rejection", installed: "Aug 2019",
    ratio: {
      metric: "kW per TR rejected", available: false, missing: "Fans share the SM-HVAC-D meter with condenser pumps and AHUs — no asset-level meter",
      references: [{ kind: "design", label: "Design", source: "BAC datasheet — fan kW vs load", date: "2019-06" }],
      curves: { design: [{ load: 25, value: 0.015 }, { load: 50, value: 0.021 }, { load: 75, value: 0.034 }, { load: 100, value: 0.052 }] },
      measured: [], measuredWindow: "—",
    },
    linkedMeters: ["SM-HVAC-D", "WM-CT"],
    serviceEvents: [{ date: "2026-02-20", event: "Fill replacement, tower 02" }],
  },
  {
    id: "AST-004", name: "Laundry — washer-extractors 1–4", type: "Washer-extractors + dryers + ironer", system: "Laundry",
    location: "Basement laundry", manufacturer: "Kannegiesser", model: "PowerLine 110 kg", capacity: "4 × 110 kg", installed: "Feb 2023",
    ratio: {
      metric: "kWh/kg · L/kg", available: true,
      references: [
        { kind: "design",   label: "Design",       source: "Machine ratings — 1.45 kWh/kg, 12.5 L/kg at rated load", date: "2023-02" },
        { kind: "baseline", label: "Own baseline", source: "Platform model · May 2025 – Apr 2026 · by daily volume band", date: "2026-05-01", baselineStatus: "established", monthsOfData: 12 },
      ],
      curves: {},
      measured: [], measuredWindow: "1 – 14 May 2026 · daily",
    },
    linkedMeters: ["SM-LDY-E", "WM-LDY"],
    serviceEvents: [{ date: "2026-01-11", event: "Dryer 2 heat exchanger clean" }],
  },
];

/* ── Profiles, intensities, and the deviation facts ─────────────────────── */

export type HourPoint = { h: string; expected: number; measured: number };

/** Lighting — common areas & façade, average day of the last 7 days vs the selected reference (kW). */
export const LIGHTING_PROFILE: HourPoint[] = Array.from({ length: 24 }, (_, h) => {
  const label = `${String(h).padStart(2, "0")}:00`;
  const night = h <= 5 || h >= 23;
  const evening = h >= 18 && h <= 22;
  const expected = night ? 38 : evening ? 112 : 64;
  const measured = night ? (h >= 1 && h <= 3 ? 62 : 44) : evening ? 116 : 68;
  return { h: label, expected, measured };
});

export const LIGHTING = {
  installedLoadKw: { common: 96, facade: 38 },
  schedule: "Common areas 24 h (dimmed 60% 23:00–06:00) · Façade 18:30–01:00",
  references: [
    { kind: "design",       label: "Design",       source: "Installed load × lighting schedule (Nov 2024 LED retrofit)", date: "2024-11" },
    { kind: "commissioned", label: "Commissioned", source: "Post-retrofit measured profile, 7 days",                      date: "2024-11-18" },
    { kind: "baseline",     label: "Own baseline", source: "Platform model · Dec 2024 – Nov 2025 · by day type",          date: "2025-12-01", baselineStatus: "established", monthsOfData: 12 },
  ] as Reference[],
  dailyKwh: { design: 1650, commissioned: 1320, baseline: 1360, measured: 1540 },
};

/** Guest rooms — kWh per occupied room night, last 14 days, against the baseline at the same occupancy band. */
export const ROOMS_DAILY = [
  { d: "26 Apr", orn: 268, kwhPerOrn: 13.4, expected: 13.1 }, { d: "27 Apr", orn: 271, kwhPerOrn: 13.6, expected: 13.1 },
  { d: "28 Apr", orn: 280, kwhPerOrn: 13.2, expected: 13.0 }, { d: "29 Apr", orn: 292, kwhPerOrn: 13.9, expected: 12.9 },
  { d: "30 Apr", orn: 301, kwhPerOrn: 14.1, expected: 12.9 }, { d: "1 May",  orn: 304, kwhPerOrn: 14.4, expected: 12.9 },
  { d: "2 May",  orn: 296, kwhPerOrn: 14.2, expected: 12.9 }, { d: "3 May",  orn: 288, kwhPerOrn: 14.6, expected: 13.0 },
  { d: "4 May",  orn: 275, kwhPerOrn: 14.0, expected: 13.1 }, { d: "5 May",  orn: 262, kwhPerOrn: 13.8, expected: 13.2 },
  { d: "6 May",  orn: 259, kwhPerOrn: 14.3, expected: 13.2 }, { d: "7 May",  orn: 266, kwhPerOrn: 14.5, expected: 13.1 },
  { d: "8 May",  orn: 284, kwhPerOrn: 14.2, expected: 13.0 }, { d: "9 May",  orn: 290, kwhPerOrn: 14.1, expected: 13.0 },
];

/** Kitchen — night baseload (01:00–05:00 average kW), showing the step change on 28 Apr. */
export const KITCHEN_NIGHT = [
  { d: "20 Apr", kw: 18.2 }, { d: "22 Apr", kw: 17.9 }, { d: "24 Apr", kw: 18.4 }, { d: "26 Apr", kw: 18.1 },
  { d: "28 Apr", kw: 23.8 }, { d: "30 Apr", kw: 24.1 }, { d: "2 May", kw: 24.4 }, { d: "4 May", kw: 23.9 },
  { d: "6 May", kw: 24.2 }, { d: "8 May", kw: 24.0 },
];
export const KITCHEN = { coversMonth: 11840, kwhPerCover: 2.4, baselineKwhPerCover: 2.2, nightExpectedKw: 18.0 };

/** Laundry — daily volume with electricity and water intensity. */
export const LAUNDRY_DAILY = [
  { d: "1 May",  kg: 1420, kwhPerKg: 1.66, lPerKg: 14.1 }, { d: "2 May",  kg: 1510, kwhPerKg: 1.64, lPerKg: 14.0 },
  { d: "3 May",  kg: 1580, kwhPerKg: 1.69, lPerKg: 14.6 }, { d: "4 May",  kg: 1390, kwhPerKg: 1.74, lPerKg: 15.1 },
  { d: "5 May",  kg: 1300, kwhPerKg: 1.78, lPerKg: 15.3 }, { d: "6 May",  kg: 1350, kwhPerKg: 1.76, lPerKg: 15.0 },
  { d: "7 May",  kg: 1470, kwhPerKg: 1.71, lPerKg: 14.7 }, { d: "8 May",  kg: 1560, kwhPerKg: 1.70, lPerKg: 14.5 },
  { d: "9 May",  kg: 1610, kwhPerKg: 1.68, lPerKg: 14.4 }, { d: "10 May", kg: 1490, kwhPerKg: 1.73, lPerKg: 14.9 },
  { d: "11 May", kg: 1380, kwhPerKg: 1.77, lPerKg: 15.2 }, { d: "12 May", kg: 1440, kwhPerKg: 1.75, lPerKg: 15.0 },
  { d: "13 May", kg: 1520, kwhPerKg: 1.72, lPerKg: 14.8 }, { d: "14 May", kg: 1550, kwhPerKg: 1.71, lPerKg: 14.7 },
];
export const LAUNDRY = {
  monthKg: 42300,
  kwhPerKg: { measured: 1.72, baseline: 1.58, design: 1.45 },
  lPerKg:   { measured: 14.8, baseline: 13.9, design: 12.5 },
};

export type DeviationFact = {
  id: string;
  target: { type: "asset" | "end-use" | "meter"; id: string; label: string };
  resource: Resource;
  mode: Mode | "sensor-health" | "night-flow";
  level: Level;
  /** The statement is the fact, phrased the way the guide permits at that level. */
  statement: string;
  measured: string;
  reference: string;
  refKind?: RefKind;
  deviationPct?: number;
  persistenceDays: number;
  since: string;
  excess?: { value: number; unit: string };
  band: "above-threshold" | "watch" | "data-quality";
  status: FactStatus;
  actionId?: string;
};

export const DEVIATIONS: DeviationFact[] = [
  {
    id: "D-101", target: { type: "asset", id: "AST-001", label: "Chiller 01" }, resource: "electricity", mode: "asset-ratio", level: "L3",
    statement: "Chiller 01 is operating at 0.77 kW/TR in the 50–75% load band against its own established baseline of 0.64 kW/TR at comparable wet-bulb.",
    measured: "0.77 kW/TR", reference: "0.64 kW/TR", refKind: "baseline", deviationPct: 20.3, persistenceDays: 14, since: "26 Apr 2026",
    excess: { value: 18400, unit: "kWh" }, band: "above-threshold", status: "action-raised", actionId: "MA-041",
  },
  {
    id: "D-102", target: { type: "end-use", id: "lighting", label: "Lighting — common & façade" }, resource: "electricity", mode: "end-use-load", level: "L2",
    statement: "Lighting draws 62 kW between 01:00 and 04:00 against an expected 38 kW from the façade schedule (off at 01:00); façade circuits remained on until 03:40 on 6 of the last 7 nights.",
    measured: "62 kW (01:00–04:00)", reference: "38 kW", refKind: "baseline", deviationPct: 63, persistenceDays: 6, since: "3 May 2026",
    excess: { value: 1260, unit: "kWh" }, band: "above-threshold", status: "open",
  },
  {
    id: "D-103", target: { type: "end-use", id: "kitchen", label: "Main kitchen" }, resource: "electricity", mode: "end-use-load", level: "L2",
    statement: "Kitchen night baseload (01:00–05:00) stepped from 18.1 kW to 24.0 kW on 28 Apr and has held there; no service event or schedule change is recorded for that date.",
    measured: "24.0 kW", reference: "18.0 kW", refKind: "baseline", deviationPct: 33, persistenceDays: 11, since: "28 Apr 2026",
    excess: { value: 1440, unit: "kWh" }, band: "above-threshold", status: "acknowledged",
  },
  {
    id: "D-104", target: { type: "meter", id: "WM-GR", label: "Guest-room risers — Zone 3" }, resource: "water", mode: "night-flow", level: "L2",
    statement: "Zone 3 riser shows 0.8 m³/h between 01:00 and 06:00 with no scheduled use, on 3 consecutive nights.",
    measured: "0.8 m³/h", reference: "≤ 0.1 m³/h", persistenceDays: 3, since: "6 May 2026",
    excess: { value: 12, unit: "m³" }, band: "above-threshold", status: "open",
  },
  {
    id: "D-105", target: { type: "end-use", id: "laundry", label: "Laundry" }, resource: "water", mode: "process-intensity", level: "L2",
    statement: "Laundry water intensity is 14.8 L/kg against its own baseline of 13.9 L/kg at comparable daily volume — within the materiality threshold, trending up for 9 days.",
    measured: "14.8 L/kg", reference: "13.9 L/kg", refKind: "baseline", deviationPct: 6.5, persistenceDays: 9, since: "4 May 2026",
    band: "watch", status: "open",
  },
  {
    id: "D-106", target: { type: "end-use", id: "rooms", label: "Guest rooms" }, resource: "electricity", mode: "end-use-load", level: "L2",
    statement: "Guest-room feeders are at 14.2 kWh per occupied room night against a baseline of 13.0 at the same occupancy band — within the materiality threshold, rising since 29 Apr.",
    measured: "14.2 kWh/ORN", reference: "13.0 kWh/ORN", refKind: "baseline", deviationPct: 9.2, persistenceDays: 11, since: "29 Apr 2026",
    band: "watch", status: "open",
  },
  {
    id: "D-107", target: { type: "meter", id: "BTU-02", label: "Chiller 02 — BTU meter" }, resource: "thermal", mode: "sensor-health", level: "L2",
    statement: "BTU-02 flow signal has been flat since 6 May 09:15. Chiller 02's performance ratio is suspended; it is reported on consumption only until the sensor returns.",
    measured: "flat-line 96 h", reference: "15-min interval expected", persistenceDays: 4, since: "6 May 2026",
    band: "data-quality", status: "open",
  },
  {
    id: "D-108", target: { type: "meter", id: "SM-BOH", label: "Back of house sub-meter" }, resource: "electricity", mode: "sensor-health", level: "L2",
    statement: "SM-BOH has not reported for 6 hours. The gap is shown as a gap; Back of house attribution for today is not determinable.",
    measured: "no data 6 h", reference: "hourly interval expected", persistenceDays: 0, since: "Today 03:00",
    band: "data-quality", status: "open",
  },
];

/* ── Peak demand on the electricity boundary ────────────────────────────── */

export const PEAK_DEMAND = {
  monthPeakKw: 842, at: "3 May 2026 · 14:45", contractedKw: 750, tariffBand: "DEWA ToU demand band",
  daysAboveContract: 4,
  profile: Array.from({ length: 24 }, (_, h) => ({ h: `${String(h).padStart(2, "0")}:00`, kw: [410,395,388,380,382,405,470,560,640,700,742,780,810,835,842,838,815,790,760,720,660,590,520,450][h] })),
};

/* ── Actions raised from Smart Ops (human-raised, never suggested) ──────── */

export const RAISED_ACTIONS = [
  { id: "MA-041", fact: "D-101", title: "Chiller 01 — investigate kW/TR deviation", owner: "Facilities Manager", status: "In progress", due: "Today" },
  { id: "MA-039", fact: "D-104", title: "Zone 3 riser — night-flow inspection", owner: "Plumbing contractor", status: "Assigned", due: "Today" },
  { id: "MA-037", fact: "D-103", title: "Kitchen night baseload — walk-in refrigeration check", owner: "F&B / Engineering", status: "Acknowledged", due: "Tomorrow" },
];

/* ── Display helpers ────────────────────────────────────────────────────── */

export const MODE_LABEL: Record<Mode, string> = {
  "asset-ratio": "Asset ratio",
  "end-use-load": "End-use load",
  "process-intensity": "Process intensity",
};

export const LEVEL_TEXT: Record<Level, string> = {
  L1: "Property — billed totals only; no attribution",
  L2: "End-use — separated and reconciled; no cause named",
  L3: "Asset — ratio against its own reference; no verdict",
  L4: "Verified saving — approved M&V plan, named signatory",
};

export function meterById(id: string) {
  return METERS.find((m) => m.id === id);
}
export function endUseById(id: string) {
  return END_USES.find((e) => e.id === id);
}
export function fmt(n: number) {
  return n.toLocaleString("en-US");
}

/* ── Measurement & Verification (L4) ────────────────────────────────────── */

/** The interval store's last approved month — what "today" means for the mock series. */
export const TODAY_YM = "2026-05";

export type MvStatus = "awaiting-approval" | "implemented" | "monitoring" | "verified" | "reported";

export type MvMeasure = {
  id: string; code: string; name: string; property: string; target: string;
  resource: "electricity" | "water";
  option: "A" | "B" | "C" | "D";
  status: MvStatus;
  baselinePeriod: string; reportingPeriod: string; interval: "Monthly" | "Weekly" | "Daily";
  /** Calendar geometry (YYYY-MM). `installed` and `reportingStart` are null until they exist. */
  timeline: { baselineStart: string; baselineMonths: number; installed: string | null; reportingStart: string | null; reportingMonths: number };
  /** Typical monthly quantity in the baseline period — drawn only while no result exists. */
  baselineMonthly?: number;
  fit?: { cvrmse: number; nmbe: number };
  monitoringDay?: number; monitoringDays?: number;
  signatory?: string; signedOn?: string;
  /** The lines the guide requires to be published together (§8.1.1). The raw change is derived, never typed. */
  result?: {
    unit: string;
    routine: { qty: number; variables: string };
    nonRoutine: { qty: number; note: string }[];
    adjustedBaseline: number;
    reporting: number;
    saving: number;
    reconciliationPct: number;
  };
};

export const MV_MEASURES: MvMeasure[] = [
  { id: "MV-002", code: "ENG-014", name: "Chiller 01 — VFD retrofit", property: "Skyline Dubai", target: "Chiller 01", resource: "electricity", option: "B", status: "reported",
    baselinePeriod: "Jun 2023 – May 2024", reportingPeriod: "Jun 2024 – May 2025", interval: "Weekly", fit: { cvrmse: 14.8, nmbe: -2.3 },
    timeline: { baselineStart: "2023-06", baselineMonths: 12, installed: "2024-05", reportingStart: "2024-06", reportingMonths: 12 },
    signatory: "R. Haddad · Platform Admin", signedOn: "2025-06-20",
    result: { unit: "kWh", routine: { qty: 32500, variables: "cooling degree-days +9%, occupied room nights +11%" }, nonRoutine: [], adjustedBaseline: 612000, reporting: 583600, saving: 28400, reconciliationPct: -0.9 } },
  { id: "MV-001", code: "ENG-002", name: "LED retrofit — back of house", property: "Skyline Dubai", target: "Lighting — BOH circuits", resource: "electricity", option: "A", status: "verified",
    baselinePeriod: "Nov 2024 – Oct 2025", reportingPeriod: "Nov 2025 – Apr 2026", interval: "Monthly", fit: { cvrmse: 9.2, nmbe: 1.1 },
    timeline: { baselineStart: "2024-11", baselineMonths: 12, installed: "2025-10", reportingStart: "2025-11", reportingMonths: 6 },
    signatory: "R. Haddad · Platform Admin", signedOn: "2026-05-06",
    result: { unit: "kWh", routine: { qty: 2400, variables: "occupied room nights +6%, cooling degree-days +3%" }, nonRoutine: [], adjustedBaseline: 61400, reporting: 44200, saving: 17200, reconciliationPct: 1.8 } },
  { id: "MV-003", code: "ENG-001", name: "BMS scheduling — AHUs", property: "Skyline Dubai", target: "Whole facility", resource: "electricity", option: "C", status: "verified",
    baselinePeriod: "Jan – Dec 2025", reportingPeriod: "Jan – Apr 2026", interval: "Monthly", fit: { cvrmse: 11.6, nmbe: 0.8 },
    timeline: { baselineStart: "2025-01", baselineMonths: 12, installed: "2025-12", reportingStart: "2026-01", reportingMonths: 4 },
    signatory: "R. Haddad · Platform Admin", signedOn: "2026-05-08",
    result: { unit: "kWh", routine: { qty: 1900, variables: "occupied room nights +4%" }, nonRoutine: [{ qty: -3100, note: "Tower B floors 9–12 closed for refurbishment, Feb–Mar 2026 (works order WO-2026-041)" }], adjustedBaseline: 1132400, reporting: 1118900, saving: 13500, reconciliationPct: 0.4 } },
  { id: "MV-004", code: "WTR-003", name: "Laundry — heat & water recovery", property: "Skyline Dubai", target: "Laundry", resource: "water", option: "B", status: "verified",
    baselinePeriod: "May 2025 – Oct 2025", reportingPeriod: "Nov 2025 – Apr 2026", interval: "Daily", fit: { cvrmse: 18.4, nmbe: -1.6 },
    timeline: { baselineStart: "2025-05", baselineMonths: 6, installed: "2025-10", reportingStart: "2025-11", reportingMonths: 6 },
    signatory: "R. Haddad · Platform Admin", signedOn: "2026-05-02",
    result: { unit: "m³", routine: { qty: 90, variables: "kg processed +4%" }, nonRoutine: [], adjustedBaseline: 7410, reporting: 6800, saving: 610, reconciliationPct: 2.1 } },
  { id: "MV-005", code: "WTR-001", name: "Greywater reuse — landscaping", property: "Skyline Dubai", target: "Irrigation & landscape", resource: "water", option: "B", status: "monitoring",
    baselinePeriod: "Apr 2025 – Mar 2026", reportingPeriod: "from 1 Apr 2026", interval: "Daily", monitoringDay: 41, monitoringDays: 90, baselineMonthly: 620, fit: { cvrmse: 16.2, nmbe: 0.9 },
    timeline: { baselineStart: "2025-04", baselineMonths: 12, installed: "2026-03", reportingStart: "2026-04", reportingMonths: 3 } },
  { id: "MV-006", code: "OPS-021", name: "Kitchen refrigeration controls", property: "Skyline Dubai", target: "Kitchen & F&B", resource: "electricity", option: "A", status: "monitoring",
    baselinePeriod: "May 2025 – Apr 2026", reportingPeriod: "from 28 Apr 2026", interval: "Daily", monitoringDay: 12, monitoringDays: 60, baselineMonthly: 28400, fit: { cvrmse: 12.4, nmbe: -1.2 },
    timeline: { baselineStart: "2025-05", baselineMonths: 12, installed: "2026-04", reportingStart: "2026-05", reportingMonths: 2 } },
  { id: "MV-007", code: "ENG-019", name: "Cooling-tower fill replacement", property: "Skyline Dubai", target: "Cooling towers 01–02", resource: "electricity", option: "B", status: "implemented",
    baselinePeriod: "Mar 2025 – Feb 2026", reportingPeriod: "starts 1 Jun 2026", interval: "Weekly", baselineMonthly: 24600, fit: { cvrmse: 13.1, nmbe: 0.6 },
    timeline: { baselineStart: "2025-03", baselineMonths: 12, installed: "2026-05", reportingStart: "2026-06", reportingMonths: 6 } },
  { id: "MV-008", code: "OPS-014", name: "Chiller 01 — condenser tube clean", property: "Skyline Dubai", target: "Chiller 01", resource: "electricity", option: "B", status: "awaiting-approval",
    baselinePeriod: "Apr 2025 – Mar 2026", reportingPeriod: "—", interval: "Weekly", baselineMonthly: 52800,
    timeline: { baselineStart: "2025-04", baselineMonths: 12, installed: null, reportingStart: null, reportingMonths: 0 } },
];

/** The span every measure timeline is drawn on. */
export const MV_RANGE = { start: "2023-06", end: "2026-12" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthIndex(ym: string) { const [y, m] = ym.split("-").map(Number); return y * 12 + (m - 1); }
export function ymAdd(ym: string, n: number) { const i = monthIndex(ym) + n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; }
export function monthLabel(ym: string) { const [y, m] = ym.split("-").map(Number); return `${MONTHS[m - 1]} ${String(y).slice(2)}`; }
export function monthLong(ym: string) { const [y, m] = ym.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; }

/** Dubai seasonal shape by calendar month (Jan → Dec), normalised around 1. */
const SEASON: Record<MvMeasure["resource"], number[]> = {
  electricity: [0.86, 0.82, 0.88, 0.95, 1.05, 1.12, 1.18, 1.20, 1.12, 1.02, 0.92, 0.88],
  water:       [0.92, 0.90, 0.94, 0.98, 1.02, 1.06, 1.10, 1.10, 1.06, 1.00, 0.96, 0.96],
};
/** Deterministic ±3% scatter so the measured months sit around the model, not on it. */
const jitter = (i: number) => (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.06;

/** The published lines with the derived ones: baseline-year quantity for the same months, and the raw change. */
export function sixLines(m: MvMeasure) {
  const r = m.result;
  if (!r) return null;
  const nonRoutine = r.nonRoutine.reduce((s, n) => s + n.qty, 0);
  const baselineSame = r.adjustedBaseline - r.routine.qty - nonRoutine;
  return {
    unit: r.unit, baselineSame, routine: r.routine.qty, routineVariables: r.routine.variables, nonRoutine, nonRoutineNotes: r.nonRoutine,
    adjustedBaseline: r.adjustedBaseline, reporting: r.reporting, saving: r.saving,
    rawChange: r.reporting - baselineSame, reconciliationPct: r.reconciliationPct,
  };
}

export type MvPoint = {
  ym: string; m: string;
  phase: "baseline" | "install" | "reporting" | "pending";
  measured: number | null;
  /** Fitted baseline model over the baseline months (what CV(RMSE) measures). */
  model: number | null;
  /** Adjusted baseline over the reporting months — only once a result is signed. */
  adjusted: number | null;
};

/** Monthly series behind a measure: baseline months with the fitted model, an install slot, then the reporting months. */
export function mvSeries(m: MvMeasure): MvPoint[] {
  const w = (ym: string) => SEASON[m.resource][Number(ym.split("-")[1]) - 1];
  const t = m.timeline;
  const baseMonths = Array.from({ length: t.baselineMonths }, (_, i) => ymAdd(t.baselineStart, i));
  const repMonths = t.reportingStart ? Array.from({ length: t.reportingMonths }, (_, i) => ymAdd(t.reportingStart!, i)) : [];
  const six = sixLines(m);
  const sumW = repMonths.reduce((s, ym) => s + w(ym), 0);
  const level = six && sumW ? six.baselineSame / sumW : (m.baselineMonthly ?? 0);
  const pts: MvPoint[] = baseMonths.map((ym, i) => ({
    ym, m: monthLabel(ym), phase: "baseline",
    measured: Math.round(level * w(ym) * (1 + jitter(i))), model: Math.round(level * w(ym)), adjusted: null,
  }));
  if (t.installed) pts.push({ ym: t.installed, m: "Installed", phase: "install", measured: null, model: null, adjusted: null });
  if (six) {
    const raw = repMonths.map((ym, i) => w(ym) * (1 + jitter(i + 7)));
    const sumRaw = raw.reduce((s, x) => s + x, 0);
    repMonths.forEach((ym, i) => pts.push({
      ym, m: monthLabel(ym), phase: "reporting",
      measured: Math.round((six.reporting * raw[i]) / sumRaw), model: null, adjusted: Math.round((six.adjustedBaseline * w(ym)) / sumW),
    }));
  } else {
    repMonths.forEach((ym, i) => {
      const elapsed = monthIndex(ym) <= monthIndex(TODAY_YM);
      pts.push({
        ym, m: monthLabel(ym), phase: elapsed ? "reporting" : "pending",
        measured: elapsed ? Math.round(level * w(ym) * 0.96 * (1 + jitter(i + 3))) : null, model: null, adjusted: null,
      });
    });
  }
  return pts;
}

/** Verified saving recognised per calendar month, by measure — signed L4 outputs only, one resource at a time. */
export function verifiedMonthly(resource: MvMeasure["resource"]) {
  const signed = MV_MEASURES.filter((x) => x.resource === resource && (x.status === "verified" || x.status === "reported"));
  const map = new Map<string, Record<string, number>>();
  signed.forEach((x) => mvSeries(x)
    .filter((p) => p.phase === "reporting" && p.adjusted !== null && p.measured !== null)
    .forEach((p) => { const row = map.get(p.ym) ?? {}; row[x.id] = p.adjusted! - p.measured!; map.set(p.ym, row); }));
  return [...map.entries()]
    .sort((a, b) => monthIndex(a[0]) - monthIndex(b[0]))
    .map(([ym, v]) => ({ ym, m: monthLabel(ym), ...v }));
}
