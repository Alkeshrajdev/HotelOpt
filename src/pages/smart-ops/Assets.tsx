import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Cpu, Gauge, Wrench } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import {
  ASSETS, CONDITIONS, DEVIATIONS, LAUNDRY, METERS, REF_LABEL, THRESHOLDS,
  defaultReference, fmt, levelFor, type Asset, type CurvePoint, type RefKind,
} from "@/lib/smartOps";
import { ChartTip, DeviationTrack, KV, LevelBadge, PersistenceStrip, ReferencePicker, StatusDot, Swatch } from "@/components/smart-ops/Shared";

export default function Assets() {
  const [selectedId, setSelectedId] = useState(ASSETS[0].id);
  const [refById, setRefById] = useState<Record<string, RefKind>>({});
  const asset = ASSETS.find((a) => a.id === selectedId)!;
  const ref = refById[asset.id] ?? defaultReference(asset.ratio.references);
  const setRef = (k: RefKind) => setRefById((s) => ({ ...s, [asset.id]: k }));
  const ratioAvailable = ASSETS.filter((a) => a.ratio.available).length;
  const above = DEVIATIONS.filter((d) => d.target.type === "asset" && d.band === "above-threshold").length;
  const leaks = ASSETS.filter((a) => a.refrigerant).map((a) => a.refrigerant!.leakRate12mPct);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Smart operations · assets" title="Assets" actions={<Link to="/smart-ops/meters" className="btn-secondary">Meters</Link>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Registered" value={String(ASSETS.length)} hint="chillers · cooling plant · laundry" />
        <StatTile label="Ratio available" value={`${ratioAvailable} / ${ASSETS.length}`} hint={`${ASSETS.length - ratioAvailable} on consumption only`} />
        <StatTile label="Above threshold" value={String(above)} hint="against the asset's own reference" tone={above ? "bad" : "neutral"} />
        <StatTile label="Refrigerant leak rate" value={`${Math.max(...leaks)}%`} hint={`highest · threshold ${THRESHOLDS.leakRateThresholdPct}% · rolling 12 months`} tone={Math.max(...leaks) >= THRESHOLDS.leakRateThresholdPct ? "warn" : "neutral"} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
        <Card className="flex flex-col">
          <CardHeader title="Register" hint="Select an asset" />
          <ul className="px-3 pb-3 pt-2 flex flex-col gap-1">
            {ASSETS.map((a) => {
              const lvl = levelFor({ type: "asset", id: a.id }, "electricity");
              const fact = DEVIATIONS.find((d) => d.target.type === "asset" && d.target.id === a.id);
              const active = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => setSelectedId(a.id)}
                    className={cn("w-full text-left rounded-xl2 px-3 py-3 transition-colors", active ? "bg-ink-900 text-white" : "hover:bg-ink-50")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold truncate">{a.name}</span>
                      <LevelBadge level={lvl.level} inverted={active} />
                    </div>
                    <div className={cn("text-[11px] mt-0.5 truncate", active ? "text-white/70" : "text-ink-500")}>{a.type} · {a.capacity}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn("text-[10px] font-medium", active ? "text-white/80" : "text-ink-500")}>{a.ratio.available ? `Ratio · ${a.ratio.metric}` : "Consumption only"}</span>
                      {fact && <Badge tone={fact.band === "above-threshold" ? "bad" : "warn"}>{fact.band === "above-threshold" ? `+${fact.deviationPct}%` : "watch"}</Badge>}
                    </div>
                  </button>
                </li>
              );
            })}
            <li className="pt-2">
              <div className="rounded-xl2 bg-ink-50 p-4">
                <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-3">Fleet</div>
                <FleetBar label="Output metered" value={ratioAvailable} total={ASSETS.length} />
                <FleetBar label="Above threshold" value={above} total={ASSETS.length} tone="bg-chart-rose" />
                <FleetBar label="Refrigerant-bearing" value={ASSETS.filter((a) => a.refrigerant).length} total={ASSETS.length} tone="bg-chart-mauve" />
                <dl className="text-[11px] mt-3 pt-3 border-t border-ink-200/70 space-y-1">
                  <div className="flex justify-between gap-3"><dt className="text-ink-600">By type</dt><dd className="font-medium text-ink-900">2 chillers · 1 cooling plant · 1 laundry</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-600">Refrigerant charge</dt><dd className="font-medium text-ink-900">{ASSETS.reduce((s, a) => s + (a.refrigerant?.chargeKg ?? 0), 0)} kg R-134a</dd></div>
                </dl>
              </div>
              <div className="pt-3 px-3 text-[11px] text-ink-500">
                An asset earns a ratio only when its input and its output are both metered. Otherwise it is reported on consumption, like an end-use.
              </div>
            </li>
          </ul>
        </Card>
        <ReferencesCard asset={asset} value={ref} onChange={setRef} className="flex-1" />
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-4">
          <AssetDetail asset={asset} ref_={ref} setRef={setRef} />
        </div>
      </div>
    </div>
  );
}

