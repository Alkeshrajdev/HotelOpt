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
import WorkflowStrip from "@/components/ui/WorkflowStrip";
import { cn } from "@/lib/utils";

import OverviewView from "./Overview";
import GenuineView from "./Genuine";
import InternalView from "./Internal";
import ExternalView from "./External";
import CarbonInventoryView from "./CarbonInventory";
import DataQualityView from "./DataQuality";
import EvidenceView from "./Evidence";

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
  | "evidence";

const PILLAR_DEFS: { key: PillarKey; label: string; icon: LucideIcon; activeColor: string }[] = [
  { key: "energy",     label: "Energy",     icon: Zap,         activeColor: "text-pillar-energy" },
  { key: "water",      label: "Water",      icon: Droplet,     activeColor: "text-pillar-water" },
  { key: "waste",      label: "Waste",      icon: Trash2,      activeColor: "text-pillar-waste" },
  { key: "carbon",     label: "Carbon",     icon: Cloud,       activeColor: "text-pillar-carbon" },
  { key: "social",     label: "Social",     icon: UsersIcon,   activeColor: "text-pillar-social" },
  { key: "governance", label: "Governance", icon: ShieldCheck, activeColor: "text-pillar-gov" },
];

const VIEW_LABEL: Record<ViewKey, string> = {
  "overview": "Overview",
  "genuine-performance": "Genuine Performance",
  "internal-comparison": "Internal Comparison",
  "external-comparison": "External Comparison",
  "carbon-inventory": "Carbon Inventory",
  "data-quality": "Data Quality",
  "evidence": "Evidence",
};

const PILLAR_VIEWS: Record<PillarKey, ViewKey[]> = {
  energy:     ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  water:      ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  waste:      ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  carbon:     ["overview", "genuine-performance", "internal-comparison", "external-comparison", "carbon-inventory", "data-quality"],
  social:     ["overview", "internal-comparison", "data-quality", "evidence"],
  governance: ["overview", "internal-comparison", "data-quality", "evidence"],
};

const PILLAR_DESCRIPTIONS: Record<PillarKey, string> = {
  energy:
    "Energy intensity, performance index, renewable share — across the four-layer performance story.",
  water:
    "Water consumption, recycled share, leak detection, and pool comparisons.",
  waste:
    "Waste generation, diversion rate, food-waste programmes, and stream-level data.",
  carbon:
    "GHG inventory across Scope 1, 2 (location & market), and Scope 3 — plus the four-layer story.",
  social:
    "Headcount, diversity, training, and health & safety. GRI 401 / 403 / 404 / 405 aligned.",
  governance:
    "Annual attestations, anti-corruption, whistleblowing, and supplier code adoption.",
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

  const wf = PILLAR_WORKFLOW[pillar];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Pillar dashboard · ${PILLAR_DEFS.find((p) => p.key === pillar)!.label}`}
        title={PILLAR_TITLE[pillar]}
        subtitle={PILLAR_DESCRIPTIONS[pillar]}
      />

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

      {/* Pillar workflow strip — shows next-action context for this pillar */}
      <WorkflowStrip
        stations={[
          {
            key: "capture",
            label: "Data Capture",
            value: wf.capture,
            tone: wf.capture.startsWith("9") || wf.capture.startsWith("8") ? "ok" : "warn",
            href: "/data-capture",
          },
          {
            key: "review",
            label: "Pending Review",
            value: `${wf.pending} records`,
            tone: wf.pending === 0 ? "complete" : wf.pending > 15 ? "warn" : "info",
            href: `/review-approval?status=submitted&pillar=${pillar}`,
          },
          {
            key: "quality",
            label: "Data Quality",
            value: wf.quality,
            tone: wf.quality.startsWith("9") || wf.quality.startsWith("8") ? "ok" : "warn",
            href: `/performance/${pillar}/data-quality`,
          },
          {
            key: "gp",
            label: "GP Ready",
            value: wf.gpReady ? "Yes · base 2022" : "Not applicable",
            tone: wf.gpReady ? "complete" : "info",
          },
          {
            key: "reports",
            label: "Reports Ready",
            value: wf.reportsReady,
            tone: "info",
            href: "/reports",
          },
        ]}
      />

      {/* View body */}
      {view === "overview" && <OverviewView pillar={pillar} />}
      {view === "genuine-performance" && <GenuineView pillar={pillar} />}
      {view === "internal-comparison" && <InternalView pillar={pillar} />}
      {view === "external-comparison" && <ExternalView pillar={pillar} />}
      {view === "carbon-inventory" && <CarbonInventoryView />}
      {view === "data-quality" && <DataQualityView pillar={pillar} />}
      {view === "evidence" && <EvidenceView pillar={pillar} />}

      {/* Trace meta — useful for stakeholders reviewing IA */}
      <div className="text-[11px] text-ink-400 mt-6">
        Pillar = <code>{pillar}</code> · View = <code>{view}</code> · GP &amp; External Comparison hidden for Social/Governance per BRD §9.1.
      </div>
    </div>
  );
}
