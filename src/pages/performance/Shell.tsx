import {
  Navigate,
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Cloud,
  Droplet,
  Recycle,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

import OverviewView from "./Overview";
import GenuineView from "./Genuine";
import InternalView from "./Internal";
import ExternalView from "./External";
import CarbonInventoryView from "./CarbonInventory";
import DataQualityView from "./DataQuality";
import EvidenceView from "./Evidence";
import EnergyPerformanceView from "./EnergyPerformance";
import EnergyByPropertyView from "./EnergyByProperty";
import EnergyBenchmarksView from "./EnergyBenchmarks";

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
  energy:     ["overview", "performance", "by-property", "benchmarks"],
  water:      ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  waste:      ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  carbon:     ["overview", "genuine-performance", "internal-comparison", "external-comparison", "carbon-inventory", "data-quality"],
  social:     ["overview", "internal-comparison", "data-quality", "evidence"],
  governance: ["overview", "internal-comparison", "data-quality", "evidence"],
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

  return (
    <div className="space-y-5">
      <PageHeader title={PILLAR_TITLE[pillar]} />

      {/* Pillar tab strip */}
      <div className="flex items-center gap-1 border-b border-ink-200 overflow-x-auto -mt-2">
        {PILLAR_DEFS.map((p) => {
          const Icon = p.icon;
          const isActive = p.key === pillar;
          return (
            <NavLink
              key={p.key}
              to={`/performance/${p.key}/overview`}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2",
                isActive
                  ? "text-ink-900 border-brand-700"
                  : "text-ink-500 hover:text-ink-900 border-transparent"
              )}
            >
              <Icon size={16} className={isActive ? p.activeColor : "text-ink-400"} />
              {p.label}
            </NavLink>
          );
        })}
      </div>

      {/* View pill row — filtered per pillar */}
      <div className="inline-flex flex-wrap items-center gap-1 bg-ink-100 p-1 rounded-xl">
        {allowedViews.map((v) => (
          <button
            key={v}
            onClick={() => navigate(`/performance/${pillar}/${v}`)}
            className={cn("tab", v === view && "tab-active")}
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      {/* View body */}
      {view === "overview"           && <OverviewView pillar={pillar} />}
      {view === "performance"        && <EnergyPerformanceView />}
      {view === "by-property"        && <EnergyByPropertyView />}
      {view === "benchmarks"         && <EnergyBenchmarksView />}
      {view === "genuine-performance" && <GenuineView pillar={pillar} />}
      {view === "internal-comparison" && <InternalView pillar={pillar} />}
      {view === "external-comparison" && <ExternalView pillar={pillar} />}
      {view === "carbon-inventory"   && <CarbonInventoryView />}
      {view === "data-quality"       && <DataQualityView pillar={pillar} />}
      {view === "evidence"           && <EvidenceView pillar={pillar} />}

    </div>
  );
}
