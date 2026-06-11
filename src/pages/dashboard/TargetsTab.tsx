import { Link } from "react-router-dom";
import {
  Cloud,
  Zap,
  Droplet,
  Recycle,
  Award,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { PORTFOLIO_TARGETS, PORTFOLIO_HOTELS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Target = (typeof PORTFOLIO_TARGETS)[number];

const ICON_MAP: Record<string, React.ReactNode> = {
  cloud:   <Cloud size={16} />,
  zap:     <Zap size={16} />,
  droplet: <Droplet size={16} />,
  recycle: <Recycle size={16} />,
  award:   <Award size={16} />,
  shield:  <ShieldCheck size={16} />,
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

const HOTELS_DRIVING_GAP: Record<string, string[]> = {
  carbon: ["Skyline Dubai", "Airport Hotel Dubai", "Bay View Singapore"],
  energy: ["Airport Hotel Dubai", "Skyline Dubai", "Bay View Singapore"],
  water:  ["Skyline Dubai", "Airport Hotel Dubai", "Bay View Singapore"],
  waste:  ["Peaks Resort Zermatt", "Airport Hotel Dubai", "Marina Residences Barcelona"],
  cert:   ["Airport Hotel Dubai", "Riverside Bangkok"],
  data:   ["Riverside Bangkok", "Airport Hotel Dubai", "Peaks Resort Zermatt"],
};

const REQUIRED_IMPROVEMENT: Record<string, string> = {
  carbon: "~4.5% annual reduction required 2025–2030",
  energy: "~0.7 kWh/RN reduction per year to 2025",
  water:  "~11 L/GN reduction per year to 2025",
  waste:  "~9% diversion improvement per year to 2025",
  cert:   "2 hotels to achieve certification by Dec 2025",
  data:   "~3% annual approval improvement to 2025",
};

// Progress along the baseline → target journey (direction-aware).
// done = (current - baseline) / (target - baseline) works for both
// reduction targets (lower is better) and growth targets (higher is better),
// because numerator and denominator flip sign together.
function journeyProgress(target: Target) {
  const span = target.targetVal - target.baseVal;
  if (span === 0) return 100;
  const done = ((target.currentVal - target.baseVal) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(done)));
}

function PathwayBar({ target }: { target: Target }) {
  const pct = journeyProgress(target);
  const remaining = 100 - pct;

  return (
    <div className="relative h-5 rounded-full bg-ink-100 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", target.status === "bad" ? "bg-bad" : "bg-warn")}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-3">
        <span className="text-[10px] font-bold text-white tabular-nums">{pct}% there</span>
        <span className="text-[10px] font-bold text-ink-600 tabular-nums">{remaining}% to go</span>
      </div>
    </div>
  );
}

function TargetCard({ target }: { target: Target }) {
  return (
    <div className={cn(
      "card p-5 border-l-4",
      target.status === "bad" ? "border-l-bad" : "border-l-warn"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg grid place-items-center shrink-0", ICON_BG[target.icon])}>
            {ICON_MAP[target.icon]}
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ink-900">{target.label}</div>
            <div className="text-[11px] text-ink-500">{target.area} · Baseline {target.baseYear}</div>
          </div>
        </div>
        <Badge tone={target.status}>{target.status === "bad" ? "Off Track" : "At Risk"}</Badge>
      </div>

      {/* Pathway: Baseline → Current → Target */}
      <div className="mb-4">
        <div className="flex items-center gap-0 mb-2">
          {/* Baseline */}
          <div className="text-center shrink-0 w-24">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide font-semibold mb-1">Baseline {target.baseYear}</div>
            <div className="text-[13px] font-bold text-ink-700 tabular-nums">
              {target.baseLabel}
            </div>
          </div>
          <div className="flex-1 h-0.5 bg-ink-200 relative mx-2">
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full", target.status === "bad" ? "bg-bad" : "bg-warn")}
              style={{ width: `${journeyProgress(target)}%` }}
            />
          </div>
          {/* Current */}
          <div className="text-center shrink-0 w-28">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide font-semibold mb-1">Current</div>
            <div className={cn("text-[13px] font-bold tabular-nums", target.status === "bad" ? "text-bad" : "text-warn")}>
              {target.currentLabel}
            </div>
          </div>
          <div className="flex-1 h-0.5 bg-ink-100 mx-2" />
          {/* Target */}
          <div className="text-center shrink-0 w-24">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide font-semibold mb-1">Target {target.targetYear}</div>
            <div className="text-[13px] font-bold text-good tabular-nums">
              {target.targetVal} {target.unit}
            </div>
          </div>
        </div>

        <PathwayBar target={target} />
        <div className="mt-1.5 text-[11px] text-ink-500">{target.gap}</div>
      </div>

      {/* Required improvement */}
      <div className="card-level-3 px-3 py-2 mb-4 flex items-center gap-2">
        {target.status === "bad" ? (
          <TrendingDown size={12} className="text-bad shrink-0" />
        ) : (
          <TrendingUp size={12} className="text-warn shrink-0" />
        )}
        <span className="text-[11px] text-ink-600">{REQUIRED_IMPROVEMENT[target.key]}</span>
      </div>

      {/* Hotels driving gap */}
      <div className="mb-4">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-500 mb-2">Hotels driving the gap</div>
        <div className="flex flex-wrap gap-1.5">
          {(HOTELS_DRIVING_GAP[target.key] ?? []).map((hotel) => (
            <span key={hotel} className="chip bg-ink-100 text-ink-700 text-[10px]">{hotel}</span>
          ))}
        </div>
        <div className="mt-1 text-[11px] text-ink-400">{target.hotelsNote}</div>
      </div>

      {/* Recommended actions */}
      <div className="mb-4">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-500 mb-2">Priority actions</div>
        <ul className="space-y-1.5">
          {(DETAIL_ACTIONS[target.key] ?? []).map((action) => (
            <li key={action} className="flex items-start gap-2 text-[11px] text-ink-700">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
              {action}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-ink-100">
        <span className="text-[11px] text-ink-500">Owner: <span className="font-semibold text-ink-900">{target.owner}</span></span>
        <Link to="/actions" className="btn-secondary text-[11px] h-7 px-3 inline-flex items-center gap-1">
          View actions <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

export default function TargetsTab() {
  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-xl bg-ink-50 border border-ink-100 text-[12px] text-ink-600 flex items-center gap-2">
        <span className="font-semibold text-ink-900">All 6 portfolio targets</span> are currently off-track or at risk.
        Each card shows the baseline → current → target pathway with the required improvement rate and hotels driving the gap.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PORTFOLIO_TARGETS.map((t) => (
          <TargetCard key={t.key} target={t} />
        ))}
      </div>
    </div>
  );
}
