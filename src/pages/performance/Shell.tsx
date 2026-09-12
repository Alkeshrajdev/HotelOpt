import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Cloud, Droplet, Trash2, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { Database } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useTopbar } from "@/lib/topbarContext";
import { useDataMode } from "@/lib/data/mode";
import { useProperties } from "@/lib/data/properties";
import { usePropertyPerformance } from "@/lib/data/performance";

import ExternalView from "./External";
import CarbonInventoryView from "./CarbonInventory";
import EnergyOverviewView from "./EnergyOverview";
import EnergyBenchmarksView from "./EnergyBenchmarks";
import PillarOverviewView from "./PillarOverview";
import PillarBenchmarksView from "./PillarBenchmarks";
import GenuinePerformanceView from "./GenuinePerformance";

/** The product covers the four environmental pillars only (owner decision, Sep 2026). */
export type PillarKey = "energy" | "water" | "waste" | "carbon";

/**
 * Performance is a property-level tool: every view is about the property in the
 * top bar. Anything that compares hotels lives in Portfolio → Compare.
 */
export type ViewKey = "overview" | "genuine-performance" | "benchmarks" | "external-comparison" | "carbon-inventory";

const PILLAR_DEFS: { key: PillarKey; label: string; icon: LucideIcon; activeColor: string }[] = [
  { key: "energy", label: "Energy", icon: Zap,     activeColor: "text-pillar-energy" },
  { key: "water",  label: "Water",  icon: Droplet, activeColor: "text-pillar-water" },
  { key: "waste",  label: "Waste",  icon: Trash2,  activeColor: "text-pillar-waste" },
  { key: "carbon", label: "Carbon", icon: Cloud,   activeColor: "text-pillar-carbon" },
];

const VIEW_LABEL: Record<ViewKey, string> = {
  "overview":             "Overview",
  "genuine-performance":  "Genuine performance",
  "benchmarks":           "Benchmarks",
  "external-comparison":  "External comparison",
  "carbon-inventory":     "Carbon inventory",
};

const PILLAR_VIEWS: Record<PillarKey, ViewKey[]> = {
  energy: ["overview", "genuine-performance", "benchmarks", "external-comparison"],
  water:  ["overview", "genuine-performance", "benchmarks", "external-comparison"],
  waste:  ["overview", "genuine-performance", "benchmarks", "external-comparison"],
  carbon: ["overview", "genuine-performance", "benchmarks", "external-comparison", "carbon-inventory"],
};

/** Old view keys that still appear in links and bookmarks. */
const LEGACY_VIEW: Record<string, ViewKey | "compare"> = {
  "performance": "genuine-performance",
  "by-property": "compare",
  "internal-comparison": "compare",
  "data-quality": "overview",
};

function isPillarKey(s: string): s is PillarKey {
  return ["energy", "water", "waste", "carbon"].includes(s);
}
function isViewKey(s: string): s is ViewKey {
  return ["overview", "genuine-performance", "benchmarks", "external-comparison", "carbon-inventory"].includes(s);
}

export default function PerformanceShell() {
  const { pillar: pillarParam = "energy", view: viewParam = "overview" } = useParams();
  const navigate = useNavigate();
  const { propertyName, propertyId, year } = useTopbar();
  const mode = useDataMode();
  const { properties } = useProperties();
  const property = properties.find((p) => p.id === propertyId);
  // The grid or utility is resolved before the country, so a Dubai site gets the DEWA factor.
  const geo = { gridCode: property?.gridCode ?? null, country: property?.countryCode ?? null };
  const perf = usePropertyPerformance(propertyId, year, geo, mode === "live");

  // Retired pillar links land on energy
  if (!isPillarKey(pillarParam)) return <Navigate to="/performance/energy/overview" replace />;
  const pillar = pillarParam;

  // Old view keys: the property-level ones are renamed, the cross-property ones moved to Portfolio
  const legacy = LEGACY_VIEW[viewParam];
  if (legacy === "compare") return <Navigate to={`/portfolio/compare?pillar=${pillar}`} replace />;
  if (legacy) return <Navigate to={`/performance/${pillar}/${legacy}`} replace />;

  const allowedViews = PILLAR_VIEWS[pillar];
  if (!isViewKey(viewParam) || !allowedViews.includes(viewParam)) {
    return <Navigate to={`/performance/${pillar}/overview`} replace />;
  }
  const view: ViewKey = viewParam;

  const pillarItems: TabItem[] = PILLAR_DEFS.map((p) => ({ key: p.key, label: p.label, icon: p.icon, activeColor: p.activeColor }));
  const viewItems: TabItem[] = allowedViews.map((v) => ({ key: v, label: VIEW_LABEL[v] }));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400">Performance · {propertyName}</div>
        <Tabs
          variant="segmented"
          ariaLabel="Performance pillar"
          items={pillarItems}
          value={pillar}
          onChange={(k) => navigate(`/performance/${k}/${view === "carbon-inventory" && k !== "carbon" ? "overview" : view}`)}
        />
      </div>

      <Tabs
        variant="underline"
        ariaLabel={`${pillar} views`}
        items={viewItems}
        value={view}
        onChange={(v) => navigate(`/performance/${pillar}/${v}`)}
      />

      {view === "overview" && mode === "live" && perf.loading && <PageSkeleton />}
      {view === "overview" && mode === "live" && !perf.loading && perf.error && (
        <EmptyState icon={<Database size={20} />} title="Could not load approved data" description={perf.error} />
      )}
      {view === "overview" && mode === "live" && !perf.loading && !perf.error && perf.data && perf.data[pillar].monthsApproved === 0 && (
        <EmptyState icon={<Database size={20} />} title={`No approved ${pillar} data for ${propertyName} in ${year}/${String(year + 1).slice(2)}`} description="Capture the monthly records and approve them; the overview fills in as months are approved." />
      )}
      {view === "overview" && mode === "live" && !perf.loading && !perf.error && perf.data && perf.data[pillar].monthsApproved > 0 && (
        pillar === "energy" ? <EnergyOverviewView live={perf.data.energy} /> : <PillarOverviewView pillar={pillar} live={perf.data[pillar]} />
      )}
      {view === "overview" && mode === "demo" && pillar === "energy" && <EnergyOverviewView />}
      {view === "overview" && mode === "demo" && pillar !== "energy" && <PillarOverviewView pillar={pillar} />}

      {view === "genuine-performance" && <GenuinePerformanceView pillar={pillar} />}

      {view === "benchmarks" && pillar === "energy" && <EnergyBenchmarksView />}
      {view === "benchmarks" && pillar !== "energy" && <PillarBenchmarksView pillar={pillar} />}

      {view === "external-comparison" && <ExternalView pillar={pillar} />}
      {view === "carbon-inventory" && pillar === "carbon" && <CarbonInventoryView />}
    </div>
  );
}
