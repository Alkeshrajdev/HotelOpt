import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  Zap,
  DollarSign,
  Wind,
  Leaf,
  Activity,
  Gauge,
  Sun,
  BarChart3,
  AlertTriangle,
  Eye,
  TrendingUp,
  TrendingDown,
  Settings,
  Clock,
  Wifi,
  WifiOff,
  ChevronRight,
  Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "meters" | "balance" | "peak" | "assets";

interface MeterRow {
  id: string;
  name: string;
  type: string;
  location: string;
  reading: number;
  readingDisplay: string;
  unit: string;
  status: "Live" | "Delayed" | "Offline" | "Estimated";
  lastUpdate: string;
  coverage: number;
  protocol: string;
  lastCalibration: string;
  trendValues: number[];
  linkedAlerts: string[];
}

interface AssetRow {
  id: string;
  name: string;
  system: string;
  status: string;
  runtime: string;
  energyKw: number | null;
  energyDisplay: string;
  efficiencyKpi: string;
  efficiencyValue: string;
  vsBaseline: string;
  vsBaselineDirection: "worse" | "normal" | "below";
  vsBaselinePct: number;
  alert: string | null;
  estimatedLossUsd: number | null;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const METERS: MeterRow[] = [
  {
    id: "m01",
    name: "Main Incomer 01",
    type: "Main electricity",
    location: "LV Switchroom B1",
    reading: 8420,
    readingDisplay: "8,420",
    unit: "kW",
    status: "Live",
    lastUpdate: "2 min ago",
    coverage: 100,
    protocol: "BACnet/IP",
    lastCalibration: "15 Jan 2026",
    trendValues: [8100, 8300, 8450, 8200, 8500, 8420, 8390],
    linkedAlerts: [],
  },
  {
    id: "m02",
    name: "HVAC Plant Meter",
    type: "Sub-meter",
    location: "Chiller Plant Room B2",
    reading: 4892,
    readingDisplay: "4,892",
    unit: "kW",
    status: "Live",
    lastUpdate: "2 min ago",
    coverage: 100,
    protocol: "BACnet/IP",
    lastCalibration: "15 Jan 2026",
    trendValues: [4600, 4800, 4950, 4700, 4900, 4892, 4850],
    linkedAlerts: [],
  },
  {
    id: "m03",
    name: "Chiller 01 Power Meter",
    type: "Sub-meter",
    location: "Chiller Plant Room B2",
    reading: 2210,
    readingDisplay: "2,210",
    unit: "kW",
    status: "Live",
    lastUpdate: "5 min ago",
    coverage: 100,
    protocol: "Modbus TCP",
    lastCalibration: "18 Jan 2026",
    trendValues: [2100, 2200, 2250, 2180, 2230, 2210, 2190],
    linkedAlerts: ["Efficiency 28% above baseline — review required"],
  },
  {
    id: "m04",
    name: "Chiller 02 Power Meter",
    type: "Sub-meter",
    location: "Chiller Plant Room B2",
    reading: 1840,
    readingDisplay: "1,840",
    unit: "kW",
    status: "Delayed",
    lastUpdate: "18 min ago",
    coverage: 97,
    protocol: "Modbus TCP",
    lastCalibration: "18 Jan 2026",
    trendValues: [1780, 1820, 1860, 1800, 1840, 1830, 1840],
    linkedAlerts: [],
  },
  {
    id: "m05",
    name: "AHU Bank A Meter",
    type: "Sub-meter",
    location: "Roof Plant Level 12",
    reading: 312,
    readingDisplay: "312",
    unit: "kW",
    status: "Live",
    lastUpdate: "2 min ago",
    coverage: 100,
    protocol: "BACnet/MSTP",
    lastCalibration: "20 Jan 2026",
    trendValues: [295, 305, 315, 308, 312, 310, 312],
    linkedAlerts: [],
  },
  {
    id: "m06",
    name: "Lighting Circuit L1",
    type: "Sub-meter",
    location: "Main Distribution Board 3F",
    reading: 185,
    readingDisplay: "185",
    unit: "kW",
    status: "Live",
    lastUpdate: "2 min ago",
    coverage: 100,
    protocol: "Modbus RTU",
    lastCalibration: "22 Jan 2026",
    trendValues: [190, 185, 188, 182, 186, 185, 184],
    linkedAlerts: [],
  },
  {
    id: "m07",
    name: "Kitchen Main Meter",
    type: "Sub-meter",
    location: "F&B Kitchen L1",
    reading: 420,
    readingDisplay: "420",
    unit: "kW",
    status: "Live",
    lastUpdate: "5 min ago",
    coverage: 99,
    protocol: "Modbus TCP",
    lastCalibration: "10 Jan 2026",
    trendValues: [390, 410, 430, 415, 420, 418, 420],
    linkedAlerts: ["Energy per cover 22% above benchmark"],
  },
  {
    id: "m08",
    name: "Laundry Meter",
    type: "Sub-meter",
    location: "Laundry Room B1",
    reading: 260,
    readingDisplay: "260",
    unit: "kW",
    status: "Live",
    lastUpdate: "2 min ago",
    coverage: 100,
    protocol: "BACnet/IP",
    lastCalibration: "12 Jan 2026",
    trendValues: [250, 255, 265, 258, 262, 260, 258],
    linkedAlerts: [],
  },
  {
    id: "m09",
    name: "BOH Meter",
    type: "Sub-meter",
    location: "Back of House B1",
    reading: 148,
    readingDisplay: "148",
    unit: "kW",
    status: "Offline",
    lastUpdate: "4 hrs ago",
    coverage: 0,
    protocol: "Modbus RTU",
    lastCalibration: "05 Jan 2026",
    trendValues: [140, 145, 150, 148, 0, 0, 0],
    linkedAlerts: ["Meter offline — data gap in BOH allocation"],
  },
  {
    id: "m10",
    name: "Guestroom Block A",
    type: "Sub-meter",
    location: "Floors 1–6",
    reading: 520,
    readingDisplay: "520",
    unit: "kW",
    status: "Live",
    lastUpdate: "2 min ago",
    coverage: 100,
    protocol: "BACnet/IP",
    lastCalibration: "14 Jan 2026",
    trendValues: [500, 510, 530, 515, 522, 520, 518],
    linkedAlerts: [],
  },
  {
    id: "m11",
    name: "Solar Inverter 01",
    type: "Generation meter",
    location: "Roof Level 12",
    reading: -182,
    readingDisplay: "–182",
    unit: "kW",
    status: "Live",
    lastUpdate: "1 min ago",
    coverage: 100,
    protocol: "SunSpec / Modbus TCP",
    lastCalibration: "01 Feb 2026",
    trendValues: [175, 180, 185, 182, 180, 182, 183],
    linkedAlerts: ["Performance ratio 78% — 4% below target"],
  },
  {
    id: "m12",
    name: "EV Charger Array",
    type: "Sub-meter",
    location: "Car Park Level P1",
    reading: 48,
    readingDisplay: "48",
    unit: "kW",
    status: "Live",
    lastUpdate: "2 min ago",
    coverage: 100,
    protocol: "OCPP 1.6 / API",
    lastCalibration: "01 Mar 2026",
    trendValues: [40, 44, 50, 46, 48, 48, 47],
    linkedAlerts: [],
  },
];

const ASSETS: AssetRow[] = [
  {
    id: "a01",
    name: "Chiller 01 (Trane RTHD)",
    system: "HVAC",
    status: "Running",
    runtime: "16 hrs/day",
    energyKw: 2210,
    energyDisplay: "2,210 kW",
    efficiencyKpi: "kW/TR",
    efficiencyValue: "0.72 kW/TR",
    vsBaseline: "+28% worse",
    vsBaselineDirection: "worse",
    vsBaselinePct: 28,
    alert: "Efficiency 28% above baseline — immediate maintenance review",
    estimatedLossUsd: 1690,
  },
  {
    id: "a02",
    name: "Chiller 02 (Carrier 19XR)",
    system: "HVAC",
    status: "Running",
    runtime: "18 hrs/day",
    energyKw: 1840,
    energyDisplay: "1,840 kW",
    efficiencyKpi: "kW/TR",
    efficiencyValue: "0.61 kW/TR",
    vsBaseline: "+8% worse",
    vsBaselineDirection: "worse",
    vsBaselinePct: 8,
    alert: null,
    estimatedLossUsd: 490,
  },
  {
    id: "a03",
    name: "AHU-01",
    system: "HVAC",
    status: "Running",
    runtime: "14 hrs/day",
    energyKw: 142,
    energyDisplay: "142 kW",
    efficiencyKpi: "W/m³/h",
    efficiencyValue: "2.8 W/m³/h",
    vsBaseline: "Normal",
    vsBaselineDirection: "normal",
    vsBaselinePct: 0,
    alert: null,
    estimatedLossUsd: null,
  },
  {
    id: "a04",
    name: "AHU-05",
    system: "HVAC",
    status: "Running",
    runtime: "22 hrs/day",
    energyKw: 168,
    energyDisplay: "168 kW",
    efficiencyKpi: "W/m³/h",
    efficiencyValue: "3.1 W/m³/h",
    vsBaseline: "+18% worse",
    vsBaselineDirection: "worse",
    vsBaselinePct: 18,
    alert: "Running outside scheduled hours — review BMS time schedule",
    estimatedLossUsd: 300,
  },
  {
    id: "a05",
    name: "Kitchen Equipment",
    system: "F&B",
    status: "Partially on",
    runtime: "—",
    energyKw: 420,
    energyDisplay: "420 kW",
    efficiencyKpi: "kWh/cover",
    efficiencyValue: "8.4 kWh/cover",
    vsBaseline: "+22% above benchmark",
    vsBaselineDirection: "worse",
    vsBaselinePct: 22,
    alert: "Energy per cover 22% above benchmark — check equipment standby behaviour",
    estimatedLossUsd: 650,
  },
  {
    id: "a06",
    name: "Laundry System",
    system: "Laundry",
    status: "Running",
    runtime: "10 hrs/day",
    energyKw: 260,
    energyDisplay: "260 kW",
    efficiencyKpi: "kWh/kg",
    efficiencyValue: "0.42 kWh/kg",
    vsBaseline: "Normal",
    vsBaselineDirection: "normal",
    vsBaselinePct: 0,
    alert: null,
    estimatedLossUsd: null,
  },
  {
    id: "a07",
    name: "Solar Inverter 01",
    system: "Renewables",
    status: "Generating",
    runtime: "—",
    energyKw: -182,
    energyDisplay: "–182 kW",
    efficiencyKpi: "PR",
    efficiencyValue: "PR: 78%",
    vsBaseline: "–4% below target",
    vsBaselineDirection: "below",
    vsBaselinePct: 4,
    alert: null,
    estimatedLossUsd: null,
  },
  {
    id: "a08",
    name: "EV Chargers (×4)",
    system: "EV",
    status: "Active",
    runtime: "—",
    energyKw: 48,
    energyDisplay: "48 kW",
    efficiencyKpi: "Utilisation",
    efficiencyValue: "100%",
    vsBaseline: "Normal",
    vsBaselineDirection: "normal",
    vsBaselinePct: 0,
    alert: null,
    estimatedLossUsd: null,
  },
];

// Daily energy trend — 14 days Mon–Sun × 2, kWh/day
const DAILY_TREND: { label: string; value: number }[] = [
  { label: "Mon", value: 9200 },
  { label: "Tue", value: 9800 },
  { label: "Wed", value: 10400 },
  { label: "Thu", value: 11200 },
  { label: "Fri", value: 12000 },
  { label: "Sat", value: 10800 },
  { label: "Sun", value: 8500 },
  { label: "Mon", value: 9600 },
  { label: "Tue", value: 10100 },
  { label: "Wed", value: 10900 },
  { label: "Thu", value: 11500 },
  { label: "Fri", value: 11800 },
  { label: "Sat", value: 10200 },
  { label: "Sun", value: 8800 },
];

const ENERGY_BY_SYSTEM: { label: string; pct: number; color: string }[] = [
  { label: "HVAC", pct: 58, color: "bg-brand-600" },
  { label: "Lighting", pct: 14, color: "bg-sky-400" },
  { label: "Kitchen", pct: 12, color: "bg-amber-400" },
  { label: "Laundry", pct: 8, color: "bg-violet-400" },
  { label: "BOH", pct: 5, color: "bg-slate-400" },
  { label: "Other", pct: 3, color: "bg-slate-300" },
];

// Consumption vs Occupancy — 7 days
const VS_OCC: { day: string; kwh: number; occ: number }[] = [
  { day: "Mon", kwh: 9200, occ: 68 },
  { day: "Tue", kwh: 9800, occ: 72 },
  { day: "Wed", kwh: 10400, occ: 78 },
  { day: "Thu", kwh: 11200, occ: 84 },
  { day: "Fri", kwh: 12000, occ: 91 },
  { day: "Sat", kwh: 10800, occ: 87 },
  { day: "Sun", kwh: 8500, occ: 65 },
];

// Energy balance
const BALANCE_ROWS: { label: string; kwh: number; pct: number | null; color: string; isOffset?: boolean }[] = [
  { label: "HVAC", kwh: 164910, pct: 58.0, color: "bg-brand-600" },
  { label: "Lighting", kwh: 39830, pct: 14.0, color: "bg-sky-400" },
  { label: "Kitchen", kwh: 34140, pct: 12.0, color: "bg-amber-400" },
  { label: "Laundry", kwh: 22760, pct: 8.0, color: "bg-violet-400" },
  { label: "Guest Rooms", kwh: 14225, pct: 5.0, color: "bg-teal-400" },
  { label: "BOH", kwh: 5690, pct: 2.0, color: "bg-slate-400" },
  { label: "EV Charging", kwh: 2845, pct: 1.0, color: "bg-green-400" },
  { label: "Solar Offset", kwh: -18200, pct: null, color: "bg-emerald-500", isOffset: true },
];

// 24-hour load profile kW values (index 0 = 00:00, index 23 = 23:00)
const LOAD_PROFILE: { hour: string; kw: number }[] = [
  { hour: "00", kw: 210 },
  { hour: "01", kw: 195 },
  { hour: "02", kw: 185 },
  { hour: "03", kw: 180 },
  { hour: "04", kw: 182 },
  { hour: "05", kw: 200 },
  { hour: "06", kw: 320 },
  { hour: "07", kw: 520 },
  { hour: "08", kw: 650 },
  { hour: "09", kw: 710 },
  { hour: "10", kw: 740 },
  { hour: "11", kw: 760 },
  { hour: "12", kw: 800 },
  { hour: "13", kw: 820 },
  { hour: "14", kw: 842 },
  { hour: "15", kw: 835 },
  { hour: "16", kw: 810 },
  { hour: "17", kw: 780 },
  { hour: "18", kw: 700 },
  { hour: "19", kw: 680 },
  { hour: "20", kw: 660 },
  { hour: "21", kw: 630 },
  { hour: "22", kw: 390 },
  { hour: "23", kw: 350 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "meters", label: "Live Meters" },
    { id: "balance", label: "Energy Balance" },
    { id: "peak", label: "Peak Demand" },
    { id: "assets", label: "Asset Efficiency" },
  ];
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === t.id
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function DataSourceNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
      <span>{text}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
      {children}
    </h3>
  );
}

