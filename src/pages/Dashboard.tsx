import { useState } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import OverviewTab from "./dashboard/OverviewTab";
import EnvironmentTab from "./dashboard/EnvironmentTab";
import TargetsTab from "./dashboard/TargetsTab";
import HotelsTab from "./dashboard/HotelsTab";
import SocialGovernanceTab from "./dashboard/SocialGovernanceTab";

const TABS = [
  { key: "overview",     label: "Overview" },
  { key: "environment",  label: "Environment" },
  { key: "targets",      label: "Targets" },
  { key: "hotels",       label: "Hotels" },
  { key: "social",       label: "Social & Governance" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Dashboard() {
  const [tab, setTab] = useState<TabKey>("overview");

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

      <Tabs
        className="mt-6"
        ariaLabel="Dashboard sections"
        items={TABS.map((t) => ({ key: t.key, label: t.label }))}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
      />

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
