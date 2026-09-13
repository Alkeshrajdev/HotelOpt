/**
 * Genuine performance on approved data — one property, one pillar.
 *
 * The page's job is to stop a reader mistaking weather for management. It shows what the
 * meter recorded, what the property's own baseline model predicts for this year's
 * drivers, the band around that prediction, and only then the difference. When the model
 * could not be fitted the page says which weaker method answered instead, rather than
 * presenting a softer number in the same typeface.
 */
import { useMemo } from "react";
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Database, FlaskConical, Info, TriangleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { useTopbar } from "@/lib/topbarContext";
import { GP_PILLAR_META, usePropertyGenuine, type GpPillar, type GpResult } from "@/lib/data/genuine";
import type { PillarKey } from "./Shell";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortMonth = (ym: string) => MONTH_SHORT[Number(ym.slice(5, 7)) - 1];
const pct = (v: number | null, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}%`);
const qty = (v: number, pillar: GpPillar) =>
  v.toLocaleString("en-US", { maximumFractionDigits: pillar === "waste" ? 1 : 0 });
const kFmt = (v: number) =>
  Math.abs(v) >= 10000 ? `${Math.round(v / 1000)}k` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));

const TIER_LABEL = {
  regression: "Regression",
  ratio: "Ratio normalised",
  raw: "Raw year-on-year",
} as const;
const TIER_TONE = { regression: "good", ratio: "warn", raw: "neutral" } as const;

export default function GenuinePerformanceLive({ pillar }: { pillar: PillarKey }) {
  const { propertyId, propertyName, year } = useTopbar();
  const { results, loading, error } = usePropertyGenuine(propertyId, year);

  const result = useMemo(
    () => (pillar === "carbon" ? null : results.find((r) => r.pillar === (pillar as GpPillar)) ?? null),
    [results, pillar],
  );

  if (pillar === "carbon") {
    return (
      <EmptyState
        icon={<Info size={20} />}
        title="Genuine performance is measured on the metered pillars"
        description="Carbon is energy, water and waste multiplied by emission factors, so a grid that decarbonises would show as an efficiency gain the property never made. Read genuine performance on Energy, then the Carbon inventory for the emissions themselves."
      />
    );
  }
  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState icon={<Database size={20} />} title="Could not load approved data" description={error} />;
  if (!result) return <EmptyState icon={<FlaskConical size={20} />} title="Nothing to model yet" description={`${propertyName} has no approved data for this pillar.`} />;

  const r = result;
  const meta = GP_PILLAR_META[r.pillar];
  const good = r.genuinePct != null && r.genuinePct < 0;

  // The chart has to cover exactly the months the headline numbers cover. A month the
  // model could not reach is named in "Before you quote this", not drawn here with a
  // measured value that the Measured tile does not include — a reader who added up the
  // chart would get a different total from the one at the top of the page.
  const modelled = r.months.filter((m) => m.expected != null);
  const chart = (modelled.length ? modelled : r.months.filter((m) => m.measured != null))
    .map((m) => ({
      month: shortMonth(m.month),
      measured: m.measured,
      expected: m.expected,
      band: m.low != null && m.high != null ? [m.low, m.high] : null,
    }));

  // Computed here rather than handed to recharts as a callback: a month with no band
  // leaves recharts deriving the extent from a null and passing ±Infinity back.
  const spread = chart.flatMap((c) => [c.measured, c.expected, ...(c.band ?? [])].filter((v): v is number => v != null));
  const yDomain: [number, number] = spread.length
    ? (() => {
      const lo = Math.min(...spread), hi = Math.max(...spread);
      const pad = (hi - lo) * 0.12 || hi * 0.05 || 1;
      return [Math.max(0, lo - pad), hi + pad];
    })()
    : [0, 1];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Measured"
          value={`${qty(r.measured, r.pillar)} ${meta.unit}`}
          hint={`approved meter data · raw ${pct(r.rawPct)} vs the same months last year`}
        />
        <StatTile
          label="Expected"
          value={`${qty(r.expected, r.pillar)} ${meta.unit}`}
          tone="info"
          hint={r.interval
            ? `95% range ${qty(r.interval.low, r.pillar)} – ${qty(r.interval.high, r.pillar)} ${meta.unit}`
            : "no prediction interval at this method"}
        />
        <StatTile
          label="Genuine change"
          value={pct(r.genuinePct)}
          tone={r.genuinePct == null ? "neutral" : !r.significant ? "neutral" : good ? "good" : "bad"}
          hint={r.significant ? "measured vs expected · negative is a real gain" : "inside the model's own margin"}
        />
        <StatTile
          label="Method"
          value={TIER_LABEL[r.tier]}
          tone={TIER_TONE[r.tier]}
          hint={r.fit ? `CV(RMSE) ${r.fit.cvrmse.toFixed(1)}% · R² ${r.fit.r2.toFixed(2)}` : "no fitted model"}
        />
      </div>

      <div className={cn(
        "rounded-xl2 px-5 py-4 flex items-start gap-3",
        r.significant && good && "bg-good/10 text-good-700",
        r.significant && !good && "bg-bad/10 text-bad-700",
        !r.significant && "bg-ink-50 text-ink-700",
      )}>
        {r.significant ? <FlaskConical size={16} className="mt-0.5 shrink-0" /> : <Info size={16} className="mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">{r.verdict}</div>
          <div className="text-[12px] text-ink-600 mt-0.5">{r.why}</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 items-stretch">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader
            title="Measured against the model, by month"
            hint={`${meta.unit} · the band is where the baseline model expects this month to land`}
          />
          <div className="px-3 pt-3 flex-1">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} interval={0} />
                {/* The question is whether Measured sits inside the band, so the axis frames
                    the band rather than the origin. Two lines are being compared, not bar
                    heights, so a non-zero baseline does not overstate anything. */}
                <YAxis
                  domain={yDomain}
                  allowDataOverflow
                  tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={46} tickFormatter={kFmt}
                />
                <Tooltip content={<MonthTip unit={meta.unit} pillar={r.pillar} />} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, color: CHART.axis, paddingTop: 6 }} />
                <Area dataKey="band" name="Expected range (95%)" stroke="none" fill={CHART.sage} fillOpacity={1} isAnimationActive={false} legendType="rect" />
                <Line dataKey="expected" name="Expected" stroke={CHART.mauve} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                <Line dataKey="measured" name="Measured" stroke={CHART.olive} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART.olive }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            A month inside the band is a month the drivers already explain; only a run outside it is evidence of a change in how the building is run. The {chart.length} months here are the same ones behind the figures above.
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader
            title="What the model uses"
            hint={r.tier === "regression" ? "Chosen by fit on the baseline year, not assumed" : "The only normalisation this data supports"}
          />
          <div className="px-6 pt-4 pb-2 flex-1">
            {r.drivers.length === 0 ? (
              <EmptyState inset icon={<TriangleAlert size={20} />} title="No driver data" description="Nothing is held constant, so the figure above is a raw comparison." />
            ) : (
              <ul className="space-y-3">
                {r.drivers.map((d) => (
                  <li key={d.key} className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink-900 truncate">{d.label}</div>
                      <div className="text-[11px] text-ink-500">
                        {d.coefficient < 0.01 ? d.coefficient.toExponential(2) : d.coefficient.toFixed(3)} {meta.unit} per {d.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("text-[13px] font-semibold tabular-nums", d.contribution >= 0 ? "text-ink-900" : "text-ink-600")}>
                        {d.contribution > 0 ? "+" : d.contribution < 0 ? "−" : ""}{qty(Math.abs(d.contribution), r.pillar)}
                      </div>
                      <div className="text-[10px] text-ink-400">{meta.unit} vs baseline</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Every driver here can only push consumption up, so a fitted coefficient that came out negative was rejected as collinearity rather than reported.
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4 items-stretch">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Does the model qualify?" hint="ASHRAE Guideline 14 fit criteria, applied before any result is reported" />
          <div className="px-6 pt-4 pb-2 flex-1">
            {r.fit ? (
              <div className="space-y-4">
                <Gate label="CV(RMSE)" value={r.fit.cvrmse} limit={25} suffix="%" hint="scatter of the baseline fit" />
                <Gate label="NMBE, cross-validated" value={Math.abs(r.fit.nmbeCv)} limit={5} suffix="%" hint="bias on a month the model never saw" />
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <Fact label="R²" value={r.fit.r2.toFixed(2)} />
                  <Fact label="Adjusted R²" value={r.fit.adjR2.toFixed(2)} />
                  <Fact label="Degrees of freedom" value={String(r.fit.dof)} />
                </div>
              </div>
            ) : (
              <EmptyState inset icon={<TriangleAlert size={20} />} title="No model was fitted" description={r.why} />
            )}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Bias is measured by leave-one-out cross-validation. On the baseline fit itself it would be zero by construction, so gating on it would prove nothing.
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="Before you quote this" hint="What the number does not cover" />
          <div className="px-6 pt-4 pb-2 flex-1">
            {r.gaps.length === 0 ? (
              <div className="flex items-start gap-2.5 text-[12px] text-ink-700">
                <Badge tone="good">Complete</Badge>
                <span>Both years are fully approved and every driver the model needs is present.</span>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {r.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12px] text-ink-700 leading-snug">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warn-700" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Genuine performance is a property's own-history lens. It is never a comparison between properties — use Benchmarks for that.
          </div>
        </Card>
      </div>
    </div>
  );
}

/** A pass/fail criterion drawn against its limit, so the margin is visible rather than asserted. */
function Gate({ label, value, limit, suffix, hint }: { label: string; value: number; limit: number; suffix: string; hint: string }) {
  const ok = Number.isFinite(value) && value <= limit;
  const max = Math.max(limit * 1.6, value * 1.1);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium text-ink-900">{label}</span>
        <span className={cn("text-[13px] font-semibold tabular-nums", ok ? "text-good-700" : "text-bad-700")}>
          {Number.isFinite(value) ? value.toFixed(1) : "—"}{suffix}
          <span className="text-[11px] font-normal text-ink-400"> / {limit}{suffix}</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-ink-100 mt-1.5 overflow-hidden">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", ok ? "bg-chart-olive" : "bg-chart-rose")}
          style={{ width: `${Math.min(100, (Math.min(value, max) / max) * 100)}%` }}
        />
        <span className="absolute inset-y-0 w-px bg-ink-500" style={{ left: `${(limit / max) * 100}%` }} />
      </div>
      <div className="text-[11px] text-ink-400 mt-1">{hint}</div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.06em] text-ink-400">{label}</div>
      <div className="text-[15px] font-semibold text-ink-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function MonthTip({ active, payload, label, unit, pillar }: {
  active?: boolean;
  payload?: { payload: { measured: number | null; expected: number | null; band: [number, number] | null } }[];
  label?: string; unit: string; pillar: GpPillar;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const row = (name: string, v: number | null, dot: string) => (
    <div className="flex items-center gap-2">
      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dot)} />
      <span className="text-ink-600">{name}</span>
      <span className="ml-auto font-semibold text-ink-900 tabular-nums">{v == null ? "—" : `${qty(v, pillar)} ${unit}`}</span>
    </div>
  );
  return (
    <div className="popover rounded-xl px-3 py-2.5 text-[12px] min-w-[188px] space-y-1">
      <div className="font-semibold text-ink-900 mb-1">{label}</div>
      {row("Measured", d.measured, "bg-chart-olive")}
      {row("Expected", d.expected, "bg-chart-mauve")}
      {d.band && (
        <div className="flex items-center gap-2 pt-1 border-t border-ink-100 mt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-chart-sage shrink-0" />
          <span className="text-ink-600">95% range</span>
          <span className="ml-auto text-ink-700 tabular-nums">{qty(d.band[0], pillar)} – {qty(d.band[1], pillar)}</span>
        </div>
      )}
    </div>
  );
}
