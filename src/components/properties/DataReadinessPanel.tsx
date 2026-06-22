import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CaptureStatusChip from "@/components/review/CaptureStatusChip";
import ReminderModal, { type ReminderGroup } from "@/components/review/ReminderModal";
import {
  ALL_MONTHS,
  DISPLAY_MONTHS,
  detectAnomalies,
  getReadiness,
  monthCoverage,
  monthLabel,
  readinessSummary,
  rowCoverage,
  type Anomaly,
  type Contact,
  type MonthCell,
  type Pillar,
  type ReadinessRow,
  PILLAR_ORDER,
} from "@/lib/dataReadiness";
import { cn, formatNumber } from "@/lib/utils";

const PILLAR_TONE: Record<Pillar, string> = {
  Energy: "text-amber-700",
  Water: "text-sky-700",
  Waste: "text-violet-700",
  Carbon: "text-teal-700",
  Activity: "text-brand-700",
  Social: "text-rose-700",
};

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

export default function DataReadinessPanel({ propertyName }: { propertyName: string }) {
  const rowsAll = useMemo(() => getReadiness(propertyName), [propertyName]);
  const anomaliesAll = useMemo(() => detectAnomalies(propertyName), [propertyName]);
  const summary = useMemo(() => readinessSummary(propertyName), [propertyName]);

  const [pillar, setPillar] = useState<Pillar | "all">("all");
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [acknowledged, setAcknowledged] = useState<Record<string, string>>({});
  const [reminder, setReminder] = useState<ReminderGroup[] | null>(null);
  const [record, setRecord] = useState<{ row: ReadinessRow; month: string } | null>(null);

  const rows = useMemo(
    () => (pillar === "all" ? rowsAll : rowsAll.filter((r) => r.pillar === pillar)),
    [rowsAll, pillar]
  );

  // Index anomalies by `${rowKey}|${month}` for matrix/sparkline highlighting.
  const anomalyIndex = useMemo(() => {
    const m = new Map<string, Anomaly>();
    for (const a of anomaliesAll) m.set(`${a.rowKey}|${a.month}`, a);
    return m;
  }, [anomaliesAll]);

  const openAnomalies = anomaliesAll.filter((a) => !acknowledged[`${a.rowKey}|${a.month}`]);

  function chaseAllMissing() {
    const map = new Map<string, ReminderGroup>();
    for (const row of rows) {
      const months = DISPLAY_MONTHS.filter((mm) => row.cells[mm]?.status === "missing").map(monthLabel);
      if (!months.length) continue;
      const email = row.responsible.email;
      if (!map.has(email)) map.set(email, { responsible: row.responsible, items: [] });
      map.get(email)!.items.push({ dataType: row.dataType, months });
    }
    setReminder(Array.from(map.values()));
  }

  function remindContact(contact: Contact, dataType: string, monthLbl: string) {
    setReminder([{ responsible: contact, items: [{ dataType, months: [monthLbl] }] }]);
  }

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile label="Months tracked" value={`${summary.monthsTracked}`} sub="rolling window" />
        <SummaryTile
          label="Coverage"
          value={`${summary.coveragePct}%`}
          sub={`${summary.approved}/${summary.applicable} approved`}
          tone={summary.coveragePct >= 80 ? "good" : summary.coveragePct >= 50 ? "warn" : "bad"}
        />
        <SummaryTile label="Missing" value={`${summary.missing}`} sub="entries to chase" tone={summary.missing > 0 ? "bad" : "good"} />
        <SummaryTile
          label="Open anomalies"
          value={`${openAnomalies.length}`}
          sub={`${summary.criticalAnomalies} critical`}
          tone={openAnomalies.length === 0 ? "good" : summary.criticalAnomalies > 0 ? "bad" : "warn"}
        />
      </div>

      {/* Coverage matrix */}
      <Card>
        <CardHeader
          title="Monthly coverage"
          hint="Submission status by data type over the last 12 months. Click a populated cell for the record, a missing cell to chase it."
          right={
            <div className="flex items-center gap-2">
              <select
                className="h-8 px-2 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700"
                value={pillar}
                onChange={(e) => setPillar(e.target.value as Pillar | "all")}
              >
                <option value="all">All pillars</option>
                {PILLAR_ORDER.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-[12px] text-ink-600 cursor-pointer select-none">
                <input type="checkbox" checked={approvedOnly} onChange={(e) => setApprovedOnly(e.target.checked)} className="accent-brand-600" />
                Approved only
              </label>
              <button onClick={chaseAllMissing} className="btn-secondary text-[12px] h-8">
                <Mail size={13} /> Chase missing
              </button>
            </div>
          }
        />
        <div className="px-3 pb-3 pt-3">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[11px] mb-3 px-1">
            {(["approved", "submitted", "draft", "missing", "na"] as const).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <CaptureStatusChip status={s} />
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-bad inline-block" />
              <span className="text-ink-500">anomaly flagged</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead>
                <tr className="bg-ink-50 border-y border-ink-200">
                  <th className="text-left px-3 py-2 font-semibold text-ink-700 min-w-[150px] sticky left-0 bg-ink-50">Data type</th>
                  {DISPLAY_MONTHS.map((m) => (
                    <th key={m} className="text-center px-1.5 py-2 font-semibold text-ink-600 min-w-[78px]">{monthLabel(m)}</th>
                  ))}
                  <th className="text-center px-2 py-2 font-semibold text-ink-700 min-w-[90px]">Trend</th>
                  <th className="text-center px-2 py-2 font-semibold text-ink-700 min-w-[56px]">Cov.</th>
                </tr>
              </thead>
              <tbody>
                {PILLAR_ORDER.filter((p) => rows.some((r) => r.pillar === p)).map((p) => (
                  <PillarGroup
                    key={p}
                    pillar={p}
                    rows={rows.filter((r) => r.pillar === p)}
                    anomalyIndex={anomalyIndex}
                    approvedOnly={approvedOnly}
                    onCell={(row, month) => {
                      const cell = row.cells[month];
                      if (!cell || cell.status === "na") return;
                      if (cell.status === "missing") remindContact(row.responsible, row.dataType, monthLabel(month));
                      else setRecord({ row, month });
                    }}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ink-50 border-t border-ink-200 text-[11px]">
                  <td className="px-3 py-2 font-semibold text-ink-500 sticky left-0 bg-ink-50">Monthly coverage</td>
                  {DISPLAY_MONTHS.map((m) => {
                    const c = monthCoverage(rows, m);
                    return <td key={m} className={cn("px-1.5 py-2 text-center font-semibold tabular-nums", c >= 80 ? "text-good" : c >= 50 ? "text-amber-700" : "text-bad")}>{c}%</td>;
                  })}
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Card>

      {/* Anomalies */}
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
                onRemind={() => remindContact(a.responsible, a.dataType, a.monthLabel)}
              />
            ))
          )}

          {/* Acknowledged audit trail */}
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
      </Card>

      {reminder && <ReminderModal property={propertyName} groups={reminder} onClose={() => setReminder(null)} intro="Please action the following data items" />}
      {record && <RecordModal propertyName={propertyName} row={record.row} month={record.month} anomaly={anomalyIndex.get(`${record.row.key}|${record.month}`) ?? null} onClose={() => setRecord(null)} />}
    </div>
  );
}

