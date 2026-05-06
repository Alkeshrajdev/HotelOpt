import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Info,
  Search,
  ShieldAlert,
  Wrench,
  X,
  Zap,
  Droplet,
  Wind,
  Activity,
  Database,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DemoNotice from "@/components/ui/DemoNotice";
import { cn } from "@/lib/utils";

type AlertSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
type AlertCategory = "Energy" | "Water" | "IAQ" | "Asset" | "Data Quality" | "Maintenance";
type AlertStatus = "New" | "Acknowledged" | "Assigned" | "In Progress" | "Resolved";
type ConfidenceLevel = "High" | "Medium" | "Low";

type Alert = {
  id: string;
  title: string;
  category: AlertCategory;
  property: string;
  system: string;
  assetOrMeter: string;
  severity: AlertSeverity;
  estimatedImpact: string;
  impactUnit: string;
  confidence: ConfidenceLevel;
  detectedAt: string;
  owner: string;
  status: AlertStatus;
  recommendedAction: string;
  details: string;
};

const ALERTS: Alert[] = [
  {
    id: "A001",
    title: "Chiller 01 COP dropped 22% below baseline",
    category: "Asset",
    property: "Dubai Marina Hotel",
    system: "HVAC",
    assetOrMeter: "Chiller 01 / CH-01",
    severity: "Critical",
    estimatedImpact: "AED 8,400/month",
    impactUnit: "~420 kWh/day excess",
    confidence: "High",
    detectedAt: "Today 06:12",
    owner: "Facilities Manager",
    status: "In Progress",
    recommendedAction: "Schedule chiller service inspection. Check refrigerant charge, compressor current draw, and condenser water flow. Compare against last service records.",
    details: "Chiller 01 coefficient of performance (COP) has deteriorated from a baseline of 4.8 to 3.7 over the last 72 hours — a 22% drop. This is consistent with compressor wear, refrigerant undercharge, or condenser fouling. The chiller is currently meeting load but at significantly elevated energy cost. If COP continues to drop, chiller may trip on safety limits during peak demand periods.",
  },
  {
    id: "A002",
    title: "Continuous night water flow — Zone 3 (leak suspected)",
    category: "Water",
    property: "Dubai Marina Hotel",
    system: "Domestic Water",
    assetOrMeter: "Zone 3 Sub-meter / WM-Z3",
    severity: "Critical",
    estimatedImpact: "AED 6,200/month",
    impactUnit: "~19 m³/day excess",
    confidence: "High",
    detectedAt: "Today 02:47",
    owner: "Chief Engineer",
    status: "Assigned",
    recommendedAction: "Dispatch plumber to isolate Zone 3 and perform pressure test. Check irrigation valves, toilet flush valves on Floors 3–6, and mechanical room PRVs.",
    details: "Zone 3 water sub-meter has registered a sustained flow rate of 0.8 m³/hr between 01:00 and 06:00 for two consecutive nights. There is no scheduled usage in this period. The flow pattern is consistent with a continuously running toilet cistern, failed isolation valve, or small pipe joint leak. Zone 3 covers Floors 3–6 guestrooms and the Level 3 plant room.",
  },
  {
    id: "A003",
    title: "Electricity sub-meter offline — BOH area",
    category: "Data Quality",
    property: "Dubai Marina Hotel",
    system: "Electrical Metering",
    assetOrMeter: "BOH Sub-meter / EM-BOH-01",
    severity: "Critical",
    estimatedImpact: "Data gap only",
    impactUnit: "6 hrs data missing",
    confidence: "High",
    detectedAt: "Yesterday 22:15",
    owner: "BMS Technician",
    status: "Acknowledged",
    recommendedAction: "Check network connectivity to EM-BOH-01 Modbus gateway. Verify circuit breaker on meter panel. Contact BMS vendor if connectivity cannot be restored within 2 hours.",
    details: "The back-of-house electrical sub-meter (EM-BOH-01) has been offline for over 6 hours. This meter covers kitchen, laundry, and service corridor circuits — approximately 22% of total hotel electrical load. Energy data for this period will need to be estimated or gap-filled, which reduces confidence in daily energy totals and any savings verification calculations that rely on this meter.",
  },
  {
    id: "A004",
    title: "AHU-05 running 4 hours outside schedule",
    category: "Energy",
    property: "Dubai Marina Hotel",
    system: "HVAC",
    assetOrMeter: "AHU-05 / BMS-AHU-05",
    severity: "High",
    estimatedImpact: "AED 2,100/month",
    impactUnit: "~105 kWh/day",
    confidence: "High",
    detectedAt: "Today 07:30",
    owner: "BMS Technician",
    status: "New",
    recommendedAction: "Review AHU-05 BMS schedule configuration. Check if a local override has been activated. Update schedule to match current hotel occupancy pattern (check in with GM for any event activity requiring extended conditioning).",
    details: "AHU-05, serving the Conference Centre on Level 2, is running from 04:00 to 08:00 daily — a 4-hour window that is outside its scheduled 08:00–23:00 operation. This has been detected on 6 of the past 7 days. It is likely a BMS schedule override that was not cleared after a late event. The Conference Centre is unoccupied during these early morning hours.",
  },
  {
    id: "A005",
    title: "CO₂ > 1,000 ppm — Meeting Room B for 3+ hours",
    category: "IAQ",
    property: "Dubai Marina Hotel",
    system: "HVAC / IAQ Sensors",
    assetOrMeter: "IAQ Sensor / IAQ-MR-B",
    severity: "High",
    estimatedImpact: "Guest comfort risk",
    impactUnit: "Peak: 1,340 ppm",
    confidence: "High",
    detectedAt: "Today 10:15",
    owner: "Front Office / Engineering",
    status: "Acknowledged",
    recommendedAction: "Increase AHU fresh air supply to Meeting Room B. Check damper position and CO₂ control loop. If sensor is co-located with HVAC controller, verify demand-controlled ventilation (DCV) setpoint is active.",
    details: "The IAQ sensor in Meeting Room B has recorded CO₂ concentrations above 1,000 ppm continuously for 3 hours and 20 minutes, peaking at 1,340 ppm. ASHRAE 62.1 guidance recommends maintaining CO₂ below 1,100 ppm above outdoor levels. The room is currently occupied with a group of 28 persons for a full-day workshop. Fresh air damper appears to be at minimum position — demand-controlled ventilation may not be responding correctly.",
  },
  {
    id: "A006",
    title: "Main water meter data gap — 6 hours",
    category: "Data Quality",
    property: "Dubai Marina Hotel",
    system: "Water Metering",
    assetOrMeter: "Main Water Meter / WM-MAIN",
    severity: "High",
    estimatedImpact: "Data gap: ~50 m³ estimated",
    impactUnit: "6 hrs data missing",
    confidence: "Medium",
    detectedAt: "Yesterday 16:00",
    owner: "BMS Technician",
    status: "In Progress",
    recommendedAction: "Recover data from meter logger memory if available. Cross-reference with sub-meter totals to estimate missing volume. Document gap in data quality log for reporting purposes.",
    details: "The main water meter (WM-MAIN) experienced a 6-hour data gap between 16:00 and 22:00 yesterday, likely due to a pulse counter communication fault. Approximately 50 m³ of consumption is unaccounted for during this period based on typical afternoon usage patterns. Sub-meter data remains intact and can be used to reconstruct an estimate. This gap must be documented if this month's data is used for regulatory reporting.",
  },
  {
    id: "A007",
    title: "Kitchen energy 38% above benchmark this week",
    category: "Energy",
    property: "Dubai Marina Hotel",
    system: "Kitchen",
    assetOrMeter: "Kitchen Sub-meter / EM-KIT-01",
    severity: "Medium",
    estimatedImpact: "AED 1,800/month",
    impactUnit: "+310 kWh vs benchmark",
    confidence: "Medium",
    detectedAt: "Today 08:00",
    owner: "Executive Chef / Engineering",
    status: "New",
    recommendedAction: "Review kitchen equipment standby times. Check if ovens and fryers are being left on between service periods. Review new menu if recently changed — higher cooking loads possible. Inspect extraction fan variable speed drives.",
    details: "Kitchen electrical consumption this week is averaging 38% above the equivalent week benchmark (adjusted for covers). The excess is primarily during off-peak hours (14:00–17:00 prep gap), suggesting equipment is not being powered down between lunch and dinner service. The kitchen underwent a partial refit three weeks ago — newly installed equipment may not have correct standby settings configured.",
  },
  {
    id: "A008",
    title: "Room temperature out of comfort band — Floor 7",
    category: "IAQ",
    property: "Dubai Marina Hotel",
    system: "HVAC / Room Sensors",
    assetOrMeter: "FCU sensors / Rooms 701–718",
    severity: "Medium",
    estimatedImpact: "Guest comfort risk",
    impactUnit: "12 rooms affected",
    confidence: "Medium",
    detectedAt: "Today 09:45",
    owner: "Engineering",
    status: "Acknowledged",
    recommendedAction: "Inspect floor 7 FCU zone valve and thermostat calibration. Check supply air temperature for AHU serving Floor 7. Verify no occupant has manually overridden to extreme setpoint.",
    details: "Rooms 701–718 on Floor 7 are recording supply air temperatures 3–5°C warmer than setpoint during overnight periods (23:00–06:00). The affected rooms are showing an average overnight temperature of 24.8°C against a 22°C setpoint. This may indicate a stuck zone valve, calibration drift in the floor thermostat, or a supply air temperature issue from the primary AHU. No guest complaints logged yet — proactive investigation recommended.",
  },
  {
    id: "A009",
    title: "Solar PV array underperforming vs expected output",
    category: "Energy",
    property: "Dubai Marina Hotel",
    system: "Solar PV",
    assetOrMeter: "PV Inverter / PV-INV-01",
    severity: "Medium",
    estimatedImpact: "AED 1,650/month",
    impactUnit: "~55 kWh/day shortfall",
    confidence: "Medium",
    detectedAt: "Today 11:00",
    owner: "Facilities Manager",
    status: "New",
    recommendedAction: "Schedule rooftop panel inspection for soiling. Check inverter clipping events in inverter monitoring portal. Review last cleaning date — should be every 6–8 weeks in Dubai conditions.",
    details: "The 85 kWp rooftop PV system is generating 31% below the irradiance-adjusted expected output for this time of year. Performance ratio has dropped from 0.78 to 0.54 over the past 3 weeks. The most likely cause is panel soiling — Dubai's dust environment typically requires cleaning every 6–8 weeks. Last cleaning was recorded 11 weeks ago. Inverter string monitoring shows uniform underperformance across all strings, consistent with soiling rather than a single inverter or string fault.",
  },
  {
    id: "A010",
    title: "Laundry peak load overlapping with kitchen peak",
    category: "Energy",
    property: "Dubai Marina Hotel",
    system: "Laundry",
    assetOrMeter: "Laundry Sub-meter / EM-LAU-01",
    severity: "Medium",
    estimatedImpact: "AED 940/month",
    impactUnit: "Peak demand penalty",
    confidence: "Low",
    detectedAt: "Today 12:30",
    owner: "Housekeeping Manager",
    status: "New",
    recommendedAction: "Shift laundry wash cycles to 06:00–09:00 window before breakfast service peak, or to 14:00–17:00 after lunch. Coordinate with Housekeeping Manager to adjust linen collection schedule.",
    details: "Laundry and kitchen are both drawing peak loads between 10:30 and 12:30, coinciding with hotel peak demand. This overlap is contributing to demand charge exposure on the DEWA tariff. Shifting laundry loads by 2 hours earlier or later could reduce the coincident peak by an estimated 18–25 kW, avoiding an estimated AED 940/month in demand charges. Confidence is Low as demand charge impact depends on the exact peak day calculation method used by DEWA.",
  },
  {
    id: "A011",
    title: "Chiller 02 runtime 18 hrs/day vs 12 hr target",
    category: "Asset",
    property: "Dubai Marina Hotel",
    system: "HVAC",
    assetOrMeter: "Chiller 02 / CH-02",
    severity: "High",
    estimatedImpact: "AED 3,200/month",
    impactUnit: "+6 hrs/day vs target",
    confidence: "High",
    detectedAt: "Yesterday 18:00",
    owner: "Facilities Manager",
    status: "Acknowledged",
    recommendedAction: "Review chiller sequencing logic in BMS. Check if Chiller 01 reduced capacity is forcing Chiller 02 to run longer to meet load. Verify cooling tower performance — high condenser water temperature can force extended chiller runtime.",
    details: "Chiller 02 has been running an average of 18 hours per day over the past 5 days against an operational target of 12 hours based on current occupancy (78%). Extended runtime may be partially explained by Chiller 01's degraded COP forcing additional load onto Chiller 02, but the BMS sequencing logic should be preventing this from occurring. Cooling tower performance should also be checked — a 2°C rise in condenser water temperature can increase chiller runtime by 15–20%.",
  },
  {
    id: "A012",
    title: "PM2.5 spike detected — Lobby IAQ sensor",
    category: "IAQ",
    property: "Dubai Marina Hotel",
    system: "IAQ Sensors",
    assetOrMeter: "IAQ Sensor / IAQ-LOBBY-01",
    severity: "Medium",
    estimatedImpact: "Guest experience risk",
    impactUnit: "Peak: 48 µg/m³",
    confidence: "Medium",
    detectedAt: "Today 08:15",
    owner: "Engineering / Housekeeping",
    status: "Acknowledged",
    recommendedAction: "Check lobby AHU filter condition. Review external PM2.5 from Dubai Air Quality Index — if outdoor levels are elevated, consider reducing fresh air intake temporarily. Inspect lobby entrance door seal and check if recent renovation work is contributing.",
    details: "The lobby IAQ sensor recorded a PM2.5 spike to 48 µg/m³ between 07:45 and 08:30, coinciding with high foot traffic during the morning check-out period. WHO 24-hour guideline is 15 µg/m³ and the UAE National Ambient Air Quality Standard is 35 µg/m³. The lobby AHU filters were last changed 14 weeks ago (target: 12 weeks). Outdoor PM2.5 from the nearest DEWA/EAD station was 22 µg/m³ at the same time, suggesting indoor amplification from filter loading.",
  },
  {
    id: "A013",
    title: "Pool makeup water consumption abnormal",
    category: "Water",
    property: "Dubai Marina Hotel",
    system: "Pool & Spa",
    assetOrMeter: "Pool Makeup Meter / WM-POOL",
    severity: "Low",
    estimatedImpact: "AED 280/month",
    impactUnit: "+3.2 m³/day vs baseline",
    confidence: "Low",
    detectedAt: "Yesterday 09:00",
    owner: "Facilities Manager",
    status: "New",
    recommendedAction: "Visually inspect pool level and check automatic top-up valve operation. Review backwash schedule — increased backwash frequency would explain additional makeup water. Check if pool cover is being used overnight.",
    details: "Pool makeup water consumption is running 3.2 m³/day above the seasonal baseline for May. The excess is equivalent to approximately 8% of normal pool volume per week. Possible causes include: increased evaporation due to a new event use of the pool area without overnight cover, a malfunctioning automatic top-up float valve overfilling, or an increase in backwash frequency by pool maintenance team. Confidence is Low because the pool meter has shown intermittent pulse dropout issues in the past.",
  },
  {
    id: "A014",
    title: "AHU filter pressure drop above threshold — AHU-03",
    category: "Asset",
    property: "Dubai Marina Hotel",
    system: "HVAC",
    assetOrMeter: "AHU-03 / BMS-AHU-03",
    severity: "Medium",
    estimatedImpact: "AED 620/month",
    impactUnit: "+18% fan energy",
    confidence: "High",
    detectedAt: "Today 06:00",
    owner: "Engineering",
    status: "New",
    recommendedAction: "Replace G4 pre-filter and F7 bag filters on AHU-03. Schedule for this week before pressure drop causes airflow reduction below minimum fresh air requirement. Order replacement filters from stores — part nos. F-AHU03-G4 and F-AHU03-F7.",
    details: "AHU-03's differential pressure sensor across the filter bank is reading 320 Pa against a 250 Pa change-out threshold. The filter was installed 14 weeks ago; Dubai's dusty environment typically requires replacement every 10–12 weeks. Elevated filter pressure drop is causing the supply fan VFD to run at higher speed to maintain design airflow, increasing fan energy consumption by approximately 18%. If not replaced, airflow will begin to drop below minimum fresh air requirements within 1–2 weeks.",
  },
];

