import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Cloud, Droplet, Plus, Trash2, Zap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatTile from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import { useTopbar } from "@/lib/topbarContext";
import { LEAGUE, type Rag } from "@/lib/portfolioCompare";
import { gpLeaderboard, gpPortfolioCost, GP_UTILITY_META, type GpUtility } from "@/lib/genuinePerformance";

const PILLARS: { key: GpUtility; label: string; icon: typeof Zap }[] = [
  { key: "energy", label: "Energy", icon: Zap },
  { key: "water",  label: "Water",  icon: Droplet },
  { key: "waste",  label: "Waste",  icon: Trash2 },
  { key: "carbon", label: "Carbon", icon: Cloud },
];
const RAG_BAR: Record<Rag, string> = { green: "bg-chart-olive", amber: "bg-chart-sand", red: "bg-chart-rose" };
const RAG_TONE: Record<Rag, "good" | "warn" | "bad"> = { green: "good", amber: "warn", red: "bad" };
const RAG_LABEL: Record<Rag, string> = { green: "On track", amber: "Monitor", red: "Action needed" };

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtUsd = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${Math.round(a)}`;
  return v < 0 ? `−${s}` : s;
};
const fmtTotal = (v: number) => v.toLocaleString("en-US");

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { setProperty } = useTopbar();
  const pillarParam = params.get("pillar");
  const pillar: GpUtility = PILLARS.some((p) => p.key === pillarParam) ? (pillarParam as GpUtility) : "energy";
  const league = LEAGUE[pillar];
  const meta = GP_UTILITY_META[pillar];

  const gp = useMemo(() => gpLeaderboard(), []);
  const cost = useMemo(() => gpPortfolioCost(), []);
  const gpByName = new Map(gp.map((r) => [r.name, r]));
  const costByName = new Map(cost.byHotel.map((h) => [h.name, h.netUsd]));
  const genuineRows = [...league.rows]
    .map((r) => ({ name: r.name, genuine: gpByName.get(r.name)?.byUtility[pillar] ?? 0 }))
    .sort((a, b) => a.genuine - b.genuine);
  const improving = genuineRows.filter((r) => r.genuine <= 0).length;
  const worsening = genuineRows.length - improving;
  const maxAbs = Math.max(...genuineRows.map((r) => Math.abs(r.genuine)), 1);

  const best = league.rows[0];
  const worst = league.rows[league.rows.length - 1];
  const spread = worst.intensity - best.intensity;

  const openProperty = (name: string) => {
    setProperty(name);
    navigate(`/performance/${pillar}/genuine-performance`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio · comparison"
        title="Compare"
        actions={
          <Tabs
            variant="segmented" size="sm" ariaLabel="Pillar"
            items={PILLARS.map((p) => ({ key: p.key, label: p.label, icon: p.icon }))}
            value={pillar} onChange={(k) => setParams({ pillar: k })}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Best intensity" value={`${best.intensity} ${league.unit}`} hint={best.name} tone="good" />
        <StatTile label="Portfolio average" value={`${league.avg} ${league.unit}`} hint="Σ consumption ÷ Σ occupied room nights" />
        <StatTile label="Worst intensity" value={`${worst.intensity} ${league.unit}`} hint={worst.name} tone="bad" />
        <StatTile label="Genuinely worsening" value={String(worsening)} hint={`${improving} improving · after weather, occupancy and activity`} tone={worsening ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title={`${meta.label} intensity by property`} hint={`${league.unit} · best to worst · marker = portfolio average`} />
          <div className="px-6 pt-4 pb-2 flex-1 space-y-2.5">
            {league.rows.map((r) => {
              const w = ((r.intensity - best.intensity) / spread) * 100;
              const avgLeft = ((league.avg - best.intensity) / spread) * 100;
              return (
                <button key={r.name} type="button" onClick={() => openProperty(r.name)} className="w-full grid grid-cols-[176px_1fr_auto] items-center gap-3 rounded-xl -mx-2 px-2 py-0.5 text-left hover:bg-ink-50/70 transition-colors">
                  <span className="text-[12px] font-medium text-ink-900 truncate">{r.name}</span>
                  <span className="relative block h-2.5 rounded-full bg-ink-100">
                    <span className={cn("absolute inset-y-0 left-0 rounded-full", RAG_BAR[r.rag])} style={{ width: `${Math.max(3, w)}%` }} />
                    <span className="absolute -top-1 -bottom-1 w-px bg-ink-500" style={{ left: `${avgLeft}%` }} title={`Portfolio average ${league.avg} ${league.unit}`} />
                  </span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span className="text-[12px] font-semibold text-ink-900 w-16 text-right">{r.intensity}</span>
                    <span className={cn("text-[11px] font-semibold w-12 text-right", r.yoy <= 0 ? "text-good-700" : "text-bad-700")}>{pct(r.yoy)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <span>Spread {spread.toFixed(1)} {league.unit} between best and worst · year-on-year change alongside.</span>
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-chart-olive" />On track</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-chart-sand" />Monitor</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-chart-rose" />Action needed</span>
            </span>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="Genuine change by property" hint="Measured vs expected · negative = a real efficiency gain" />
          <div className="px-6 pt-4 pb-2 flex-1 space-y-2.5">
            {genuineRows.map((r) => {
              const w = (Math.abs(r.genuine) / maxAbs) * 50;
              return (
                <button key={r.name} type="button" onClick={() => openProperty(r.name)} className="w-full grid grid-cols-[132px_1fr_auto] items-center gap-3 rounded-xl -mx-2 px-2 py-0.5 text-left hover:bg-ink-50/70 transition-colors">
                  <span className="text-[12px] font-medium text-ink-900 truncate">{r.name}</span>
                  <span className="relative block h-2.5 rounded-full bg-ink-100">
                    <span className="absolute inset-y-0 w-px bg-ink-500" style={{ left: "50%" }} />
                    <span
                      className={cn("absolute inset-y-0 rounded-full", r.genuine <= 0 ? "bg-chart-olive" : "bg-chart-rose")}
                      style={r.genuine <= 0 ? { right: "50%", width: `${Math.max(1.5, w)}%` } : { left: "50%", width: `${Math.max(1.5, w)}%` }}
                    />
                  </span>
                  <span className={cn("text-[12px] font-semibold tabular-nums w-14 text-right", r.genuine <= 0 ? "text-good-700" : "text-bad-700")}>{pct(r.genuine)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Genuine strips out weather, occupancy and activity. A hotel can cut raw consumption and still worsen here if it simply ran emptier.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={`${meta.label} — all properties`} hint="Raw intensity, year-on-year change and the genuine lens side by side · click a row to open the property" />
        <div className="overflow-x-auto mt-2">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Property</th>
                <th className="table-th text-right">Rooms</th>
                <th className="table-th text-right">Total ({league.totalUnit})</th>
                <th className="table-th text-right">{league.unit}</th>
                <th className="table-th text-right">vs last year</th>
                <th className="table-th text-right">Genuine · {meta.label.toLowerCase()}</th>
                <th className="table-th text-right">Composite</th>
                <th className="table-th text-right">$ impact / yr</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {league.rows.map((r) => {
                const g = gpByName.get(r.name);
                const genuine = g?.byUtility[pillar];
                const usd = costByName.get(r.name) ?? 0;
                return (
                  <tr key={r.name} onClick={() => openProperty(r.name)} className="cursor-pointer hover:bg-ink-50/60 transition-colors">
                    <td className="table-td font-medium text-ink-900">{r.name}</td>
                    <td className="table-td text-right tabular-nums text-ink-600">{r.rooms}</td>
                    <td className="table-td text-right tabular-nums font-semibold text-ink-900">{fmtTotal(r.total)}</td>
                    <td className="table-td text-right tabular-nums font-semibold text-ink-900">{r.intensity}</td>
                    <td className={cn("table-td text-right tabular-nums font-semibold", r.yoy <= 0 ? "text-good-700" : "text-bad-700")}>{pct(r.yoy)}</td>
                    <td className={cn("table-td text-right tabular-nums font-semibold", genuine === undefined ? "text-ink-400" : genuine <= 0 ? "text-good-700" : "text-bad-700")}>{genuine === undefined ? "—" : pct(genuine)}</td>
                    <td className={cn("table-td text-right tabular-nums", !g ? "text-ink-400" : g.composite <= 0 ? "text-good-700" : "text-bad-700")}>{g ? pct(g.composite) : "—"}</td>
                    <td className={cn("table-td text-right tabular-nums font-semibold", usd > 0 ? "text-bad-700" : "text-good-700")}>{fmtUsd(usd)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <Badge tone={RAG_TONE[r.rag]}>{RAG_LABEL[r.rag]}</Badge>
                        {g?.worsening && (
                          <Link
                            to={`/actions?new=1&property=${encodeURIComponent(r.name)}&pillar=${pillar}&title=${encodeURIComponent(`Recover genuine ${pillar} overspend — ${r.name}`)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-0.5 whitespace-nowrap"
                          >
                            <Plus size={11} /> Action
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
          <span>Genuine is the own-history lens. External benchmarking uses raw and normalised intensity only, never genuine.</span>
          <span className="whitespace-nowrap">Portfolio genuine overspend {fmtUsd(cost.leakageUsd)} / yr · savings already achieved {fmtUsd(cost.savingUsd)} / yr</span>
        </div>
      </Card>

      <div className="text-[11px] text-ink-400 flex items-center gap-1">
        A property's own trend, drivers and events live in its Performance section.
        <Link to={`/performance/${pillar}/genuine-performance`} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 ml-1">Open for the selected property <ArrowRight size={11} /></Link>
      </div>
    </div>
  );
}
