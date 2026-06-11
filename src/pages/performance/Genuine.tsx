import { useState } from "react";
import { Activity, FlaskConical, Info, Plus, Sparkles } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import RawVsGPChart from "@/components/charts/RawVsGPChart";
import AreaTrend from "@/components/charts/Area";
import HBar from "@/components/charts/HBar";
import Badge from "@/components/ui/Badge";
import InsufficientData from "@/components/ui/InsufficientData";
import { HeroValue } from "@/components/dashboard/Drilldowns";
import { RAW_VS_GP } from "@/lib/mock";
import type { PillarKey } from "./Shell";

type PillarGP = "energy" | "water" | "waste" | "carbon";

const GP_DATA: Record<
  PillarGP,
  {
    indexValue: number;
    delta: number;
    color: string;
    decomposition: { label: string; pct: number; tone: "good" | "warn" | "info" }[];
  }
> = {
  energy: {
    indexValue: 92, delta: -3.1, color: "#0F6A3C",
    decomposition: [
      { label: "Occupancy variance", pct: 1.8, tone: "info" },
      { label: "Weather (CDD/HDD)", pct: -0.6, tone: "info" },
      { label: "Conference & banqueting", pct: 0.4, tone: "info" },
      { label: "Operational event: F&B refurb", pct: 1.2, tone: "warn" },
      { label: "Management action (LED, BMS)", pct: -3.4, tone: "good" },
    ],
  },
  water: {
    indexValue: 96, delta: -1.8, color: "#0EA5E9",
    decomposition: [
      { label: "Occupancy variance", pct: 1.2, tone: "info" },
      { label: "Conference & banqueting", pct: 0.3, tone: "info" },
      { label: "Op. event: greywater commissioned", pct: -0.8, tone: "good" },
      { label: "Management action (low-flow)", pct: -1.5, tone: "good" },
    ],
  },
  waste: {
    indexValue: 89, delta: -4.2, color: "#0D9488",
    decomposition: [
      { label: "Occupancy variance", pct: 0.6, tone: "info" },
      { label: "F&B volume", pct: 1.4, tone: "warn" },
      { label: "Op. event: separation upgrade", pct: -2.6, tone: "good" },
      { label: "Management action (food waste)", pct: -3.6, tone: "good" },
    ],
  },
  carbon: {
    indexValue: 90, delta: -3.6, color: "#134E4A",
    decomposition: [
      { label: "Occupancy variance", pct: 1.5, tone: "info" },
      { label: "Weather (CDD/HDD)", pct: -0.4, tone: "info" },
      { label: "Op. event: Solar PV phase 1", pct: -2.1, tone: "good" },
      { label: "Management action (PPA / I-RECs)", pct: -2.6, tone: "good" },
    ],
  },
};

const PILLAR_TITLE: Record<PillarGP, string> = {
  energy: "GP-E — Energy",
  water: "GP-W — Water",
  waste: "GP-Wt — Waste",
  carbon: "GP-C — Carbon",
};

type Drill = null | "gp-e" | "gp-w" | "gp-wt" | "gp-c" | "composite";