function FleetBar({ label, value, total, tone = "bg-chart-olive" }: { label: string; value: number; total: number; tone?: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 py-1">
      <span className="text-[11px] text-ink-600">{label}</span>
      <div className="h-2 rounded-full bg-white overflow-hidden"><div className={cn("h-full rounded-full", tone)} style={{ width: `${(value / total) * 100}%` }} /></div>
      <span className="text-[11px] font-semibold text-ink-900 tabular-nums">{value} / {total}</span>
    </div>
  );
}

function AssetDetail({ asset, ref_: ref, setRef }: { asset: Asset; ref_: RefKind; setRef: (k: RefKind) => void }) {
  const toast = useToast();
  const fact = DEVIATIONS.find((d) => d.target.type === "asset" && d.target.id === asset.id);
  const lvl = levelFor({ type: "asset", id: asset.id }, "electricity");
  const meters = asset.linkedMeters.map((id) => METERS.find((m) => m.id === id)).filter(Boolean);
  const isLaundry = asset.id === "AST-004";

  const curveData = useMemo(() => {
    const loads = [25, 50, 75, 100];
    return loads.map((load) => {
      const row: Record<string, number | string> = { load: `${load}%` };
      (["design", "commissioned", "baseline"] as RefKind[]).forEach((k) => {
        const p = asset.ratio.curves[k]?.find((c) => c.load === load);
        if (p) row[REF_LABEL[k]] = p.value;
      });
      const m = asset.ratio.measured.find((c) => c.load === load);
      if (m) row.Measured = m.value;
      return row;
    });
  }, [asset]);

  const band = (load: number) => ({ m: asset.ratio.measured.find((c) => c.load === load)?.value, r: asset.ratio.curves[ref]?.find((c) => c.load === load)?.value });
  const b75 = band(75);
  const dev = b75.m && b75.r ? ((b75.m - b75.r) / b75.r) * 100 : null;
  const hoursKnown = asset.ratio.measured.some((p) => p.hours);

  return (
    <>
      <Card>
        <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[17px] font-semibold text-ink-900">{asset.name}</h3>
              <LevelBadge level={lvl.level} coveragePct={lvl.coveragePct} />
              <Badge tone={asset.ratio.available ? "good" : "neutral"}>{asset.ratio.available ? `Ratio · ${asset.ratio.metric}` : "Consumption only"}</Badge>
            </div>
            <div className="text-[12px] text-ink-500 mt-1">{asset.manufacturer} {asset.model} · {asset.capacity} · {asset.location} · installed {asset.installed}</div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {meters.map((m) => m && (
                <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] text-ink-700" title={m.name}>
                  <StatusDot status={m.status} label={false} /> {m.id}
                </span>
              ))}
            </div>
          </div>
          <button className="btn-secondary" onClick={() => toast.success(`Maintenance action raised for ${asset.name}`)}><Wrench size={14} /> Raise maintenance action</button>
        </div>
      </Card>

      <Card className="flex flex-col">
        <CardHeader
          title={isLaundry ? "Process intensity" : `Performance ratio at load — ${asset.ratio.metric}`}
          hint={asset.ratio.available ? `Measured ${asset.ratio.measuredWindow}` : "Ratio not available"}
          right={<ReferencePicker refs={asset.ratio.references} value={ref} onChange={setRef} />}
        />
        {!asset.ratio.available ? (
          <div className="px-6 pb-6 pt-4 grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-7">
              <EmptyState inset icon={<Gauge size={20} />} title="Ratio not available" description={asset.ratio.missing} />
            </div>
            <div className="col-span-12 md:col-span-5 flex flex-col">
              {hoursKnown ? (
                <>
                  <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-2">Hours at load · last window with output</div>
                  <LoadHours points={asset.ratio.measured} focus={[50, 75]} />
                </>
              ) : (
                <div className="rounded-xl2 bg-ink-50 p-4 text-[12px] text-ink-600 leading-snug">
                  {asset.ratio.references[0] && <>Design reference on file: <span className="font-medium text-ink-900">{asset.ratio.references[0].source}</span>. It is drawn once the output side is metered.</>}
                </div>
              )}
              <div className="mt-auto pt-3 text-[11px] text-ink-500">Until the output side is measured, this asset is reported on consumption only — the same statements an end-use may make.</div>
            </div>
          </div>
        ) : isLaundry ? (
          <div className="px-6 pb-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Cell label="Electricity" value={`${LAUNDRY.kwhPerKg.measured} kWh/kg`} sub={`${REF_LABEL[ref]} ${LAUNDRY.kwhPerKg[ref === "commissioned" ? "baseline" : ref]} kWh/kg`} />
            <Cell label="Water" value={`${LAUNDRY.lPerKg.measured} L/kg`} sub={`${REF_LABEL[ref]} ${LAUNDRY.lPerKg[ref === "commissioned" ? "baseline" : ref]} L/kg`} />
            <Cell label="Volume · month" value={`${fmt(LAUNDRY.monthKg)} kg`} sub="laundry system feed" />
            <Cell label="Daily detail" value="End-uses" sub="intensity vs volume" to="/smart-ops/end-uses" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4 px-3 pt-2">
              <div className="col-span-12 md:col-span-8">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={curveData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="load" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} label={{ value: "% load", position: "insideBottomRight", offset: -4, fontSize: 10, fill: CHART.axis }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<ChartTip unit={asset.ratio.metric} format={(v) => v.toFixed(2)} />} />
                    {(["design", "commissioned", "baseline"] as RefKind[]).filter((k) => asset.ratio.curves[k]).map((k) => (
                      <Line key={k} type="monotone" dataKey={REF_LABEL[k]} stroke={k === ref ? CHART.mauve : CHART.reference} strokeWidth={k === ref ? 2 : 1.25} strokeDasharray={k === ref ? undefined : "4 3"} dot={k === ref ? { r: 3, fill: CHART.mauve } : false} isAnimationActive={false} />
                    ))}
                    <Line type="monotone" dataKey="Measured" stroke={CHART.olive} strokeWidth={2.5} dot={{ r: 4, fill: CHART.olive }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="px-3 pt-2 flex items-center gap-4 flex-wrap">
                  <Swatch color={CHART.olive} label="Measured" />
                  <Swatch color={CHART.mauve} label={REF_LABEL[ref]} />
                  {(["design", "commissioned", "baseline"] as RefKind[]).filter((k) => asset.ratio.curves[k] && k !== ref).map((k) => <Swatch key={k} color={CHART.reference} dashed label={REF_LABEL[k]} />)}
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 px-3 flex flex-col">
                <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-2">Hours at load · same window</div>
                <LoadHours points={asset.ratio.measured} focus={[50, 75]} />
                <div className="text-[10px] text-ink-400 mt-2 leading-snug">The deviation is read in the 50–75% band, where the chiller spends most of its hours.</div>
              </div>
            </div>
            <div className="mt-auto px-6 py-4 border-t border-ink-100 grid grid-cols-2 md:grid-cols-4 gap-3">
              <KV label="Measured · 75% load" value={b75.m ? `${b75.m} ${asset.ratio.metric}` : "—"} />
              <KV label={`${REF_LABEL[ref]} · 75% load`} value={b75.r ? `${b75.r} ${asset.ratio.metric}` : "—"} />
              <KV label="Deviation" value={dev !== null ? `${dev > 0 ? "+" : ""}${dev.toFixed(1)}%` : "—"} />
              <KV label="Conditions" value={`Wet-bulb ${CONDITIONS.wetBulbC} °C · ${CONDITIONS.manualOverrides.length} manual`} />
            </div>
          </>
        )}
      </Card>

      {fact && (
        <Card className="p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-ink-900">Measured deviation</span>
            <LevelBadge level={fact.level} />
            <Badge tone={fact.band === "above-threshold" ? "bad" : "warn"}>{fact.band === "above-threshold" ? "Above threshold" : "Watch"}</Badge>
            <span className="ml-auto text-[11px] text-ink-500">since {fact.since}</span>
          </div>
          <p className="text-[13px] text-ink-700 leading-snug mt-2">{fact.statement}</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Deviation vs reference</span>
                <span className="text-[12px] font-semibold text-ink-900 tabular-nums">{fact.deviationPct !== undefined && fact.deviationPct > 0 ? "+" : ""}{fact.deviationPct ?? "—"}%</span>
              </div>
              <DeviationTrack pct={fact.deviationPct} band={fact.band} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-1.5">Persistence · last 14 days</div>
              <PersistenceStrip days={fact.persistenceDays} band={fact.band} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <KV label="Measured" value={fact.measured} />
            <KV label="Reference" value={fact.reference} />
            <KV label="Excess since start" value={fact.excess ? `${fmt(fact.excess.value)} ${fact.excess.unit}` : "—"} />
            <KV label="Status" value={fact.status === "action-raised" ? `Action raised · ${fact.actionId}` : fact.status} />
          </div>
          <div className="mt-3 text-[11px] text-ink-500">A measured deviation from the asset's own reference. Whether the asset is faulty, and what to do about it, is an engineering conclusion.</div>
        </Card>
      )}

      <Card className="flex flex-col">
        <CardHeader title="Service events & refrigerant" hint="Overlaid on the timeline so a step change has a candidate cause" />
        <div className="px-6 pb-6 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ol className="relative pl-5 space-y-3 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-ink-200">
            {asset.serviceEvents.map((e) => (
              <li key={e.date} className="relative">
                <span className="absolute -left-5 top-[3px] w-[11px] h-[11px] rounded-full bg-white ring-2 ring-chart-cocoa" />
                <div className="text-[10px] font-mono text-ink-400 leading-none">{e.date}</div>
                <div className="text-[12px] text-ink-800 mt-1">{e.event}</div>
              </li>
            ))}
          </ol>
          {asset.refrigerant ? (
            <div className="rounded-xl2 bg-ink-50 p-4 self-start">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-ink-700">Leak rate · rolling 12 months</span>
                <span className={cn("font-semibold tabular-nums", asset.refrigerant.leakRate12mPct >= THRESHOLDS.leakRateThresholdPct ? "text-warn-700" : "text-ink-900")}>
                  {asset.refrigerant.leakRate12mPct}% <span className="text-ink-400 font-normal">/ threshold {THRESHOLDS.leakRateThresholdPct}%</span>
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-ink-200">
                <div className={cn("h-full rounded-full", asset.refrigerant.leakRate12mPct >= THRESHOLDS.leakRateThresholdPct ? "bg-chart-sand" : "bg-chart-olive")} style={{ width: `${Math.min(100, (asset.refrigerant.leakRate12mPct / 20) * 100)}%` }} />
                <span className="absolute -top-1 -bottom-1 w-px bg-ink-500" style={{ left: `${(THRESHOLDS.leakRateThresholdPct / 20) * 100}%` }} title={`Threshold ${THRESHOLDS.leakRateThresholdPct}%`} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <KV label="Refrigerant" value={`${asset.refrigerant.gas} · ${asset.refrigerant.chargeKg} kg`} />
                <KV label="Method" value={asset.refrigerant.method === "screening" ? "Screening / service record" : "Mass balance"} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl2 bg-ink-50 p-4 self-start text-[11px] text-ink-500 inline-flex items-center gap-1.5"><Cpu size={12} /> No refrigerant-containing components registered.</div>
          )}
        </div>
      </Card>
    </>
  );
}