/* ── Matrix pieces ─────────────────────────────────────────────────────────── */

function PillarGroup({
  pillar,
  rows,
  anomalyIndex,
  approvedOnly,
  onCell,
}: {
  pillar: Pillar;
  rows: ReadinessRow[];
  anomalyIndex: Map<string, Anomaly>;
  approvedOnly: boolean;
  onCell: (row: ReadinessRow, month: string) => void;
}) {
  return (
    <>
      <tr className="border-t border-ink-100">
        <td colSpan={DISPLAY_MONTHS.length + 3} className={cn("px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide bg-ink-50/60", PILLAR_TONE[pillar])}>
          {pillar}
        </td>
      </tr>
      {rows.map((row) => {
        const cov = rowCoverage(row);
        return (
          <tr key={row.key} className="border-t border-ink-100 hover:bg-ink-50/40">
            <td className="px-3 py-2 sticky left-0 bg-white">
              <div className="font-medium text-ink-900">{row.dataType}</div>
              <div className="text-[10px] text-ink-400">{row.responsible.name} · {row.unit}</div>
            </td>
            {DISPLAY_MONTHS.map((m) => {
              const cell = row.cells[m];
              const anomaly = anomalyIndex.get(`${row.key}|${m}`);
              const faded = approvedOnly && cell?.status !== "approved";
              return (
                <td key={m} className="px-1.5 py-2 text-center">
                  <button
                    onClick={() => onCell(row, m)}
                    className={cn("relative inline-flex group", faded && "opacity-25")}
                    title={cell?.value != null ? fmt(cell.value, row.unit) : cell?.status}
                  >
                    <CaptureStatusChip status={cell?.status ?? "missing"} />
                    {anomaly && (
                      <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-white", anomaly.severity === "critical" ? "bg-bad" : "bg-warn")} />
                    )}
                  </button>
                </td>
              );
            })}
            <td className="px-2 py-2">
              <Sparkline row={row} anomalyIndex={anomalyIndex} />
            </td>
            <td className={cn("px-2 py-2 text-center font-semibold tabular-nums", cov >= 80 ? "text-good" : cov >= 50 ? "text-amber-700" : "text-bad")}>{cov}%</td>
          </tr>
        );
      })}
    </>
  );
}

