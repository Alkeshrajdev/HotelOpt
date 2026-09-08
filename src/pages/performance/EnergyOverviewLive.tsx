import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Building2, Zap } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import { Card, CardHeader } from "@/components/ui/Card";
import InsufficientData from "@/components/ui/InsufficientData";
import { useTopbar, ALL_PROPERTIES } from "@/lib/topbarContext";
import { useProperties } from "@/lib/live/properties";
import { useHotelOverview } from "@/lib/live/overview";
import { LiveChip } from "@/lib/live/mode";
import type { CardState } from "@/services/overview";
import { cn } from "@/lib/utils";

/**
 * The Energy overview, from the platform.
 *
 * The same screen as the sample one, fed by v2's overview service: the energy card (the
 * intensity, the total, the change against the same month a year earlier, and the
 * engine's verdict where a model exists) and the twelve-month trend, this year against
 * last. Nothing is computed here — a figure the engine did not produce is not shown, and
 * the screen says why in the engine's own words.
 *
 * Cost and the split by source are not on the overview model; they arrive with the cost
 * and pillar-detail screens and are left off rather than filled in.
 */
function figuresOf(card: CardState) {
  switch (card.state) {
    case "data_unavailable":
      return { kpi: null, total: null, change: null, note: `Data unavailable — ${card.missing.join(", ")}` };
    case "partial_energy_basis":
      return { kpi: null, total: card.comparableTotal, change: null, note: card.reason };
    case "intensity_not_applicable":
      return { kpi: null, total: card.total, change: null, note: card.reason };
    case "data_incomplete":
      return { kpi: card.kpi, total: card.total, change: null, note: `Data incomplete — ${card.missing.join(", ")}` };
    case "no_prior_year_baseline":
      return { kpi: card.kpi, total: card.total, change: null, note: card.changeLabel };
    case "interpretation_unavailable":
      return { kpi: card.kpi, total: card.total, change: card.change, note: card.reason };
    case "full_result":
      return { kpi: card.kpi, total: card.total, change: card.change, note: null };
  }
}

function LiveTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { dataKey: string; value: number | null }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const ty = payload.find((p) => p.dataKey === "ty");
  const py = payload.find((p) => p.dataKey === "py");
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[180px]">
      <div className="font-semibold text-ink-800 mb-2">{label}</div>
      <div className="flex justify-between gap-4"><span className="text-ink-500">This year</span><span className="font-bold text-ink-900">{ty?.value == null ? "Not approved" : `${ty.value.toLocaleString()} ${unit}`}</span></div>
      <div className="flex justify-between gap-4"><span className="text-ink-500">Prior year</span><span className="font-semibold text-ink-400">{py?.value == null ? "Not approved" : `${py.value.toLocaleString()} ${unit}`}</span></div>
    </div>
  );
}

export default function EnergyOverviewLive() {
  const { property } = useTopbar();
  const { properties, loading, error } = useProperties();
  const chosen = property === ALL_PROPERTIES ? properties[0] : properties.find((p) => p.name === property);
  const overview = useHotelOverview(chosen?.id ?? null);

  if (loading) return <InsufficientData title="Reading your hotels" body="One moment — the registry is loading from the platform." />;
  if (error) return <InsufficientData tone="warn" title="Your hotels could not be read" body={error} />;
  if (!chosen) {
    return (
      <InsufficientData
        title="No property is in your access"
        body="A portfolio or property administrator grants access to a hotel; until then there is nothing to show here."
      />
    );
  }
  if (overview.status === "loading" || overview.status === "idle") {
    return <InsufficientData title={`Reading ${chosen.name}`} body="The engine is assembling the month's figures." />;
  }
  if (overview.status === "error") {
    return <InsufficientData tone="warn" title={`${chosen.name} could not be read`} body={overview.message} />;
  }

  const { model } = overview;
  const energy = model.cards.find((c) => c.resource === "energy");
  const figures = energy ? figuresOf(energy) : null;
  const trend = model.mainTrend.available && model.mainTrend.series.available ? model.mainTrend.series : null;
  const unit = trend?.unit ?? figures?.total?.unit ?? "";
  const changePct = figures?.change ? parseFloat(figures.change.percent) : undefined;
  const chartData = (trend?.points ?? []).map((pt) => ({
    month: pt.label.slice(0, 3),
    ty: pt.thisYear === null ? null : Number(pt.thisYear),
    py: pt.priorYear === null ? null : Number(pt.priorYear),
  }));
  const verdict = energy && energy.state === "full_result" ? energy.verdict : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
        <Building2 size={13} className="text-ink-400" />
        <span className="font-semibold text-ink-700">{chosen.name}</span>
        <span>·</span>
        <span>{model.header.periodLabel}</span>
        {model.comparisonLabel && <span>· compared with {model.comparisonLabel}</span>}
        {property === ALL_PROPERTIES && properties.length > 1 && (
          <span className="text-ink-400">· choose a property above; portfolio totals are coming</span>
        )}
        <LiveChip />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={<Zap size={18} />}
          iconBg="bg-pillar-energy/10 text-pillar-energy"
          label={figures?.total?.label ?? "Total consumption"}
          value={figures?.total?.value ?? "—"}
          unit={figures?.total?.unit}
          delta={changePct}
          deltaUnit={figures?.change?.label ?? "vs prior year"}
          goodDirection="down"
          caption={figures?.total ? undefined : figures?.note ?? undefined}
        />
        <KpiTile
          icon={<Activity size={18} />}
          iconBg="bg-warn/10 text-warn"
          label={figures?.kpi?.label ?? "Energy intensity"}
          value={figures?.kpi?.value ?? "—"}
          unit={figures?.kpi?.unit}
          caption={figures?.kpi ? (verdict ? verdict.replace(/_/g, " ") : undefined) : figures?.note ?? undefined}
        />
        <KpiTile
          icon={<Zap size={18} />}
          iconBg="bg-ink-100 text-ink-500"
          label="Energy cost"
          value="—"
          caption="On the Cost screen, once connected"
        />
        <KpiTile
          icon={<Zap size={18} />}
          iconBg="bg-ink-100 text-ink-500"
          label="Renewable share"
          value="—"
          caption="Not yet on the platform"
        />
      </div>

      {figures?.note && figures.total && (
        <div className="text-[12px] text-ink-500 -mt-2">{figures.note}</div>
      )}

      <Card>
        <CardHeader
          title="Monthly consumption — this year vs prior year"
          hint={trend ? `${trend.resourceLabel} in ${trend.unit} · ${trend.monthsWithData} of 12 months approved` : "Twelve months, this year against last"}
        />
        <div className="px-6 pb-6 pt-4">
          {trend ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} barGap={2} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={56}
                  tickFormatter={(v: number) => v.toLocaleString()} />
                <Tooltip content={<LiveTooltip unit={unit} />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="ty" name="This year" fill="#0F6A3C" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="py" name="Prior year" fill="#cbd5e1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(value) => <span style={{ color: "#6b7280" }}>{value}</span>} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className={cn("text-[13px] text-ink-500 py-8 text-center")}>
              {model.mainTrend.available ? (model.mainTrend.series.available ? "" : model.mainTrend.series.reason) : model.mainTrend.reason}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
