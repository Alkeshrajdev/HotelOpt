import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Cloud,
  Droplet,
  Trash2,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Tabs, { type TabItem } from "@/components/ui/Tabs";

import ExternalView from "./External";
import CarbonInventoryView from "./CarbonInventory";
import EnergyOverviewView from "./EnergyOverview";
import EnergyPerformanceView from "./EnergyPerformance";
import EnergyByPropertyView from "./EnergyByProperty";
import EnergyBenchmarksView from "./EnergyBenchmarks";
import PillarOverviewView from "./PillarOverview";
import PillarPerformanceView from "./PillarPerformance";
import PillarByPropertyView from "./PillarByProperty";
import PillarBenchmarksView from "./PillarBenchmarks";

/** The product covers the four environmental pillars only (owner decision, Sep 2026). */
export type PillarKey =
  | "energy"
  | "water"
  | "waste"
  | "carbon";

export type ViewKey =
  | "overview"
  | "genuine-performance"
  | "internal-comparison"
  | "external-comparison"
  | "carbon-inventory"
  | "data-quality"
  // energy-specific (new simplified views)
  | "performance"
  | "by-property"
  | "benchmarks";

const PILLAR_DEFS: { key: PillarKey; label: string; icon: LucideIcon; activeColor: string }[] = [
  { key: "energy",     label: "Energy",     icon: Zap,         activeColor: "text-pillar-energy" },
  { key: "water",      label: "Water",      icon: Droplet,     activeColor: "text-pillar-water" },
  { key: "waste",      label: "Waste",      icon: Trash2,      activeColor: "text-pillar-waste" },
  { key: "carbon",     label: "Carbon",     icon: Cloud,       activeColor: "text-pillar-carbon" },
];

const VIEW_LABEL: Record<ViewKey, string> = {
  "overview":             "Overview",
  "genuine-performance":  "Genuine Performance",
  "internal-comparison":  "Internal Comparison",
  "external-comparison":  "External Comparison",
  "carbon-inventory":     "Carbon Inventory",
  "data-quality":         "Data Quality",
  "performance":          "Performance",
  "by-property":          "By Property",
  "benchmarks":           "Benchmarks",
};

const PILLAR_VIEWS: Record<PillarKey, ViewKey[]> = {
  energy:     ["overview", "performance", "by-property", "benchmarks", "external-comparison"],
  water:      ["overview", "performance", "by-property", "benchmarks", "external-comparison"],
  waste:      ["overview", "performance", "by-property", "benchmarks", "external-comparison"],
  carbon:     ["overview", "performance", "by-property", "benchmarks", "external-comparison", "carbon-inventory"],
};

const PILLAR_TITLE: Record<PillarKey, string> = {
  energy: "Energy Dashboard",
  water: "Water Dashboard",
  waste: "Waste Dashboard",
  carbon: "Carbon Dashboard",
};

function isPillarKey(s: string): s is PillarKey {
  return ["energy", "water", "waste", "carbon"].includes(s);
}
function isViewKey(s: string): s is ViewKey {
  return [
    "overview",
    "genuine-performance",
    "internal-comparison",
    "external-comparison",
    "carbon-inventory",
    "data-quality",
    "performance",
    "by-property",
    "benchmarks",
  ].includes(s);
}

export default function PerformanceShell() {
  const { pillar: pillarParam = "energy", view: viewParam = "overview" } =
    useParams();
  const navigate = useNavigate();

  // Validate pillar (retired social/governance links land on energy)
  if (!isPillarKey(pillarParam)) {
    return <Navigate to="/performance/energy/overview" replace />;
  }
  const pillar = pillarParam;

  // Validate view for this pillar
  const allowedViews = PILLAR_VIEWS[pillar];
  if (!isViewKey(viewParam) || !allowedViews.includes(viewParam)) {
    return <Navigate to={`/performance/${pillar}/overview`} replace />;
  }
  const view: ViewKey = viewParam;

  // Pillar selector doubles as the page identity (no redundant "Energy Dashboard"
  // H1 above it). Views sit on one underline row below — two rows, not three.
  const pillarItems: TabItem[] = PILLAR_DEFS.map((p) => ({
    key: p.key, label: p.label, icon: p.icon, activeColor: p.activeColor,
  }));
  const viewItems: TabItem[] = allowedViews.map((v) => ({ key: v, label: VIEW_LABEL[v] }));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400">Performance</div>
        <Tabs
          variant="segmented"
          ariaLabel="Performance pillar"
          items={pillarItems}
          value={pillar}
          onChange={(k) => navigate(`/performance/${k}/overview`)}
        />
      </div>

      <Tabs
        variant="underline"
        ariaLabel={`${PILLAR_TITLE[pillar]} views`}
        items={viewItems}
        value={view}
        onChange={(v) => navigate(`/performance/${pillar}/${v}`)}
      />

      {/* View body */}
      {view === "overview" && pillar === "energy"     && <EnergyOverviewView />}
      {view === "overview" && (pillar === "water" || pillar === "waste" || pillar === "carbon") && <PillarOverviewView pillar={pillar} />}

      {view === "performance" && pillar === "energy"  && <EnergyPerformanceView />}
      {view === "performance" && (pillar === "water" || pillar === "waste" || pillar === "carbon") && <PillarPerformanceView pillar={pillar} />}

      {view === "by-property" && pillar === "energy"  && <EnergyByPropertyView />}
      {view === "by-property" && (pillar === "water" || pillar === "waste" || pillar === "carbon") && <PillarByPropertyView pillar={pillar} />}

      {view === "benchmarks" && pillar === "energy"   && <EnergyBenchmarksView />}
      {view === "benchmarks" && (pillar === "water" || pillar === "waste" || pillar === "carbon") && <PillarBenchmarksView pillar={pillar} />}

      {/* Restored views (were orphaned: in routes/deep-links but cut from the nav) */}
      {view === "external-comparison" && <ExternalView pillar={pillar} />}
      {view === "carbon-inventory" && pillar === "carbon" && <CarbonInventoryView />}

    </div>
  );
}
