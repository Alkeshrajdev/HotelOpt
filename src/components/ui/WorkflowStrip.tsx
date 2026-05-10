import {
  CheckCircle2,
  Clock,
  Database,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStation = {
  key: "capture" | "review" | "quality" | "gp" | "reports";
  label: string;
  /** Short status text shown under the label, e.g. "82% complete". */
  value: string;
  /** Visual state: ok, warn, bad, info, complete. */
  tone: "ok" | "warn" | "bad" | "info" | "complete";
  /** Optional href — if present the station becomes a link. */
  href?: string;
};

const ICONS: Record<WorkflowStation["key"], LucideIcon> = {
  capture: Database,
  review: Clock,
  quality: ShieldCheck,
  gp: Sparkles,
  reports: FileText,
};

const TONES: Record<
  WorkflowStation["tone"],
  { dot: string; ring: string; text: string }
> = {
  ok:       { dot: "bg-good", ring: "ring-good/25 bg-good/5",  text: "text-good" },
  complete: { dot: "bg-good", ring: "ring-good/25 bg-good/5",  text: "text-good" },
  warn:     { dot: "bg-warn", ring: "ring-warn/25 bg-warn/5",  text: "text-warn" },
  bad:      { dot: "bg-bad",  ring: "ring-bad/25  bg-bad/5",   text: "text-bad"  },
  info:     { dot: "bg-info", ring: "ring-info/25 bg-info/5",  text: "text-info" },
};

/**
 * Operational workflow strip:
 *  Data Capture → Pending Review → Data Quality → GP Ready → Reports Ready
 *
 * Used on the executive dashboard and pillar dashboards to answer
 * "what must the user do next?".
 */
export default function WorkflowStrip({
  stations,
}: {
  stations: WorkflowStation[];
}) {
  return (
    <div className="card card-pad-lg">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">
            Data & Reporting Progress
          </div>
          <div className="text-[12px] text-ink-500">
            From data capture to approved reports
          </div>
        </div>
        <button className="text-[12px] font-semibold text-brand-700 hover:text-brand-800">
          What does this mean?
        </button>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {stations.map((s, idx) => {
          const Icon = ICONS[s.key];
          const tone = TONES[s.tone];
          const isComplete = s.tone === "complete" || s.tone === "ok";
          const Wrapper: any = s.href ? "a" : "div";
          return (
            <Wrapper
              key={s.key}
              href={s.href}
              className={cn(
                "relative flex flex-col gap-2 rounded-xl p-3 ring-1",
                tone.ring,
                s.href && "hover:shadow-card cursor-pointer transition-shadow"
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-lg grid place-items-center text-white shrink-0",
                  tone.dot
                )}
              >
                {isComplete ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Icon size={14} />
                )}
              </span>
              <div>
                <div className="text-[13px] font-semibold text-ink-900 leading-tight">
                  {s.label}
                </div>
                <div className="text-[10px] font-medium text-ink-400 mt-0.5">
                  Step {idx + 1}
                  {" · "}
                  <span className={cn("font-semibold", tone.text)}>{s.value}</span>
                </div>
              </div>
              {/* Connector arrow */}
              {idx < stations.length - 1 && (
                <span
                  className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-px bg-ink-200"
                  aria-hidden
                />
              )}
            </Wrapper>
          );
        })}
      </ol>
    </div>
  );
}
