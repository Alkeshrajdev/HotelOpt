import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Cloud,
  Droplet,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
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
import SocialOverviewView from "./SocialOverview";
import GovernanceOverviewView from "./GovernanceOverview";

export type PillarKey =
  | "energy"
  | "water"
  | "waste"
  | "carbon"
  | "social"
  | "governance";

export type ViewKey =
  | "overview"
  | "genuine-performance"
  | "internal-comparison"
  | "external-comparison"
  | "carbon-inventory"
  | "data-quality"
  | "evidence"
  // energy-specific (new simplified views)
  | "performance"
  | "by-property"
  | "benchmarks";

const PILLAR_DEFS: { key: PillarKey; label: string; icon: LucideIcon; activeColor: string }[] = [
  { key: "energy",     label: "Energy",     icon: Zap,         activeColor: "text-pillar-energy" },
  { key: "water",      label: "Water",      icon: Droplet,     activeColor: "text-pillar-water" },
  { key: "waste",      label: "Waste",      icon: Trash2,      activeColor: "text-pillar-waste" },
  { key: "carbon",     label: "Carbon",     icon: Cloud,       activeColor: "text-pillar-carbon" },
  { key: "social",     label: "Social",     icon: UsersIcon,   activeColor: "text-pillar-social" },
  { key: "governance", label: "Governance", icon: ShieldCheck, activeColor: "text-pillar-gov" },
];

const VIEW_LABEL: Record<ViewKey, string> = {
  "overview":             "Overview",
  "genuine-performance":  "Genuine Performance",
  "internal-comparison":  "Internal Comparison",
  "external-comparison":  "External Comparison",
  "carbon-inventory":     "Carbon Inventory",
  "data-quality":         "Data Quality",
  "evidence":             "Evidence",
  "performance":          "Performance",
  "by-property":          "By Property",
  "benchmarks":           "Benchmarks",
};

const PILLAR_VIEWS: Record<PillarKey, ViewKey[]> = {
  energy:     ["overview", "performance", "by-property", "benchmarks", "external-comparison"],
  water:      ["overview", "performance", "by-property", "benchmarks", "external-comparison"],
  waste:      ["overview", "performance", "by-property", "benchmarks", "external-comparison"],
  carbon:     ["overview", "performance", "by-property", "benchmarks", "external-comparison", "carbon-inventory"],
  social:     ["overview"],
  governance: ["overview"],
};

const PILLAR_DESCRIPTIONS: Record<PillarKey, string> = {
  energy:
    "Are your hotels using less energy per room night than last year, adjusted for occupancy? Track genuine improvement, renewable share, and how you compare to similar hotels.",
  water:
    "Is water use per room night falling? See recycled water share, leak alerts, and how your properties compare to the benchmark pool.",
  waste:
    "Is your diversion rate rising and food waste falling? Track performance by waste stream and property, and see where action will have the most impact.",
  carbon:
    "Are your total emissions falling in real terms? Review direct, indirect, and supplier emissions, and track progress against your net-zero pathway.",
  social:
    "Are your people practices improving year-on-year? Track headcount, diversity, training hours, and health & safety metrics aligned to GRI 401 / 403 / 404 / 405.",
  governance:
    "Are your governance commitments up to date? Review annual attestations, anti-corruption, whistleblowing, and supplier code of conduct adoption.",
};

/** Per-pillar workflow strip — pillar-scoped numbers from BRD §5 sufficiency rules. */
const PILLAR_WORKFLOW: Record<
  PillarKey,
  { capture: string; pending: number; quality: string; gpReady: boolean; reportsReady: string }
> = {
  energy:     { capture: "84% complete", pending: 24, quality: "82/100 · High",   gpReady: true,  reportsReady: "GHG · GRI 302 · CSRD E1" },
  water:      { capture: "78% complete", pending: 12, quality: "78/100 · High",   gpReady: true,  reportsReady: "GRI 303 · CSRD E3" },
  waste:      { capture: "71% complete", pending: 18, quality: "71/100 · Fair",   gpReady: true,  reportsReady: "GRI 306 · CSRD E5" },
  carbon:     { capture: "86% complete", pending: 8,  quality: "80/100 · High",   gpReady: true,  reportsReady: "GHG · SBTi · CDP" },
  social:     { capture: "74% complete", pending: 6,  quality: "86/100 · High",   gpReady: false, reportsReady: "GRI 401 / 403 / 404 / 405" },
  governance: { capture: "92% complete", pending: 1,  quality: "92/100 · High",   gpReady: false, reportsReady: "GRI 205 · CSRD G1" },
};

const PILLAR_TITLE: Record<PillarKey, string> = {
  energy: "Energy Dashboard",
  water: "Water Dashboard",
  waste: "Waste Dashboard",
  carbon: "Carbon Dashboard",
  social: "Social Dashboard",
  governance: "Governance Dashboard",
};

function isPillarKey(s: string): s is PillarKey {
  return ["energy", "water", "waste", "carbon", "social", "governance"].includes(s);
}
function isViewKey(s: string): s is ViewKey {
  return [
    "overview",
    "genuine-performance",
    "internal-comparison",
    "external-comparison",
    "carbon-inventory",
    "data-quality",
    "evidence",
    "performance",
    "by-property",
    "benchmarks",
  ].includes(s);
}

export default function PerformanceShell() {
  const { pillar: pillarParam = "energy", view: viewParam = "overview" } =
    useParams();
  const navigate = useNavigate();

  // Validate pillar
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
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400">Performance</div>
        <Tabs
          variant="segmented"
          ariaLabel="Performance pillar"
          items={pillarItems}
          value={pillar}
          onChange={(k) => navigate(`/performance/${k}/overview`)}
        />
        <p className="text-[13px] text-ink-500 max-w-3xl leading-snug">{PILLAR_DESCRIPTIONS[pillar]}</p>
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
      {view === "overview" && pillar === "social"     && <SocialOverviewView />}
      {view === "overview" && pillar === "governance" && <GovernanceOverviewView />}
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
