import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Droplet,
  Info,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  TrendingDown,
  DollarSign,
  Activity,
  Thermometer,
  Wind,
  Wrench,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import KpiTile from "@/components/ui/KpiTile";
import { cn } from "@/lib/utils";

const ENERGY_BY_SYSTEM = [
  { label: "HVAC", pct: 58, color: "bg-blue-500" },
  { label: "Lighting", pct: 14, color: "bg-yellow-400" },
  { label: "Kitchen", pct: 12, color: "bg-orange-500" },
  { label: "Laundry", pct: 8, color: "bg-purple-500" },
  { label: "Other", pct: 8, color: "bg-gray-400" },
];

const WATER_BY_AREA = [
  { label: "Guestrooms", pct: 41, color: "bg-cyan-500" },
  { label: "Kitchen", pct: 22, color: "bg-orange-500" },
  { label: "Laundry", pct: 18, color: "bg-purple-500" },
  { label: "Irrigation", pct: 11, color: "bg-green-500" },
  { label: "Cooling tower", pct: 8, color: "bg-blue-400" },
];

const ALERT_SEVERITY = [
  { label: "Critical", count: 3, dot: "bg-bad", tone: "bad" as const },
  { label: "High", count: 2, dot: "bg-warn", tone: "warn" as const },
  { label: "Medium", count: 1, dot: "bg-info", tone: "info" as const },
  { label: "Low", count: 1, dot: "bg-good", tone: "good" as const },
];

const TOP_INEFFICIENT_ASSETS = [
  {
    name: "Chiller 01",
    issue: "COP 22% below baseline — compressor degradation suspected",
    loss: "$2,280/month",
    icon: Thermometer,
    severity: "bad" as const,
  },
  {
    name: "AHU-05",
    issue: "Running 4 hrs outside scheduled operation window",
    loss: "$571/month",
    icon: Wind,
    severity: "warn" as const,
  },
  {
    name: "Solar PV Array",
    issue: "Generating 31% below expected output — soiling likely",
    loss: "$449/month",
    icon: Zap,
    severity: "warn" as const,
  },
];

const RECENT_CRITICAL_ALERTS = [
  {
    id: "A001",
    severity: "Critical",
    title: "Chiller 01 COP dropped 22% below baseline",
    description: "Chiller coefficient of performance has degraded significantly. Likely compressor wear or refrigerant issue.",
    detected: "Today 06:12",
    category: "Energy",
    tone: "bad" as const,
  },
  {
    id: "A002",
    severity: "Critical",
    title: "Continuous night water flow — Zone 3 (leak suspected)",
    description: "Zone 3 water meter showing 0.8 m³/hr between 01:00–06:00. No scheduled usage. Likely pipe leak.",
    detected: "Today 02:47",
    category: "Water",
    tone: "bad" as const,
  },
  {
    id: "A003",
    severity: "Critical",
    title: "Electricity sub-meter offline — BOH area",
    description: "Back-of-house electrical sub-meter has been offline for 6+ hours. Data gap affecting verification.",
    detected: "Yesterday 22:15",
    category: "Data Quality",
    tone: "bad" as const,
  },
];

const OPEN_MAINTENANCE = [
  {
    id: "MA-041",
    title: "Chiller 01 — COP investigation & service",
    priority: "Critical",
    assignedTo: "Facilities Manager",
    status: "In Progress",
    statusTone: "info" as const,
    due: "Today",
  },
  {
    id: "MA-039",
    title: "Zone 3 water pipe leak inspection",
    priority: "High",
    assignedTo: "Plumbing Contractor",
    status: "Assigned",
    statusTone: "warn" as const,
    due: "Today",
  },
  {
    id: "MA-037",
    title: "AHU-05 schedule correction in BMS",
    priority: "Medium",
    assignedTo: "BMS Technician",
    status: "Acknowledged",
    statusTone: "neutral" as const,
    due: "Tomorrow",
  },
];

