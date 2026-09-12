import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Radio } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  LEVEL_TEXT, MODE_LABEL, REF_LABEL, THRESHOLDS,
  type DeviationFact, type Level, type MeterStatus, type Mode, type RefKind, type Reference,
} from "@/lib/smartOps";

/* ── Level (L1–L4) — every diagnostic statement carries the level that entitles it ── */

export function LevelBadge({ level, coveragePct, separationPct, inverted = false, className }: {
  level: Level; coveragePct?: number; separationPct?: number; inverted?: boolean; className?: string;
}) {
  const detail = [
    LEVEL_TEXT[level],
    coveragePct !== undefined ? `Parent coverage ${Math.round(coveragePct)}% (min ${THRESHOLDS.parentCoverageMinPct}%)` : null,
    separationPct !== undefined ? `End-use separation ${Math.round(separationPct)}% (min ${THRESHOLDS.endUseSeparationMinPct}%)` : null,
  ].filter(Boolean).join(" · ");
  return (
    <span
      title={detail}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] cursor-help",
        inverted ? "bg-white text-ink-900" : "bg-ink-900 text-white",
        className
      )}
    >
      {level}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: Mode | "sensor-health" | "night-flow" }) {
  const label = mode === "sensor-health" ? "Sensor health" : mode === "night-flow" ? "Night flow" : MODE_LABEL[mode];
  return <Badge tone="neutral">{label}</Badge>;
}

/* ── Meter status ── */

const STATUS_TONE: Record<MeterStatus, string> = { live: "bg-good", delayed: "bg-warn", offline: "bg-bad" };
const STATUS_LABEL: Record<MeterStatus, string> = { live: "Live", delayed: "Delayed", offline: "Offline" };

export function StatusDot({ status, label = true }: { status: MeterStatus; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-600">
      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_TONE[status], status === "offline" && "animate-pulse")} />
      {label && STATUS_LABEL[status]}
    </span>
  );
}

export function DataSourcePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 text-ink-600 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
      <Radio size={10} /> {label}
    </span>
  );
}

export function LastUpdated({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
      <Clock size={11} /> {text}
    </span>
  );
}

/* ── Reference picker: design · commissioned · own baseline (user's choice, default follows the data) ── */

export function ReferencePicker({ refs, value, onChange }: {
  refs: Reference[]; value: RefKind; onChange: (k: RefKind) => void;
}) {
  const order: RefKind[] = ["design", "commissioned", "baseline"];
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-ink-100 p-1">
      {order.map((k) => {
        const ref = refs.find((r) => r.kind === k);
        const available = !!ref && (k !== "baseline" || ref.baselineStatus !== "none");
        const active = value === k;
        const tag = k === "baseline" && ref?.baselineStatus === "provisional" ? ` · provisional` : "";
        return (
          <button
            key={k}
            type="button"
            disabled={!available}
            onClick={() => onChange(k)}
            title={ref ? `${ref.source} · ${ref.date}` : "Not available for this asset"}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap",
              active ? "bg-white shadow-card text-ink-900" : "text-ink-500 hover:text-ink-800",
              !available && "opacity-40 cursor-not-allowed hover:text-ink-500"
            )}
          >
            {REF_LABEL[k]}{tag}
          </button>
        );
      })}
    </div>
  );
}

/* ── A deviation fact, rendered the way the guide permits: measured · reference · deviation · persistence · excess ── */

const BAND_TONE = { "above-threshold": "bad", watch: "warn", "data-quality": "neutral" } as const;
const BAND_LABEL = { "above-threshold": "Above threshold", watch: "Watch", "data-quality": "Data quality" } as const;
const STATUS_LABEL_FACT = { open: "Open", acknowledged: "Acknowledged", "action-raised": "Action raised", resolved: "Resolved" } as const;

