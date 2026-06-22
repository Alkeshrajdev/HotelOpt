import { useState } from "react";
import {
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  Activity,
  Eye,
  CheckCircle,
  Clock,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Gauge,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "zone-map" | "co2-ventilation" | "temp-humidity" | "alerts";

interface ZoneRow {
  zone: string;
  status: "Good" | "Warn" | "ALERT";
  co2: string;
  co2Flag?: boolean;
  temp: string;
  tempFlag?: boolean;
  rh: string;
  rhFlag?: boolean;
  pm25: string;
  pm25Flag?: boolean;
  sensors: string;
  floor: string;
  ahu: string;
  alertCount: number;
  occupancy: "Occupied" | "Unoccupied" | "Unknown";
  tvoc?: string;
}

interface IaqAlert {
  id: number;
  zone: string;
  type: string;
  current: string;
  threshold: string;
  duration: string;
  severity: "High" | "Medium" | "Low" | "Info";
  status: "Active" | "Monitoring";
  action: string;
}

// ─── data ─────────────────────────────────────────────────────────────────────

const ZONES: ZoneRow[] = [
  {
    zone: "Lobby",
    status: "Good",
    co2: "520 ppm",
    temp: "23.2°C",
    rh: "52%",
    pm25: "8 μg/m³",
    sensors: "4/4 online",
    floor: "Ground",
    ahu: "AHU-01",
    alertCount: 0,
    occupancy: "Occupied",
  },
  {
    zone: "Guestrooms (avg)",
    status: "Good",
    co2: "480 ppm",
    temp: "22.8°C",
    rh: "51%",
    pm25: "6 μg/m³",
    sensors: "18/20 online",
    floor: "Floors 1–22",
    ahu: "FCU (per room)",
    alertCount: 2,
    occupancy: "Occupied",
    tvoc: "< 0.3 mg/m³",
  },
  {
    zone: "Meeting Room A",
    status: "Good",
    co2: "680 ppm",
    temp: "23.5°C",
    rh: "53%",
    pm25: "7 μg/m³",
    sensors: "2/2 online",
    floor: "Floor 2",
    ahu: "AHU-03",
    alertCount: 0,
    occupancy: "Unoccupied",
  },
  {
    zone: "Meeting Room B",
    status: "ALERT",
    co2: "1,240 ppm",
    co2Flag: true,
    temp: "24.1°C",
    rh: "58%",
    rhFlag: true,
    pm25: "9 μg/m³",
    sensors: "2/2 online",
    floor: "Floor 2",
    ahu: "AHU-03",
    alertCount: 1,
    occupancy: "Occupied",
  },
  {
    zone: "Restaurant",
    status: "Good",
    co2: "610 ppm",
    temp: "22.4°C",
    rh: "54%",
    pm25: "12 μg/m³",
    sensors: "3/3 online",
    floor: "Ground",
    ahu: "AHU-02",
    alertCount: 0,
    occupancy: "Occupied",
  },
  {
    zone: "Gym",
    status: "Warn",
    co2: "890 ppm",
    temp: "25.8°C",
    tempFlag: true,
    rh: "61%",
    rhFlag: true,
    pm25: "15 μg/m³",
    sensors: "2/2 online",
    floor: "Floor 3",
    ahu: "AHU-07",
    alertCount: 1,
    occupancy: "Occupied",
  },
  {
    zone: "Spa",
    status: "Good",
    co2: "440 ppm",
    temp: "26.2°C",
    rh: "65%",
    pm25: "5 μg/m³",
    sensors: "2/2 online",
    floor: "Floor 3",
    ahu: "AHU-08",
    alertCount: 0,
    occupancy: "Occupied",
    tvoc: "< 0.2 mg/m³",
  },
  {
    zone: "Kitchen",
    status: "Warn",
    co2: "720 ppm",
    temp: "28.4°C",
    tempFlag: true,
    rh: "62%",
    pm25: "38 μg/m³",
    pm25Flag: true,
    sensors: "2/2 online",
    floor: "Ground",
    ahu: "AHU-04",
    alertCount: 1,
    occupancy: "Occupied",
  },
  {
    zone: "Back-of-house",
    status: "Warn",
    co2: "640 ppm",
    temp: "26.8°C",
    rh: "55%",
    pm25: "22 μg/m³",
    sensors: "3/3 online",
    floor: "Basement",
    ahu: "AHU-05",
    alertCount: 0,
    occupancy: "Occupied",
  },
  {
    zone: "Offices",
    status: "Good",
    co2: "510 ppm",
    temp: "22.9°C",
    rh: "50%",
    pm25: "7 μg/m³",
    sensors: "2/2 online",
    floor: "Floor 1",
    ahu: "AHU-06",
    alertCount: 0,
    occupancy: "Occupied",
  },
];

const IAQ_ALERTS: IaqAlert[] = [
  {
    id: 1,
    zone: "Meeting Room B",
    type: "CO₂ exceedance",
    current: "1,240 ppm",
    threshold: "> 1,000 ppm",
    duration: "3.2 hrs",
    severity: "High",
    status: "Active",
    action: "Increase ventilation",
  },
  {
    id: 2,
    zone: "Gym",
    type: "High humidity",
    current: "61% RH",
    threshold: "> 60% RH",
    duration: "45 min",
    severity: "Medium",
    status: "Active",
    action: "Check AHU-07",
  },
  {
    id: 3,
    zone: "Kitchen",
    type: "PM2.5 elevated",
    current: "38 μg/m³",
    threshold: "> 25 μg/m³",
    duration: "2.1 hrs",
    severity: "Medium",
    status: "Active",
    action: "Check exhaust fan",
  },
  {
    id: 4,
    zone: "Lobby",
    type: "Sensor offline",
    current: "N/A",
    threshold: "—",
    duration: "4.5 hrs",
    severity: "Low",
    status: "Active",
    action: "Check sensor connection",
  },
  {
    id: 5,
    zone: "Guestroom 1204",
    type: "Sensor offline",
    current: "N/A",
    threshold: "—",
    duration: "2.1 hrs",
    severity: "Low",
    status: "Active",
    action: "Replace battery",
  },
  {
    id: 6,
    zone: "Guestroom 0807",
    type: "Sensor offline",
    current: "N/A",
    threshold: "—",
    duration: "6.8 hrs",
    severity: "Low",
    status: "Active",
    action: "Investigate",
  },
  {
    id: 7,
    zone: "Restaurant",
    type: "Temperature rising",
    current: "23.8°C",
    threshold: "> 24°C (approaching)",
    duration: "—",
    severity: "Info",
    status: "Monitoring",
    action: "Watch AHU-02",
  },
];

// 14-day CO₂ trend data (3 zones)
const CO2_TREND = {
  labels: Array.from({ length: 14 }, (_, i) => `D${i + 1}`),
  "Meeting Room B": [620, 640, 590, 680, 710, 650, 720, 690, 730, 760, 800, 1240, 1240, 1240],
  Gym: [720, 780, 700, 810, 850, 870, 910, 880, 920, 950, 860, 890, 890, 890],
  Lobby: [490, 510, 480, 520, 540, 510, 530, 500, 520, 540, 510, 520, 520, 520],
};

// ─── helper components ────────────────────────────────────────────────────────

function StatusDot({ status }: { status: "Good" | "Warn" | "ALERT" }) {
  return (
    <span className={cn(
      "inline-block w-2.5 h-2.5 rounded-full flex-shrink-0",
      status === "Good" && "bg-emerald-500",
      status === "Warn" && "bg-amber-400",
      status === "ALERT" && "bg-red-500 animate-pulse"
    )} />
  );
}

function SeverityBadge({ severity }: { severity: IaqAlert["severity"] }) {
  if (severity === "High") return <Badge tone="bad">High</Badge>;
  if (severity === "Medium") return <Badge tone="warn">Medium</Badge>;
  if (severity === "Low") return <Badge tone="info">Low</Badge>;
  return <Badge tone="neutral">Info</Badge>;
}

function FlagValue({ value, flagged }: { value: string; flagged?: boolean }) {
  return (
    <span className={cn("text-xs", flagged ? "text-red-600 font-semibold" : "text-neutral-700")}>
      {value}{flagged ? " ↑" : ""}
    </span>
  );
}

function Co2Bar({ value, max = 1400 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color =
    value < 800 ? "bg-emerald-400" :
    value < 1000 ? "bg-amber-400" :
    value < 1500 ? "bg-orange-500" :
    "bg-red-500";
  return (
    <div className="w-full bg-neutral-100 rounded-full h-2">
      <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── tab content ──────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiTile
          icon={<Activity size={20} />}
          iconBg="bg-amber-100"
          label="IAQ Compliance"
          value="91.2"
          unit="%"
          delta={-2.1}
          deltaUnit=" pts vs last week"
          goodDirection="up"
          caption="% of monitored zone-hours"
        />
        <KpiTile
          icon={<Thermometer size={20} />}
          iconBg="bg-blue-100"
          label="Comfort Compliance"
          value="94.8"
          unit="%"
          delta={-0.8}
          deltaUnit=" pts vs last week"
          goodDirection="up"
        />
        <KpiTile
          icon={<Wind size={20} />}
          iconBg="bg-violet-100"
          label="CO₂ Exceedance Hours"
          value="14"
          unit="hrs"
          caption="Zones > 1,000 ppm this week"
          goodDirection="down"
        />
        <KpiTile
          icon={<AlertTriangle size={20} />}
          iconBg="bg-red-100"
          label="Active IAQ Alerts"
          value="4"
          caption="1 High · 3 Medium"
        />
        <KpiTile
          icon={<WifiOff size={20} />}
          iconBg="bg-neutral-100"
          label="Offline Sensors"
          value="3"
          unit="of 42"
          caption="Requires attention"
        />
      </div>

      {/* secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={<Gauge size={20} />}
          iconBg="bg-orange-100"
          label="PM2.5 Exceedance"
          value="2"
          unit="hrs"
          caption="This week"
          goodDirection="down"
        />
        <KpiTile
          icon={<Zap size={20} />}
          iconBg="bg-emerald-100"
          label="TVOC Alerts"
          value="0"
          caption="This week"
          goodDirection="down"
        />
        <KpiTile
          icon={<Thermometer size={20} />}
          iconBg="bg-amber-100"
          label="Temp Out-of-Band"
          value="8"
          unit="zone-hrs"
          caption="This week"
          goodDirection="down"
        />
        <KpiTile
          icon={<Droplets size={20} />}
          iconBg="bg-cyan-100"
          label="Humidity Out-of-Range"
          value="3"
          unit="zone-hrs"
          caption="This week"
          goodDirection="down"
        />
      </div>

      {/* zone compliance table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <p className="text-sm font-semibold text-neutral-700">Zone Compliance Overview</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {["Zone", "Status", "CO₂", "Temp", "RH", "PM2.5", "Sensors"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ZONES.map((z) => (
                <tr
                  key={z.zone}
                  className={cn(
                    "hover:bg-neutral-50 transition-colors",
                    z.status === "ALERT" && "bg-red-50 hover:bg-red-50"
                  )}
                >
                  <td className="px-4 py-3 font-medium text-neutral-800 whitespace-nowrap text-xs">{z.zone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={z.status} />
                      <span className={cn(
                        "text-xs font-medium",
                        z.status === "Good" && "text-emerald-700",
                        z.status === "Warn" && "text-amber-700",
                        z.status === "ALERT" && "text-red-700"
                      )}>{z.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><FlagValue value={z.co2} flagged={z.co2Flag} /></td>
                  <td className="px-4 py-3"><FlagValue value={z.temp} flagged={z.tempFlag} /></td>
                  <td className="px-4 py-3"><FlagValue value={z.rh} flagged={z.rhFlag} /></td>
                  <td className="px-4 py-3"><FlagValue value={z.pm25} flagged={z.pm25Flag} /></td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs",
                      z.sensors.startsWith(z.sensors.split("/")[1].split(" ")[0])
                        ? "text-emerald-600"
                        : "text-amber-600"
                    )}>{z.sensors}</span>
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

function ZoneMapTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">Detailed sensor readings by zone — {ZONES.length} zones monitored</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ZONES.map((z) => (
          <div
            key={z.zone}
            className={cn(
              "bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow",
              "border-l-4",
              z.status === "Good" && "border-l-emerald-500",
              z.status === "Warn" && "border-l-amber-400",
              z.status === "ALERT" && "border-l-red-500"
            )}
          >
            {/* card header */}
            <div className="p-4 pb-3 border-b border-neutral-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] text-neutral-400 mb-1">Skyline Dubai · {z.floor} · {z.zone}</p>
                  <div className="flex items-center gap-2">
                    <StatusDot status={z.status} />
                    <p className="text-sm font-semibold text-neutral-800">{z.zone}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {z.alertCount > 0 && (
                    <Badge tone="bad">{z.alertCount} alert{z.alertCount > 1 ? "s" : ""}</Badge>
                  )}
                  <Badge tone={z.occupancy === "Occupied" ? "good" : z.occupancy === "Unoccupied" ? "neutral" : "info"}>
                    {z.occupancy}
                  </Badge>
                </div>
              </div>
            </div>

            {/* readings grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {/* CO₂ */}
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide font-medium mb-1">CO₂</p>
                <p className={cn("text-sm font-semibold", z.co2Flag ? "text-red-600" : "text-neutral-800")}>
                  {z.co2}
                  {z.co2Flag && <TrendingUp className="w-3 h-3 inline ml-1 text-red-500" />}
                </p>
                <Co2Bar value={parseInt(z.co2.replace(/,/g, "").replace(" ppm", ""))} />
              </div>

              {/* Temperature */}
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide font-medium mb-1">Temperature</p>
                <p className={cn("text-sm font-semibold", z.tempFlag ? "text-orange-600" : "text-neutral-800")}>
                  {z.temp}
                  {z.tempFlag && <TrendingUp className="w-3 h-3 inline ml-1 text-orange-500" />}
                </p>
                <div className="w-full bg-neutral-100 rounded-full h-2 mt-1">
                  <div
                    className={cn("h-2 rounded-full", z.tempFlag ? "bg-orange-400" : "bg-blue-400")}
                    style={{ width: `${Math.min(100, Math.round(((parseFloat(z.temp) - 18) / 15) * 100))}%` }}
                  />
                </div>
              </div>

              {/* RH */}
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide font-medium mb-1">Humidity (RH)</p>
                <p className={cn("text-sm font-semibold", z.rhFlag ? "text-amber-600" : "text-neutral-800")}>
                  {z.rh}
                  {z.rhFlag && <TrendingUp className="w-3 h-3 inline ml-1 text-amber-500" />}
                </p>
                <div className="w-full bg-neutral-100 rounded-full h-2 mt-1">
                  <div
                    className={cn("h-2 rounded-full", z.rhFlag ? "bg-amber-400" : "bg-cyan-400")}
                    style={{ width: `${parseInt(z.rh)}%` }}
                  />
                </div>
              </div>

              {/* PM2.5 */}
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide font-medium mb-1">PM2.5</p>
                <p className={cn("text-sm font-semibold", z.pm25Flag ? "text-red-600" : "text-neutral-800")}>
                  {z.pm25}
                  {z.pm25Flag && <TrendingUp className="w-3 h-3 inline ml-1 text-red-500" />}
                </p>
                <div className="w-full bg-neutral-100 rounded-full h-2 mt-1">
                  <div
                    className={cn("h-2 rounded-full", z.pm25Flag ? "bg-red-400" : "bg-emerald-400")}
                    style={{ width: `${Math.min(100, Math.round((parseInt(z.pm25) / 50) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="px-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-neutral-400" />
                <span className="text-[10px] text-neutral-500">AHU: {z.ahu}</span>
              </div>
              {z.tvoc && (
                <span className="text-[10px] text-neutral-400">TVOC: {z.tvoc}</span>
              )}
              <span className={cn(
                "text-[10px] font-medium",
                z.sensors.includes("/") && z.sensors.split("/")[0] === z.sensors.split(" ")[0] + "/" + z.sensors.split(" ")[0]
                  ? "text-emerald-600"
                  : "text-amber-600"
              )}>{z.sensors}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Co2VentilationTab() {
  const zones = ["Meeting Room B", "Gym", "Lobby"] as const;
  const colors: Record<string, string> = {
    "Meeting Room B": "bg-red-400",
    Gym: "bg-amber-400",
    Lobby: "bg-blue-400",
  };
  const maxCo2 = 1400;

  return (
    <div className="space-y-6">
      {/* CO₂ threshold guide */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-neutral-700 mb-4">CO₂ Threshold Reference</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-emerald-700">&lt; 800 ppm</p>
            <p className="text-sm font-bold text-emerald-800 mt-1">Excellent</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-amber-700">800–1,000 ppm</p>
            <p className="text-sm font-bold text-amber-800 mt-1">Acceptable</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-orange-700">1,000–1,500 ppm</p>
            <p className="text-sm font-bold text-orange-800 mt-1">Action Recommended</p>
            <p className="text-[10px] text-orange-600 mt-0.5">Increase ventilation</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-red-700">&gt; 1,500 ppm</p>
            <p className="text-sm font-bold text-red-800 mt-1">Urgent Action</p>
          </div>
        </div>
      </Card>

      {/* 14-day CO₂ trend */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-neutral-700 mb-1">14-Day CO₂ Trend — Top 3 Zones</p>
        <p className="text-xs text-neutral-500 mb-4">Dashed line at 1,000 ppm action threshold</p>

        <div className="space-y-6">
          {zones.map((zone) => {
            const values = CO2_TREND[zone];
            const localMax = Math.max(...values, 1200);
            const thresholdPct = Math.round((1000 / (localMax * 1.1)) * 100);

            return (
              <div key={zone}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-sm", colors[zone])} />
                    <p className="text-xs font-semibold text-neutral-700">{zone}</p>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Current: <span className={cn("font-semibold", values[13] >= 1000 ? "text-red-600" : values[13] >= 800 ? "text-amber-600" : "text-emerald-600")}>
                      {values[13].toLocaleString()} ppm
                    </span>
                  </p>
                </div>
                <div className="relative bg-neutral-50 rounded-lg p-3">
                  {/* threshold line */}
                  <div
                    className="absolute left-3 right-3 border-t border-dashed border-amber-400"
                    style={{ bottom: `calc(${thresholdPct}% + 0.75rem)` }}
                  >
                    <span className="text-[9px] text-amber-600 absolute right-0 -top-3">1,000 ppm</span>
                  </div>

                  <div className="flex items-end gap-0.5 h-20">
                    {values.map((v, i) => {
                      const pct = Math.round((v / (localMax * 1.1)) * 100);
                      const barColor =
                        v >= 1000 ? "bg-red-400 hover:bg-red-500" :
                        v >= 800 ? "bg-amber-400 hover:bg-amber-500" :
                        `${colors[zone]} hover:opacity-90`;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={cn("w-full rounded-t transition-colors", barColor)}
                            style={{ height: `${pct}%` }}
                            title={`D${i + 1}: ${v} ppm`}
                          />
                          {i % 3 === 0 && (
                            <span className="text-[8px] text-neutral-400">D{i + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ventilation recommendations */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-neutral-700">Ventilation Recommendations</p>

        <Card className="p-5 border-l-4 border-l-red-500">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge tone="bad">High — Active</Badge>
                <Badge tone="neutral">AHU-03</Badge>
              </div>
              <p className="text-sm font-semibold text-neutral-800 mt-2">Meeting Room B — CO₂ 1,240 ppm for 3+ hours</p>
              <p className="text-xs text-neutral-600 mt-1">
                Increase AHU-03 fresh air damper to maximum fresh air position. Verify occupancy load vs
                design capacity. Consider reducing meeting room occupancy until CO₂ normalises.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div>
                  <p className="text-[10px] text-neutral-400">Estimated additional cost</p>
                  <p className="text-xs font-medium text-neutral-700">$2/hr (additional cooling)</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400">Estimated benefit</p>
                  <p className="text-xs font-medium text-emerald-700">Guest comfort improvement</p>
                </div>
              </div>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap flex-shrink-0">
              Create Action
            </button>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-400">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge tone="warn">Medium</Badge>
                <Badge tone="neutral">AHU-07</Badge>
              </div>
              <p className="text-sm font-semibold text-neutral-800 mt-2">Gym — CO₂ trending up since 09:00</p>
              <p className="text-xs text-neutral-600 mt-1">
                CO₂ at 890 ppm and rising. Verify AHU-07 operational schedule and fresh air damper ratio.
                High occupancy gym environments may require greater fresh air provision.
                Check if AHU-07 setpoint has been recently adjusted.
              </p>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap flex-shrink-0">
              Create Action
            </button>
          </div>
        </Card>
      </div>

      {/* disclaimer */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-600">
          CO₂ levels shown are for ventilation management purposes. Hotel Optimizer does not make health claims
          based on CO₂ readings. Thresholds are operational guidelines only.
        </p>
      </div>
    </div>
  );
}

function TempHumidityTab() {
  const COMFORT_BANDS = [
    {
      area: "Guestrooms",
      tempRange: "22–24°C",
      rhRange: "45–60%",
      zones: ZONES.filter((z) => z.zone.includes("Guestroom")),
    },
    {
      area: "Meeting Rooms",
      tempRange: "21–23°C",
      rhRange: "45–60%",
      zones: ZONES.filter((z) => z.zone.includes("Meeting")),
    },
    {
      area: "Gym",
      tempRange: "20–25°C",
      rhRange: "45–65%",
      zones: ZONES.filter((z) => z.zone === "Gym"),
    },
    {
      area: "Spa",
      tempRange: "26–28°C",
      rhRange: "55–70%",
      zones: ZONES.filter((z) => z.zone === "Spa"),
    },
    {
      area: "Restaurant / Lobby",
      tempRange: "22–24°C",
      rhRange: "45–60%",
      zones: ZONES.filter((z) => z.zone === "Restaurant" || z.zone === "Lobby"),
    },
  ];

  const OUT_OF_BAND = [
    {
      zone: "Gym",
      reading: "25.8°C",
      issue: "Above 25°C comfort ceiling",
      action: "Check AHU-07 setpoint",
      severity: "Medium",
    },
    {
      zone: "Kitchen",
      reading: "28.4°C",
      issue: "Operational area — flag for comfort awareness",
      action: "Check kitchen AHU and exhaust balance",
      severity: "Low",
    },
    {
      zone: "Meeting Room B",
      reading: "24.1°C + 58% RH",
      issue: "Marginally elevated with high CO₂ — combined comfort concern",
      action: "Increase fresh air and verify cooling setpoint",
      severity: "Medium",
    },
  ];

  return (
    <div className="space-y-6">
      {/* zone heatmap / table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <p className="text-sm font-semibold text-neutral-700">Temperature & Humidity — All Zones</p>
          <p className="text-xs text-neutral-500 mt-0.5">Comfort band compliance by area type</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {["Zone", "Temp", "RH", "Comfort Band (Temp)", "Comfort Band (RH)", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ZONES.map((z) => {
                const tempVal = parseFloat(z.temp);
                const rhVal = parseInt(z.rh);
                let tempBand = "22–24°C";
                let rhBand = "45–60%";
                if (z.zone === "Spa") { tempBand = "26–28°C"; rhBand = "55–70%"; }
                if (z.zone === "Gym") { tempBand = "20–25°C"; rhBand = "45–65%"; }
                if (z.zone.includes("Meeting")) { tempBand = "21–23°C"; rhBand = "45–60%"; }

                return (
                  <tr
                    key={z.zone}
                    className={cn(
                      "hover:bg-neutral-50",
                      (z.tempFlag || z.rhFlag) && "bg-amber-50 hover:bg-amber-50"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-neutral-800 text-xs whitespace-nowrap">{z.zone}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className={cn("text-xs font-semibold", z.tempFlag ? "text-orange-600" : "text-neutral-700")}>{z.temp}</span>
                        {z.tempFlag && <TrendingUp className="w-3 h-3 text-orange-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className={cn("text-xs font-semibold", z.rhFlag ? "text-amber-600" : "text-neutral-700")}>{z.rh}</span>
                        {z.rhFlag && <TrendingUp className="w-3 h-3 text-amber-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">{tempBand}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">{rhBand}</td>
                    <td className="px-4 py-3">
                      {z.tempFlag || z.rhFlag
                        ? <Badge tone="warn">Out of band</Badge>
                        : <Badge tone="good">In band</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* out of band detail */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-neutral-700">Out-of-Band Zone Detail</p>
        {OUT_OF_BAND.map((item) => (
          <Card key={item.zone} className={cn(
            "p-4 border-l-4",
            item.severity === "Medium" ? "border-l-amber-400" : "border-l-blue-400"
          )}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-neutral-800">{item.zone}</p>
                  <Badge tone={item.severity === "Medium" ? "warn" : "info"}>{item.severity}</Badge>
                </div>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Reading: <span className="font-medium text-amber-700">{item.reading}</span>
                </p>
                <p className="text-xs text-neutral-500 mt-1">{item.issue}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-neutral-400">Recommended action</p>
                <p className="text-xs font-medium text-blue-700 mt-0.5">{item.action}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* comfort band summary cards */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-neutral-700">Comfort Bands by Area Type</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {COMFORT_BANDS.map((band) => (
            <Card key={band.area} className="p-4">
              <p className="text-xs font-semibold text-neutral-700 mb-2">{band.area}</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-neutral-400">Temp target</span>
                  <span className="text-[10px] font-medium text-neutral-600">{band.tempRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-neutral-400">RH target</span>
                  <span className="text-[10px] font-medium text-neutral-600">{band.rhRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-neutral-400">Zones</span>
                  <span className="text-[10px] font-medium text-neutral-600">{band.zones.length}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{IAQ_ALERTS.length} IAQ alerts · 6 Active · 1 Monitoring</p>
        <div className="flex items-center gap-2">
          <Badge tone="bad">1 High</Badge>
          <Badge tone="warn">2 Medium</Badge>
          <Badge tone="info">3 Low</Badge>
          <Badge tone="neutral">1 Info</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {["Zone", "Type", "Current Value", "Threshold", "Duration", "Severity", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {IAQ_ALERTS.map((alert) => (
                <tr
                  key={alert.id}
                  className={cn(
                    "hover:bg-neutral-50 transition-colors",
                    alert.severity === "High" && "bg-red-50 hover:bg-red-50"
                  )}
                >
                  <td className="px-3 py-3 font-medium text-neutral-800 text-xs whitespace-nowrap">{alert.zone}</td>
                  <td className="px-3 py-3 text-neutral-600 text-xs whitespace-nowrap">{alert.type}</td>
                  <td className="px-3 py-3 font-mono text-xs font-medium text-neutral-800 whitespace-nowrap">
                    {alert.current !== "N/A"
                      ? <span className={alert.severity === "High" || alert.severity === "Medium" ? "text-red-600" : "text-neutral-700"}>{alert.current}</span>
                      : <span className="text-neutral-400">N/A</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{alert.threshold}</td>
                  <td className="px-3 py-3 text-xs text-neutral-600 whitespace-nowrap">{alert.duration}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {alert.status === "Active"
                      ? <Badge tone="bad">Active</Badge>
                      : <Badge tone="info">Monitoring</Badge>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
                      {alert.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* bulk action bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-600">
          <span className="font-semibold">6 active alerts</span> require attention. Creating maintenance actions will log these in the work order system.
        </p>
        <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0">
          Create All Actions
        </button>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "zone-map", label: "Zone Map" },
  { id: "co2-ventilation", label: "CO₂ & Ventilation" },
  { id: "temp-humidity", label: "Temperature & Humidity" },
  { id: "alerts", label: "Alerts" },
];

export default function IAQComfort() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <PageHeader
          eyebrow="Smart Operations · IAQ & Comfort"
          title="IAQ & Comfort"
          subtitle="Indoor air quality, comfort monitoring, and ventilation across hotel zones"
        />

        {/* disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Important: </span>
            IAQ monitoring supports comfort and ventilation management. Data shown is for operational management
            only and does not constitute health certification or regulatory compliance unless independently verified.
          </p>
        </div>

        {/* tab navigation */}
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1 w-fit flex-wrap">
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
        {activeTab === "zone-map" && <ZoneMapTab />}
        {activeTab === "co2-ventilation" && <Co2VentilationTab />}
        {activeTab === "temp-humidity" && <TempHumidityTab />}
        {activeTab === "alerts" && <AlertsTab />}
      </div>
    </div>
  );
}
