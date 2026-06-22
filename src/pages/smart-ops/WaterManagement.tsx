import { useState } from "react";
import {
  Droplets,
  DollarSign,
  AlertTriangle,
  Activity,
  Eye,
  Waves,
  BarChart3,
  Thermometer,
  Filter,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  Gauge,
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ─── types ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "smart-meters" | "water-balance" | "leak-detection" | "water-actions";

interface Meter {
  name: string;
  area: string;
  reading: string;
  unit: string;
  status: "Live" | "Delayed" | "Live — ALERT";
  lastUpdate: string;
  completeness: string;
  alerts: string;
  calibrationDate: string;
  protocol: string;
  dailyTrend: number[];
  benchmark: string;
}

// ─── data ──────────────────────────────────────────────────────────────────

const DAILY_WATER_TREND = [
  278, 292, 285, 301, 296, 288, 274, 310, 298, 283, 295, 272, 304, 289,
];

const AREA_BREAKDOWN = [
  { label: "Guestrooms", pct: 41, color: "bg-blue-500" },
  { label: "Kitchen", pct: 22, color: "bg-emerald-500" },
  { label: "Laundry", pct: 18, color: "bg-violet-500" },
  { label: "Irrigation", pct: 11, color: "bg-amber-500" },
  { label: "Cooling Tower", pct: 8, color: "bg-cyan-500" },
];

const NIGHT_FLOW = [
  { day: "Day 1", value: 6.2, alert: false },
  { day: "Day 2", value: 6.8, alert: false },
  { day: "Day 3", value: 5.9, alert: false },
  { day: "Day 4", value: 7.1, alert: false },
  { day: "Day 5", value: 14.3, alert: true },
  { day: "Day 6", value: 14.1, alert: true },
  { day: "Day 7", value: 6.9, alert: false },
];

const METERS: Meter[] = [
  {
    name: "Main Water Meter (Incomer)",
    area: "Site",
    reading: "9.82",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "2 min ago",
    completeness: "100%",
    alerts: "—",
    calibrationDate: "15 Jan 2025",
    protocol: "Pulse / M-Bus",
    dailyTrend: [9.4, 9.7, 9.6, 9.8, 14.2, 14.0, 9.8],
    benchmark: "≤ 10.5 m³/hr avg (design capacity)",
  },
  {
    name: "Guestroom Zone A Meter",
    area: "Floors 1–8",
    reading: "1.84",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "5 min ago",
    completeness: "100%",
    alerts: "—",
    calibrationDate: "10 Jan 2025",
    protocol: "Pulse / M-Bus",
    dailyTrend: [1.7, 1.8, 1.9, 1.8, 1.7, 1.9, 1.8],
    benchmark: "≤ 2.0 m³/hr (zone design)",
  },
  {
    name: "Guestroom Zone B Meter",
    area: "Floors 9–16",
    reading: "2.12",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "5 min ago",
    completeness: "100%",
    alerts: "—",
    calibrationDate: "10 Jan 2025",
    protocol: "Pulse / M-Bus",
    dailyTrend: [2.0, 2.1, 2.0, 2.1, 8.4, 8.3, 2.1],
    benchmark: "≤ 2.2 m³/hr (zone design)",
  },
  {
    name: "Guestroom Zone C Meter",
    area: "Floors 17–22",
    reading: "1.68",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "5 min ago",
    completeness: "100%",
    alerts: "—",
    calibrationDate: "10 Jan 2025",
    protocol: "Pulse / M-Bus",
    dailyTrend: [1.6, 1.7, 1.6, 1.7, 1.6, 1.7, 1.7],
    benchmark: "≤ 1.8 m³/hr (zone design)",
  },
  {
    name: "Kitchen Water Meter",
    area: "Kitchen",
    reading: "1.92",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "2 min ago",
    completeness: "99%",
    alerts: "—",
    calibrationDate: "20 Jan 2025",
    protocol: "Pulse / RS-485",
    dailyTrend: [1.8, 1.9, 2.0, 1.9, 1.8, 1.9, 1.9],
    benchmark: "≤ 2.1 m³/hr (kitchen design)",
  },
  {
    name: "Laundry Water Meter",
    area: "Laundry",
    reading: "1.44",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "2 min ago",
    completeness: "100%",
    alerts: "—",
    calibrationDate: "12 Jan 2025",
    protocol: "Pulse / M-Bus",
    dailyTrend: [1.3, 1.4, 1.5, 1.4, 1.3, 1.4, 1.4],
    benchmark: "≤ 1.6 m³/hr (laundry design)",
  },
  {
    name: "Irrigation Meter",
    area: "External",
    reading: "0.82",
    unit: "m³/hr",
    status: "Delayed",
    lastUpdate: "22 min ago",
    completeness: "94%",
    alerts: "—",
    calibrationDate: "05 Feb 2025",
    protocol: "Pulse / Wireless",
    dailyTrend: [0.7, 0.8, 0.9, 0.8, 1.2, 1.2, 0.8],
    benchmark: "≤ 1.0 m³/hr (irrigation design)",
  },
  {
    name: "Cooling Tower Make-up",
    area: "Plant Room",
    reading: "0.68",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "5 min ago",
    completeness: "100%",
    alerts: "—",
    calibrationDate: "18 Jan 2025",
    protocol: "Pulse / M-Bus",
    dailyTrend: [0.6, 0.7, 0.7, 0.7, 0.6, 0.7, 0.7],
    benchmark: "≤ 0.9 m³/hr (CT design)",
  },
  {
    name: "Pool/Spa Meter",
    area: "Spa Level",
    reading: "0.28",
    unit: "m³/hr",
    status: "Live — ALERT",
    lastUpdate: "2 min ago",
    completeness: "100%",
    alerts: "Abnormal refill rate",
    calibrationDate: "22 Jan 2025",
    protocol: "Pulse / M-Bus",
    dailyTrend: [0.1, 0.1, 0.1, 0.1, 0.8, 0.8, 0.3],
    benchmark: "≤ 0.15 m³/hr (pool design)",
  },
  {
    name: "STP/Greywater Meter",
    area: "Basement",
    reading: "0.44",
    unit: "m³/hr",
    status: "Live",
    lastUpdate: "10 min ago",
    completeness: "97%",
    alerts: "—",
    calibrationDate: "08 Feb 2025",
    protocol: "Pulse / RS-485",
    dailyTrend: [0.4, 0.4, 0.5, 0.4, 0.4, 0.4, 0.4],
    benchmark: "≤ 0.6 m³/hr (STP design)",
  },
];

const LEAK_ALERTS = [
  {
    id: 1,
    zone: "Zone 3 – Floors 9–16",
    meter: "Guestroom Zone B",
    type: "Continuous night flow",
    lossPerHr: "8.4 m³/hr",
    duration: "36 hrs",
    totalLoss: "302 m³",
    cost: "$411",
    severity: "Critical",
    status: "Active",
    action: "Investigate",
  },
  {
    id: 2,
    zone: "Pool/Spa",
    meter: "Pool Meter",
    type: "Abnormal refill rate",
    lossPerHr: "0.8 m³/hr",
    duration: "12 hrs",
    totalLoss: "9.6 m³",
    cost: "$13",
    severity: "Low",
    status: "Active",
    action: "Monitor",
  },
  {
    id: 3,
    zone: "Irrigation Zone 2",
    meter: "Irrigation Meter",
    type: "Flow during non-operational hrs",
    lossPerHr: "1.2 m³/hr",
    duration: "4 hrs",
    totalLoss: "4.8 m³",
    cost: "$7",
    severity: "Resolved",
    status: "Closed",
    action: "—",
  },
  {
    id: 4,
    zone: "Guest WC Block",
    meter: "Zone A",
    type: "Continuous drip",
    lossPerHr: "0.2 m³/hr",
    duration: "72 hrs",
    totalLoss: "14.4 m³",
    cost: "$20",
    severity: "Resolved",
    status: "Closed",
    action: "—",
  },
  {
    id: 5,
    zone: "Kitchen cold line",
    meter: "Kitchen",
    type: "Pressure drop + flow",
    lossPerHr: "0.4 m³/hr",
    duration: "18 hrs",
    totalLoss: "7.2 m³",
    cost: "$10",
    severity: "Resolved",
    status: "Closed",
    action: "—",
  },
];

const WATER_ACTIONS = [
  {
    id: 1,
    title: "Fix Zone 3 continuous night flow",
    description: "Estimated saving 8.4 m³/hr if confirmed leak is repaired.",
    priority: "Critical",
    saving: "8.4 m³/hr",
    savingUnit: "if confirmed",
    category: "Leak Repair",
  },
  {
    id: 2,
    title: "Inspect Pool/Spa makeup valve",
    description: "Abnormal refill rate of 0.8 m³/hr detected. Check for stuck open valve.",
    priority: "Low",
    saving: "0.8 m³/hr",
    savingUnit: "est.",
    category: "Maintenance",
  },
  {
    id: 3,
    title: "Install aerators in Zone B bathrooms",
    description: "Flow-restricting aerators on taps and showers can reduce guest room consumption.",
    priority: "Medium",
    saving: "18 m³/month",
    savingUnit: "est.",
    category: "Efficiency",
  },
  {
    id: 4,
    title: "Reduce kitchen water pressure from 4 bar to 3 bar",
    description: "Pressure reduction reduces flow from pre-rinse sprayers and tap fittings.",
    priority: "Medium",
    saving: "8 m³/month",
    savingUnit: "est.",
    category: "Efficiency",
  },
  {
    id: 5,
    title: "Review irrigation schedule (currently running overnight)",
    description: "Overnight irrigation causes unmeasured losses and inflates night flow baseline.",
    priority: "Medium",
    saving: "12 m³/month",
    savingUnit: "est.",
    category: "Scheduling",
  },
];

// ─── sub-components ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === "Live") return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />;
  if (status === "Delayed") return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5" />;
  if (status === "Live — ALERT") return <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-neutral-400 mr-1.5" />;
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "Critical") return <Badge tone="bad">{severity}</Badge>;
  if (severity === "Low") return <Badge tone="info">{severity}</Badge>;
  if (severity === "Medium") return <Badge tone="warn">{severity}</Badge>;
  if (severity === "Resolved") return <Badge tone="good">{severity}</Badge>;
  return <Badge tone="neutral">{severity}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "Critical") return <Badge tone="bad">{priority}</Badge>;
  if (priority === "Medium") return <Badge tone="warn">{priority}</Badge>;
  if (priority === "Low") return <Badge tone="info">{priority}</Badge>;
  return <Badge tone="neutral">{priority}</Badge>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-end gap-0.5 h-12">
      <div
        className={cn("w-full rounded-t transition-all", color)}
        style={{ height: `${pct}%` }}
      />
    </div>
  );
}

