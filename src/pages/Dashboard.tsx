import { useState } from "react";
import { useTopbar } from "@/lib/topbarContext";
import { Link } from "react-router-dom";
import { Download, ShieldCheck as TrustIcon, ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import OverviewTab from "./dashboard/OverviewTab";
import EnvironmentTab from "./dashboard/EnvironmentTab";
import TargetsTab from "./dashboard/TargetsTab";
import HotelsTab from "./dashboard/HotelsTab";
import SocialGovernanceTab from "./dashboard/SocialGovernanceTab";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview",     label: "Overview" },
  { key: "environment",  label: "Environment" },
  { key: "targets",      label: "Targets" },
  { key: "hotels",       label: "Hotels" },
  { key: "social",       label: "Social & Governance" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Dashboard() {
  const { property, period, dataBasis } = useTopbar();
  const isPortfolioView = property === "All Properties (72)";
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div>
      <div className="mb-3 px-4 py-2 rounded-lg bg-ink-100 border border-ink-200 text-[11px] text-ink-500 text-center">
        Demo environment — sample data only. Not connected to live client records.
      </div>

      <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-[12px] text-brand-700">
        <TrustIcon size={13} className="shrink-0" />
        <span>
          All figures are based on <strong>approved records</strong>. Draft and unapproved submissions are excluded from KPIs and reports.
        </span>
        <Link
          to="/review-approval"
          className="ml-auto shrink-0 font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
        >
          Review queue <ChevronRight size={11} />
        </Link>
      </div>

      <PageHeader
        eyebrow={isPortfolioView ? "Portfolio overview" : "Property overview"}
        title="Portfolio Dashboard"
        subtitle={
          isPortfolioView
            ? `ESG performance, targets, and actions across 10 hotels · ${period} · ${dataBasis === "approved" ? "Approved data" : dataBasis === "approved+provisional" ? "Approved + provisional" : dataBasis}`
            : `Performance and actions for ${property} · ${period}`
        }
        actions={
          <button className="btn-primary">
            <Download size={14} /> Export
          </button>
        }
      />

      <div className="flex gap-0.5 border-b border-ink-100 overflow-x-auto mt-6 -mx-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview"    && <OverviewTab onNavigate={(t) => setTab(t as TabKey)} />}
        {tab === "environment" && <EnvironmentTab />}
        {tab === "targets"     && <TargetsTab />}
        {tab === "hotels"      && <HotelsTab />}
        {tab === "social"      && <SocialGovernanceTab />}
      </div>
    </div>
  );
}