const STATUS_FLOW: AlertStatus[] = ["New", "Acknowledged", "Assigned", "In Progress", "Resolved"];

const SEVERITY_ORDER: AlertSeverity[] = ["Critical", "High", "Medium", "Low", "Info"];

function severityTone(s: AlertSeverity): "bad" | "warn" | "info" | "good" | "neutral" {
  if (s === "Critical") return "bad";
  if (s === "High") return "warn";
  if (s === "Medium") return "info";
  if (s === "Low") return "good";
  return "neutral";
}

function statusTone(s: AlertStatus): "bad" | "warn" | "info" | "good" | "neutral" | "brand" {
  if (s === "Resolved") return "good";
  if (s === "In Progress") return "brand";
  if (s === "Assigned") return "info";
  if (s === "Acknowledged") return "warn";
  return "neutral";
}

function categoryIcon(c: AlertCategory) {
  if (c === "Energy") return <Zap size={13} className="text-pillar-energy" />;
  if (c === "Water") return <Droplet size={13} className="text-pillar-water" />;
  if (c === "IAQ") return <Wind size={13} className="text-info" />;
  if (c === "Asset") return <Activity size={13} className="text-warn" />;
  if (c === "Data Quality") return <Database size={13} className="text-ink-400" />;
  return <Wrench size={13} className="text-ink-400" />;
}