export function FactRow({ fact, compact = false, to }: { fact: DeviationFact; compact?: boolean; to?: string }) {
  return (
    <div className={cn("rounded-xl2 bg-ink-50", compact ? "p-4" : "p-5")}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px] font-semibold text-ink-900">{fact.target.label}</span>
        <ModeBadge mode={fact.mode} />
        <LevelBadge level={fact.level} />
        <span className="ml-auto flex items-center gap-2">
          <Badge tone={BAND_TONE[fact.band]}>{BAND_LABEL[fact.band]}</Badge>
          {!compact && <Badge tone="neutral">{STATUS_LABEL_FACT[fact.status]}</Badge>}
        </span>
      </div>
      <p className={cn("text-ink-700 leading-snug mt-2", compact ? "text-[12px]" : "text-[13px]")}>{fact.statement}</p>
      {!compact && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Deviation vs reference</span>
              <span className="text-[12px] font-semibold text-ink-900 tabular-nums">{fact.deviationPct === undefined ? fact.measured : `${fact.deviationPct > 0 ? "+" : ""}${fact.deviationPct}%`}</span>
            </div>
            <DeviationTrack pct={fact.deviationPct} band={fact.band} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-1.5">Persistence · last 14 days</div>
            <PersistenceStrip days={fact.persistenceDays} band={fact.band} />
          </div>
        </div>
      )}
      <div className={cn("mt-4 grid gap-x-6 gap-y-1 text-[12px]", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
        <KV label="Measured" value={fact.measured} />
        <KV label={fact.refKind ? `Reference · ${REF_LABEL[fact.refKind].toLowerCase()}` : "Reference"} value={fact.reference} />
        <KV label="Persistence" value={`${fact.persistenceDays} day${fact.persistenceDays === 1 ? "" : "s"} · since ${fact.since}`} />
        {fact.excess ? (
          <KV label="Excess since start" value={`${fact.excess.value.toLocaleString("en-US")} ${fact.excess.unit}`} />
        ) : fact.deviationPct !== undefined ? (
          <KV label="Deviation" value={`${fact.deviationPct > 0 ? "+" : ""}${fact.deviationPct}%`} />
        ) : <span />}
      </div>
      {to && (
        <Link to={to} className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-900">
          Open <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

export function KV({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">{label}</div>
      <div className="text-[12px] font-medium text-ink-900 tabular-nums truncate">{value}</div>
    </div>
  );
}

/* ── Section label used above card rows ── */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400">{children}</div>
      {right}
    </div>
  );
}

/* ── A fact as a bar: deviation against the materiality threshold, with persistence ── */

const BAND_BAR = { "above-threshold": "bg-chart-rose", watch: "bg-chart-sand", "data-quality": "bg-chart-moss" } as const;

/** The bar itself: deviation on a 0–max% scale, the tick at the materiality threshold. No percentage → full bar (a threshold-type fact). */
export function DeviationTrack({ pct, band, max = 70 }: { pct?: number; band: DeviationFact["band"]; max?: number }) {
  const width = pct === undefined ? 100 : Math.max(2, Math.min(100, (pct / max) * 100));
  const threshold = (THRESHOLDS.materialityPct / max) * 100;
  return (
    <div className="relative h-2.5 rounded-full bg-ink-100">
      <div className={cn("h-full rounded-full", BAND_BAR[band])} style={{ width: `${width}%` }} />
      {pct !== undefined && <span className="absolute -top-1 -bottom-1 w-px bg-ink-400" style={{ left: `${threshold}%` }} title={`Threshold ${THRESHOLDS.materialityPct}%`} />}
    </div>
  );
}

export function FactBar({ fact, to, max = 70, className }: { fact: DeviationFact; to?: string; max?: number; className?: string }) {
  const pct = fact.deviationPct;
  const modeLabel = fact.mode === "sensor-health" ? "Sensor health" : fact.mode === "night-flow" ? "Night flow" : MODE_LABEL[fact.mode];
  const row = (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_64px] items-center gap-4 py-2", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] font-semibold text-ink-900 truncate">{fact.target.label}</span>
          <LevelBadge level={fact.level} />
        </div>
        <div className="text-[10px] text-ink-400 truncate mt-0.5">{modeLabel} · {fact.measured} vs {fact.reference}</div>
      </div>
      <div title={pct === undefined ? fact.statement : `${pct > 0 ? "+" : ""}${pct}% against the reference · threshold ${THRESHOLDS.materialityPct}%`}>
        <DeviationTrack pct={pct} band={fact.band} max={max} />
      </div>
      <div className="text-right tabular-nums">
        <div className="text-[12px] font-semibold text-ink-900 whitespace-nowrap">{pct === undefined ? fact.measured : `${pct > 0 ? "+" : ""}${pct}%`}</div>
        <div className="text-[10px] text-ink-400 whitespace-nowrap">{fact.persistenceDays} day{fact.persistenceDays === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
  return to ? <Link to={to} className="block rounded-xl hover:bg-ink-50/70 -mx-2 px-2 transition-colors">{row}</Link> : row;
}

/** One cell per day: filled for each day the deviation has persisted, lightest at the start of the window. */
export function PersistenceStrip({ days, max = 14, band }: { days: number; max?: number; band: DeviationFact["band"] }) {
  const filled = Math.min(max, days);
  return (
    <div className="flex items-center gap-2" title={`${days} of the last ${max} days`}>
      <div className="flex gap-px flex-1 h-2.5">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={cn("flex-1 rounded-[2px]", i >= max - filled ? BAND_BAR[band] : "bg-ink-100")} />
        ))}
      </div>
      <span className="text-[10px] text-ink-400 tabular-nums whitespace-nowrap">{days} / {max} d</span>
    </div>
  );
}

/* ── Composition strips (segments summing to a whole) and sparkbars ── */

export type Segment = { label: string; value: number; className: string };

export function SegmentStrip({ segments, legend = true, height = "h-2.5" }: { segments: Segment[]; legend?: boolean; height?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className={cn("flex w-full rounded-full overflow-hidden gap-px bg-white", height)}>
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label} · ${s.value}`} />
        ))}
      </div>
      {legend && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-ink-600">
              <span className={cn("w-2 h-2 rounded-full", s.className)} />
              {s.label} <span className="font-semibold text-ink-900 tabular-nums">{s.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 24 cells for the last 24 hours; the trailing gap is drawn as missing cells — never filled in. */
export function CompletenessStrip({ gapHours, status, hours = 24 }: { gapHours: number; status: MeterStatus; hours?: number }) {
  const missing = Math.min(hours, gapHours);
  return (
    <div className="flex gap-px h-3" title={missing ? `${gapHours} h without a reading` : "Complete"}>
      {Array.from({ length: hours }, (_, i) => {
        const gap = i >= hours - missing;
        return <span key={i} className={cn("flex-1 rounded-[2px]", !gap ? "bg-chart-olive/70" : status === "offline" ? "bg-chart-rose/60" : "bg-chart-sand")} />;
      })}
    </div>
  );
}

export function MiniBars({ values, className = "bg-chart-olive", height = "h-10", highlightLast = false }: { values: number[]; className?: string; height?: string; highlightLast?: boolean }) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex items-end gap-[3px]", height)}>
      {values.map((v, i) => (
        <span key={i} className={cn("flex-1 rounded-[2px]", className, highlightLast && i === values.length - 1 && "opacity-100", highlightLast && i !== values.length - 1 && "opacity-60")} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

/* ── Chart furniture lives with the charts; re-exported here for the Smart Ops pages ── */
export { ChartTip, Swatch } from "@/components/charts/ChartBits";
