import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Check, Cloud, Droplet, Recycle, ShieldCheck, TrendingDown, TrendingUp, Zap } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { portfolioTargets, type PortfolioTarget, type TargetStatus } from "@/lib/targets";
import { PORTFOLIO_HOTELS, PORTFOLIO_CERTS_BY_HOTEL } from "@/lib/mock";
import { hotelCarbon } from "@/lib/normalise";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import RadialGauge from "@/components/charts/RadialGauge";
import Bullet from "@/components/charts/Bullet";
import StripPlot, { type StripPoint } from "@/components/charts/StripPlot";
import { KV } from "@/components/smart-ops/Shared";

const REPORTING_YEAR = 2025;

const ICON: Record<string, React.ReactNode> = {
  cloud: <Cloud size={16} />, zap: <Zap size={16} />, droplet: <Droplet size={16} />, recycle: <Recycle size={16} />, award: <Award size={16} />, shield: <ShieldCheck size={16} />,
};
const ICON_BG: Record<string, string> = {
  cloud: "bg-pillar-carbon/10 text-pillar-carbon", zap: "bg-pillar-energy/10 text-pillar-energy", droplet: "bg-pillar-water/10 text-pillar-water",
  recycle: "bg-pillar-waste/10 text-pillar-waste", award: "bg-warn/10 text-warn-700", shield: "bg-brand-50 text-brand-700",
};
const STATUS_TONE: Record<TargetStatus, "good" | "warn" | "bad"> = { "on-track": "good", "at-risk": "warn", "off-track": "bad" };
const STATUS_LABEL: Record<TargetStatus, string> = { "on-track": "On track", "at-risk": "At risk", "off-track": "Off track" };
const STATUS_COLOR: Record<TargetStatus, string> = { "on-track": CHART.olive, "at-risk": CHART.sand, "off-track": CHART.rose };

const PRIORITY_ACTIONS: Record<string, string[]> = {
  carbon: ["Reduce diesel generator use — switch to grid or renewable where possible", "Improve supplier emission factors for high-impact Scope 3 categories", "Increase on-site renewable energy share across EMEA portfolio"],
  energy: ["Roll out BMS optimisation across 8 hotels to reduce base-load", "Complete LED retrofit in back-of-house areas (Airport Dubai priority)", "Install heat recovery on chiller systems (Bay View Singapore approved)"],
  water: ["Deploy water sub-metering at Grand Harbour Lisbon — 3 months overdue", "Implement greywater reuse system at Skyline Dubai (approved, AED 120k)", "Introduce laundry optimisation programme across beach/resort properties"],
  waste: ["Implement food waste segregation at 9 hotels below diversion target", "Engage contractors for waste reporting compliance (construction waste)", "Conduct diversion audits at Zermatt and Airport Dubai — lowest rates"],
  cert: ["Upload missing certification evidence for Airport Hotel Dubai", "Schedule Green Globe and Green Key renewals before deadline", "Close certification evidence gaps in 3 hotels"],
  data: ["Resolve 31 missing data submissions — chase Airport Dubai and Riverside Bangkok", "Approve 24 pending records in Review & Approval queue", "Follow up with 4 hotels where data approval is below 80%"],
};

/** Every hotel on the target's own scale — so "hotels driving the gap" is a picture, not a list. */
function hotelPoints(t: PortfolioTarget): StripPoint[] {
  const certified = new Set(PORTFOLIO_CERTS_BY_HOTEL.filter((g) => g.certifications.length > 0).map((g) => g.hotel));
  return PORTFOLIO_HOTELS.map((h) => {
    const value =
      t.key === "carbon" ? +hotelCarbon(h).s1s2PerOrn.toFixed(1)
      : t.key === "energy" ? +h.energyIntensity.toFixed(1)
      : t.key === "water" ? Math.round((h.water_m3 * 1000) / h.gn)
      : t.key === "waste" ? h.diversion_pct
      : t.key === "cert" ? (certified.has(h.name) ? 100 : 0)
      : h.dataConfidence;
    return { id: h.id, label: h.shortName, value };
  });
}

function fmtFor(t: PortfolioTarget) {
  return (v: number) => (t.unit === "%" ? `${Math.round(v)}%` : t.unit === "kgCO₂e/ORN" ? v.toFixed(1) : Math.round(v).toString());
}

