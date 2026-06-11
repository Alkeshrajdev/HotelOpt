import { useState, type ReactNode } from "react";
import { ArrowDownUp, Building2, GitCompareArrows, Trophy } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import HBar from "@/components/charts/HBar";
import AreaTrend from "@/components/charts/Area";
import { PROPERTIES } from "@/lib/mock";
import { HeroValue } from "@/components/dashboard/Drilldowns";
import type { PillarKey } from "./Shell";

const RANK = [...PROPERTIES].sort((a, b) => b.score - a.score);

const PILLAR_LABEL: Record<PillarKey, string> = {
  energy: "Energy", water: "Water", waste: "Waste",
  carbon: "Carbon", social: "Social", governance: "Governance",
};

export default function Internal({ pillar }: { pillar: PillarKey }) {
  const [openProperty, setOpenProperty] = useState<typeof PROPERTIES[number] | null>(null);
  const [openMetric, setOpenMetric] = useState<null | "best" | "spread" | "underperform">(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={<Trophy size={18} />}
          iconBg="bg-pillar-energy/10 text-pillar-energy"
          label="Best in portfolio"
          value="92" caption={RANK[0].name}
          onClick={() => setOpenMetric("best")}
        />
        <KpiTile
          icon={<GitCompareArrows size={18} />}
          iconBg="bg-info/10 text-info"
          label="Median score"
          value="78" delta={2.4} goodDirection="up"
          onClick={() => setOpenMetric("spread")}
        />
        <KpiTile
          icon={<GitCompareArrows size={18} />}
          iconBg="bg-warn/10 text-warn"
          label="Spread"
          value="50 pts" caption="Best 92 — worst 42"
          onClick={() => setOpenMetric("spread")}
        />
        <KpiTile
          icon={<Building2 size={18} />}
          iconBg="bg-bad/10 text-bad"
          label="Below 60"
          value={String(RANK.filter((r) => r.score < 60).length)}
          caption="properties needing attention"
          onClick={() => setOpenMetric("underperform")}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader
            title={`Portfolio league — ${PILLAR_LABEL[pillar]}`}
            hint={`${RANK.length} properties · click a row for the property profile`}
            right={
              <button className="btn-secondary">
                <ArrowDownUp size={14} /> Sort
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">#</th>
                  <th className="table-th">Property</th>
                  <th className="table-th">Region</th>
                  <th className="table-th">Rooms</th>
                  <th className="table-th">Score</th>
                  <th className="table-th">Trend</th>
                </tr>
              </thead>
              <tbody>
                {RANK.map((p, idx) => (
                  <tr
                    key={p.id}
                    onClick={() => setOpenProperty(p)}
                    className="hover:bg-ink-50/60 cursor-pointer"
                  >
                    <td className="table-td">
                      {idx === 0 ? (
                        <Trophy size={16} className="text-warn" />
                      ) : (
                        <span className="font-semibold text-ink-700">{idx + 1}</span>
                      )}
                    </td>
                    <td className="table-td font-medium text-ink-900">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-brand-700" />
                        {p.name}
                      </div>
                    </td>
                    <td className="table-td">{p.region}</td>
                    <td className="table-td">{p.rooms}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <ProgressBar value={p.score} tone={p.score >= 75 ? "good" : p.score >= 60 ? "warn" : "bad"} />
                        </div>
                        <span className="font-semibold w-8 text-right">{p.score}</span>
                      </div>
                    </td>
                    <td className="table-td">
                      <Badge tone={idx % 3 === 0 ? "good" : idx % 3 === 1 ? "warn" : "info"}>
                        {idx % 3 === 0 ? "Improving" : idx % 3 === 1 ? "Flat" : "Declining"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Side-by-side comparison" />
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select className="input"><option>Skyline Dubai</option></select>
              <select className="input"><option>Peaks Resort Zermatt</option></select>
            </div>
            <KvCompare label="EUI (kWh/ORN)" a="22" b="28" winner="a" />
            <KvCompare label="Water (m³/ORN)" a="0.41" b="0.46" winner="a" />
            <KvCompare label="Waste (kg/ORN)" a="1.6" b="1.9" winner="a" />
            <KvCompare label="Diversion rate" a="68%" b="58%" winner="a" />
            <KvCompare label="GP Index" a="92" b="86" winner="a" />
            <KvCompare label="Renewable share" a="78%" b="51%" winner="a" />
          </div>
        </Card>
      </div>

      {/* Property profile modal */}
      <Modal
        open={openProperty !== null}
        onClose={() => setOpenProperty(null)}
        title={openProperty?.name ?? ""}
        subtitle={`${openProperty?.region ?? ""} · ${openProperty?.rooms ?? ""} rooms · GFA ${openProperty?.gfa.toLocaleString() ?? ""} m²`}
        hero={
          openProperty ? (
            <HeroValue
              value={String(openProperty.score)}
              context={`Score · rank ${RANK.findIndex((p) => p.id === openProperty.id) + 1} of ${RANK.length}`}
            />
          ) : undefined
        }
        size="xl"
      >
        {openProperty && <PropertyProfile property={openProperty} />}
      </Modal>

      {/* Metric drilldowns */}
      <Modal
        open={openMetric !== null}
        onClose={() => setOpenMetric(null)}
        title={
          openMetric === "best" ? "Best in portfolio"
          : openMetric === "spread" ? "Score spread across properties"
          : openMetric === "underperform" ? "Properties below 60"
          : ""
        }
        size="xl"
      >
        {openMetric === "best" && (
          <Card>
            <CardHeader title="Top 5 properties by score" />
            <div className="p-6">
              <HBar data={RANK.slice(0, 5).map((r) => ({ name: r.name, value: r.score }))} />
            </div>
          </Card>
        )}
        {openMetric === "spread" && (
          <Card>
            <CardHeader title="All properties · ranked" />
            <div className="p-6">
              <HBar data={RANK.map((r) => ({ name: r.name, value: r.score }))} />
            </div>
          </Card>
        )}
        {openMetric === "underperform" && (
          <Card>
            <CardHeader title="Properties scoring under 60" hint="Prioritise for the action plan" />
            <ul className="p-5 space-y-3 text-sm">
              {RANK.filter((r) => r.score < 60).map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
                  <Building2 size={16} className="text-warn" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink-900">{r.name}</div>
                    <div className="text-[11px] text-ink-500">{r.region}</div>
                  </div>
                  <Badge tone="warn">{r.score}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Modal>
    </div>
  );
}

function PropertyProfile({ property }: { property: typeof PROPERTIES[number] }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Score over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "May", v: property.score - 8 }, { x: "Jun", v: property.score - 7 },
              { x: "Jul", v: property.score - 6 }, { x: "Aug", v: property.score - 5 },
              { x: "Sep", v: property.score - 4 }, { x: "Oct", v: property.score - 4 },
              { x: "Nov", v: property.score - 3 }, { x: "Dec", v: property.score - 2 },
              { x: "Jan", v: property.score - 1 }, { x: "Feb", v: property.score - 1 },
              { x: "Mar", v: property.score - 1 }, { x: "Apr", v: property.score },
            ]}
            dataKey="v" color="#0F6A3C"
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Pillar scores" />
        <div className="p-6">
          <HBar
            data={[
              { name: "Energy", value: property.score },
              { name: "Water", value: Math.max(0, property.score - 4) },
              { name: "Waste", value: Math.max(0, property.score - 8) },
              { name: "Carbon", value: Math.max(0, property.score - 6) },
              { name: "Social", value: Math.min(100, property.score + 3) },
              { name: "Governance", value: Math.min(100, property.score + 6) },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

function KvCompare({ label, a, b, winner }: { label: string; a: string; b: string; winner: "a" | "b" }) {
  return (
    <div className="grid grid-cols-5 items-center gap-2 text-sm">
      <div className="col-span-2 text-right">
        <span className={"font-semibold " + (winner === "a" ? "text-brand-700" : "text-ink-900")}>{a}</span>
      </div>
      <div className="col-span-1 text-center text-[11px] text-ink-500">{label}</div>
      <div className="col-span-2 text-left">
        <span className={"font-semibold " + (winner === "b" ? "text-brand-700" : "text-ink-900")}>{b}</span>
      </div>
    </div>
  );
}