export default function Genuine({ pillar }: { pillar: PillarKey }) {
  const [drill, setDrill] = useState<Drill>(null);

  // Should never get here for social/governance — Shell hides this view.
  if (pillar === "social" || pillar === "governance") {
    return (
      <InsufficientData
        title="Genuine Performance is not available for this pillar"
        body="Genuine Performance measures efficiency adjusted for occupancy and weather — concepts that don't apply to Social or Governance metrics. It is calculated for Energy, Water, Waste, and Carbon only."
        hint="Switch to Energy, Water, Waste, or Carbon in the sidebar to see GP."
      />
    );
  }

  const safe: PillarGP = pillar;
  const data = GP_DATA[safe];
  const drillContent = drillContentFor(drill);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={<Sparkles size={18} />}
          iconBg="bg-pillar-energy/10 text-pillar-energy"
          label="GP-E Index" value="92" caption="base 100 = 2022"
          delta={-3.1} onClick={() => setDrill("gp-e")}
        />
        <KpiTile
          icon={<Activity size={18} />}
          iconBg="bg-info/10 text-info"
          label="GP-W Index" value="96" delta={-1.8}
          onClick={() => setDrill("gp-w")}
        />
        <KpiTile
          icon={<Activity size={18} />}
          iconBg="bg-pillar-waste/10 text-pillar-waste"
          label="GP-Wt Index" value="89" delta={-4.2}
          onClick={() => setDrill("gp-wt")}
        />
        <KpiTile
          icon={<Activity size={18} />}
          iconBg="bg-pillar-carbon/10 text-pillar-carbon"
          label="GP Composite" value="92" delta={-2.7}
          onClick={() => setDrill("composite")}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader
            title={`${PILLAR_TITLE[safe]} — Raw vs GP`}
            hint="% improvement vs prior year"
          />
          <div className="px-6 pb-6">
            <RawVsGPChart data={RAW_VS_GP} />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="GP decomposition" hint="What drove the change" />
          <ul className="p-5 space-y-3">
            {data.decomposition.map((d) => (
              <li key={d.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-700">
                  <FlaskConical size={14} className="text-ink-400" />
                  {d.label}
                </span>
                <Badge tone={d.tone}>{d.pct < 0 ? "" : "+"}{d.pct.toFixed(1)}%</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Operational events log"
          hint="GP recalculates before and after each event to isolate its impact"
          right={
            <button className="btn-primary">
              <Plus size={14} /> Log event
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Date</th>
                <th className="table-th">Event</th>
                <th className="table-th">Pillars</th>
                <th className="table-th">Property</th>
                <th className="table-th">Description</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="table-td">14 Apr 2026</td>
                <td className="table-td font-medium">F&B refurbishment (re-opened)</td>
                <td className="table-td"><Badge tone="brand">Energy</Badge> <Badge tone="brand">Water</Badge> <Badge tone="brand">Waste</Badge></td>
                <td className="table-td">Skyline Dubai</td>
                <td className="table-td">3 new outlets — chillers ran 24/7 for commissioning</td>
                <td className="table-td"><Badge tone="good">Approved</Badge></td>
              </tr>
              <tr>
                <td className="table-td">02 Feb 2026</td>
                <td className="table-td font-medium">LED retrofit — back-of-house</td>
                <td className="table-td"><Badge tone="brand">Energy</Badge></td>
                <td className="table-td">Peaks Resort Zermatt</td>
                <td className="table-td">3,200 fittings replaced</td>
                <td className="table-td"><Badge tone="good">Approved</Badge></td>
              </tr>
              <tr>
                <td className="table-td">22 Nov 2025</td>
                <td className="table-td font-medium">Solar PV phase 1 commissioned</td>
                <td className="table-td"><Badge tone="brand">Energy</Badge> <Badge tone="brand">Carbon</Badge></td>
                <td className="table-td">Marina Residences Barcelona</td>
                <td className="table-td">240 kWp rooftop array</td>
                <td className="table-td"><Badge tone="good">Approved</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Info size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">
          <strong>GP boundary (CON-04):</strong> GP is the own-history lens only. External Comparison uses Raw and Normalised intensity — never GP.
        </div>
      </div>

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

function drillContentFor(id: Drill) {
  if (!id) return null;
  if (id === "composite") {
    return {
      title: "GP Composite",
      subtitle: "Weighted average of GP-E, GP-W, GP-Wt, GP-C",
      hero: <HeroValue value="92" delta={-2.7} context="Base 100 = 2022 · equal weights" />,
      body: <CompositeBody />,
    };
  }
  const map: Record<Exclude<Drill, null | "composite">, PillarGP> = {
    "gp-e": "energy", "gp-w": "water", "gp-wt": "waste", "gp-c": "carbon",
  };
  const which = map[id];
  const d = GP_DATA[which];
  return {
    title: PILLAR_TITLE[which],
    subtitle: "GP index trend + decomposition",
    hero: <HeroValue value={String(d.indexValue)} delta={d.delta} context="Base 100 = 2022" />,
    body: <GPBody pillar={which} />,
  };
}

function GPBody({ pillar }: { pillar: PillarGP }) {
  const d = GP_DATA[pillar];
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader title="GP index over time" hint="Lower = better operational efficiency" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "2022", v: 100 }, { x: "Q1 23", v: 99 }, { x: "Q2 23", v: 98 },
              { x: "Q3 23", v: 97 }, { x: "Q4 23", v: 96 }, { x: "Q1 24", v: 95 },
              { x: "Q2 24", v: 94 }, { x: "Q3 24", v: d.indexValue + 1 },
              { x: "Q4 24", v: d.indexValue },
            ]}
            dataKey="v" color={d.color}
          />
        </div>
      </Card>
      <Card className="col-span-12">
        <CardHeader title="Decomposition — last 12 months" />
        <ul className="p-5 space-y-3">
          {d.decomposition.map((r) => (
            <li key={r.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink-700">
                <FlaskConical size={14} className="text-ink-400" /> {r.label}
              </span>
              <Badge tone={r.tone}>{r.pct < 0 ? "" : "+"}{r.pct.toFixed(1)}%</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function CompositeBody() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Composite over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "2022", v: 100 }, { x: "Q1 23", v: 99 }, { x: "Q2 23", v: 98 },
              { x: "Q3 23", v: 97 }, { x: "Q4 23", v: 96 }, { x: "Q1 24", v: 95 },
              { x: "Q2 24", v: 94 }, { x: "Q3 24", v: 93 }, { x: "Q4 24", v: 92 },
            ]}
            dataKey="v" color="#0F6A3C"
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Pillar weights" hint="Configurable per portfolio" />
        <div className="p-6">
          <HBar
            data={[
              { name: "GP-E (Energy)", value: 25 },
              { name: "GP-W (Water)", value: 25 },
              { name: "GP-Wt (Waste)", value: 25 },
              { name: "GP-C (Carbon)", value: 25 },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