function TargetCard({ t }: { t: PortfolioTarget }) {
  const [hotel, setHotel] = useState<string | null>(null);
  const tone = STATUS_TONE[t.status];
  const onTrack = t.status === "on-track";
  const fmt = fmtFor(t);
  const points = hotelPoints(t);
  const wrongSide = points.filter((p) => (t.higherIsBetter ? p.value < t.targetVal : p.value > t.targetVal));
  const elapsed = (REPORTING_YEAR - t.baseYear) / Math.max(1, t.targetYear - t.baseYear);
  const expectedNow = t.baseVal + (t.targetVal - t.baseVal) * Math.min(1, Math.max(0, elapsed));
  const selectedPoint = points.find((p) => p.id === hotel);
  return (
    <Card className="flex flex-col">
      <div className="px-6 pt-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-9 h-9 rounded-full grid place-items-center shrink-0", ICON_BG[t.icon])}>{ICON[t.icon]}</div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-ink-900 leading-snug truncate">{t.label}</div>
            <div className="text-[11px] text-ink-500">{t.area} · baseline {t.baseYear} · target {t.targetYear} · {t.hotelsNote}</div>
          </div>
        </div>
        <Badge tone={tone}>{STATUS_LABEL[t.status]}</Badge>
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Current</div>
            <div className={cn("text-stat font-bold tabular-nums leading-none mt-1", tone === "good" ? "text-good-700" : tone === "warn" ? "text-warn-700" : "text-bad-700")}>{fmt(t.currentVal)} <span className="text-[12px] font-medium text-ink-400">{t.unit}</span></div>
          </div>
          <div className="text-right text-[11px] text-ink-500">{t.gapText}</div>
        </div>
        <Bullet baseline={t.baseVal} current={t.currentVal} target={t.targetVal} expectedNow={expectedNow} higherIsBetter={t.higherIsBetter} unit={t.unit} format={fmt} baseLabel={String(t.baseYear)} targetLabel={String(t.targetYear)} tone={tone} />
        <div className="mt-1 flex items-center justify-between text-[10px] text-ink-400">
          <span className="inline-flex items-center gap-1.5"><span className="w-px h-3 bg-ink-500 inline-block" /> where the pace says {REPORTING_YEAR} should be: {fmt(expectedNow)}</span>
          <span className="tabular-nums">{t.progressPct}% of the way</span>
        </div>
      </div>

      <div className="px-6 pt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl2 bg-ink-50 px-3 py-2.5 flex items-center gap-2">
          {onTrack ? <Check size={13} className="text-good-700 shrink-0" /> : t.higherIsBetter ? <TrendingUp size={13} className="text-warn-700 shrink-0" /> : <TrendingDown size={13} className="text-warn-700 shrink-0" />}
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Pace</div>
            <div className="text-[12px] text-ink-900 tabular-nums">needs <span className="font-semibold">{t.requiredRate}{t.rateUnit}</span> · achieving <span className={cn("font-semibold", onTrack ? "text-good-700" : "text-warn-700")}>{t.actualRate}{t.rateUnit}</span></div>
          </div>
        </div>
        <div className="rounded-xl2 bg-ink-50 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Hotels past the target</div>
          <div className="text-[12px] text-ink-900 tabular-nums"><span className="font-semibold">{points.length - wrongSide.length}</span> of {points.length} · <span className="text-ink-500">{wrongSide.length} still to move</span></div>
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400">Every hotel on this scale</span>
          <span className="text-[10px] text-ink-400">{selectedPoint ? `${selectedPoint.label} · ${fmt(selectedPoint.value)} ${t.unit}` : "click a dot"}</span>
        </div>
        <StripPlot points={points} target={t.targetVal} higherIsBetter={t.higherIsBetter} unit={t.unit} format={fmt} onSelect={(id) => setHotel(id === hotel ? null : id)} selectedId={hotel} />
        <div className="flex flex-wrap gap-1.5 mt-1">
          {wrongSide.sort((a, b) => (t.higherIsBetter ? a.value - b.value : b.value - a.value)).slice(0, 3).map((p) => (
            <button key={p.id} type="button" onClick={() => setHotel(p.id)} className={cn("chip text-[10px] bg-ink-100 text-ink-700 hover:bg-ink-200", hotel === p.id && "bg-ink-900 text-white hover:bg-ink-900")}>{p.label} · {fmt(p.value)}</button>
          ))}
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-ink-400 mb-1.5">Priority actions</div>
        <ul className="space-y-1">
          {(PRIORITY_ACTIONS[t.key] ?? []).map((a) => (
            <li key={a} className="flex items-start gap-2 text-[11px] text-ink-700 leading-snug"><span className="w-1.5 h-1.5 rounded-full bg-chart-olive shrink-0 mt-1.5" />{a}</li>
          ))}
        </ul>
      </div>

      <div className="mt-auto px-6 py-4 mt-4 border-t border-ink-100 flex items-center justify-between">
        <KV label="Owner" value={t.owner} />
        <Link to="/actions" className="btn-secondary text-[11px] h-7 px-3 inline-flex items-center gap-1">View actions <ArrowRight size={11} /></Link>
      </div>
    </Card>
  );
}

export default function TargetsTab() {
  const targets = portfolioTargets();
  const on = targets.filter((t) => t.status === "on-track").length;
  const risk = targets.filter((t) => t.status === "at-risk").length;
  const off = targets.filter((t) => t.status === "off-track").length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Progress to target" hint={`${on} on track · ${risk} at risk · ${off} off track · status is the pace being achieved against the pace required`} />
        <div className="px-6 pb-6 pt-4 grid grid-cols-3 md:grid-cols-6 gap-4">
          {targets.map((t) => (
            <div key={t.key} className="flex flex-col items-center text-center">
              <RadialGauge value={t.progressPct} color={STATUS_COLOR[t.status]} size={92} stroke={9} sub={`by ${t.targetYear}`} />
              <div className="text-[11px] font-semibold text-ink-800 mt-1 leading-snug">{t.label.replace(" (excl WtE)", "")}</div>
              <div className="text-[10px] text-ink-400 tabular-nums">{fmtFor(t)(t.currentVal)} → {fmtFor(t)(t.targetVal)} {t.unit}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {targets.map((t) => <TargetCard key={t.key} t={t} />)}
      </div>
    </div>
  );
}
