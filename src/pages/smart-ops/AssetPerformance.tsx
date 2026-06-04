import { useState, useMemo } from "react";
import { Wrench, AlertTriangle, Activity, FileText, Database, ChevronRight, Search, Filter, X, CheckCircle, Clock, Zap, Thermometer, Droplets, Sun, Car, Waves } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Asset = {
  id: string;
  name: string;
  type: string;
  system: string;
  location: string;
  building: string;
  manufacturer: string;
  model: string;
  capacity: string;
  installedDate: string;
  linkedMeters: number;
  linkedSensors: number;
  maintenanceOwner: string;
  status: "Running" | "Standby" | "Offline" | "Under Maintenance" | "Fault" | "Generating" | "Active";
  health: "Good" | "Warning" | "Poor" | "Critical";
  activeAlerts: number;
  lastInspection: string;
  nextPM: string;
  estimatedLoss?: string;
};

type FaultRecord = {
  id: string;
  asset: string;
  faultType: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  detected: string;
  duration: string;
  efficiencyImpact: string;
  estimatedLoss: string;
  status: "Active" | "Assigned" | "New";
};

type MaintenanceAction = {
  id: string;
  asset: string;
  type: "Corrective" | "Investigative" | "PM";
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Suggested" | "Approved" | "Assigned" | "In Progress" | "Completed" | "Under Monitoring" | "Verified" | "Closed";
  assignedTo: string;
  dueDate: string;
  estimatedSaving: string;
  createdFrom: string;
};

