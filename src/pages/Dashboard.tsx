import { useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import OverviewTab from "./dashboard/OverviewTab";
import EnvironmentTab from "./dashboard/EnvironmentTab";
import TargetsTab from "./dashboard/TargetsTab";
import HotelsTab from "./dashboard/HotelsTab";
import SocialGovernanceTab from "./dashboard/SocialGovernanceTab";
import FilterBar, { DashboardFilters, DEFAULT_FILTERS } from "./dashboard/FilterBar";
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
  const [tab, setTab]         = useState<TabKey>("overview");
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  return (
    <div>
      <PageHeader
        title="Portfolio Dashboard"
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

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="mt-6">
        {tab === "overview"    && <OverviewTab filters={filters} onNavigate={(t) => setTab(t as TabKey)} />}
        {tab === "environment" && <EnvironmentTab />}
        {tab === "targets"     && <TargetsTab />}
        {tab === "hotels"      && <HotelsTab />}
        {tab === "social"      && <SocialGovernanceTab />}
      </div>
    </div>
  );
}