function Sparkline({ row, anomalyIndex }: { row: ReadinessRow; anomalyIndex: Map<string, Anomaly> }) {
  const pts = DISPLAY_MONTHS.map((m) => ({ month: m, v: row.cells[m]?.value ?? null }));
  const vals = pts.map((p) => p.v).filter((v): v is number => v != null);
  if (vals.length < 2) return <span className="text-[10px] text-ink-300">—</span>;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const W = 76, H = 22;
  const step = W / (pts.length - 1);
  const xy = pts.map((p, i) => (p.v == null ? null : { x: i * step, y: H - ((p.v - min) / span) * H, month: p.month }));
  const linePts = xy.filter(Boolean) as { x: number; y: number; month: string }[];
  const d = linePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} className="text-ink-300" />
      {linePts.map((p) => {
        const a = anomalyIndex.get(`${row.key}|${p.month}`);
        if (!a) return null;
        return <circle key={p.month} cx={p.x} cy={p.y} r={2.4} className={a.severity === "critical" ? "fill-bad" : "fill-warn"} />;
      })}
    </svg>
  );
}

/* ── Anomaly card ──────────────────────────────────────────────────────────── */

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
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setAckOpen(true)} className="btn-secondary text-[11px] h-7"><ShieldCheck size={12} /> Acknowledge</button>
              <button onClick={onRemind} className="btn-secondary text-[11px] h-7"><Mail size={12} /> Remind owner</button>
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

/* ── Record modal ──────────────────────────────────────────────────────────── */

function RecordModal({
  propertyName,
  row,
  month,
  anomaly,
  onClose,
}: {
  propertyName: string;
  row: ReadinessRow;
  month: string;
  anomaly: Anomaly | null;
  onClose: () => void;
}) {
  const cell = row.cells[month] as MonthCell;
  const idx = ALL_MONTHS.indexOf(month);
  const prev = row.cells[ALL_MONTHS[idx - 1]]?.value ?? null;
  const yoy = row.cells[ALL_MONTHS[idx - 12]]?.value ?? null;
  const momPct = prev && cell.value != null ? ((cell.value - prev) / prev) * 100 : null;
  const yoyPct = yoy && cell.value != null ? ((cell.value - yoy) / yoy) * 100 : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
          <div>
            <h3 className="font-bold text-ink-900 text-base">{row.dataType}</h3>
            <p className="text-[12px] text-ink-500 mt-0.5">{propertyName} · {monthLabel(month)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-3 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-ink-500">Status</span>
            <CaptureStatusChip status={cell.status} />
          </div>
          <RecRow label="Reported value" value={cell.value != null ? fmt(cell.value, row.unit) : "—"} />
          <RecRow label="vs last month" value={momPct == null ? "—" : signed(momPct)} />
          <RecRow label="vs last year" value={yoyPct == null ? "—" : signed(yoyPct)} />
          <RecRow label="Pillar" value={row.pillar} />
          <RecRow label="Responsible" value={`${row.responsible.name} · ${row.responsible.role}`} />
          {anomaly && (
            <div className={cn("rounded-xl border p-3 mt-1", anomaly.severity === "critical" ? "border-bad/30 bg-bad/5" : "border-warn/30 bg-warn/5")}>
              <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-900">
                <AlertTriangle size={13} className={anomaly.severity === "critical" ? "text-bad" : "text-amber-700"} />
                Anomaly: {signed(anomaly.driverDevPct)} vs driver-normalised expected
              </div>
              <div className="text-[11px] text-ink-500 mt-1">
                Expected {fmt(anomaly.expected, anomaly.unit)} · {anomaly.likelyCause}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900 tabular-nums">{value}</span>
    </div>
  );
}

/* ── Summary tile ──────────────────────────────────────────────────────────── */

function SummaryTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }) {
  const tclass = tone === "good" ? "text-good" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-bad" : "text-ink-900";
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3">
      <div className="text-[11px] text-ink-500 mb-1">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums", tclass)}>{value}</div>
      {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}
