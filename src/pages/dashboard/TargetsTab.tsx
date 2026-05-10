import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Cloud,
  Zap,
  Droplet,
  Recycle,
  Award,
  ShieldCheck,
  ChevronRight,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { PORTFOLIO_TARGETS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Target = (typeof PORTFOLIO_TARGETS)[number];

const ICON_MAP: Record<string, React.ReactNode> = {
  cloud:   <Cloud size={18} />,
  zap:     <Zap size={18} />,
  droplet: <Droplet size={18} />,
  recycle: <Recycle size={18} />,
  award:   <Award size={18} />,
  shield:  <ShieldCheck size={18} />,
};

const ICON_BG: Record<string, string> = {
  cloud:   "bg-pillar-carbon/10 text-pillar-carbon",
  zap:     "bg-pillar-energy/10 text-pillar-energy",
  droplet: "bg-pillar-water/10 text-pillar-water",
  recycle: "bg-pillar-waste/10 text-pillar-waste",
  award:   "bg-warn/10 text-warn",
  shield:  "bg-brand-50 text-brand-700",
};

const DETAIL_ACTIONS: Record<string, string[]> = {
  carbon: [
    "Reduce diesel generator use — switch to grid or renewable where possible",
    "Improve supplier emission factors for high-impact Scope 3 categories",
    "Increase on-site renewable energy share across EMEA portfolio",
  ],
  energy: [
    "Roll out BMS optimisation across 8 hotels to reduce base-load",
    "Complete LED retrofit in back-of-house areas (Airport Dubai priority)",
    "Install heat recovery on chiller systems (Bay View Singapore approved)",
  ],
  water: [
    "Deploy water sub-metering at Grand Harbour Lisbon — 3 months overdue",
    "Implement greywater reuse system at Skyline Dubai (approved, AED 120k)",
    "Introduce laundry optimisation programme across beach/resort properties",
  ],
  waste: [
    "Implement food waste segregation at 9 hotels below diversion target",
    "Engage contractors for waste reporting compliance (construction waste)",
    "Conduct diversion audits at Zermatt and Airport Dubai — lowest rates",
  ],
  cert: [
    "Upload missing certification evidence for Airport Hotel Dubai",
    "Schedule Green Globe and Travelife renewals before June deadline",
    "Close governance gaps identified in 3 hotels by Q2 2025",
  ],
  data: [
    "Resolve 31 missing data submissions — chase Airport Dubai and Riverside Bangkok",
    "Approve 24 pending records in Review & Approval queue",
    "Follow up with 4 hotels where data approval is below 80%",
  ],
};

function progressPct(target: Target): number {
  if (target.key === "carbon" || target.key === "waste") {
    return Math.min(100, (target.currentVal / target.targetVal) * 100);
  }
  if (target.key === "energy" || target.key === "water") {
    const reduction = ((target.currentVal - target.targetVal) / target.currentVal) * 100;
    const maxReduction = ((target.currentVal - target.targetVal) / target.currentVal) * 100;
    return Math.max(0, Math.min(100, 100 - (reduction / maxReduction) * 100));
  }
  return Math.min(100, (target.currentVal / target.targetVal) * 100);
}

function progressColor(pct: number): string {
  if (pct >= 85) return "bg-good";
  if (pct >= 60) return "bg-warn";
  return "bg-bad";
}

export default function TargetsTab() {
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {PORTFOLIO_TARGETS.map((t) => {
          const pct = progressPct(t);
          const isSelected = selectedTarget?.key === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSelectedTarget(isSelected ? null : t)}
              className={cn(
                "card text-left p-5 hover:shadow-pop hover:-translate-y-0.5 transition-all",
                isSelected && "ring-2 ring-brand-500 border-brand-200"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg grid place-items-center shrink-0", ICON_BG[t.icon])}>
                    {ICON_MAP[t.icon]}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-ink-900">{t.label}</div>
                    <div className="text-[11px] text-ink-500">{t.area} · {t.baseYear}–{t.targetYear}</div>
                  </div>
                </div>
                <Badge tone={t.status}>{t.status === "bad" ? "Off Track" : "At Risk"}</Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-500">Current</span>
                  <span className="font-semibold text-ink-900">{t.currentLabel}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-500">Target {t.targetYear}</span>
                  <span className="font-semibold text-ink-900">{t.targetVal} {t.unit}</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden mt-1">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor(pct))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("chip text-[10px]", t.status === "bad" ? "bg-bad/10 text-bad" : "bg-warn/10 text-warn")}>
                    {t.gap}
                  </span>
                  <ChevronRight size={14} className="text-ink-400" />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-ink-100 text-[11px] text-ink-500">
                {t.hotelsNote} · Owner: {t.owner}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTarget && (
        <div className="card p-6 border-brand-200 ring-1 ring-brand-100">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-[15px] font-semibold text-ink-900">{selectedTarget.label}</div>
              <div className="text-[12px] text-ink-500 mt-0.5">
                {selectedTarget.area} · Baseline {selectedTarget.baseYear} · Target {selectedTarget.targetYear}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge tone={selectedTarget.status}>
                {selectedTarget.status === "bad" ? "Off Track" : "At Risk"}
              </Badge>
              <button
                onClick={() => setSelectedTarget(null)}
                className="w-7 h-7 rounded-md bg-ink-100 hover:bg-ink-200 grid place-items-center transition-colors"
              >
                <X size={14} className="text-ink-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-500 mb-3">
                Progress
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-500">Current</span>
                  <span className="font-bold text-ink-900">{selectedTarget.currentLabel}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-500">Target {selectedTarget.targetYear}</span>
                  <span className="font-bold text-ink-900">{selectedTarget.targetVal} {selectedTarget.unit}</span>
                </div>
                <div className="h-3 bg-ink-100 rounded-full overflow-hidden mt-2">
                  <div
                    className={cn("h-full rounded-full", progressColor(progressPct(selectedTarget)))}
                    style={{ width: `${progressPct(selectedTarget)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-400">{selectedTarget.baseYear} baseline</span>
                  <span className={cn("font-semibold", selectedTarget.status === "bad" ? "text-bad" : "text-warn")}>
                    {selectedTarget.gap}
                  </span>
                </div>
              </div>

              <div className="mt-4 text-[11px] uppercase font-semibold tracking-wider text-ink-500 mb-2">
                Hotels driving the gap
              </div>
              <div className="card-level-3 p-3 text-[12px] text-ink-700">
                {selectedTarget.hotelsNote}
              </div>

              <div className="mt-3 flex items-center justify-between text-[12px]">
                <span className="text-ink-500">Owner</span>
                <span className="font-semibold text-ink-900">{selectedTarget.owner}</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-500 mb-3">
                Recommended Actions
              </div>
              <ul className="space-y-2">
                {(DETAIL_ACTIONS[selectedTarget.key] ?? []).map((action) => (
                  <li key={action} className="flex items-start gap-2 text-[12px] text-ink-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                    {action}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Link
                  to="/actions"
                  className="btn-secondary text-[12px]"
                >
                  View all actions for this target
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
