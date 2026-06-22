import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Info, Plus, Settings, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import GenuinePerformancePanel from "@/components/properties/GenuinePerformancePanel";
import { PROPERTIES } from "@/lib/propertiesData";
import { gpLeaderboard, gpPortfolioCost, GP_UTILITY_META, type GpUtility } from "@/lib/genuinePerformance";
import { cn } from "@/lib/utils";

const UTILITIES: GpUtility[] = ["energy", "water", "waste", "carbon"];
const idByName = new Map(PROPERTIES.map((p) => [p.name, p.id]));
const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const cell = (v: number | undefined) =>
  v === undefined ? <span className="text-ink-300">—</span>
  : <span className={v <= 0 ? "text-good" : "text-bad"}>{pct(v)}</span>;

export const fmtUsd = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${Math.round(a)}`;
  return v < 0 ? `−${s}` : s;
};

// Operational events feed GP — it recalculates before/after each to isolate impact.
const EVENTS = [
  { date: "14 Apr 2026", event: "F&B refurbishment (re-opened)", pillars: ["Energy", "Water", "Waste"], property: "Skyline Dubai", desc: "3 new outlets — chillers ran 24/7 for commissioning", status: "Approved" },
  { date: "02 Feb 2026", event: "LED retrofit — back-of-house",  pillars: ["Energy"],                     property: "Peaks Resort Zermatt", desc: "3,200 fittings replaced", status: "Approved" },
  { date: "22 Nov 2025", event: "Solar PV phase 1 commissioned", pillars: ["Energy", "Carbon"],          property: "Marina Residences Barcelona", desc: "240 kWp rooftop array", status: "Approved" },
];

export default function GenuinePortfolio() {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = gpLeaderboard();
  const improving = rows.filter((r) => !r.worsening).length;
  const worsening = rows.filter((r) => r.worsening).length;
  const avg = rows.reduce((s, r) => s + r.composite, 0) / (rows.length || 1);
  const cost = gpPortfolioCost();
  const costByName = new Map(cost.byHotel.map((h) => [h.name, h.netUsd]));

  return (
    <div className="space-y-5">
      <PageHeader title="Genuine Performance — Portfolio" />

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Sparkles size={16} className="text-brand-700 mt-0.5 shrink-0" />
        <div className="text-[13px] text-brand-900">
          Genuine Performance strips out weather, occupancy and activity, so what's left is
          real efficiency change. <strong>Genuine &lt; 0 = a true improvement.</strong> A hotel can
          cut raw consumption yet still worsen here if it simply ran emptier.
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile label="Portfolio genuine" value={pct(avg)} tone={avg <= 0 ? "good" : "bad"} icon={<Sparkles size={18} />} hint="avg across hotels & utilities" />
        <SummaryTile label="Improving" value={String(improving)} tone="good" icon={<TrendingDown size={18} />} hint="genuine efficiency gain" />
        <SummaryTile label="Worsening" value={String(worsening)} tone="bad" icon={<TrendingUp size={18} />} hint="used more than expected" />
        <SummaryTile label="Savings opportunity" value={fmtUsd(cost.leakageUsd)} tone="bad" icon={<TrendingUp size={18} />} hint="recoverable genuine overspend / yr" />
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader title="Genuine improvement by hotel" hint="Best (most negative) first · click a hotel to drill into its Measured → Expected → Genuine detail" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Hotel</th>
                {UTILITIES.map((u) => <th key={u} className="table-th text-right">{GP_UTILITY_META[u].label}</th>)}
                <th className="table-th text-right">Composite</th>
                <th className="table-th text-right">$ Impact / yr</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSel = selected === r.name;
                return (
                  <tr
                    key={r.name}
                    onClick={() => setSelected(isSel ? null : r.name)}
                    className={cn("border-t border-ink-100 cursor-pointer", isSel ? "bg-brand-50" : "hover:bg-ink-50")}
                  >
                    <td className="table-td font-medium">
                      <span className="inline-flex items-center gap-1 text-brand-700">
                        <ChevronRight size={13} className={cn("transition-transform", isSel && "rotate-90")} />
                        {r.name}
                      </span>
                    </td>
                    {UTILITIES.map((u) => <td key={u} className="table-td text-right tabular-nums">{cell(r.byUtility[u])}</td>)}
                    <td className="table-td text-right tabular-nums font-semibold">{cell(r.composite)}</td>
                    <td className="table-td text-right tabular-nums font-semibold">
                      {(() => { const v = costByName.get(r.name) ?? 0; return <span className={v > 0 ? "text-bad" : "text-good"}>{fmtUsd(v)}</span>; })()}
                    </td>
                    <td className="table-td">
                      <Badge tone={r.worsening ? "bad" : "good"}>{r.worsening ? "Worsening" : "Improving"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Per-hotel drill-in (relocated here from the property page) */}
      {selected && (() => {
        const id = idByName.get(selected);
        return (
          <Card>
            <CardHeader
              title={`Genuine Performance — ${selected}`}
              hint="Measured → Expected → Genuine, with driver decomposition"
              right={
                <div className="flex items-center gap-2">
                  {id && (
                    <Link to={`/properties/${id}?tab=configuration`} className="btn-secondary text-[12px] h-8">
                      <Settings size={13} /> Property config
                    </Link>
                  )}
                  <button onClick={() => setSelected(null)} className="btn-ghost h-8 px-2" title="Close"><X size={14} /></button>
                </div>
              }
            />
            <div className="p-5">
              <GenuinePerformancePanel propertyName={selected} />
            </div>
          </Card>
        );
      })()}

      {/* Operational events log */}
      <Card>
        <CardHeader
          title="Operational events log"
          hint="GP recalculates before and after each event to isolate its impact"
          right={<button className="btn-primary"><Plus size={14} /> Log event</button>}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Date</th>
                <th className="table-th">Event</th>
                <th className="table-th">Pillars</th>
                <th className="table-th">Property</th>
                <th className="table-th">Description</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS.map((e) => (
                <tr key={e.date} className="border-t border-ink-100">
                  <td className="table-td whitespace-nowrap">{e.date}</td>
                  <td className="table-td font-medium">{e.event}</td>
                  <td className="table-td space-x-1">{e.pillars.map((p) => <Badge key={p} tone="brand">{p}</Badge>)}</td>
                  <td className="table-td whitespace-nowrap">{e.property}</td>
                  <td className="table-td text-ink-600">{e.desc}</td>
                  <td className="table-td"><Badge tone="good">{e.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl bg-ink-50 border border-ink-200 p-3 flex items-start gap-2.5">
        <Info size={16} className="text-ink-500 mt-0.5 shrink-0" />
        <div className="text-[13px] text-ink-600">
          <strong>GP boundary:</strong> Genuine Performance is the own-history lens only.
          External Comparison uses raw and normalised intensity — never GP.
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone, icon, hint }: {
  label: string; value: string; tone: "good" | "bad" | "info"; icon: React.ReactNode; hint: string;
}) {
  const ring = { good: "text-good", bad: "text-bad", info: "text-info" }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
        <span className={ring}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${ring}`}>{value}</div>
      <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>
    </Card>
  );
}
