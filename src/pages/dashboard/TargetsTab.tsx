import { Link } from "react-router-dom";
import {
  Cloud, Zap, Droplet, Recycle, Award, ShieldCheck,
  ArrowRight, TrendingDown, TrendingUp, Check,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { portfolioTargets, type PortfolioTarget, type TargetStatus } from "@/lib/targets";
import { cn } from "@/lib/utils";

type Target = PortfolioTarget;

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
    "Schedule Green Globe and Travelife renewals before deadline",
    "Close governance gaps identified in 3 hotels",
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

const STATUS_TONE: Record<TargetStatus, "good" | "warn" | "bad"> = {
  "on-track": "good", "at-risk": "warn", "off-track": "bad",
};
const STATUS_LABEL: Record<TargetStatus, string> = {
  "on-track": "On Track", "at-risk": "At Risk", "off-track": "Off Track",
};
const BAR_COLOR: Record<TargetStatus, string> = {
  "on-track": "bg-good", "at-risk": "bg-warn", "off-track": "bg-bad",
};
const BORDER: Record<TargetStatus, string> = {
  "on-track": "border-l-good", "at-risk": "border-l-warn", "off-track": "border-l-bad",
};

const fmtVal = (v: number, unit: string) => (unit === "%" ? `${v}%` : `${v} ${unit}`);

function PathwayBar({ target }: { target: Target }) {
  const pct = target.progressPct;
  return (
    <div className="relative h-5 rounded-full bg-ink-100 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", BAR_COLOR[target.status])} style={{ width: `${pct}%` }} />
      <div className="absolute inset-0 flex items-center justify-between px-3">
        <span className="text-[10px] font-bold text-white tabular-nums">{pct}% there</span>
        <span className="text-[10px] font-bold text-ink-600 tabular-nums">{100 - pct}% to go</span>
      </div>
    </div>
  );
}

function TargetCard({ target }: { target: Target }) {
  const tone = STATUS_TONE[target.status];
  const onTrack = target.status === "on-track";
  return (
    <div className={cn("card p-5 border-l-4", BORDER[target.status])}>
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
        <Badge tone={tone}>{STATUS_LABEL[target.status]}</Badge>
      </div>

      {/* Pathway: Baseline → Current → Target */}
      <div className="mb-4">
        <div className="flex items-center gap-0 mb-2">
          <div className="text-center shrink-0 w-24">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide font-semibold mb-1">Baseline {target.baseYear}</div>
            <div className="text-[13px] font-bold text-ink-700 tabular-nums">{fmtVal(target.baseVal, target.unit)}</div>
          </div>
          <div className="flex-1 h-0.5 bg-ink-200 relative mx-2">
            <div className={cn("absolute inset-y-0 left-0 rounded-full", BAR_COLOR[target.status])} style={{ width: `${target.progressPct}%` }} />
          </div>
          <div className="text-center shrink-0 w-28">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide font-semibold mb-1">Current</div>
            <div className={cn("text-[13px] font-bold tabular-nums", `text-${tone === "good" ? "good" : tone}`)}>{fmtVal(target.currentVal, target.unit)}</div>
          </div>
          <div className="flex-1 h-0.5 bg-ink-100 mx-2" />
          <div className="text-center shrink-0 w-24">
            <div className="text-[10px] text-ink-400 uppercase tracking-wide font-semibold mb-1">Target {target.targetYear}</div>
            <div className="text-[13px] font-bold text-good tabular-nums">{fmtVal(target.targetVal, target.unit)}</div>
          </div>
        </div>

        <PathwayBar target={target} />
        <div className="mt-1.5 text-[11px] text-ink-500">{target.gapText}</div>
      </div>

      {/* Trajectory: required vs actual rate */}
      <div className="card-level-3 px-3 py-2 mb-4 flex items-center gap-2">
        {onTrack ? <Check size={12} className="text-good shrink-0" />
          : target.higherIsBetter ? <TrendingUp size={12} className={cn("shrink-0", `text-${tone}`)} />
          : <TrendingDown size={12} className={cn("shrink-0", `text-${tone}`)} />}
        <span className="text-[11px] text-ink-600">
          Needs <strong>{target.requiredRate}{target.rateUnit}</strong> to {target.targetYear} ·
          achieving <strong className={`text-${tone}`}>{target.actualRate}{target.rateUnit}</strong>
          {onTrack ? " — on pace" : " — short of pace"}
        </span>
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
  const targets = portfolioTargets();
  const on = targets.filter((t) => t.status === "on-track").length;
  const risk = targets.filter((t) => t.status === "at-risk").length;
  const off = targets.filter((t) => t.status === "off-track").length;

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-xl bg-ink-50 border border-ink-100 text-[12px] text-ink-600 flex items-center gap-2 flex-wrap">
        <span><span className="font-semibold text-good">{on} on track</span> · <span className="font-semibold text-warn">{risk} at risk</span> · <span className="font-semibold text-bad">{off} off track</span>.</span>
        <span className="text-ink-400">Status is derived — required annual rate to the target year vs the rate the portfolio is actually achieving. Current values come from the canonical dataset.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {targets.map((t) => (
          <TargetCard key={t.key} target={t} />
        ))}
      </div>
    </div>
  );
}