function confidenceExplanation(c: ConfidenceLevel, hours: string): string {
  if (c === "High") return `Based on ${hours} of continuous meter/sensor data with consistent signal. Independent verification recommended before escalating to external parties.`;
  if (c === "Medium") return `Based on ${hours} of meter data with some signal variance. Recommend confirming with a secondary data source before scheduling major works.`;
  return `Based on limited or intermittent data (${hours}). Treat as an indicator only. Site inspection required to confirm before any action.`;
}

type TabId = "all" | "critical" | "Energy" | "Water" | "IAQ" | "Asset" | "Data Quality";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "Energy", label: "Energy" },
  { id: "Water", label: "Water" },
  { id: "IAQ", label: "IAQ" },
  { id: "Asset", label: "Asset" },
  { id: "Data Quality", label: "Data Quality" },
];

function tabCount(tab: TabId, alerts: Alert[]): number {
  if (tab === "all") return alerts.length;
  if (tab === "critical") return alerts.filter((a) => a.severity === "Critical").length;
  return alerts.filter((a) => a.category === tab).length;
}

export default function AlertsCentre() {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [maintenanceCreated, setMaintenanceCreated] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AlertStatus>>({});

  const filteredAlerts = useMemo(() => {
    let result = [...ALERTS];

    if (activeTab === "critical") {
      result = result.filter((a) => a.severity === "Critical");
    } else if (activeTab !== "all") {
      result = result.filter((a) => a.category === activeTab);
    }

    if (severityFilter !== "all") {
      result = result.filter((a) => a.severity === severityFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((a) => {
        const effective = statusOverrides[a.id] ?? a.status;
        return effective === statusFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.assetOrMeter.toLowerCase().includes(q) ||
          a.system.toLowerCase().includes(q) ||
          a.owner.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );
  }, [activeTab, severityFilter, categoryFilter, statusFilter, searchQuery, statusOverrides]);

  const summaryCounts = useMemo(() => {
    const counts: Record<AlertSeverity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
    };
    ALERTS.forEach((a) => {
      counts[a.severity]++;
    });
    return counts;
  }, []);

  function handleCreateMaintenance(alertId: string) {
    setMaintenanceCreated((prev) => new Set([...prev, alertId]));
    setStatusOverrides((prev) => ({ ...prev, [alertId]: "Assigned" }));
  }

  function getEffectiveStatus(alert: Alert): AlertStatus {
    return statusOverrides[alert.id] ?? alert.status;
  }

  const confidenceHours: Record<ConfidenceLevel, string> = {
    High: "24+",
    Medium: "6–24",
    Low: "< 6",
  };

  return (
    <div className="page-container space-y-5">
      <PageHeader
        eyebrow="Smart Operations"
        title="Alerts Centre"
        subtitle="Energy, water, IAQ, and asset alerts across hotel operations"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-400">Dubai Marina Hotel · 320 rooms</span>
          </div>
        }
      />

      <DemoNotice message="Displaying 14 representative alerts for Dubai Marina Hotel. Connect live meters and BMS to receive real-time alerts." />

      {/* Summary stats strip */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-ink-100 bg-white">
        <div className="flex items-center gap-2 mr-2">
          <ShieldAlert size={16} className="text-ink-400" />
          <span className="text-[12px] font-semibold text-ink-600 uppercase tracking-wide">Alert summary</span>
        </div>
        {(["Critical", "High", "Medium", "Low"] as AlertSeverity[]).map((s) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors",
              s === "Critical" && "bg-bad/10 border-bad/30 hover:bg-bad/20",
              s === "High" && "bg-warn/10 border-warn/30 hover:bg-warn/20",
              s === "Medium" && "bg-info/10 border-info/30 hover:bg-info/20",
              s === "Low" && "bg-good/10 border-good/30 hover:bg-good/20"
            )}
            onClick={() => {
              setActiveTab("all");
              setSeverityFilter(severityFilter === s ? "all" : s);
            }}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                s === "Critical" && "bg-bad",
                s === "High" && "bg-warn",
                s === "Medium" && "bg-info",
                s === "Low" && "bg-good"
              )}
            />
            <span
              className={cn(
                "text-[12px] font-semibold",
                s === "Critical" && "text-bad",
                s === "High" && "text-warn",
                s === "Medium" && "text-info",
                s === "Low" && "text-good"
              )}
            >
              {summaryCounts[s]} {s}
            </span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-400">
          <CheckCircle2 size={12} className="text-good" />
          0 Resolved today
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-ink-100 pb-0">
        {TABS.map((tab) => {
          const count = tabCount(tab.id, ALERTS);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-px text-[10px] font-semibold min-w-[18px]",
                  isActive ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[12px] text-ink-500">
          <Filter size={13} />
          <span>Filter:</span>
        </div>

        {/* Severity */}
        <div className="relative">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 text-[12px] rounded-lg border border-ink-200 bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
          >
            <option value="all">All severities</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        </div>

        {/* Category */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 text-[12px] rounded-lg border border-ink-200 bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
          >
            <option value="all">All categories</option>
            {(["Energy", "Water", "IAQ", "Asset", "Data Quality", "Maintenance"] as AlertCategory[]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 text-[12px] rounded-lg border border-ink-200 bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
          >
            <option value="all">All statuses</option>
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search alerts, assets, owners…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-[12px] rounded-lg border border-ink-200 bg-white text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <span className="text-[11px] text-ink-400 ml-auto">
          {filteredAlerts.length} of {ALERTS.length} alerts
        </span>
      </div>

      {/* Alert table */}
      <Card level={2}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[100px]">Severity</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Alert</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[100px]">Category</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[140px]">Asset / Meter</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[110px]">Detected</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[130px]">Impact</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[90px]">Confidence</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[120px]">Owner</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide w-[110px]">Status</th>
                <th className="px-4 py-3 w-[60px]" />
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[13px] text-ink-400">
                    No alerts match the current filters.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert, idx) => {
                  const effectiveStatus = getEffectiveStatus(alert);
                  return (
                    <tr
                      key={alert.id}
                      className={cn(
                        "border-b border-ink-50 hover:bg-ink-50/50 transition-colors",
                        alert.severity === "Critical" && "bg-bad/3",
                        idx === filteredAlerts.length - 1 && "border-0"
                      )}
                    >
                      <td className="px-4 py-3">
                        <Badge tone={severityTone(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-ink-900 leading-snug">{alert.title}</p>
                        <p className="text-[11px] text-ink-400 mt-0.5 font-mono">{alert.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {categoryIcon(alert.category)}
                          <span className="text-[12px] text-ink-600">{alert.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-ink-600 leading-snug">{alert.assetOrMeter}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[12px] text-ink-500">
                          <Clock size={11} className="shrink-0" />
                          {alert.detectedAt}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[12px] font-semibold text-ink-800">{alert.estimatedImpact}</p>
                        <p className="text-[11px] text-ink-400">{alert.impactUnit}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            alert.confidence === "High"
                              ? "good"
                              : alert.confidence === "Medium"
                              ? "warn"
                              : "neutral"
                          }
                        >
                          {alert.confidence}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-ink-600">{alert.owner}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(effectiveStatus)}>
                          {effectiveStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="px-3 py-1 rounded-lg text-[11px] font-semibold text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 transition-colors whitespace-nowrap"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Alert detail modal */}
      {selectedAlert && (
        <Modal
          open={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={selectedAlert.title}
          subtitle={`${selectedAlert.id} · ${selectedAlert.property} · Detected ${selectedAlert.detectedAt}`}
          size="lg"
          hero={
            <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
              <Badge tone={severityTone(selectedAlert.severity)}>{selectedAlert.severity}</Badge>
              <div className="flex items-center gap-1.5">
                {categoryIcon(selectedAlert.category)}
                <Badge tone="neutral">{selectedAlert.category}</Badge>
              </div>
              <Badge tone={statusTone(getEffectiveStatus(selectedAlert))}>
                {getEffectiveStatus(selectedAlert)}
              </Badge>
              <span className="text-[12px] text-ink-400 ml-auto">Owner: {selectedAlert.owner}</span>
            </div>
          }
          footer={
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-ink-600 border border-ink-200 hover:bg-ink-50 transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                {maintenanceCreated.has(selectedAlert.id) ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-good bg-good/10 border border-good/30">
                    <CheckCircle2 size={14} />
                    Maintenance action created
                  </div>
                ) : (
                  <button
                    onClick={() => handleCreateMaintenance(selectedAlert.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                  >
                    <Wrench size={14} />
                    Create Maintenance Action
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="px-6 py-4 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-[12px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Description</h4>
              <p className="text-[14px] text-ink-800 leading-relaxed">{selectedAlert.details}</p>
            </div>

            {/* System hierarchy */}
            <div>
              <h4 className="text-[12px] font-semibold text-ink-500 uppercase tracking-wide mb-3">System hierarchy</h4>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="px-2.5 py-1 rounded-lg bg-ink-100 text-ink-700 font-medium">{selectedAlert.property}</span>
                <span className="text-ink-300">›</span>
                <span className="px-2.5 py-1 rounded-lg bg-ink-100 text-ink-700 font-medium">{selectedAlert.system}</span>
                <span className="text-ink-300">›</span>
                <span className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-medium border border-brand-100">{selectedAlert.assetOrMeter}</span>
              </div>
            </div>

            {/* Impact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-ink-100 bg-ink-50/50">
                <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Estimated financial impact</p>
                <p className="text-[22px] font-bold text-ink-900">{selectedAlert.estimatedImpact}</p>
                <p className="text-[12px] text-ink-500 mt-0.5">{selectedAlert.impactUnit}</p>
              </div>
              <div className="p-4 rounded-xl border border-ink-100 bg-ink-50/50">
                <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Data confidence</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    tone={
                      selectedAlert.confidence === "High"
                        ? "good"
                        : selectedAlert.confidence === "Medium"
                        ? "warn"
                        : "neutral"
                    }
                  >
                    {selectedAlert.confidence} confidence
                  </Badge>
                </div>
                <p className="text-[11px] text-ink-500 mt-2 leading-snug">
                  {confidenceExplanation(selectedAlert.confidence, confidenceHours[selectedAlert.confidence])}
                </p>
              </div>
            </div>

            {/* Status timeline */}
            <div>
              <h4 className="text-[12px] font-semibold text-ink-500 uppercase tracking-wide mb-3">Status flow</h4>
              <div className="flex items-center gap-1 overflow-x-auto">
                {STATUS_FLOW.map((step, i) => {
                  const effectiveStatus = getEffectiveStatus(selectedAlert);
                  const currentIdx = STATUS_FLOW.indexOf(effectiveStatus);
                  const isCompleted = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-1 shrink-0">
                      <div
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
                          isCompleted && "bg-good/20 border-good/40 text-good",
                          isCurrent && "bg-brand-100 border-brand-300 text-brand-700",
                          !isCompleted && !isCurrent && "bg-ink-50 border-ink-200 text-ink-400"
                        )}
                      >
                        {isCompleted && <CheckCircle2 size={10} className="inline mr-1" />}
                        {step}
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <span className="text-ink-300 text-[10px]">›</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {maintenanceCreated.has(selectedAlert.id) && (
                <p className="text-[11px] text-good mt-2 flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  Status updated to Assigned — maintenance action created
                </p>
              )}
            </div>

            {/* Recommended action */}
            <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/50">
              <h4 className="text-[12px] font-semibold text-brand-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Info size={13} />
                Recommended action
              </h4>
              <p className="text-[13px] text-ink-800 leading-relaxed">{selectedAlert.recommendedAction}</p>
            </div>

            {/* Data source note */}
            <div className="flex items-start gap-2 p-3 rounded-lg border border-ink-100 bg-ink-50/30">
              <AlertTriangle size={13} className="text-ink-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-ink-500 leading-snug">
                <span className="font-semibold">Confidence note:</span>{" "}
                {confidenceExplanation(selectedAlert.confidence, confidenceHours[selectedAlert.confidence])}{" "}
                All cost estimates are indicative and based on DEWA blended tariff of AED 0.38/kWh and AED 4.05/m³.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