const SAVINGS_VERIFICATION = [
  { label: "Verified", count: 2, tone: "good" as const, amount: "$30,570" },
  { label: "Monitoring", count: 3, tone: "info" as const, amount: "$13,220" },
  { label: "Estimated", count: 4, tone: "neutral" as const, amount: "$5,820" },
];

function BreakdownBar({ items }: { items: { label: string; pct: number; color: string }[] }) {
  return (
    <div className="space-y-2 mt-3">
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn("h-full", item.color)}
            style={{ width: `${item.pct}%` }}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full shrink-0", item.color)} />
              <span className="text-[12px] text-ink-600">{item.label}</span>
            </div>
            <span className="text-[12px] font-medium text-ink-800">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSourcePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-100 px-2 py-[1px] text-[10px] font-medium text-brand-700">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
      {label}
    </span>
  );
}

function LastUpdated({ text }: { text: string }) {
  return (
    <span className="text-[11px] text-ink-400 flex items-center gap-1">
      <Clock size={10} />
      {text}
    </span>
  );
}

export default function SmartOpsOverview() {
  const navigate = useNavigate();
  const [_activeAlert, setActiveAlert] = useState<string | null>(null);

  return (
    <div className="page-container space-y-6">
      <PageHeader
        eyebrow="Smart Operations"
        title="Smart Operations"
        subtitle="Monitor energy, water, IAQ, and asset performance across hotel operations"
      />

      {/* Row 1 — Top KPI drill-down tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="cursor-pointer"
          onClick={() => navigate("/smart-ops/energy")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/smart-ops/energy")}
        >
          <KpiTile
            icon={<Zap size={18} />}
            iconBg="bg-pillar-energy/10 text-pillar-energy"
            label="Total energy this month"
            value="284,500"
            unit="kWh"
            delta={-8.2}
            deltaUnit="vs last month"
            goodDirection="down"
            caption="Live meter data · Updated 5 min ago"
            prominent
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => navigate("/smart-ops/water")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/smart-ops/water")}
        >
          <KpiTile
            icon={<Droplet size={18} />}
            iconBg="bg-pillar-water/10 text-pillar-water"
            label="Total water this month"
            value="8,420"
            unit="m³"
            delta={-3.1}
            deltaUnit="vs last month"
            goodDirection="down"
            caption="Live meter data · Updated 5 min ago"
            prominent
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => navigate("/smart-ops/alerts")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/smart-ops/alerts")}
        >
          <KpiTile
            icon={<AlertTriangle size={18} />}
            iconBg="bg-bad/10 text-bad"
            label="Active alerts"
            value="7"
            unit=""
            caption="3 critical require immediate action"
            prominent
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => navigate("/smart-ops/savings")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/smart-ops/savings")}
        >
          <KpiTile
            icon={<TrendingDown size={18} />}
            iconBg="bg-good/10 text-good"
            label="Verified savings YTD"
            value="$49,610"
            goodDirection="up"
            caption="Verified · 2 of 9 measures confirmed"
            prominent
          />
        </div>
      </div>

      {/* Row 2 — System breakdown cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Energy by system */}
        <Card level={2}>
          <CardHeader
            title="Energy by system"
            hint={<DataSourcePill label="Live meter data" />}
            right={<LastUpdated text="5 min ago" />}
          />
          <div className="px-6 pb-6">
            <BreakdownBar items={ENERGY_BY_SYSTEM} />
            <div className="mt-3 pt-3 border-t border-ink-100">
              <p className="text-[11px] text-ink-400">Total: 284,500 kWh this month</p>
            </div>
          </div>
        </Card>

        {/* Water by area */}
        <Card level={2}>
          <CardHeader
            title="Water by area"
            hint={<DataSourcePill label="Live meter data" />}
            right={<LastUpdated text="5 min ago" />}
          />
          <div className="px-6 pb-6">
            <BreakdownBar items={WATER_BY_AREA} />
            <div className="mt-3 pt-3 border-t border-ink-100">
              <p className="text-[11px] text-ink-400">Total: 8,420 m³ this month</p>
            </div>
          </div>
        </Card>

        {/* Alert severity breakdown */}
        <Card level={2}>
          <CardHeader
            title="Alert severity"
            hint="Active alerts by severity"
            right={
              <button
                className="text-[11px] text-brand-600 hover:text-brand-800 flex items-center gap-0.5 font-medium"
                onClick={() => navigate("/smart-ops/alerts")}
              >
                View all <ChevronRight size={12} />
              </button>
            }
          />
          <div className="px-6 pb-6 space-y-2 mt-3">
            {ALERT_SEVERITY.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1.5 border-b border-ink-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", item.dot)} />
                  <span className="text-[13px] text-ink-700">{item.label}</span>
                </div>
                <Badge tone={item.tone}>{item.count} alert{item.count !== 1 ? "s" : ""}</Badge>
              </div>
            ))}
            <div className="pt-2">
              <p className="text-[11px] text-ink-400">7 total active · 0 resolved today</p>
            </div>
          </div>
        </Card>

        {/* Top inefficient assets */}
        <Card level={2}>
          <CardHeader
            title="Top inefficient assets"
            hint={<DataSourcePill label="Sensor data" />}
            right={<LastUpdated text="15 min ago" />}
          />
          <div className="px-6 pb-6 space-y-3 mt-3">
            {TOP_INEFFICIENT_ASSETS.map((asset) => {
              const Icon = asset.icon;
              return (
                <div key={asset.name} className="flex items-start gap-3 py-2 border-b border-ink-50 last:border-0">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-bad/10 flex items-center justify-center">
                    <Icon size={13} className="text-bad" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-ink-900">{asset.name}</p>
                    <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{asset.issue}</p>
                    <p className="text-[11px] font-medium text-bad mt-1">{asset.loss} est. loss</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 3 — Alerts, maintenance, sensor health, savings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Recent critical alerts — spans 2 cols */}
        <Card level={2} className="lg:col-span-2">
          <CardHeader
            title="Recent critical alerts"
            hint="Last 3 requiring immediate action"
            right={
              <button
                className="text-[11px] text-brand-600 hover:text-brand-800 flex items-center gap-0.5 font-medium"
                onClick={() => navigate("/smart-ops/alerts")}
              >
                All alerts <ChevronRight size={12} />
              </button>
            }
          />
          <div className="px-6 pb-6 space-y-3 mt-3">
            {RECENT_CRITICAL_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-bad/20 bg-bad/5"
              >
                <AlertTriangle size={16} className="text-bad shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge tone="bad">Critical</Badge>
                    <Badge tone="neutral">{alert.category}</Badge>
                    <span className="text-[11px] text-ink-400 ml-auto">{alert.detected}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-ink-900 leading-snug">{alert.title}</p>
                  <p className="text-[11px] text-ink-500 mt-1 leading-snug">{alert.description}</p>
                  <button
                    className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-800 flex items-center gap-0.5"
                    onClick={() => {
                      setActiveAlert(alert.id);
                      navigate("/smart-ops/alerts");
                    }}
                  >
                    View details <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Open maintenance actions */}
        <Card level={2}>
          <CardHeader
            title="Open maintenance actions"
            hint="3 open · 1 in progress"
            right={
              <button
                className="text-[11px] text-brand-600 hover:text-brand-800 flex items-center gap-0.5 font-medium"
                onClick={() => navigate("/smart-ops/actions")}
              >
                View all <ChevronRight size={12} />
              </button>
            }
          />
          <div className="px-6 pb-6 space-y-3 mt-3">
            {OPEN_MAINTENANCE.map((action) => (
              <div key={action.id} className="py-2 border-b border-ink-50 last:border-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono text-ink-400">{action.id}</span>
                  <Badge tone={action.statusTone}>{action.status}</Badge>
                </div>
                <p className="text-[12px] font-semibold text-ink-900 leading-snug">{action.title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-ink-500">
                    <Wrench size={10} />
                    {action.assignedTo}
                  </div>
                  <span className="text-[11px] text-ink-400">Due: {action.due}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sensor health + savings verification stacked */}
        <div className="space-y-4">
          {/* Sensor health */}
          <Card level={2}>
            <CardHeader
              title="Sensor health"
              hint="84 devices total"
              right={
                <button
                  className="text-[11px] text-brand-600 hover:text-brand-800 flex items-center gap-0.5 font-medium"
                  onClick={() => navigate("/smart-ops/sensors")}
                >
                  Details <ChevronRight size={12} />
                </button>
              }
            />
            <div className="px-6 pb-4 mt-3 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-good/5 border border-good/20">
                <Wifi size={13} className="text-good" />
                <div>
                  <p className="text-[16px] font-bold text-good">76</p>
                  <p className="text-[10px] text-ink-500">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-bad/5 border border-bad/20">
                <WifiOff size={13} className="text-bad" />
                <div>
                  <p className="text-[16px] font-bold text-bad">4</p>
                  <p className="text-[10px] text-ink-500">Offline</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warn/5 border border-warn/20">
                <Clock size={13} className="text-warn" />
                <div>
                  <p className="text-[16px] font-bold text-warn">4</p>
                  <p className="text-[10px] text-ink-500">Delayed</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-ink-50 border border-ink-100">
                <Activity size={13} className="text-ink-500" />
                <div>
                  <p className="text-[16px] font-bold text-ink-700">90%</p>
                  <p className="text-[10px] text-ink-500">Health</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Savings verification status */}
          <Card level={2}>
            <CardHeader
              title="Savings verification"
              hint="9 measures tracked YTD"
              right={
                <button
                  className="text-[11px] text-brand-600 hover:text-brand-800 flex items-center gap-0.5 font-medium"
                  onClick={() => navigate("/smart-ops/savings")}
                >
                  View <ChevronRight size={12} />
                </button>
              }
            />
            <div className="px-6 pb-4 mt-3 space-y-2">
              {SAVINGS_VERIFICATION.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-ink-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {item.label === "Verified" && <CheckCircle2 size={12} className="text-good" />}
                    {item.label === "Monitoring" && <Activity size={12} className="text-info" />}
                    {item.label === "Estimated" && <Info size={12} className="text-ink-400" />}
                    <span className="text-[12px] text-ink-700">
                      {item.count} {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-ink-600">{item.amount}</span>
                    <Badge tone={item.tone}>{item.label}</Badge>
                  </div>
                </div>
              ))}
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-ink-800">
                  Total YTD: $49,610
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Data source key legend */}
      <Card level={3}>
        <div className="px-6 py-4">
          <div className="flex items-start gap-2 mb-3">
            <Info size={14} className="text-ink-400 shrink-0 mt-0.5" />
            <h4 className="text-[12px] font-semibold text-ink-700 uppercase tracking-wide">Data source key</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">L1</span>
                <span className="text-[12px] font-semibold text-ink-800">Official bill data</span>
              </div>
              <p className="text-[11px] text-ink-500 pl-7">Utility invoice data. Highest accuracy. Monthly granularity. Used for regulatory reporting and certification.</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-info/20 text-info flex items-center justify-center text-[10px] font-bold shrink-0">L2</span>
                <span className="text-[12px] font-semibold text-ink-800">Meter interval data</span>
              </div>
              <p className="text-[11px] text-ink-500 pl-7">15–60 min smart meter readings. High accuracy. Used for operational monitoring and demand analysis.</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-warn/20 text-warn flex items-center justify-center text-[10px] font-bold shrink-0">L3</span>
                <span className="text-[12px] font-semibold text-ink-800">Asset / sensor data</span>
              </div>
              <p className="text-[11px] text-ink-500 pl-7">BMS, IoT sensors, equipment telemetry. Real-time. Used for fault detection and performance benchmarking.</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-ink-100 flex items-center gap-2">
            <Cpu size={12} className="text-ink-400" />
            <p className="text-[11px] text-ink-400">
              Dubai Marina Hotel · 320 rooms · Data as of 06 May 2026, 10:30 GST
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