function ReferencesCard({ asset, value: ref, onChange: setRef, className }: { asset: Asset; value: RefKind; onChange: (k: RefKind) => void; className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
          <CardHeader title="References" hint="Design on day one · commissioned where measured · own baseline as the data allows" />
          <div className="px-3 pb-4 pt-3 flex-1 flex flex-col gap-1">
            {asset.ratio.references.map((r) => {
              const v75 = asset.ratio.curves[r.kind]?.find((c) => c.load === 75)?.value;
              const active = r.kind === ref;
              const available = r.kind !== "baseline" || r.baselineStatus !== "none";
              return (
                <button
                  key={r.kind}
                  type="button"
                  disabled={!available}
                  onClick={() => setRef(r.kind)}
                  className={cn("w-full text-left rounded-xl2 px-3 py-2.5 grid grid-cols-[20px_1fr_auto] items-center gap-3 transition-colors", active ? "bg-ink-50" : "hover:bg-ink-50/60", !available && "opacity-50 cursor-not-allowed")}
                >
                  <span className={cn("w-5 border-t-2", active ? "border-chart-mauve" : "border-dashed border-chart-reference")} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-ink-900">{r.label}</span>
                      {r.kind === "baseline" ? (
                        <Badge tone={r.baselineStatus === "established" ? "good" : r.baselineStatus === "provisional" ? "warn" : "neutral"}>
                          {r.baselineStatus === "established" ? `Established · ${r.monthsOfData} mo` : r.baselineStatus === "provisional" ? `Provisional · ${r.monthsOfData} of ${THRESHOLDS.baselineEstablishedMonths} mo` : "Not yet"}
                        </Badge>
                      ) : <span className="text-[10px] text-ink-400">{r.date}</span>}
                    </div>
                    <div className="text-[10px] text-ink-500 truncate mt-0.5" title={r.source}>{r.source}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold text-ink-900 tabular-nums">{v75 !== undefined ? v75.toFixed(2) : LAUNDRY_REF(asset, r.kind)}</div>
                    <div className="text-[10px] text-ink-400 whitespace-nowrap">{v75 !== undefined ? "at 75% load" : "at rated load"}</div>
                  </div>
                </button>
              );
            })}
            {!asset.ratio.references.some((r) => r.kind === "baseline") && (
              <div className="mx-3 rounded-xl2 p-3 border border-dashed border-ink-200 text-[11px] text-ink-500">Own baseline: not yet — needs {THRESHOLDS.baselineProvisionalMonths} months of interval data with the output measured.</div>
            )}
            <div className="mt-auto px-3 pt-3 text-[11px] text-ink-500">Default: established baseline → commissioned → design. Any of them can be selected.</div>
          </div>
    </Card>

  );
}

