import { useState, type ReactNode } from "react";
import {
  Cloud,
  Droplet,
  Lightbulb,
  Recycle,
  ShieldCheck,
  Target,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import IntensityChart from "@/components/charts/IntensityChart";
import AreaTrend from "@/components/charts/Area";
import HBar from "@/components/charts/HBar";
import { CARBON, GOVERNANCE, SOCIAL, WASTE, WATER } from "@/lib/pillarData";
import { MONTHLY_INTENSITY } from "@/lib/mock";
import {
  EnergyCostDrilldown,
  EnergyIntensityDrilldown,
  EnergyScoreDrilldown,
  HeroValue,
  PerformanceIndexDrilldown,
  RenewableDrilldown,
  ScopeDrilldown,
} from "@/components/dashboard/Drilldowns";
import {
  AntiCorruptionDrilldown,
  AttestationsDrilldown,
  CarbonIntensityDrilldown,
  DiversityDrilldown,
  HeadcountDrilldown,
  SafetyDrilldown,
  SupplierCodeDrilldown,
  TrainingDrilldown,
  WasteDiversionDrilldown,
  WasteFoodDrilldown,
  WasteIntensityDrilldown,
  WaterIntensityDrilldown,
  WaterLeaksDrilldown,
  WaterRecycledDrilldown,
  WhistleblowDrilldown,
} from "@/components/dashboard/PillarDrilldowns";
import type { PillarKey } from "./Shell";

/* Pillar config — KPIs + main trend per pillar */

type Kpi = {
  id: string;
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  goodDirection?: "up" | "down";
  caption?: string;
};

type PillarConfig = {
  kpis: Kpi[];
  trend:
    | { kind: "intensity"; data: typeof MONTHLY_INTENSITY }
    | { kind: "area"; data: { x: string; v: number }[]; color: string; format?: (v: number) => string };
  trendTitle: string;
  trendHint?: string;
  showTargets?: boolean;
};

const ENERGY_CFG: PillarConfig = {
  kpis: [
    { id: "energy-total",     icon: <Zap size={18} />,   iconBg: "bg-pillar-energy/10 text-pillar-energy", label: "Total consumption", value: "2,840", unit: "MWh", delta: -8.2 },
    { id: "energy-intensity", icon: <Zap size={18} />,   iconBg: "bg-warn/10 text-warn",                   label: "Energy intensity", value: "24.0", unit: "kWh/ORN", delta: -6.0 },
    { id: "energy-cost",      icon: <Target size={18} />,iconBg: "bg-pillar-energy/10 text-pillar-energy", label: "Energy cost", value: "$4.6M", delta: -4.0 },
    { id: "renewable",        icon: <Zap size={18} />,   iconBg: "bg-brand-50 text-brand-700",             label: "Renewable share", value: "78", unit: "%", delta: 3.0, goodDirection: "up" },
  ],
  trendTitle: "Energy consumption over time",
  trendHint: "kWh/ORN · monthly",
  trend: { kind: "intensity", data: MONTHLY_INTENSITY },
  showTargets: true,
};

const WATER_CFG: PillarConfig = {
  kpis: WATER.kpis.map((k) => ({
    id: k.drilldown,
    icon: <Droplet size={18} />,
    iconBg: "bg-pillar-water/10 text-pillar-water",
    label: k.label, value: k.value, unit: k.unit, delta: k.delta,
    goodDirection: k.goodDirection,
  })),
  trendTitle: "Water intensity over time",
  trendHint: "m³ per ORN",
  trend: { kind: "area", data: WATER.trend, color: "#0EA5E9", format: (v) => v.toFixed(2) },
};

const WASTE_CFG: PillarConfig = {
  kpis: WASTE.kpis.map((k) => ({
    id: k.drilldown,
    icon: k.id === "food-waste" ? <Lightbulb size={18} /> : <Recycle size={18} />,
    iconBg: "bg-pillar-waste/10 text-pillar-waste",
    label: k.label, value: k.value, unit: k.unit, delta: k.delta,
    goodDirection: k.goodDirection,
  })),
  trendTitle: "Waste / ORN over time",
  trendHint: "kg per ORN",
  trend: { kind: "area", data: WASTE.trend, color: "#0D9488", format: (v) => v.toFixed(2) },
};

const CARBON_CFG: PillarConfig = {
  kpis: CARBON.kpis.map((k) => ({
    id: k.drilldown,
    icon: <Cloud size={18} />,
    iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
    label: k.label, value: k.value, unit: k.unit, delta: k.delta,
    goodDirection: k.goodDirection,
  })),
  trendTitle: "Carbon intensity over time",
  trendHint: "tCO₂e per ORN",
  trend: { kind: "area", data: CARBON.trend, color: "#134E4A", format: (v) => v.toFixed(3) },
};

const SOCIAL_CFG: PillarConfig = {
  kpis: SOCIAL.kpis.map((k) => ({
    id: k.drilldown,
    icon: <UsersIcon size={18} />,
    iconBg: "bg-pillar-social/10 text-pillar-social",
    label: k.label, value: k.value, unit: k.unit, delta: k.delta,
    goodDirection: k.goodDirection,
  })),
  trendTitle: "Headcount over time",
  trend: { kind: "area", data: SOCIAL.headcountTrend, color: "#7C3AED" },
};

const GOV_CFG: PillarConfig = {
  kpis: GOVERNANCE.kpis.map((k) => ({
    id: k.drilldown,
    icon: <ShieldCheck size={18} />,
    iconBg: "bg-pillar-gov/10 text-pillar-gov",
    label: k.label, value: k.value, unit: k.unit, delta: k.delta,
    goodDirection: k.goodDirection, caption: k.caption,
  })),
  trendTitle: "Supplier code adoption over time",
  trend: {
    kind: "area",
    data: [
      { x: "May", v: 56 }, { x: "Jun", v: 58 }, { x: "Jul", v: 61 },
      { x: "Aug", v: 64 }, { x: "Sep", v: 66 }, { x: "Oct", v: 68 },
      { x: "Nov", v: 70 }, { x: "Dec", v: 71 }, { x: "Jan", v: 72 },
      { x: "Feb", v: 73 }, { x: "Mar", v: 74 }, { x: "Apr", v: 74 },
    ],
    color: "#EA580C",
    format: (v) => `${v}%`,
  },
};

const CONFIGS: Record<PillarKey, PillarConfig> = {
  energy: ENERGY_CFG, water: WATER_CFG, waste: WASTE_CFG,
  carbon: CARBON_CFG, social: SOCIAL_CFG, governance: GOV_CFG,
};

/* Per-pillar evidence / provenance summary — feeds the EvidenceMeta strip. */
const EVIDENCE_BY_PILLAR: Record<
  PillarKey,
  { records: number; matchPct: number; lastApproved: string }
> = {
  energy:     { records: 412, matchPct: 88, lastApproved: "20 May 2026" },
  water:      { records: 178, matchPct: 84, lastApproved: "18 May 2026" },
  waste:      { records: 296, matchPct: 71, lastApproved: "15 May 2026" },
  carbon:     { records: 142, matchPct: 92, lastApproved: "12 May 2026" },
  social:     { records:  84, matchPct: 78, lastApproved: "30 Apr 2026" },
  governance: { records:  48, matchPct: 96, lastApproved: "02 May 2026" },
};

/* Drilldown registry — same as Dashboard, kept here so this view is self-contained */

function getDrill(id: string): { title: string; subtitle?: string; hero?: ReactNode; body: ReactNode } | null {
  switch (id) {
    case "energy-score":     return { title: "Energy Score — data compliance", subtitle: "% of required data approved this period (FR-2 / FR-3)", hero: <HeroValue value="82%" delta={1.2} goodDirection="up" />, body: <EnergyScoreDrilldown /> };
    case "energy-index":     return { title: "Energy Performance Index", hero: <HeroValue value="91" delta={-4.2} context="Base 100 = 2022" />, body: <PerformanceIndexDrilldown /> };
    case "energy-intensity": return { title: "Energy Intensity", hero: <HeroValue value="24.0" unit="kWh/ORN" delta={-6.0} />, body: <EnergyIntensityDrilldown /> };
    case "energy-cost":      return { title: "Energy Cost", hero: <HeroValue value="$4.6M" delta={-4.0} />, body: <EnergyCostDrilldown /> };
    case "renewable":        return { title: "Renewable energy", hero: <HeroValue value="78" unit="/100" delta={3.0} goodDirection="up" />, body: <RenewableDrilldown /> };
    case "water-intensity":  return { title: "Water Intensity", hero: <HeroValue value="0.42" unit="m³/ORN" delta={-4.1} />, body: <WaterIntensityDrilldown /> };
    case "water-recycled":   return { title: "Recycled / greywater share", hero: <HeroValue value="22" unit="%" delta={6.0} goodDirection="up" />, body: <WaterRecycledDrilldown /> };
    case "water-leaks":      return { title: "Leak alerts", hero: <HeroValue value="2" context="active alerts" />, body: <WaterLeaksDrilldown /> };
    case "waste-intensity":  return { title: "Waste / ORN", hero: <HeroValue value="1.8" unit="kg/ORN" delta={-2.4} />, body: <WasteIntensityDrilldown /> };
    case "diversion":        return { title: "Diversion rate", hero: <HeroValue value="64" unit="%" delta={5.1} goodDirection="up" />, body: <WasteDiversionDrilldown /> };
    case "food-waste":       return { title: "Food waste per cover", hero: <HeroValue value="82" unit="g" delta={8.6} />, body: <WasteFoodDrilldown /> };
    case "carbon-intensity": return { title: "Carbon intensity", hero: <HeroValue value="0.041" unit="tCO₂e/ORN" delta={-7.2} />, body: <CarbonIntensityDrilldown /> };
    case "scope-1":          return { title: "Scope 1 — direct emissions", hero: <HeroValue value="1,820" unit="tCO₂e" delta={-3.1} />, body: <ScopeDrilldown scope={1} /> };
    case "scope-2":          return { title: "Scope 2 — purchased energy", hero: <HeroValue value="4,910" unit="tCO₂e" delta={-12.1} />, body: <ScopeDrilldown scope={2} /> };
    case "scope-3":          return { title: "Scope 3 — value chain", hero: <HeroValue value="22,640" unit="tCO₂e" delta={-2.2} />, body: <ScopeDrilldown scope={3} /> };
    case "headcount":        return { title: "Headcount", hero: <HeroValue value="3,240" delta={4.1} goodDirection="up" />, body: <HeadcountDrilldown /> };
    case "diversity":        return { title: "Female leadership", hero: <HeroValue value="42" unit="%" delta={3.5} goodDirection="up" />, body: <DiversityDrilldown /> };
    case "training":         return { title: "Training hours per FTE", hero: <HeroValue value="18" delta={2.0} goodDirection="up" />, body: <TrainingDrilldown /> };
    case "safety":           return { title: "Health & safety — LTIFR", hero: <HeroValue value="0.42" delta={-12} />, body: <SafetyDrilldown /> };
    case "attestations":     return { title: "Annual attestations", hero: <HeroValue value="11/12" context="1 outstanding" />, body: <AttestationsDrilldown /> };
    case "ac-training":      return { title: "Anti-corruption training", hero: <HeroValue value="96" unit="%" delta={4} goodDirection="up" />, body: <AntiCorruptionDrilldown /> };
    case "whistleblow":      return { title: "Whistleblowing reports", hero: <HeroValue value="3/3" context="resolved last 12 months" />, body: <WhistleblowDrilldown /> };
    case "supplier-code":    return { title: "Supplier code adoption", hero: <HeroValue value="74" unit="%" delta={6} goodDirection="up" />, body: <SupplierCodeDrilldown /> };
    default: return null;
  }
}

export default function Overview({ pillar }: { pillar: PillarKey }) {
  const cfg = CONFIGS[pillar];
  const [drill, setDrill] = useState<string | null>(null);
  const drillContent = drill ? getDrill(drill) : null;

  return (
    <div className="space-y-5">
      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cfg.kpis.map((k) => (
          <KpiTile
            key={k.id}
            icon={k.icon}
            iconBg={k.iconBg}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            goodDirection={k.goodDirection}
            caption={k.caption}
            onClick={() => setDrill(k.id)}
          />
        ))}
      </div>

      {/* Trend + breakdown */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader title={cfg.trendTitle} hint={cfg.trendHint} />
          <div className="px-6 pb-6">
            {cfg.trend.kind === "intensity" ? (
              <IntensityChart data={cfg.trend.data} />
            ) : (
              <AreaTrend
                data={cfg.trend.data}
                dataKey="v"
                color={cfg.trend.color}
                format={cfg.trend.format}
              />
            )}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Source split" hint={pillar === "social" || pillar === "governance" ? "Composition" : "Where consumption comes from"} />
          <div className="p-6">
            <HBar data={breakdownFor(pillar)} />
          </div>
        </Card>
      </div>

      {/* Targets — Energy only by default in mock; real backend would supply per-pillar */}
      {cfg.showTargets && (
        <Card>
          <CardHeader title="Targets" hint="FR-3.7 — RAG vs target" />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Metric</th>
                  <th className="table-th">Baseline year</th>
                  <th className="table-th">Target year</th>
                  <th className="table-th">Target value</th>
                  <th className="table-th">Current</th>
                  <th className="table-th">RAG</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="table-td font-medium">Energy intensity (kWh/ORN)</td><td className="table-td">2022</td><td className="table-td">2030</td><td className="table-td">18.5</td><td className="table-td">24.0</td><td className="table-td"><span className="chip bg-warn/10 text-warn border border-warn/25">Amber</span></td></tr>
                <tr><td className="table-td font-medium">Renewable energy share (%)</td><td className="table-td">2022</td><td className="table-td">2030</td><td className="table-td">100</td><td className="table-td">78</td><td className="table-td"><span className="chip bg-good/10 text-good border border-good/25">Green</span></td></tr>
                <tr><td className="table-td font-medium">tCO₂e / ORN (SBTi)</td><td className="table-td">2019</td><td className="table-td">2030</td><td className="table-td">0.025</td><td className="table-td">0.041</td><td className="table-td"><span className="chip bg-warn/10 text-warn border border-warn/25">Amber</span></td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={drillContent !== null}
        onClose={() => setDrill(null)}
        title={drillContent?.title ?? ""}
        subtitle={drillContent?.subtitle}
        hero={drillContent?.hero}
        size="xl"
      >
        {drillContent?.body}
      </Modal>
    </div>
  );
}

function breakdownFor(pillar: PillarKey): { name: string; value: number }[] {
  switch (pillar) {
    case "energy":
      return [
        { name: "Grid electricity", value: 64 },
        { name: "Natural gas", value: 14 },
        { name: "District cooling", value: 12 },
        { name: "Solar PV (on-site)", value: 8 },
        { name: "Diesel (back-up)", value: 2 },
      ];
    case "water":
      return WATER.sources.map((s) => ({ name: s.name, value: s.value }));
    case "waste":
      return WASTE.streams.map((s) => ({ name: s.name, value: s.value }));
    case "carbon":
      return [
        { name: "Scope 1", value: 6 },
        { name: "Scope 2 (market)", value: 17 },
        { name: "Scope 3", value: 77 },
      ];
    case "social":
      return SOCIAL.byRole;
    case "governance":
      return [
        { name: "Anti-corruption training", value: 96 },
        { name: "Supplier code adoption", value: 74 },
        { name: "Code of conduct signed", value: 100 },
        { name: "Conflict register up to date", value: 92 },
        { name: "Whistleblowing reports closed", value: 100 },
      ];
  }
}