type AssetDocument = {
  asset: string;
  document: string;
  type: string;
  uploaded: string;
  uploadedBy: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ASSETS: Asset[] = [
  {
    id: "AST-001",
    name: "Chiller 01",
    type: "HVAC-Chiller",
    system: "HVAC",
    location: "Basement Plant Room",
    building: "Main Tower",
    manufacturer: "Trane",
    model: "RTHD 500TR",
    capacity: "500 TR cooling",
    installedDate: "Aug 2019",
    linkedMeters: 3,
    linkedSensors: 6,
    maintenanceOwner: "HVAC Team",
    status: "Running",
    health: "Poor",
    activeAlerts: 2,
    lastInspection: "Apr 2026",
    nextPM: "7 May 2026",
    estimatedLoss: "AED 12,400/month",
  },
  {
    id: "AST-002",
    name: "Chiller 02",
    type: "HVAC-Chiller",
    system: "HVAC",
    location: "Basement Plant Room",
    building: "Main Tower",
    manufacturer: "Carrier",
    model: "19XR 420TR",
    capacity: "420 TR cooling",
    installedDate: "Aug 2019",
    linkedMeters: 3,
    linkedSensors: 5,
    maintenanceOwner: "HVAC Team",
    status: "Running",
    health: "Warning",
    activeAlerts: 1,
    lastInspection: "Mar 2026",
    nextPM: "10 May 2026",
    estimatedLoss: "AED 6,800/month",
  },
  {
    id: "AST-003",
    name: "Cooling Tower 01",
    type: "HVAC-Cooling",
    system: "HVAC",
    location: "Roof Level",
    building: "Main Tower",
    manufacturer: "Baltimore Aircoil",
    model: "BAC VXT-420",
    capacity: "420 TR rejection",
    installedDate: "Sep 2019",
    linkedMeters: 1,
    linkedSensors: 4,
    maintenanceOwner: "HVAC Team",
    status: "Running",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Feb 2026",
    nextPM: "2 Jun 2026",
  },
  {
    id: "AST-004",
    name: "Cooling Tower 02",
    type: "HVAC-Cooling",
    system: "HVAC",
    location: "Roof Level",
    building: "Main Tower",
    manufacturer: "Baltimore Aircoil",
    model: "BAC VXT-420",
    capacity: "420 TR rejection",
    installedDate: "Sep 2019",
    linkedMeters: 1,
    linkedSensors: 4,
    maintenanceOwner: "HVAC Team",
    status: "Running",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Feb 2026",
    nextPM: "2 Jun 2026",
  },
  {
    id: "AST-005",
    name: "AHU-01",
    type: "HVAC-AHU",
    system: "HVAC",
    location: "Floor Plant 01",
    building: "Main Tower",
    manufacturer: "Carrier",
    model: "39CC 36,000 m³/h",
    capacity: "36,000 m³/h",
    installedDate: "Oct 2019",
    linkedMeters: 2,
    linkedSensors: 8,
    maintenanceOwner: "HVAC Team",
    status: "Running",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Mar 2026",
    nextPM: "12 May 2026",
  },
  {
    id: "AST-006",
    name: "AHU-05",
    type: "HVAC-AHU",
    system: "HVAC",
    location: "Floor Plant 02",
    building: "Main Tower",
    manufacturer: "Carrier",
    model: "39CC 28,000 m³/h",
    capacity: "28,000 m³/h",
    installedDate: "Oct 2019",
    linkedMeters: 2,
    linkedSensors: 7,
    maintenanceOwner: "HVAC Team",
    status: "Running",
    health: "Warning",
    activeAlerts: 1,
    lastInspection: "Mar 2026",
    nextPM: "8 May 2026",
    estimatedLoss: "AED 3,200/month",
  },
  {
    id: "AST-007",
    name: "Primary CHW Pump P-01",
    type: "HVAC-Pumps",
    system: "HVAC",
    location: "Basement Plant Room",
    building: "Main Tower",
    manufacturer: "Grundfos",
    model: "NBS 125-250",
    capacity: "90 kW, 450 m³/h",
    installedDate: "Aug 2019",
    linkedMeters: 1,
    linkedSensors: 3,
    maintenanceOwner: "HVAC Team",
    status: "Running",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Jan 2026",
    nextPM: "1 Jun 2026",
  },
  {
    id: "AST-008",
    name: "Primary CHW Pump P-02",
    type: "HVAC-Pumps",
    system: "HVAC",
    location: "Basement Plant Room",
    building: "Main Tower",
    manufacturer: "Grundfos",
    model: "NBS 125-250",
    capacity: "90 kW, 450 m³/h",
    installedDate: "Aug 2019",
    linkedMeters: 1,
    linkedSensors: 3,
    maintenanceOwner: "HVAC Team",
    status: "Standby",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Jan 2026",
    nextPM: "1 Jun 2026",
  },
  {
    id: "AST-009",
    name: "Kitchen Equipment Block",
    type: "F&B Equipment",
    system: "F&B",
    location: "Main Kitchen",
    building: "Ground Floor",
    manufacturer: "Various",
    model: "Mixed Fleet",
    capacity: "220 kW total installed",
    installedDate: "Oct 2019",
    linkedMeters: 2,
    linkedSensors: 2,
    maintenanceOwner: "F&B Manager",
    status: "Running",
    health: "Warning",
    activeAlerts: 1,
    lastInspection: "Feb 2026",
    nextPM: "10 May 2026",
    estimatedLoss: "AED 4,800/month",
  },
  {
    id: "AST-010",
    name: "Laundry System",
    type: "Laundry",
    system: "Laundry",
    location: "Basement",
    building: "Main Tower",
    manufacturer: "Miele",
    model: "PWM 916",
    capacity: "16 kg/cycle, 8 machines",
    installedDate: "Nov 2019",
    linkedMeters: 2,
    linkedSensors: 2,
    maintenanceOwner: "FM Team",
    status: "Running",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Jan 2026",
    nextPM: "15 Jun 2026",
  },
  {
    id: "AST-011",
    name: "Solar Inverter SMA 100kW",
    type: "Renewables",
    system: "Renewables",
    location: "Roof Level",
    building: "Main Tower",
    manufacturer: "SMA",
    model: "Sunny Tripower 100",
    capacity: "100 kWp AC output",
    installedDate: "Mar 2023",
    linkedMeters: 1,
    linkedSensors: 4,
    maintenanceOwner: "Facilities",
    status: "Generating",
    health: "Warning",
    activeAlerts: 1,
    lastInspection: "Apr 2026",
    nextPM: "9 May 2026",
    estimatedLoss: "AED 420/month",
  },
  {
    id: "AST-012",
    name: "EV Charger Array",
    type: "EV",
    system: "EV",
    location: "Car Park Level 1",
    building: "Car Park",
    manufacturer: "ChargePoint",
    model: "CT4000 x4",
    capacity: "7.2 kW per port, 4 units",
    installedDate: "Jun 2022",
    linkedMeters: 1,
    linkedSensors: 0,
    maintenanceOwner: "FM Team",
    status: "Active",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Feb 2026",
    nextPM: "30 Jun 2026",
  },
  {
    id: "AST-013",
    name: "Domestic Water Pump DW-01",
    type: "Water",
    system: "Water",
    location: "Basement",
    building: "Main Tower",
    manufacturer: "Grundfos",
    model: "CM 10-4",
    capacity: "15 kW, 40 m³/h",
    installedDate: "Aug 2019",
    linkedMeters: 1,
    linkedSensors: 2,
    maintenanceOwner: "Plumbing Team",
    status: "Running",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Jan 2026",
    nextPM: "1 Jul 2026",
  },
  {
    id: "AST-014",
    name: "STP System",
    type: "Water/Waste",
    system: "Water",
    location: "Basement",
    building: "Main Tower",
    manufacturer: "Veolia",
    model: "BioMax 50m³/d",
    capacity: "50 m³/day treatment",
    installedDate: "Aug 2019",
    linkedMeters: 1,
    linkedSensors: 3,
    maintenanceOwner: "FM Team",
    status: "Running",
    health: "Good",
    activeAlerts: 0,
    lastInspection: "Mar 2026",
    nextPM: "1 Jun 2026",
  },
];

const FAULTS: FaultRecord[] = [
  {
    id: "ALT-001",
    asset: "Chiller 01",
    faultType: "COP degradation — 22% below baseline",
    severity: "Critical",
    detected: "8 days ago",
    duration: "8 days ongoing",
    efficiencyImpact: "–22% efficiency",
    estimatedLoss: "AED 12,400/month",
    status: "Active",
  },
  {
    id: "ALT-002",
    asset: "Chiller 01",
    faultType: "Condenser water temp high",
    severity: "Medium",
    detected: "8 days ago",
    duration: "8 days ongoing",
    efficiencyImpact: "Contributes to COP loss",
    estimatedLoss: "—",
    status: "Active",
  },
  {
    id: "ALT-003",
    asset: "AHU-05",
    faultType: "Running outside operational schedule",
    severity: "High",
    detected: "3 days ago",
    duration: "3 days ongoing",
    efficiencyImpact: "+18% runtime energy",
    estimatedLoss: "AED 3,200/month",
    status: "Active",
  },
  {
    id: "ALT-004",
    asset: "Kitchen Equipment Block",
    faultType: "Energy 38% above F&B benchmark",
    severity: "Medium",
    detected: "14 days ago",
    duration: "14 days ongoing",
    efficiencyImpact: "Overconsumption",
    estimatedLoss: "AED 4,800/month",
    status: "Active",
  },
  {
    id: "ALT-005",
    asset: "Solar Inverter SMA 100kW",
    faultType: "Performance ratio 4% below target",
    severity: "Medium",
    detected: "5 days ago",
    duration: "5 days ongoing",
    efficiencyImpact: "–840 kWh/month",
    estimatedLoss: "AED 420/month",
    status: "Active",
  },
  {
    id: "ALT-006",
    asset: "Chiller 02",
    faultType: "Runtime 18 hrs/day vs target 12 hrs",
    severity: "High",
    detected: "7 days ago",
    duration: "7 days ongoing",
    efficiencyImpact: "+50% runtime",
    estimatedLoss: "AED 6,800/month",
    status: "Active",
  },
  {
    id: "ALT-007",
    asset: "Domestic AHU Filter Bank",
    faultType: "High pressure drop across AHU filters",
    severity: "Medium",
    detected: "2 days ago",
    duration: "2 days ongoing",
    efficiencyImpact: "Fan energy +12%",
    estimatedLoss: "AED 880/month",
    status: "Assigned",
  },
  {
    id: "ALT-008",
    asset: "Cooling Tower 01",
    faultType: "Spray nozzle blockage detected",
    severity: "Low",
    detected: "1 day ago",
    duration: "1 day ongoing",
    efficiencyImpact: "Minor efficiency reduction",
    estimatedLoss: "AED 320/month",
    status: "New",
  },
];

const MAINTENANCE_ACTIONS: MaintenanceAction[] = [
  {
    id: "MA-001",
    asset: "Chiller 01",
    type: "Corrective",
    description: "Inspect condenser water circuit and cooling tower",
    priority: "Critical",
    status: "In Progress",
    assignedTo: "HVAC Team",
    dueDate: "7 May 2026",
    estimatedSaving: "AED 12,400/month",
    createdFrom: "Alert ALT-001",
  },
  {
    id: "MA-002",
    asset: "AHU-05",
    type: "Corrective",
    description: "Adjust AHU-05 schedule — reduce to 14 hr/day",
    priority: "High",
    status: "Assigned",
    assignedTo: "BMS Team",
    dueDate: "8 May 2026",
    estimatedSaving: "AED 3,200/month",
    createdFrom: "Alert ALT-003",
  },
  {
    id: "MA-003",
    asset: "Kitchen Equipment Block",
    type: "Investigative",
    description: "Audit kitchen equipment operation hours vs service schedule",
    priority: "Medium",
    status: "Suggested",
    assignedTo: "F&B Manager",
    dueDate: "10 May 2026",
    estimatedSaving: "AED 4,800/month",
    createdFrom: "Alert ALT-004",
  },
  {
    id: "MA-004",
    asset: "Solar Inverter SMA 100kW",
    type: "Corrective",
    description: "Clean PV panels — check shading and inverter logs",
    priority: "Medium",
    status: "Approved",
    assignedTo: "Facilities",
    dueDate: "9 May 2026",
    estimatedSaving: "AED 420/month",
    createdFrom: "Alert ALT-005",
  },
  {
    id: "MA-005",
    asset: "AHU Filter Bank",
    type: "PM",
    description: "Replace AHU filters — pressure drop above threshold",
    priority: "Medium",
    status: "Assigned",
    assignedTo: "HVAC Team",
    dueDate: "12 May 2026",
    estimatedSaving: "AED 880/month",
    createdFrom: "Alert ALT-007",
  },
  {
    id: "MA-006",
    asset: "Cooling Tower 01",
    type: "PM",
    description: "Clean spray nozzles and check distribution",
    priority: "Low",
    status: "In Progress",
    assignedTo: "Facilities",
    dueDate: "6 May 2026",
    estimatedSaving: "AED 320/month",
    createdFrom: "Alert ALT-008",
  },
  {
    id: "MA-007",
    asset: "Chiller 02",
    type: "Investigative",
    description: "Review chiller sequencing logic",
    priority: "High",
    status: "Suggested",
    assignedTo: "BMS Team",
    dueDate: "10 May 2026",
    estimatedSaving: "AED 6,800/month",
    createdFrom: "Alert ALT-006",
  },
  {
    id: "MA-008",
    asset: "Domestic WC Zone 3",
    type: "Corrective",
    description: "Inspect pipework for continuous night flow",
    priority: "Critical",
    status: "In Progress",
    assignedTo: "Plumbing Team",
    dueDate: "6 May 2026",
    estimatedSaving: "—",
    createdFrom: "Water alert",
  },
];

const DOCUMENTS: AssetDocument[] = [
  { asset: "Chiller 01", document: "Trane RTHD Operating Manual", type: "Manual", uploaded: "Jan 2020", uploadedBy: "Facilities Manager" },
  { asset: "Chiller 01", document: "Annual Overhaul Report Jan 2026", type: "Maintenance Report", uploaded: "Jan 2026", uploadedBy: "External Contractor" },
  { asset: "Chiller 02", document: "Carrier 19XR Service Manual", type: "Manual", uploaded: "Aug 2019", uploadedBy: "Facilities Manager" },
  { asset: "AHU-05", document: "Carrier AHU Specification Sheet", type: "Datasheet", uploaded: "May 2021", uploadedBy: "Procurement" },
  { asset: "Solar Inverter SMA 100kW", document: "SMA Inverter Commissioning Report", type: "Commissioning Report", uploaded: "Mar 2023", uploadedBy: "SMA Engineer" },
  { asset: "Solar Inverter SMA 100kW", document: "Performance Ratio Calculation Sheet", type: "Report", uploaded: "Apr 2026", uploadedBy: "Sustainability Team" },
  { asset: "Cooling Tower 01", document: "Annual Inspection Certificate", type: "Certificate", uploaded: "Feb 2026", uploadedBy: "L8 Inspector" },
  { asset: "Laundry System", document: "Miele Service Contract", type: "Contract", uploaded: "Jan 2026", uploadedBy: "FM Team" },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

function statusTone(status: Asset["status"]): "good" | "neutral" | "bad" | "info" {
  switch (status) {
    case "Running":
    case "Generating":
    case "Active":
      return "good";
    case "Standby":
      return "neutral";
    case "Offline":
    case "Fault":
      return "bad";
    case "Under Maintenance":
      return "info";
    default:
      return "neutral";
  }
}

function healthTone(health: Asset["health"]): "good" | "warn" | "bad" {
  switch (health) {
    case "Good":
      return "good";
    case "Warning":
    case "Poor":
      return "warn";
    case "Critical":
      return "bad";
    default:
      return "good";
  }
}

function severityTone(severity: FaultRecord["severity"]): "bad" | "warn" | "info" | "neutral" {
  switch (severity) {
    case "Critical":
      return "bad";
    case "High":
      return "bad";
    case "Medium":
      return "warn";
    case "Low":
      return "info";
    default:
      return "neutral";
  }
}

function maintenanceStatusTone(status: MaintenanceAction["status"]): "neutral" | "info" | "warn" | "good" | "brand" {
  switch (status) {
    case "Suggested":
      return "neutral";
    case "Approved":
      return "info";
    case "Assigned":
      return "info";
    case "In Progress":
      return "warn";
    case "Completed":
    case "Verified":
      return "good";
    case "Under Monitoring":
      return "warn";
    case "Closed":
      return "brand";
    default:
      return "neutral";
  }
}

function priorityTone(priority: MaintenanceAction["priority"]): "bad" | "warn" | "info" | "neutral" {
  switch (priority) {
    case "Critical":
      return "bad";
    case "High":
      return "warn";
    case "Medium":
      return "info";
    case "Low":
      return "neutral";
    default:
      return "neutral";
  }
}

function faultStatusTone(status: FaultRecord["status"]): "bad" | "warn" | "info" {
  switch (status) {
    case "Active":
      return "bad";
    case "Assigned":
      return "warn";
    case "New":
      return "info";
    default:
      return "info";
  }
}

// ─── COP Trend Chart ──────────────────────────────────────────────────────────

const COP_TREND = [3.4, 3.38, 3.32, 3.28, 3.25, 3.18, 3.1, 3.15, 3.12, 3.05, 3.0, 2.98, 2.96, 2.94];
const COP_DAYS = ["Apr 23", "Apr 24", "Apr 25", "Apr 26", "Apr 27", "Apr 28", "Apr 29", "Apr 30", "May 1", "May 2", "May 3", "May 4", "May 5", "May 6"];

function COPTrendChart() {
  const minVal = 2.8;
  const maxVal = 3.6;
  const range = maxVal - minVal;

  return (
    <div className="mt-2">
      <div className="flex items-end gap-1 h-24">
        {COP_TREND.map((val, i) => {
          const heightPct = ((val - minVal) / range) * 100;
          const isLast = i === COP_TREND.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "w-full rounded-t",
                  isLast ? "bg-amber-500" : val < 3.1 ? "bg-amber-400" : "bg-blue-400"
                )}
                style={{ height: `${heightPct}%` }}
                title={`${COP_DAYS[i]}: COP ${val.toFixed(2)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1 overflow-hidden">
        {COP_DAYS.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-400 truncate">
            {i % 3 === 0 ? d : ""}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Above 3.1 COP</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Below 3.1 COP</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Current</span>
      </div>
    </div>
  );
}

// ─── Asset Detail Modal ───────────────────────────────────────────────────────

function AssetDetailModal({ asset, open, onClose }: { asset: Asset | null; open: boolean; onClose: () => void }) {
  if (!asset) return null;

  const isChiller01 = asset.id === "AST-001";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${asset.name} — ${asset.manufacturer} ${asset.model}`}
      subtitle={`${asset.location} · ${asset.type} System`}
      size="xl"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Create Maintenance Action
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Identity */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Identity</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Asset ID", value: asset.id },
              { label: "Manufacturer", value: asset.manufacturer },
              { label: "Model", value: asset.model },
              { label: "Capacity", value: asset.capacity },
              { label: "Serial", value: isChiller01 ? "TRN-2019-08241" : `${asset.manufacturer.slice(0, 3).toUpperCase()}-2019-XXXXX` },
              { label: "Installed", value: asset.installedDate },
              { label: "Warranty Expires", value: isChiller01 ? "Aug 2024" : "Aug 2024" },
              { label: "Maintenance Owner", value: asset.maintenanceOwner },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <div className="text-[11px] text-slate-500 mb-1">{label}</div>
                <div className="text-sm font-medium text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Status */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Live Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isChiller01 ? (
              <>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">Status</div>
                  <div className="text-sm font-medium text-green-700">Running</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">Current Load</div>
                  <div className="text-sm font-medium text-slate-800">420 kW</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">Cooling Output</div>
                  <div className="text-sm font-medium text-slate-800">185 TR</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="text-[11px] text-amber-600 mb-1">Current COP</div>
                  <div className="text-sm font-bold text-amber-700">2.94</div>
                  <div className="text-[11px] text-amber-600 mt-1">kW/TR: 2.27</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">Status</div>
                  <div className="text-sm font-medium text-slate-800">{asset.status}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">Health</div>
                  <div className="text-sm font-medium text-slate-800">{asset.health}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">Active Alerts</div>
                  <div className="text-sm font-medium text-slate-800">{asset.activeAlerts}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500 mb-1">Next PM</div>
                  <div className="text-sm font-medium text-slate-800">{asset.nextPM}</div>
                </div>
              </>
            )}
          </div>
          {isChiller01 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                22% above baseline efficiency of 0.72 kW/TR target — fault detection active. COP 2.94 vs design target 3.517+.
              </p>
            </div>
          )}
        </div>

        {/* Performance Trend (Chiller 01 only) */}
        {isChiller01 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">14-Day COP Trend</h4>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">COP (Coefficient of Performance)</span>
                <span className="text-xs text-red-600 font-medium">Declining trend</span>
              </div>
              <COPTrendChart />
              <p className="text-xs text-slate-500 mt-3">Target COP: 3.5 | Design COP: 3.517 | Current: 2.94 — 16% below target</p>
            </div>
          </div>
        )}

        {/* Connected Meters */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Connected Meters & Sensors</h4>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Meter / Sensor</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Status</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Last Reading</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isChiller01 ? (
                  <>
                    <tr>
                      <td className="px-4 py-2 font-medium text-slate-800">Power Meter CH-01-PWR</td>
                      <td className="px-4 py-2 text-slate-600">Electrical</td>
                      <td className="px-4 py-2"><span className="text-green-700 font-medium text-xs">Live</span></td>
                      <td className="px-4 py-2 text-slate-500 text-xs">2 min ago</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-slate-800">Condenser Water Temp Sensor</td>
                      <td className="px-4 py-2 text-slate-600">Temperature</td>
                      <td className="px-4 py-2"><span className="text-green-700 font-medium text-xs">Live</span></td>
                      <td className="px-4 py-2 text-slate-500 text-xs">2 min ago</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-slate-800">Evaporator Water Temp Sensor</td>
                      <td className="px-4 py-2 text-slate-600">Temperature</td>
                      <td className="px-4 py-2"><span className="text-green-700 font-medium text-xs">Live</span></td>
                      <td className="px-4 py-2 text-slate-500 text-xs">2 min ago</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-slate-800">Flow Meter CH-01-FLW</td>
                      <td className="px-4 py-2 text-slate-600">Flow</td>
                      <td className="px-4 py-2"><span className="text-green-700 font-medium text-xs">Live</span></td>
                      <td className="px-4 py-2 text-slate-500 text-xs">2 min ago</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="px-4 py-2 font-medium text-slate-800">Primary Power Meter</td>
                      <td className="px-4 py-2 text-slate-600">Electrical</td>
                      <td className="px-4 py-2"><span className="text-green-700 font-medium text-xs">Live</span></td>
                      <td className="px-4 py-2 text-slate-500 text-xs">5 min ago</td>
                    </tr>
                    {asset.linkedSensors > 1 && (
                      <tr>
                        <td className="px-4 py-2 font-medium text-slate-800">Temperature Sensor 01</td>
                        <td className="px-4 py-2 text-slate-600">Temperature</td>
                        <td className="px-4 py-2"><span className="text-green-700 font-medium text-xs">Live</span></td>
                        <td className="px-4 py-2 text-slate-500 text-xs">5 min ago</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Alerts */}
        {asset.activeAlerts > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Alerts ({asset.activeAlerts})</h4>
            <div className="space-y-2">
              {isChiller01 ? (
                <>
                  <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">COP 22% below baseline</p>
                      <p className="text-xs text-red-600 mt-0.5">High severity · Detected 8 days ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Condenser water temp 4°C above design</p>
                      <p className="text-xs text-amber-600 mt-0.5">Medium severity · Detected 8 days ago</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Performance alert active</p>
                    <p className="text-xs text-amber-600 mt-0.5">Review asset faults for details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Maintenance History */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Maintenance History</h4>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Date</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Description</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Technician</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isChiller01 ? (
                  <>
                    <tr>
                      <td className="px-4 py-2 text-slate-600">Apr 2026</td>
                      <td className="px-4 py-2"><Badge tone="info">Preventive</Badge></td>
                      <td className="px-4 py-2 text-slate-800">Condenser cleaning</td>
                      <td className="px-4 py-2 text-slate-600">John M.</td>
                      <td className="px-4 py-2 text-slate-500">8 hrs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-600">Jan 2026</td>
                      <td className="px-4 py-2"><Badge tone="info">Preventive</Badge></td>
                      <td className="px-4 py-2 text-slate-800">Annual overhaul</td>
                      <td className="px-4 py-2 text-slate-600">External contractor</td>
                      <td className="px-4 py-2 text-slate-500">2 days</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-600">Nov 2025</td>
                      <td className="px-4 py-2"><Badge tone="warn">Corrective</Badge></td>
                      <td className="px-4 py-2 text-slate-800">Refrigerant top-up</td>
                      <td className="px-4 py-2 text-slate-600">John M.</td>
                      <td className="px-4 py-2 text-slate-500">4 hrs</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="px-4 py-2 text-slate-600">{asset.lastInspection}</td>
                    <td className="px-4 py-2"><Badge tone="info">Preventive</Badge></td>
                    <td className="px-4 py-2 text-slate-800">Scheduled inspection</td>
                    <td className="px-4 py-2 text-slate-600">{asset.maintenanceOwner}</td>
                    <td className="px-4 py-2 text-slate-500">4 hrs</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommended Action */}
        {isChiller01 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recommended Action</h4>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Inspect condenser water temperatures and chiller sequencing. Check cooling tower performance — condenser water entering temperature above 32°C. Consider chiller isolation test to assess efficiency loss.
              </p>
            </div>
          </div>
        )}

        {/* Estimated Impact */}
        {asset.estimatedLoss && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Estimated Impact</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="text-[11px] text-red-600 mb-1">Financial Loss</div>
                <div className="text-sm font-bold text-red-800">{asset.estimatedLoss}</div>
              </div>
              {isChiller01 && (
                <>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <div className="text-[11px] text-orange-600 mb-1">Excess Carbon</div>
                    <div className="text-sm font-bold text-orange-800">1.8 tCO₂e/month</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="text-[11px] text-slate-500 mb-1">Confidence</div>
                    <div className="text-sm font-bold text-slate-800">High</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Tab: Asset Registry ──────────────────────────────────────────────────────

const SYSTEM_OPTIONS = ["All", "HVAC", "F&B", "Laundry", "Renewables", "Water", "EV"];
const HEALTH_OPTIONS = ["All", "Good", "Warning", "Poor", "Critical"];

function AssetRegistryTab() {
  const [systemFilter, setSystemFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return ASSETS.filter((a) => {
      const matchSystem = systemFilter === "All" || a.system === systemFilter;
      const matchHealth = healthFilter === "All" || a.health === healthFilter;
      const matchSearch =
        search === "" ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.type.toLowerCase().includes(search.toLowerCase()) ||
        a.location.toLowerCase().includes(search.toLowerCase());
      return matchSystem && matchHealth && matchSearch;
    });
  }, [systemFilter, healthFilter, search]);

  function openAsset(asset: Asset) {
    setSelectedAsset(asset);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">System:</span>
          <div className="flex gap-1">
            {SYSTEM_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSystemFilter(s)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
                  systemFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Health:</span>
          <div className="flex gap-1">
            {HEALTH_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHealthFilter(h)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
                  healthFilter === h
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Asset</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">System</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Location</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Health</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Alerts</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Next PM</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Est. Loss</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{asset.name}</div>
                    <div className="text-xs text-slate-400">{asset.id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{asset.type}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{asset.system}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{asset.location}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={healthTone(asset.health)}>{asset.health}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {asset.activeAlerts > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {asset.activeAlerts}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{asset.nextPM}</td>
                  <td className="px-4 py-3">
                    {asset.estimatedLoss ? (
                      <span className="text-red-700 font-medium text-xs">{asset.estimatedLoss}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openAsset(asset)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No assets match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          Showing {filtered.length} of {ASSETS.length} assets
        </div>
      </Card>

      <AssetDetailModal
        asset={selectedAsset}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// ─── Tab: Asset Health ────────────────────────────────────────────────────────

function AssetHealthTab() {
  const goodAssets = ASSETS.filter((a) => a.health === "Good");
  const warningAssets = ASSETS.filter((a) => a.health === "Warning");
  const poorAssets = ASSETS.filter((a) => a.health === "Poor");
  const criticalAssets = ASSETS.filter((a) => a.health === "Critical");

  const healthCategories = [
    {
      label: "Good",
      count: goodAssets.length,
      assets: goodAssets,
      colour: "bg-green-50 border-green-200",
      headerColour: "text-green-700 bg-green-100",
      dotColour: "bg-green-500",
      tone: "good" as const,
    },
    {
      label: "Warning",
      count: warningAssets.length,
      assets: warningAssets,
      colour: "bg-amber-50 border-amber-200",
      headerColour: "text-amber-700 bg-amber-100",
      dotColour: "bg-amber-500",
      tone: "warn" as const,
    },
    {
      label: "Poor",
      count: poorAssets.length,
      assets: poorAssets,
      colour: "bg-orange-50 border-orange-200",
      headerColour: "text-orange-700 bg-orange-100",
      dotColour: "bg-orange-500",
      tone: "warn" as const,
    },
    {
      label: "Critical",
      count: criticalAssets.length,
      assets: criticalAssets,
      colour: "bg-red-50 border-red-200",
      headerColour: "text-red-700 bg-red-100",
      dotColour: "bg-red-500",
      tone: "bad" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile icon={<Database className="w-5 h-5" />} iconBg="bg-blue-50" label="Total Assets" value="14" />
        <KpiTile icon={<CheckCircle className="w-5 h-5" />} iconBg="bg-green-50" label="Assets Good Health" value="8" delta={57} deltaUnit="% of fleet" goodDirection="up" />
        <KpiTile icon={<AlertTriangle className="w-5 h-5" />} iconBg="bg-amber-50" label="Assets With Alerts" value="6" delta={43} deltaUnit="% of fleet" goodDirection="down" />
        <KpiTile icon={<Clock className="w-5 h-5" />} iconBg="bg-orange-50" label="PM Overdue" value="2" caption="Avg asset age: 5.2 years" />
      </div>

      {/* Health breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthCategories.map(({ label, count, assets, colour, headerColour, dotColour, tone }) => (
          <div key={label} className={cn("rounded-xl border p-4 space-y-3", colour)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("w-2.5 h-2.5 rounded-full", dotColour)} />
                <span className="font-semibold text-slate-700">{label}</span>
              </div>
              <Badge tone={tone}>{count}</Badge>
            </div>
            <div className="space-y-1.5">
              {assets.map((a) => (
                <div key={a.id} className="text-xs text-slate-600 flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  {a.name}
                  {a.activeAlerts > 0 && (
                    <span className="ml-auto text-red-600 font-semibold">{a.activeAlerts}⚠</span>
                  )}
                </div>
              ))}
              {assets.length === 0 && (
                <div className="text-xs text-slate-400 italic">No assets</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          Asset health is based on efficiency KPIs, alert status, runtime analysis, and maintenance records. It is not a mechanical certification.
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Faults & Alerts ─────────────────────────────────────────────────────

function FaultsAlertsTab() {
  const totalEstimatedLoss = "AED 28,620/month";

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <div className="text-xs text-red-600">Active Faults</div>
            <div className="font-bold text-red-800">6 active · 1 assigned · 1 new</div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-600" />
          <div>
            <div className="text-xs text-amber-600">Total Estimated Loss</div>
            <div className="font-bold text-amber-800">{totalEstimatedLoss}</div>
          </div>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Asset</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Fault Type</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Severity</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Detected</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Duration</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Efficiency Impact</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Est. Loss</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {FAULTS.map((fault) => (
                <tr key={fault.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{fault.asset}</div>
                    <div className="text-xs text-slate-400">{fault.id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs max-w-48">{fault.faultType}</td>
                  <td className="px-4 py-3">
                    <Badge tone={severityTone(fault.severity)}>{fault.severity}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fault.detected}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fault.duration}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{fault.efficiencyImpact}</td>
                  <td className="px-4 py-3">
                    {fault.estimatedLoss !== "—" ? (
                      <span className="text-red-700 font-medium text-xs">{fault.estimatedLoss}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={faultStatusTone(fault.status)}>{fault.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-700 hover:underline font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Maintenance ─────────────────────────────────────────────────────────

const WORKFLOW_STEPS = ["Suggested", "Approved", "Assigned", "In Progress", "Completed", "Under Monitoring", "Verified", "Closed"];

function MaintenanceTab() {
  return (
    <div className="space-y-6">
      {/* Workflow diagram */}
      <Card>
        <div className="p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Maintenance Workflow</div>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                    i === 0 ? "bg-slate-200 text-slate-600" :
                    i === 7 ? "bg-slate-800 text-white" :
                    i === 4 || i === 6 ? "bg-green-500 text-white" :
                    "bg-blue-500 text-white"
                  )}>{i + 1}</div>
                  <div className="text-[10px] text-slate-500 mt-1 text-center max-w-14 leading-tight">{step}</div>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="w-6 h-0.5 bg-slate-200 mb-4 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Actions table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Action ID</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Asset</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Priority</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Due Date</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Est. Saving</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MAINTENANCE_ACTIONS.map((action) => (
                <tr key={action.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-slate-700">{action.id}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 text-xs">{action.asset}</td>
                  <td className="px-4 py-3">
                    <Badge tone={action.type === "Corrective" ? "warn" : action.type === "PM" ? "info" : "neutral"}>
                      {action.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-52">{action.description}</td>
                  <td className="px-4 py-3">
                    <Badge tone={priorityTone(action.priority)}>{action.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={maintenanceStatusTone(action.status)}>{action.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{action.assignedTo}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{action.dueDate}</td>
                  <td className="px-4 py-3">
                    {action.estimatedSaving !== "—" ? (
                      <span className="text-green-700 font-medium text-xs">{action.estimatedSaving}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{action.createdFrom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p>
          This module provides preventive maintenance intelligence based on performance data. Hotel Optimizer does not replace on-site engineering judgment. All recommended actions should be reviewed by qualified personnel before implementation.
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function DocumentsTab() {
  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Asset</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Document</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Uploaded By</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {DOCUMENTS.map((doc, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 text-xs">{doc.asset}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">{doc.document}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{doc.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{doc.uploaded}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{doc.uploadedBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-700 hover:underline font-medium">View</button>
                      <span className="text-slate-300">|</span>
                      <button className="text-xs text-blue-700 hover:underline font-medium">Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{DOCUMENTS.length} documents</span>
          <button className="text-xs font-medium text-blue-700 hover:underline">Upload Document</button>
        </div>
      </Card>
    </div>
  );
}

// ─── Tabs Config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "registry", label: "Asset Registry", icon: Database },
  { id: "health", label: "Asset Health", icon: Activity },
  { id: "faults", label: "Faults & Alerts", icon: AlertTriangle },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "documents", label: "Documents", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssetPerformance() {
  const [activeTab, setActiveTab] = useState<TabId>("registry");

  const totalAlerts = ASSETS.reduce((sum, a) => sum + a.activeAlerts, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        <PageHeader
          eyebrow="Smart Operations · Assets"
          title="Asset Performance"
          subtitle="Asset registry, health monitoring, fault detection, and maintenance · Dubai Marina Hotel"
          actions={
            <div className="flex items-center gap-2">
              {totalAlerts > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">{totalAlerts} active alerts</span>
                </div>
              )}
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Add Asset
              </button>
            </div>
          }
        />

        {/* Tab navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const alertBadge = id === "faults" ? FAULTS.length : id === "maintenance" ? MAINTENANCE_ACTIONS.filter((a) => a.status === "In Progress").length : 0;
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
                  {alertBadge > 0 && (
                    <span className={cn(
                      "inline-flex items-center justify-center w-5 h-5 text-[11px] rounded-full font-bold",
                      isActive ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {alertBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "registry" && <AssetRegistryTab />}
          {activeTab === "health" && <AssetHealthTab />}
          {activeTab === "faults" && <FaultsAlertsTab />}
          {activeTab === "maintenance" && <MaintenanceTab />}
          {activeTab === "documents" && <DocumentsTab />}
        </div>
      </div>
    </div>
  );
}
