import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Mail, Plus, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ReminderModal, { type ReminderGroup } from "@/components/review/ReminderModal";
import { detectAnomalies, type Anomaly, type Contact } from "@/lib/dataReadiness";
import { cn, formatNumber } from "@/lib/utils";

const REASON_CODES = [
  "Confirmed correct — operational event",
  "Confirmed correct — weather / occupancy",
  "Data entry error — to be corrected",
  "Meter / sensor fault",
  "Pending supplier clarification",
];

function fmt(v: number, unit: string): string {
  const digits = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return `${formatNumber(v, { maximumFractionDigits: digits })} ${unit}`;
}
function signed(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** Driver-normalised anomaly review for a property. Lives in Review & Approval
 *  (Capture Status) alongside the monthly coverage matrix. */
export default function AnomaliesPanel({ propertyName }: { propertyName: string }) {
  const anomaliesAll = useMemo(() => detectAnomalies(propertyName), [propertyName]);
  const [acknowledged, setAcknowledged] = useState<Record<string, string>>({});
  const [reminder, setReminder] = useState<ReminderGroup[] | null>(null);

  const openAnomalies = anomaliesAll.filter((a) => !acknowledged[`${a.rowKey}|${a.month}`]);

  function remindOwner(contact: Contact, dataType: string, monthLbl: string) {
    setReminder([{ responsible: contact, items: [{ dataType, months: [monthLbl] }] }]);
  }

  return (
    <Card>
      <CardHeader
        title="Anomaly detection"
        hint="Abnormal monthly values vs a driver-normalised expectation (degree-days · occupancy · activity). Weather- or occupancy-explained swings are not flagged."
        right={<Badge tone={openAnomalies.length === 0 ? "good" : "warn"}>{openAnomalies.length} open</Badge>}
      />
      <div className="p-4 space-y-2">
        {openAnomalies.length === 0 ? (
          <div className="rounded-xl border border-good/25 bg-good/5 p-4 text-[13px] text-ink-600 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-good" /> No open anomalies — all reported values are within the driver-normalised expectation.
          </div>
        ) : (
          openAnomalies.map((a) => (
            <AnomalyCard
              key={`${a.rowKey}|${a.month}`}
              anomaly={a}
              onAcknowledge={(reason) => setAcknowledged((s) => ({ ...s, [`${a.rowKey}|${a.month}`]: reason }))}
              onRemind={() => remindOwner(a.responsible, a.dataType, a.monthLabel)}
            />
          ))
        )}

        {Object.keys(acknowledged).length > 0 && (
          <div className="pt-2 mt-1 border-t border-ink-100">
            <div className="text-[11px] font-semibold text-ink-500 mb-1.5">Acknowledged ({Object.keys(acknowledged).length})</div>
            <ul className="space-y-1">
              {anomaliesAll
                .filter((a) => acknowledged[`${a.rowKey}|${a.month}`])
                .map((a) => (
                  <li key={`${a.rowKey}|${a.month}`} className="flex items-center gap-2 text-[11px] text-ink-500">
                    <ShieldCheck size={11} className="text-good shrink-0" />
                    <span className="font-medium text-ink-700">{a.dataType} · {a.monthLabel}</span>
                    <span className="text-ink-400">— {acknowledged[`${a.rowKey}|${a.month}`]}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {reminder && <ReminderModal property={propertyName} groups={reminder} onClose={() => setReminder(null)} intro="Please confirm or correct the following flagged value" />}
    </Card>
  );
}

function AnomalyCard({
  anomaly: a,
  onAcknowledge,
  onRemind,
}: {
  anomaly: Anomaly;
  onAcknowledge: (reason: string) => void;
  onRemind: () => void;
}) {
  const [ackOpen, setAckOpen] = useState(false);
  const [reason, setReason] = useState(REASON_CODES[0]);
  const Icon = a.direction === "spike" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("rounded-xl border p-3", a.severity === "critical" ? "border-bad/30 bg-bad/5" : "border-warn/30 bg-warn/5")}>
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg grid place-items-center shrink-0", a.severity === "critical" ? "bg-bad/15 text-bad" : "bg-warn/15 text-amber-700")}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-ink-900">{a.dataType}</span>
            <span className="text-[12px] text-ink-400">· {a.monthLabel}</span>
            <Badge tone={a.severity === "critical" ? "bad" : "warn"}>{signed(a.driverDevPct)} vs expected</Badge>
            <Badge tone="neutral">{a.direction === "spike" ? "Spike" : "Drop"}</Badge>
          </div>
          <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
            <Metric label="Actual" value={fmt(a.actual, a.unit)} />
            <Metric label="Expected" value={fmt(a.expected, a.unit)} />
            <Metric label="vs last month" value={a.momPct == null ? "—" : signed(a.momPct)} />
            <Metric label="vs last year" value={a.yoyPct == null ? "—" : signed(a.yoyPct)} />
          </div>
          <div className="mt-1.5 text-[11px] text-ink-500">
            <span className="font-medium text-ink-700">{a.likelyCause}</span> · Owner: {a.responsible.name}
            {a.seasonNote && <span className="text-ink-400"> · {a.seasonNote}</span>}
          </div>

          {ackOpen ? (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <select className="h-7 px-2 rounded-lg border border-ink-200 bg-white text-[11px]" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASON_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => onAcknowledge(reason)} className="btn-primary text-[11px] h-7">Confirm</button>
              <button onClick={() => setAckOpen(false)} className="btn-secondary text-[11px] h-7">Cancel</button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button onClick={() => setAckOpen(true)} className="btn-secondary text-[11px] h-7"><ShieldCheck size={12} /> Acknowledge</button>
              <button onClick={onRemind} className="btn-secondary text-[11px] h-7"><Mail size={12} /> Remind owner</button>
              {(() => {
                const pillarParam = ["Energy", "Water", "Waste", "Carbon", "Social"].includes(a.pillar) ? a.pillar.toLowerCase() : "";
                const title = `Investigate ${a.dataType} anomaly (${a.monthLabel}) — ${a.property}`;
                return (
                  <Link
                    to={`/actions?new=1&property=${encodeURIComponent(a.property)}&pillar=${pillarParam}&title=${encodeURIComponent(title)}`}
                    className="btn-secondary text-[11px] h-7"
                  >
                    <Plus size={12} /> Create action
                  </Link>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-ink-400">{label}: </span>
      <span className="font-semibold text-ink-800 tabular-nums">{value}</span>
    </div>
  );
}
