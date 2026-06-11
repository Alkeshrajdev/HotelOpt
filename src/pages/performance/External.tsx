import { useState, type ReactNode } from "react";
import { Globe2, Info, ListFilter, Users2 } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import HBar from "@/components/charts/HBar";
import InsufficientData from "@/components/ui/InsufficientData";
import { HeroValue } from "@/components/dashboard/Drilldowns";
import type { PillarKey } from "./Shell";

type Drill = null | "pool" | "percentile" | "filters";

const PILLAR_LABEL: Record<PillarKey, string> = {
  energy: "Energy", water: "Water", waste: "Waste",
  carbon: "Carbon", social: "Social", governance: "Governance",
};

export default function External({ pillar }: { pillar: PillarKey }) {
  const [drill, setDrill] = useState<Drill>(null);

  // Should never get here for social/governance — Shell hides this view.
  if (pillar === "social" || pillar === "governance") {
    return (
      <InsufficientData
        title="External Comparison is not available for this pillar"
        body="Social and Governance metrics cannot be meaningfully compared across hotels in a benchmark pool — the conditions vary too much. External Comparison is available for Energy, Water, Waste, and Carbon only."
      />
    );
  }

  const poolSize = 23;
  const level =
    poolSize >= 10 ? "Full"
    : poolSize >= 4 ? "Directional"
    : poolSize >= 1 ? "Reference"
    : "Empty";

  const content = drillContent(drill);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={<Users2 size={18} />}
          iconBg="bg-brand-50 text-brand-700"
          label="Comparable pool" value={String(poolSize)} caption="properties"
          onClick={() => setDrill("pool")}
        />
        <KpiTile
          icon={<Globe2 size={18} />}
          iconBg="bg-info/10 text-info"
          label="Display level" value={level}
          caption={
            level === "Full" ? "Distribution + percentile"
            : level === "Directional" ? "Approximate position"
            : "Anonymised cards"
          }
          onClick={() => setDrill("pool")}
        />
        <KpiTile
          icon={<Globe2 size={18} />}
          iconBg="bg-pillar-energy/10 text-pillar-energy"
          label="Your percentile" value="34th" caption="better than 66% of pool"
          onClick={() => setDrill("percentile")}
        />
        <KpiTile
          icon={<ListFilter size={18} />}
          iconBg="bg-warn/10 text-warn"
          label="Active filters" value="6" caption="climate, star, size band, period…"
          onClick={() => setDrill("filters")}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 md:col-span-4">
          <CardHeader title="Comparable pool" hint="Drives benchmark pool eligibility" />
          <div className="p-5 space-y-2 text-sm">
            <PoolRow label="Pool size" value={`${poolSize} properties`} />
            <PoolRow label="Display level" value={
              <Badge tone={
                level === "Full" ? "good"
                : level === "Directional" ? "warn"
                : level === "Reference" ? "info"
                : "neutral"
              }>{level}</Badge>
            } />
            <PoolRow label="Climate zone" value="Hot & humid" />
            <PoolRow label="Star rating" value="4–5 ★" />
            <PoolRow label="Size band" value="200–350 rooms" />
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-8">
          <CardHeader title="Comparability filters" />
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-2">
            <select className="input"><option>Climate zone — auto</option></select>
            <select className="input"><option>Star rating — 4★ / 5★</option></select>
            <select className="input"><option>Size band — 200–350 rooms</option></select>
            <select className="input"><option>Pool — Direct SaaS global</option></select>
            <select className="input"><option>Period — May 2025 – Apr 2026</option></select>
            <select className="input"><option>Lens — Normalised (Occ + Weather)</option></select>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Distribution — ${PILLAR_LABEL[pillar]} Intensity (normalised)`} />
        <div className="p-6">
          <div className="grid grid-cols-12 gap-1 items-end h-44">
            {[6, 10, 14, 18, 22, 28, 24, 18, 12, 9, 6, 3].map((h, i) => {
              const isYou = i === 4;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={"w-full rounded-t " + (isYou ? "bg-brand-700" : "bg-ink-200")}
                    style={{ height: `${(h / 30) * 100}%` }}
                  />
                  <span className="text-[10px] text-ink-500">{18 + i * 2}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-ink-700">
              <Globe2 size={14} className="text-brand-700" /> You sit in the{" "}
              <strong>34th percentile</strong> — better than 66% of comparable hotels.
            </div>
            <Badge tone="info">Normalised view</Badge>
          </div>
        </div>
      </Card>

      <div className="rounded-xl bg-warn/10 border border-warn/25 p-3 flex items-start gap-2.5">
        <Info size={16} className="text-warn mt-0.5" />
        <div className="text-[13px] text-warn">
          External Comparison is directional market context — not a rated score. Pool isolation  (no cross-pool leakage).
        </div>
      </div>

      <Modal
        open={content !== null}
        onClose={() => setDrill(null)}
        title={content?.title ?? ""}
        subtitle={content?.subtitle}
        hero={content?.hero}
        size="xl"
      >
        {content?.body}
      </Modal>
    </div>
  );
}

function drillContent(d: Drill) {
  if (!d) return null;
  if (d === "pool") {
    return {
      title: "Comparable pool composition",
      subtitle: "Each client's pool is isolated — properties are anonymised in distribution views",
      hero: <HeroValue value="23" context="properties match all filters" />,
      body: (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-7">
            <CardHeader title="Pool by region" />
            <div className="p-6">
              <HBar data={[
                { name: "APAC", value: 36 }, { name: "EMEA", value: 28 },
                { name: "Americas", value: 22 }, { name: "MENA", value: 14 },
              ]} />
            </div>
          </Card>
          <Card className="col-span-12 lg:col-span-5">
            <CardHeader title="Pool by size band" />
            <div className="p-6">
              <HBar data={[
                { name: "100 – 200 rooms", value: 18 },
                { name: "200 – 350 rooms", value: 52 },
                { name: "350 – 500 rooms", value: 22 },
                { name: "500+ rooms", value: 8 },
              ]} />
            </div>
          </Card>
        </div>
      ),
    };
  }
  if (d === "percentile") {
    return {
      title: "Your position in the distribution",
      hero: <HeroValue value="34th" context="percentile · normalised" />,
      body: (
        <Card>
          <CardHeader title="Distribution — your bin highlighted" />
          <div className="p-6">
            <div className="grid grid-cols-12 gap-1 items-end h-52">
              {[6, 10, 14, 18, 22, 28, 24, 18, 12, 9, 6, 3].map((h, i) => {
                const isYou = i === 4;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={"w-full rounded-t " + (isYou ? "bg-brand-700" : "bg-ink-200")}
                      style={{ height: `${(h / 30) * 100}%` }}
                    />
                    <span className="text-[10px] text-ink-500">{18 + i * 2}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ),
    };
  }
  return {
    title: "Active filters",
    subtitle: "How your comparable pool is built",
    body: (
      <Card>
        <CardHeader title="Filter chain" />
        <ul className="p-5 space-y-2 text-sm">
          {[
            { k: "Climate zone", v: "Hot & humid" },
            { k: "Star rating", v: "4★ / 5★" },
            { k: "Size band", v: "200–350 rooms" },
            { k: "Pool", v: "Direct SaaS global" },
            { k: "Period", v: "May 2025 – Apr 2026" },
            { k: "Lens", v: "Normalised (Occ + Weather)" },
          ].map((f) => (
            <li key={f.k} className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
              <span className="text-ink-500">{f.k}</span>
              <span className="font-semibold text-ink-900">{f.v}</span>
            </li>
          ))}
        </ul>
      </Card>
    ),
  };
}

function PoolRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