/** Laundry references have no load curve — show the rated intensity instead. */
function LAUNDRY_REF(asset: Asset, kind: RefKind) {
  if (asset.id !== "AST-004") return "—";
  const k = kind === "commissioned" ? "baseline" : kind;
  return `${LAUNDRY.kwhPerKg[k]} kWh/kg`;
}

function LoadHours({ points, focus }: { points: CurvePoint[]; focus: number[] }) {
  const max = Math.max(...points.map((p) => p.hours ?? 0), 1);
  const total = points.reduce((s, p) => s + (p.hours ?? 0), 0);
  return (
    <div>
      <div className="flex items-end gap-2 h-[150px]">
        {points.map((p) => (
          <div key={p.load} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
            <span className="text-[10px] text-ink-500 tabular-nums">{p.hours ?? 0} h</span>
            <div className={cn("w-full rounded-t-md", focus.includes(p.load) ? "bg-chart-olive" : "bg-chart-sage")} style={{ height: `${((p.hours ?? 0) / max) * 100}%` }} title={`${p.hours ?? 0} h at ${p.load}% load`} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        {points.map((p) => <span key={p.load} className="flex-1 text-center text-[10px] text-ink-400 tabular-nums">{p.load}%</span>)}
      </div>
      <div className="text-[10px] text-ink-400 mt-1 text-right tabular-nums">{total} h in window</div>
    </div>
  );
}

function Cell({ label, value, sub, to }: { label: string; value: string; sub: string; to?: string }) {
  const inner = (
    <>
      <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">{label}</div>
      <div className="text-[15px] font-bold text-ink-900 tabular-nums mt-0.5">{value}</div>
      <div className="text-[11px] text-ink-500 mt-0.5">{sub}</div>
    </>
  );
  return to ? <Link to={to} className="rounded-xl2 bg-ink-50 p-3 hover:bg-ink-100 transition-colors block">{inner}</Link> : <div className="rounded-xl2 bg-ink-50 p-3">{inner}</div>;
}
