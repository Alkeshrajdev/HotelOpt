import { useState, useMemo } from "react";
import { TrendingUp, Zap, Droplets, FileCheck, AlertTriangle, ChevronRight, CheckCircle, Clock, ArrowRight, Info, X, BarChart2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SavingRecord = {
  id: string;
  name: string;
  category: "Energy" | "Water" | "Maintenance";
  sourceAlert?: string;
  property: string;
  systemAsset: string;
  baselinePeriod: string;
  postActionPeriod: string;
  baselineConsumption: string;
  postActionConsumption: string;
  normalisationMethod: string;
  verifiedSaving: string;
  costSaving: string;
  carbonSaving: string;
  confidenceLevel: "High" | "Medium" | "Low";
  evidenceStatus: "Attached" | "Partial" | "Missing";
  status: "Estimated" | "Implemented" | "Monitoring" | "Verified" | "Reported";
  implementedDate?: string;
  monitoringStartDate?: string;
  verifiedDate?: string;
  normalisationNote?: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SAVINGS: SavingRecord[] = [
  {
    id: "SAV-001",
    name: "LED Lighting Retrofit — Floors 1–10",
    category: "Energy",
    property: "Dubai Marina Hotel",
    systemAsset: "Lighting / Floors 1–10",
    baselinePeriod: "Jan–Mar 2026",
    postActionPeriod: "Apr–May 2026",
    baselineConsumption: "48,200 kWh/month",
    postActionConsumption: "31,000 kWh/month",
    normalisationMethod: "Occupancy-adjusted",
    verifiedSaving: "17,200 kWh/month",
    costSaving: "USD 2,340/month",
    carbonSaving: "7.7 tCO₂e/month",
    confidenceLevel: "High",
    evidenceStatus: "Attached",
    status: "Verified",
    implementedDate: "Mar 2026",
    monitoringStartDate: "Mar 2026",
    verifiedDate: "May 2026",
    normalisationNote: "Consumption normalised by occupied room nights. Baseline 312 rooms/night avg, post-action 308 rooms/night avg.",
  },
  {
    id: "SAV-002",
    name: "Chiller VFD Upgrade — Chiller 01",
    category: "Energy",
    property: "Dubai Marina Hotel",
    systemAsset: "Chiller 01 / HVAC",
    baselinePeriod: "Oct–Dec 2025",
    postActionPeriod: "Jan–Apr 2026",
    baselineConsumption: "68,400 kWh/month",
    postActionConsumption: "40,000 kWh/month",
    normalisationMethod: "Weather-adjusted",
    verifiedSaving: "28,400 kWh/month",
    costSaving: "USD 3,860/month",
    carbonSaving: "12.8 tCO₂e/month",
    confidenceLevel: "High",
    evidenceStatus: "Attached",
    status: "Verified",
    implementedDate: "Jan 2026",
    monitoringStartDate: "Jan 2026",
    verifiedDate: "Apr 2026",
    normalisationNote: "Consumption normalised by cooling degree days (CDD). Baseline CDD: 410/month avg; post-action CDD: 396/month avg.",
  },
  {
    id: "SAV-003",
    name: "Guestroom Thermostat Setback Program",
    category: "Energy",
    property: "Dubai Marina Hotel",
    systemAsset: "BMS / Guestroom HVAC",
    baselinePeriod: "Nov 2025–Jan 2026",
    postActionPeriod: "Feb–Apr 2026",
    baselineConsumption: "22,800 kWh/month",
    postActionConsumption: "14,800 kWh/month",
    normalisationMethod: "Occupancy-adjusted",
    verifiedSaving: "8,000 kWh/month",
    costSaving: "USD 1,740/month",
    carbonSaving: "5.8 tCO₂e/month",
    confidenceLevel: "High",
    evidenceStatus: "Attached",
    status: "Verified",
    implementedDate: "Feb 2026",
    monitoringStartDate: "Feb 2026",
    verifiedDate: "Apr 2026",
    normalisationNote: "Consumption normalised by occupied room nights. Setback triggers at 24°C when room key card is removed.",
  },
  {
    id: "SAV-004",
    name: "Low-flow Aerator Installation — Zones A+B",
    category: "Water",
    property: "Dubai Marina Hotel",
    systemAsset: "Plumbing / Zones A & B",
    baselinePeriod: "Jan–Feb 2026",
    postActionPeriod: "Mar–May 2026",
    baselineConsumption: "1,840 m³/month",
    postActionConsumption: "1,420 m³/month",
    normalisationMethod: "Simple before/after",
    verifiedSaving: "420 m³/month",
    costSaving: "USD 870/month",
    carbonSaving: "0.4 tCO₂e/month",
    confidenceLevel: "High",
    evidenceStatus: "Attached",
    status: "Verified",
    implementedDate: "Mar 2026",
    monitoringStartDate: "Mar 2026",
    verifiedDate: "May 2026",
    normalisationNote: "Direct before/after comparison. Occupancy was stable (±2%) across both periods. Use with caution — not occupancy-normalised.",
  },
  {
    id: "SAV-005",
    name: "AHU Schedule Optimisation — 4 AHUs",
    category: "Energy",
    property: "Dubai Marina Hotel",
    systemAsset: "AHU-01, 02, 03, 04 / HVAC",
    baselinePeriod: "Feb–Mar 2026",
    postActionPeriod: "Apr–May 2026",
    baselineConsumption: "31,200 kWh/month",
    postActionConsumption: "23,400 kWh/month",
    normalisationMethod: "Operating-hours adjusted",
    verifiedSaving: "~7,800 kWh/month (estimated)",
    costSaving: "USD 2,120/month (estimated)",
    carbonSaving: "—",
    confidenceLevel: "Medium",
    evidenceStatus: "Partial",
    status: "Monitoring",
    implementedDate: "Apr 2026",
    monitoringStartDate: "Apr 2026",
    normalisationNote: "Normalised by actual AHU operating hours logged in BMS. Post-action monitoring period: 90 days required.",
  },
  {
    id: "SAV-006",
    name: "Kitchen Energy Audit Implementation",
    category: "Energy",
    property: "Dubai Marina Hotel",
    systemAsset: "Kitchen Equipment / F&B",
    baselinePeriod: "Jan–Mar 2026",
    postActionPeriod: "Apr–May 2026",
    baselineConsumption: "18,600 kWh/month",
    postActionConsumption: "13,800 kWh/month",
    normalisationMethod: "F&B-cover adjusted",
    verifiedSaving: "~4,800 kWh/month (estimated)",
    costSaving: "USD 1,310/month (estimated)",
    carbonSaving: "—",
    confidenceLevel: "Medium",
    evidenceStatus: "Partial",
    status: "Monitoring",
    implementedDate: "Apr 2026",
    monitoringStartDate: "Apr 2026",
    normalisationNote: "Normalised by F&B covers served per month. Covers: baseline avg 14,200/month; post-action 13,900/month.",
  },
  {
    id: "SAV-007",
    name: "Cooling Tower Chemical Dosing Optimisation",
    category: "Water",
    property: "Dubai Marina Hotel",
    systemAsset: "Cooling Tower 01, 02 / HVAC",
    baselinePeriod: "Mar 2026",
    postActionPeriod: "Apr–May 2026",
    baselineConsumption: "320 m³/month",
    postActionConsumption: "230 m³/month",
    normalisationMethod: "Simple before/after",
    verifiedSaving: "~90 m³/month (estimated)",
    costSaving: "USD 381/month (estimated)",
    carbonSaving: "—",
    confidenceLevel: "Medium",
    evidenceStatus: "Partial",
    status: "Monitoring",
    implementedDate: "Apr 2026",
    monitoringStartDate: "Apr 2026",
    normalisationNote: "Direct before/after comparison on blowdown water consumption. More cycles of concentration = less blowdown = less water.",
  },
  {
    id: "SAV-008",
    name: "Pool/Spa Heat Pump Upgrade",
    category: "Energy",
    property: "Dubai Marina Hotel",
    systemAsset: "Pool & Spa / Plant Room",
    baselinePeriod: "Dec 2025–Feb 2026",
    postActionPeriod: "Mar 2026 onwards",
    baselineConsumption: "8,400 kWh/month",
    postActionConsumption: "6,300 kWh/month",
    normalisationMethod: "Simple before/after",
    verifiedSaving: "~2,100 kWh/month (estimated)",
    costSaving: "USD 571/month (estimated)",
    carbonSaving: "—",
    confidenceLevel: "Low",
    evidenceStatus: "Partial",
    status: "Implemented",
    implementedDate: "Mar 2026",
    normalisationNote: "Monitoring period has not yet begun. Estimated saving based on equipment specifications. Requires 60-day monitoring before verification.",
  },
  {
    id: "SAV-009",
    name: "Chiller 01 Condenser Inspection (pending)",
    category: "Energy",
    sourceAlert: "ALT-001",
    property: "Dubai Marina Hotel",
    systemAsset: "Chiller 01 / HVAC",
    baselinePeriod: "Current (Apr–May 2026)",
    postActionPeriod: "Post-repair — TBD",
    baselineConsumption: "Fault active: 420 kW load, COP 2.94",
    postActionConsumption: "Target: COP 3.5 (design)",
    normalisationMethod: "Baseline established — action in progress",
    verifiedSaving: "— (estimated post-repair)",
    costSaving: "USD 3,370/month (estimated)",
    carbonSaving: "1.8 tCO₂e/month (estimated)",
    confidenceLevel: "High",
    evidenceStatus: "Partial",
    status: "Estimated",
    normalisationNote: "Baseline consumption established during fault period. Saving will be verified after condenser inspection and 30-day post-repair monitoring.",
  },
];

// ─── Monthly Chart Data ───────────────────────────────────────────────────────

const MONTHLY_ENERGY = [
  { month: "Apr 25", verified: 80, estimated: 0 },
  { month: "May 25", verified: 85, estimated: 0 },
  { month: "Jun 25", verified: 92, estimated: 0 },
  { month: "Jul 25", verified: 110, estimated: 0 },
  { month: "Aug 25", verified: 128, estimated: 0 },
  { month: "Sep 25", verified: 124, estimated: 0 },
  { month: "Oct 25", verified: 118, estimated: 0 },
  { month: "Nov 25", verified: 108, estimated: 15 },
  { month: "Dec 25", verified: 102, estimated: 22 },
  { month: "Jan 26", verified: 140, estimated: 38 },
  { month: "Feb 26", verified: 148, estimated: 54 },
  { month: "Mar 26", verified: 152, estimated: 68 },
  { month: "Apr 26", verified: 162, estimated: 86 },
  { month: "May 26", verified: 170, estimated: 100 },
];

const MONTHLY_WATER = [
  { month: "Apr 25", verified: 0, estimated: 0 },
  { month: "May 25", verified: 0, estimated: 0 },
  { month: "Jun 25", verified: 0, estimated: 0 },
  { month: "Jul 25", verified: 0, estimated: 0 },
  { month: "Aug 25", verified: 0, estimated: 0 },
  { month: "Sep 25", verified: 0, estimated: 0 },
  { month: "Oct 25", verified: 0, estimated: 0 },
  { month: "Nov 25", verified: 0, estimated: 0 },
  { month: "Dec 25", verified: 0, estimated: 0 },
  { month: "Jan 26", verified: 0, estimated: 0 },
  { month: "Feb 26", verified: 0, estimated: 0 },
  { month: "Mar 26", verified: 350, estimated: 0 },
  { month: "Apr 26", verified: 420, estimated: 90 },
  { month: "May 26", verified: 420, estimated: 90 },
];

// ─── Helper: status badge tone ────────────────────────────────────────────────

function statusTone(status: SavingRecord["status"]): "neutral" | "info" | "warn" | "good" | "brand" {
  switch (status) {
    case "Estimated":
      return "neutral";
    case "Implemented":
      return "info";
    case "Monitoring":
      return "warn";
    case "Verified":
      return "good";
    case "Reported":
      return "brand";
    default:
      return "neutral";
  }
}

function confidenceTone(level: SavingRecord["confidenceLevel"]): "good" | "warn" | "bad" {
  switch (level) {
    case "High":
      return "good";
    case "Medium":
      return "warn";
    case "Low":
      return "bad";
    default:
      return "neutral" as never;
  }
}

function evidenceTone(ev: SavingRecord["evidenceStatus"]): "good" | "warn" | "bad" {
  switch (ev) {
    case "Attached":
      return "good";
    case "Partial":
      return "warn";
    case "Missing":
      return "bad";
    default:
      return "neutral" as never;
  }
}

// ─── Savings Detail Modal ─────────────────────────────────────────────────────

function SavingsDetailModal({ saving, open, onClose }: { saving: SavingRecord | null; open: boolean; onClose: () => void }) {
  if (!saving) return null;

  const baselineNum = parseFloat(saving.baselineConsumption.replace(/[^0-9.]/g, "")) || 100;
  const postNum = parseFloat(saving.postActionConsumption.replace(/[^0-9.]/g, "")) || 80;
  const maxBar = Math.max(baselineNum, postNum);
  const baselineWidth = (baselineNum / maxBar) * 100;
  const postWidth = (postNum / maxBar) * 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={saving.name}
      subtitle={`${saving.category} Saving · ${saving.property}`}
      size="xl"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status timeline */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Verification Timeline</h4>
          <div className="flex items-center gap-2">
            {(["Estimated", "Implemented", "Monitoring", "Verified", "Reported"] as SavingRecord["status"][]).map((step, i, arr) => {
              const steps = ["Estimated", "Implemented", "Monitoring", "Verified", "Reported"] as const;
              const currentIdx = steps.indexOf(saving.status);
              const stepIdx = steps.indexOf(step);
              const isReached = stepIdx <= currentIdx;
              const isCurrent = step === saving.status;
              const dateMap: Record<string, string | undefined> = {
                Implemented: saving.implementedDate,
                Monitoring: saving.monitoringStartDate,
                Verified: saving.verifiedDate,
              };
              return (
                <div key={step} className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2",
                      isCurrent ? "bg-blue-600 text-white ring-blue-200" :
                      isReached ? "bg-green-500 text-white ring-green-100" :
                      "bg-slate-100 text-slate-400 ring-slate-100"
                    )}>
                      {isReached && !isCurrent ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 text-center leading-tight">{step}</div>
                    {dateMap[step] && (
                      <div className="text-[9px] text-slate-400 text-center">{dateMap[step]}</div>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mb-4", isReached && stepIdx < currentIdx ? "bg-green-400" : "bg-slate-200")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Identity */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Saving Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Record ID", value: saving.id },
              { label: "Category", value: saving.category },
              { label: "System / Asset", value: saving.systemAsset },
              { label: "Baseline Period", value: saving.baselinePeriod },
              { label: "Post-Action Period", value: saving.postActionPeriod },
              { label: "Normalisation Method", value: saving.normalisationMethod },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 mb-1">{label}</div>
                <div className="text-sm font-medium text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Baseline vs post-action chart */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Baseline vs Post-Action Consumption</h4>
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Baseline ({saving.baselinePeriod})</span>
                <span className="font-medium text-slate-700">{saving.baselineConsumption}</span>
              </div>
              <div className="h-6 bg-slate-200 rounded-md overflow-hidden">
                <div className="h-full bg-red-400 rounded-md" style={{ width: `${baselineWidth}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Post-Action ({saving.postActionPeriod})</span>
                <span className="font-medium text-slate-700">{saving.postActionConsumption}</span>
              </div>
              <div className="h-6 bg-slate-200 rounded-md overflow-hidden">
                <div className="h-full bg-green-500 rounded-md" style={{ width: `${postWidth}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Verified Saving</span>
                <span className="font-bold text-green-700">{saving.verifiedSaving}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Carbon */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Financial & Carbon Impact</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="text-xs text-green-600 mb-1">Cost Saving</div>
              <div className="text-lg font-bold text-green-800">{saving.costSaving}</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="text-xs text-blue-600 mb-1">Carbon Saving</div>
              <div className="text-lg font-bold text-blue-800">{saving.carbonSaving || "—"}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">Confidence Level</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge tone={confidenceTone(saving.confidenceLevel)}>{saving.confidenceLevel}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Normalisation method explanation */}
        {saving.normalisationNote && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Normalisation Method</h4>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{saving.normalisationNote}</p>
            </div>
          </div>
        )}

        {/* Evidence */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Evidence Documents</h4>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-slate-50">
              <span className="text-sm text-slate-600">Evidence status</span>
              <Badge tone={evidenceTone(saving.evidenceStatus)}>{saving.evidenceStatus}</Badge>
            </div>
            {saving.evidenceStatus === "Attached" ? (
              <div className="divide-y divide-slate-100">
                <div className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700">Meter data export (baseline period)</span>
                  <button className="text-xs text-blue-700 hover:underline">View</button>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700">Meter data export (post-action period)</span>
                  <button className="text-xs text-blue-700 hover:underline">View</button>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-700">Verification sign-off — Sustainability Team</span>
                  <button className="text-xs text-blue-700 hover:underline">View</button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500">
                {saving.evidenceStatus === "Partial"
                  ? "Some evidence documents attached. Full evidence set required before verification."
                  : "No evidence documents attached. Evidence required before verification can proceed."}
              </div>
            )}
          </div>
        </div>

        {/* Source alert link */}
        {saving.sourceAlert && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-amber-800">Created from fault alert: <span className="font-mono font-semibold">{saving.sourceAlert}</span></span>
            <button className="text-xs text-amber-700 hover:underline flex items-center gap-1">
              View alert <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Normalisation Info Card ──────────────────────────────────────────────────

function NormalisationInfoCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-slate-700">Normalisation Methods Explained</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
          {[
            {
              method: "Occupancy-adjusted",
              description: "Consumption normalised by occupied room nights. Best for guestroom and lighting systems where occupancy is the primary driver.",
            },
            {
              method: "Weather-adjusted",
              description: "Consumption normalised by cooling degree days (CDD). Used for HVAC and chiller systems where ambient temperature drives load.",
            },
            {
              method: "Operating-hours adjusted",
              description: "Normalised by actual equipment operating hours logged in BMS. Suitable for AHUs and ventilation systems.",
            },
            {
              method: "Simple before/after",
              description: "Direct comparison of pre- and post-action consumption. Use with caution — not adjusted for occupancy or weather. Only suitable when conditions are stable.",
            },
            {
              method: "F&B-cover adjusted",
              description: "Normalised by F&B covers served per month. Used for kitchen and restaurant energy measurements.",
            },
            {
              method: "IPMVP Option A / B",
              description: "Coming in Phase 2. Industry-standard M&V protocols for rigorous savings verification in large capital projects.",
            },
          ].map(({ method, description }) => (
            <div key={method} className="p-3 bg-slate-50 rounded-lg">
              <div className="text-sm font-semibold text-slate-700 mb-1">{method}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Savings Table ────────────────────────────────────────────────────────────

function SavingsTable({ records }: { records: SavingRecord[] }) {
  const [selectedSaving, setSelectedSaving] = useState<SavingRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function openSaving(saving: SavingRecord) {
    setSelectedSaving(saving);
    setModalOpen(true);
  }

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Saving Name</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">System / Asset</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Baseline</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Post-Action</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Verified Saving</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Cost Saving</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Carbon</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Confidence</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Evidence</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((saving) => (
                <tr key={saving.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 max-w-52">{saving.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{saving.id}</div>
                    {saving.sourceAlert && (
                      <div className="text-xs text-amber-600 mt-0.5">← {saving.sourceAlert}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-medium",
                      saving.category === "Energy" ? "text-amber-700" :
                      saving.category === "Water" ? "text-blue-700" :
                      "text-green-700"
                    )}>
                      {saving.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-32">{saving.systemAsset}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(saving.status)}>{saving.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-28">{saving.baselineConsumption}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-28">{saving.postActionConsumption}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 text-xs">{saving.verifiedSaving}</td>
                  <td className="px-4 py-3">
                    {saving.status === "Verified" || saving.status === "Reported" ? (
                      <span className="text-green-700 font-semibold text-xs">{saving.costSaving}</span>
                    ) : (
                      <span className="text-amber-700 text-xs">{saving.costSaving}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{saving.carbonSaving || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={confidenceTone(saving.confidenceLevel)}>{saving.confidenceLevel}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={evidenceTone(saving.evidenceStatus)}>{saving.evidenceStatus}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openSaving(saving)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No savings records for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          {records.length} record{records.length !== 1 ? "s" : ""}
        </div>
      </Card>

      <SavingsDetailModal
        saving={selectedSaving}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

// ─── Dual Bar Chart (Tailwind divs) ───────────────────────────────────────────

function DualBarChart({ data, leftLabel, leftColour, rightLabel, rightColour, unit }: {
  data: { month: string; verified: number; estimated: number }[];
  leftLabel: string;
  leftColour: string;
  rightLabel: string;
  rightColour: string;
  unit: string;
}) {
  const maxVal = Math.max(...data.flatMap((d) => [d.verified, d.estimated]), 1);

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col justify-end gap-0.5 group">
            <div className="flex items-end gap-0.5 h-28">
              <div
                className={cn("flex-1 rounded-t min-h-0", leftColour)}
                style={{ height: `${(d.verified / maxVal) * 100}%` }}
                title={`${d.month} verified: ${d.verified} ${unit}`}
              />
              <div
                className={cn("flex-1 rounded-t min-h-0", rightColour)}
                style={{ height: `${(d.estimated / maxVal) * 100}%` }}
                title={`${d.month} estimated: ${d.estimated} ${unit}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 mt-1">
        {data.map((d) => (
          <div key={d.month} className="flex-1 text-center text-[9px] text-slate-400 truncate">
            {d.month.includes("26") || d.month.includes("25") ? d.month.slice(0, 3) : ""}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className={cn("w-3 h-3 rounded-sm inline-block", leftColour)} />
          {leftLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("w-3 h-3 rounded-sm inline-block", rightColour)} />
          {rightLabel}
        </span>
        <span className="ml-auto text-slate-400">Values in {unit}</span>
      </div>
    </div>
  );
}

// ─── Savings Pipeline Strip ───────────────────────────────────────────────────

function SavingsPipelineStrip() {
  const pipelineSteps: { label: string; status: SavingRecord["status"]; count: number; colour: string }[] = [
    { label: "Estimated", status: "Estimated", count: SAVINGS.filter((s) => s.status === "Estimated").length, colour: "bg-slate-400" },
    { label: "Implemented", status: "Implemented", count: SAVINGS.filter((s) => s.status === "Implemented").length, colour: "bg-blue-400" },
    { label: "Monitoring", status: "Monitoring", count: SAVINGS.filter((s) => s.status === "Monitoring").length, colour: "bg-amber-400" },
    { label: "Verified", status: "Verified", count: SAVINGS.filter((s) => s.status === "Verified").length, colour: "bg-green-500" },
    { label: "Reported", status: "Reported", count: SAVINGS.filter((s) => s.status === "Reported").length, colour: "bg-blue-600" },
  ];

  return (
    <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-slate-200">
      {pipelineSteps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 min-w-0">
          <div className="flex-1 p-4 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", step.colour)} />
              <span className="text-xs text-slate-500 font-medium">{step.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{step.count}</div>
            <div className="text-xs text-slate-400 mt-0.5">saving{step.count !== 1 ? "s" : ""}</div>
          </div>
          {i < pipelineSteps.length - 1 && (
            <div className="flex items-center px-1 bg-white">
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab: All Savings ─────────────────────────────────────────────────────────

function AllSavingsTab() {
  return (
    <div className="space-y-6">
      <SavingsPipelineStrip />
      <NormalisationInfoCard />
      <SavingsTable records={SAVINGS} />
    </div>
  );
}

// ─── Tab: Energy Savings ──────────────────────────────────────────────────────

function EnergySavingsTab() {
  const energyRecords = SAVINGS.filter((s) => s.category === "Energy");

  return (
    <div className="space-y-6">
      {/* Energy summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiTile
          icon={<Zap className="w-5 h-5" />}
          iconBg="bg-amber-50"
          label="Verified Energy YTD"
          value="1,840"
          unit="MWh"
          caption="Jan–May 2026"
        />
        <KpiTile
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-green-50"
          label="Verified Cost Saving"
          value="USD 44,830"
          caption="Energy savings YTD"
        />
        <KpiTile
          icon={<BarChart2 className="w-5 h-5" />}
          iconBg="bg-blue-50"
          label="Carbon Avoided"
          value="82.4"
          unit="tCO₂e"
          caption="YTD verified"
        />
      </div>

      {/* Chart */}
      <Card>
        <div className="p-4">
          <div className="text-sm font-semibold text-slate-700 mb-1">Monthly Energy Savings — Verified vs Estimated</div>
          <div className="text-xs text-slate-400 mb-4">Apr 2025 – May 2026 · Values in MWh</div>
          <DualBarChart
            data={MONTHLY_ENERGY}
            leftLabel="Verified savings"
            leftColour="bg-blue-500"
            rightLabel="Estimated savings"
            rightColour="bg-amber-400"
            unit="MWh"
          />
        </div>
      </Card>

      <SavingsTable records={energyRecords} />
    </div>
  );
}

// ─── Tab: Water Savings ───────────────────────────────────────────────────────

function WaterSavingsTab() {
  const waterRecords = SAVINGS.filter((s) => s.category === "Water");

  return (
    <div className="space-y-6">
      {/* Water summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiTile
          icon={<Droplets className="w-5 h-5" />}
          iconBg="bg-blue-50"
          label="Verified Water YTD"
          value="4,200"
          unit="m³"
          caption="Jan–May 2026"
        />
        <KpiTile
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-green-50"
          label="Verified Cost Saving"
          value="USD 4,790"
          caption="Water savings YTD"
        />
        <KpiTile
          icon={<BarChart2 className="w-5 h-5" />}
          iconBg="bg-teal-50"
          label="Equivalent CO₂ Avoided"
          value="1.2"
          unit="tCO₂e"
          caption="Water treatment & pumping"
        />
      </div>

      {/* Chart */}
      <Card>
        <div className="p-4">
          <div className="text-sm font-semibold text-slate-700 mb-1">Monthly Water Savings Trend</div>
          <div className="text-xs text-slate-400 mb-4">Apr 2025 – May 2026 · Values in m³</div>
          <DualBarChart
            data={MONTHLY_WATER}
            leftLabel="Verified savings"
            leftColour="bg-blue-500"
            rightLabel="Estimated savings"
            rightColour="bg-amber-400"
            unit="m³"
          />
        </div>
      </Card>

      <SavingsTable records={waterRecords} />
    </div>
  );
}

// ─── Tab: Reporting Status ────────────────────────────────────────────────────

const REPORTING_CATEGORIES = [
  {
    status: "Verified",
    label: "Verified Savings",
    tone: "good" as const,
    reportReady: "Yes",
    frameworks: "GHG Inventory, Sustainability Report, LEED O+M, Green Key",
    notes: "Eligible for use in official sustainability reports and GHG inventory reductions section.",
    colour: "bg-green-50 border-green-200",
    headerColour: "text-green-800 bg-green-100",
  },
  {
    status: "Monitoring",
    label: "Monitoring Savings",
    tone: "warn" as const,
    reportReady: "No",
    frameworks: "Not eligible",
    notes: "Pending verification period. Cannot be included in official reporting until monitoring is complete and data is approved.",
    colour: "bg-amber-50 border-amber-200",
    headerColour: "text-amber-800 bg-amber-100",
  },
  {
    status: "Estimated",
    label: "Estimated Savings",
    tone: "neutral" as const,
    reportReady: "No",
    frameworks: "Not eligible",
    notes: "For internal operational decision-support only. Must not be presented as achieved reductions in any external reporting.",
    colour: "bg-slate-50 border-slate-200",
    headerColour: "text-slate-700 bg-slate-100",
  },
  {
    status: "Reported",
    label: "Reported Savings",
    tone: "brand" as const,
    reportReady: "Yes — Already reported",
    frameworks: "Included in period sustainability reports",
    notes: "Already included in sustainability reports and/or GHG inventory for the applicable period.",
    colour: "bg-blue-50 border-blue-200",
    headerColour: "text-blue-800 bg-blue-100",
  },
];

function ReportingStatusTab() {
  const verifiedRecords = SAVINGS.filter((s) => s.status === "Verified");
  const monitoringRecords = SAVINGS.filter((s) => s.status === "Monitoring");
  const estimatedRecords = SAVINGS.filter((s) => s.status === "Estimated");
  const implementedRecords = SAVINGS.filter((s) => s.status === "Implemented");

  const countByStatus: Record<string, SavingRecord[]> = {
    Verified: verifiedRecords,
    Monitoring: monitoringRecords,
    Estimated: [...estimatedRecords, ...implementedRecords],
    Reported: [],
  };

  return (
    <div className="space-y-6">
      {/* Framework eligibility cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTING_CATEGORIES.map((cat) => {
          const records = countByStatus[cat.status] ?? [];
          return (
            <div key={cat.status} className={cn("rounded-xl border p-5 space-y-3", cat.colour)}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{cat.label}</h3>
                <Badge tone={cat.tone}>{records.length} saving{records.length !== 1 ? "s" : ""}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-500 w-28 flex-shrink-0 pt-0.5">Report-ready:</span>
                  <span className={cn("text-xs font-medium", cat.reportReady.startsWith("Yes") ? "text-green-700" : "text-slate-600")}>
                    {cat.reportReady}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-500 w-28 flex-shrink-0 pt-0.5">Frameworks:</span>
                  <span className="text-xs text-slate-600">{cat.frameworks}</span>
                </div>
              </div>
              <div className="p-3 bg-white bg-opacity-60 rounded-lg">
                <p className="text-xs text-slate-600 leading-relaxed">{cat.notes}</p>
              </div>
              {records.length > 0 && (
                <div className="space-y-1">
                  {records.slice(0, 4).map((r) => (
                    <div key={r.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      {r.name}
                    </div>
                  ))}
                  {records.length > 4 && (
                    <div className="text-xs text-slate-400 pl-4">+{records.length - 4} more</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reporting status full table */}
      <Card>
        <div className="p-4 border-b border-slate-100">
          <div className="text-sm font-semibold text-slate-700">Reporting Eligibility Summary</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Saving</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Report-Ready</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Framework Eligibility</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SAVINGS.map((saving) => {
                const catInfo = REPORTING_CATEGORIES.find((c) => c.status === saving.status) ?? REPORTING_CATEGORIES[2];
                return (
                  <tr key={saving.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-xs max-w-52">{saving.name}</div>
                      <div className="text-[11px] text-slate-400">{saving.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(saving.status)}>{saving.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs font-medium",
                        saving.status === "Verified" || saving.status === "Reported"
                          ? "text-green-700"
                          : "text-slate-500"
                      )}>
                        {saving.status === "Verified" || saving.status === "Reported" ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {saving.status === "Verified" || saving.status === "Reported"
                        ? "GHG Inventory, Sustainability Report"
                        : "Not eligible"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-52">
                      {saving.status === "Verified"
                        ? "Ready for reporting. Include in next sustainability report."
                        : saving.status === "Monitoring"
                        ? "Monitoring period in progress. Re-evaluate in 30–60 days."
                        : saving.status === "Estimated"
                        ? "Action in progress. Monitoring period required."
                        : saving.status === "Implemented"
                        ? "Monitoring not yet started. Allow 30–60 days post-implementation."
                        : "Already included in period report."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Key reporting disclaimer */}
      <div className="p-5 bg-amber-50 border border-amber-300 rounded-xl">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">Reporting Eligibility Rule</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              Only <strong>Verified</strong> savings — where post-implementation data has been reviewed and approved — are eligible for inclusion in GHG inventory, sustainability reports, and certification applications. Estimated and monitoring-phase savings must not be presented as achieved reductions in any external report or disclosure.
            </p>
          </div>
        </div>
      </div>

      {/* Link to Reports module */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-blue-600" />
          <div>
            <div className="text-sm font-semibold text-blue-900">Ready to include verified savings in a report?</div>
            <div className="text-xs text-blue-600 mt-0.5">Navigate to the Reports module to build your sustainability report.</div>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Go to Reports <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Tabs Config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "all", label: "All Savings", icon: TrendingUp },
  { id: "energy", label: "Energy", icon: Zap },
  { id: "water", label: "Water", icon: Droplets },
  { id: "reporting", label: "Reporting Status", icon: FileCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SavingsVerification() {
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const verifiedCount = SAVINGS.filter((s) => s.status === "Verified" || s.status === "Reported").length;
  const monitoringCount = SAVINGS.filter((s) => s.status === "Monitoring").length;
  const implementedCount = SAVINGS.filter((s) => s.status === "Implemented").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        <PageHeader
          eyebrow="Smart Operations · Savings"
          title="Savings Verification"
          subtitle="Track, verify, and report operational savings from energy, water, and maintenance actions"
        />

        {/* Amber disclaimer — always visible */}
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Important:</strong> Estimated savings are for decision support only. Savings are counted as verified reductions only after post-implementation data is reviewed and approved. <strong>Verified savings are the only values eligible for use in official sustainability reporting.</strong>
          </p>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            iconBg="bg-green-50"
            label="Verified Savings YTD"
            value="USD 49,610"
            caption="94.2 tCO₂e · 1,840 MWh"
            prominent
          />
          <KpiTile
            icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-50"
            label="Estimated (not yet verified)"
            value="USD 42,650"
            caption="Pending verification"
          />
          <KpiTile
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="In Monitoring Phase"
            value="USD 13,110"
            caption={`${monitoringCount} savings being monitored`}
          />
          <KpiTile
            icon={<Zap className="w-5 h-5 text-slate-600" />}
            iconBg="bg-slate-100"
            label="Actions Under Implementation"
            value={String(implementedCount + monitoringCount)}
            caption={`${verifiedCount} savings verified YTD`}
          />
        </div>

        {/* Tab navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "all" && <AllSavingsTab />}
          {activeTab === "energy" && <EnergySavingsTab />}
          {activeTab === "water" && <WaterSavingsTab />}
          {activeTab === "reporting" && <ReportingStatusTab />}
        </div>
      </div>
    </div>
  );
}