// ─── Mini trend bar chart (for modal) ─────────────────────────────────────────

function MiniTrend({ values, unit }: { values: number[]; unit: string }) {
  const max = Math.max(...values.map(Math.abs));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <SectionLabel>Last 7 days ({unit})</SectionLabel>
      <div className="flex items-end gap-1 h-16">
        {values.map((v, i) => {
          const h = max === 0 ? 0 : Math.round((Math.abs(v) / max) * 100);
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full rounded-sm bg-brand-500 transition-all"
                style={{ height: `${h}%` }}
                title={`${v} ${unit}`}
              />
              <span className="text-[10px] text-gray-400">{days[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Meter status helpers ─────────────────────────────────────────────────────

function meterStatusBadgeTone(
  status: MeterRow["status"]
): "good" | "warn" | "bad" | "neutral" {
  if (status === "Live") return "good";
  if (status === "Delayed") return "warn";
  if (status === "Offline") return "bad";
  return "neutral";
}

function StatusIcon({ status }: { status: MeterRow["status"] }) {
  if (status === "Live") return <Wifi className="w-3.5 h-3.5 text-emerald-500" />;
  if (status === "Delayed") return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  if (status === "Offline") return <WifiOff className="w-3.5 h-3.5 text-red-500" />;
  return <Activity className="w-3.5 h-3.5 text-gray-400" />;
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const trendMax = Math.max(...DAILY_TREND.map((d) => d.value));

  return (
    <div className="space-y-6">
      {/* KPI row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          icon={<Zap className="w-5 h-5" />}
          iconBg="bg-brand-50"
          label="Total electricity"
          value="284,500"
          unit="kWh"
          delta={-8.2}
          deltaUnit="% vs last month"
          goodDirection="down"
          caption="Level 2 — Meter interval · Updated 2 min ago"
        />
        <KpiTile
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-amber-50"
          label="Energy cost"
          value="$38,690"
          delta={-6.8}
          deltaUnit="% vs last month"
          goodDirection="down"
          caption="Level 2 — Meter interval · Updated 2 min ago"
        />
        <KpiTile
          icon={<BarChart3 className="w-5 h-5" />}
          iconBg="bg-sky-50"
          label="kWh / occupied room night"
          value="48.3"
          unit="kWh"
          delta={-5.1}
          deltaUnit="% vs last month"
          goodDirection="down"
          caption="Level 2 — Meter interval · Updated daily"
        />
        <KpiTile
          icon={<Leaf className="w-5 h-5" />}
          iconBg="bg-emerald-50"
          label="Carbon from energy"
          value="128.0"
          unit="tCO₂e"
          caption="Level 2 + EF (DEWA 0.45 kgCO₂e/kWh) · Updated monthly"
        />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-red-50"
          label="Peak demand"
          value="842"
          unit="kW"
          delta={12}
          deltaUnit="% vs target"
          goodDirection="down"
          caption="High · Level 2 — Meter interval"
        />
        <KpiTile
          icon={<Gauge className="w-5 h-5" />}
          iconBg="bg-violet-50"
          label="Load factor"
          value="64"
          unit="%"
          delta={-3}
          deltaUnit=" pts vs last month"
          goodDirection="up"
          caption="Level 2 — Meter interval"
        />
        <KpiTile
          icon={<Sun className="w-5 h-5" />}
          iconBg="bg-yellow-50"
          label="Solar generation"
          value="18,200"
          unit="kWh"
          caption="On-site · Level 2 — Generation meter"
        />
        <KpiTile
          icon={<Wind className="w-5 h-5" />}
          iconBg="bg-teal-50"
          label="Energy intensity"
          value="31.2"
          unit="kWh/m²"
          delta={-4.8}
          deltaUnit="% vs last month"
          goodDirection="down"
          caption="Level 2 — Meter interval · GFA 9,120 m²"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily energy trend */}
        <Card className="p-5">
          <SectionLabel>Daily energy trend — last 14 days</SectionLabel>
          <div className="flex items-end gap-1 h-32 mt-2">
            {DAILY_TREND.map((d, i) => {
              const hPct = Math.round((d.value / trendMax) * 100);
              const isPeak = d.value >= 11800;
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-[9px] text-gray-400 leading-none">
                    {(d.value / 1000).toFixed(1)}k
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-t-sm transition-all",
                      isPeak ? "bg-red-400" : "bg-brand-500"
                    )}
                    style={{ height: `${hPct}%` }}
                    title={`${d.label}: ${d.value.toLocaleString()} kWh`}
                  />
                  <span className="text-[9px] text-gray-400">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm bg-brand-500" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm bg-red-400" />
              <span>Peak day (&gt;11,800 kWh)</span>
            </div>
          </div>
        </Card>

        {/* Energy by system */}
        <Card className="p-5">
          <SectionLabel>Energy by system — % share of total</SectionLabel>
          <div className="mt-3 space-y-2">
            {ENERGY_BY_SYSTEM.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-16 text-xs text-gray-600 shrink-0">{s.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", s.color)}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium text-gray-700">
                  {s.pct}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex items-end gap-0 h-2 w-full rounded-full overflow-hidden">
              {ENERGY_BY_SYSTEM.map((s) => (
                <div
                  key={s.label}
                  className={cn("h-full", s.color)}
                  style={{ width: `${s.pct}%` }}
                  title={`${s.label}: ${s.pct}%`}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Consumption vs Occupancy */}
      <Card className="p-5">
        <SectionLabel>Consumption vs occupancy — last 7 days</SectionLabel>
        <div className="grid grid-cols-7 gap-2 mt-3">
          {VS_OCC.map((d) => {
            const kwhMax = 12000;
            const kwhH = Math.round((d.kwh / kwhMax) * 80);
            const occH = Math.round((d.occ / 100) * 80);
            return (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 h-20">
                  <div
                    className="w-3 bg-brand-500 rounded-t-sm"
                    style={{ height: `${kwhH}%` }}
                    title={`${d.kwh.toLocaleString()} kWh`}
                  />
                  <div
                    className="w-3 bg-amber-400 rounded-t-sm"
                    style={{ height: `${occH}%` }}
                    title={`${d.occ}% occupancy`}
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{d.day}</span>
                <span className="text-[9px] text-brand-600">{(d.kwh / 1000).toFixed(1)}k</span>
                <span className="text-[9px] text-amber-600">{d.occ}%</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-brand-500" />
            <span>kWh consumed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-amber-400" />
            <span>Occupancy %</span>
          </div>
        </div>
      </Card>

      <DataSourceNote
        text={
          "Energy data sourced from sub-meter interval data (Level 2). Official utility bill reconciliation is performed monthly. Sub-meter coverage: 94%. Unallocated: 6%."
        }
      />
    </div>
  );
}

// ─── Tab: Live Meters ─────────────────────────────────────────────────────────

function LiveMetersTab() {
  const [selectedMeter, setSelectedMeter] = useState<MeterRow | null>(null);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Meter name",
                "Type",
                "Location",
                "Latest reading",
                "Unit",
                "Status",
                "Last update",
                "Coverage",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {METERS.map((m) => (
              <tr
                key={m.id}
                className={cn(
                  "transition-colors hover:bg-gray-50",
                  m.status === "Offline" && "bg-red-50 hover:bg-red-100"
                )}
              >
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {m.status === "Offline" && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                    {m.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.type}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.location}</td>
                <td className="px-4 py-3 font-mono font-semibold text-gray-800 whitespace-nowrap">
                  {m.readingDisplay}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.unit}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={m.status} />
                    <Badge tone={meterStatusBadgeTone(m.status)}>{m.status}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.lastUpdate}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          m.coverage === 0
                            ? "bg-red-500"
                            : m.coverage < 98
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${m.coverage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{m.coverage}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedMeter(m)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DataSourceNote
        text="Live meter readings are pulled via BACnet/IP, Modbus TCP, and OCPP APIs at 15-minute intervals. Coverage % reflects data completeness for the rolling 30-day period. Offline meters fall back to estimated values derived from adjacent sub-meters."
      />

      {/* Meter detail modal */}
      <Modal
        open={selectedMeter !== null}
        onClose={() => setSelectedMeter(null)}
        title={selectedMeter?.name ?? ""}
        subtitle={`${selectedMeter?.type} · ${selectedMeter?.location}`}
        size="md"
      >
        {selectedMeter && (
          <div className="space-y-6">
            <MiniTrend values={selectedMeter.trendValues} unit={selectedMeter.unit} />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Current reading</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">
                  {selectedMeter.readingDisplay}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedMeter.unit}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Data completeness</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">
                  {selectedMeter.coverage}%
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Rolling 30 days</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Status</p>
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={selectedMeter.status} />
                  <Badge tone={meterStatusBadgeTone(selectedMeter.status)}>
                    {selectedMeter.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Last update</p>
                <p className="font-medium text-gray-800">{selectedMeter.lastUpdate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Protocol / source</p>
                <p className="font-medium text-gray-800">{selectedMeter.protocol}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Last calibration</p>
                <p className="font-medium text-gray-800">{selectedMeter.lastCalibration}</p>
              </div>
            </div>

            {selectedMeter.linkedAlerts.length > 0 && (
              <div>
                <SectionLabel>Linked alerts</SectionLabel>
                <ul className="space-y-1.5">
                  {selectedMeter.linkedAlerts.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Tab: Energy Balance ──────────────────────────────────────────────────────

function EnergyBalanceTab() {
  const mainTotal = 284500;
  const allocatedTotal = BALANCE_ROWS.filter((r) => !r.isOffset).reduce(
    (s, r) => s + r.kwh,
    0
  );
  const solarOffset = -18200;
  const netAfterSolar = mainTotal + solarOffset;

  return (
    <div className="space-y-6">
      {/* Main incomer header */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
              Main Incomer 01 — Monthly total
            </p>
            <p className="text-3xl font-bold text-gray-900">
              284,500{" "}
              <span className="text-lg font-normal text-gray-500">kWh</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">May 2026 · Level 2 — Meter interval · Updated 2 min ago</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Net after solar</p>
            <p className="text-xl font-bold text-emerald-700">
              {(netAfterSolar / 1000).toFixed(1)}k{" "}
              <span className="text-sm font-normal text-gray-500">kWh</span>
            </p>
          </div>
        </div>

        {/* Stacked colour bar */}
        <div className="flex items-end gap-0 h-6 w-full rounded-lg overflow-hidden mb-4">
          {BALANCE_ROWS.filter((r) => !r.isOffset).map((r) => (
            <div
              key={r.label}
              className={cn("h-full", r.color)}
              style={{ width: `${r.pct}%` }}
              title={`${r.label}: ${r.kwh.toLocaleString()} kWh (${r.pct}%)`}
            />
          ))}
        </div>

        {/* Waterfall rows */}
        <div className="space-y-1">
          {BALANCE_ROWS.map((r, i) => {
            const barPct = r.isOffset
              ? Math.round((Math.abs(r.kwh) / mainTotal) * 100)
              : r.pct ?? 0;
            return (
              <div
                key={r.label}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg",
                  r.isOffset
                    ? "bg-emerald-50 border border-emerald-200"
                    : i % 2 === 0
                    ? "bg-gray-50"
                    : "bg-white"
                )}
              >
                <div className={cn("w-2.5 h-2.5 rounded-sm shrink-0", r.color)} />
                <span className="w-28 text-sm font-medium text-gray-700 shrink-0">
                  {r.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", r.color)}
                    style={{ width: `${Math.min(barPct, 100)}%` }}
                  />
                </div>
                <span className="w-24 text-right text-sm font-mono font-semibold text-gray-800">
                  {r.isOffset ? "–" : ""}
                  {Math.abs(r.kwh).toLocaleString()} kWh
                </span>
                <span className="w-12 text-right text-xs text-gray-500">
                  {r.pct !== null ? `${r.pct}%` : `${barPct}%`}
                </span>
              </div>
            );
          })}

          {/* Net total row */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-900 text-white mt-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-white shrink-0" />
            <span className="w-28 text-sm font-semibold shrink-0">Net total</span>
            <div className="flex-1" />
            <span className="text-sm font-mono font-bold">
              {netAfterSolar.toLocaleString()} kWh
            </span>
            <span className="w-12 text-right text-xs text-gray-400">100%</span>
          </div>
        </div>
      </Card>

      {/* Allocation note */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Sub-meter coverage: 94% of main incomer.</span>{" "}
          Unallocated 6% (≈17,070 kWh) is estimated. Improve coverage by installing meters
          on BOH lighting circuits, pool plant, and secondary pump sets.
        </div>
      </div>

      <DataSourceNote
        text={`Sub-meter allocation is derived from Level 2 interval data (15-minute). Allocated total: ${allocatedTotal.toLocaleString()} kWh. Main incomer: ${mainTotal.toLocaleString()} kWh. Solar offset sourced from generation meter (Level 2). Monthly reconciliation with official DEWA bill performed on the 5th of following month.`}
      />
    </div>
  );
}

// ─── Tab: Peak Demand ─────────────────────────────────────────────────────────

function PeakDemandTab() {
  const peakKw = 842;
  const thresholdKw = 750;
  const maxKw = 900;

  return (
    <div className="space-y-6">
      {/* Peak KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-red-200 bg-red-50">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            This month's peak
          </p>
          <p className="text-3xl font-bold text-red-700 font-mono">{peakKw} kW</p>
          <p className="text-xs text-gray-500 mt-1">
            Occurred 14:35 · 3 May 2026
          </p>
          <Badge tone="bad" className="mt-2">
            Above 750 kW tariff threshold
          </Badge>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Tariff peak threshold
          </p>
          <p className="text-3xl font-bold text-gray-800 font-mono">750 kW</p>
          <p className="text-xs text-gray-500 mt-1">DEWA ToU demand tariff band</p>
          <p className="text-xs text-red-600 mt-2 font-medium">
            Exceeded by {peakKw - thresholdKw} kW
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Estimated demand charge
          </p>
          <p className="text-3xl font-bold text-amber-700 font-mono">$2,290</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
          <p className="text-xs text-gray-400 mt-2">$3/kW above threshold</p>
        </Card>
      </div>

      {/* 24-hour load profile */}
      <Card className="p-5">
        <SectionLabel>24-hour average load profile — May 2026</SectionLabel>
        <div className="flex items-end gap-0.5 h-40 mt-3">
          {LOAD_PROFILE.map((h) => {
            const hPct = Math.round((h.kw / maxKw) * 100);
            const isPeak = h.kw >= peakKw;
            const isAboveThreshold = h.kw > thresholdKw;
            return (
              <div
                key={h.hour}
                className="flex flex-col items-center flex-1 min-w-0 h-full justify-end"
              >
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all",
                    isPeak
                      ? "bg-red-500"
                      : isAboveThreshold
                      ? "bg-amber-400"
                      : "bg-brand-400"
                  )}
                  style={{ height: `${hPct}%` }}
                  title={`${h.hour}:00 — ${h.kw} kW`}
                />
              </div>
            );
          })}
        </div>
        {/* Threshold line label */}
        <div className="relative mt-1">
          <div className="flex gap-0.5">
            {LOAD_PROFILE.map((h) => (
              <div key={h.hour} className="flex-1 min-w-0 text-center">
                {parseInt(h.hour) % 6 === 0 && (
                  <span className="text-[9px] text-gray-400">{h.hour}:00</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-brand-400" />
            <span>Below threshold</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-amber-400" />
            <span>Above 750 kW threshold</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-red-500" />
            <span>Monthly peak (842 kW)</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Profile derived from 15-minute interval data · Level 2 — Main Incomer 01 · Updated 2 min ago
        </p>
      </Card>

      {/* Alert box */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Peak demand is occurring between 14:00–16:00</span>{" "}
          when Chiller 01 + Chiller 02 + Kitchen are simultaneously operating at full load.
          Shifting laundry to off-peak (22:00–06:00) could reduce coincident peak demand by
          approximately <span className="font-semibold">~80 kW</span>.
        </div>
      </div>

      {/* Peak avoidance actions */}
      <Card className="p-5">
        <SectionLabel>Peak avoidance actions</SectionLabel>
        <ol className="space-y-4 mt-2">
          {[
            {
              n: 1,
              action: "Stagger laundry start times to 22:00–06:00",
              detail:
                "Shift laundry cycle starts to the off-peak window to avoid coinciding with afternoon chiller load. Programme laundry timers or BMS schedule.",
              saving: "$762/month",
              tone: "good" as const,
            },
            {
              n: 2,
              action: "Enable chiller staging controls to prevent simultaneous full-load",
              detail:
                "Implement chiller sequencing in BMS so Chiller 01 and Chiller 02 cannot both ramp to full capacity simultaneously. Lead/lag configuration required.",
              saving: "$925/month",
              tone: "good" as const,
            },
            {
              n: 3,
              action: "Pre-cool guest areas at 13:00 before check-in peak",
              detail:
                "Advance cooling setpoint by 1°C between 13:00–14:00 to pre-load thermal mass. Flatten the demand curve during the 14:00–16:00 peak window.",
              saving: "Demand smoothing",
              tone: "info" as const,
            },
          ].map((item) => (
            <li key={item.n} className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {item.n}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-gray-800 text-sm">{item.action}</p>
                  <Badge tone={item.tone} className="shrink-0">
                    Est. {item.saving}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <DataSourceNote
        text="Peak demand data sourced from Level 2 — Main Incomer 01 (15-minute interval). Demand charge estimate uses DEWA commercial tariff schedule ($3/kW above 750 kW threshold). Savings estimates are indicative based on historical demand profiles and are not guaranteed."
      />
    </div>
  );
}

// ─── Tab: Asset Efficiency ────────────────────────────────────────────────────

function AssetEfficiencyTab() {
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);

  function baselineBadgeTone(
    d: AssetRow["vsBaselineDirection"]
  ): "bad" | "warn" | "good" | "neutral" | "info" {
    if (d === "worse") return "bad";
    if (d === "below") return "warn";
    return "good";
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Asset",
                "System",
                "Status",
                "Runtime",
                "Energy",
                "Efficiency KPI",
                "vs Baseline",
                "Est. loss",
                "Alerts",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {ASSETS.map((a) => (
              <tr
                key={a.id}
                className={cn(
                  "transition-colors hover:bg-gray-50",
                  a.vsBaselineDirection === "worse" &&
                    a.vsBaselinePct >= 20 &&
                    "bg-red-50 hover:bg-red-100"
                )}
              >
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                  {a.name}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{a.system}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge
                    tone={
                      a.status === "Running" || a.status === "Active" || a.status === "Generating"
                        ? "good"
                        : "neutral"
                    }
                  >
                    {a.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{a.runtime}</td>
                <td className="px-4 py-3 font-mono font-semibold text-gray-800 whitespace-nowrap">
                  {a.energyDisplay}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <span className="font-mono font-semibold text-gray-800">
                      {a.efficiencyValue}
                    </span>
                    <span className="block text-xs text-gray-400">{a.efficiencyKpi}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge tone={baselineBadgeTone(a.vsBaselineDirection)}>
                    {a.vsBaseline}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {a.estimatedLossUsd !== null ? (
                    <span className="font-mono font-semibold text-red-700">
                      ${a.estimatedLossUsd.toLocaleString()}/mo
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {a.alert ? (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs">Alert</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedAsset(a)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DataSourceNote
        text="Asset efficiency data sourced from sub-metering and BMS (Level 2 and Level 3). Baseline periods: Jan–Mar 2026 (pre-intervention). Chiller efficiency kW/TR calculated from power meter + chiller plant tonnage sensors. All efficiency figures are operational only and are not used for official GHG reporting."
      />

      {/* Asset detail modal */}
      <Modal
        open={selectedAsset !== null}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset?.name ?? ""}
        subtitle={`${selectedAsset?.system} · ${selectedAsset?.status}`}
        size="md"
      >
        {selectedAsset && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">Efficiency KPI</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">
                  {selectedAsset.efficiencyValue}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedAsset.efficiencyKpi}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1">vs Baseline</p>
                <Badge tone={baselineBadgeTone(selectedAsset.vsBaselineDirection)}>
                  {selectedAsset.vsBaseline}
                </Badge>
                {selectedAsset.estimatedLossUsd !== null && (
                  <p className="text-xs text-red-600 mt-2 font-semibold">
                    Est. loss: ${selectedAsset.estimatedLossUsd.toLocaleString()}/month
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Current energy</p>
                <p className="font-mono font-semibold text-gray-800">{selectedAsset.energyDisplay}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Runtime</p>
                <p className="font-medium text-gray-800">{selectedAsset.runtime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">System</p>
                <p className="font-medium text-gray-800">{selectedAsset.system}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Data level</p>
                <p className="font-medium text-gray-800">Level 2 + Level 3 (BMS)</p>
              </div>
            </div>

            {selectedAsset.alert && (
              <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-3 border border-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span>{selectedAsset.alert}</span>
              </div>
            )}

            <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              Baseline period: Jan–Mar 2026 (pre-intervention). Efficiency is operational
              only and not used for GHG reporting. Source: BMS / sub-meter · Level 2 + 3.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function EnergyManagement() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="space-y-6 pb-12">

      <PageHeader
        eyebrow="Smart Operations · Energy"
        title="Energy Management"
        subtitle="Electricity consumption, meter data, energy balance, and asset efficiency · Dubai Marina Hotel"
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="info">May 2026</Badge>
            <button className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
              Export report
            </button>
          </div>
        }
      />

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "meters" && <LiveMetersTab />}
      {activeTab === "balance" && <EnergyBalanceTab />}
      {activeTab === "peak" && <PeakDemandTab />}
      {activeTab === "assets" && <AssetEfficiencyTab />}
    </div>
  );
}
