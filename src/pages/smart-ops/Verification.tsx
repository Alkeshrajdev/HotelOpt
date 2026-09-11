import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import { CHART, CHART_SERIES } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import {
  MV_MEASURES, MV_RANGE, TODAY_YM, fmt, monthIndex, monthLong, mvSeries, sixLines, verifiedMonthly, ymAdd,
  type MvMeasure, type MvStatus,
} from "@/lib/smartOps";
import { ChartTip, KV, LevelBadge, Swatch } from "@/components/smart-ops/Shared";

const STATUS_TONE: Record<MvStatus, "neutral" | "info" | "warn" | "good" | "brand"> = {
  "awaiting-approval": "warn", implemented: "neutral", monitoring: "info", verified: "good", reported: "brand",
};
const STATUS_LABEL: Record<MvStatus, string> = {
  "awaiting-approval": "Awaiting approval", implemented: "Implemented", monitoring: "Monitoring", verified: "Verified", reported: "Reported",
};
const OPTION_TEXT: Record<MvMeasure["option"], string> = {
  A: "A · retrofit isolation, key parameter",
  B: "B · retrofit isolation, all parameters",
  C: "C · whole facility",
  D: "D · calibrated simulation",
};
const isSigned = (m: MvMeasure) => m.status === "verified" || m.status === "reported";
const signedFmt = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
const kFmt = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));

/* Timeline geometry shared by the header ticks and every row */
const R0 = monthIndex(MV_RANGE.start);
const RN = monthIndex(MV_RANGE.end) - R0 + 1;
const left = (ym: string) => ((monthIndex(ym) - R0) / RN) * 100;
const width = (months: number) => (months / RN) * 100;
const YEARS = [2024, 2025, 2026];
const TODAY_LEFT = left(TODAY_YM) + width(1) / 2;