function MeterModal({ meter, open, onClose }: { meter: Meter | null; open: boolean; onClose: () => void }) {
  if (!meter) return null;
  const maxVal = Math.max(...meter.dailyTrend) * 1.2;
  return (
    <Modal open={open} onClose={onClose} title={meter.name} subtitle={`Area: ${meter.area}`} size="lg">
      <div className="space-y-5">
        {/* 7-day trend */}
        <div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">7-Day Consumption Trend</p>
          <div className="flex items-end gap-1 h-24 bg-neutral-50 rounded-lg p-3">
            {meter.dailyTrend.map((v, i) => {
              const pct = Math.round((v / maxVal) * 100);
              const isAlert = v > 4 && meter.name.includes("Zone B") && (i === 4 || i === 5);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-neutral-400">{v}</span>
                  <div
                    className={cn("w-full rounded-t", isAlert ? "bg-red-400" : "bg-blue-400")}
                    style={{ height: `${pct}%` }}
                  />
                  <span className="text-[9px] text-neutral-400">D{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Latest Reading</p>
            <p className="text-lg font-semibold text-neutral-800">{meter.reading} <span className="text-xs text-neutral-500">{meter.unit}</span></p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Data Completeness</p>
            <p className="text-lg font-semibold text-neutral-800">{meter.completeness}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Calibration Date</p>
            <p className="text-sm font-medium text-neutral-800">{meter.calibrationDate}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Protocol</p>
            <p className="text-sm font-medium text-neutral-800">{meter.protocol}</p>
          </div>
        </div>

        {/* benchmark */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Benchmark</p>
          <p className="text-sm text-blue-800">{meter.benchmark}</p>
        </div>

        {/* alerts */}
        {meter.alerts !== "—" && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{meter.alerts}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── tab content components ──────────────────────────────────────────────────

function OverviewTab() {
  const maxDaily = Math.max(...DAILY_WATER_TREND) * 1.1;

  return (
    <div className="space-y-6">
      {/* alert banner */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">2 active water alerts</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Continuous night flow detected Zone 3 (Critical) · Pool makeup water abnormal (Low)
          </p>
        </div>
      </div>

      {/* primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={<Droplets size={20} />}
          iconBg="bg-blue-100"
          label="Total Water Consumed"
          value="8,420"
          unit="m³"
          delta={-3.1}
          deltaUnit="% vs last month"
          goodDirection="down"
          caption="Source: Level 2 — Smart meter"
        />
        <KpiTile
          icon={<DollarSign size={20} />}
          iconBg="bg-emerald-100"
          label="Water Cost"
          value="$11,450"
          delta={-2.8}
          deltaUnit="% vs last month"
          goodDirection="down"
        />
        <KpiTile
          icon={<Gauge size={20} />}
          iconBg="bg-violet-100"
          label="L / Guest Night"
          value="284"
          unit="L"
          delta={-4.2}
          deltaUnit="% vs last month"
          goodDirection="down"
          caption="AHLA target: 250 L"
        />
        <KpiTile
          icon={<Gauge size={20} />}
          iconBg="bg-cyan-100"
          label="L / Occupied Room Night"
          value="312"
          unit="L"
          delta={-3.1}
          deltaUnit="% vs last month"
          goodDirection="down"
        />
      </div>

      {/* secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={<Filter size={20} />}
          iconBg="bg-teal-100"
          label="L / kg Laundry"
          value="14.2"
          unit="L"
          delta={-1.8}
          deltaUnit="% vs last month"
          goodDirection="down"
        />
        <KpiTile
          icon={<Thermometer size={20} />}
          iconBg="bg-orange-100"
          label="L / F&B Cover"
          value="18.5"
          unit="L"
          caption="Normal"
        />
        <KpiTile
          icon={<Activity size={20} />}
          iconBg="bg-sky-100"
          label="Cooling Tower Make-up"
          value="820"
          unit="m³"
          caption="8.2% of total"
        />
        <KpiTile
          icon={<AlertTriangle size={20} />}
          iconBg="bg-amber-100"
          label="Estimated Water Loss"
          value="142"
          unit="m³"
          caption="$193 estimated cost"
        />
      </div>

      {/* charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 14-day daily trend */}
        <Card className="p-5">
          <p className="text-sm font-semibold text-neutral-700 mb-4">14-Day Daily Water Consumption</p>
          <div className="flex items-end gap-1 h-36 bg-neutral-50 rounded-lg p-3">
            {DAILY_WATER_TREND.map((v, i) => {
              const pct = Math.round((v / maxDaily) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-blue-400 hover:bg-blue-500 transition-colors"
                    style={{ height: `${pct}%` }}
                    title={`${v} m³`}
                  />
                  {i % 2 === 0 && (
                    <span className="text-[9px] text-neutral-400">D{i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-neutral-400">Min: {Math.min(...DAILY_WATER_TREND)} m³</span>
            <span className="text-xs text-neutral-400">Max: {Math.max(...DAILY_WATER_TREND)} m³</span>
            <span className="text-xs text-neutral-400">Avg: {Math.round(DAILY_WATER_TREND.reduce((a, b) => a + b, 0) / DAILY_WATER_TREND.length)} m³/day</span>
          </div>
        </Card>

        {/* water by area */}
        <Card className="p-5">
          <p className="text-sm font-semibold text-neutral-700 mb-4">Water Consumption by Area</p>
          <div className="space-y-3">
            {AREA_BREAKDOWN.map((area) => (
              <div key={area.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-700">{area.label}</span>
                  <span className="font-medium text-neutral-800">{area.pct}%</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-3">
                  <div
                    className={cn("h-3 rounded-full transition-all", area.color)}
                    style={{ width: `${area.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* night flow chart */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-neutral-700">Night Flow Trend (00:00–05:00)</p>
            <p className="text-xs text-neutral-500 mt-0.5">7-day — baseline 8 m³/hr alert band</p>
          </div>
          <Badge tone="bad">2 Alert Days</Badge>
        </div>
        <div className="flex items-end gap-2 h-32 bg-neutral-50 rounded-lg p-4 relative">
          {/* alert band line at ~57% (8/14 * 100) */}
          <div className="absolute left-4 right-4" style={{ bottom: `calc(${Math.round((8 / 16) * 100)}% + 1rem)` }}>
            <div className="border-t border-dashed border-amber-400 w-full" />
            <span className="text-[9px] text-amber-600 absolute right-0 -top-3">Alert: 8 m³/hr</span>
          </div>
          {NIGHT_FLOW.map((d, i) => {
            const pct = Math.round((d.value / 16) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-neutral-500">{d.value}</span>
                <div
                  className={cn("w-full rounded-t transition-colors", d.alert ? "bg-red-400" : "bg-blue-400")}
                  style={{ height: `${pct}%` }}
                  title={`${d.day}: ${d.value} m³/hr`}
                />
                <span className="text-[9px] text-neutral-400">{d.day.replace("Day ", "D")}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-400" />
            <span className="text-xs text-neutral-500">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <span className="text-xs text-neutral-500">Alert (above 8 m³/hr baseline)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SmartMetersTab() {
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{METERS.length} meters · Last data refresh: 2 min ago</p>
        <Badge tone="good">10 / 10 configured</Badge>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">Meter Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Area</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">Latest Reading</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">Last Update</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">Data Completeness</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Alerts</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {METERS.map((meter) => (
                <tr
                  key={meter.name}
                  className={cn(
                    "hover:bg-neutral-50 transition-colors",
                    meter.alerts !== "—" && "bg-red-50 hover:bg-red-50"
                  )}
                >
                  <td className="px-4 py-3 font-medium text-neutral-800 whitespace-nowrap">{meter.name}</td>
                  <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{meter.area}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-neutral-800 whitespace-nowrap">
                    {meter.reading} <span className="text-neutral-400 font-normal">{meter.unit}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <StatusDot status={meter.status} />
                      <span className={cn(
                        "text-xs",
                        meter.status === "Live — ALERT" ? "text-red-600 font-medium" :
                        meter.status === "Delayed" ? "text-amber-600" :
                        "text-emerald-600"
                      )}>{meter.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">{meter.lastUpdate}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "text-xs font-medium",
                      parseInt(meter.completeness) < 97 ? "text-amber-600" : "text-emerald-600"
                    )}>{meter.completeness}</span>
                  </td>
                  <td className="px-4 py-3">
                    {meter.alerts !== "—" ? (
                      <span className="text-xs text-red-600 font-medium">{meter.alerts}</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedMeter(meter)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
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
      </Card>

      <MeterModal meter={selectedMeter} open={!!selectedMeter} onClose={() => setSelectedMeter(null)} />
    </div>
  );
}

function WaterBalanceTab() {
  const BALANCE_ROWS = [
    { label: "Guestrooms", m3: 3452, pct: 41.0, benchmark: "35–42%", benchmarkOk: true },
    { label: "Kitchen", m3: 1852, pct: 22.0, benchmark: "18–24%", benchmarkOk: true },
    { label: "Laundry", m3: 1516, pct: 18.0, benchmark: "15–20%", benchmarkOk: true },
    { label: "Irrigation", m3: 927, pct: 11.0, benchmark: "8–13%", benchmarkOk: true },
    { label: "Cooling Tower", m3: 673, pct: 8.0, benchmark: "6–10%", benchmarkOk: true },
  ];

  return (
    <div className="space-y-5">
      {/* coverage notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Sub-meter coverage: 100% for all major areas</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Greywater recycling offsets 142 m³/month from irrigation. Unallocated water: 0 m³.
          </p>
        </div>
      </div>

      {/* main meter */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Main Meter Total</p>
            <p className="text-3xl font-bold text-neutral-800 mt-1">8,420 <span className="text-base font-normal text-neutral-500">m³/month</span></p>
          </div>
          <Badge tone="good">100% Metered</Badge>
        </div>

        <div className="space-y-4">
          {BALANCE_ROWS.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-neutral-700">{row.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-500 text-xs">Benchmark: {row.benchmark}</span>
                  <span className="font-semibold text-neutral-800">{row.m3.toLocaleString()} m³</span>
                  <span className="text-neutral-500 w-10 text-right">{row.pct}%</span>
                  {row.benchmarkOk
                    ? <Badge tone="good">OK</Badge>
                    : <Badge tone="warn">Review</Badge>}
                </div>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* greywater offset */}
        <div className="mt-5 pt-4 border-t border-neutral-100 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Greywater Recycled</span>
              <Badge tone="good">Offset</Badge>
            </div>
            <span className="text-sm font-semibold text-emerald-600">–142 m³</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">Unallocated</span>
            <span className="text-sm font-medium text-neutral-500">0 m³</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
            <span className="text-sm font-semibold text-neutral-700">Net Consumption</span>
            <span className="text-sm font-bold text-neutral-800">8,278 m³</span>
          </div>
        </div>
      </Card>

      {/* sankey-style summary */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-neutral-700 mb-4">Balance Summary</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium">Main Meter In</p>
            <p className="text-xl font-bold text-blue-800 mt-1">8,420 m³</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-xs text-emerald-600 font-medium">Sub-meters Total</p>
            <p className="text-xl font-bold text-emerald-800 mt-1">8,420 m³</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-xs text-neutral-600 font-medium">Unaccounted</p>
            <p className="text-xl font-bold text-neutral-800 mt-1">0 m³</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LeakDetectionTab() {
  const NIGHT_FLOW_7DAY = [
    { hour: "00:00", values: [5.8, 6.1, 5.9, 6.2, 14.4, 14.1, 5.8] },
    { hour: "01:00", values: [5.6, 6.0, 5.8, 6.0, 14.3, 13.9, 6.0] },
    { hour: "02:00", values: [5.7, 5.9, 5.9, 5.9, 14.1, 14.0, 6.1] },
    { hour: "03:00", values: [5.9, 6.1, 6.0, 6.1, 14.2, 14.2, 5.9] },
    { hour: "04:00", values: [6.0, 6.2, 6.1, 6.3, 14.3, 14.3, 6.2] },
    { hour: "05:00", values: [5.8, 6.0, 5.9, 6.1, 14.0, 13.8, 6.0] },
  ];
  const flatValues = NIGHT_FLOW_7DAY.flatMap((r) => r.values);
  const maxVal = Math.max(...flatValues) * 1.1;
  const dayLabels = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];

  return (
    <div className="space-y-5">
      {/* header KPIs */}
      <p className="text-sm font-semibold text-neutral-600">Active leak alerts and night flow analysis</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Baseline Night Flow (00:00–05:00)</p>
          <p className="text-xl font-bold text-neutral-700 mt-1">5.8 <span className="text-sm font-normal">m³/hr</span></p>
          <p className="text-xs text-neutral-400 mt-0.5">Expected</p>
        </Card>
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-xs text-red-600">Current Night Flow</p>
          <p className="text-xl font-bold text-red-700 mt-1">14.2 <span className="text-sm font-normal">m³/hr</span></p>
          <p className="text-xs text-red-500 mt-0.5">Alert — +8.4 m³/hr above baseline</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Duration</p>
          <p className="text-xl font-bold text-amber-700 mt-1">36 hrs</p>
          <p className="text-xs text-neutral-400 mt-0.5">Zone 3 Guestrooms</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Estimated Loss</p>
          <p className="text-xl font-bold text-neutral-800 mt-1">302 m³</p>
          <p className="text-xs text-red-500 mt-0.5">$411</p>
        </Card>
      </div>

      {/* night flow chart */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-neutral-700 mb-1">Night Flow (00:00–05:00) — Hourly by Day</p>
        <p className="text-xs text-neutral-500 mb-4">Red bars indicate values above 8 m³/hr alert threshold</p>
        <div className="space-y-2">
          {NIGHT_FLOW_7DAY.map((row) => (
            <div key={row.hour} className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 w-10 flex-shrink-0">{row.hour}</span>
              <div className="flex flex-1 items-end gap-1 h-8">
                {row.values.map((v, i) => {
                  const pct = Math.round((v / maxVal) * 100);
                  const isAlert = v > 8;
                  return (
                    <div key={i} className="flex-1 flex items-end">
                      <div
                        className={cn("w-full rounded-sm", isAlert ? "bg-red-400" : "bg-blue-300")}
                        style={{ height: `${pct}%` }}
                        title={`${dayLabels[i]} ${row.hour}: ${v} m³/hr`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1">
            <span className="w-10 flex-shrink-0" />
            <div className="flex flex-1 gap-1">
              {dayLabels.map((d, i) => (
                <div key={i} className="flex-1 text-center text-[9px] text-neutral-400">{d}</div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* leak alert table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <p className="text-sm font-semibold text-neutral-700">Leak Alert Log</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {["Zone", "Meter", "Type", "Est. Loss/hr", "Duration", "Total Loss", "Cost", "Severity", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {LEAK_ALERTS.map((alert) => (
                <tr
                  key={alert.id}
                  className={cn(
                    "hover:bg-neutral-50 transition-colors",
                    alert.status === "Active" && alert.severity === "Critical" && "bg-red-50 hover:bg-red-50",
                    alert.status === "Closed" && "opacity-60"
                  )}
                >
                  <td className="px-3 py-3 font-medium text-neutral-800 whitespace-nowrap text-xs">{alert.zone}</td>
                  <td className="px-3 py-3 text-neutral-600 text-xs whitespace-nowrap">{alert.meter}</td>
                  <td className="px-3 py-3 text-neutral-600 text-xs whitespace-nowrap">{alert.type}</td>
                  <td className="px-3 py-3 font-mono text-xs text-neutral-700 whitespace-nowrap">{alert.lossPerHr}</td>
                  <td className="px-3 py-3 text-xs text-neutral-600 whitespace-nowrap">{alert.duration}</td>
                  <td className="px-3 py-3 font-mono text-xs font-medium text-neutral-800 whitespace-nowrap">{alert.totalLoss}</td>
                  <td className="px-3 py-3 text-xs text-neutral-700 whitespace-nowrap">{alert.cost}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {alert.status === "Active"
                      ? <Badge tone="bad">Active</Badge>
                      : <Badge tone="neutral">Closed</Badge>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {alert.action !== "—" ? (
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">{alert.action}</button>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* disclaimer */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Activity className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Continuous night flow is a strong indicator of a water leak. Hotel Optimizer flags this for investigation —
          root cause must be confirmed on site by engineering or maintenance staff.
        </p>
      </div>
    </div>
  );
}

function WaterActionsTab() {
  const priorityOrder: Record<string, number> = { Critical: 0, Medium: 1, Low: 2 };
  const sorted = [...WATER_ACTIONS].sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{WATER_ACTIONS.length} recommended water actions</p>
        <div className="flex items-center gap-2">
          <Badge tone="bad">1 Critical</Badge>
          <Badge tone="warn">3 Medium</Badge>
          <Badge tone="info">1 Low</Badge>
        </div>
      </div>

      {sorted.map((action) => (
        <Card key={action.id} className={cn(
          "p-5 border-l-4",
          action.priority === "Critical" && "border-l-red-500",
          action.priority === "Medium" && "border-l-amber-400",
          action.priority === "Low" && "border-l-blue-400"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <PriorityBadge priority={action.priority} />
                <Badge tone="neutral">{action.category}</Badge>
              </div>
              <p className="text-sm font-semibold text-neutral-800 mt-2">{action.title}</p>
              <p className="text-xs text-neutral-500 mt-1">{action.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-neutral-500">Est. saving</p>
              <p className="text-base font-bold text-emerald-700">{action.saving}</p>
              <p className="text-xs text-neutral-400">{action.savingUnit}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Action
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
              Dismiss
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "smart-meters", label: "Smart Meters" },
  { id: "water-balance", label: "Water Balance" },
  { id: "leak-detection", label: "Leak Detection" },
  { id: "water-actions", label: "Water Actions" },
];

export default function WaterManagement() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <PageHeader
          eyebrow="Smart Operations · Water"
          title="Water Management"
          subtitle="Consumption, meter data, water balance, and leak detection · Skyline Dubai"
        />

        {/* tab navigation */}
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* tab content */}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "smart-meters" && <SmartMetersTab />}
        {activeTab === "water-balance" && <WaterBalanceTab />}
        {activeTab === "leak-detection" && <LeakDetectionTab />}
        {activeTab === "water-actions" && <WaterActionsTab />}
      </div>
    </div>
  );
}
