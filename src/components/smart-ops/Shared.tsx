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
      <div className={cn("mt-3 grid gap-x-6 gap-y-1 text-[12px]", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
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