export default function Verification() {
  const [resource, setResource] = useState<"all" | "electricity" | "water">("all");
  const [selectedId, setSelectedId] = useState(MV_MEASURES[0].id);
  const list = MV_MEASURES.filter((m) => resource === "all" || m.resource === resource);
  const sel = MV_MEASURES.find((m) => m.id === selectedId)!;
  const signed = MV_MEASURES.filter(isSigned);
  const kwh = signed.filter((m) => m.resource === "electricity").reduce((s, m) => s + (m.result?.saving ?? 0), 0);
  const m3 = signed.filter((m) => m.resource === "water").reduce((s, m) => s + (m.result?.saving ?? 0), 0);
  const monitoring = MV_MEASURES.filter((m) => m.status === "monitoring").length;
  const implemented = MV_MEASURES.filter((m) => m.status === "implemented").length;
  const awaiting = MV_MEASURES.filter((m) => m.status === "awaiting-approval").length;

  const series = useMemo(() => mvSeries(sel), [sel]);
  const six = sixLines(sel);
  const unit = sel.resource === "water" ? "m³" : "kWh";
  const tickInterval = Math.max(0, Math.ceil(series.length / 9) - 1);

  const monthly = useMemo(() => verifiedMonthly("electricity"), []);
  const elecSigned = signed.filter((m) => m.resource === "electricity").sort((a, b) => (b.result?.saving ?? 0) - (a.result?.saving ?? 0));
  const waterSigned = signed.filter((m) => m.resource === "water").sort((a, b) => (b.result?.saving ?? 0) - (a.result?.saving ?? 0));
  const maxElec = Math.max(...elecSigned.map((m) => m.result?.saving ?? 0), 1);
  const maxWater = Math.max(...waterSigned.map((m) => m.result?.saving ?? 0), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Smart operations · measurement & verification"
        title="Verification"
        actions={
          <Tabs variant="segmented" size="sm" ariaLabel="Resource"
            items={[{ key: "all", label: "All" }, { key: "electricity", label: "Electricity" }, { key: "water", label: "Water" }]}
            value={resource} onChange={(k) => setResource(k as typeof resource)} />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Signed measures" value={String(signed.length)} hint="L4 · approved plan · named signatory" tone="good" />
        <StatTile label="Verified · electricity" value={`${fmt(kwh)} kWh`} hint="Σ signed savings over their reporting periods" />
        <StatTile label="Verified · water" value={`${fmt(m3)} m³`} hint="Σ signed savings over their reporting periods" />
        <StatTile label="In monitoring" value={String(monitoring)} hint={`${implemented} implemented · ${awaiting} awaiting approval`} tone="info" />
      </div>

      {/* The pipeline: every measure on one calendar */}
      <Card className="flex flex-col">
        <CardHeader
          title="Measures"
          hint="Baseline period → installed → reporting period. A figure is published only once the period reconciles to the bill and a signatory has signed."
        />
        <div className="overflow-x-auto mt-3">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th w-[280px]">Measure</th>
                <th className="table-th">
                  <div className="relative h-4">
                    {YEARS.map((y) => (
                      <span key={y} className="absolute text-[10px] font-semibold text-ink-400" style={{ left: `${left(`${y}-01`)}%` }}>{y}</span>
                    ))}
                  </div>
                </th>
                <th className="table-th w-[170px]">Status</th>
                <th className="table-th text-right w-[150px]">Verified saving</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const r = sixLines(m);
                const active = m.id === selectedId;
                return (
                  <tr key={m.id} onClick={() => setSelectedId(m.id)} className={cn("cursor-pointer hover:bg-ink-50/60 transition-colors", active && "bg-ink-50")}>
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-ink-900" : "bg-transparent")} />
                        <div className="min-w-0">
                          <div className="font-medium text-ink-900 truncate">{m.name}</div>
                          <div className="text-[10px] font-mono text-ink-400 truncate">{m.id} · {m.target}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td py-1"><Track m={m} /></td>
                    <td className="table-td whitespace-nowrap"><Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge></td>
                    <td className="table-td text-right tabular-nums whitespace-nowrap">
                      {r ? <span className="font-semibold text-ink-900">{fmt(r.saving)} {r.unit}</span>
                        : m.status === "monitoring" ? <span className="text-ink-500">day {m.monitoringDay} of {m.monitoringDays}</span>
                        : m.status === "implemented" ? <span className="text-ink-500">{m.reportingPeriod}</span>
                        : <span className="text-ink-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-auto px-6 py-3 border-t border-ink-100 flex items-center justify-between gap-4 flex-wrap text-[11px] text-ink-500">
          <span>Nothing here is projected, estimated or indicative. Select a measure to see its baseline, its reporting period and its result.</span>
          <div className="flex items-center gap-4">
            <Swatch className="bg-chart-sage" label="Baseline period" />
            <Swatch className="bg-white ring-2 ring-chart-cocoa" label="Installed" />
            <Swatch className="bg-chart-olive" label="Reporting period" />
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-600"><span className="w-px h-3 bg-ink-400" />Today</span>
          </div>
        </div>
      </Card>

      {/* The selected measure: what was measured, against what */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader
            title={sel.name}
            hint={<span title={OPTION_TEXT[sel.option]}>{sel.target} · {sel.property} · IPMVP option {sel.option} · {sel.interval.toLowerCase()} model</span>}
            right={six ? <LevelBadge level="L4" /> : <Badge tone={STATUS_TONE[sel.status]}>{STATUS_LABEL[sel.status]}</Badge>}
          />
          <div className="px-3 pt-3 flex-1">
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={series} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={tickInterval} tickFormatter={(v: string) => (v === "Installed" ? "" : v)} />
                <YAxis tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={44} tickFormatter={kFmt} />
                <Tooltip content={<ChartTip unit={unit} />} cursor={{ fill: CHART.grid }} />
                <Bar dataKey="measured" name="Measured" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                  {series.map((p, i) => <Cell key={i} fill={p.phase === "reporting" ? CHART.olive : CHART.prior} />)}
                </Bar>
                <Line type="monotone" dataKey="model" name="Baseline model" stroke={CHART.mauve} strokeWidth={1.75} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="adjusted" name="Adjusted baseline" stroke={CHART.cocoa} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                {sel.timeline.installed && (
                  <ReferenceLine x="Installed" stroke={CHART.axis} strokeDasharray="3 3" label={{ value: `Installed ${monthLong(sel.timeline.installed)}`, position: "top", fontSize: 10, fill: CHART.label }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 pt-1 pb-3 flex items-center gap-4 flex-wrap">
            <Swatch color={CHART.prior} label="Baseline period" />
            <Swatch color={CHART.olive} label="Reporting period" />
            <Swatch color={CHART.mauve} dashed label="Baseline model" />
            {six && <Swatch color={CHART.cocoa} dashed label="Adjusted baseline" />}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-3 gap-3">
            <KV label="Baseline period" value={sel.baselinePeriod} />
            <KV label="Reporting period" value={sel.reportingPeriod} />
            <KV label="Model fit" value={sel.fit ? `CV(RMSE) ${sel.fit.cvrmse}% · NMBE ${sel.fit.nmbe > 0 ? "+" : ""}${sel.fit.nmbe}%` : "Not fitted yet"} />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader
            title="The result"
            hint={six ? "Baseline year, adjusted to the reporting period, against what was measured" : "No figure until verified"}
            right={six ? <Badge tone="good">Signed</Badge> : <Badge tone={STATUS_TONE[sel.status]}>{STATUS_LABEL[sel.status]}</Badge>}
          />
          {six ? (
            <>
              <div className="px-3 pt-3"><Bridge six={six} /></div>
              <div className="px-6 pt-2 grid grid-cols-3 gap-3">
                <KV label="Raw change · bill" value={`${signedFmt(six.rawChange)} ${six.unit}`} />
                <KV label="Verified saving" value={<span className="text-good-700">{fmt(six.saving)} {six.unit}</span>} />
                <KV label="Meters vs record" value={`${six.reconciliationPct > 0 ? "+" : ""}${six.reconciliationPct}% · within ±5%`} />
              </div>
              <ul className="px-6 pt-4 pb-2 text-[11px] text-ink-600 space-y-1.5 leading-snug">
                <li><span className="font-semibold text-ink-900">Routine {signedFmt(six.routine)} {six.unit}</span> — {six.routineVariables}</li>
                {six.nonRoutineNotes.length
                  ? six.nonRoutineNotes.map((n, i) => <li key={i}><span className="font-semibold text-ink-900">Non-routine {signedFmt(n.qty)} {six.unit}</span> — {n.note}</li>)
                  : <li><span className="font-semibold text-ink-900">Non-routine</span> — none documented</li>}
              </ul>
              <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
                Signed {sel.signatory} · {sel.signedOn}. The saving is the gap to the adjusted baseline; it is not required to equal the change in the bill.
              </div>
            </>
          ) : (
            <Pending m={sel} />
          )}
        </Card>
      </div>

      {/* What has been recognised so far */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Verified savings recognised per month" hint="Electricity · signed L4 outputs only · stacked by measure" />
          <div className="px-3 pt-3 flex-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={Math.max(0, Math.ceil(monthly.length / 9) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={40} tickFormatter={kFmt} />
                <Tooltip content={<ChartTip unit="kWh" />} cursor={{ fill: CHART.grid }} />
                {elecSigned.map((m, i) => (
                  <Bar key={m.id} dataKey={m.id} name={m.name} stackId="s" fill={CHART_SERIES[i]} maxBarSize={26} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 pt-1 pb-3 flex items-center gap-4 flex-wrap">
            {elecSigned.map((m, i) => <Swatch key={m.id} color={CHART_SERIES[i]} label={m.name} />)}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <span>M&V outputs never populate a KPI, an inventory figure or a comparison.</span>
            <span className="font-semibold text-ink-900 tabular-nums whitespace-nowrap">Σ {fmt(kwh)} kWh</span>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="By measure" hint="Each signed figure over its own reporting period" />
          <div className="px-6 pt-4 pb-2 flex-1 flex flex-col gap-4">
            <div className="space-y-3">
              {elecSigned.map((m, i) => <RankRow key={m.id} m={m} max={maxElec} color={CHART_SERIES[i]} onSelect={() => setSelectedId(m.id)} active={m.id === selectedId} />)}
            </div>
            {waterSigned.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-ink-100">
                {waterSigned.map((m) => <RankRow key={m.id} m={m} max={maxWater} color={CHART.mauve} onSelect={() => setSelectedId(m.id)} active={m.id === selectedId} />)}
              </div>
            )}
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Every figure carries its option, its adjustments, its reconciliation and its signatory. Monitoring measures show none until signed.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── One measure on the shared calendar ── */
function Track({ m }: { m: MvMeasure }) {
  const t = m.timeline;
  const fraction = isSigned(m) ? 1 : m.status === "monitoring" && m.monitoringDay && m.monitoringDays ? m.monitoringDay / m.monitoringDays : 0;
  const reportingEnd = t.reportingStart ? monthLong(ymAdd(t.reportingStart, Math.max(0, t.reportingMonths - 1))) : "";
  return (
    <div className="relative h-7">
      {YEARS.map((y) => <span key={y} className="absolute inset-y-0 w-px bg-ink-100" style={{ left: `${left(`${y}-01`)}%` }} />)}
      <span className="absolute inset-y-0 w-px bg-ink-400" style={{ left: `${TODAY_LEFT}%` }} />
      <span
        className="absolute top-[10px] h-2 rounded-full bg-chart-sage"
        style={{ left: `${left(t.baselineStart)}%`, width: `${width(t.baselineMonths)}%` }}
        title={`Baseline period · ${m.baselinePeriod}`}
      />
      {t.reportingStart && (
        <span
          className={cn("absolute top-[10px] h-2 rounded-full overflow-hidden", m.status === "implemented" ? "border border-dashed border-ink-300" : "bg-ink-100")}
          style={{ left: `${left(t.reportingStart)}%`, width: `${width(t.reportingMonths)}%` }}
          title={`Reporting period · ${monthLong(t.reportingStart)} – ${reportingEnd}`}
        >
          {fraction > 0 && <span className="absolute inset-y-0 left-0 rounded-full bg-chart-olive" style={{ width: `${fraction * 100}%` }} />}
        </span>
      )}
      {t.installed && (
        <span
          className="absolute top-[8px] w-3 h-3 rounded-full bg-white ring-2 ring-chart-cocoa"
          style={{ left: `calc(${left(t.installed) + width(1) / 2}% - 6px)` }}
          title={`Installed · ${monthLong(t.installed)}`}
        />
      )}
    </div>
  );
}

/* ── The six lines as a bridge: baseline year → adjustments → adjusted baseline vs reporting → saving ── */
type Six = NonNullable<ReturnType<typeof sixLines>>;
const BRIDGE_FILL = { total: CHART.prior, adj: CHART.mauve, reporting: CHART.moss, saving: CHART.olive } as const;

function Bridge({ six }: { six: Six }) {
  const rows = useMemo(() => {
    let run = six.baselineSame;
    const r: { k: string; base: number; value: number; kind: keyof typeof BRIDGE_FILL; label: string }[] = [
      { k: "Baseline yr", base: 0, value: six.baselineSame, kind: "total", label: fmt(six.baselineSame) },
    ];
    r.push({ k: "Routine", base: Math.min(run, run + six.routine), value: Math.abs(six.routine), kind: "adj", label: signedFmt(six.routine) });
    run += six.routine;
    r.push({ k: "Non-routine", base: Math.min(run, run + six.nonRoutine), value: Math.abs(six.nonRoutine), kind: "adj", label: six.nonRoutine ? signedFmt(six.nonRoutine) : "none" });
    r.push({ k: "Adjusted", base: 0, value: six.adjustedBaseline, kind: "total", label: fmt(six.adjustedBaseline) });
    r.push({ k: "Reporting", base: 0, value: six.reporting, kind: "reporting", label: fmt(six.reporting) });
    r.push({ k: "Saving", base: six.reporting, value: six.saving, kind: "saving", label: fmt(six.saving) });
    return r;
  }, [six]);
  const lowest = Math.min(six.baselineSame, six.reporting, six.adjustedBaseline);
  const highest = Math.max(six.baselineSame, six.adjustedBaseline, six.reporting + six.saving);
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(1, (highest - lowest * 0.85) / 4))));
  const lo = Math.floor((lowest * 0.85) / step) * step;
  const hi = Math.ceil((highest * 1.04) / step) * step;
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={rows} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="k" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} interval={0} />
        <YAxis domain={[lo, hi]} allowDataOverflow tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={44} tickFormatter={kFmt} />
        <Bar dataKey="base" name="_base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" name="Value" stackId="w" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {rows.map((r, i) => <Cell key={i} fill={BRIDGE_FILL[r.kind]} />)}
          <LabelList dataKey="label" position="top" style={{ fontSize: 10, fill: CHART.label, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── A measure without a signed result ── */
function Pending({ m }: { m: MvMeasure }) {
  if (m.status === "awaiting-approval") {
    return (
      <div className="px-6 pb-6 pt-4 flex-1 flex flex-col">
        <EmptyState inset icon={<ShieldCheck size={20} />} title="Plan awaiting approval" description="Option, baseline, reporting period and boundary go to the Platform Admin. Nothing is measured against the plan until then." />
        <div className="mt-auto grid grid-cols-2 gap-3">
          <KV label="Baseline period" value={m.baselinePeriod} />
          <KV label="IPMVP option" value={OPTION_TEXT[m.option]} />
        </div>
      </div>
    );
  }
  const day = m.monitoringDay ?? 0;
  const days = m.monitoringDays ?? 0;
  const pct = days ? (day / days) * 100 : 0;
  const t = m.timeline;
  const start = t.reportingStart ? monthLong(t.reportingStart) : "—";
  const end = t.reportingStart ? monthLong(ymAdd(t.reportingStart, Math.max(0, t.reportingMonths - 1))) : "—";
  return (
    <div className="px-6 pb-6 pt-4 flex-1 flex flex-col gap-4">
      <div className="rounded-xl2 bg-ink-50 p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Reporting period</div>
            <div className="text-stat font-bold text-ink-900 leading-none mt-1.5">{m.status === "monitoring" ? `Day ${day}` : "Not started"}</div>
          </div>
          <div className="text-[12px] text-ink-500 text-right">{m.status === "monitoring" ? `of ${days} days` : m.reportingPeriod}</div>
        </div>
        <div className="h-2 rounded-full bg-ink-200 overflow-hidden mt-4">
          <div className="h-full rounded-full bg-chart-olive" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-ink-400 mt-1.5 tabular-nums"><span>{start}</span><span>{end}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KV label="Baseline period" value={m.baselinePeriod} />
        <KV label="IPMVP option" value={OPTION_TEXT[m.option]} />
        <KV label="Baseline model" value={m.status === "implemented" ? "Fitted · reconciles within ±5%" : "Fitted at approval"} />
        <KV label="Interval" value={m.interval} />
      </div>
      <div className="mt-auto text-[11px] text-ink-500 leading-snug">
        The reporting period must complete and reconcile to the billed record before a saving is determined. Until then the platform shows what was measured, not what it expects.
      </div>
    </div>
  );
}

function RankRow({ m, max, color, active, onSelect }: { m: MvMeasure; max: number; color: string; active: boolean; onSelect: () => void }) {
  const r = sixLines(m)!;
  return (
    <button type="button" onClick={onSelect} className={cn("w-full text-left grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-xl -mx-2 px-2 py-1 transition-colors hover:bg-ink-50/70", active && "bg-ink-50")}>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-ink-900 truncate">{m.name}</div>
        <div className="text-[10px] text-ink-400 truncate">{m.reportingPeriod}</div>
      </div>
      <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(r.saving / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-semibold text-ink-900 tabular-nums whitespace-nowrap w-24 text-right">{fmt(r.saving)} {r.unit}</span>
    </button>
  );
}
