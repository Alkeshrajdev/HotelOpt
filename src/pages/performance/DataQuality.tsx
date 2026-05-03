import { AlertTriangle, CheckCircle2, FileWarning, ShieldAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import KpiTile from "@/components/ui/KpiTile";
import HBar from "@/components/charts/HBar";
import Badge from "@/components/ui/Badge";
import type { PillarKey } from "./Shell";

const PILLAR_LABEL: Record<PillarKey, string> = {
  energy: "Energy", water: "Water", waste: "Waste",
  carbon: "Carbon", social: "Social", governance: "Governance",
};

type Quality = {
  high: number;
  fitForPurpose: number;
  goodCoverage: number;
  adequatePPF: number;
  certEvidenceMatch: number;
};

const QUALITY: Record<PillarKey, Quality> = {
  energy:     { high: 82, fitForPurpose: 76, goodCoverage: 61, adequatePPF: 54, certEvidenceMatch: 74 },
  water:      { high: 78, fitForPurpose: 71, goodCoverage: 58, adequatePPF: 52, certEvidenceMatch: 69 },
  waste:      { high: 71, fitForPurpose: 66, goodCoverage: 54, adequatePPF: 48, certEvidenceMatch: 62 },
  carbon:     { high: 80, fitForPurpose: 74, goodCoverage: 60, adequatePPF: 53, certEvidenceMatch: 72 },
  social:     { high: 86, fitForPurpose: 80, goodCoverage: 72, adequatePPF: 64, certEvidenceMatch: 78 },
  governance: { high: 92, fitForPurpose: 88, goodCoverage: 86, adequatePPF: 80, certEvidenceMatch: 84 },
};

const APPROVAL_STATUS: Record<PillarKey, { pending: number; overdue: number; approved: number; lowConfidence: number }> = {
  energy:     { pending: 24, overdue: 6, approved: 182, lowConfidence: 9 },
  water:      { pending: 12, overdue: 2, approved: 96,  lowConfidence: 4 },
  waste:      { pending: 18, overdue: 5, approved: 124, lowConfidence: 11 },
  carbon:     { pending: 8,  overdue: 1, approved: 64,  lowConfidence: 3 },
  social:     { pending: 6,  overdue: 0, approved: 48,  lowConfidence: 2 },
  governance: { pending: 1,  overdue: 0, approved: 12,  lowConfidence: 0 },
};

export default function DataQuality({ pillar }: { pillar: PillarKey }) {
  const q = QUALITY[pillar];
  const a = APPROVAL_STATUS[pillar];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={<CheckCircle2 size={18} />}
          iconBg="bg-pillar-energy/10 text-pillar-energy"
          label="High accuracy" value={String(q.high)} unit="%"
        />
        <KpiTile
          icon={<CheckCircle2 size={18} />}
          iconBg="bg-info/10 text-info"
          label="Fit for purpose" value={String(q.fitForPurpose)} unit="%"
        />
        <KpiTile
          icon={<AlertTriangle size={18} />}
          iconBg="bg-warn/10 text-warn"
          label="Pending review" value={String(a.pending)} caption="awaiting checker"
        />
        <KpiTile
          icon={<ShieldAlert size={18} />}
          iconBg="bg-bad/10 text-bad"
          label="Overdue" value={String(a.overdue)} caption="past SLA"
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title={`${PILLAR_LABEL[pillar]} data quality`} hint="GHG Protocol / GRI / certification expectations" />
          <div className="p-6">
            <HBar
              data={[
                { name: "High accuracy",        value: q.high },
                { name: "Fit for purpose",      value: q.fitForPurpose },
                { name: "Good coverage",        value: q.goodCoverage },
                { name: "Adequate for PPF",     value: q.adequatePPF },
                { name: "Certification match",  value: q.certEvidenceMatch },
              ]}
            />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Approval status" hint="Maker–Checker queue" />
          <div className="p-5 grid grid-cols-2 gap-3">
            <Tile label="Pending review" value={a.pending} tone="warn" />
            <Tile label="Overdue" value={a.overdue} tone="bad" />
            <Tile label="Approved this period" value={a.approved} tone="good" />
            <Tile label="Low-confidence flagged" value={a.lowConfidence} tone="info" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Common issues — last 30 days" />
        <ul className="p-5 space-y-2 text-sm">
          <Issue icon="warn" text={`${a.overdue} ${PILLAR_LABEL[pillar].toLowerCase()} records past SLA — escalate to property GMs.`} />
          <Issue icon="warn" text={`${a.lowConfidence} OCR / AI low-confidence records waiting on maker re-review.`} />
          <Issue icon="info" text="3 properties have not submitted invoices this month — reminder queued." />
          <Issue icon="good" text="No anomaly clusters detected. Recent submissions trend within 5 % of seasonal baseline." />
        </ul>
      </Card>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "bad" | "info";
}) {
  const ring = {
    good: "border-good/25 bg-good/10",
    warn: "border-warn/25 bg-warn/10",
    bad: "border-bad/25 bg-bad/10",
    info: "border-info/25 bg-info/10",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${ring}`}>
      <div className="text-[11px] font-medium text-ink-500">{label}</div>
      <div className="text-[24px] font-bold mt-1 text-ink-900 tabular-nums">{value}</div>
    </div>
  );
}

function Issue({ icon, text }: { icon: "warn" | "info" | "good"; text: string }) {
  const I = icon === "warn" ? AlertTriangle : icon === "info" ? FileWarning : CheckCircle2;
  const tone = icon === "warn" ? "text-warn" : icon === "info" ? "text-info" : "text-good";
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-ink-200 p-3">
      <I size={16} className={`${tone} mt-0.5 shrink-0`} />
      <span className="text-ink-700">{text}</span>
      <Badge tone={icon === "good" ? "good" : icon === "info" ? "info" : "warn"} className="ml-auto">
        {icon === "good" ? "OK" : icon === "info" ? "Info" : "Action"}
      </Badge>
    </li>
  );
}
